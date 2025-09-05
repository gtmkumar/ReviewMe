'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  User, Github, Linkedin, ExternalLink, Award, TrendingUp, 
  Building, MapPin, Calendar, Star, Clock, ArrowLeft
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
      username: string;
      profileUrl: string;
      name: string;
      bio: string;
      company: string;
      location: string;
      followers: number;
      following: number;
      publicRepos: number;
      score: {
        overall: number;
      };
    };
    linkedin?: {
      firstName: string;
      lastName: string;
      headline: string;
      location: string;
      score: {
        overall: number;
      };
    };
    resume?: {
      score: {
        overall: number;
      };
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
    
    const scores = [];
    if (profile.profileData.github?.score?.overall) scores.push(profile.profileData.github.score.overall);
    if (profile.profileData.linkedin?.score?.overall) scores.push(profile.profileData.linkedin.score.overall);
    if (profile.profileData.resume?.score?.overall) scores.push(profile.profileData.resume.score.overall);
    
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* GitHub Section */}
          {profile.profileData?.github && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Github className="h-6 w-6 text-gray-900" />
                <h3 className="text-lg font-semibold">GitHub</h3>
                <div className="ml-auto text-2xl font-bold text-gray-900">
                  {profile.profileData.github.score?.overall || 0}
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
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
              
              <a
                href={profile.profileData.github.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span>View Profile</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* LinkedIn Section */}
          {profile.profileData?.linkedin && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Linkedin className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold">LinkedIn</h3>
                <div className="ml-auto text-2xl font-bold text-blue-600">
                  {profile.profileData.linkedin.score?.overall || 0}
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
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
              </div>
            </div>
          )}

          {/* Resume Section */}
          {profile.profileData?.resume && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3 mb-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold">Resume</h3>
                <div className="ml-auto text-2xl font-bold text-green-600">
                  {profile.profileData.resume.score?.overall || 0}
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                Professional resume analysis completed with detailed scoring and recommendations.
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