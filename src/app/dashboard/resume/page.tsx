'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, Upload, RefreshCw, CheckCircle, AlertCircle, 
  Download, Eye, Trash2, Award, TrendingUp, Target,
  User, Briefcase, GraduationCap, Code, Star, 
  AlertTriangle, Info, ExternalLink, CreditCard, History
} from 'lucide-react';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { cn } from '@/lib/utils';

interface ResumeAnalysis {
  fileName: string;
  fileSize: number;
  uploadDate: string;
  extractedText: string;
  analysis: {
    score: number;
    sections: {
      name: boolean;
      contact: boolean;
      summary: boolean;
      experience: boolean;
      education: boolean;
      skills: boolean;
    };
    keywords: string[];
    suggestions: string[];
    strengths: string[];
    weaknesses: string[];
  };
}

export default function ResumePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState('');
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
    
    // Load user credits
    loadUserCredits();
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

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, DOCX, or TXT file.');
      setIsUploading(false);
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
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
        setShowCreditWarning(true);
        return;
      }

      const startTime = Date.now();
      
      setUploadedFile(file);
      
      // Extract text from file
      const extractedText = await extractTextFromFile(file);
      
      // Analyze the extracted text
      const analysis = analyzeResumeText(extractedText);
      
      const resumeData: ResumeAnalysis = {
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        extractedText,
        analysis
      };

      setResumeAnalysis(resumeData);
      
      const processingTime = Date.now() - startTime;
      
      // Now deduct credits and log the successful response
      const deductionResponse = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_and_deduct',
          serviceType: 'resume',
          payload: { 
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          }
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
          serviceType: 'resume',
          creditsDeducted: deductionData.creditsDeducted,
          remainingCredits: deductionData.remainingCredits,
          fileName: file.name,
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
              fileName: file.name,
              fileSize: file.size,
              extractedText,
              analysis
            },
            analysisResults: {
              score: analysis.score,
              strengths: analysis.strengths,
              weaknesses: analysis.weaknesses,
              suggestions: analysis.suggestions
            },
            processingTime
          })
        });
      }

      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process resume. Please try again.';
      setError(errorMessage);
      setResumeAnalysis(null);
      setUploadedFile(null);
      
      // No need to log failed response since credits weren't deducted
      console.error('Resume service error:', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        // For PDF extraction, in a real implementation you'd use pdf-parse or similar
        // For now, we'll simulate text extraction
        resolve(`
          John Doe
          Software Engineer
          john.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe

          PROFESSIONAL SUMMARY
          Experienced software engineer with 5+ years in full-stack development. 
          Proficient in JavaScript, React, Node.js, and cloud technologies.

          EXPERIENCE
          Senior Software Engineer | Tech Company | 2022 - Present
          • Led development of scalable web applications
          • Improved system performance by 40%
          • Mentored junior developers

          Software Engineer | Startup Inc | 2019 - 2022
          • Developed RESTful APIs and full-stack applications
          • Collaborated with cross-functional teams

          EDUCATION
          Bachelor of Science in Computer Science | University of Technology | 2019

          SKILLS
          JavaScript, React, Node.js, Python, AWS, Docker, MongoDB, PostgreSQL, Html, Google Cloud
        `);
      } else {
        // For DOC/DOCX files, you'd typically use mammoth.js or similar
        // Simulating extraction for demo
        resolve(`
          Jane Smith
          Product Manager
          jane.smith@email.com | (555) 987-6543

          PROFESSIONAL SUMMARY
          Results-driven product manager with 4+ years of experience in agile development 
          and product strategy. Proven track record of launching successful products.

          EXPERIENCE
          Senior Product Manager | Innovation Corp | 2021 - Present
          • Launched 3 major product features resulting in 25% user growth
          • Led cross-functional teams of 8+ members
          • Developed product roadmaps and strategies

          Product Manager | Digital Solutions | 2020 - 2021
          • Managed product lifecycle from concept to launch
          • Conducted market research and user interviews

          EDUCATION
          MBA in Business Administration | Business School | 2020
          Bachelor of Arts in Marketing | State University | 2018

          SKILLS
          Product Strategy, Agile, Scrum, Data Analysis, User Research, Roadmapping
        `);
      }
    });
  };

  const analyzeResumeText = (text: string) => {
    const lowerText = text.toLowerCase();
    
    // Check for resume sections
    const sections = {
      name: /^[a-z\s]+$/im.test(text.split('\n')[0]?.trim() || ''),
      contact: /email|phone|linkedin|@/.test(lowerText),
      summary: /summary|objective|about|profile/.test(lowerText),
      experience: /experience|work|employment|job/.test(lowerText),
      education: /education|degree|university|college|school/.test(lowerText),
      skills: /skills|technologies|competencies|proficiencies/.test(lowerText)
    };

    // Extract keywords (common tech and business terms)
    const techKeywords = [
      'javascript', 'python', 'java', 'react', 'node.js', 'aws', 'docker', 
      'kubernetes', 'mongodb', 'postgresql', 'typescript', 'angular', 'vue',
      'machine learning', 'ai', 'data science', 'cloud', 'devops', 'agile',
      'scrum', 'api', 'microservices', 'git', 'ci/cd'
    ];

    const businessKeywords = [
      'leadership', 'management', 'strategy', 'analysis', 'communication',
      'teamwork', 'project management', 'marketing', 'sales', 'finance',
      'operations', 'consulting', 'research', 'planning', 'optimization'
    ];

    const allKeywords = [...techKeywords, ...businessKeywords];
    const foundKeywords = allKeywords.filter(keyword => 
      lowerText.includes(keyword)
    );

    // Calculate score
    let score = 0;
    Object.values(sections).forEach(hasSection => {
      if (hasSection) score += 15;
    });
    score += Math.min(foundKeywords.length * 2, 20); // Up to 20 points for keywords
    if (text.length > 500) score += 10; // Adequate length

    // Generate suggestions
    const suggestions = [];
    const strengths = [];
    const weaknesses = [];

    if (!sections.summary) {
      suggestions.push('Add a professional summary or objective section');
      weaknesses.push('Missing professional summary');
    } else {
      strengths.push('Includes professional summary');
    }

    if (!sections.contact) {
      suggestions.push('Include complete contact information');
      weaknesses.push('Incomplete contact information');
    } else {
      strengths.push('Complete contact information');
    }

    if (foundKeywords.length < 5) {
      suggestions.push('Include more relevant keywords for your industry');
      weaknesses.push('Limited industry keywords');
    } else if (foundKeywords.length > 10) {
      strengths.push('Good use of industry keywords');
    }

    if (!sections.skills) {
      suggestions.push('Add a dedicated skills section');
      weaknesses.push('No dedicated skills section');
    } else {
      strengths.push('Includes skills section');
    }

    if (text.length < 300) {
      suggestions.push('Expand your resume with more detailed descriptions');
      weaknesses.push('Resume content too brief');
    } else if (text.length > 1000) {
      strengths.push('Comprehensive content');
    }

    return {
      score: Math.min(score, 100),
      sections,
      keywords: foundKeywords,
      suggestions,
      strengths,
      weaknesses
    };
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
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-green-600" />
                <h1 className="text-3xl font-bold text-gray-900">Resume Analysis</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* History Button */}
                <Link 
                  href="/dashboard/resume/history"
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
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
            <p className="text-gray-600">
              Upload your resume for AI-powered analysis and recommendations. Supported formats: PDF, DOC, DOCX, TXT.
            </p>
          </div>

          {/* Upload Section */}
          {!resumeAnalysis && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
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
                    <p className="text-lg font-medium text-gray-900">Processing Resume...</p>
                    <p className="text-sm text-gray-600">Extracting text and analyzing content</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Drop your resume here or click to browse
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Supports PDF, DOC, DOCX, TXT files up to 5MB
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
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

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
              
              {showTransactionSummary && transactionDetails && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="ml-3 flex-1">
                      <h4 className="text-sm font-medium text-green-800 mb-2">
                        Analysis Complete - Credit Transaction Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
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
                      <p className="text-xs text-green-600 mt-2">
                        {transactionDetails.description} • {new Date(transactionDetails.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Tips for better analysis:</h3>
                    <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                      <li>Ensure your resume includes contact information, summary, experience, education, and skills</li>
                      <li>Use standard section headers (Experience, Education, Skills, etc.)</li>
                      <li>Include relevant keywords for your industry</li>
                      <li>Keep formatting simple for better text extraction</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {resumeAnalysis && (
            <div className="space-y-8">
              
              {/* File Info & Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{resumeAnalysis.fileName}</h3>
                      <p className="text-sm text-gray-600">
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
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <Award className="h-8 w-8 text-yellow-500" />
                  </div>
                  <div className={cn(
                    "text-4xl font-bold mb-2",
                    resumeAnalysis.analysis.score >= 80 ? "text-green-600" :
                    resumeAnalysis.analysis.score >= 60 ? "text-blue-600" :
                    resumeAnalysis.analysis.score >= 40 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {resumeAnalysis.analysis.score}
                  </div>
                  <p className="text-gray-600 text-sm">ATS Score</p>
                  
                  <div className="mt-4 text-left">
                    <div className="text-sm text-gray-600 mb-2">Resume Sections</div>
                    <div className="space-y-1">
                      {Object.entries(resumeAnalysis.analysis.sections).map(([section, hasSection]) => (
                        <div key={section} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{section}</span>
                          {hasSection ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Star className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-medium text-gray-900">Strengths</h3>
                  </div>
                  {resumeAnalysis.analysis.strengths.length > 0 ? (
                    <ul className="space-y-2">
                      {resumeAnalysis.analysis.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">No specific strengths identified.</p>
                  )}
                </div>

                {/* Recommendations */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Target className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-medium text-gray-900">Recommendations</h3>
                  </div>
                  {resumeAnalysis.analysis.suggestions.length > 0 ? (
                    <ul className="space-y-2">
                      {resumeAnalysis.analysis.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-600">Great! No major improvements needed.</p>
                  )}
                </div>
              </div>

              {/* Keywords Found */}
              {resumeAnalysis.analysis.keywords.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Keywords Found ({resumeAnalysis.analysis.keywords.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {resumeAnalysis.analysis.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Weaknesses */}
              {resumeAnalysis.analysis.weaknesses.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h3 className="text-lg font-medium text-gray-900">Areas for Improvement</h3>
                  </div>
                  <ul className="space-y-2">
                    {resumeAnalysis.analysis.weaknesses.map((weakness, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Enhancement Note */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <Info className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Ready for AI Enhancement</h3>
                    <p className="mt-2 text-sm text-yellow-700">
                      The extracted text from your resume is ready to be sent to Gemini or other AI services 
                      for advanced analysis, personalized recommendations, and content improvement suggestions.
                    </p>
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
      </main>
      
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-white border border-green-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Analysis Complete!</p>
              <p className="text-xs text-gray-600">Resume analyzed successfully</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}