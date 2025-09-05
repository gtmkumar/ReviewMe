import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import GitHubService from '@/lib/github-service';
import { getDbManager } from '@/lib/database';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get GitHub access token from session
    const githubData = (session as any).github;
    if (!githubData?.username) {
      return NextResponse.json({ 
        error: 'GitHub account not connected' 
      }, { status: 400 });
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Check if GitHub integration exists
    const integration = await db.integrations.findOne({
      userId: (session.user as any).id,
      type: 'github'
    });

    const accessToken = integration?.accessToken || (session as any).accessToken;

    // Initialize GitHub service
    const githubService = new GitHubService(accessToken);

    // Sync user data
    await githubService.syncUserData(
      (session.user as any).id,
      githubData.username,
      accessToken
    );

    // Update integration record
    await db.integrations.updateOne(
      { userId: (session.user as any).id, type: 'github' },
      {
        $set: {
          isConnected: true,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          accessToken,
          scopes: ['read:user', 'user:email', 'public_repo'],
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'GitHub data synced successfully'
    });

  } catch (error) {
    console.error('GitHub sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync GitHub data' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Get GitHub profile data
    const profile = await db.profiles.findOne({ 
      userId: (session.user as any).id 
    });

    const integration = await db.integrations.findOne({
      userId: (session.user as any).id,
      type: 'github'
    });

    const repositories = await db.repositories.find({
      userId: (session.user as any).id
    }).sort({ stars: -1 }).limit(10).toArray();

    return NextResponse.json({
      success: true,
      data: {
        profile: profile?.github || null,
        integration: integration || null,
        repositories,
      }
    });

  } catch (error) {
    console.error('GitHub data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GitHub data' },
      { status: 500 }
    );
  }
}