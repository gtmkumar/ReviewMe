import { NextRequest, NextResponse } from 'next/server';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { mentorId: string } }
) {
  try {
    const { mentorId } = params;

    if (!mentorId || !ObjectId.isValid(mentorId)) {
      return NextResponse.json({ error: 'Invalid mentor ID' }, { status: 400 });
    }

    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const mentorsCollection = await db.getMentorsCollection();
    const mentor = await mentorsCollection.findOne({
      _id: new ObjectId(mentorId),
      status: 'approved',
      isActive: true
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Get recent session feedback for this mentor
    const feedbackCollection = await db.getSessionFeedbackCollection();
    const recentFeedback = await feedbackCollection
      .find({
        mentorId: mentorId,
        'menteeFeedback.sessionQuality': { $exists: true }
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Calculate detailed rating breakdown
    const ratingsCollection = await db.getSessionRatingsCollection();
    const ratings = await ratingsCollection
      .find({ mentorId: mentorId })
      .toArray();

    const ratingBreakdown = {
      knowledge: 0,
      communication: 0,
      helpfulness: 0,
      overall: 0,
      wouldRecommend: 0,
      totalRatings: ratings.length
    };

    if (ratings.length > 0) {
      const totals = ratings.reduce((acc, rating) => {
        const menteeRating = rating.menteeToMentor;
        return {
          knowledge: acc.knowledge + menteeRating.knowledge,
          communication: acc.communication + menteeRating.communication,
          helpfulness: acc.helpfulness + menteeRating.helpfulness,
          overall: acc.overall + menteeRating.overall,
          wouldRecommend: acc.wouldRecommend + (menteeRating.wouldRecommend ? 1 : 0)
        };
      }, { knowledge: 0, communication: 0, helpfulness: 0, overall: 0, wouldRecommend: 0 });

      ratingBreakdown.knowledge = Math.round((totals.knowledge / ratings.length) * 10) / 10;
      ratingBreakdown.communication = Math.round((totals.communication / ratings.length) * 10) / 10;
      ratingBreakdown.helpfulness = Math.round((totals.helpfulness / ratings.length) * 10) / 10;
      ratingBreakdown.overall = Math.round((totals.overall / ratings.length) * 10) / 10;
      ratingBreakdown.wouldRecommend = Math.round((totals.wouldRecommend / ratings.length) * 100);
    }

    // Get session statistics
    const sessionsCollection = await db.getSessionsCollection();
    const sessionStats = await sessionsCollection.aggregate([
      { $match: { mentorId: mentorId } },
      {
        $group: {
          _id: '$sessionType',
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    // Format mentor data
    const mentorData = {
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
      ratingBreakdown,
      totalSessions: mentor.totalSessions,
      sessionStats,
      availability: mentor.availability,
      socialLinks: mentor.socialLinks,
      preferences: mentor.preferences,
      joinedAt: mentor.joinedAt,
      lastActiveAt: mentor.lastActiveAt,
      recentFeedback: recentFeedback.map(feedback => ({
        sessionQuality: feedback.menteeFeedback?.sessionQuality,
        comments: feedback.menteeFeedback?.comments,
        submittedAt: feedback.menteeFeedback?.submittedAt
      })).filter(f => f.sessionQuality) // Only include feedback with ratings
    };

    return NextResponse.json({
      mentor: mentorData
    });

  } catch (error) {
    console.error('Error fetching mentor details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}