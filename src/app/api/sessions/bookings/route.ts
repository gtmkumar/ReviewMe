import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';
import type { SessionBookingDocument, UserDocument } from '@/lib/database';

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

    const {
      mentorId,
      sessionType,
      requestedSlot,
      message
    } = body;

    // Validate input
    if (!mentorId || !ObjectId.isValid(mentorId)) {
      return NextResponse.json({ error: 'Invalid mentor ID' }, { status: 400 });
    }

    if (!sessionType || !requestedSlot?.date || !requestedSlot?.startTime || !requestedSlot?.endTime) {
      return NextResponse.json({ error: 'Missing required booking information' }, { status: 400 });
    }

    // Check if mentor exists and is active
    const mentorsCollection = await db.getMentorsCollection();
    const mentor = await mentorsCollection.findOne({
      _id: new ObjectId(mentorId),
      status: 'approved',
      isActive: true
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found or inactive' }, { status: 404 });
    }

    // Check if mentor offers this session type
    const sessionTypeConfig = mentor.sessionTypes.find(st => st.type === sessionType && st.isActive);
    if (!sessionTypeConfig) {
      return NextResponse.json({ 
        error: 'Mentor does not offer this session type' 
      }, { status: 400 });
    }

    // Check user's credit balance
    const usersCollection = await db.getUsersCollection();
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) }) as UserDocument;

    if (!user || user.credits < sessionTypeConfig.price) {
      return NextResponse.json({ 
        error: 'Insufficient credits for this session',
        required: sessionTypeConfig.price,
        available: user?.credits || 0
      }, { status: 402 });
    }

    // Check if user has pending booking with same mentor
    const bookingsCollection = await db.getSessionBookingsCollection();
    const existingBooking = await bookingsCollection.findOne({
      mentorId,
      menteeId: userId,
      status: 'pending'
    });

    if (existingBooking) {
      return NextResponse.json({ 
        error: 'You already have a pending booking with this mentor' 
      }, { status: 409 });
    }

    // Check mentor availability (simplified check - in production you'd want more sophisticated scheduling)
    const requestedDate = new Date(requestedSlot.date);
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][requestedDate.getDay()] as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    
    const mentorDaySlots = mentor.availability.weeklySlots.find(ws => ws.day === dayName);
    if (!mentorDaySlots) {
      return NextResponse.json({ 
        error: 'Mentor is not available on the requested day' 
      }, { status: 400 });
    }

    const isSlotAvailable = mentorDaySlots.slots.some(slot => 
      slot.isAvailable && 
      slot.startTime <= requestedSlot.startTime && 
      slot.endTime >= requestedSlot.endTime
    );

    if (!isSlotAvailable) {
      return NextResponse.json({ 
        error: 'Requested time slot is not available' 
      }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Reserve credits (deduct from user's balance)
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $inc: { credits: -sessionTypeConfig.price } }
    );

    // Create booking
    const booking: SessionBookingDocument = {
      mentorId,
      menteeId: userId,
      sessionType,
      requestedSlot,
      tokensReserved: sessionTypeConfig.price,
      status: 'pending',
      message,
      expiresAt,
      createdAt: now,
      updatedAt: now
    };

    const result = await bookingsCollection.insertOne(booking);

    // TODO: Send email notification to mentor

    return NextResponse.json({
      message: 'Booking request submitted successfully',
      bookingId: result.insertedId,
      tokensReserved: sessionTypeConfig.price,
      expiresAt
    });

  } catch (error) {
    console.error('Error creating session booking:', {
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
    const status = searchParams.get('status'); // filter by status
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const bookingsCollection = await db.getSessionBookingsCollection();
    
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

    const total = await bookingsCollection.countDocuments(filter);
    const bookings = await bookingsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get mentor and mentee details
    const usersCollection = await db.getUsersCollection();
    const mentorsCollection = await db.getMentorsCollection();

    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        let mentorInfo = null;
        let menteeInfo = null;

        if (role === 'mentee') {
          // Get mentor info
          const mentor = await mentorsCollection.findOne({ _id: new ObjectId(booking.mentorId) });
          mentorInfo = mentor ? {
            id: mentor._id,
            name: mentor.name,
            avatar: mentor.avatar,
            role: mentor.role
          } : null;
        } else {
          // Get mentee info
          const mentee = await usersCollection.findOne({ _id: new ObjectId(booking.menteeId) });
          menteeInfo = mentee ? {
            id: mentee._id,
            name: mentee.name,
            avatar: mentee.avatar
          } : null;
        }

        return {
          id: booking._id,
          ...booking,
          mentor: mentorInfo,
          mentee: menteeInfo
        };
      })
    );

    return NextResponse.json({
      bookings: enrichedBookings,
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
    console.error('Error fetching bookings:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}