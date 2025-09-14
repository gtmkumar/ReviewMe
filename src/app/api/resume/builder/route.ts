import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

// Types for resume data
interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary?: string;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string;
  achievements: string[];
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  location?: string;
  graduationDate?: string;
  gpa?: string;
  relevantCoursework: string[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  githubUrl?: string;
  achievements: string[];
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  url?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  date?: string;
  category: string;
}

interface Activity {
  id: string;
  title: string;
  organization: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  skills: string[];
  achievements: Achievement[];
  activities: Activity[];
}

// GET: Load existing resume data for editing
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

    // Get the user's latest resume builder data
    const database = await db.getDb();
    const resumeBuilderCollection = database.collection('resume_builder');
    const latestResume = await resumeBuilderCollection.findOne(
      { userId: new ObjectId(session.user.id) },
      { sort: { updatedAt: -1 } }
    );

    // If no existing data, return empty structure
    const defaultResumeData: ResumeData = {
      personalInfo: {
        name: session.user.name || '',
        email: session.user.email || '',
        phone: '',
        location: '',
        linkedinUrl: '',
        githubUrl: '',
        portfolioUrl: '',
        summary: ''
      },
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      skills: [],
      achievements: [],
      activities: []
    };

    const resumeData = latestResume ? latestResume.resumeData : defaultResumeData;

    return NextResponse.json({
      success: true,
      resumeData,
      hasExistingData: !!latestResume,
      lastUpdated: latestResume?.updatedAt
    });

  } catch (error) {
    console.error('Error loading resume data:', error);
    return NextResponse.json(
      { error: 'Failed to load resume data' },
      { status: 500 }
    );
  }
}

// POST: Save resume data with credit deduction (full save)
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
        { error: `Insufficient credits. You need ${REQUIRED_CREDITS} credits to save your resume.` },
        { status: 403 }
      );
    }

    // Start transaction for atomic operation
    const session_db = db.client!.startSession();
    
    try {
      await session_db.withTransaction(async () => {
        // Deduct credits
        await usersCollection.updateOne(
          { _id: userId },
          { 
            $inc: { credits: -REQUIRED_CREDITS },
            $set: { updatedAt: new Date() }
          },
          { session: session_db }
        );

        // Save resume data with version history
        const database = await db.getDb();
        const resumeBuilderCollection = database.collection('resume_builder');
        const now = new Date();
        
        // Create new resume version
        const resumeDocument = {
          userId,
          resumeData,
          version: await getNextVersion(resumeBuilderCollection, userId),
          savedAt: now,
          createdAt: now,
          updatedAt: now,
          creditsUsed: REQUIRED_CREDITS,
          isPublished: true
        };

        await resumeBuilderCollection.insertOne(resumeDocument, { session: session_db });

        // Log the credit transaction
        const creditTransactionsCollection = database.collection('credit_transactions');
        await creditTransactionsCollection.insertOne({
          userId,
          serviceType: 'resume_builder',
          creditsUsed: REQUIRED_CREDITS,
          timestamp: now,
          status: 'completed',
          metadata: {
            action: 'resume_save',
            version: resumeDocument.version
          }
        }, { session: session_db });
      });

      return NextResponse.json({
        success: true,
        message: `Resume saved successfully! ${REQUIRED_CREDITS} credits deducted.`,
        creditsUsed: REQUIRED_CREDITS,
        remainingCredits: user.credits - REQUIRED_CREDITS
      });

    } finally {
      await session_db.endSession();
    }

  } catch (error) {
    console.error('Error saving resume:', error);
    return NextResponse.json(
      { error: 'Failed to save resume' },
      { status: 500 }
    );
  }
}

// Helper function to get next version number
async function getNextVersion(collection: any, userId: ObjectId): Promise<number> {
  const latestResume = await collection.findOne(
    { userId },
    { sort: { version: -1 } }
  );
  
  return latestResume ? (latestResume.version || 0) + 1 : 1;
}