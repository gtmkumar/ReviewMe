import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';
import type { MentorDocument, MentorApplicationDocument } from '@/lib/database';

// Admin endpoint to manage mentor applications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check here
    // For now, allowing any authenticated user to access admin functions
    // In production, you should verify the user has admin privileges

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'pending';

    const applicationsCollection = await db.getMentorApplicationsCollection();

    const filter: any = {};
    if (status !== 'all') {
      filter.status = status;
    }

    const total = await applicationsCollection.countDocuments(filter);
    const applications = await applicationsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      applications: applications.map(app => ({
        id: app._id,
        ...app
      })),
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
    console.error('Error fetching mentor applications:', {
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

    // TODO: Add admin role check here

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const body = await request.json();
    const { applicationId, action, reviewNotes } = body;

    if (!applicationId || !ObjectId.isValid(applicationId)) {
      return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const applicationsCollection = await db.getMentorApplicationsCollection();
    const application = await applicationsCollection.findOne({
      _id: new ObjectId(applicationId)
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Application has already been reviewed' 
      }, { status: 409 });
    }

    const now = new Date();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update application status
    await applicationsCollection.updateOne(
      { _id: new ObjectId(applicationId) },
      {
        $set: {
          status: newStatus,
          reviewNotes,
          reviewedBy: session.user.id,
          reviewedAt: now,
          updatedAt: now
        }
      }
    );

    // If approved, create mentor profile
    if (action === 'approve') {
      const mentorsCollection = await db.getMentorsCollection();
      
      const mentorData: MentorDocument = {
        userId: application.userId,
        name: application.personalInfo.name,
        email: application.personalInfo.email,
        bio: application.professionalInfo.bio,
        role: application.professionalInfo.currentRole,
        company: application.professionalInfo.company,
        yearsOfExperience: application.professionalInfo.yearsOfExperience,
        expertise: application.professionalInfo.expertise,
        sessionTypes: application.sessionTypes,
        status: 'approved',
        isActive: true,
        rating: {
          average: 0,
          count: 0
        },
        totalSessions: 0,
        joinedAt: now,
        lastActiveAt: now,
        availability: application.availability,
        socialLinks: application.socialLinks,
        preferences: {
          communicationStyle: 'formal',
          sessionPreferences: []
        },
        createdAt: now,
        updatedAt: now
      };

      await mentorsCollection.insertOne(mentorData);
    }

    return NextResponse.json({
      message: `Application ${action}d successfully`,
      applicationId,
      status: newStatus
    });

  } catch (error) {
    console.error('Error processing mentor application:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}