import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';

interface CreditTransaction {
  _id: string;
  userId: string;
  serviceType: string;
  creditsDeducted: number;
  description?: string;
  createdAt: Date;
  requestId: string;
  status: string;
  payload: any;
}

interface TransactionSummary {
  _id: string;
  totalCreditsUsed: number;
  usageCount: number;
  lastUsed: Date;
}

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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const serviceType = searchParams.get('serviceType');

    // Build query filter
    const filter: any = { userId };
    if (serviceType) {
      filter.serviceType = serviceType;
    }

    // Get total count for pagination
    const total = await db.getDb().collection('credit_transactions').countDocuments(filter);

    // Fetch transactions with pagination
    const transactions = await db.getDb().collection('credit_transactions')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: { userId } },
      {
        $group: {
          _id: '$serviceType',
          totalCreditsUsed: { $sum: '$creditsDeducted' },
          usageCount: { $sum: 1 },
          lastUsed: { $max: '$createdAt' }
        }
      }
    ];

    const summary = await db.getDb().collection('credit_transactions')
      .aggregate(summaryPipeline)
      .toArray();

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await db.getDb().collection('credit_transactions')
      .find({
        userId,
        createdAt: { $gte: sevenDaysAgo }
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      transactions: transactions.map((tx: any) => ({
        id: tx._id,
        serviceType: tx.serviceType,
        creditsDeducted: tx.creditsDeducted,
        description: tx.description || `${tx.serviceType?.toUpperCase()} service usage`,
        timestamp: tx.createdAt,
        requestId: tx.requestId,
        status: tx.status,
        payload: tx.payload
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: summary.map((s: any) => ({
        serviceType: s._id,
        totalCreditsUsed: s.totalCreditsUsed,
        usageCount: s.usageCount,
        lastUsed: s.lastUsed
      })),
      recentActivity: recentActivity.map((tx: any) => ({
        id: tx._id,
        serviceType: tx.serviceType,
        creditsDeducted: tx.creditsDeducted,
        timestamp: tx.createdAt,
        description: tx.description || `${tx.serviceType?.toUpperCase()} service usage`
      }))
    });

  } catch (error) {
    console.error('Error fetching credit history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}