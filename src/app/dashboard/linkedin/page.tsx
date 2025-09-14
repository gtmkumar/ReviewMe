'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Linkedin, User, Briefcase, GraduationCap, Users, 
  MapPin, ExternalLink, Search, RefreshCw, AlertCircle, 
  CheckCircle, Trophy, TrendingUp, Award, Building,
  Calendar, Link as LinkIcon, Upload, FileText, CreditCard, History, Gift,
  Database, Zap
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

interface LinkedInProfile {
  name: string;
  headline: string;
  location: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
    years: string;
  }>;
  skills: string[];
  connections: number;
  profileUrl: string;
  imageUrl?: string;
}

export default function LinkedInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profileUrl, setProfileUrl] = useState('');
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState(false);
  const [analysisMethod, setAnalysisMethod] = useState<'url' | 'manual' | 'extract'>('extract');
  const [credits, setCredits] = useState(0);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [showTransactionSummary, setShowTransactionSummary] = useState(false);
  const [savedProfileData, setSavedProfileData] = useState<any>(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [dataSource, setDataSource] = useState<'saved' | 'fresh' | null>(null);
  const [loadingSavedData, setLoadingSavedData] = useState(true);

  // Manual input states
  const [manualData, setManualData] = useState({
    name: '',
    headline: '',
    location: '',
    summary: '',
    experience: [{ title: '', company: '', duration: '', description: '' }],
    education: [{ school: '', degree: '', field: '', years: '' }],
    skills: '',
    connections: 0
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
    
    // Load user credits
    loadUserCredits();
    // Load saved profile data
    loadSavedProfileData();
  }, [session, status, router]);

  // Load saved LinkedIn profile data from database
  const loadSavedProfileData = async (usernameParam?: string) => {
    setLoadingSavedData(true);
    try {
      const url = usernameParam 
        ? `/api/linkedin/profile?username=${encodeURIComponent(usernameParam)}`
        : '/api/linkedin/profile';
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSavedProfileData(data.data);
          setCurrentUsername(data.data.username);
          setDataSource('saved');
          
          // Set username field if we have the data
          if (data.data.username) {
            setUsername(data.data.username);
          }
          
          // Auto-populate profile with saved data
          if (data.data.profileData) {
            setProfile(data.data.profileData);
          }
        } else {
          // No saved data found
          setSavedProfileData(null);
          setDataSource(null);
        }
      }
    } catch (error) {
      console.error('Error loading saved profile data:', error);
      // Don't show error to user, just means no saved data exists
      setSavedProfileData(null);
      setDataSource(null);
    } finally {
      setLoadingSavedData(false);
    }
  };

  // Detect username change and load different profile data
  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername);
    
    if (newUsername && newUsername !== currentUsername && newUsername.length > 2) {
      // Username changed significantly, try to load saved data for this username
      loadSavedProfileData(newUsername);
    }
  };

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

  const isValidLinkedInUrl = (url: string) => {
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9-]+\/?$/;
    return linkedinRegex.test(url);
  };

  const extractLinkedInData = async (url: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Use a mock endpoint that follows the same credit system pattern
      const response = await fetch('/api/linkedin/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileUrl: url
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.error?.includes('Insufficient credits')) {
          setShowInsufficientCreditsModal(true);
          setShowCreditWarning(true);
        }
        throw new Error(data.error || 'Failed to extract LinkedIn data');
      }

      if (!data.success) {
        throw new Error(data.error || 'LinkedIn extraction failed');
      }

      // Set the profile data
      setProfile(data.data.profile);
      
      // Update credits and request tracking
      const currentRequestId = data.requestId;
      setRequestId(currentRequestId);
      setCredits(data.remainingCredits);
      setShowCreditWarning(data.remainingCredits < 20);
      
      // Store transaction details for summary display
      setTransactionDetails({
        id: currentRequestId,
        amount: data.creditsUsed,
        serviceType: 'linkedin',
        timestamp: new Date().toISOString(),
        description: 'LinkedIn URL Analysis'
      });
      setShowTransactionSummary(true);
      
      console.log('LinkedIn URL Analysis Successful:', {
        requestId: currentRequestId,
        serviceType: 'linkedin',
        creditsDeducted: data.creditsUsed,
        remainingCredits: data.remainingCredits,
        profileUrl: url,
        score: data.data.score,
        timestamp: new Date().toISOString()
      });

      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to extract LinkedIn data';
      setError(errorMessage);
      setProfile(null);
      
      console.error('LinkedIn service error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractProfile = async () => {
    if (!username.trim()) {
      setError('Please enter a LinkedIn username');
      return;
    }

    // Check credits first before making any requests
    if (credits < 15) {
      setError(`Insufficient credits. You need 15 credits but only have ${credits}.`);
      setShowInsufficientCreditsModal(true);
      setShowCreditWarning(true);
      return;
    }

    setIsExtracting(true);
    setError('');
    setProfile(null);

    try {
      // Use the new dedicated LinkedIn extraction API endpoint
      const response = await fetch('/api/linkedin/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim()
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.error?.includes('Insufficient credits')) {
          setShowInsufficientCreditsModal(true);
          setShowCreditWarning(true);
        }
        throw new Error(data.error || 'Failed to extract LinkedIn profile');
      }

      if (!data.success) {
        throw new Error(data.error || 'LinkedIn extraction failed');
      }

      // Set the extracted profile data
      setProfile(data.data.profile);
      setDataSource('fresh'); // Mark as fresh data
      
      // Update credits and request tracking
      const currentRequestId = data.requestId;
      setRequestId(currentRequestId);
      setCredits(data.remainingCredits);
      setShowCreditWarning(data.remainingCredits < 20);
      
      // Store transaction details for summary display
      setTransactionDetails({
        id: currentRequestId,
        amount: data.creditsUsed,
        serviceType: 'linkedin',
        timestamp: new Date().toISOString(),
        description: 'LinkedIn Profile Extraction'
      });
      setShowTransactionSummary(true);
      
      // Enhanced logging for successful extraction
      console.log('LinkedIn Profile Extraction Successful:', {
        requestId: currentRequestId,
        serviceType: 'linkedin',
        creditsDeducted: data.creditsUsed,
        remainingCredits: data.remainingCredits,
        username: username.trim(),
        score: data.data.score,
        timestamp: new Date().toISOString()
      });

      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to extract LinkedIn profile';
      setError(errorMessage);
      setProfile(null);
      
      console.error('LinkedIn extraction error:', errorMessage);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUrl.trim()) {
      setError('Please enter a LinkedIn profile URL');
      return;
    }
    
    if (!isValidLinkedInUrl(profileUrl)) {
      setError('Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)');
      return;
    }
    
    extractLinkedInData(profileUrl);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use manual entry API endpoint
      const response = await fetch('/api/linkedin/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualData
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.error?.includes('Insufficient credits')) {
          setShowInsufficientCreditsModal(true);
          setShowCreditWarning(true);
        }
        throw new Error(data.error || 'Failed to process LinkedIn profile');
      }

      if (!data.success) {
        throw new Error(data.error || 'Manual entry processing failed');
      }

      // Set the profile data
      setProfile(data.data.profile);
      
      // Update credits and request tracking
      const currentRequestId = data.requestId;
      setRequestId(currentRequestId);
      setCredits(data.remainingCredits);
      setShowCreditWarning(data.remainingCredits < 20);
      
      // Store transaction details for summary display
      setTransactionDetails({
        id: currentRequestId,
        amount: data.creditsUsed,
        serviceType: 'linkedin',
        timestamp: new Date().toISOString(),
        description: 'LinkedIn Manual Entry'
      });
      setShowTransactionSummary(true);
      
      console.log('LinkedIn Manual Entry Successful:', {
        requestId: currentRequestId,
        serviceType: 'linkedin',
        creditsDeducted: data.creditsUsed,
        remainingCredits: data.remainingCredits,
        name: manualData.name,
        score: data.data.score,
        timestamp: new Date().toISOString()
      });

      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process LinkedIn profile';
      setError(errorMessage);
      setProfile(null);
      
      console.error('LinkedIn manual entry error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const addExperience = () => {
    setManualData(prev => ({
      ...prev,
      experience: [...prev.experience, { title: '', company: '', duration: '', description: '' }]
    }));
  };

  const addEducation = () => {
    setManualData(prev => ({
      ...prev,
      education: [...prev.education, { school: '', degree: '', field: '', years: '' }]
    }));
  };

  const calculateLinkedInScore = () => {
    if (!profile) return 0;
    
    let score = 0;
    
    // Profile completeness (30 points)
    if (profile.name) score += 5;
    if (profile.headline) score += 5;
    if (profile.location) score += 3;
    if (profile.summary && profile.summary.length > 50) score += 10;
    if (profile.imageUrl) score += 7;
    
    // Experience (25 points)
    if (profile.experience.length > 0) score += 10;
    if (profile.experience.length >= 2) score += 5;
    if (profile.experience.some(exp => exp.description && exp.description.length > 50)) score += 10;
    
    // Education (15 points)
    if (profile.education.length > 0) score += 10;
    if (profile.education.length >= 2) score += 5;
    
    // Skills (15 points)
    if (profile.skills.length >= 5) score += 8;
    if (profile.skills.length >= 10) score += 7;
    
    // Network (15 points)
    if (profile.connections >= 50) score += 5;
    if (profile.connections >= 500) score += 10;
    
    return Math.min(score, 100);
  };

  const getProfileStrengths = (profileData: LinkedInProfile): string[] => {
    const strengths = [];
    if (profileData.headline) strengths.push('Professional headline');
    if (profileData.summary && profileData.summary.length > 50) strengths.push('Comprehensive summary');
    if (profileData.experience.length >= 2) strengths.push('Multiple work experiences');
    if (profileData.education.length > 0) strengths.push('Education background provided');
    if (profileData.skills.length >= 5) strengths.push('Diverse skill set');
    if (profileData.connections >= 100) strengths.push('Strong professional network');
    return strengths;
  };

  const getProfileWeaknesses = (profileData: LinkedInProfile): string[] => {
    const weaknesses = [];
    if (!profileData.headline) weaknesses.push('Missing professional headline');
    if (!profileData.summary || profileData.summary.length < 50) weaknesses.push('Incomplete or missing summary');
    if (profileData.experience.length < 2) weaknesses.push('Limited work experience details');
    if (profileData.skills.length < 5) weaknesses.push('Few skills listed');
    if (profileData.connections < 50) weaknesses.push('Small professional network');
    if (!profileData.location) weaknesses.push('Location not specified');
    return weaknesses;
  };

  const getProfileSuggestions = (profileData: LinkedInProfile): string[] => {
    const suggestions = [];
    if (!profileData.headline) suggestions.push('Add a compelling professional headline that highlights your expertise');
    if (!profileData.summary || profileData.summary.length < 50) suggestions.push('Write a detailed summary showcasing your professional achievements');
    if (profileData.experience.length < 2) suggestions.push('Add more work experience details with specific accomplishments');
    if (profileData.skills.length < 10) suggestions.push('Expand your skills section to include more relevant competencies');
    if (profileData.connections < 100) suggestions.push('Build your professional network by connecting with colleagues and industry professionals');
    suggestions.push('Keep your profile updated with recent achievements and experiences');
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

  const profileScore = calculateLinkedInScore();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Linkedin className="h-8 w-8 text-linkedin" />
                <h1 className="text-3xl font-bold text-gray-900">LinkedIn Profile Analysis</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* RedactAI Analysis Button */}
                <Link 
                  href="/dashboard/linkedin/analysis"
                  className="flex items-center space-x-2 px-4 py-2 bg-linkedin text-white rounded-lg hover:bg-linkedin/90 transition-colors text-sm font-medium"
                >
                  <Search className="h-4 w-4" />
                  <span>RedactAI Analysis</span>
                </Link>
                
                {/* History Button */}
                <Link 
                  href="/dashboard/linkedin/history"
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
              Analyze your LinkedIn profile by entering the URL or manually inputting your information.
            </p>
          </div>

          {/* Data Source Indicator - Prominent Notification Bar */}
          {dataSource && savedProfileData && (
            <div className={cn(
              "mb-6 p-4 rounded-lg border",
              dataSource === 'saved' 
                ? "bg-blue-50 border-blue-200"
                : "bg-green-50 border-green-200"
            )}>
              <div className="flex items-center space-x-3">
                {dataSource === 'saved' ? (
                  <Database className="h-5 w-5 text-blue-600" />
                ) : (
                  <Zap className="h-5 w-5 text-green-600" />
                )}
                <div>
                  <h3 className={cn(
                    "font-medium",
                    dataSource === 'saved' ? "text-blue-800" : "text-green-800"
                  )}>
                    {dataSource === 'saved' 
                      ? 'Displaying Saved Profile Data' 
                      : 'Fresh Profile Data Generated'
                    }
                  </h3>
                  <p className={cn(
                    "text-sm",
                    dataSource === 'saved' ? "text-blue-700" : "text-green-700"
                  )}>
                    Username: {savedProfileData?.username || currentUsername} | Last updated: {savedProfileData?.lastUpdated ? new Date(savedProfileData.lastUpdated).toLocaleString() : new Date().toLocaleString()}
                    {dataSource === 'saved' && ' | No credits charged for cached data'}
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
                <p className="text-gray-600">Loading saved profile data...</p>
              </div>
            </div>
          )}

          {/* Method Selection */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setAnalysisMethod('extract')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  analysisMethod === 'extract'
                    ? 'bg-linkedin text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Extract Profile
              </button>
              <button
                onClick={() => setAnalysisMethod('url')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  analysisMethod === 'url'
                    ? 'bg-linkedin text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Profile URL
              </button>
              <button
                onClick={() => setAnalysisMethod('manual')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  analysisMethod === 'manual'
                    ? 'bg-linkedin text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Manual Entry
              </button>
            </div>

            {/* Original data source indicator removed - now displayed prominently above */}

            {analysisMethod === 'extract' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleExtractProfile(); }}>
                <div className="mb-4">
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Linkedin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="thedevankit"
                      required
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Enter the LinkedIn username (without the full URL). For example: 'thedevankit' from linkedin.com/in/thedevankit
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isExtracting}
                  className="btn-primary flex items-center space-x-2"
                >
                  {isExtracting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>{isExtracting ? 'Extracting...' : 'Extract Data'}</span>
                </button>
              </form>
            ) : analysisMethod === 'url' ? (
              <form onSubmit={handleUrlSubmit}>
                <div className="mb-4">
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
                      onChange={(e) => setProfileUrl(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="https://linkedin.com/in/your-username"
                      required
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Note: LinkedIn blocks automated data extraction. This feature shows how it would work with proper API access.
                  </p>
                </div>
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
                  <span>{isLoading ? 'Analyzing...' : 'Extract Data'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleManualSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={manualData.name}
                      onChange={(e) => setManualData(prev => ({ ...prev, name: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Headline</label>
                    <input
                      type="text"
                      value={manualData.headline}
                      onChange={(e) => setManualData(prev => ({ ...prev, headline: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="e.g., Software Engineer at Company"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={manualData.location}
                      onChange={(e) => setManualData(prev => ({ ...prev, location: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="e.g., San Francisco, CA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Connections</label>
                    <input
                      type="number"
                      value={manualData.connections}
                      onChange={(e) => setManualData(prev => ({ ...prev, connections: parseInt(e.target.value) || 0 }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="500+"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
                  <textarea
                    value={manualData.summary}
                    onChange={(e) => setManualData(prev => ({ ...prev, summary: e.target.value }))}
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="Brief summary of your professional background..."
                  />
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                  <input
                    type="text"
                    value={manualData.skills}
                    onChange={(e) => setManualData(prev => ({ ...prev, skills: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="JavaScript, React, Node.js, Python (comma-separated)"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Experience</h3>
                  <button
                    type="button"
                    onClick={addExperience}
                    className="btn-secondary text-sm"
                  >
                    Add Experience
                  </button>
                </div>

                {manualData.experience.map((exp, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-md">
                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) => {
                        const newExp = [...manualData.experience];
                        newExp[index].title = e.target.value;
                        setManualData(prev => ({ ...prev, experience: newExp }));
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="Job Title"
                    />
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => {
                        const newExp = [...manualData.experience];
                        newExp[index].company = e.target.value;
                        setManualData(prev => ({ ...prev, experience: newExp }));
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="Company"
                    />
                    <input
                      type="text"
                      value={exp.duration}
                      onChange={(e) => {
                        const newExp = [...manualData.experience];
                        newExp[index].duration = e.target.value;
                        setManualData(prev => ({ ...prev, experience: newExp }));
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="Jan 2020 - Present"
                    />
                    <textarea
                      value={exp.description}
                      onChange={(e) => {
                        const newExp = [...manualData.experience];
                        newExp[index].description = e.target.value;
                        setManualData(prev => ({ ...prev, experience: newExp }));
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="Job description..."
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  className="btn-primary flex items-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Analyze Profile</span>
                </button>
              </form>
            )}
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-red-800">{error}</p>
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
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-green-800 mb-2">
                      Analysis Complete - Credit Transaction Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
                      <div>
                        <span className="font-medium">Service:</span> LinkedIn Analysis
                      </div>
                      <div>
                        <span className="font-medium">Credits Used:</span> {transactionDetails.amount}
                      </div>
                      <div>
                        <span className="font-medium">Remaining Credits:</span> {credits}
                      </div>
                      <div>
                        <span className="font-medium">Transaction ID:</span> {transactionDetails.id ? transactionDetails.id.slice(-8) : 'N/A'}
                      </div>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      {transactionDetails.description || 'LinkedIn Analysis'} • {new Date(transactionDetails.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RedactAI Analyses Section - COMMENTED OUT */}
          {/* <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-linkedin/10 rounded-lg flex items-center justify-center">
                  <Search className="h-4 w-4 text-linkedin" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">RedactAI Profile Analysis</h3>
              </div>
              <Link 
                href="/dashboard/linkedin/analysis"
                className="text-linkedin hover:text-linkedin/80 text-sm font-medium"
              >
                View All Analyses →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Analysis Card 1 - Sample */}
              {/* <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Linkedin className="h-5 w-5 text-linkedin" />
                    <span className="font-medium text-gray-900">Advanced Analysis</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-500">Ready</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Get AI-powered insights, optimization suggestions, and detailed analysis of your LinkedIn profile.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">15 credits</span>
                  <Link 
                    href="/dashboard/linkedin/analysis"
                    className="text-linkedin hover:text-linkedin/80 text-sm font-medium"
                  >
                    Start Analysis
                  </Link>
                </div>
              </div> */}
              
              {/* Analysis Card 2 - Coming Soon */}
              {/* <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-gray-600">Network Analysis</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-xs text-gray-500">Soon</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Analyze your professional network connections and identify growth opportunities.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">20 credits</span>
                  <span className="text-gray-400 text-sm">Coming Soon</span>
                </div>
              </div> */}
              
              {/* Analysis Card 3 - Coming Soon */}
              {/* <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-gray-600">Performance Tracking</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-xs text-gray-500">Soon</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Track profile views, engagement metrics, and optimization progress over time.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">10 credits</span>
                  <span className="text-gray-400 text-sm">Coming Soon</span>
                </div>
              </div> */}
            {/* </div>
          </div> */}

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

          {/* Profile Analysis Results */}
          {profile && (
            <div className="space-y-8">
              
              {/* Profile Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LinkedIn-style Profile Card */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Cover Section */}
                  <div className="h-32 bg-gradient-to-r from-primary to-primary/80"></div>
                  
                  {/* Profile Content */}
                  <div className="relative px-6 pb-6">
                    {/* Profile Picture */}
                    <div className="flex items-start space-x-6 -mt-16">
                      {profile.imageUrl ? (
                        <img
                          src={profile.imageUrl}
                          alt={profile.name}
                          className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                          <User className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Profile Info */}
                      <div className="flex-1 pt-20">
                        <div className="flex items-start justify-between">
                          <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">{profile.name}</h1>
                            {profile.headline && (
                              <p className="text-lg text-gray-700 mb-2">{profile.headline}</p>
                            )}
                            {profile.location && (
                              <div className="flex items-center text-gray-600 mb-3">
                                <MapPin className="h-4 w-4 mr-2" />
                                <span>{profile.location}</span>
                              </div>
                            )}
                            {profile.connections > 0 && (
                              <div className="flex items-center text-gray-600 text-sm">
                                <Users className="h-4 w-4 mr-2" />
                                <span>{profile.connections.toLocaleString()} connections</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center space-x-3">
                            {profile.profileUrl !== 'manual-entry' && (
                              <a
                                href={profile.profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span>View LinkedIn</span>
                              </a>
                            )}
                          </div>
                        </div>
                        
                        {/* About Section */}
                        {profile.summary && (
                          <div className="mt-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                            <p className="text-gray-700 leading-relaxed">{profile.summary}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Score */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Trophy className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <div className={cn(
                      "text-4xl font-bold mb-2",
                      profileScore >= 80 ? "text-green-600" :
                      profileScore >= 60 ? "text-primary" :
                      profileScore >= 40 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {profileScore}
                    </div>
                    <p className="text-gray-600 text-sm font-medium">Profile Score</p>
                  </div>
                  
                  {/* Score Breakdown */}
                  <div className="mt-6 space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Profile Complete
                      </span>
                      <span className="text-sm font-medium text-primary">
                        {[profile.name, profile.headline, profile.location, profile.summary].filter(Boolean).length}/4
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600 flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-blue-500" />
                        Experience
                      </span>
                      <span className="text-sm font-medium text-primary">{profile.experience.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600 flex items-center">
                        <Award className="h-4 w-4 mr-2 text-purple-500" />
                        Skills
                      </span>
                      <span className="text-sm font-medium text-primary">{profile.skills.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600 flex items-center">
                        <Users className="h-4 w-4 mr-2 text-orange-500" />
                        Network
                      </span>
                      <span className="text-sm font-medium text-primary">{profile.connections.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Experience */}
              {profile.experience.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <Briefcase className="h-6 w-6 mr-3 text-primary" />
                      Experience
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {profile.experience.map((exp, index) => (
                      <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">{exp.title}</h4>
                            <p className="text-primary font-medium mb-1">{exp.company}</p>
                            <div className="flex items-center text-sm text-gray-600 mb-3">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{exp.duration}</span>
                            </div>
                            {exp.description && (
                              <p className="text-gray-700 leading-relaxed">{exp.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {profile.education.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <GraduationCap className="h-6 w-6 mr-3 text-primary" />
                      Education
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {profile.education.map((edu, index) => (
                      <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">{edu.school}</h4>
                            <p className="text-primary font-medium mb-1">
                              {edu.degree} {edu.field && `in ${edu.field}`}
                            </p>
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{edu.years}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {profile.skills.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <Award className="h-6 w-6 mr-3 text-primary" />
                      Skills & Endorsements
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {profile.skills.map((skill, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary/30 transition-colors"
                        >
                          <span className="font-medium text-gray-900">{skill}</span>
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>{Math.floor(Math.random() * 50) + 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>      
          {/* Credit Manager (handles notifications and referrals) */}
          <CreditManager />
    </div>
  );
}