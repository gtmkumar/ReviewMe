import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { CreditService, RequestLogService, AnalyticsService, ServiceType, CREDIT_COSTS } from '@/lib/services';

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
    const credits = await CreditService.getUserCredits(userId);
    const isLowCredits = await CreditService.checkLowCredits(userId);

    return NextResponse.json({ 
      credits, 
      isLowCredits,
      costs: CREDIT_COSTS
    });
  } catch (error) {
    console.error('Error getting user credits:', error);
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

    const { action, serviceType, payload } = await request.json();
    const userId = session.user?.id;

    if (action === 'check') {
      // Check if user has enough credits without deducting
      const currentCredits = await CreditService.getUserCredits(userId);
      const requiredCredits = CREDIT_COSTS[serviceType as ServiceType];
      const isLowCredits = await CreditService.checkLowCredits(userId);
      
      return NextResponse.json({ 
        credits: currentCredits,
        required: requiredCredits,
        hasEnoughCredits: currentCredits >= requiredCredits,
        isLowCredits,
        costs: CREDIT_COSTS
      });
    }
    
    if (action === 'check_and_deduct') {
      // Check if user has enough credits and deduct if possible
      const hasCredits = await CreditService.deductCredits(userId, serviceType as ServiceType);
      
      if (!hasCredits) {
        const currentCredits = await CreditService.getUserCredits(userId);
        return NextResponse.json({ 
          error: 'Insufficient credits',
          currentCredits,
          required: CREDIT_COSTS[serviceType as ServiceType]
        }, { status: 402 }); // Payment Required
      }

      // Log the request with detailed information
      const requestId = await RequestLogService.logRequest(
        userId,
        serviceType as ServiceType,
        payload,
        CREDIT_COSTS[serviceType as ServiceType]
      );

      // Create detailed transaction log
      const transactionDetails = {
        timestamp: new Date().toISOString(),
        userId,
        serviceType,
        creditsDeducted: CREDIT_COSTS[serviceType as ServiceType],
        requestId,
        payload,
        transactionType: 'service_usage'
      };

      // Log transaction for audit trail
      console.log('Credit Deduction Transaction:', {
        userId,
        serviceType,
        creditsDeducted: CREDIT_COSTS[serviceType as ServiceType],
        requestId,
        timestamp: transactionDetails.timestamp
      });

      // Store transaction in database for user history
      await db.getDb().collection('credit_transactions').insertOne({
        ...transactionDetails,
        createdAt: new Date(),
        status: 'completed'
      });

      const remainingCredits = await CreditService.getUserCredits(userId);
      const isLowCredits = await CreditService.checkLowCredits(userId);

      return NextResponse.json({ 
        success: true,
        requestId,
        remainingCredits,
        isLowCredits,
        creditsDeducted: CREDIT_COSTS[serviceType as ServiceType],
        transaction: {
          id: requestId,
          serviceType,
          amount: CREDIT_COSTS[serviceType as ServiceType],
          timestamp: transactionDetails.timestamp,
          description: `${serviceType.toUpperCase()} service usage`
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing credit request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}