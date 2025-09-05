import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { DataCacheService, RequestLogService } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = session.user.id;
    const cachedData = await DataCacheService.getAllCachedData(userId);

    // Get request counts for each service
    const [githubStats, linkedinStats, resumeStats] = await Promise.all([
      RequestLogService.getServiceStats(userId, 'github'),
      RequestLogService.getServiceStats(userId, 'linkedin'),
      RequestLogService.getServiceStats(userId, 'resume')
    ]);

    // Check data freshness (24 hours by default)
    const freshness = {
      github: await DataCacheService.isDataFresh(userId, 'github'),
      linkedin: await DataCacheService.isDataFresh(userId, 'linkedin'),
      resume: await DataCacheService.isDataFresh(userId, 'resume')
    };

    return NextResponse.json({
      data: cachedData,
      stats: {
        github: githubStats,
        linkedin: linkedinStats,
        resume: resumeStats
      },
      freshness
    });
  } catch (error) {
    console.error('Error getting dashboard cache:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}