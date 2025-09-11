import { NextRequest, NextResponse } from 'next/server';
import { getDbManager } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ReferralService, PublicUsernameService } from '@/lib/services';

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  referralCode: z.string().optional().nullable().transform(val => val || undefined),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, referralCode } = registerSchema.parse(body);

    // Initialize database connection using the proper pattern
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Check if user already exists
    const usersCollection = await db.getUsersCollection();
    const existingUser = await usersCollection.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate unique public username
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts[1] || 'Name';
    const publicUsername = await PublicUsernameService.createUniquePublicUsername(firstName, lastName);

    // Create user
    const result = await usersCollection.insertOne({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: undefined,
      emailVerified: undefined,
      credits: 100, // Initial credit balance
      totalReferrals: 0,
      publicUsername,
      bio: undefined,
      profilePublic: true, // Default to public profile
      onboardingCompleted: false, // New users need to complete onboarding
      isFirstTimeLogin: true, // Mark as first-time login
      requestCounts: {
        github: 0,
        linkedin: 0,
        resume: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userId = result.insertedId.toString();

    // Process referral if referral code provided
    if (referralCode) {
      try {
        // Create a pending referral record
        await ReferralService.processReferral(referralCode, email.toLowerCase());
        // Complete the referral (award credits to both users)
        await ReferralService.completeReferral(email.toLowerCase(), userId);
      } catch (referralError) {
        console.error('Referral processing failed:', referralError);
        // Don't fail the registration if referral processing fails
      }
    }

    // Initialize user profile
    const profilesCollection = await db.getProfilesCollection();
    await profilesCollection.insertOne({
      userId,
      profileScore: 0,
      lastAnalyzed: undefined,
      github: undefined,
      linkedin: undefined,
      resume: undefined,
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Initialize user preferences
    const preferencesCollection = await db.getPreferencesCollection();
    await preferencesCollection.insertOne({
      userId,
      theme: 'system',
      notifications: {
        email: true,
        push: true,
        weeklyDigest: true,
      },
      privacy: {
        profilePublic: false,
        analyticsOptOut: false,
      },
      personalization: {
        recommendationTypes: [],
        contentPreferences: [],
        dashboardLayout: 'detailed',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { 
        success: true,
        message: 'User registered successfully',
        user: {
          id: userId,
          name,
          email: email.toLowerCase(),
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    
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