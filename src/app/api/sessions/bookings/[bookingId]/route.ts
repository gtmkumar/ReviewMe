import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';
import type { SessionDocument, UserDocument } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = params;
    if (!bookingId || !ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = session.user.id;
    const body = await request.json();
    const { action, meetingLink, notes, reason } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const bookingsCollection = await db.getSessionBookingsCollection();
    const booking = await bookingsCollection.findOne({
      _id: new ObjectId(bookingId)
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Booking is no longer pending' 
      }, { status: 409 });
    }

    // Check if user is the mentor for this booking
    if (booking.mentorId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if booking has expired
    if (new Date() > new Date(booking.expiresAt)) {
      await bookingsCollection.updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: { status: 'expired', updatedAt: new Date() } }
      );
      return NextResponse.json({ 
        error: 'Booking has expired' 
      }, { status: 410 });
    }

    const now = new Date();

    if (action === 'approve') {
      if (!meetingLink) {
        return NextResponse.json({ 
          error: 'Meeting link is required for approval' 
        }, { status: 400 });
      }

      // Update booking with approval
      await bookingsCollection.updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            status: 'confirmed',
            mentorResponse: {
              accepted: true,
              meetingLink,
              notes,
              respondedAt: now
            },
            updatedAt: now
          }
        }
      );

      // Create session record
      const sessionsCollection = await db.getSessionsCollection();
      const sessionData: SessionDocument = {
        mentorId: booking.mentorId,
        menteeId: booking.menteeId,
        sessionType: booking.sessionType,
        status: 'confirmed',
        scheduledAt: new Date(`${booking.requestedSlot.date}T${booking.requestedSlot.startTime}:00`),
        duration: 60, // Default duration, should be calculated from session type
        tokensCharged: booking.tokensReserved,
        meetingLink,
        notes,
        createdAt: now,
        updatedAt: now
      };

      await sessionsCollection.insertOne(sessionData);

      // TODO: Send confirmation email to mentee

      return NextResponse.json({
        message: 'Booking approved successfully',
        bookingId,
        meetingLink
      });

    } else { // reject
      // Update booking with rejection
      await bookingsCollection.updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            status: 'rejected',
            mentorResponse: {
              accepted: false,
              notes: reason,
              respondedAt: now
            },
            updatedAt: now
          }
        }
      );

      // Refund tokens to mentee
      const usersCollection = await db.getUsersCollection();
      await usersCollection.updateOne(
        { _id: new ObjectId(booking.menteeId) },
        { $inc: { credits: booking.tokensReserved } }
      );

      // TODO: Send rejection email to mentee

      return NextResponse.json({
        message: 'Booking rejected successfully',
        bookingId,
        refundedTokens: booking.tokensReserved
      });
    }

  } catch (error) {
    console.error('Error managing booking:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}