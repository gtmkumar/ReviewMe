import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

// POST: Save final resume with credit deduction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { resumeData } = await request.json();

    if (!resumeData) {
      return NextResponse.json(
        { error: 'Resume data is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!resumeData.personalInfo?.name || !resumeData.personalInfo?.email) {
      return NextResponse.json(
        { error: 'Name and email are required fields' },
        { status: 400 }
      );
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = new ObjectId(session.user.id);
    const REQUIRED_CREDITS = 15;

    // Check user credits
    const usersCollection = await db.getUsersCollection();
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.credits < REQUIRED_CREDITS) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${REQUIRED_CREDITS} credits to save your resume. You have ${user.credits} credits.` },
        { status: 403 }
      );
    }

    // Start database transaction
    const session_db = db.client!.startSession();
    
    try {
      await session_db.withTransaction(async () => {
        const now = new Date();

        // Deduct credits from user
        await usersCollection.updateOne(
          { _id: userId },
          { 
            $inc: { credits: -REQUIRED_CREDITS },
            $set: { updatedAt: now }
          },
          { session: session_db }
        );

        // Save resume to main collection with versioning
        const database = await db.getDb();
        const resumeBuilderCollection = database.collection('resume_builder');
        
        // Get current version number
        const latestResume = await resumeBuilderCollection.findOne(
          { userId },
          { sort: { version: -1 } },
          { session: session_db }
        );
        
        const version = latestResume ? (latestResume.version || 0) + 1 : 1;

        // Create resume document
        const resumeDocument = {
          userId,
          resumeData,
          version,
          savedAt: now,
          createdAt: now,
          updatedAt: now,
          creditsUsed: REQUIRED_CREDITS,
          isPublished: true,
          metadata: {
            sectionsCompleted: calculateCompletedSections(resumeData),
            totalSections: 8
          }
        };

        const result = await resumeBuilderCollection.insertOne(resumeDocument, { session: session_db });

        // Log credit transaction
        const creditTransactionsCollection = database.collection('credit_transactions');
        await creditTransactionsCollection.insertOne({
          userId,
          serviceType: 'resume_builder',
          creditsUsed: REQUIRED_CREDITS,
          timestamp: now,
          status: 'completed',
          metadata: {
            action: 'resume_save',
            version,
            resumeId: result.insertedId
          }
        }, { session: session_db });

        // Update user's resume reference (for quick access to latest)
        await usersCollection.updateOne(
          { _id: userId },
          {
            $set: {
              'latestResume': {
                resumeId: result.insertedId,
                version,
                savedAt: now
              }
            }
          },
          { session: session_db }
        );

        // Clean up draft if exists
        const resumeDraftsCollection = database.collection('resume_drafts');
        await resumeDraftsCollection.deleteOne({ userId }, { session: session_db });
      });

      return NextResponse.json({
        success: true,
        message: `Resume saved successfully! ${REQUIRED_CREDITS} credits deducted.`,
        creditsUsed: REQUIRED_CREDITS,
        remainingCredits: user.credits - REQUIRED_CREDITS,
        version: await getLatestVersion(db, userId)
      });

    } finally {
      await session_db.endSession();
    }

  } catch (error) {
    console.error('Error saving resume:', error);
    return NextResponse.json(
      { error: 'Failed to save resume. Please try again.' },
      { status: 500 }
    );
  }
}

// Helper function to calculate completed sections
function calculateCompletedSections(resumeData: any): number {
  let completed = 0;
  
  // Personal Info (required)
  if (resumeData.personalInfo?.name && resumeData.personalInfo?.email) {
    completed++;
  }
  
  // Experience
  if (resumeData.experience?.length > 0) {
    completed++;
  }
  
  // Education
  if (resumeData.education?.length > 0) {
    completed++;
  }
  
  // Projects
  if (resumeData.projects?.length > 0) {
    completed++;
  }
  
  // Certifications
  if (resumeData.certifications?.length > 0) {
    completed++;
  }
  
  // Skills
  if (resumeData.skills?.length > 0) {
    completed++;
  }
  
  // Achievements
  if (resumeData.achievements?.length > 0) {
    completed++;
  }
  
  // Activities
  if (resumeData.activities?.length > 0) {
    completed++;
  }
  
  return completed;
}

// Helper function to get latest version
async function getLatestVersion(db: any, userId: ObjectId): Promise<number> {
  const database = await db.getDb();
  const resumeBuilderCollection = database.collection('resume_builder');
  const latestResume = await resumeBuilderCollection.findOne(
    { userId },
    { sort: { version: -1 } }
  );
  
  return latestResume?.version || 1;
}