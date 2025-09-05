'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle,
  Calendar, CreditCard, Download, Eye, RefreshCw, Upload,
  Search, Filter, ChevronDown, BarChart3, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardNavigation } from '@/components/dashboard-navigation';

interface ResumeHistoryItem {
  _id: string;
  requestPayload: any;
  creditsDeducted: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  response?: {
    responseData: any;
    analysisResults: any;
    processingTime: number;
    createdAt: string;
  };
}

export default function ResumeHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [history, setHistory] = useState<ResumeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score'>('newest');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
    
    loadHistory();
  }, [session, status, router]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/requests?serviceType=resume&limit=50');
      const data = await response.json();
      
      if (response.ok) {
        setHistory(data.history || []);
      } else {
        setError(data.error || 'Failed to load history');
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setError('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRequestDisplayName = (request: ResumeHistoryItem) => {
    if (request.requestPayload?.fileName) {
      return request.requestPayload.fileName;
    } else if (request.response?.responseData?.fileName) {
      return request.response.responseData.fileName;
    }
    return 'Resume Analysis';
  };

  const getScoreFromRequest = (request: ResumeHistoryItem): number => {
    return request.response?.analysisResults?.score || 0;
  };

  const getFileTypeIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return <FileText className="h-4 w-4" />;
  };

  // Filter and sort history
  const filteredHistory = history
    .filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchTerm) {
        const displayName = getRequestDisplayName(item).toLowerCase();
        return displayName.includes(searchTerm.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'score':
          return getScoreFromRequest(b) - getScoreFromRequest(a);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  if (status === 'loading' || isLoading) {
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
            <div className="flex items-center space-x-4 mb-4">
              <Link 
                href="/dashboard/resume"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <FileText className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Resume Analysis History</h1>
                <p className="text-gray-600">View all your past resume analyses and ATS scores</p>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by filename..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="processing">Processing</option>
                    <option value="pending">Pending</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Sort */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="score">Highest Score</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredHistory.length} of {history.length} analyses
            </div>
          </div>

          {/* History Cards */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {filteredHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No matches found' : 'No history yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Start by uploading your first resume for analysis'
                }
              </p>
              <Link 
                href="/dashboard/resume"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Resume</span>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredHistory.map((item) => (
                <div key={item._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {getStatusIcon(item.status)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex items-center space-x-2">
                              {getFileTypeIcon(getRequestDisplayName(item))}
                              <h3 className="text-lg font-medium text-gray-900">
                                {getRequestDisplayName(item)}
                              </h3>
                            </div>
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium border",
                              getStatusColor(item.status)
                            )}>
                              {item.status}
                            </span>
                            {item.status === 'completed' && item.response?.analysisResults?.score && (
                              <div className="flex items-center space-x-1 text-green-600">
                                <BarChart3 className="h-4 w-4" />
                                <span className="font-semibold">{item.response.analysisResults.score}/100</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(item.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CreditCard className="h-4 w-4" />
                              <span>{item.creditsDeducted} credits</span>
                            </div>
                            {item.response?.responseData?.fileSize && (
                              <div className="flex items-center space-x-1">
                                <Download className="h-4 w-4" />
                                <span>{formatFileSize(item.response.responseData.fileSize)}</span>
                              </div>
                            )}
                            {item.response && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{formatProcessingTime(item.response.processingTime)}</span>
                              </div>
                            )}
                          </div>

                          {/* Error Message */}
                          {item.status === 'failed' && item.errorMessage && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-red-700 text-sm">{item.errorMessage}</p>
                            </div>
                          )}

                          {/* Analysis Summary */}
                          {item.status === 'completed' && item.response?.analysisResults && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {item.response.analysisResults.strengths?.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-green-700 mb-1">Top Strengths</h4>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                      {item.response.analysisResults.strengths.slice(0, 2).map((strength: string, index: number) => (
                                        <li key={index} className="flex items-start">
                                          <span className="text-green-500 mr-1">•</span>
                                          {strength}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {item.response.analysisResults.suggestions?.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-blue-700 mb-1">Key Suggestions</h4>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                      {item.response.analysisResults.suggestions.slice(0, 2).map((suggestion: string, index: number) => (
                                        <li key={index} className="flex items-start">
                                          <span className="text-blue-500 mr-1">•</span>
                                          {suggestion}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {item.response.analysisResults.keywords?.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Keywords Found</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {item.response.analysisResults.keywords.slice(0, 4).map((keyword: string, index: number) => (
                                        <span 
                                          key={index}
                                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                        >
                                          {keyword}
                                        </span>
                                      ))}
                                      {item.response.analysisResults.keywords.length > 4 && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                          +{item.response.analysisResults.keywords.length - 4} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/resume/details?requestId=${item._id}`}
                          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View Details</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}