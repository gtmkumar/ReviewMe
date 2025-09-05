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
    const user = await db.users.findOne({ 
      email: session.user.email.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    // Return user data (excluding sensitive fields)
    const userProfile = {
      id: user._id?.toString(),
      name: user.name,
      email: user.email,
      publicUsername: user.publicUsername,
      bio: user.bio,
      profilePublic: user.profilePublic,
      avatar: user.avatar,
      image: user.image,
      credits: user.credits,
      onboardingCompleted: user.onboardingCompleted,
      isFirstTimeLogin: user.isFirstTimeLogin,
      firstLoginAt: user.firstLoginAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };

    return NextResponse.json({ user: userProfile });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}