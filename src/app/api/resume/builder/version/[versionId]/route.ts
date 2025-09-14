import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

// GET: Load a specific resume version
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { versionId } = await params;

    if (!ObjectId.isValid(versionId)) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      );
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = new ObjectId(session.user.id);
    const resumeBuilderCollection = await db.getCollection('resume_builder');

    // Find the specific version that belongs to the user
    const resume = await resumeBuilderCollection.findOne({
      _id: new ObjectId(versionId),
      userId
    });

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      resumeData: resume.resumeData,
      version: resume.version,
      savedAt: resume.savedAt,
      creditsUsed: resume.creditsUsed,
      metadata: resume.metadata
    });

  } catch (error) {
    console.error('Error loading resume version:', error);
    return NextResponse.json(
      { error: 'Failed to load resume version' },
      { status: 500 }
    );
  }
}

// POST: Restore a specific version (with credit cost)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { versionId } = await params;

    if (!ObjectId.isValid(versionId)) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      );
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = new ObjectId(session.user.id);
    const RESTORE_CREDITS = 5; // Reduced cost for restoring

    // Check user credits
    const usersCollection = await db.getUsersCollection();
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.credits < RESTORE_CREDITS) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${RESTORE_CREDITS} credits to restore this version.` },
        { status: 403 }
      );
    }

    // Find the version to restore
    const resumeBuilderCollection = await db.getCollection('resume_builder');
    const versionToRestore = await resumeBuilderCollection.findOne({
      _id: new ObjectId(versionId),
      userId
    });

    if (!versionToRestore) {
      return NextResponse.json(
        { error: 'Resume version not found' },
        { status: 404 }
      );
    }

    // Start transaction
    const session_db = db.client!.startSession();
    
    try {
      await session_db.withTransaction(async () => {
        const now = new Date();

        // Deduct credits
        await usersCollection.updateOne(
          { _id: userId },
          { 
            $inc: { credits: -RESTORE_CREDITS },
            $set: { updatedAt: now }
          },
          { session: session_db }
        );

        // Get next version number
        const latestResume = await resumeBuilderCollection.findOne(
          { userId },
          { sort: { version: -1 } },
          { session: session_db }
        );
        
        const newVersion = latestResume ? (latestResume.version || 0) + 1 : 1;

        // Create new version from restored data
        const restoredDocument = {
          userId,
          resumeData: versionToRestore.resumeData,
          version: newVersion,
          savedAt: now,
          createdAt: now,
          updatedAt: now,
          creditsUsed: RESTORE_CREDITS,
          isPublished: true,
          isRestored: true,
          restoredFrom: {
            versionId: new ObjectId(versionId),
            originalVersion: versionToRestore.version,
            originalSavedAt: versionToRestore.savedAt
          },
          metadata: versionToRestore.metadata
        };

        await resumeBuilderCollection.insertOne(restoredDocument, { session: session_db });

        // Log transaction
        const creditTransactionsCollection = await db.getCollection('credit_transactions');
        await creditTransactionsCollection.insertOne({
          userId,
          serviceType: 'resume_builder',
          creditsUsed: RESTORE_CREDITS,
          timestamp: now,
          status: 'completed',
          metadata: {
            action: 'resume_restore',
            version: newVersion,
            restoredFromVersion: versionToRestore.version
          }
        }, { session: session_db });
      });

      return NextResponse.json({
        success: true,
        message: `Resume version restored successfully! ${RESTORE_CREDITS} credits deducted.`,
        creditsUsed: RESTORE_CREDITS,
        remainingCredits: user.credits - RESTORE_CREDITS,
        resumeData: versionToRestore.resumeData
      });

    } finally {
      await session_db.endSession();
    }

  } catch (error) {
    console.error('Error restoring resume version:', error);
    return NextResponse.json(
      { error: 'Failed to restore resume version' },
      { status: 500 }
    );
  }
}