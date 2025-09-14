import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

// GET: Retrieve resume version history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const userId = new ObjectId(session.user.id);
    const database = await db.getDb();
    const resumeBuilderCollection = database.collection('resume_builder');

    // Get resume versions with pagination
    const [resumes, totalCount] = await Promise.all([
      resumeBuilderCollection
        .find({ userId })
        .sort({ version: -1 })
        .limit(limit)
        .skip(skip)
        .project({
          version: 1,
          savedAt: 1,
          creditsUsed: 1,
          metadata: 1,
          'resumeData.personalInfo.name': 1,
          'resumeData.personalInfo.email': 1
        })
        .toArray(),
      
      resumeBuilderCollection.countDocuments({ userId })
    ]);

    // Format response
    const history = resumes.map(resume => ({
      id: resume._id,
      version: resume.version,
      savedAt: resume.savedAt,
      creditsUsed: resume.creditsUsed,
      sectionsCompleted: resume.metadata?.sectionsCompleted || 0,
      totalSections: resume.metadata?.totalSections || 8,
      preview: {
        name: resume.resumeData?.personalInfo?.name || 'Unknown',
        email: resume.resumeData?.personalInfo?.email || 'Unknown'
      }
    }));

    return NextResponse.json({
      success: true,
      history,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching resume history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume history' },
      { status: 500 }
    );
  }
}