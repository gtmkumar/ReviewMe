import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

// POST: Auto-save resume data (no credit deduction, draft save)
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

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = new ObjectId(session.user.id);
    const resumeDraftsCollection = await db.getCollection('resume_drafts');
    const now = new Date();

    // Upsert draft (update if exists, create if not)
    await resumeDraftsCollection.updateOne(
      { userId },
      {
        $set: {
          resumeData,
          updatedAt: now,
          autoSaved: true
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Draft auto-saved',
      timestamp: now
    });

  } catch (error) {
    console.error('Error auto-saving resume:', error);
    return NextResponse.json(
      { error: 'Failed to auto-save resume' },
      { status: 500 }
    );
  }
}

// GET: Load auto-saved draft
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = new ObjectId(session.user.id);
    const resumeDraftsCollection = await db.getCollection('resume_drafts');
    
    const draft = await resumeDraftsCollection.findOne({ userId });

    return NextResponse.json({
      success: true,
      draft: draft ? draft.resumeData : null,
      lastAutoSaved: draft?.updatedAt || null
    });

  } catch (error) {
    console.error('Error loading draft:', error);
    return NextResponse.json(
      { error: 'Failed to load draft' },
      { status: 500 }
    );
  }
}