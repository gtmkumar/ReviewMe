import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

interface LinkedInProfileRequest {
  username?: string;
}

interface LinkedInProfileResponse {
  success: boolean;
  data?: {
    profileData: any;
    analysisResults?: any;
    lastUpdated: string;
    username: string;
  };
  error?: string;
}

// GET: Fetch saved LinkedIn profile data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    const userId = session.user.id;
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();
    
    const database = await db.getDb();
    const linkedinProfilesCollection = database.collection('linkedin_profiles');

    let query: any = { userId: new ObjectId(userId) };
    
    // If username is provided, search for that specific profile
    if (username) {
      query.username = username;
    }

    // Find the most recent profile for this user (or specific username)
    const savedProfile = await linkedinProfilesCollection.findOne(
      query,
      { sort: { lastUpdated: -1 } }
    );

    if (!savedProfile) {
      return NextResponse.json({
        success: false,
        error: 'No saved LinkedIn profile found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        profileData: savedProfile.profileData,
        analysisResults: savedProfile.analysisResults,
        lastUpdated: savedProfile.lastUpdated,
        username: savedProfile.username
      }
    } as LinkedInProfileResponse);

  } catch (error) {
    console.error('Error fetching LinkedIn profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST: Save or update LinkedIn profile data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await request.json() as LinkedInProfileRequest & {
      profileData: any;
      analysisResults?: any;
    };

    const { username, profileData, analysisResults } = body;

    if (!username || !profileData) {
      return NextResponse.json({
        success: false,
        error: 'Username and profile data are required'
      }, { status: 400 });
    }

    const userId = session.user.id;
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();
    
    const database = await db.getDb();
    const linkedinProfilesCollection = database.collection('linkedin_profiles');

    // Upsert the profile data
    await linkedinProfilesCollection.updateOne(
      { 
        userId: new ObjectId(userId),
        username: username
      },
      {
        $set: {
          profileData,
          analysisResults,
          lastUpdated: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Profile data saved successfully'
    });

  } catch (error) {
    console.error('Error saving LinkedIn profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}