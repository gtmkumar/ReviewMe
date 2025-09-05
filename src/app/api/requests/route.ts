import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RequestLogService, ServiceType } from '@/lib/services';
import { getDbManager } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get('serviceType') as ServiceType | null;
    const limit = parseInt(searchParams.get('limit') || '50');

    const userId = session.user.id;
    const history = await RequestLogService.getUserRequestHistory(userId, serviceType || undefined, limit);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error getting request history:', error);
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
      requestId, 
      status, 
      responseData, 
      analysisResults, 
      processingTime, 
      errorMessage 
    } = await request.json();

    const userId = session.user.id;

    // Update request status
    await RequestLogService.updateRequestStatus(requestId, status, errorMessage);

    // Log response if successful
    if (status === 'completed' && responseData) {
      // Get request details to determine service type
      const db = getDbManager(process.env.MONGODB_URI!);
      await db.connect();
      const request = await db.userRequests.findOne({ _id: requestId });
      
      if (request) {
        await RequestLogService.logResponse(
          userId,
          requestId,
          request.serviceType,
          responseData,
          analysisResults,
          processingTime
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}