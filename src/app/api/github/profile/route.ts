import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

// GET: Retrieve saved GitHub analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();
    const database = await db.getDb();
    const githubAnalyticsCollection = database.collection('github_analytics');

    let query: any = { userId: new ObjectId(session.user.id) };
    
    if (username) {
      query.username = username;
    }

    // Get the most recent analytics data for the user
    const savedData = await githubAnalyticsCollection.findOne(
      query,
      { sort: { lastUpdated: -1 } }
    );

    if (!savedData) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No saved GitHub analytics data found'
      });
    }

    return NextResponse.json({
      success: true,
      data: savedData.analyticsData,
      lastUpdated: savedData.lastUpdated,
      username: savedData.username,
      requestId: savedData.requestId
    });

  } catch (error) {
    console.error('Error retrieving GitHub profile data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve GitHub profile data'
    }, { status: 500 });
  }
}

// POST: Save GitHub analytics data to database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { analyticsData, username, requestId } = body;

    if (!analyticsData || !username) {
      return NextResponse.json({
        success: false,
        error: 'Analytics data and username are required'
      }, { status: 400 });
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();
    const database = await db.getDb();
    const githubAnalyticsCollection = database.collection('github_analytics');

    // Upsert the analytics data
    const result = await githubAnalyticsCollection.updateOne(
      { 
        userId: new ObjectId(session.user.id),
        username: username
      },
      {
        $set: {
          analyticsData,
          lastUpdated: new Date(),
          requestId: requestId || null
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'GitHub analytics data saved successfully',
      upserted: result.upsertedCount > 0,
      modified: result.modifiedCount > 0
    });

  } catch (error) {
    console.error('Error saving GitHub profile data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save GitHub profile data'
    }, { status: 500 });
  }
}

// DELETE: Remove saved GitHub analytics data
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({
        success: false,
        error: 'Username is required'
      }, { status: 400 });
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();
    const database = await db.getDb();
    const githubAnalyticsCollection = database.collection('github_analytics');

    const result = await githubAnalyticsCollection.deleteOne({
      userId: new ObjectId(session.user.id),
      username: username
    });

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount > 0,
      message: result.deletedCount > 0 
        ? 'GitHub analytics data deleted successfully'
        : 'No data found to delete'
    });

  } catch (error) {
    console.error('Error deleting GitHub profile data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete GitHub profile data'
    }, { status: 500 });
  }
}