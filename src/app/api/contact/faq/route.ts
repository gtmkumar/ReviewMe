import { NextRequest, NextResponse } from 'next/server';
import { getDbManager } from '@/lib/database';
import { faqService } from '@/lib/faq-service';
import { faqCache } from '@/lib/faq-cache';
import { rateLimit } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');
    const sessionId = searchParams.get('sessionId') || undefined;

    // Rate limiting
    const rateLimitResult = await rateLimit(
      request,
      { requests: 30, window: 60 * 1000 } // 30 requests per minute
    );
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      );
    }

    // Initialize database connection
    await getDbManager(process.env.MONGODB_URI).connect();

    if (!query.trim()) {
      // Check cache first for popular FAQs
      let popularFAQs = faqCache.getPopularFAQs(category, limit);
      
      if (!popularFAQs) {
        // If no cache, fetch from service and cache
        popularFAQs = await faqService.getPopularFAQs(category, limit);
        faqCache.setPopularFAQs(popularFAQs, category, limit);
      }
      
      return NextResponse.json({
        success: true,
        results: popularFAQs.map(faq => ({
          faq,
          score: 100,
          matchedKeywords: []
        })),
        isPopular: true,
        cached: true
      });
    }

    // Check cache first for search results
    let searchResults = faqCache.getSearchResults(query, category, limit);
    let cached = false;
    
    if (!searchResults) {
      // Search FAQs based on query
      searchResults = await faqService.searchFAQs(query, category, limit);
      
      // Cache the results
      faqCache.setSearchResults(query, searchResults, category, limit);
    } else {
      cached = true;
    }

    // Get categories (check cache first)
    let categories = faqCache.getCategories();
    
    if (!categories) {
      categories = await faqService.getCategories();
      faqCache.setCategories(categories);
    }

    // Track search analytics (optional)
    if (sessionId) {
      // You could track search queries for analytics
    }

    return NextResponse.json({
      success: true,
      results: searchResults,
      categories,
      query,
      isPopular: false,
      cached
    });

  } catch (error) {
    console.error('FAQ search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search FAQs' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { faqId, feedback, sessionId } = body;

    if (!faqId || typeof feedback !== 'boolean') {
      return NextResponse.json(
        { error: 'FAQ ID and feedback (boolean) are required' },
        { status: 400 }
      );
    }

    // Rate limiting for feedback
    const rateLimitResult = await rateLimit(
      request,
      { requests: 10, window: 60 * 1000 } // 10 feedback submissions per minute
    );
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many feedback submissions. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      );
    }

    // Initialize database connection
    await getDbManager(process.env.MONGODB_URI).connect();

    // Submit feedback
    await faqService.submitFeedback(faqId, feedback, undefined, sessionId);

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!'
    });

  } catch (error) {
    console.error('FAQ feedback error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit feedback' 
      },
      { status: 500 }
    );
  }
}