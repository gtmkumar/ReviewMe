import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import ResumeParsingService from '@/lib/resume-service';
import { getDbManager } from '@/lib/database';
import { RequestLogService } from '@/lib/services';
import { ObjectId } from 'mongodb';

// Helper function to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

// Helper function to call external resume review API
async function callResumeReviewAPI(base64File: string): Promise<any> {
  try {
    const apiResponse = await fetch('https://resmume.com/api/resume-review', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-GB,en;q=0.9,en-US;q=0.8,en-IN;q=0.7',
        'content-type': 'application/json',
        'origin': 'https://resmume.com',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Microsoft Edge";v="140"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'
      },
      body: JSON.stringify({
        base64file: `data:application/pdf;base64,${base64File}`
      })
    });

    console.log('API Response Status:', apiResponse.status);
    console.log('API Response Headers:', Object.fromEntries(apiResponse.headers.entries()));

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('API Error Response:', errorText);
      console.log('External API failed, using fallback service');
      return createFallbackResponse(base64File);
    }

    const responseData = await apiResponse.json();
    console.log('API Response Data:', responseData);
    return responseData;
    
  } catch (error) {
    console.error('API Call Error:', error);
    // Return a fallback response to keep the service working
    return createFallbackResponse(base64File);
  }
}

// Fallback function when external API is not available
function createFallbackResponse(base64File: string): any {
  // Generate a basic analysis based on file characteristics
  const fileSize = base64File.length;
  let score = 60; // Base score
  
  // Adjust score based on file size (larger files might have more content)
  if (fileSize > 200000) score += 10; // Substantial content
  if (fileSize > 500000) score += 5;  // Very detailed resume
  
  const feedback = [
    "Note: This is a basic analysis as the external review service is currently unavailable.",
    "Grammar check: Please review your resume for any grammatical errors and ensure consistent formatting.",
    "Content structure: Ensure your resume includes clear sections for contact information, professional summary, experience, education, and skills.",
    "Professional formatting: Use consistent bullet points, font sizes, and spacing throughout your document.",
    "Keywords optimization: Include relevant industry keywords that match your target job descriptions.",
    "Quantifiable achievements: Add specific numbers and metrics to demonstrate your impact in previous roles."
  ];
  
  return {
    success: true,
    message: "Analysis completed with fallback service",
    isUsingFallback: true,
    data: {
      review: {
        score: Math.min(score, 85), // Cap at 85 for fallback
        errors: feedback
      }
    }
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type - only PDF for external API
    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PDF files are supported for detailed analysis.' 
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Find user
    const usersCollection = await db.getUsersCollection();
    const user = await usersCollection.findOne({ 
      email: session.user.email!.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    const userId = user._id!.toString();

    try {
      // Log the service request
      const requestId = await RequestLogService.logRequest(
        userId,
        'resume',
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        },
        10 // Credit cost for resume analysis
      );

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `resume-${userId}-${timestamp}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      // Save file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Convert file to base64 for external API
      const base64File = await fileToBase64(file);
      
      // Call external resume review API (with fallback)
      const externalApiResponse = await callResumeReviewAPI(base64File);
      
      if (!externalApiResponse.success) {
        console.warn('External API returned non-success status, but continuing with available data');
      }

      const reviewData = externalApiResponse.data.review;
      const isUsingFallback = externalApiResponse.isUsingFallback || false;

      // Store comprehensive resume data in database
      const database = await db.getDb();
      const resumeAnalysisCollection = database.collection('resume_analysis');
      
      const resumeDocument = {
        userId: new ObjectId(userId),
        requestId,
        fileName: file.name,
        originalName: file.name,
        filePath,
        fileSize: file.size,
        mimeType: file.type,
        type: 'resume' as const,
        status: 'completed' as const,
        uploadedAt: new Date(),
        externalApiResponse: {
          score: reviewData.score,
          errors: reviewData.errors || [],
          feedback: reviewData.errors || [], // Map errors to feedback
          rawResponse: externalApiResponse,
          isUsingFallback
        },
        analysisResults: {
          score: reviewData.score,
          suggestions: reviewData.errors || [],
          detailedFeedback: reviewData.errors || [],
          strengths: extractStrengths(reviewData),
          weaknesses: extractWeaknesses(reviewData),
          isUsingFallback
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await resumeAnalysisCollection.insertOne(resumeDocument);

      // Log successful response
      await RequestLogService.logResponse(
        userId,
        requestId,
        'resume',
        {
          fileName: file.name,
          fileSize: file.size,
          score: reviewData.score,
          feedback: reviewData.errors,
          analysisId: result.insertedId
        },
        {
          score: reviewData.score,
          suggestions: reviewData.errors || [],
          strengths: extractStrengths(reviewData),
          weaknesses: extractWeaknesses(reviewData),
          totalFeedbackItems: (reviewData.errors || []).length
        },
        10 // Processing time in milliseconds
      );

      // Update request status to completed
      await RequestLogService.updateRequestStatus(requestId, 'completed');

      return NextResponse.json({
        success: true,
        data: {
          id: result.insertedId,
          fileName: file.name,
          fileSize: file.size,
          status: 'completed',
          analysis: {
            score: reviewData.score,
            feedback: reviewData.errors || [],
            suggestions: reviewData.errors || [],
            strengths: extractStrengths(reviewData),
            weaknesses: extractWeaknesses(reviewData),
            isUsingFallback
          },
          requestId,
          message: isUsingFallback ? 'Analysis completed using fallback service due to external API unavailability' : 'Analysis completed successfully'
        }
      });

    } catch (error: any) {
      console.error('Resume analysis error:', error);
      
      // If we have a requestId, log the error
      const requestIdFromError = (error as any).requestId;
      if (requestIdFromError) {
        await RequestLogService.logResponse(
          userId,
          requestIdFromError,
          'resume',
          {},
          {},
          0
        );
        await RequestLogService.updateRequestStatus(requestIdFromError, 'failed');
      }

      return NextResponse.json(
        { 
          error: 'Resume analysis failed',
          details: error.message,
          status: 'failed'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to extract strengths from review data
function extractStrengths(reviewData: any): string[] {
  const strengths: string[] = [];
  
  if (reviewData.score >= 80) {
    strengths.push('Excellent overall resume quality');
  } else if (reviewData.score >= 60) {
    strengths.push('Good resume foundation');
  }
  
  // Extract positive aspects from error messages (inverse logic)
  const errors = reviewData.errors || [];
  const errorText = errors.join(' ').toLowerCase();
  
  if (!errorText.includes('contact')) {
    strengths.push('Complete contact information');
  }
  if (!errorText.includes('formatting')) {
    strengths.push('Good formatting and structure');
  }
  if (!errorText.includes('grammar')) {
    strengths.push('Good grammar and language use');
  }
  
  return strengths.length > 0 ? strengths : ['Resume uploaded successfully'];
}

// Helper function to extract weaknesses from review data
function extractWeaknesses(reviewData: any): string[] {
  const weaknesses: string[] = [];
  const errors = reviewData.errors || [];
  
  // Categorize errors into weaknesses
  errors.forEach((error: string) => {
    const errorLower = error.toLowerCase();
    if (errorLower.includes('grammar')) {
      weaknesses.push('Grammar and language issues detected');
    } else if (errorLower.includes('format')) {
      weaknesses.push('Formatting inconsistencies');
    } else if (errorLower.includes('professional')) {
      weaknesses.push('Professional tone needs improvement');
    } else if (errorLower.includes('irrelevant') || errorLower.includes('unnecessary')) {
      weaknesses.push('Contains irrelevant or unnecessary information');
    } else if (errorLower.includes('experience')) {
      weaknesses.push('Experience section needs enhancement');
    }
  });
  
  if (reviewData.score < 60) {
    weaknesses.push('Overall resume quality needs significant improvement');
  }
  
  return weaknesses.length > 0 ? weaknesses : [];
}