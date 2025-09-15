import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('Unauthorized request - no session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = session.user.id;
    
    // Security: Validate userId format
    if (!userId || typeof userId !== 'string') {
      console.warn('Invalid user ID format:', userId);
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    
    // Additional security: Ensure userId is a valid ObjectId format if needed
    let userObjectId;
    try {
      userObjectId = ObjectId.isValid(userId) ? userId : userId;
    } catch (error) {
      console.warn('User ID validation failed:', userId);
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); // Default to 50 as requested by frontend
    const serviceType = searchParams.get('serviceType');

    console.log('Fetching transactions for user:', {
      userId,
      page,
      limit,
      serviceType
    });

    // Security: Ensure we only query for the authenticated user's data
    const secureFilter: any = { userId };
    if (serviceType) {
      secureFilter.serviceType = serviceType;
    }

    // Get both credit transactions and user requests
    const creditTransactionsCollection = await db.getCreditTransactionsCollection();
    const userRequestsCollection = await db.getUserRequestsCollection();
    
    console.log('Collections accessed for user:', userId);

    // Get transactions from credit_transactions collection
    const creditTransactions = await creditTransactionsCollection
      .find(secureFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    console.log('Credit transactions found:', creditTransactions.length);

    // Get transactions from userRequests collection 
    const userRequests = await userRequestsCollection
      .find(secureFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    console.log('User requests found:', userRequests.length);

    // Combine and normalize all transactions
    const allTransactions: any[] = [];
    
    // Add credit transactions
    creditTransactions.forEach((tx: any) => {
      // Security: Sanitize sensitive data
      const sanitizedPayload = tx.payload || tx.metadata;
      if (sanitizedPayload && sanitizedPayload.password) {
        delete sanitizedPayload.password;
      }
      if (sanitizedPayload && sanitizedPayload.token) {
        delete sanitizedPayload.token;
      }
      
      allTransactions.push({
        id: tx._id,
        serviceType: tx.serviceType,
        creditsDeducted: tx.creditsDeducted || tx.creditsUsed || 0,
        description: tx.description || `${tx.serviceType?.toUpperCase()} service usage`,
        timestamp: tx.createdAt,
        requestId: tx.requestId,
        status: tx.status || 'completed',
        payload: sanitizedPayload,
        source: 'credit_transactions'
      });
    });

    // Add user requests as transactions
    userRequests.forEach((req: any) => {
      // Security: Sanitize sensitive data
      const sanitizedPayload = req.requestPayload;
      if (sanitizedPayload && sanitizedPayload.password) {
        delete sanitizedPayload.password;
      }
      if (sanitizedPayload && sanitizedPayload.token) {
        delete sanitizedPayload.token;
      }
      
      allTransactions.push({
        id: req._id,
        serviceType: req.serviceType,
        creditsDeducted: req.creditsDeducted,
        description: `${req.serviceType?.toUpperCase()} service request`,
        timestamp: req.createdAt,
        requestId: req._id,
        status: req.status,
        payload: sanitizedPayload,
        source: 'userRequests'
      });
    });

    // Sort all transactions by timestamp (newest first)
    allTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination to combined results
    const startIndex = (page - 1) * limit;
    const paginatedTransactions = allTransactions.slice(startIndex, startIndex + limit);

    console.log('Total combined transactions:', allTransactions.length);
    console.log('Paginated transactions:', paginatedTransactions.length);

    // Calculate summary statistics from all transactions
    const summaryMap = new Map();
    allTransactions.forEach(tx => {
      if (!summaryMap.has(tx.serviceType)) {
        summaryMap.set(tx.serviceType, {
          serviceType: tx.serviceType,
          totalCreditsUsed: 0,
          usageCount: 0,
          lastUsed: tx.timestamp
        });
      }
      const summary = summaryMap.get(tx.serviceType);
      summary.totalCreditsUsed += tx.creditsDeducted || 0;
      summary.usageCount += 1;
      if (new Date(tx.timestamp) > new Date(summary.lastUsed)) {
        summary.lastUsed = tx.timestamp;
      }
    });

    const summary = Array.from(summaryMap.values());

    // Get recent activity (last 7 days) from combined transactions
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = allTransactions
      .filter(tx => new Date(tx.timestamp) >= sevenDaysAgo)
      .slice(0, 5)
      .map(tx => ({
        id: tx.id,
        serviceType: tx.serviceType,
        creditsDeducted: tx.creditsDeducted,
        timestamp: tx.timestamp,
        description: tx.description
      }));

    console.log('Response summary:', {
      totalTransactions: allTransactions.length,
      paginatedCount: paginatedTransactions.length,
      summaryCount: summary.length,
      recentActivityCount: recentActivity.length
    });

    return NextResponse.json({
      transactions: paginatedTransactions,
      pagination: {
        page,
        limit,
        total: allTransactions.length,
        pages: Math.ceil(allTransactions.length / limit)
      },
      summary,
      recentActivity
    });

  } catch (error) {
    console.error('Error fetching credit history:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}