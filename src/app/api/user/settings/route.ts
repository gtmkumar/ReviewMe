import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';

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
    const usersCollection = await db.getUsersCollection();
    const user = await usersCollection.findOne({ 
      email: session.user.email.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    // Return user settings including onboarding data
    const settings = {
      name: user.name,
      email: user.email,
      bio: user.bio || '',
      avatar: user.avatar,
      image: user.image,
      publicUsername: user.publicUsername,
      profilePublic: user.profilePublic !== undefined ? user.profilePublic : true,
      onboarding: {
        completed: user.onboardingCompleted || false,
        data: user.onboardingData || null,
      },
    };

    return NextResponse.json({ settings });

  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bio, profilePublic, onboardingData } = body;

    // Validate input
    if (bio !== undefined && typeof bio !== 'string') {
      return NextResponse.json(
        { error: 'Bio must be a string' }, 
        { status: 400 }
      );
    }

    if (bio && bio.length > 200) {
      return NextResponse.json(
        { error: 'Bio must be 200 characters or less' }, 
        { status: 400 }
      );
    }

    if (profilePublic !== undefined && typeof profilePublic !== 'boolean') {
      return NextResponse.json(
        { error: 'Profile visibility must be a boolean' }, 
        { status: 400 }
      );
    }

    // Validate onboarding data if provided
    if (onboardingData !== undefined) {
      if (typeof onboardingData !== 'object' || onboardingData === null) {
        return NextResponse.json(
          { error: 'Onboarding data must be an object' }, 
          { status: 400 }
        );
      }
    }

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (bio !== undefined) {
      updateData.bio = bio.trim();
    }

    if (profilePublic !== undefined) {
      updateData.profilePublic = profilePublic;
    }

    if (onboardingData !== undefined) {
      updateData.onboardingData = onboardingData;
      updateData.onboardingCompleted = true;
    }

    if (onboardingData !== undefined) {
      updateData.onboardingData = onboardingData;
      updateData.onboardingCompleted = true;
    }

    // Update user settings
    const usersCollection = await db.getUsersCollection();
    const result = await usersCollection.updateOne(
      { email: session.user.email.toLowerCase() },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Settings updated successfully' 
    });

  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}