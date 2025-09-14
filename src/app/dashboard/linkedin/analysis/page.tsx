'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { 
  Linkedin, 
  Search, 
  RefreshCw, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Calendar,
  TrendingUp,
  Award,
  Users,
  ArrowLeft,
  Gift,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LinkedInAnalysisData {
  username: string;
  profileUrl: string;
  analysis: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    score: number;
    sections: Record<string, string>;
  };
  rawMarkdown: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

interface AnalysisResult {
  success: boolean;
  data?: LinkedInAnalysisData;
  error?: string;
  requestId?: string;
  creditsUsed?: number;
  remainingCredits?: number;
}

interface AnalysisHistoryItem {
  _id: string;
  requestPayload: {
    profileUrl: string;
    username?: string;
  };
  status: string;
  createdAt: string;
  response?: {
    responseData: LinkedInAnalysisData;
    analysisResults: {
      score: number;
      strengths: string[];
      weaknesses: string[];
      suggestions: string[];
    };
  };
}

export default function LinkedInAnalysisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profileUrl, setProfileUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<LinkedInAnalysisData | null>(null);
  const [error, setError] = useState('');
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [savedProfileData, setSavedProfileData] = useState<any>(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [dataSource, setDataSource] = useState<'saved' | 'fresh' | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
    
    loadUserCredits();
    loadAnalysisHistory();
    loadSavedProfileData(); // Load saved profile data by default
  }, [session, status, router]);

  // Load saved LinkedIn profile data from database
  const loadSavedProfileData = async (username?: string) => {
    try {
      const url = username 
        ? `/api/linkedin/profile?username=${encodeURIComponent(username)}`
        : '/api/linkedin/profile';
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSavedProfileData(data.data);
          setCurrentUsername(data.data.username);
          setDataSource('saved'); // Indicate this is saved data
          
          // Set profile URL if we have the data
          if (data.data.profileData?.profileUrl) {
            setProfileUrl(data.data.profileData.profileUrl);
          }
          
          // Auto-populate analysis result with saved data
          if (data.data.profileData && data.data.analysisResults) {
            setAnalysisResult({
              username: data.data.username,
              profileUrl: data.data.profileData.profileUrl || '',
              analysis: {
                summary: 'Profile analysis based on saved data',
                score: data.data.analysisResults.score || 0,
                strengths: data.data.analysisResults.strengths || [],
                weaknesses: data.data.analysisResults.weaknesses || [],
                suggestions: data.data.analysisResults.suggestions || [],
                sections: {}
              },
              rawMarkdown: '',
              score: data.data.analysisResults.score || 0,
              strengths: data.data.analysisResults.strengths || [],
              weaknesses: data.data.analysisResults.weaknesses || [],
              suggestions: data.data.analysisResults.suggestions || []
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved profile data:', error);
      // Don't show error to user, just means no saved data exists
    }
  };

  // Detect username change and load different profile data
  const extractUsernameFromUrl = (url: string): string => {
    const match = url.match(/linkedin\.com\/in\/([^\/?]+)/);
    return match ? match[1] : '';
  };

  // Handle profile URL change
  const handleProfileUrlChange = (newUrl: string) => {
    setProfileUrl(newUrl);
    
    const newUsername = extractUsernameFromUrl(newUrl);
    if (newUsername && newUsername !== currentUsername) {
      // Username changed, load different profile data
      loadSavedProfileData(newUsername);
    }
  };

  const loadUserCredits = async () => {
    try {
      const response = await fetch('/api/credits');
      const data = await response.json();
      setCredits(data.credits);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const loadAnalysisHistory = async () => {
    try {
      const response = await fetch('/api/linkedin/analysis?limit=10');
      if (response.ok) {
        const data = await response.json();
        setAnalysisHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading analysis history:', error);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileUrl.trim()) {
      setError('Please enter a LinkedIn profile URL');
      return;
    }

    // Basic LinkedIn URL validation
    if (!profileUrl.includes('linkedin.com/in/')) {
      setError('Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)');
      return;
    }

    setIsLoading(true);
    setError('');
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/linkedin/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileUrl: profileUrl.trim()
        }),
      });

      const result: AnalysisResult = await response.json();

      if (result.success && result.data) {
        setAnalysisResult(result.data);
        setCredits(result.remainingCredits || credits);
        setDataSource('fresh'); // Indicate this is fresh analysis data
        setShowSuccessNotification(true);
        setTimeout(() => setShowSuccessNotification(false), 5000);
        
        // Reload history to show new analysis
        loadAnalysisHistory();
      } else {
        setError(result.error || 'Analysis failed');
        if (result.error?.includes('credits')) {
          setShowInsufficientCreditsModal(true);
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError('Failed to analyze LinkedIn profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard/linkedin"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </Link>
                <Linkedin className="h-8 w-8 text-linkedin" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">LinkedIn Profile Analysis</h1>
                  {/* <p className="text-gray-600">Powered by RedactAI - Advanced LinkedIn Profile Review</p> */}
                  <p className="text-gray-600">Advanced LinkedIn Profile Analysis</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Credit Display */}
                <div className="flex items-center space-x-2 px-4 py-2 rounded-lg border bg-green-50 border-green-200 text-green-700">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">{credits} credits</span>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Analyze LinkedIn Profile</h2>
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label htmlFor="profileUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn Profile URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Linkedin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    id="profileUrl"
                    value={profileUrl}
                    onChange={(e) => handleProfileUrlChange(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-linkedin focus:border-linkedin text-lg"
                    placeholder="https://linkedin.com/in/your-username"
                    required
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Enter the full LinkedIn profile URL. The analysis will extract insights and provide optimization recommendations.
                </p>
              </div>
              
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-linkedin text-white rounded-md hover:bg-linkedin/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Analyzing Profile...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span>Analyze Profile (15 credits)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Success Notification */}
          {showSuccessNotification && (
            <div className="fixed top-4 right-4 z-50 max-w-sm bg-white border border-green-200 rounded-lg shadow-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Analysis Complete!</p>
                  <p className="text-xs text-gray-600">LinkedIn profile analyzed successfully</p>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Result */}
          {analysisResult && (
            <div className="space-y-8">
              
              {/* Data Source Indicator */}
              {dataSource && (
                <div className={`p-4 rounded-lg border ${dataSource === 'saved' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center space-x-2">
                    {dataSource === 'saved' ? (
                      <>
                        <Eye className="h-5 w-5 text-blue-600" />
                        <span className="text-blue-800 font-medium">Viewing Saved Profile Data</span>
                        <span className="text-blue-600 text-sm">Last updated: {savedProfileData?.lastUpdated ? new Date(savedProfileData.lastUpdated).toLocaleDateString() : 'Unknown'}</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-5 w-5 text-green-600" />
                        <span className="text-green-800 font-medium">Fresh Analysis Data</span>
                        <span className="text-green-600 text-sm">Just analyzed</span>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Profile Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Profile Info */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="w-16 h-16 bg-linkedin/10 rounded-full flex items-center justify-center">
                      <Linkedin className="h-8 w-8 text-linkedin" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">@{analysisResult.username}</h2>
                        <a
                          href={analysisResult.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-linkedin hover:text-linkedin/80 transition-colors"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </div>
                      <p className="text-gray-600 mb-4">LinkedIn Profile Analysis</p>
                      {analysisResult.analysis.summary && (
                        <p className="text-gray-700">{analysisResult.analysis.summary}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Score */}
                <div className={cn("bg-white rounded-lg shadow p-6 border-l-4", getScoreBgColor(analysisResult.score))}>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <Award className="h-8 w-8 text-linkedin" />
                    </div>
                    <div className={cn("text-4xl font-bold mb-2", getScoreColor(analysisResult.score))}>
                      {analysisResult.score}
                    </div>
                    <p className="text-gray-600 text-sm">LinkedIn Score</p>
                  </div>
                </div>
              </div>

              {/* Strengths, Weaknesses, Suggestions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Strengths */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                    <h3 className="text-lg font-medium text-green-800 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Strengths
                    </h3>
                  </div>
                  <div className="p-6">
                    {analysisResult.strengths.length > 0 ? (
                      <ul className="space-y-2">
                        {analysisResult.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">No specific strengths identified</p>
                    )}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                    <h3 className="text-lg font-medium text-red-800 flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Areas for Improvement
                    </h3>
                  </div>
                  <div className="p-6">
                    {analysisResult.weaknesses.length > 0 ? (
                      <ul className="space-y-2">
                        {analysisResult.weaknesses.map((weakness, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">No specific weaknesses identified</p>
                    )}
                  </div>
                </div>

                {/* Suggestions */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                    <h3 className="text-lg font-medium text-blue-800 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Recommendations
                    </h3>
                  </div>
                  <div className="p-6">
                    {analysisResult.suggestions.length > 0 ? (
                      <ul className="space-y-2">
                        {analysisResult.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">No specific recommendations provided</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Analysis Sections */}
              {analysisResult.analysis.sections && Object.keys(analysisResult.analysis.sections).length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Detailed Analysis</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {Object.entries(analysisResult.analysis.sections).map(([sectionName, content]) => (
                      <div key={sectionName}>
                        <h4 className="font-medium text-gray-900 mb-2 capitalize">
                          {sectionName.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-gray-700 text-sm leading-relaxed">{content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analysis History */}
          {analysisHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow mt-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Recent Analyses
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {analysisHistory.slice(0, 5).map((item) => (
                  <div key={item._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-linkedin/10 rounded-full flex items-center justify-center">
                          <Linkedin className="h-5 w-5 text-linkedin" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              @{item.requestPayload.username || 'profile'}
                            </span>
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              item.status === 'completed' 
                                ? "bg-green-100 text-green-800"
                                : item.status === 'failed'
                                ? "bg-red-100 text-red-800" 
                                : "bg-yellow-100 text-yellow-800"
                            )}>
                              {item.status}
                            </span>
                            {item.response?.analysisResults && (
                              <span className={cn(
                                "text-sm font-medium",
                                getScoreColor(item.response.analysisResults.score)
                              )}>
                                Score: {item.response.analysisResults.score}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span>{new Date(item.createdAt).toLocaleString()}</span>
                            <a 
                              href={item.requestPayload.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-linkedin hover:text-linkedin/80 flex items-center space-x-1"
                            >
                              <span>View Profile</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/linkedin/details?requestId=${item._id}`}
                          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View Details</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insufficient Credits Modal */}
          {showInsufficientCreditsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Insufficient Credits</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  You need 15 credits to analyze a LinkedIn profile. You currently have {credits} credits.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowInsufficientCreditsModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowInsufficientCreditsModal(false);
                      if (window.showReferralModal) {
                        window.showReferralModal();
                      }
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-linkedin text-white rounded-md hover:bg-linkedin/90 transition-colors"
                  >
                    <Gift className="h-4 w-4" />
                    <span>Earn Credits</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}