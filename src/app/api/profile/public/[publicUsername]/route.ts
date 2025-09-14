import { NextRequest, NextResponse } from 'next/server';
import { getDbManager } from '@/lib/database';
import { DataCacheService } from '@/lib/services';
import { ObjectId } from 'mongodb';

// Helper function to calculate GitHub score from analytics data
function calculateGitHubScore(analyticsData: any): number {
  if (!analyticsData) return 0;
  
  const { user, totalStats, repositories } = analyticsData;
  let score = 0;
  
  // Basic profile completeness (20 points)
  if (user.name) score += 5;
  if (user.bio) score += 5;
  if (user.location) score += 3;
  if (user.blog) score += 3;
  if (user.company) score += 4;
  
  // Repository activity (30 points)
  const repoCount = user.public_repos;
  if (repoCount > 0) score += Math.min(repoCount * 2, 15);
  
  if (totalStats.totalStars > 0) score += Math.min(totalStats.totalStars, 15);
  
  // Social presence (20 points)
  const followers = user.followers;
  if (followers > 0) score += Math.min(Math.floor(followers / 5), 10);
  
  const following = user.following;
  if (following > 0) score += Math.min(Math.floor(following / 10), 10);
  
  // Account age and activity (30 points)
  const accountAge = new Date().getFullYear() - new Date(user.created_at).getFullYear();
  score += Math.min(accountAge * 3, 15);
  
  // Recent activity (based on repository count)
  score += Math.min(repositories.length * 2, 15);
  
  return Math.min(score, 100);
}

// Helper function to generate GitHub suggestions
function generateGitHubSuggestions(analyticsData: any): string[] {
  const suggestions: string[] = [];
  
  if (!analyticsData) {
    return ['Connect your GitHub account to see detailed analysis'];
  }
  
  const { user, totalStats, repositories } = analyticsData;
  
  // Profile completeness suggestions
  if (!user.bio) suggestions.push('Add a bio to your GitHub profile to improve discoverability');
  if (!user.location) suggestions.push('Add your location to connect with local developers');
  if (!user.blog) suggestions.push('Add a personal website or blog URL to showcase your work');
  if (!user.company) suggestions.push('Add your current company to build professional credibility');
  
  // Repository activity suggestions
  if (user.public_repos < 5) suggestions.push('Create more public repositories to showcase your skills');
  if (totalStats.totalStars < 10) suggestions.push('Improve code quality and documentation to earn more stars');
  
  // Social presence suggestions
  if (user.followers < 20) suggestions.push('Engage with the community to grow your follower base');
  if (user.following < 10) suggestions.push('Follow other developers to learn and network');
  
  // Repository quality suggestions
  const reposWithoutReadme = repositories.filter((repo: any) => !repo.hasReadme).length;
  if (reposWithoutReadme > 0) suggestions.push('Add README files to your repositories for better documentation');
  
  if (suggestions.length === 0) {
    suggestions.push('Great profile! Continue contributing regularly to maintain your activity');
  }
  
  return suggestions;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicUsername: string }> }
) {
  try {
    const { publicUsername } = await params;

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();
    const database = await db.getDb();

    // Find user by public username
    const usersCollection = await db.getUsersCollection();
    const user = await usersCollection.findOne({ 
      publicUsername,
      profilePublic: true // Only return public profiles
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Profile not found or private' }, 
        { status: 404 }
      );
    }

    const userId = user._id!.toString();

    // Get cached profile data (fallback)
    const cachedData = await DataCacheService.getAllCachedData(userId);

    // Get enhanced data from collections (like dashboard)
    const [githubAnalytics, linkedinProfiles] = await Promise.all([
      database.collection('github_analytics').findOne({ userId: new ObjectId(userId) }),
      database.collection('linkedin_profiles').findOne({ userId: new ObjectId(userId) })
    ]);

    // Calculate scores using enhanced data
    const githubScore = githubAnalytics?.analyticsData ? calculateGitHubScore(githubAnalytics.analyticsData) : 0;
    const linkedinScore = linkedinProfiles?.analysisResults?.score || 0;
    const resumeScore = cachedData.resume?.analysisResults?.score || 0;
    
    // Calculate overall score
    const availableScores = [githubScore, linkedinScore, resumeScore].filter(score => score > 0);
    const overallScore = availableScores.length > 0 
      ? Math.round(availableScores.reduce((sum, score) => sum + score, 0) / availableScores.length)
      : 0;

    // Get GitHub profile data
    const githubProfile = githubAnalytics?.analyticsData?.user;
    const githubAnalyticsData = githubAnalytics?.analyticsData;

    // Get LinkedIn profile data
    const linkedinProfile = linkedinProfiles?.profileData;

    // Build comprehensive public profile response
    const publicProfile = {
      name: user.name,
      publicUsername: user.publicUsername,
      bio: user.bio,
      avatar: user.avatar,
      image: user.image,
      profilePublic: user.profilePublic,
      createdAt: user.createdAt,
      profileData: {
        overall: overallScore,
        github: githubProfile ? {
          connected: true,
          score: githubScore,
          username: githubProfile.login,
          profileUrl: githubProfile.html_url,
          name: githubProfile.name,
          bio: githubProfile.bio,
          company: githubProfile.company,
          location: githubProfile.location,
          followers: githubProfile.followers,
          following: githubProfile.following,
          publicRepos: githubProfile.public_repos,
          totalStars: githubAnalyticsData?.totalStats?.totalStars || 0,
          totalForks: githubAnalyticsData?.totalStats?.totalForks || 0,
          languages: githubAnalyticsData?.languageStats?.reposByLanguage || {},
          topRepositories: githubAnalyticsData?.repositories?.slice(0, 6) || [],
          suggestions: generateGitHubSuggestions(githubAnalyticsData),
          lastUpdated: githubAnalytics?.lastUpdated
        } : {
          connected: false,
          score: 0,
          suggestions: ['Connect your GitHub account to see detailed analysis']
        },
        linkedin: linkedinProfile ? {
          connected: true,
          score: linkedinScore,
          name: linkedinProfile.name,
          headline: linkedinProfile.headline,
          location: linkedinProfile.location,
          industry: linkedinProfile.industry,
          connectionCount: linkedinProfile.connectionCount || linkedinProfile.connections,
          experience: linkedinProfile.experience || [],
          education: linkedinProfile.education || [],
          skills: linkedinProfile.skills || [],
          strengths: linkedinProfiles?.analysisResults?.strengths || [],
          weaknesses: linkedinProfiles?.analysisResults?.weaknesses || [],
          suggestions: linkedinProfiles?.analysisResults?.suggestions || [],
          lastUpdated: linkedinProfiles?.lastUpdated
        } : {
          connected: false,
          score: 0,
          suggestions: ['Connect your LinkedIn account to see professional analysis']
        },
        resume: cachedData.resume ? {
          uploaded: true,
          score: resumeScore,
          lastUpdated: cachedData.resume.createdAt
        } : {
          uploaded: false,
          score: 0
        }
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