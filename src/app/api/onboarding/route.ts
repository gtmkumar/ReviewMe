import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { z } from 'zod';

// Validation schemas
const socialProfileSchema = z.object({
  github: z.string().url().optional().or(z.literal('')),
  medium: z.string().url().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
  portfolio: z.string().url().optional().or(z.literal('')),
});

const onboardingSchema = z.object({
  userType: z.enum(['student', 'professional', 'job_seeker']),
  experience: z.string().optional(),
  industry: z.string().optional(),
  careerGoals: z.array(z.string()).optional(),
  socialProfiles: socialProfileSchema,
  preferences: z.object({
    communicationStyle: z.enum(['formal', 'casual', 'technical']).optional(),
    feedbackFrequency: z.enum(['immediate', 'weekly', 'monthly']).optional(),
    privacyLevel: z.enum(['public', 'private', 'limited']).optional(),
  }).optional(),
  consents: z.object({
    dataCollection: z.boolean(),
    analytics: z.boolean(),
    marketing: z.boolean(),
    profileSharing: z.boolean(),
  }),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Find user by email
    const user = await db.users.findOne({ 
      email: session.user.email.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    // Return onboarding data
    const onboardingData = {
      completed: user.onboardingCompleted || false,
      data: user.onboardingData || null,
    };

    return NextResponse.json({ onboardingData });

  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = onboardingSchema.parse(body);

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Find user by email
    const user = await db.users.findOne({ 
      email: session.user.email.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    // Update user with onboarding data
    const updateResult = await db.users.updateOne(
      { _id: user._id },
      {
        $set: {
          onboardingCompleted: true,
          onboardingData: {
            ...validatedData,
            preferences: validatedData.preferences || {
              communicationStyle: undefined,
              feedbackFrequency: undefined,
              privacyLevel: undefined,
            },
            completedAt: new Date(),
          },
          updatedAt: new Date(),
        }
      }
    );

    if (!updateResult.modifiedCount) {
      return NextResponse.json(
        { error: 'Failed to save onboarding data' },
        { status: 500 }
      );
    }

    // Update preferences if provided
    if (validatedData.preferences) {
      await db.preferences.updateOne(
        { userId: user._id.toString() },
        {
          $set: {
            personalization: {
              recommendationTypes: validatedData.careerGoals || [],
              contentPreferences: [validatedData.userType],
              dashboardLayout: 'detailed',
            },
            notifications: {
              email: validatedData.consents.marketing,
              push: true,
              weeklyDigest: true,
              blogUpdates: true,
              recommendations: true,
            },
            privacy: {
              profilePublic: validatedData.consents.profileSharing,
              analyticsOptOut: !validatedData.consents.analytics,
              socialProfilesVisible: validatedData.preferences.privacyLevel !== 'private',
              blogSharingEnabled: validatedData.consents.profileSharing,
            },
            updatedAt: new Date(),
          }
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully'
    });

  } catch (error) {
    console.error('Error saving onboarding data:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = onboardingSchema.partial().parse(body);

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Find user by email
    const user = await db.users.findOne({ 
      email: session.user.email.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    // Update onboarding data (partial update)
    const updateFields: any = {};
    
    if (validatedData.userType) {
      updateFields['onboardingData.userType'] = validatedData.userType;
    }
    
    if (validatedData.socialProfiles) {
      updateFields['onboardingData.socialProfiles'] = validatedData.socialProfiles;
    }
    
    if (validatedData.preferences) {
      updateFields['onboardingData.preferences'] = validatedData.preferences;
    }
    
    if (validatedData.consents) {
      updateFields['onboardingData.consents'] = validatedData.consents;
    }

    updateFields.updatedAt = new Date();

    const updateResult = await db.users.updateOne(
      { _id: user._id },
      { $set: updateFields }
    );

    if (!updateResult.modifiedCount) {
      return NextResponse.json(
        { error: 'No changes made' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding data updated successfully'
    });

  } catch (error) {
    console.error('Error updating onboarding data:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}