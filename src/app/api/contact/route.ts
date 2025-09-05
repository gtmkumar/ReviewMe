import { NextRequest, NextResponse } from 'next/server';
import { getDbManager } from '@/lib/database';
import { contactService } from '@/lib/contact-service';
import { rateLimit } from '@/lib/security';
import { z } from 'zod';

// Validation schema for contact form
const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  message: z.string().min(50, 'Message must be at least 50 characters').max(2000, 'Message too long'),
  sessionId: z.string().optional(),
  escalatedFromFaq: z.boolean().optional(),
  previousFaqAttempts: z.array(z.string()).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = contactFormSchema.parse(body);

    // Rate limiting - strict for contact form to prevent spam
    const rateLimitResult = await rateLimit(
      request,
      { requests: 3, window: 15 * 60 * 1000 } // 3 submissions per 15 minutes
    );
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Too many submissions. Please wait before submitting again.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      );
    }

    // Initialize database connection
    await getDbManager(process.env.MONGODB_URI).connect();

    // Get client information
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referrer = request.headers.get('referer') || undefined;

    // Extract form data for service
    const { sessionId, escalatedFromFaq, previousFaqAttempts, ...formData } = validatedData;

    // Submit the contact query
    const queryId = await contactService.submitContactQuery(
      formData,
      undefined, // userId - not implemented for anonymous users in this version
      {
        ipAddress: clientIP,
        userAgent,
        referrer,
        sessionId,
        escalatedFromFaq,
        previousFaqAttempts
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Thank you for reaching out! Your request has been received. Our team will get back to you soon.',
      queryId,
      metadata: {
        submittedAt: new Date().toISOString(),
        expectedResponseTime: '24-48 hours'
      }
    });

  } catch (error) {
    console.error('Contact form submission error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.issues.forEach((err: any) => {
        if (err.path.length > 0) {
          fieldErrors[err.path[0]] = err.message;
        }
      });

      return NextResponse.json(
        { 
          success: false,
          error: 'Please check your form data',
          fieldErrors
        },
        { status: 400 }
      );
    }

    // Handle duplicate submission errors
    if (error instanceof Error && error.message.includes('wait before submitting')) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message 
        },
        { status: 409 }
      );
    }

    // Generic error
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to submit your query. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // This endpoint could be used for admin/support to view queries
    // For now, just return basic statistics or categories
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Initialize database connection
    await getDbManager(process.env.MONGODB_URI).connect();

    if (action === 'categories') {
      // Return available categories for filtering
      const categories = [
        'general',
        'github',
        'linkedin',
        'resume',
        'billing',
        'account',
        'privacy'
      ];

      return NextResponse.json({
        success: true,
        categories
      });
    }

    if (action === 'stats') {
      // Return basic statistics (public info only)
      const stats = await contactService.getQueryStatistics();
      
      // Return only non-sensitive stats
      return NextResponse.json({
        success: true,
        stats: {
          totalQueries: stats.total,
          resolutionRate: Math.round(stats.resolutionRate),
          averageResponseTime: Math.round(stats.averageResponseTime * 10) / 10 + ' hours'
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'API error' 
      },
      { status: 500 }
    );
  }
}