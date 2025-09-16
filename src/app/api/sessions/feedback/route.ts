import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';
import type { SessionFeedbackDocument } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = session.user.id;
    const body = await request.json();
    const { sessionId, feedbackType, feedbackData } = body;

    if (!sessionId || !ObjectId.isValid(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    if (!['mentor', 'mentee'].includes(feedbackType)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
    }

    // Verify session exists and user is part of it
    const sessionsCollection = await db.getSessionsCollection();
    const sessionItem = await sessionsCollection.findOne({
      _id: new ObjectId(sessionId)
    });

    if (!sessionItem) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (sessionItem.status !== 'completed') {
      return NextResponse.json({ 
        error: 'Feedback can only be submitted for completed sessions' 
      }, { status: 400 });
    }

    // Check if user is authorized to submit this type of feedback
    if (feedbackType === 'mentor' && sessionItem.mentorId !== userId) {
      return NextResponse.json({ error: 'Only the mentor can submit mentor feedback' }, { status: 403 });
    }

    if (feedbackType === 'mentee' && sessionItem.menteeId !== userId) {
      return NextResponse.json({ error: 'Only the mentee can submit mentee feedback' }, { status: 403 });
    }

    const feedbackCollection = await db.getSessionFeedbackCollection();
    const now = new Date();

    // Check if feedback already exists
    let existingFeedback = await feedbackCollection.findOne({ sessionId });

    if (feedbackType === 'mentor') {
      // Validate mentor feedback
      const { strengths, improvements, nextSteps, additionalNotes, attachments } = feedbackData;
      
      if (!strengths || !improvements || !nextSteps) {
        return NextResponse.json({ 
          error: 'Strengths, improvements, and next steps are required' 
        }, { status: 400 });
      }

      const mentorFeedback = {
        strengths,
        improvements,
        nextSteps,
        additionalNotes,
        attachments: attachments || [],
        submittedAt: now
      };

      if (existingFeedback) {
        // Update existing feedback
        await feedbackCollection.updateOne(
          { sessionId },
          {
            $set: {
              mentorFeedback,
              updatedAt: now
            }
          }
        );
      } else {
        // Create new feedback document
        const newFeedback: SessionFeedbackDocument = {
          sessionId,
          mentorId: sessionItem.mentorId,
          menteeId: sessionItem.menteeId,
          mentorFeedback,
          createdAt: now,
          updatedAt: now
        };
        await feedbackCollection.insertOne(newFeedback);
      }

      return NextResponse.json({
        message: 'Mentor feedback submitted successfully',
        sessionId
      });

    } else { // mentee feedback
      // Validate mentee feedback
      const { sessionQuality, mentorKnowledge, communication, wouldRecommend, comments } = feedbackData;
      
      if (!sessionQuality || !mentorKnowledge || !communication || wouldRecommend === undefined) {
        return NextResponse.json({ 
          error: 'All rating fields are required' 
        }, { status: 400 });
      }

      if (![1, 2, 3, 4, 5].includes(sessionQuality) || 
          ![1, 2, 3, 4, 5].includes(mentorKnowledge) || 
          ![1, 2, 3, 4, 5].includes(communication)) {
        return NextResponse.json({ 
          error: 'Ratings must be between 1 and 5' 
        }, { status: 400 });
      }

      const menteeFeedback = {
        sessionQuality,
        mentorKnowledge,
        communication,
        wouldRecommend,
        comments,
        submittedAt: now
      };

      if (existingFeedback) {
        // Update existing feedback
        await feedbackCollection.updateOne(
          { sessionId },
          {
            $set: {
              menteeFeedback,
              updatedAt: now
            }
          }
        );
      } else {
        // Create new feedback document
        const newFeedback: SessionFeedbackDocument = {
          sessionId,
          mentorId: sessionItem.mentorId,
          menteeId: sessionItem.menteeId,
          mentorFeedback: {} as any, // Will be set after creation
          menteeFeedback,
          createdAt: now,
          updatedAt: now
        };
        await feedbackCollection.insertOne(newFeedback);
      }

      // Update mentor's rating
      await updateMentorRating(db, sessionItem.mentorId);

      return NextResponse.json({
        message: 'Mentee feedback submitted successfully',
        sessionId
      });
    }

  } catch (error) {
    console.error('Error submitting feedback:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'mentee'; // 'mentor' or 'mentee'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const feedbackCollection = await db.getSessionFeedbackCollection();
    
    // Build filter based on role
    const filter: any = {};
    if (role === 'mentor') {
      filter.mentorId = userId;
    } else {
      filter.menteeId = userId;
    }

    const total = await feedbackCollection.countDocuments(filter);
    const feedback = await feedbackCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get session and user details
    const sessionsCollection = await db.getSessionsCollection();
    const usersCollection = await db.getUsersCollection();
    const mentorsCollection = await db.getMentorsCollection();

    const enrichedFeedback = await Promise.all(
      feedback.map(async (fb) => {
        const sessionItem = await sessionsCollection.findOne({ _id: new ObjectId(fb.sessionId) });
        
        let mentorInfo = null;
        let menteeInfo = null;

        if (role === 'mentee') {
          const mentor = await mentorsCollection.findOne({ _id: new ObjectId(fb.mentorId) });
          mentorInfo = mentor ? {
            id: mentor._id,
            name: mentor.name,
            avatar: mentor.avatar,
            role: mentor.role
          } : null;
        } else {
          const mentee = await usersCollection.findOne({ _id: new ObjectId(fb.menteeId) });
          menteeInfo = mentee ? {
            id: mentee._id,
            name: mentee.name,
            avatar: mentee.avatar
          } : null;
        }

        return {
          id: fb._id,
          sessionId: fb.sessionId,
          sessionType: sessionItem?.sessionType,
          scheduledAt: sessionItem?.scheduledAt,
          mentorFeedback: fb.mentorFeedback,
          menteeFeedback: fb.menteeFeedback,
          mentor: mentorInfo,
          mentee: menteeInfo,
          createdAt: fb.createdAt,
          updatedAt: fb.updatedAt
        };
      })
    );

    return NextResponse.json({
      feedback: enrichedFeedback,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching feedback:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to update mentor's overall rating
async function updateMentorRating(db: any, mentorId: string) {
  try {
    const feedbackCollection = await db.getSessionFeedbackCollection();
    
    // Get all feedback for this mentor
    const allFeedback = await feedbackCollection
      .find({ 
        mentorId,
        'menteeFeedback.sessionQuality': { $exists: true }
      })
      .toArray();

    if (allFeedback.length === 0) return;

    // Calculate average rating
    const totalRating = allFeedback.reduce((sum: number, fb: any) => {
      const feedback = fb.menteeFeedback;
      const averageRating = (feedback.sessionQuality + feedback.mentorKnowledge + feedback.communication) / 3;
      return sum + averageRating;
    }, 0);

    const averageRating = Math.round((totalRating / allFeedback.length) * 10) / 10;

    // Update mentor's rating
    const mentorsCollection = await db.getMentorsCollection();
    await mentorsCollection.updateOne(
      { _id: new ObjectId(mentorId) },
      {
        $set: {
          'rating.average': averageRating,
          'rating.count': allFeedback.length,
          updatedAt: new Date()
        }
      }
    );

  } catch (error) {
    console.error('Error updating mentor rating:', error);
  }
}