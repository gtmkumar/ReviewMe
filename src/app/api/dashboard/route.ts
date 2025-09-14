import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
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
  if (!analyticsData) return [];
  
  const { user, totalStats, repositories } = analyticsData;
  const suggestions = [];
  
  if (!user.bio) {
    suggestions.push('Add a compelling bio to your GitHub profile');
  }
  
  if (!user.blog) {
    suggestions.push('Link your portfolio or personal website');
  }
  
  if (totalStats.totalStars < 10) {
    suggestions.push('Focus on creating quality repositories that can attract more stars');
  }
  
  if (user.followers < 20) {
    suggestions.push('Engage with the GitHub community to build your following');
  }
  
  if (repositories.length < 5) {
    suggestions.push('Create more repositories to showcase your skills');
  }
  
  if (totalStats.languageCount < 3) {
    suggestions.push('Diversify your programming languages to show versatility');
  }
  
  const readmeCount = repositories.filter((repo: any) => repo.description).length;
  if (readmeCount < repositories.length * 0.7) {
    suggestions.push('Add descriptions to more of your repositories');
  }
  
  return suggestions.slice(0, 5); // Limit to top 5 suggestions
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    // Get the database manager instance - connection is handled once at startup
    const db = getDbManager();
    const database = await db.getDb();

    // Fetch all user data in parallel
    const [
      profilesCollection,
      repositoriesCollection,
      userRequestsCollection,
      serviceResponsesCollection,
      recommendationsCollection,
      blogsCollection,
      preferencesCollection
    ] = await Promise.all([
      db.getProfilesCollection(),
      db.getRepositoriesCollection(),
      db.getUserRequestsCollection(),
      db.getServiceResponsesCollection(),
      db.getRecommendationsCollection(),
      db.getBlogsCollection(),
      db.getPreferencesCollection()
    ]);
    
    // Fetch all user data in parallel
    const [
      userProfile,
      githubRepositories,
      userRequests,
      serviceResponses,
      recommendations,
      blogDocuments,
      preferences,
      githubAnalytics,
      linkedinProfiles,
      resumeAnalysis
    ] = await Promise.all([
      profilesCollection.findOne({ userId }),
      repositoriesCollection.find({ userId }).toArray(),
      userRequestsCollection.find({ userId }).toArray(),
      serviceResponsesCollection.find({ userId }).toArray(),
      recommendationsCollection.find({ userId, isCompleted: false, isDismissed: false }).limit(5).toArray(),
      blogsCollection.find({ userId }).sort({ createdAt: -1 }).limit(5).toArray(),
      preferencesCollection.findOne({ userId }),
      database.collection('github_analytics').findOne({ userId: new ObjectId(userId) }),
      database.collection('linkedin_profiles').findOne({ userId: new ObjectId(userId) }),
      database.collection('resume_analysis').findOne(
        { userId: new ObjectId(userId) },
        { sort: { createdAt: -1 } }
      )
    ]);

    // Calculate scores from collections data
    const githubScore = githubAnalytics?.analyticsData ? calculateGitHubScore(githubAnalytics.analyticsData) : (userProfile?.github?.score?.overall || 0);
    const linkedinScore = linkedinProfiles?.analysisResults?.score || (userProfile?.linkedin?.score?.overall || 0);
    const resumeScore = resumeAnalysis?.externalApiResponse?.score || (userProfile?.resume?.score?.overall || 0);
    
    // Calculate blogs score from blog analytics
    const blogsScore = blogDocuments.length > 0 
      ? Math.round(blogDocuments.reduce((acc, blog) => acc + ((blog as any).analytics?.score || 0), 0) / blogDocuments.length)
      : 0;
    
    // Calculate overall score (average of available platforms)
    const availableScores = [githubScore, linkedinScore, resumeScore, blogsScore].filter(score => score > 0);
    const overallScore = availableScores.length > 0 
      ? Math.round(availableScores.reduce((sum, score) => sum + score, 0) / availableScores.length)
      : 0;

    // Count total recommendations across all platforms
    const recommendationsCount = recommendations.length;

    // Count documents (resume + additional documents)
    const documentsCount = (userProfile?.documents?.length || 0) + (userProfile?.resume ? 1 : 0);

    // Count blogs
    const blogsCount = blogDocuments.length;

    // Get latest data for each service
    const getLatestServiceData = (serviceType: string) => {
      const requests = userRequests.filter(r => r.serviceType === serviceType);
      const latestRequest = requests.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      if (!latestRequest) return null;
      
      const response = serviceResponses.find(r => r.requestId === latestRequest._id?.toString());
      return {
        request: latestRequest,
        response: response?.responseData,
        analysis: response?.analysisResults,
        lastUpdated: latestRequest.createdAt
      };
    };

    // Prepare platform-specific data
    const github = getLatestServiceData('github');
    const linkedin = getLatestServiceData('linkedin');
    const resume = getLatestServiceData('resume');

    // Get GitHub profile data if available
    const githubProfile = githubAnalytics?.analyticsData?.user || github?.response?.profile || userProfile?.github;
    const githubAnalyticsData = githubAnalytics?.analyticsData;

    // Count repositories from GitHub analytics or fallback to repositories collection (moved after githubAnalyticsData is defined)
    const repositoriesCount = githubAnalyticsData?.repositories?.length || githubRepositories.length;

    // Get LinkedIn profile data if available  
    const linkedinProfile = linkedinProfiles?.profileData || linkedin?.response || userProfile?.linkedin;

    // Check if we have resume data from the new analysis collection
    const hasResumeData = !!resumeAnalysis;

    // Calculate platform statistics
    const stats = {
      github: {
        totalRequests: userRequests.filter(r => r.serviceType === 'github').length,
        successfulRequests: userRequests.filter(r => r.serviceType === 'github' && r.status === 'completed').length,
        lastRequestDate: github?.lastUpdated
      },
      linkedin: {
        totalRequests: userRequests.filter(r => r.serviceType === 'linkedin').length,
        successfulRequests: userRequests.filter(r => r.serviceType === 'linkedin' && r.status === 'completed').length,
        lastRequestDate: linkedin?.lastUpdated
      },
      resume: {
        totalRequests: userRequests.filter(r => r.serviceType === 'resume').length,
        successfulRequests: userRequests.filter(r => r.serviceType === 'resume' && r.status === 'completed').length,
        lastRequestDate: resume?.lastUpdated
      },
      blogs: {
        totalRequests: 0, // Blogs are not tracked as service requests
        successfulRequests: blogsCount, // Use blogs count as successful blogs
        lastRequestDate: blogDocuments.length > 0 ? blogDocuments[0].createdAt : null
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        // Main metrics for the dashboard cards
        metrics: {
          overallScore,
          repositoriesCount,
          recommendationsCount,
          documentsCount,
          blogsCount
        },
        
        // Detailed platform data
        platforms: {
          github: githubProfile ? {
            connected: true,
            score: githubScore,
            username: githubProfile.username || githubProfile.login,
            name: githubProfile.name,
            avatar: githubProfile.avatar_url,
            followers: githubProfile.followers,
            following: githubProfile.following,
            publicRepos: githubProfile.public_repos,
            repositories: githubRepositories.slice(0, 5), // Top 5 for dashboard
            lastUpdated: githubAnalytics?.lastUpdated || github?.lastUpdated,
            totalStars: githubAnalyticsData?.totalStats?.totalStars || 0,
            totalForks: githubAnalyticsData?.totalStats?.totalForks || 0,
            languages: githubAnalyticsData?.languageStats?.reposByLanguage || {},
            profileData: githubAnalyticsData,
            suggestions: githubAnalyticsData ? generateGitHubSuggestions(githubAnalyticsData) : []
          } : {
            connected: false,
            score: 0
          },
          
          linkedin: linkedinProfile ? {
            connected: true,
            score: linkedinScore,
            name: linkedinProfile.name || `${linkedinProfile.firstName || ''} ${linkedinProfile.lastName || ''}`.trim(),
            headline: linkedinProfile.headline,
            location: linkedinProfile.location,
            industry: linkedinProfile.industry,
            connectionCount: linkedinProfile.connectionCount || linkedinProfile.connections,
            lastUpdated: linkedinProfiles?.lastUpdated || linkedin?.lastUpdated,
            experience: linkedinProfile.experience || [],
            education: linkedinProfile.education || [],
            skills: linkedinProfile.skills || [],
            profileData: linkedinProfile,
            strengths: linkedinProfiles?.analysisResults?.strengths || [],
            weaknesses: linkedinProfiles?.analysisResults?.weaknesses || [],
            suggestions: linkedinProfiles?.analysisResults?.suggestions || []
          } : {
            connected: false,
            score: 0
          },
          
          resume: resumeAnalysis ? {
            uploaded: true,
            score: resumeScore,
            fileName: resumeAnalysis.fileName,
            uploadedAt: resumeAnalysis.uploadedAt,
            lastUpdated: resumeAnalysis.updatedAt,
            analysis: {
              score: resumeAnalysis.externalApiResponse?.score || 0,
              feedback: resumeAnalysis.externalApiResponse?.feedback || [],
              strengths: resumeAnalysis.analysisResults?.strengths || [],
              weaknesses: resumeAnalysis.analysisResults?.weaknesses || [],
              suggestions: resumeAnalysis.analysisResults?.suggestions || []
            }
          } : {
            uploaded: false,
            score: 0
          },
          
          blogs: {
            connected: blogsCount > 0,
            count: blogsCount,
            blogs: blogDocuments.slice(0, 3), // Top 3 for dashboard
            score: blogsScore
          }
        },
        
        // Recommendations data
        recommendations: recommendations.slice(0, 5).map(rec => ({
          id: rec._id,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          platform: rec.category,
          type: rec.type,
          createdAt: rec.createdAt
        })),
        
        // Statistics
        stats,
        
        // Profile completeness
        completeness: {
          github: !!githubProfile,
          linkedin: !!linkedinProfile, 
          resume: hasResumeData,
          blogs: blogsCount > 0,
          overall: Math.round(
            [!!githubProfile, !!linkedinProfile, hasResumeData, blogsCount > 0]
              .filter(Boolean).length / 4 * 100
          )
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}