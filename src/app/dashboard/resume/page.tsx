'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, Upload, RefreshCw, CheckCircle, AlertCircle, 
  Download, Eye, Trash2, Award, TrendingUp, Target,
  User, Briefcase, GraduationCap, Code, Star, 
  AlertTriangle, Info, ExternalLink, CreditCard, History, Gift,
  BarChart3
} from 'lucide-react';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { cn } from '@/lib/utils';
import { CreditManager } from '@/components/credit-manager';

// Global type declaration for window function
declare global {
  interface Window {
    showReferralModal?: () => void;
  }
}

interface ResumeAnalysis {
  fileName: string;
  fileSize: number;
  uploadDate: string;
  score: number;
  feedback: string[];
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  detailedFeedback: string[];
  status: string;
  requestId?: string;
  isUsingFallback?: boolean;
  message?: string;
}

export default function ResumePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState('');
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [credits, setCredits] = useState(0);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [showTransactionSummary, setShowTransactionSummary] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
    
    // Load user credits and existing analysis
    loadUserCredits();
    loadExistingAnalysis();
  }, [session, status, router]);

  const loadUserCredits = async () => {
    try {
      const response = await fetch('/api/credits');
      const data = await response.json();
      if (response.ok) {
        setCredits(data.credits);
        setShowCreditWarning(data.isLowCredits);
      }
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const loadExistingAnalysis = async () => {
    try {
      const response = await fetch('/api/resume/analysis');
      const data = await response.json();
      
      if (response.ok && data.hasAnalysis) {
        setResumeAnalysis({
          fileName: data.data.fileName,
          fileSize: data.data.fileSize,
          uploadDate: data.data.uploadedAt,
          score: data.data.score,
          feedback: data.data.feedback,
          suggestions: data.data.suggestions,
          strengths: data.data.strengths,
          weaknesses: data.data.weaknesses,
          detailedFeedback: data.data.detailedFeedback,
          status: data.data.status,
          requestId: data.data.requestId,
          isUsingFallback: data.data.isUsingFallback,
          message: data.data.message
        });
      }
    } catch (error) {
      console.error('Error loading existing analysis:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setError('');
    setIsUploading(true);

    // Validate file type - only PDF for external API
    const allowedTypes = ['application/pdf'];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF file. Only PDF files are supported for detailed analysis.');
      setIsUploading(false);
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      setIsUploading(false);
      return;
    }

    try {
      // Check credits before processing
      const creditCheckResponse = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          serviceType: 'resume'
        })
      });

      const creditCheckData = await creditCheckResponse.json();
      
      if (!creditCheckResponse.ok) {
        throw new Error(creditCheckData.error || 'Failed to check credits');
      }

      const requiredCredits = creditCheckData.costs.resume;
      if (creditCheckData.credits < requiredCredits) {
        setError(`Insufficient credits. You have ${creditCheckData.credits} credits but need ${requiredCredits}.`);
        setShowInsufficientCreditsModal(true);
        setShowCreditWarning(true);
        return;
      }

      const startTime = Date.now();
      
      setUploadedFile(file);
      
      // Upload file to our enhanced API
      const formData = new FormData();
      formData.append('resume', file);
      
      const uploadResponse = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();
      
      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      // Set the analysis data from the response
      const resumeData: ResumeAnalysis = {
        fileName: uploadData.data.fileName,
        fileSize: uploadData.data.fileSize,
        uploadDate: new Date().toISOString(),
        score: uploadData.data.analysis.score,
        feedback: uploadData.data.analysis.feedback,
        suggestions: uploadData.data.analysis.suggestions,
        strengths: uploadData.data.analysis.strengths,
        weaknesses: uploadData.data.analysis.weaknesses,
        detailedFeedback: uploadData.data.analysis.feedback,
        status: uploadData.data.status,
        requestId: uploadData.data.requestId,
        isUsingFallback: uploadData.data.analysis.isUsingFallback,
        message: uploadData.data.message
      };

      setResumeAnalysis(resumeData);
      setRequestId(uploadData.data.requestId);
      
      const processingTime = Date.now() - startTime;
      
      // Update credits display
      await loadUserCredits();
      
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process resume. Please try again.';
      setError(errorMessage);
      setResumeAnalysis(null);
      setUploadedFile(null);
      
      console.error('Resume service error:', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setResumeAnalysis(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardNavigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-green-600" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resume Analysis</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Create Resume Button */}
                <Link 
                  href="/dashboard/resume/create"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <FileText className="h-4 w-4" />
                  <span>Create Resume</span>
                </Link>
                
                {/* History Button */}
                <Link 
                  href="/dashboard/resume/history"
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <History className="h-4 w-4" />
                  <span>View History</span>
                </Link>
                
                {/* Credit Display */}
                <div className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg border",
                  showCreditWarning
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-green-50 border-green-200 text-green-700"
                )}>
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">{credits} credits</span>
                </div>
                {requestId && (
                  <div className="text-xs text-gray-500">
                    Request: {requestId.slice(-8)}
                  </div>
                )}
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
              Upload your resume for professional AI-powered analysis and recommendations. Only PDF files are supported for detailed analysis.
            </p>
          </div>

          {/* Upload Section */}
          {!resumeAnalysis && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6 mb-8">
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-gray-400',
                  isUploading && 'opacity-50 pointer-events-none'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <RefreshCw className="h-12 w-12 text-primary animate-spin mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white">Processing Resume...</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Extracting text and analyzing content</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Drop your resume here or click to browse
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Supports PDF files up to 10MB for detailed professional analysis
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-primary"
                    >
                      Choose File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                      {showInsufficientCreditsModal && (
                        <button 
                          onClick={() => {
                            if (typeof window !== 'undefined' && window.showReferralModal) {
                              window.showReferralModal();
                            }
                            setShowInsufficientCreditsModal(false);
                          }}
                          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm inline-flex items-center space-x-2"
                        >
                          <Gift className="h-4 w-4" />
                          <span>Earn 200 Credits - Refer Friends</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {showTransactionSummary && transactionDetails && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-md">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="ml-3 flex-1">
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                        Analysis Complete - Credit Transaction Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm text-green-700 dark:text-green-400">
                        <div>
                          <span className="font-medium">Service:</span> Resume Analysis
                        </div>
                        <div>
                          <span className="font-medium">Credits Used:</span> {transactionDetails.amount}
                        </div>
                        <div>
                          <span className="font-medium">Remaining Credits:</span> {credits}
                        </div>
                        <div>
                          <span className="font-medium">Transaction ID:</span> {transactionDetails.id.slice(-8)}
                        </div>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        {transactionDetails.description} • {new Date(transactionDetails.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="mt-6 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Tips for better analysis:</h3>
                    <ul className="mt-2 text-sm text-blue-700 dark:text-blue-400 list-disc list-inside space-y-1">
                      <li>Upload only PDF files for the most accurate analysis</li>
                      <li>Ensure your resume includes contact information, summary, experience, education, and skills</li>
                      <li>Use standard section headers (Experience, Education, Skills, etc.)</li>
                      <li>Include relevant keywords for your industry</li>
                      <li>Keep formatting simple and professional</li>
                      <li>Proofread for grammar and spelling before uploading</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {resumeAnalysis && (
            <div className="space-y-8">
                            
              {/* Fallback Service Notification */}
              {resumeAnalysis.isUsingFallback && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-amber-800">Basic Analysis Provided</h3>
                      <p className="mt-1 text-sm text-amber-700">
                        {resumeAnalysis.message || 'The external review service is temporarily unavailable. We\'ve provided a basic analysis to help you get started.'}
                      </p>
                      <p className="mt-2 text-xs text-amber-600">
                        For a more detailed professional analysis, please try uploading again later when the external service is available.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* File Info & Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{resumeAnalysis.fileName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatFileSize(resumeAnalysis.fileSize)} • 
                        Uploaded {new Date(resumeAnalysis.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {/* View extracted text */}}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Text</span>
                    </button>
                    <button
                      onClick={handleRemoveFile}
                      className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Score & Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Score Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <Award className="h-8 w-8 text-yellow-500" />
                  </div>
                  <div className={cn(
                    "text-4xl font-bold mb-2",
                    resumeAnalysis.score >= 80 ? "text-green-600" :
                    resumeAnalysis.score >= 60 ? "text-blue-600" :
                    resumeAnalysis.score >= 40 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {resumeAnalysis.score}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Resume Score</p>
                  
                  <div className="mt-4 text-left">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Analysis Status</div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Status</span>
                        <span className={cn(
                          "text-sm font-medium",
                          resumeAnalysis.status === 'completed' ? "text-green-600" : "text-yellow-600"
                        )}>
                          {resumeAnalysis.status === 'completed' ? 'Completed' : resumeAnalysis.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Feedback Items</span>
                        <span className="text-sm font-medium">{resumeAnalysis.feedback.length}</span>
                      </div>
                      {resumeAnalysis.requestId && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Request ID</span>
                          <span className="text-xs text-gray-500">{resumeAnalysis.requestId.slice(-8)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Strengths</h3>
                  </div>
                  {resumeAnalysis.strengths.length > 0 ? (
                    <ul className="space-y-2">
                      {resumeAnalysis.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Review your detailed feedback for improvement areas.</p>
                  )}
                </div>

                {/* Quick Recommendations */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Target className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Quick Recommendations</h3>
                  </div>
                  {resumeAnalysis.suggestions.length > 0 ? (
                    <ul className="space-y-2">
                      {resumeAnalysis.suggestions.slice(0, 3).map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                          <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                          {suggestion.length > 80 ? suggestion.substring(0, 80) + '...' : suggestion}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-600 dark:text-green-400">Great! No major improvements needed.</p>
                  )}
                </div>
              </div>

              {/* Detailed Professional Feedback */}
              {resumeAnalysis.detailedFeedback.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <Eye className="h-5 w-5 text-blue-500 mr-2" />
                    Professional Analysis & Feedback
                  </h3>
                  <div className="space-y-4">
                    {resumeAnalysis.detailedFeedback.map((feedback, index) => {
                      // Parse feedback to categorize
                      const isGrammarIssue = feedback.toLowerCase().includes('grammar');
                      const isFormattingIssue = feedback.toLowerCase().includes('format');
                      const isProfessionalTone = feedback.toLowerCase().includes('professional');
                      const isContentIssue = feedback.toLowerCase().includes('irrelevant') || feedback.toLowerCase().includes('unnecessary');
                      
                      let iconColor = 'text-gray-500';
                      let bgColor = 'bg-gray-50';
                      let borderColor = 'border-gray-200';
                      let categoryLabel = 'General';
                      
                      if (isGrammarIssue) {
                        iconColor = 'text-red-500';
                        bgColor = 'bg-red-50';
                        borderColor = 'border-red-200';
                        categoryLabel = 'Grammar & Language';
                      } else if (isFormattingIssue) {
                        iconColor = 'text-yellow-500';
                        bgColor = 'bg-yellow-50';
                        borderColor = 'border-yellow-200';
                        categoryLabel = 'Formatting';
                      } else if (isProfessionalTone) {
                        iconColor = 'text-blue-500';
                        bgColor = 'bg-blue-50';
                        borderColor = 'border-blue-200';
                        categoryLabel = 'Professional Tone';
                      } else if (isContentIssue) {
                        iconColor = 'text-purple-500';
                        bgColor = 'bg-purple-50';
                        borderColor = 'border-purple-200';
                        categoryLabel = 'Content Relevance';
                      }
                      
                      return (
                        <div key={index} className={cn(
                          "p-4 rounded-lg border-l-4",
                          bgColor,
                          borderColor
                        )}>
                          <div className="flex items-start space-x-3">
                            <AlertTriangle className={cn("h-5 w-5 mt-0.5 flex-shrink-0", iconColor)} />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={cn(
                                  "text-xs px-2 py-1 rounded-full font-medium",
                                  isGrammarIssue ? "bg-red-100 text-red-800" :
                                  isFormattingIssue ? "bg-yellow-100 text-yellow-800" :
                                  isProfessionalTone ? "bg-blue-100 text-blue-800" :
                                  isContentIssue ? "bg-purple-100 text-purple-800" :
                                  "bg-gray-100 text-gray-800"
                                )}>
                                  {categoryLabel}
                                </span>
                                <span className="text-xs text-gray-500">Issue #{index + 1}</span>
                              </div>
                              <p className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed">
                                {feedback}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary Statistics */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 text-indigo-500 mr-2" />
                  Analysis Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{resumeAnalysis.score}</div>
                    <div className="text-sm text-blue-700">Overall Score</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{resumeAnalysis.strengths.length}</div>
                    <div className="text-sm text-green-700">Strengths</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{resumeAnalysis.feedback.length}</div>
                    <div className="text-sm text-red-700">Issues Found</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{resumeAnalysis.suggestions.length}</div>
                    <div className="text-sm text-purple-700">Suggestions</div>
                  </div>
                </div>
              </div>

              {/* Areas for Improvement */}
              {resumeAnalysis.weaknesses.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Areas for Improvement</h3>
                  </div>
                  <ul className="space-y-3">
                    {resumeAnalysis.weaknesses.map((weakness, index) => (
                      <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start p-3 bg-red-50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <span className="font-medium">{weakness}</span>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Review the detailed feedback above for specific suggestions on how to address this issue.
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Enhanced Analysis Note */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Professional Analysis Complete</h3>
                    <div className="text-sm text-blue-800 space-y-2">
                      <p>
                        Your resume has been analyzed using advanced AI technology that evaluates grammar, 
                        professional tone, content relevance, and overall quality.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-white/50 p-3 rounded border border-blue-200">
                          <h4 className="font-medium text-blue-900 mb-2">What was analyzed:</h4>
                          <ul className="text-xs space-y-1">
                            <li>• Grammar and language quality</li>
                            <li>• Professional tone and clarity</li>
                            <li>• Content relevance and structure</li>
                            <li>• Experience section effectiveness</li>
                          </ul>
                        </div>
                        <div className="bg-white/50 p-3 rounded border border-blue-200">
                          <h4 className="font-medium text-blue-900 mb-2">Next steps:</h4>
                          <ul className="text-xs space-y-1">
                            <li>• Review detailed feedback above</li>
                            <li>• Address highlighted issues</li>
                            <li>• Implement suggested improvements</li>
                            <li>• Re-upload for updated analysis</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Another */}
              <div className="text-center">
                <button
                  onClick={handleRemoveFile}
                  className="btn-primary"
                >
                  Upload Another Resume
                </button>
              </div>
            </div>
          )}
        </div>        
        {/* Credit Manager (handles notifications and referrals) */}
        <CreditManager />
      </main>
      
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-white border border-green-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Analysis Complete!</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Resume analyzed successfully</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}