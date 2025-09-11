'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, Github, Linkedin, FileText, Settings, LogOut, 
  Upload, RefreshCw, CheckCircle, AlertCircle, TrendingUp,
  Users, Star, GitBranch, Calendar, Award, Target, Zap,
  Download, Eye, Share2, ArrowRight, Plus, CreditCard, History,
  ChevronDown, ChevronUp, Clock, Minus, X
} from 'lucide-react';
import Link from 'next/link';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { CreditManager } from '@/components/credit-manager';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { useAnalytics } from '@/hooks/useAnalytics';

// Global type declaration for window function
declare global {
  interface Window {
    showReferralModal?: () => void;
  }
}

interface DashboardData {
  success: boolean;
  data: {
    metrics: {
      overallScore: number;
      repositoriesCount: number;
      recommendationsCount: number;
      documentsCount: number;
      blogsCount: number;
    };
    platforms: {
      github: {
        connected: boolean;
        score: number;
        username?: string;
        name?: string;
        avatar?: string;
        followers?: number;
        following?: number;
        publicRepos?: number;
        repositories?: any[];
        lastUpdated?: string;
      };
      linkedin: {
        connected: boolean;
        score: number;
        name?: string;
        headline?: string;
        location?: string;
        industry?: string;
        connectionCount?: number;
        lastUpdated?: string;
      };
      resume: {
        uploaded: boolean;
        score: number;
        fileName?: string;
        uploadedAt?: string;
        lastUpdated?: string;
      };
      blogs: {
        connected: boolean;
        count: number;
        blogs?: any[];
        score: number;
      };
    };
    recommendations: Array<{
      id: string;
      title: string;
      description: string;
      priority: string;
      platform: string;
      type: string;
      createdAt: string;
    }>;
    stats: any;
    completeness: {
      github: boolean;
      linkedin: boolean;
      resume: boolean;
      blogs: boolean;
      overall: number;
    };
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionSummary, setTransactionSummary] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  
  // Initialize analytics tracking
  const { trackClick, trackPageView } = useAnalytics();
  
  useEffect(() => {
    // Track dashboard page view
    trackPageView('dashboard');
  }, [trackPageView]);

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
      if (response.ok) {
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const loadTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const response = await fetch('/api/credits/history?limit=20');
      const data = await response.json();
      if (response.ok) {
        setTransactions(data.transactions || []);
        setTransactionSummary(data.summary || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleTransactionsToggle = () => {
    if (!showTransactions) {
      loadTransactions();
    }
    setShowTransactions(!showTransactions);
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'github':
        return <Github className="h-5 w-5 text-gray-700" />;
      case 'linkedin':
        return <Linkedin className="h-5 w-5 text-blue-600" />;
      case 'resume':
        return <FileText className="h-5 w-5 text-green-600" />;
      default:
        return <Star className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load dashboard data');
      }
      
      return data;
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleGitHubSync = async () => {
    setIsLoading(true);
    try {
      await apiClient.syncGitHub();
      refetch();
    } catch (error) {
      console.error('GitHub sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeUpload = async (file: File) => {
    setIsLoading(true);
    try {
      await apiClient.uploadResume(file);
      refetch();
    } catch (error) {
      console.error('Resume upload failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isDashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) return null;

  // Extract metrics from the new API response
  const metrics = dashboardData?.data?.metrics || {
    overallScore: 0,
    repositoriesCount: 0,
    recommendationsCount: 0,
    documentsCount: 0,
    blogsCount: 0
  };
  
  const platforms = dashboardData?.data?.platforms || {
    github: { connected: false, score: 0 },
    linkedin: { connected: false, score: 0 },
    resume: { uploaded: false, score: 0 },
    blogs: { connected: false, count: 0, score: 0 }
  };
  
  const recommendations = dashboardData?.data?.recommendations || [];
  const completeness = dashboardData?.data?.completeness || {
    github: false,
    linkedin: false,
    resume: false,
    blogs: false,
    overall: 0
  };

  // Mock data for charts (would come from real analytics)
  const scoreHistory = [
    { date: '2024-01', score: Math.max(0, metrics.overallScore - 20) },
    { date: '2024-02', score: Math.max(0, metrics.overallScore - 15) },
    { date: '2024-03', score: Math.max(0, metrics.overallScore - 10) },
    { date: '2024-04', score: Math.max(0, metrics.overallScore - 5) },
    { date: '2024-05', score: Math.max(0, metrics.overallScore - 2) },
    { date: '2024-06', score: metrics.overallScore },
  ];

  const scoreBreakdown = [
    { name: 'GitHub', value: platforms.github.score, color: '#24292e' },
    { name: 'LinkedIn', value: platforms.linkedin.score, color: '#0077b5' },
    { name: 'Resume', value: platforms.resume.score, color: '#10B981' },
    { name: 'Blogs', value: platforms.blogs.score, color: '#8B5CF6' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {session.user?.name || 'User'}!
                </h1>
                <p className="text-gray-600">
                  Here's an overview of your professional profile analysis. Click on any section to dive deeper.
                </p>
              </div>
              
              {/* Credit Display and Transactions */}
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.showReferralModal) {
                      window.showReferralModal();
                    }
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700 font-medium">Credits: </span>
                  <span className="text-blue-900 font-bold">{credits}</span>
                  {/* <span className="text-xs text-blue-600 ml-1">(Click to earn more)</span>   */}
                </button>
                <button 
                  onClick={handleTransactionsToggle}
                  className={cn(
                    "px-4 py-2 rounded-lg transition-colors flex items-center space-x-2",
                    showTransactions ? "bg-green-600 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"
                  )}
                >
                  <History className="h-4 w-4" />
                  <span>Transactions</span>
                  {showTransactions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button 
                  onClick={() => {
                    trackClick('analytics_toggle', '/dashboard');
                    setShowAnalytics(!showAnalytics);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg transition-colors",
                    showAnalytics ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  )}
                >
                  <BarChart3 className="h-4 w-4 inline mr-2" />
                  Analytics
                </button>
              </div>
            </div>
          </div>

          {/* Transaction Details View */}
          {showTransactions && (
            <div className="mb-8 bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <History className="h-6 w-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                  </div>
                  <button 
                    onClick={() => setShowTransactions(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Transaction Summary Cards */}
              {transactionSummary.length > 0 && (
                <div className="px-6 py-4 border-b border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Usage Summary by Service</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {transactionSummary.map((summary) => (
                      <div key={summary.serviceType} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getServiceIcon(summary.serviceType)}
                            <span className="text-sm font-medium text-gray-700 capitalize">
                              {summary.serviceType}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {summary.usageCount} uses
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Minus className="h-4 w-4 text-red-500" />
                          <span className="text-lg font-bold text-red-600">
                            {summary.totalCreditsUsed}
                          </span>
                          <span className="text-sm text-gray-500">credits used</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Last used: {formatDate(summary.lastUsed)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Transaction List */}
              <div className="px-6 py-4">
                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading transactions...</span>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Transactions</h4>
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {getServiceIcon(transaction.serviceType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 capitalize">
                                  {transaction.serviceType}
                                </span>
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                  transaction.status === 'completed' ? "bg-green-100 text-green-800" :
                                  transaction.status === 'failed' ? "bg-red-100 text-red-800" :
                                  "bg-yellow-100 text-yellow-800"
                                )}>
                                  {transaction.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 truncate">
                                {transaction.description}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {formatDate(transaction.timestamp)}
                                </span>
                                {transaction.requestId && (
                                  <span className="text-xs text-gray-400">
                                    • ID: {transaction.requestId.slice(-8)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right">
                              <div className="flex items-center space-x-1 text-red-600">
                                <Minus className="h-4 w-4" />
                                <span className="text-sm font-bold">
                                  {transaction.creditsDeducted}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">credits</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No transactions found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Start using our services to see your transaction history here
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div 
              className="bg-white rounded-lg shadow p-6 text-center cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                trackClick('overall_score_card', '/dashboard');
                // Could show a detailed breakdown modal
              }}
            >
              <div className="text-2xl font-bold text-primary">
                {metrics.overallScore}
              </div>
              <div className="text-sm text-gray-500">Overall Score</div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${metrics.overallScore}%` }}
                ></div>
              </div>
            </div>
            
            <Link 
              href="/dashboard/github" 
              className="bg-white rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow group"
              onClick={() => trackClick('repositories_card', '/dashboard/github')}
            >
              <div className="text-2xl font-bold text-github group-hover:text-github/80 transition-colors">
                {metrics.repositoriesCount}
              </div>
              <div className="text-sm text-gray-500">Repositories</div>
              {platforms.github.connected && (
                <div className="mt-2 flex items-center justify-center text-xs text-gray-400">
                  <Github className="h-3 w-3 mr-1" />
                  Connected
                </div>
              )}
            </Link>
            
            <div 
              className="bg-white rounded-lg shadow p-6 text-center cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => {
                trackClick('recommendations_card', '/dashboard');
                // Navigate to recommendations section or show modal
                if (recommendations.length > 0) {
                  // Show recommendations modal or navigate to recommendations page
                  console.log('Show recommendations:', recommendations);
                }
              }}
            >
              <div className="text-2xl font-bold text-green-600 group-hover:text-green-500 transition-colors">
                {metrics.recommendationsCount}
              </div>
              <div className="text-sm text-gray-500">Recommendations</div>
              {metrics.recommendationsCount > 0 && (
                <div className="mt-2 flex items-center justify-center text-xs text-green-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Action needed
                </div>
              )}
            </div>
            
            <Link 
              href="/dashboard/resume" 
              className="bg-white rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow group"
              onClick={() => trackClick('documents_card', '/dashboard/resume')}
            >
              <div className="text-2xl font-bold text-purple-600 group-hover:text-purple-500 transition-colors">
                {metrics.documentsCount}
              </div>
              <div className="text-sm text-gray-500">Documents</div>
              {platforms.resume.uploaded && (
                <div className="mt-2 flex items-center justify-center text-xs text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resume uploaded
                </div>
              )}
            </Link>
            
            <Link 
              href="/dashboard/blogs" 
              className="bg-white rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow group"
              onClick={() => trackClick('blogs_card', '/dashboard/blogs')}
            >
              <div className="text-2xl font-bold text-indigo-600 group-hover:text-indigo-500 transition-colors">
                {metrics.blogsCount}
              </div>
              <div className="text-sm text-gray-500">Blogs</div>
              {platforms.blogs.connected && (
                <div className="mt-2 flex items-center justify-center text-xs text-indigo-600">
                  <Zap className="h-3 w-3 mr-1" />
                  Synced
                </div>
              )}
            </Link>
          </div>

          {/* Profile Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            
            {/* GitHub Section */}
            <Link 
              href="/dashboard/github" 
              className="group"
              onClick={() => trackClick('github_card', '/dashboard/github')}
            >
              <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Github className="h-8 w-8 text-github" />
                    <h3 className="text-xl font-semibold text-gray-900">GitHub Profile</h3>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-github transition-colors" />
                </div>
                
                {platforms.github.connected ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Score</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-semibold text-github">{platforms.github.score}/100</span>
                        {platforms.github.lastUpdated && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Data is fresh"></div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>@{platforms.github.username}</span>
                      <span className="text-xs text-gray-500">
                        {dashboardData?.data?.stats?.github?.totalRequests || 0} requests
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{platforms.github.followers || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <GitBranch className="h-4 w-4" />
                        <span>{platforms.github.repositories?.length || 0}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-github h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${platforms.github.score}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Github className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-3">
                      Connect your GitHub profile to analyze your coding activity
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-github text-sm font-medium">
                      <Plus className="h-4 w-4" />
                      <span>Add GitHub Profile</span>
                    </div>
                  </div>
                )}
              </div>
            </Link>

            {/* LinkedIn Section */}
            <Link href="/dashboard/linkedin" className="group">
              <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Linkedin className="h-8 w-8 text-linkedin" />
                    <h3 className="text-xl font-semibold text-gray-900">LinkedIn Profile</h3>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-linkedin transition-colors" />
                </div>
                
                <div className="text-center py-8">
                  <Linkedin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-3">
                    Analyze your LinkedIn profile for professional optimization
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-linkedin text-sm font-medium">
                    <Plus className="h-4 w-4" />
                    <span>Add LinkedIn Profile</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Resume Section */}
            <Link href="/dashboard/resume" className="group">
              <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-green-600" />
                    <h3 className="text-xl font-semibold text-gray-900">Resume Analysis</h3>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
                
                {dashboardData?.resume ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">ATS Score</span>
                      <span className="text-lg font-semibold text-green-600">{resumeScore}/100</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {dashboardData.resume.fileName}
                    </div>
                    <div className="text-xs text-gray-500">
                      Uploaded: {new Date(dashboardData.resume.uploadedAt).toLocaleDateString()}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${resumeScore}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-3">
                      Upload your resume for ATS compatibility analysis
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-green-600 text-sm font-medium">
                      <Upload className="h-4 w-4" />
                      <span>Upload Resume</span>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Score Overview Chart */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Score Breakdown</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* GitHub Repositories */}
            {(dashboardData?.repositories?.length || 0) > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Top Repositories</h3>
                  <Link href="/dashboard/github" className="text-primary hover:text-primary/80 text-sm">
                    View all
                  </Link>
                </div>
                <div className="space-y-4">
                  {(dashboardData?.repositories || []).slice(0, 5).map((repo: any) => (
                    <div key={repo.githubId} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h4 className="text-sm font-medium text-gray-900">{repo.name}</h4>
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {repo.language}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{repo.description}</p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-1" />
                          {repo.stars}
                        </div>
                        <div className="flex items-center">
                          <GitBranch className="h-4 w-4 mr-1" />
                          {repo.forks}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {(dashboardData?.recommendations?.length || 0) > 0 && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Recommendations</h3>
                    <Link href="/dashboard/recommendations" className="text-primary hover:text-primary/80 text-sm">
                      View all
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {(dashboardData?.recommendations || []).slice(0, 3).map((rec: any) => (
                      <div key={rec._id} className="border-l-4 border-primary pl-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">{rec.title}</h4>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded",
                            rec.priority === 'high' ? "bg-red-100 text-red-800" :
                            rec.priority === 'medium' ? "bg-yellow-100 text-yellow-800" :
                            "bg-green-100 text-green-800"
                          )}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Getting Started Guide - Show when no data */}
          {(!(dashboardData?.repositories?.length || 0) && !dashboardData?.resume && !(dashboardData?.recommendations?.length || 0)) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-medium text-blue-900 mb-4">Get Started with ReviewMe</h3>
              <p className="text-blue-700 mb-4">
                Start building your comprehensive professional profile by connecting your accounts and uploading your resume.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/dashboard/github" className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow">
                  <Github className="h-8 w-8 text-github mb-2" />
                  <h4 className="font-medium text-gray-900">Connect GitHub</h4>
                  <p className="text-sm text-gray-600">Analyze your coding profile and repositories</p>
                </Link>
                <Link href="/dashboard/linkedin" className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow">
                  <Linkedin className="h-8 w-8 text-linkedin mb-2" />
                  <h4 className="font-medium text-gray-900">Add LinkedIn</h4>
                  <p className="text-sm text-gray-600">Import your professional profile data</p>
                </Link>
                <Link href="/dashboard/resume" className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow">
                  <FileText className="h-8 w-8 text-green-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Upload Resume</h4>
                  <p className="text-sm text-gray-600">Get ATS compatibility analysis</p>
                </Link>
              </div>
            </div>
          )}
        </div>
        
        {/* Analytics Dashboard */}
        {showAnalytics && (
          <div className="px-4 py-6 sm:px-0">
            <AnalyticsDashboard className="mb-8" />
          </div>
        )}
      </main>
      
      {/* Credit Manager (handles notifications and referrals) */}
      <CreditManager />
    </div>
  );
}