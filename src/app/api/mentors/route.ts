import { NextRequest, NextResponse } from 'next/server';
import { getDbManager } from '@/lib/database';
import type { MentorDocument } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const expertise = searchParams.get('expertise'); // comma-separated
    const sessionType = searchParams.get('sessionType');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const search = searchParams.get('search');

    // Build filter query
    const filter: any = {
      status: 'approved',
      isActive: true
    };

    // Expertise filter
    if (expertise) {
      const expertiseAreas = expertise.split(',');
      filter['expertise.area'] = { $in: expertiseAreas };
    }

    // Session type filter
    if (sessionType) {
      filter['sessionTypes.type'] = sessionType;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      const priceFilter: any = {};
      if (minPrice) priceFilter.$gte = parseInt(minPrice);
      if (maxPrice) priceFilter.$lte = parseInt(maxPrice);
      filter['sessionTypes.price'] = priceFilter;
    }

    // Search filter (name, bio, role, company)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const mentorsCollection = await db.getMentorsCollection();

    // Get total count for pagination
    const total = await mentorsCollection.countDocuments(filter);

    // Get mentors with pagination and sorting
    const mentors = await mentorsCollection
      .find(filter)
      .sort({ 'rating.average': -1, totalSessions: -1 }) // Sort by rating first, then by experience
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Transform mentors data for frontend
    const formattedMentors = mentors.map((mentor: MentorDocument) => ({
      id: mentor._id,
      name: mentor.name,
      avatar: mentor.avatar,
      bio: mentor.bio,
      role: mentor.role,
      company: mentor.company,
      yearsOfExperience: mentor.yearsOfExperience,
      expertise: mentor.expertise,
      sessionTypes: mentor.sessionTypes.filter(st => st.isActive),
      rating: mentor.rating,
      totalSessions: mentor.totalSessions,
      socialLinks: mentor.socialLinks,
      joinedAt: mentor.joinedAt
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      mentors: formattedMentors,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        expertise: ['resume', 'linkedin', 'github', 'career', 'technical', 'interview'],
        sessionTypes: [
          'resume_review',
          'linkedin_review', 
          'github_review',
          'career_discussion',
          'project_review',
          'interview_prep'
        ],
        priceRange: {
          min: 89,
          max: 299
        }
      }
    });

  } catch (error) {
    console.error('Error fetching mentors:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}