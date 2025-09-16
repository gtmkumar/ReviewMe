import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';
import type { MentorApplicationDocument } from '@/lib/database';

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

    console.log('Received application data:', JSON.stringify(body, null, 2)); // Debug log

    // Validate required fields
    const {
      personalInfo,
      professionalInfo,
      sessionTypes,
      availability,
      verification,
      socialLinks
    } = body;

    if (!personalInfo?.name || !personalInfo?.email || !personalInfo?.location || !personalInfo?.timezone) {
      return NextResponse.json({ error: 'Missing required personal information' }, { status: 400 });
    }

    if (!professionalInfo?.currentRole || !professionalInfo?.company || !professionalInfo?.yearsOfExperience || 
        !professionalInfo?.industry || !professionalInfo?.bio || !professionalInfo?.expertise?.length) {
      return NextResponse.json({ error: 'Missing required professional information' }, { status: 400 });
    }

    if (!sessionTypes?.length) {
      return NextResponse.json({ error: 'At least one session type must be selected' }, { status: 400 });
    }

    if (!availability?.timezone || !availability?.weeklySlots?.length) {
      return NextResponse.json({ error: 'Availability information is required' }, { status: 400 });
    }

    if (!verification?.method) {
      return NextResponse.json({ error: 'Verification method is required' }, { status: 400 });
    }

    // Check if user already has an application
    const applicationsCollection = await db.getMentorApplicationsCollection();
    const existingApplication = await applicationsCollection.findOne({ userId });

    if (existingApplication && existingApplication.status === 'pending') {
      return NextResponse.json({ 
        error: 'You already have a pending mentor application' 
      }, { status: 409 });
    }

    if (existingApplication && existingApplication.status === 'approved') {
      return NextResponse.json({ 
        error: 'You are already an approved mentor' 
      }, { status: 409 });
    }

    const now = new Date();

    // Safely parse years of experience
    const yearsOfExperience = professionalInfo.yearsOfExperience;
    const parsedYearsOfExperience = typeof yearsOfExperience === 'number' 
      ? yearsOfExperience 
      : parseInt(String(yearsOfExperience)) || 0;

    console.log('Years of experience - original:', yearsOfExperience, 'parsed:', parsedYearsOfExperience); // Debug log

    const applicationData: MentorApplicationDocument = {
      userId,
      personalInfo: {
        name: personalInfo.name,
        email: personalInfo.email,
        phone: personalInfo.phone,
        location: personalInfo.location,
        timezone: personalInfo.timezone
      },
      professionalInfo: {
        currentRole: professionalInfo.currentRole,
        company: professionalInfo.company,
        yearsOfExperience: parsedYearsOfExperience,
        industry: professionalInfo.industry,
        bio: professionalInfo.bio,
        expertise: professionalInfo.expertise
      },
      sessionTypes,
      availability,
      verification,
      socialLinks,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    // Replace existing application if rejected or create new one
    if (existingApplication && existingApplication.status === 'rejected') {
      await applicationsCollection.replaceOne(
        { userId },
        applicationData
      );
    } else {
      await applicationsCollection.insertOne(applicationData);
    }

    return NextResponse.json({
      message: 'Mentor application submitted successfully',
      applicationId: existingApplication?._id || 'new'
    });

  } catch (error) {
    console.error('Error submitting mentor application:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: session?.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // Return more specific error message if possible
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return NextResponse.json({ 
          error: 'You already have a mentor application. Please check your application status.' 
        }, { status: 409 });
      }
      if (error.message.includes('validation')) {
        return NextResponse.json({ 
          error: 'Invalid data provided. Please check all required fields.' 
        }, { status: 400 });
      }
    }
    
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
    const applicationsCollection = await db.getMentorApplicationsCollection();
    
    const application = await applicationsCollection.findOne({ userId });

    if (!application) {
      return NextResponse.json({ 
        application: null,
        message: 'No application found'
      });
    }

    return NextResponse.json({
      application: {
        id: application._id,
        ...application
      }
    });

  } catch (error) {
    console.error('Error fetching mentor application:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}