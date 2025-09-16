import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';
import type { SessionRatingDocument } from '@/lib/database';

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
    const { sessionId, ratingType, ratingData } = body;

    if (!sessionId || !ObjectId.isValid(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    if (!['mentor_to_mentee', 'mentee_to_mentor'].includes(ratingType)) {
      return NextResponse.json({ error: 'Invalid rating type' }, { status: 400 });
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
        error: 'Ratings can only be submitted for completed sessions' 
      }, { status: 400 });
    }

    // Check if user is authorized to submit this type of rating
    if (ratingType === 'mentor_to_mentee' && sessionItem.mentorId !== userId) {
      return NextResponse.json({ 
        error: 'Only the mentor can submit mentee ratings' 
      }, { status: 403 });
    }

    if (ratingType === 'mentee_to_mentor' && sessionItem.menteeId !== userId) {
      return NextResponse.json({ 
        error: 'Only the mentee can submit mentor ratings' 
      }, { status: 403 });
    }

    const ratingsCollection = await db.getSessionRatingsCollection();
    const now = new Date();

    // Check if rating already exists
    let existingRating = await ratingsCollection.findOne({ sessionId });

    if (ratingType === 'mentor_to_mentee') {
      // Validate mentor rating
      const { communication, technicalUnderstanding, professionalism, preparedness, overall, comments } = ratingData;
      
      if (!communication || !technicalUnderstanding || !professionalism || !preparedness || !overall) {
        return NextResponse.json({ 
          error: 'All rating fields are required' 
        }, { status: 400 });
      }

      if (![1, 2, 3, 4, 5].includes(communication) || 
          ![1, 2, 3, 4, 5].includes(technicalUnderstanding) || 
          ![1, 2, 3, 4, 5].includes(professionalism) ||
          ![1, 2, 3, 4, 5].includes(preparedness) ||
          ![1, 2, 3, 4, 5].includes(overall)) {
        return NextResponse.json({ 
          error: 'All ratings must be between 1 and 5' 
        }, { status: 400 });
      }

      const mentorToMentee = {
        communication,
        technicalUnderstanding,
        professionalism,
        preparedness,
        overall,
        comments,
        submittedAt: now
      };

      if (existingRating) {
        // Update existing rating
        await ratingsCollection.updateOne(
          { sessionId },
          {
            $set: {
              mentorToMentee,
              updatedAt: now
            }
          }
        );
      } else {
        // Create new rating document
        const newRating: SessionRatingDocument = {
          sessionId,
          mentorId: sessionItem.mentorId,
          menteeId: sessionItem.menteeId,
          mentorToMentee,
          createdAt: now,
          updatedAt: now
        } as SessionRatingDocument;
        await ratingsCollection.insertOne(newRating);
      }

      return NextResponse.json({
        message: 'Mentor rating submitted successfully',
        sessionId
      });

    } else { // mentee_to_mentor
      // Validate mentee rating
      const { knowledge, communication, helpfulness, wouldRecommend, overall, comments } = ratingData;
      
      if (!knowledge || !communication || !helpfulness || wouldRecommend === undefined || !overall) {
        return NextResponse.json({ 
          error: 'All rating fields are required' 
        }, { status: 400 });
      }

      if (![1, 2, 3, 4, 5].includes(knowledge) || 
          ![1, 2, 3, 4, 5].includes(communication) || 
          ![1, 2, 3, 4, 5].includes(helpfulness) ||
          ![1, 2, 3, 4, 5].includes(overall)) {
        return NextResponse.json({ 
          error: 'All numeric ratings must be between 1 and 5' 
        }, { status: 400 });
      }

      const menteeToMentor = {
        knowledge,
        communication,
        helpfulness,
        wouldRecommend,
        overall,
        comments,
        submittedAt: now
      };

      if (existingRating) {
        // Update existing rating
        await ratingsCollection.updateOne(
          { sessionId },
          {
            $set: {
              menteeToMentor,
              updatedAt: now
            }
          }
        );
      } else {
        // Create new rating document
        const newRating: SessionRatingDocument = {
          sessionId,
          mentorId: sessionItem.mentorId,
          menteeId: sessionItem.menteeId,
          menteeToMentor,
          createdAt: now,
          updatedAt: now
        } as SessionRatingDocument;
        await ratingsCollection.insertOne(newRating);
      }

      // Update mentor's rating based on all mentee ratings
      await updateMentorRatingFromRatings(db, sessionItem.mentorId);

      return NextResponse.json({
        message: 'Mentee rating submitted successfully',
        sessionId
      });
    }

  } catch (error) {
    console.error('Error submitting rating:', {
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

    const ratingsCollection = await db.getSessionRatingsCollection();
    
    // Build filter based on role
    const filter: any = {};
    if (role === 'mentor') {
      filter.mentorId = userId;
    } else {
      filter.menteeId = userId;
    }

    const total = await ratingsCollection.countDocuments(filter);
    const ratings = await ratingsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get session and user details
    const sessionsCollection = await db.getSessionsCollection();
    const usersCollection = await db.getUsersCollection();
    const mentorsCollection = await db.getMentorsCollection();

    const enrichedRatings = await Promise.all(
      ratings.map(async (rating) => {
        const sessionItem = await sessionsCollection.findOne({ _id: new ObjectId(rating.sessionId) });
        
        let mentorInfo = null;
        let menteeInfo = null;

        if (role === 'mentee') {
          const mentor = await mentorsCollection.findOne({ _id: new ObjectId(rating.mentorId) });
          mentorInfo = mentor ? {
            id: mentor._id,
            name: mentor.name,
            avatar: mentor.avatar,
            role: mentor.role
          } : null;
        } else {
          const mentee = await usersCollection.findOne({ _id: new ObjectId(rating.menteeId) });
          menteeInfo = mentee ? {
            id: mentee._id,
            name: mentee.name,
            avatar: mentee.avatar
          } : null;
        }

        return {
          id: rating._id,
          sessionId: rating.sessionId,
          sessionType: sessionItem?.sessionType,
          scheduledAt: sessionItem?.scheduledAt,
          mentorToMentee: rating.mentorToMentee,
          menteeToMentor: rating.menteeToMentor,
          mentor: mentorInfo,
          mentee: menteeInfo,
          createdAt: rating.createdAt,
          updatedAt: rating.updatedAt
        };
      })
    );

    return NextResponse.json({
      ratings: enrichedRatings,
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
    console.error('Error fetching ratings:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to update mentor's overall rating from ratings collection
async function updateMentorRatingFromRatings(db: any, mentorId: string) {
  try {
    const ratingsCollection = await db.getSessionRatingsCollection();
    
    // Get all ratings for this mentor
    const allRatings = await ratingsCollection
      .find({ 
        mentorId,
        'menteeToMentor.overall': { $exists: true }
      })
      .toArray();

    if (allRatings.length === 0) return;

    // Calculate average rating
    const totalRating = allRatings.reduce((sum: number, rating: any) => {
      return sum + rating.menteeToMentor.overall;
    }, 0);

    const averageRating = Math.round((totalRating / allRatings.length) * 10) / 10;

    // Update mentor's rating
    const mentorsCollection = await db.getMentorsCollection();
    await mentorsCollection.updateOne(
      { _id: new ObjectId(mentorId) },
      {
        $set: {
          'rating.average': averageRating,
          'rating.count': allRatings.length,
          updatedAt: new Date()
        }
      }
    );

  } catch (error) {
    console.error('Error updating mentor rating from ratings:', error);
  }
}