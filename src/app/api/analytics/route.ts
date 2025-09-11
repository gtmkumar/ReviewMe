import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { AnalyticsService } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the database manager instance - connection is handled once at startup
    const db = getDbManager();
    const database = await db.getDb();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const userId = session.user.id;
    const analytics = await AnalyticsService.getUserAnalytics(userId, days);

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const { 
      sessionId, 
      actionType, 
      page, 
      element, 
      duration, 
      metadata 
    } = await request.json();

    const userId = session.user.id;

    await AnalyticsService.trackActivity(
      userId,
      sessionId,
      actionType,
      {
        page,
        element,
        duration,
        ...metadata
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}