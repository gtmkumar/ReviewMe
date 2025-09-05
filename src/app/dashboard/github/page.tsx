'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Github, Star, GitBranch, Users, Calendar, Book, 
  Search, RefreshCw, CheckCircle, AlertCircle, ExternalLink,
  Code, Trophy, TrendingUp, MapPin, Link as LinkIcon, 
  CreditCard, Zap, AlertTriangle, History
} from 'lucide-react';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { cn } from '@/lib/utils';

interface GitHubProfile {
  login: string;
  name: string;
  bio: string;
  avatar_url: string;
  location: string;
  blog: string;
  company: string;
  followers: number;
  following: number;
  public_repos: number;
  public_gists: number;
  created_at: string;
  updated_at: string;
  html_url: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  clone_url: string;
  topics: string[];
}

interface GitHubContributions {
  total: number;
  weeks: Array<{
    week: number;
    days: number[];
  }>;
}

export default function GitHubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [contributions, setContributions] = useState<GitHubContributions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [credits, setCredits] = useState(0);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [showTransactionSummary, setShowTransactionSummary] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
    
    // Load user credits
    loadUserCredits();
  }, [session, status, router]);

  const loadUserCredits = async () => {
    try {
      const response = await fetch('/api/credits');
      const data = await response.json();
      setCredits(data.credits);
      setShowCreditWarning(data.isLowCredits);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const fetchGitHubData = async (githubUsername: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Check credits first (without deducting)
      const creditCheckResponse = await fetch('/api/credits');
      const creditCheckData = await creditCheckResponse.json();
      
      if (!creditCheckResponse.ok) {
        throw new Error(creditCheckData.error || 'Failed to check credits');
      }

      const requiredCredits = creditCheckData.costs.github;
      if (creditCheckData.credits < requiredCredits) {
        setError(`Insufficient credits. You have ${creditCheckData.credits} credits but need ${requiredCredits}.`);
        setShowCreditWarning(true);
        return;
      }

      const startTime = Date.now();
      
      // Fetch profile data
      const profileResponse = await fetch(`https://api.github.com/users/${githubUsername}`);
      if (!profileResponse.ok) {
        throw new Error('User not found');
      }
      const profileData = await profileResponse.json();
      setProfile(profileData);

      // Fetch repositories
      let reposData = [];
      const reposResponse = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=10`);
      if (reposResponse.ok) {
        reposData = await reposResponse.json();
        setRepositories(reposData);
      }

      // Note: GitHub's contributions endpoint requires authentication, so we'll show a placeholder
      // In a real implementation, you'd need to use GitHub's GraphQL API with proper authentication
      setContributions({
        total: Math.floor(Math.random() * 1000) + 500,
        weeks: [] // We'll show a simplified view
      });

      setSavedUsername(githubUsername);
      
      const processingTime = Date.now() - startTime;
      
      // Now deduct credits and log the successful response
      const deductionResponse = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_and_deduct',
          serviceType: 'github',
          payload: { username: githubUsername }
        })
      });

      const deductionData = await deductionResponse.json();
      
      if (!deductionResponse.ok) {
        // Service succeeded but credit deduction failed - log this unusual case
        console.error('Service succeeded but credit deduction failed:', deductionData.error);
        // Still show success to user since the service worked
      } else {
        const currentRequestId = deductionData.requestId;
        setRequestId(currentRequestId);
        setCredits(deductionData.remainingCredits);
        setShowCreditWarning(deductionData.isLowCredits);
        
        // Store transaction details for summary display
        setTransactionDetails(deductionData.transaction);
        setShowTransactionSummary(true);
        
        // Enhanced logging for successful credit deduction
        console.log('Credit Deduction Successful:', {
          requestId: currentRequestId,
          serviceType: 'github',
          creditsDeducted: deductionData.creditsDeducted,
          remainingCredits: deductionData.remainingCredits,
          username: githubUsername,
          timestamp: new Date().toISOString()
        });

        // Log successful response
        await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: currentRequestId,
            status: 'completed',
            responseData: {
              profile: profileData,
              repositories: reposData || [],
              username: githubUsername
            },
            analysisResults: {
              score: calculateProfileScore(),
              strengths: getProfileStrengths(profileData),
              weaknesses: getProfileWeaknesses(profileData),
              suggestions: getProfileSuggestions(profileData)
            },
            processingTime
          })
        });
      }

      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch GitHub data';
      setError(errorMessage);
      setProfile(null);
      setRepositories([]);
      setContributions(null);
      
      // No need to log failed response since credits weren't deducted
      console.error('GitHub service error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      fetchGitHubData(username.trim());
    }
  };

  const calculateProfileScore = () => {
    if (!profile || !repositories) return 0;
    
    let score = 0;
    
    // Basic profile completeness (20 points)
    if (profile.name) score += 5;
    if (profile.bio) score += 5;
    if (profile.location) score += 3;
    if (profile.blog) score += 3;
    if (profile.company) score += 4;
    
    // Repository activity (30 points)
    const repoCount = profile.public_repos;
    if (repoCount > 0) score += Math.min(repoCount * 2, 15);
    
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    if (totalStars > 0) score += Math.min(totalStars, 15);
    
    // Social presence (20 points)
    const followers = profile.followers;
    if (followers > 0) score += Math.min(Math.floor(followers / 5), 10);
    
    const following = profile.following;
    if (following > 0) score += Math.min(Math.floor(following / 10), 10);
    
    // Account age and activity (30 points)
    const accountAge = new Date().getFullYear() - new Date(profile.created_at).getFullYear();
    score += Math.min(accountAge * 3, 15);
    
    // Recent activity
    const recentRepos = repositories.filter(repo => {
      const lastUpdate = new Date(repo.updated_at);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return lastUpdate > sixMonthsAgo;
    });
    score += Math.min(recentRepos.length * 3, 15);
    
    return Math.min(score, 100);
  };

  const getProfileStrengths = (profileData: any): string[] => {
    const strengths = [];
    if (profileData.bio) strengths.push('Complete bio');
    if (profileData.blog) strengths.push('Website/portfolio linked');
    if (profileData.company) strengths.push('Company information provided');
    if (profileData.location) strengths.push('Location specified');
    if (profileData.followers > 50) strengths.push('Strong follower base');
    if (profileData.public_repos > 10) strengths.push('Multiple public repositories');
    return strengths;
  };

  const getProfileWeaknesses = (profileData: any): string[] => {
    const weaknesses = [];
    if (!profileData.bio) weaknesses.push('Missing bio');
    if (!profileData.blog) weaknesses.push('No website/portfolio linked');
    if (!profileData.company) weaknesses.push('Company information missing');
    if (!profileData.location) weaknesses.push('Location not specified');
    if (profileData.followers < 10) weaknesses.push('Low follower count');
    if (profileData.public_repos < 5) weaknesses.push('Few public repositories');
    return weaknesses;
  };

  const getProfileSuggestions = (profileData: any): string[] => {
    const suggestions = [];
    if (!profileData.bio) suggestions.push('Add a compelling bio describing your skills and interests');
    if (!profileData.blog) suggestions.push('Link your portfolio or personal website');
    if (profileData.public_repos < 5) suggestions.push('Create more public repositories to showcase your work');
    if (profileData.followers < 20) suggestions.push('Engage with the GitHub community to increase followers');
    suggestions.push('Keep your repositories updated with recent commits');
    suggestions.push('Add README files to your repositories for better documentation');
    return suggestions;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) return null;

  const profileScore = calculateProfileScore();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Github className="h-8 w-8 text-github" />
                <h1 className="text-3xl font-bold text-gray-900">GitHub Profile Analysis</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* History Button */}
                <Link 
                  href="/dashboard/github/history"
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <History className="h-4 w-4" />
                  <span>View History</span>
                </Link>
                
                {/* Credit Display */}
                <div className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg border",
                  showCreditWarning ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"
                )}>
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">{credits} Credits</span>
                  {showCreditWarning && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Cost: 20 credits per analysis
                </div>
              </div>
            </div>
            <p className="text-gray-600">
              Enter a GitHub username to analyze public profile data and repositories.
            </p>
          </div>

          {/* Success Notification */}
          {showSuccessNotification && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="text-green-800 font-medium">Analysis Complete!</h3>
                  <p className="text-green-700 text-sm">
                    GitHub profile analyzed successfully. Remaining credits: {credits}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Low Credits Warning */}
          {showCreditWarning && !showSuccessNotification && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="text-red-800 font-medium">You're low on credits!</h3>
                    <p className="text-red-700 text-sm">
                      You have {credits} credits remaining. Consider referring friends to earn more.
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  <Zap className="h-4 w-4 inline mr-2" />
                  Earn 200 Credits
                </button>
              </div>
            </div>
          )}

          {/* Search Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Github className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="e.g., octocat"
                    required
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary flex items-center space-x-2"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>{isLoading ? 'Analyzing...' : 'Analyze'}</span>
                </button>
              </div>
            </form>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Transaction Summary */}
            {showTransactionSummary && transactionDetails && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-green-800 mb-2">
                      Analysis Complete - Credit Transaction Summary
                    </h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Service:</span>
                        <span className="font-medium">{transactionDetails.serviceType?.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Credits Used:</span>
                        <span className="font-medium">-{transactionDetails.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining Balance:</span>
                        <span className="font-medium">{credits} credits</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transaction ID:</span>
                        <span className="font-mono text-xs">{transactionDetails.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span className="text-xs">{new Date(transactionDetails.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => setShowTransactionSummary(false)}
                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Data */}
          {profile && (
            <div className="space-y-8">
              
              {/* Profile Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Profile Card */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                  <div className="flex items-start space-x-6">
                    <img
                      src={profile.avatar_url}
                      alt={profile.name || profile.login}
                      className="w-24 h-24 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {profile.name || profile.login}
                        </h2>
                        <a
                          href={profile.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-github hover:text-github/80 transition-colors"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </div>
                      <p className="text-gray-600 text-lg mb-3">@{profile.login}</p>
                      {profile.bio && (
                        <p className="text-gray-700 mb-4">{profile.bio}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        {profile.company && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="h-4 w-4 mr-2" />
                            {profile.company}
                          </div>
                        )}
                        {profile.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            {profile.location}
                          </div>
                        )}
                        {profile.blog && (
                          <div className="flex items-center text-sm text-gray-600">
                            <LinkIcon className="h-4 w-4 mr-2" />
                            <a 
                              href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors truncate"
                            >
                              {profile.blog}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Joined {new Date(profile.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Score */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <Trophy className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className={cn(
                      "text-4xl font-bold mb-2",
                      profileScore >= 80 ? "text-green-600" :
                      profileScore >= 60 ? "text-blue-600" :
                      profileScore >= 40 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {profileScore}
                    </div>
                    <p className="text-gray-600 text-sm">Profile Score</p>
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Completeness</span>
                      <span className="text-sm font-medium">
                        {[profile.name, profile.bio, profile.location, profile.blog, profile.company].filter(Boolean).length}/5
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Repositories</span>
                      <span className="text-sm font-medium">{profile.public_repos}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Followers</span>
                      <span className="text-sm font-medium">{profile.followers}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <Book className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{profile.public_repos}</div>
                  <div className="text-sm text-gray-600">Repositories</div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{profile.followers}</div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{profile.following}</div>
                  <div className="text-sm text-gray-600">Following</div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <Code className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{profile.public_gists}</div>
                  <div className="text-sm text-gray-600">Gists</div>
                </div>
              </div>

              {/* Top Repositories */}
              {repositories.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Top Repositories</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {repositories.slice(0, 6).map((repo) => (
                      <div key={repo.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="text-lg font-medium text-primary">
                                <a 
                                  href={repo.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {repo.name}
                                </a>
                              </h4>
                              {repo.language && (
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                  {repo.language}
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-gray-600 mb-3">{repo.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4" />
                                <span>{repo.stargazers_count}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <GitBranch className="h-4 w-4" />
                                <span>{repo.forks_count}</span>
                              </div>
                              <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contribution Heatmap Placeholder */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contribution Activity</h3>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Contribution heatmap would be displayed here with proper GitHub API authentication.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    This requires GitHub GraphQL API access with user authentication.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}