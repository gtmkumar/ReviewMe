'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Github, Star, GitBranch, Users, Calendar, Book, 
  Search, RefreshCw, CheckCircle, AlertCircle, ExternalLink,
  Code, Trophy, TrendingUp, MapPin, Link as LinkIcon, 
  CreditCard, Zap, AlertTriangle, History, BarChart3, PieChart,
  Database, Clock
} from 'lucide-react';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { cn } from '@/lib/utils';
import { CreditManager } from '@/components/credit-manager';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale
);

// Global type declaration for window function
declare global {
  interface Window {
    showReferralModal?: () => void;
  }
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

export default function GitHubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [analyticsData, setAnalyticsData] = useState<GitHubAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [credits, setCredits] = useState(0);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [showTransactionSummary, setShowTransactionSummary] = useState(false);
  const [savedDataInfo, setSavedDataInfo] = useState<{
    lastUpdated: string;
    username: string;
    source: 'saved' | 'fresh';
  } | null>(null);
  const [loadingSavedData, setLoadingSavedData] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
    
    // Load user credits and saved data
    loadUserCredits();
    loadSavedAnalyticsData();
  }, [session, status, router]);

  useEffect(() => {
    // Load updated data when username changes
    if (username && username !== savedUsername) {
      loadSavedAnalyticsData(username);
    }
  }, [username, savedUsername]);

  const loadSavedAnalyticsData = async (usernameParam?: string) => {
    setLoadingSavedData(true);
    try {
      const url = usernameParam 
        ? `/api/github/profile?username=${encodeURIComponent(usernameParam)}`
        : '/api/github/profile';
        
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok && data.success && data.data) {
        setAnalyticsData(data.data);
        setSavedUsername(data.username);
        setSavedDataInfo({
          lastUpdated: data.lastUpdated,
          username: data.username,
          source: 'saved'
        });
        if (!usernameParam) {
          setUsername(data.username);
        }
      } else {
        // No saved data found
        setSavedDataInfo(null);
      }
    } catch (error) {
      console.error('Error loading saved analytics data:', error);
    } finally {
      setLoadingSavedData(false);
    }
  };

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

  const fetchGitHubAnalytics = async (githubUsername: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/github/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: githubUsername })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch GitHub analytics');
      }

      if (!data.success) {
        throw new Error(data.error || 'GitHub analytics request failed');
      }

      // Set the analytics data
      setAnalyticsData(data.data);
      setSavedUsername(githubUsername);
      setSavedDataInfo({
        lastUpdated: new Date().toISOString(),
        username: githubUsername,
        source: 'fresh'
      });
      
      // Update credits and transaction info
      setCredits(data.remainingCredits);
      setRequestId(data.requestId);
      
      setTransactionDetails({
        id: data.requestId,
        amount: data.creditsUsed,
        serviceType: 'github',
        timestamp: new Date().toISOString(),
        description: 'GitHub Analytics'
      });
      setShowTransactionSummary(true);
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch GitHub analytics';
      setError(errorMessage);
      setAnalyticsData(null);
      setSavedDataInfo(null);
      console.error('GitHub analytics error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      fetchGitHubAnalytics(username.trim());
    }
  };

  const calculateProfileScore = () => {
    if (!analyticsData) return 0;
    
    const { user, repositories, totalStats } = analyticsData;
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
  };

  const getProfileStrengths = (): string[] => {
    if (!analyticsData) return [];
    const { user, totalStats } = analyticsData;
    const strengths = [];
    if (user.bio) strengths.push('Complete bio');
    if (user.blog) strengths.push('Website/portfolio linked');
    if (user.company) strengths.push('Company information provided');
    if (user.location) strengths.push('Location specified');
    if (user.followers > 50) strengths.push('Strong follower base');
    if (user.public_repos > 10) strengths.push('Multiple public repositories');
    if (totalStats.totalStars > 100) strengths.push('High star count across repositories');
    if (totalStats.languageCount > 3) strengths.push('Diverse programming languages');
    return strengths;
  };

  const getProfileWeaknesses = (): string[] => {
    if (!analyticsData) return [];
    const { user, totalStats } = analyticsData;
    const weaknesses = [];
    if (!user.bio) weaknesses.push('Missing bio');
    if (!user.blog) weaknesses.push('No website/portfolio linked');
    if (!user.company) weaknesses.push('Company information missing');
    if (!user.location) weaknesses.push('Location not specified');
    if (user.followers < 10) weaknesses.push('Low follower count');
    if (user.public_repos < 5) weaknesses.push('Few public repositories');
    if (totalStats.totalStars < 10) weaknesses.push('Low star count');
    return weaknesses;
  };

  const getProfileSuggestions = (): string[] => {
    if (!analyticsData) return [];
    const { user } = analyticsData;
    const suggestions = [];
    if (!user.bio) suggestions.push('Add a compelling bio describing your skills and interests');
    if (!user.blog) suggestions.push('Link your portfolio or personal website');
    if (user.public_repos < 5) suggestions.push('Create more public repositories to showcase your work');
    if (user.followers < 20) suggestions.push('Engage with the GitHub community to increase followers');
    suggestions.push('Keep your repositories updated with recent commits');
    suggestions.push('Add README files to your repositories for better documentation');
    suggestions.push('Use topics/tags to make your repositories more discoverable');
    return suggestions;
  };

  // Chart.js configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const getLanguageChartsData = () => {
    if (!analyticsData?.languageStats) return null;
    
    const { reposByLanguage, starsByLanguage } = analyticsData.languageStats;
    const languages = Object.keys(reposByLanguage).slice(0, 10); // Top 10 languages
    
    return {
      reposByLanguage: {
        labels: languages,
        datasets: [{
          label: 'Repositories',
          data: languages.map(lang => reposByLanguage[lang]),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        }],
      },
      starsByLanguage: {
        labels: languages,
        datasets: [{
          label: 'Stars',
          data: languages.map(lang => starsByLanguage[lang] || 0),
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
        }],
      },
      languageDistribution: {
        labels: languages,
        datasets: [{
          data: languages.map(lang => reposByLanguage[lang]),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
            '#FF6384',
            '#C9CBCF',
            '#4BC0C0',
            '#FF6384'
          ],
        }],
      },
    };
  };

  const getCommitHistoryData = () => {
    if (!analyticsData?.commitHistory) return null;
    
    return {
      labels: analyticsData.commitHistory.map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [{
        label: 'Repository Updates',
        data: analyticsData.commitHistory.map(item => item.count),
        fill: false,
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        tension: 0.1,
      }],
    };
  };

  const profileScore = calculateProfileScore();
  const languageCharts = getLanguageChartsData();
  const commitHistory = getCommitHistoryData();

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
                <h1 className="text-3xl font-bold text-gray-900">GitHub Analytics Dashboard</h1>
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
              Enter a GitHub username to analyze profile data and repositories with detailed analytics charts.
            </p>
          </div>

          {/* Data Source Indicator */}
          {savedDataInfo && (
            <div className={cn(
              "mb-6 p-4 rounded-lg border",
              savedDataInfo.source === 'saved' 
                ? "bg-blue-50 border-blue-200"
                : "bg-green-50 border-green-200"
            )}>
              <div className="flex items-center space-x-3">
                {savedDataInfo.source === 'saved' ? (
                  <Database className="h-5 w-5 text-blue-600" />
                ) : (
                  <Zap className="h-5 w-5 text-green-600" />
                )}
                <div>
                  <h3 className={cn(
                    "font-medium",
                    savedDataInfo.source === 'saved' ? "text-blue-800" : "text-green-800"
                  )}>
                    {savedDataInfo.source === 'saved' 
                      ? 'Displaying Saved Analytics Data' 
                      : 'Fresh Analytics Data Generated'
                    }
                  </h3>
                  <p className={cn(
                    "text-sm",
                    savedDataInfo.source === 'saved' ? "text-blue-700" : "text-green-700"
                  )}>
                    Username: {savedDataInfo.username} | Last updated: {new Date(savedDataInfo.lastUpdated).toLocaleString()}
                    {savedDataInfo.source === 'saved' && ' | No credits charged for cached data'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading Saved Data */}
          {loadingSavedData && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-5 w-5 text-gray-600 animate-spin" />
                <p className="text-gray-600">Loading saved analytics data...</p>
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
                        <span className="font-mono text-xs">{transactionDetails.id ? transactionDetails.id.slice(-8) : 'N/A'}</span>
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

          {/* GitHub Analytics Data */}
          {analyticsData && (
            <div className="space-y-8">
              
              {/* Profile Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Profile Card */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                  <div className="flex items-start space-x-6">
                    <img
                      src={analyticsData.user.avatar_url}
                      alt={analyticsData.user.name || analyticsData.user.login}
                      className="w-24 h-24 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {analyticsData.user.name || analyticsData.user.login}
                        </h2>
                        <a
                          href={analyticsData.user.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-github hover:text-github/80 transition-colors"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </div>
                      <p className="text-gray-600 text-lg mb-3">@{analyticsData.user.login}</p>
                      {analyticsData.user.bio && (
                        <p className="text-gray-700 mb-4">{analyticsData.user.bio}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        {analyticsData.user.company && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="h-4 w-4 mr-2" />
                            {analyticsData.user.company}
                          </div>
                        )}
                        {analyticsData.user.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            {analyticsData.user.location}
                          </div>
                        )}
                        {analyticsData.user.blog && (
                          <div className="flex items-center text-sm text-gray-600">
                            <LinkIcon className="h-4 w-4 mr-2" />
                            <a 
                              href={analyticsData.user.blog.startsWith('http') ? analyticsData.user.blog : `https://${analyticsData.user.blog}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors truncate"
                            >
                              {analyticsData.user.blog}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Joined {new Date(analyticsData.user.created_at).toLocaleDateString()}
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
                        {[analyticsData.user.name, analyticsData.user.bio, analyticsData.user.location, analyticsData.user.blog, analyticsData.user.company].filter(Boolean).length}/5
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Repositories</span>
                      <span className="text-sm font-medium">{analyticsData.user.public_repos}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Stars</span>
                      <span className="text-sm font-medium">{analyticsData.totalStats.totalStars}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Languages</span>
                      <span className="text-sm font-medium">{analyticsData.totalStats.languageCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <Book className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analyticsData.user.public_repos}</div>
                  <div className="text-sm text-gray-600">Repositories</div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analyticsData.totalStats.totalStars}</div>
                  <div className="text-sm text-gray-600">Total Stars</div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <GitBranch className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analyticsData.totalStats.totalForks}</div>
                  <div className="text-sm text-gray-600">Total Forks</div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analyticsData.user.followers}</div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <Code className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analyticsData.totalStats.languageCount}</div>
                  <div className="text-sm text-gray-600">Languages</div>
                </div>
              </div>

              {/* Analytics Charts */}
              {languageCharts && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Repositories by Language */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-medium text-gray-900">Repositories by Language</h3>
                    </div>
                    <div className="h-64">
                      <Bar data={languageCharts.reposByLanguage} options={chartOptions} />
                    </div>
                  </div>

                  {/* Stars by Language */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <BarChart3 className="h-5 w-5 text-yellow-600" />
                      <h3 className="text-lg font-medium text-gray-900">Stars by Language</h3>
                    </div>
                    <div className="h-64">
                      <Bar data={languageCharts.starsByLanguage} options={chartOptions} />
                    </div>
                  </div>

                  {/* Language Distribution */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <PieChart className="h-5 w-5 text-purple-600" />
                      <h3 className="text-lg font-medium text-gray-900">Language Distribution</h3>
                    </div>
                    <div className="h-64">
                      <Pie data={languageCharts.languageDistribution} options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: {
                            position: 'bottom' as const,
                          },
                        },
                      }} />
                    </div>
                  </div>

                  {/* Repository Activity Timeline */}
                  {commitHistory && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-medium text-gray-900">Repository Activity (Last 90 Days)</h3>
                      </div>
                      <div className="h-64">
                        <Line data={commitHistory} options={{
                          ...chartOptions,
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1
                              }
                            }
                          }
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Top Repositories */}
              {analyticsData.repositories.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Top Repositories</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {analyticsData.topRepositories.byStars.slice(0, 6).map((repo) => (
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
                              {repo.topics && repo.topics.length > 0 && (
                                <div className="flex flex-wrap gap-1 ml-4">
                                  {repo.topics.slice(0, 3).map((topic, index) => (
                                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Profile Analysis Results */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Strengths */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {getProfileStrengths().map((strength, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-700">
                        <div className="w-2 h-2 bg-green-600 rounded-full mr-3 flex-shrink-0" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Areas for Improvement */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {getProfileWeaknesses().map((weakness, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-700">
                        <div className="w-2 h-2 bg-yellow-600 rounded-full mr-3 flex-shrink-0" />
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                  Suggestions for Growth
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getProfileSuggestions().map((suggestion, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-700">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Loading State */}
          {status === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
          )}

          {/* No Session Fallback */}
          {!session && status !== 'loading' && (
            <div className="text-center py-12">
              <p className="text-gray-600">Please sign in to access GitHub analytics.</p>
            </div>
          )}
        </div>
      </main>
      {/* Credit Manager (handles notifications and referrals) */}
      <CreditManager />
    </div>
  );
}