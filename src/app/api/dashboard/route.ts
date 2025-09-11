import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { ObjectId } from 'mongodb';

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
      preferences
    ] = await Promise.all([
      profilesCollection.findOne({ userId }),
      repositoriesCollection.find({ userId }).toArray(),
      userRequestsCollection.find({ userId }).toArray(),
      serviceResponsesCollection.find({ userId }).toArray(),
      recommendationsCollection.find({ userId, isCompleted: false, isDismissed: false }).limit(5).toArray(),
      blogsCollection.find({ userId }).sort({ createdAt: -1 }).limit(5).toArray(),
      preferencesCollection.findOne({ userId })
    ]);

    // Calculate scores
    const githubScore = userProfile?.github?.score?.overall || 0;
    const linkedinScore = userProfile?.linkedin?.score?.overall || 0;
    const resumeScore = userProfile?.resume?.score?.overall || 0;
    const blogsScore = 0; // TODO: Implement blogs scoring
    
    // Calculate overall score (average of available platforms)
    const availableScores = [githubScore, linkedinScore, resumeScore, blogsScore].filter(score => score > 0);
    const overallScore = availableScores.length > 0 
      ? Math.round(availableScores.reduce((sum, score) => sum + score, 0) / availableScores.length)
      : 0;

    // Count repositories
    const repositoriesCount = githubRepositories.length;

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
    const githubProfile = github?.response?.profile || userProfile?.github;

    // Get LinkedIn profile data if available  
    const linkedinProfile = linkedin?.response || userProfile?.linkedin;

    // Get Resume data if available
    const resumeData = resume?.response || userProfile?.resume;

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
        totalRequests: userRequests.filter(r => r.serviceType === 'blogs').length,
        successfulRequests: userRequests.filter(r => r.serviceType === 'blogs' && r.status === 'completed').length,
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
            lastUpdated: github?.lastUpdated
          } : {
            connected: false,
            score: 0
          },
          
          linkedin: linkedinProfile ? {
            connected: true,
            score: linkedinScore,
            name: `${linkedinProfile.firstName || ''} ${linkedinProfile.lastName || ''}`.trim(),
            headline: linkedinProfile.headline,
            location: linkedinProfile.location,
            industry: linkedinProfile.industry,
            connectionCount: linkedinProfile.connectionCount,
            lastUpdated: linkedin?.lastUpdated
          } : {
            connected: false,
            score: 0
          },
          
          resume: resumeData ? {
            uploaded: true,
            score: resumeScore,
            fileName: resumeData.fileName,
            uploadedAt: resumeData.uploadedAt,
            lastUpdated: resume?.lastUpdated
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
          resume: !!resumeData,
          blogs: blogsCount > 0,
          overall: Math.round(
            [!!githubProfile, !!linkedinProfile, !!resumeData, blogsCount > 0]
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