import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Find user
    const usersCollection = await db.getUsersCollection();
    const user = await usersCollection.findOne({ 
      email: session.user.email.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    const userId = user._id!.toString();

    // Get resume analysis data
    const database = await db.getDb();
    const resumeAnalysisCollection = database.collection('resume_analysis');
    
    // Get the latest resume analysis for the user
    const latestAnalysis = await resumeAnalysisCollection.findOne(
      { userId: new ObjectId(userId) },
      { sort: { createdAt: -1 } }
    );

    if (!latestAnalysis) {
      return NextResponse.json({
        hasAnalysis: false,
        message: 'No resume analysis found'
      });
    }

    // Return formatted analysis data
    return NextResponse.json({
      hasAnalysis: true,
      data: {
        id: latestAnalysis._id,
        fileName: latestAnalysis.fileName,
        fileSize: latestAnalysis.fileSize,
        uploadedAt: latestAnalysis.uploadedAt,
        score: latestAnalysis.externalApiResponse?.score || 0,
        feedback: latestAnalysis.externalApiResponse?.feedback || [],
        suggestions: latestAnalysis.analysisResults?.suggestions || [],
        strengths: latestAnalysis.analysisResults?.strengths || [],
        weaknesses: latestAnalysis.analysisResults?.weaknesses || [],
        detailedFeedback: latestAnalysis.analysisResults?.detailedFeedback || [],
        status: latestAnalysis.status,
        requestId: latestAnalysis.requestId,
        isUsingFallback: latestAnalysis.analysisResults?.isUsingFallback || false,
        message: latestAnalysis.externalApiResponse?.isUsingFallback 
          ? 'Analysis completed using fallback service' 
          : 'Analysis completed successfully'
      }
    });

  } catch (error) {
    console.error('Error fetching resume analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}