'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  User, Github, Linkedin, ExternalLink, Award, TrendingUp, 
  Building, MapPin, Calendar, Star, Clock, ArrowLeft, Code,
  Users, GitBranch, Briefcase, GraduationCap, CheckCircle,
  AlertTriangle, BarChart3, Eye, Lightbulb
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PublicProfile {
  name: string;
  publicUsername: string;
  bio?: string;
  avatar?: string;
  image?: string;
  profilePublic: boolean;
  createdAt: string;
  profileData?: {
    overall: number;
    github?: {
      connected: boolean;
      score: number;
      username?: string;
      profileUrl?: string;
      name?: string;
      bio?: string;
      company?: string;
      location?: string;
      followers?: number;
      following?: number;
      publicRepos?: number;
      totalStars?: number;
      totalForks?: number;
      languages?: { [key: string]: number };
      topRepositories?: any[];
      suggestions?: string[];
      lastUpdated?: string;
    };
    linkedin?: {
      connected: boolean;
      score: number;
      name?: string;
      headline?: string;
      location?: string;
      industry?: string;
      connectionCount?: number;
      experience?: any[];
      education?: any[];
      skills?: string[];
      strengths?: string[];
      weaknesses?: string[];
      suggestions?: string[];
      lastUpdated?: string;
    };
    resume?: {
      uploaded: boolean;
      score: number;
      lastUpdated?: string;
    };
  };
}

export default function PublicProfilePage() {
  const params = useParams();
  const publicUsername = params.publicUsername as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (publicUsername) {
      loadPublicProfile();
    }
  }, [publicUsername]);

  const loadPublicProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/profile/public/${publicUsername}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Profile not found');
      }

      setProfile(data.profile);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getOverallScore = () => {
    if (!profile?.profileData) return 0;
    return profile.profileData.overall || 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full p-8">
          <div className="text-center">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
            <p className="text-gray-600 mb-6">
              {error || 'This profile doesn\'t exist or has been made private.'}
            </p>
            <Link 
              href="/"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profile.profilePublic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full p-8">
          <div className="text-center">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Private</h1>
            <p className="text-gray-600 mb-6">
              This user has chosen to keep their profile private.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const overallScore = getOverallScore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">R</span>
                </div>
                <span className="font-bold text-xl text-gray-900">ReviewMe</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/auth/signin"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/auth/signup"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <div className="flex items-start space-x-6">
            <div className="relative">
              {profile.avatar || profile.image ? (
                <img
                  src={profile.avatar || profile.image}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="h-12 w-12 text-white" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
                <Award className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}</h1>
              <p className="text-lg text-gray-600 mb-3">@{profile.publicUsername}</p>
              
              {profile.bio && (
                <p className="text-gray-700 mb-4">{profile.bio}</p>
              )}
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                {profile.profileData?.github?.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.profileData.github.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Overall Score */}
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">{overallScore}</div>
              <div className="text-sm text-gray-600">Overall Score</div>
              <div className="w-20 bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" 
                  style={{ width: `${overallScore}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Sections */}
        <div className="space-y-8">

          {/* Professional Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Professional Summary</h2>
            
            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {profile.profileData?.github?.connected && (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {profile.profileData.github.score || 0}
                  </div>
                  <div className="text-sm text-gray-600">GitHub Score</div>
                  <div className="mt-1">
                    <Github className="h-4 w-4 text-gray-700 mx-auto" />
                  </div>
                </div>
              )}
              
              {profile.profileData?.linkedin?.connected && (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {profile.profileData.linkedin.score || 0}
                  </div>
                  <div className="text-sm text-gray-600">LinkedIn Score</div>
                  <div className="mt-1">
                    <Linkedin className="h-4 w-4 text-blue-600 mx-auto" />
                  </div>
                </div>
              )}
              
              {profile.profileData?.resume?.uploaded && (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {profile.profileData.resume.score || 0}
                  </div>
                  <div className="text-sm text-gray-600">Resume Score</div>
                  <div className="mt-1">
                    <TrendingUp className="h-4 w-4 text-green-600 mx-auto" />
                  </div>
                </div>
              )}
              
              <div className="text-center p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                <div className="text-2xl font-bold">
                  {profile.profileData?.overall || 0}
                </div>
                <div className="text-sm text-blue-100">Overall Score</div>
                <div className="mt-1">
                  <Award className="h-4 w-4 text-white mx-auto" />
                </div>
              </div>
            </div>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-github">
                  {profile.profileData?.github?.publicRepos || 0}
                </div>
                <div className="text-sm text-gray-600">Projects</div>
                <div className="mt-1">
                  <Code className="h-4 w-4 text-github mx-auto" />
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-linkedin">
                  {profile.profileData?.linkedin?.connectionCount || 0}
                </div>
                <div className="text-sm text-gray-600">Connections</div>
                <div className="mt-1">
                  <Users className="h-4 w-4 text-linkedin mx-auto" />
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {profile.profileData?.linkedin?.experience?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Experience</div>
                <div className="mt-1">
                  <Briefcase className="h-4 w-4 text-green-600 mx-auto" />
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {profile.profileData?.linkedin?.skills?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Skills</div>
                <div className="mt-1">
                  <Award className="h-4 w-4 text-purple-600 mx-auto" />
                </div>
              </div>
            </div>
          </div>

          {/* Platform Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
            {/* GitHub Section */}
            {profile.profileData?.github?.connected ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Github className="h-6 w-6 text-gray-900" />
                  <h3 className="text-lg font-semibold">GitHub Analysis</h3>
                  <div className="ml-auto text-2xl font-bold text-gray-900">
                    {profile.profileData.github.score || 0}
                  </div>
                </div>
                
                <div className="space-y-3 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Stars:</span>
                    <span className="font-medium">{profile.profileData.github.totalStars || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Repositories:</span>
                    <span className="font-medium">{profile.profileData.github.publicRepos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Followers:</span>
                    <span className="font-medium">{profile.profileData.github.followers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Following:</span>
                    <span className="font-medium">{profile.profileData.github.following}</span>
                  </div>
                  {profile.profileData.github.company && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Company:</span>
                      <span className="font-medium">{profile.profileData.github.company}</span>
                    </div>
                  )}
                </div>
                
                {/* Programming Languages */}
                {Object.keys(profile.profileData.github.languages || {}).length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Programming Languages</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(profile.profileData.github.languages || {})
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, 5)
                        .map(([language, count]) => (
                        <span key={language} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {language} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Top Repositories */}
                {(profile.profileData?.github?.topRepositories?.length || 0) > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Top Repositories</h4>
                    <div className="space-y-2">
                      {(profile.profileData.github.topRepositories || []).slice(0, 3).map((repo: any) => (
                        <div key={repo.id} className="flex items-center justify-between text-sm">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{repo.name}</div>
                            {repo.description && (
                              <div className="text-gray-600 text-xs truncate">{repo.description}</div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <div className="flex items-center">
                              <Star className="h-3 w-3 mr-1" />
                              {repo.stargazers_count || 0}
                            </div>
                            <div className="flex items-center">
                              <GitBranch className="h-3 w-3 mr-1" />
                              {repo.forks_count || 0}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <a
                  href={profile.profileData.github.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span>View GitHub Profile</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Github className="h-6 w-6 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-700">GitHub</h3>
                  <div className="ml-auto text-sm text-gray-500">Not Connected</div>
                </div>
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <Code className="h-12 w-12 mx-auto" />
                  </div>
                  <p className="text-gray-600 mb-4">GitHub profile not connected</p>
                  <div className="text-sm text-gray-500">
                    Connect GitHub to see detailed code analysis and repository insights.
                  </div>
                </div>
              </div>
            )}

            {/* LinkedIn Section */}
            {profile.profileData?.linkedin?.connected ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Linkedin className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold">LinkedIn Analysis</h3>
                  <div className="ml-auto text-2xl font-bold text-blue-600">
                    {profile.profileData.linkedin.score || 0}
                  </div>
                </div>
                
                <div className="space-y-3 text-sm mb-4">
                  {profile.profileData.linkedin.headline && (
                    <div>
                      <span className="text-gray-600">Headline:</span>
                      <p className="font-medium mt-1">{profile.profileData.linkedin.headline}</p>
                    </div>
                  )}
                  {profile.profileData.linkedin.location && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{profile.profileData.linkedin.location}</span>
                    </div>
                  )}
                  {profile.profileData.linkedin.industry && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Industry:</span>
                      <span className="font-medium">{profile.profileData.linkedin.industry}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Connections:</span>
                    <span className="font-medium">{profile.profileData.linkedin.connectionCount || 0}</span>
                  </div>
                </div>
                
                {/* LinkedIn Strengths */}
                {(profile.profileData?.linkedin?.strengths?.length || 0) > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Strengths
                    </h4>
                    <div className="space-y-1">
                      {(profile.profileData.linkedin.strengths || []).slice(0, 3).map((strength, index) => (
                        <div key={index} className="text-xs bg-green-50 text-green-800 px-2 py-1 rounded">
                          {strength}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Skills */}
                {(profile.profileData?.linkedin?.skills?.length || 0) > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {(profile.profileData.linkedin.skills || []).slice(0, 6).map((skill, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Linkedin className="h-6 w-6 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-700">LinkedIn</h3>
                  <div className="ml-auto text-sm text-gray-500">Not Connected</div>
                </div>
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <Users className="h-12 w-12 mx-auto" />
                  </div>
                  <p className="text-gray-600 mb-4">LinkedIn profile not connected</p>
                  <div className="text-sm text-gray-500">
                    Connect LinkedIn to see professional analysis and career insights.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Improvement Suggestions */}
          {((profile.profileData?.github?.suggestions?.length || 0) > 0 || (profile.profileData?.linkedin?.suggestions?.length || 0) > 0) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Improvement Suggestions</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* GitHub Suggestions */}
                {(profile.profileData?.github?.suggestions?.length || 0) > 0 && (
                  <div>
                    <h4 className="flex items-center space-x-2 font-medium text-gray-700 mb-3">
                      <Github className="h-4 w-4" />
                      <span>GitHub Improvements</span>
                    </h4>
                    <div className="space-y-2">
                      {(profile.profileData?.github?.suggestions || []).map((suggestion, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                          <span className="text-sm text-blue-800">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* LinkedIn Suggestions */}
                {(profile.profileData?.linkedin?.suggestions?.length || 0) > 0 && (
                  <div>
                    <h4 className="flex items-center space-x-2 font-medium text-gray-700 mb-3">
                      <Linkedin className="h-4 w-4" />
                      <span>LinkedIn Improvements</span>
                    </h4>
                    <div className="space-y-2">
                      {(profile.profileData?.linkedin?.suggestions || []).map((suggestion, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                          <span className="text-sm text-blue-800">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Professional Experience & Education */}
          {profile.profileData?.linkedin?.connected && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Experience */}
              {(profile.profileData?.linkedin?.experience?.length || 0) > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Briefcase className="h-5 w-5 mr-2" />
                    Experience
                  </h3>
                  <div className="space-y-4">
                    {(profile.profileData.linkedin.experience || []).slice(0, 3).map((exp: any, index) => (
                      <div key={index} className="border-l-2 border-blue-200 pl-4">
                        <h4 className="font-medium text-gray-900">{exp.title}</h4>
                        <p className="text-sm text-blue-600">{exp.company}</p>
                        {exp.duration && (
                          <p className="text-xs text-gray-500">{exp.duration}</p>
                        )}
                        {exp.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Education */}
              {(profile.profileData?.linkedin?.education?.length || 0) > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Education
                  </h3>
                  <div className="space-y-4">
                    {(profile.profileData.linkedin.education || []).slice(0, 3).map((edu: any, index) => (
                      <div key={index} className="border-l-2 border-purple-200 pl-4">
                        <h4 className="font-medium text-gray-900">{edu.school}</h4>
                        {edu.degree && (
                          <p className="text-sm text-purple-600">{edu.degree}</p>
                        )}
                        {edu.field && (
                          <p className="text-xs text-gray-600">{edu.field}</p>
                        )}
                        {edu.years && (
                          <p className="text-xs text-gray-500">{edu.years}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resume Analysis */}
          {profile.profileData?.resume?.uploaded && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3 mb-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold">Resume Analysis</h3>
                <div className="ml-auto text-2xl font-bold text-green-600">
                  {profile.profileData.resume.score || 0}
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                Professional resume analysis completed with detailed ATS compatibility scoring.
              </div>
            </div>
          )}

          {/* Strengths & Weaknesses Summary */}
          {profile.profileData?.linkedin?.connected && (
            (profile.profileData.linkedin.strengths?.length || 0) > 0 || (profile.profileData.linkedin.weaknesses?.length || 0) > 0
          ) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Professional Analysis Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                {(profile.profileData.linkedin.strengths?.length || 0) > 0 && (
                  <div>
                    <h4 className="flex items-center space-x-2 font-medium text-green-700 mb-3">
                      <CheckCircle className="h-5 w-5" />
                      <span>Key Strengths</span>
                    </h4>
                    <div className="space-y-2">
                      {(profile.profileData.linkedin.strengths || []).map((strength, index) => (
                        <div key={index} className="flex items-start space-x-3 p-2 bg-green-50 rounded">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-green-800">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Areas for Improvement */}
                {(profile.profileData.linkedin.weaknesses?.length || 0) > 0 && (
                  <div>
                    <h4 className="flex items-center space-x-2 font-medium text-yellow-700 mb-3">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Areas for Growth</span>
                    </h4>
                    <div className="space-y-2">
                      {(profile.profileData.linkedin.weaknesses || []).slice(0, 3).map((weakness, index) => (
                        <div key={index} className="flex items-start space-x-3 p-2 bg-yellow-50 rounded">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-yellow-800">{weakness}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Want to create your own profile?</h2>
          <p className="text-blue-100 mb-6">
            Join ReviewMe to get AI-powered analysis of your GitHub, LinkedIn, and resume.
          </p>
          <Link 
            href="/auth/signup"
            className="inline-flex items-center space-x-2 px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
          >
            <span>Get Started Free</span>
          </Link>
        </div>
      </main>
    </div>
  );
}