import { NextRequest, NextResponse } from 'next/server';
import { getDbManager } from '@/lib/database';
import { faqService } from '@/lib/faq-service';

export async function POST(request: NextRequest) {
  try {
    // Initialize database connection
    await getDbManager(process.env.MONGODB_URI).connect();
    
    // Initialize default FAQs
    await faqService.initializeDefaultFAQs();
    
    return NextResponse.json({
      success: true,
      message: 'FAQs initialized successfully'
    });
  } catch (error) {
    console.error('FAQ initialization error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to initialize FAQs' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Initialize database connection
    await getDbManager(process.env.MONGODB_URI).connect();
    
    // Get FAQ statistics
    const db = getDbManager();
    const faqCount = await db.faqs.countDocuments();
    const activeCount = await db.faqs.countDocuments({ isActive: true });
    
    return NextResponse.json({
      success: true,
      stats: {
        totalFAQs: faqCount,
        activeFAQs: activeCount
      }
    });
  } catch (error) {
    console.error('FAQ stats error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get FAQ stats' 
      },
      { status: 500 }
    );
  }
}