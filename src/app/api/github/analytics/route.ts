import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { RequestLogService, CreditService, ServiceType } from '@/lib/services';
import { ObjectId } from 'mongodb';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  size: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  default_branch: string;
  clone_url: string;
  html_url: string;
}

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

interface GitHubAnalytics {
  user: GitHubUser;
  repositories: GitHubRepository[];
  languageStats: {
    reposByLanguage: Record<string, number>;
    starsByLanguage: Record<string, number>;
    commitsByLanguage: Record<string, number>;
  };
  commitHistory: Array<{
    date: string;
    count: number;
  }>;
  topRepositories: {
    byStars: GitHubRepository[];
    byCommits: GitHubRepository[];
  };
  totalStats: {
    totalStars: number;
    totalForks: number;
    totalSize: number;
    languageCount: number;
    averageStars: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { username } = body;

    if (!username?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'GitHub username is required'
      }, { status: 400 });
    }

    const userId = session.user.id;

    // Check and deduct credits
    const creditCheck = await CreditService.checkAndDeductCredits(
      userId,
      'github' as ServiceType,
      { username: username.trim(), analytics: true }
    );

    if (!creditCheck.success) {
      return NextResponse.json({
        success: false,
        error: creditCheck.error
      }, { status: 400 });
    }

    const startTime = Date.now();

    try {
      // Fetch GitHub user data
      const userResponse = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ReviewMe-App'
        }
      });

      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          throw new Error('GitHub user not found');
        }
        throw new Error('Failed to fetch GitHub user data');
      }

      const userData: GitHubUser = await userResponse.json();

      // Fetch user repositories (all pages)
      const repositories: GitHubRepository[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const reposResponse = await fetch(
          `https://api.github.com/users/${username}/repos?page=${page}&per_page=${perPage}&sort=updated`,
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'ReviewMe-App'
            }
          }
        );

        if (!reposResponse.ok) {
          throw new Error('Failed to fetch repositories');
        }

        const reposData: GitHubRepository[] = await reposResponse.json();
        
        if (reposData.length === 0) break;
        
        repositories.push(...reposData);
        
        if (reposData.length < perPage) break;
        page++;
      }

      // Calculate language statistics
      const languageStats = calculateLanguageStats(repositories);

      // Generate commit history (simplified - using repo push dates)
      const commitHistory = generateCommitHistory(repositories);

      // Get top repositories
      const topRepositories = {
        byStars: [...repositories]
          .sort((a, b) => b.stargazers_count - a.stargazers_count)
          .slice(0, 10),
        byCommits: [...repositories]
          .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
          .slice(0, 10)
      };

      // Calculate total statistics
      const totalStats = {
        totalStars: repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0),
        totalForks: repositories.reduce((sum, repo) => sum + repo.forks_count, 0),
        totalSize: repositories.reduce((sum, repo) => sum + repo.size, 0),
        languageCount: Object.keys(languageStats.reposByLanguage).length,
        averageStars: repositories.length > 0 
          ? repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0) / repositories.length 
          : 0
      };

      const analyticsData: GitHubAnalytics = {
        user: userData,
        repositories,
        languageStats,
        commitHistory,
        topRepositories,
        totalStats
      };

      const processingTime = Date.now() - startTime;

      // Update request status to completed
      await RequestLogService.updateRequestStatus(
        creditCheck.requestId!,
        'completed'
      );

      // Log successful response
      await RequestLogService.logResponse(
        userId,
        creditCheck.requestId!,
        'github' as ServiceType,
        analyticsData,
        {
          username: userData.login,
          repoCount: repositories.length,
          totalStars: totalStats.totalStars,
          languageCount: totalStats.languageCount,
          analytics: true
        },
        processingTime
      );

      // Save analytics data to database
      const db = getDbManager(process.env.MONGODB_URI!);
      await db.connect();
      const database = await db.getDb();
      const githubAnalyticsCollection = database.collection('github_analytics');

      // Upsert the analytics data
      await githubAnalyticsCollection.updateOne(
        { 
          userId: new ObjectId(userId),
          username: userData.login
        },
        {
          $set: {
            analyticsData,
            lastUpdated: new Date(),
            requestId: creditCheck.requestId
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        data: analyticsData,
        requestId: creditCheck.requestId,
        creditsUsed: creditCheck.creditsDeducted,
        remainingCredits: creditCheck.remainingCredits
      });

    } catch (apiError) {
      await RequestLogService.updateRequestStatus(
        creditCheck.requestId!,
        'failed',
        apiError instanceof Error ? apiError.message : 'GitHub API call failed'
      );

      return NextResponse.json({
        success: false,
        error: apiError instanceof Error ? apiError.message : 'GitHub analytics failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('GitHub analytics endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Helper function to calculate language statistics
function calculateLanguageStats(repositories: GitHubRepository[]) {
  const reposByLanguage: Record<string, number> = {};
  const starsByLanguage: Record<string, number> = {};
  const commitsByLanguage: Record<string, number> = {};

  repositories.forEach(repo => {
    const language = repo.language || 'Unknown';
    
    // Count repositories per language
    reposByLanguage[language] = (reposByLanguage[language] || 0) + 1;
    
    // Sum stars per language
    starsByLanguage[language] = (starsByLanguage[language] || 0) + repo.stargazers_count;
    
    // Estimate commits per language (using size as proxy)
    commitsByLanguage[language] = (commitsByLanguage[language] || 0) + repo.size;
  });

  return {
    reposByLanguage,
    starsByLanguage,
    commitsByLanguage
  };
}

// Helper function to generate commit history
function generateCommitHistory(repositories: GitHubRepository[]) {
  const commitCounts: Record<string, number> = {};
  
  repositories.forEach(repo => {
    if (repo.pushed_at) {
      const date = new Date(repo.pushed_at).toISOString().split('T')[0];
      commitCounts[date] = (commitCounts[date] || 0) + 1;
    }
  });

  return Object.entries(commitCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-90); // Last 90 days
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const userId = session.user.id;
    const history = await RequestLogService.getUserRequestHistory(
      userId, 
      'github' as ServiceType, 
      limit
    );

    return NextResponse.json({ 
      success: true, 
      history 
    });
  } catch (error) {
    console.error('Error getting GitHub analytics history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}