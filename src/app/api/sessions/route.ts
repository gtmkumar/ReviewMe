import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

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
    const status = searchParams.get('status'); // filter by status
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const sessionsCollection = await db.getSessionsCollection();
    
    // Build filter based on role
    const filter: any = {};
    if (role === 'mentor') {
      filter.mentorId = userId;
    } else {
      filter.menteeId = userId;
    }

    if (status) {
      filter.status = status;
    }

    const total = await sessionsCollection.countDocuments(filter);
    const sessions = await sessionsCollection
      .find(filter)
      .sort({ scheduledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get user and mentor details
    const usersCollection = await db.getUsersCollection();
    const mentorsCollection = await db.getMentorsCollection();

    const enrichedSessions = await Promise.all(
      sessions.map(async (sessionItem) => {
        let mentorInfo = null;
        let menteeInfo = null;

        if (role === 'mentee') {
          // Get mentor info
          const mentor = await mentorsCollection.findOne({ _id: new ObjectId(sessionItem.mentorId) });
          mentorInfo = mentor ? {
            id: mentor._id,
            name: mentor.name,
            avatar: mentor.avatar,
            role: mentor.role
          } : null;
        } else {
          // Get mentee info
          const mentee = await usersCollection.findOne({ _id: new ObjectId(sessionItem.menteeId) });
          menteeInfo = mentee ? {
            id: mentee._id,
            name: mentee.name,
            avatar: mentee.avatar
          } : null;
        }

        return {
          id: sessionItem._id,
          ...sessionItem,
          mentor: mentorInfo,
          mentee: menteeInfo
        };
      })
    );

    return NextResponse.json({
      sessions: enrichedSessions,
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
    console.error('Error fetching sessions:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = session.user.id;
    const body = await request.json();
    const { sessionId, action, reason } = body;

    if (!sessionId || !ObjectId.isValid(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    if (!['cancel', 'complete', 'no_show'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const sessionsCollection = await db.getSessionsCollection();
    const sessionItem = await sessionsCollection.findOne({
      _id: new ObjectId(sessionId)
    });

    if (!sessionItem) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user is part of this session
    if (sessionItem.mentorId !== userId && sessionItem.menteeId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (sessionItem.status === 'completed' || sessionItem.status === 'cancelled') {
      return NextResponse.json({ 
        error: 'Session is already finalized' 
      }, { status: 409 });
    }

    const now = new Date();
    const update: any = {
      updatedAt: now
    };

    if (action === 'cancel') {
      update.status = 'cancelled';
      update.cancelledAt = now;
      update.cancelledBy = sessionItem.mentorId === userId ? 'mentor' : 'mentee';
      update.cancellationReason = reason;

      // Refund tokens if cancelled before session
      if (new Date(sessionItem.scheduledAt) > now) {
        const usersCollection = await db.getUsersCollection();
        await usersCollection.updateOne(
          { _id: new ObjectId(sessionItem.menteeId) },
          { $inc: { credits: sessionItem.tokensCharged } }
        );
      }

    } else if (action === 'complete') {
      // Only mentor can mark as complete
      if (sessionItem.mentorId !== userId) {
        return NextResponse.json({ 
          error: 'Only mentors can mark sessions as complete' 
        }, { status: 403 });
      }
      update.status = 'completed';

      // Update mentor's total sessions count
      const mentorsCollection = await db.getMentorsCollection();
      await mentorsCollection.updateOne(
        { _id: new ObjectId(sessionItem.mentorId) },
        { 
          $inc: { totalSessions: 1 },
          $set: { lastActiveAt: now }
        }
      );

    } else if (action === 'no_show') {
      // Only mentor can mark as no-show
      if (sessionItem.mentorId !== userId) {
        return NextResponse.json({ 
          error: 'Only mentors can mark sessions as no-show' 
        }, { status: 403 });
      }
      update.status = 'no_show';
    }

    await sessionsCollection.updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: update }
    );

    return NextResponse.json({
      message: `Session ${action}ed successfully`,
      sessionId,
      newStatus: update.status
    });

  } catch (error) {
    console.error('Error updating session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}