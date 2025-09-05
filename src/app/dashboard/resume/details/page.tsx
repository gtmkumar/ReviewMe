'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  FileText, ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle,
  Calendar, CreditCard, TrendingUp, BarChart3, Eye, RefreshCw,
  Star, Users, Target, Award, ChevronDown, ChevronUp, Download,
  Upload, Briefcase, GraduationCap, Code
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DashboardNavigation } from '@/components/dashboard-navigation';

interface RequestHistoryItem {
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

interface ServiceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  lastRequestDate?: string;
}

export default function ResumeDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requestHistory, setRequestHistory] = useState<RequestHistoryItem[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [currentData, setCurrentData] = useState<any>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
    
    loadServiceDetails();
  }, [session, status, router]);

  const loadServiceDetails = async () => {
    try {
      setIsLoading(true);
      
      // Load request history
      const historyResponse = await fetch('/api/requests?serviceType=resume&limit=20');
      const historyData = await historyResponse.json();
      
      if (historyResponse.ok) {
        setRequestHistory(historyData.history);
      }
      
      // Load current cached data
      const cacheResponse = await fetch('/api/dashboard/cache');
      const cacheData = await cacheResponse.json();
      
      if (cacheResponse.ok && cacheData.data.resume) {
        setCurrentData(cacheData.data.resume);
        setServiceStats(cacheData.stats.resume);
      }
      
    } catch (error) {
      console.error('Error loading service details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRequestExpansion = (requestId: string) => {
    const newExpanded = new Set(expandedRequests);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedRequests(newExpanded);
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
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
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

  const getRequestDisplayName = (request: RequestHistoryItem) => {
    return request.requestPayload?.fileName || 'Resume Analysis';
  };

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
                <h1 className="text-3xl font-bold text-gray-900">Resume Analysis Details</h1>
                <p className="text-gray-600">Complete history and detailed analysis results</p>
              </div>
            </div>
          </div>

          {/* Current Data Overview */}
          {currentData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* File Summary */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Latest Resume</h2>
                {currentData.responseData && (
                  <div className="flex items-start space-x-6">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FileText className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {currentData.responseData.fileName}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {formatFileSize(currentData.responseData.fileSize)} • 
                        Analyzed {new Date(currentData.responseData.uploadDate || currentData.createdAt).toLocaleDateString()}
                      </p>
                      
                      {/* Resume Sections Status */}
                      <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">
                            {currentData.responseData.analysis?.keywords?.length || 0}
                          </div>
                          <div className="text-gray-500">Keywords</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">
                            {currentData.responseData.analysis?.strengths?.length || 0}
                          </div>
                          <div className="text-gray-500">Strengths</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">
                            {currentData.responseData.analysis?.suggestions?.length || 0}
                          </div>
                          <div className="text-gray-500">Suggestions</div>
                        </div>
                      </div>

                      {/* Section Completeness */}
                      {currentData.responseData.analysis?.sections && (
                        <div className="mt-4">
                          <div className="text-sm font-medium text-gray-700 mb-2">Resume Sections</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(currentData.responseData.analysis.sections).map(([section, hasSection]) => (
                              <span
                                key={section}
                                className={cn(
                                  "px-2 py-1 rounded-full text-xs font-medium capitalize",
                                  hasSection 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-red-100 text-red-800"
                                )}
                              >
                                {section} {hasSection ? '✓' : '✗'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Analysis Score */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">ATS Score</h2>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {currentData.analysisResults?.score || 0}
                  </div>
                  <div className="text-gray-500 mb-4">out of 100</div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full" 
                      style={{ width: `${currentData.analysisResults?.score || 0}%` }}
                    ></div>
                  </div>
                  
                  {/* Score Breakdown */}
                  <div className="mt-4 text-left">
                    <div className="text-sm text-gray-600 mb-2">Score Breakdown</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Content Quality</span>
                        <span className="font-medium">{Math.min(Math.round((currentData.analysisResults?.score || 0) * 0.4), 40)}/40</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Keywords</span>
                        <span className="font-medium">{Math.min(Math.round((currentData.analysisResults?.score || 0) * 0.3), 30)}/30</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Structure</span>
                        <span className="font-medium">{Math.min(Math.round((currentData.analysisResults?.score || 0) * 0.3), 30)}/30</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Statistics */}
          {serviceStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{serviceStats.totalRequests}</div>
                <div className="text-sm text-gray-500">Total Requests</div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{serviceStats.successfulRequests}</div>
                <div className="text-sm text-gray-500">Successful</div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{serviceStats.failedRequests}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {formatProcessingTime(serviceStats.averageProcessingTime)}
                </div>
                <div className="text-sm text-gray-500">Avg. Time</div>
              </div>
            </div>
          )}

          {/* Request History */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Request History</h2>
              <p className="text-sm text-gray-500 mt-1">
                Timeline of all resume analysis requests and their results
              </p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {requestHistory.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No request history found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload your first resume to see results here
                  </p>
                </div>
              ) : (
                requestHistory.map((request) => (
                  <div key={request._id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(request.status)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {getRequestDisplayName(request)}
                            </span>
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              getStatusColor(request.status)
                            )}>
                              {request.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CreditCard className="h-4 w-4" />
                              <span>{request.creditsDeducted} credits</span>
                            </div>
                            {request.requestPayload?.fileSize && (
                              <div className="flex items-center space-x-1">
                                <Upload className="h-4 w-4" />
                                <span>{formatFileSize(request.requestPayload.fileSize)}</span>
                              </div>
                            )}
                            {request.response && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{formatProcessingTime(request.response.processingTime)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleRequestExpansion(request._id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {expandedRequests.has(request._id) ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* Expanded Content */}
                    {expandedRequests.has(request._id) && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        {request.status === 'failed' && request.errorMessage && (
                          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-5 w-5 text-red-500" />
                              <span className="font-medium text-red-800">Error</span>
                            </div>
                            <p className="text-red-700 text-sm mt-1">{request.errorMessage}</p>
                          </div>
                        )}

                        {request.response && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Analysis Results */}
                            {request.response.analysisResults && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">Analysis Results</h4>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">ATS Score</span>
                                    <span className="font-semibold text-green-600">
                                      {request.response.analysisResults.score}/100
                                    </span>
                                  </div>
                                  
                                  {request.response.analysisResults.strengths?.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-green-700">Strengths:</span>
                                      <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                        {request.response.analysisResults.strengths.slice(0, 3).map((strength: string, index: number) => (
                                          <li key={index}>{strength}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {request.response.analysisResults.suggestions?.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-blue-700">Suggestions:</span>
                                      <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                        {request.response.analysisResults.suggestions.slice(0, 2).map((suggestion: string, index: number) => (
                                          <li key={index}>{suggestion}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* File Data */}
                            {request.response.responseData && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">File Information</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">File Name:</span>
                                    <span className="font-medium text-right max-w-48 truncate">{request.response.responseData.fileName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">File Size:</span>
                                    <span className="font-medium">{formatFileSize(request.response.responseData.fileSize)}</span>
                                  </div>
                                  {request.response.responseData.analysis?.keywords?.length && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Keywords Found:</span>
                                      <span className="font-medium">{request.response.responseData.analysis.keywords.length}</span>
                                    </div>
                                  )}
                                  {request.response.responseData.analysis?.sections && (
                                    <div>
                                      <span className="text-gray-600 block mb-1">Sections Found:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {Object.entries(request.response.responseData.analysis.sections).map(([section, hasSection]) => (
                                          <span
                                            key={section}
                                            className={cn(
                                              "px-2 py-1 rounded text-xs capitalize",
                                              hasSection ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                            )}
                                          >
                                            {section}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Keywords Preview */}
                                  {request.response.responseData.analysis?.keywords?.length > 0 && (
                                    <div>
                                      <span className="text-gray-600 block mb-1">Top Keywords:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {request.response.responseData.analysis.keywords.slice(0, 5).map((keyword: string, index: number) => (
                                          <span
                                            key={index}
                                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                          >
                                            {keyword}
                                          </span>
                                        ))}
                                        {request.response.responseData.analysis.keywords.length > 5 && (
                                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                            +{request.response.responseData.analysis.keywords.length - 5} more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}