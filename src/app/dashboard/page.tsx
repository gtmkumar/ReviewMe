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
  ChevronDown, ChevronUp, Clock, Minus, X, MapPin, Briefcase,
  Code, Activity, Layers, Book, Building, ExternalLink, 
  TrendingDown, GraduationCap, Mail, Phone, Lightbulb,
  CheckSquare, AlertTriangle, Info
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
        totalStars?: number;
        totalForks?: number;
        languages?: { [key: string]: number };
        profileData?: any;
        suggestions?: string[];
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
        experience?: any[];
        education?: any[];
        skills?: string[];
        profileData?: any;
        strengths?: string[];
        weaknesses?: string[];
        suggestions?: string[];
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
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  
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
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
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

  // Enhanced data for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Linkedin className="h-8 w-8 text-linkedin" />
                    <h3 className="text-xl font-semibold text-gray-900">LinkedIn Profile</h3>
                  </div>
                  <Link href="/dashboard/linkedin" className="text-linkedin hover:text-linkedin/80 transition-colors">
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
                
                {platforms.linkedin.connected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Profile Score</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-semibold text-linkedin">{platforms.linkedin.score}/100</span>
                        {platforms.linkedin.lastUpdated && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Data is fresh"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{platforms.linkedin.name}</span>
                      </div>
                      {platforms.linkedin.headline && (
                        <div className="flex items-start justify-between">
                          <span className="text-gray-600">Headline:</span>
                          <span className="font-medium text-right text-xs max-w-32 truncate">{platforms.linkedin.headline}</span>
                        </div>
                      )}
                      {platforms.linkedin.connectionCount && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Connections:</span>
                          <span className="font-medium">{platforms.linkedin.connectionCount}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-linkedin h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${platforms.linkedin.score}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Linkedin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-3">
                      Analyze your LinkedIn profile for professional optimization
                    </p>
                    <Link href="/dashboard/linkedin" className="flex items-center justify-center space-x-2 text-linkedin text-sm font-medium hover:text-linkedin/80 transition-colors">
                      <Plus className="h-4 w-4" />
                      <span>Add LinkedIn Profile</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Resume Section */}
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-green-600" />
                    <h3 className="text-xl font-semibold text-gray-900">Resume Analysis</h3>
                  </div>
                  <Link href="/dashboard/resume" className="text-green-600 hover:text-green-500 transition-colors">
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
                
                {platforms.resume.uploaded ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">ATS Score</span>
                      <span className="text-lg font-semibold text-green-600">{platforms.resume.score}/100</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">File:</span>
                        <span className="font-medium">{platforms.resume.fileName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Uploaded:</span>
                        <span className="font-medium">
                          {platforms.resume.uploadedAt ? new Date(platforms.resume.uploadedAt).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${platforms.resume.score}%` }}
                      ></div>
                    </div>
                    
                    <button
                      onClick={() => toggleSection('resume-details')}
                      className="w-full flex items-center justify-between py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <span>View Analysis</span>
                      {expandedSections['resume-details'] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    
                    {expandedSections['resume-details'] && (
                      <div className="space-y-3 border-t pt-4">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-green-50 p-2 rounded">
                            <div className="font-medium text-green-800">Strengths</div>
                            <div className="text-green-600">ATS Compatible</div>
                          </div>
                          <div className="bg-yellow-50 p-2 rounded">
                            <div className="font-medium text-yellow-800">Suggestions</div>
                            <div className="text-yellow-600">Add more keywords</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-3">
                      Upload your resume for ATS compatibility analysis
                    </p>
                    <Link href="/dashboard/resume" className="flex items-center justify-center space-x-2 text-green-600 text-sm font-medium hover:text-green-500 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>Upload Resume</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comprehensive Analytics Dashboard */}
          <div className="space-y-8 mb-8">
            
            {/* Professional Summary Cards */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Professional Summary</h3>
                <button
                  onClick={() => toggleSection('professional-summary')}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <span>Details</span>
                  {expandedSections['professional-summary'] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-github">
                    {platforms.github.publicRepos || 0}
                  </div>
                  <div className="text-sm text-gray-600">Projects</div>
                  <div className="mt-1">
                    <Code className="h-4 w-4 text-github mx-auto" />
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-linkedin">
                    {platforms.linkedin.connectionCount || 0}
                  </div>
                  <div className="text-sm text-gray-600">Connections</div>
                  <div className="mt-1">
                    <Users className="h-4 w-4 text-linkedin mx-auto" />
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {platforms.linkedin.experience?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Experience</div>
                  <div className="mt-1">
                    <Briefcase className="h-4 w-4 text-green-600 mx-auto" />
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {platforms.linkedin.skills?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Skills</div>
                  <div className="mt-1">
                    <Award className="h-4 w-4 text-purple-600 mx-auto" />
                  </div>
                </div>
              </div>
              
              {expandedSections['professional-summary'] && (
                <div className="mt-6 pt-6 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Technical Profile</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">GitHub Score:</span>
                          <span className="font-medium">{platforms.github.score}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Stars:</span>
                          <span className="font-medium">{platforms.github.totalStars || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Followers:</span>
                          <span className="font-medium">{platforms.github.followers || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Professional Profile</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">LinkedIn Score:</span>
                          <span className="font-medium">{platforms.linkedin.score}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Resume Score:</span>
                          <span className="font-medium">{platforms.resume.score}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Education:</span>
                          <span className="font-medium">{platforms.linkedin.education?.length || 0} degrees</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LinkedIn Detailed Analysis */}
            {platforms.linkedin.connected && ((platforms.linkedin.strengths?.length || 0) > 0 || (platforms.linkedin.weaknesses?.length || 0) > 0) && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">LinkedIn Profile Analysis</h3>
                  <button
                    onClick={() => toggleSection('linkedin-analysis')}
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <span>Details</span>
                    {expandedSections['linkedin-analysis'] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  {platforms.linkedin.strengths && platforms.linkedin.strengths.length > 0 && (
                    <div>
                      <h4 className="flex items-center space-x-2 font-medium text-green-700 mb-3">
                        <CheckCircle className="h-5 w-5" />
                        <span>Strengths</span>
                      </h4>
                      <div className="space-y-2">
                        {platforms.linkedin.strengths.map((strength, index) => (
                          <div key={index} className="flex items-start space-x-3 p-2 bg-green-50 rounded">
                            <CheckSquare className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-green-800">{strength}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Weaknesses */}
                  {platforms.linkedin.weaknesses && platforms.linkedin.weaknesses.length > 0 && (
                    <div>
                      <h4 className="flex items-center space-x-2 font-medium text-yellow-700 mb-3">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Areas for Improvement</span>
                      </h4>
                      <div className="space-y-2">
                        {platforms.linkedin.weaknesses.map((weakness, index) => (
                          <div key={index} className="flex items-start space-x-3 p-2 bg-yellow-50 rounded">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-yellow-800">{weakness}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {expandedSections['linkedin-analysis'] && platforms.linkedin.suggestions && platforms.linkedin.suggestions.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="flex items-center space-x-2 font-medium text-blue-700 mb-3">
                      <Lightbulb className="h-5 w-5" />
                      <span>Detailed Recommendations</span>
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {platforms.linkedin.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-blue-800">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Score Breakdown Pie Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Profile Score Distribution</h3>
                  <button
                    onClick={() => toggleSection('score-breakdown')}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {expandedSections['score-breakdown'] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'GitHub', value: platforms.github.score, color: '#24292e' },
                          { name: 'LinkedIn', value: platforms.linkedin.score, color: '#0077b5' },
                          { name: 'Resume', value: platforms.resume.score, color: '#10B981' },
                          { name: 'Blogs', value: platforms.blogs.score, color: '#8B5CF6' }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: 'GitHub', value: platforms.github.score, color: '#24292e' },
                          { name: 'LinkedIn', value: platforms.linkedin.score, color: '#0077b5' },
                          { name: 'Resume', value: platforms.resume.score, color: '#10B981' },
                          { name: 'Blogs', value: platforms.blogs.score, color: '#8B5CF6' }
                        ].filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {expandedSections['score-breakdown'] && (
                  <div className="mt-4 space-y-2">
                    {[
                      { name: 'GitHub', value: platforms.github.score, color: '#24292e', connected: platforms.github.connected },
                      { name: 'LinkedIn', value: platforms.linkedin.score, color: '#0077b5', connected: platforms.linkedin.connected },
                      { name: 'Resume', value: platforms.resume.score, color: '#10B981', connected: platforms.resume.uploaded },
                      { name: 'Blogs', value: platforms.blogs.score, color: '#8B5CF6', connected: platforms.blogs.connected }
                    ].map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-sm text-gray-700">{item.name}</span>
                          {!item.connected && (
                            <span className="text-xs text-gray-400">(Not connected)</span>
                          )}
                        </div>
                        <span className="text-sm font-medium">{item.value}/100</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Improvement Suggestions */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Improvement Suggestions</h3>
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                </div>
                
                <div className="space-y-4">
                  {!platforms.github.connected && (
                    <div className="flex items-start space-x-3 p-3 bg-github/5 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-github flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-github">Connect GitHub</h4>
                        <p className="text-xs text-gray-600">Showcase your coding projects and technical skills</p>
                        <Link href="/dashboard/github" className="text-xs text-github hover:underline">Connect now →</Link>
                      </div>
                    </div>
                  )}
                  
                  {/* GitHub Specific Suggestions */}
                  {platforms.github.connected && platforms.github.suggestions && platforms.github.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-github mb-2">GitHub Improvements</h4>
                      {platforms.github.suggestions.slice(0, 3).map((suggestion, index) => (
                        <div key={index} className="flex items-start space-x-3 p-2 bg-github/5 rounded">
                          <Lightbulb className="h-4 w-4 text-github flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-700">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!platforms.linkedin.connected && (
                    <div className="flex items-start space-x-3 p-3 bg-linkedin/5 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-linkedin flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-linkedin">Analyze LinkedIn</h4>
                        <p className="text-xs text-gray-600">Optimize your professional profile and network</p>
                        <Link href="/dashboard/linkedin" className="text-xs text-linkedin hover:underline">Analyze now →</Link>
                      </div>
                    </div>
                  )}
                  
                  {/* LinkedIn Specific Suggestions */}
                  {platforms.linkedin.connected && platforms.linkedin.suggestions && platforms.linkedin.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-linkedin mb-2">LinkedIn Improvements</h4>
                      {platforms.linkedin.suggestions.slice(0, 3).map((suggestion, index) => (
                        <div key={index} className="flex items-start space-x-3 p-2 bg-linkedin/5 rounded">
                          <Lightbulb className="h-4 w-4 text-linkedin flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-700">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!platforms.resume.uploaded && (
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-green-600">Upload Resume</h4>
                        <p className="text-xs text-gray-600">Get ATS compatibility analysis and improvement tips</p>
                        <Link href="/dashboard/resume" className="text-xs text-green-600 hover:underline">Upload now →</Link>
                      </div>
                    </div>
                  )}
                  
                  {(platforms.github.connected || platforms.linkedin.connected || platforms.resume.uploaded) && (
                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-600">Keep Profiles Updated</h4>
                        <p className="text-xs text-gray-600">Regular updates help maintain high scores and relevance</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Language Distribution Chart for GitHub */}
          {platforms.github.connected && platforms.github.languages && Object.keys(platforms.github.languages).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Programming Languages</h3>
                <button
                  onClick={() => toggleSection('language-breakdown')}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {expandedSections['language-breakdown'] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(platforms.github.languages || {}).map(([language, count]) => ({
                    name: language,
                    repositories: count,
                    color: COLORS[Object.keys(platforms.github.languages || {}).indexOf(language) % COLORS.length]
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="repositories" fill="#24292e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {expandedSections['language-breakdown'] && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(platforms.github.languages || {}).map(([language, count]) => (
                    <div key={language} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-700">{language}</span>
                      <span className="text-sm text-gray-600">{count} repo{count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* GitHub Repositories */}
            {(dashboardData?.data?.platforms?.github?.repositories?.length || 0) > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Top Repositories</h3>
                  <Link href="/dashboard/github" className="text-primary hover:text-primary/80 text-sm">
                    View all
                  </Link>
                </div>
                <div className="space-y-4">
                  {(dashboardData?.data?.platforms?.github?.repositories || []).slice(0, 5).map((repo: any) => (
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
            {(dashboardData?.data?.recommendations?.length || 0) > 0 && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Recommendations</h3>
                    <Link href="/dashboard/recommendations" className="text-primary hover:text-primary/80 text-sm">
                      View all
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {(dashboardData?.data?.recommendations || []).slice(0, 3).map((rec: any) => (
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
          {(!(dashboardData?.data?.platforms?.github?.repositories?.length || 0) && !dashboardData?.data?.platforms?.resume?.uploaded && !(dashboardData?.data?.recommendations?.length || 0)) && (
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