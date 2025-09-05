import { NextRequest, NextResponse } from 'next/server';
import { getDbManager } from '@/lib/database';
import { DataCacheService } from '@/lib/services';

export async function GET(
  request: NextRequest,
  { params }: { params: { publicUsername: string } }
) {
  try {
    const { publicUsername } = await params;

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Find user by public username
    const user = await db.users.findOne({ 
      publicUsername,
      profilePublic: true // Only return public profiles
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Profile not found or private' }, 
        { status: 404 }
      );
    }

    // Get cached profile data
    const cachedData = await DataCacheService.getAllCachedData(user._id!.toString());

    // Build public profile response
    const publicProfile = {
      name: user.name,
      publicUsername: user.publicUsername,
      bio: user.bio,
      avatar: user.avatar,
      image: user.image,
      profilePublic: user.profilePublic,
      createdAt: user.createdAt,
      profileData: {
        overall: 0,
        github: cachedData.github ? {
          username: cachedData.github.responseData?.username,
          profileUrl: cachedData.github.responseData?.profile?.html_url,
          name: cachedData.github.responseData?.profile?.name,
          bio: cachedData.github.responseData?.profile?.bio,
          company: cachedData.github.responseData?.profile?.company,
          location: cachedData.github.responseData?.profile?.location,
          followers: cachedData.github.responseData?.profile?.followers,
          following: cachedData.github.responseData?.profile?.following,
          publicRepos: cachedData.github.responseData?.profile?.public_repos,
          score: {
            overall: cachedData.github.analysisResults?.score || 0
          }
        } : null,
        linkedin: cachedData.linkedin ? {
          firstName: cachedData.linkedin.responseData?.firstName,
          lastName: cachedData.linkedin.responseData?.lastName,
          headline: cachedData.linkedin.responseData?.headline,
          location: cachedData.linkedin.responseData?.location,
          score: {
            overall: cachedData.linkedin.analysisResults?.score || 0
          }
        } : null,
        resume: cachedData.resume ? {
          score: {
            overall: cachedData.resume.analysisResults?.score || 0
          }
        } : null
      }
    };

    return NextResponse.json({ profile: publicProfile });

  } catch (error) {
    console.error('Error fetching public profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}