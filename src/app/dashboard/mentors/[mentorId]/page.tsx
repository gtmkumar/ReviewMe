'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Star, Clock, MapPin, Calendar, User, BookOpen, Github, Linkedin, 
  Briefcase, MessageSquare, ExternalLink, ThumbsUp, Award, ArrowLeft
} from 'lucide-react';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { cn } from '@/lib/utils';

interface MentorDetail {
  id: string;
  name: string;
  avatar?: string;
  bio: string;
  role: string;
  company?: string;
  yearsOfExperience: number;
  expertise: {
    area: string;
    level: string;
    tags: string[];
  }[];
  sessionTypes: {
    type: string;
    name: string;
    description: string;
    duration: number;
    price: number;
    isActive: boolean;
  }[];
  rating: {
    average: number;
    count: number;
  };
  ratingBreakdown: {
    knowledge: number;
    communication: number;
    helpfulness: number;
    overall: number;
    wouldRecommend: number;
    totalRatings: number;
  };
  totalSessions: number;
  sessionStats: {
    _id: string;
    count: number;
    completed: number;
  }[];
  availability: {
    timezone: string;
    weeklySlots: {
      day: string;
      slots: {
        startTime: string;
        endTime: string;
        isAvailable: boolean;
      }[];
    }[];
  };
  socialLinks?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  preferences: {
    communicationStyle: string;
    sessionPreferences: string[];
  };
  joinedAt: string;
  lastActiveAt: string;
  recentFeedback: {
    sessionQuality: number;
    comments?: string;
    submittedAt: string;
  }[];
}

const sessionTypeNames: Record<string, string> = {
  resume_review: 'Resume Review',
  linkedin_review: 'LinkedIn Review',
  github_review: 'GitHub Review',
  career_discussion: 'Career Discussion',
  project_review: 'Project Review',
  interview_prep: 'Interview Prep'
};

const expertiseNames: Record<string, string> = {
  resume: 'Resume',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  career: 'Career',
  technical: 'Technical',
  interview: 'Interview'
};

const dayNames: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

// ... existing interfaces ...

export default function MentorDetailPage({ params }: { params: { mentorId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mentor, setMentor] = useState<MentorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSessionType, setSelectedSessionType] = useState<string>('');

  useEffect(() => {
    fetchMentorDetails();
  }, [params.mentorId]);

  const fetchMentorDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/mentors/${params.mentorId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch mentor details');
      }
      const data = await response.json();
      setMentor(data.mentor);
      if (data.mentor.sessionTypes.length > 0) {
        setSelectedSessionType(data.mentor.sessionTypes[0].type);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = () => {
    if (!selectedSessionType) {
      alert('Please select a session type');
      return;
    }
    router.push(`/dashboard/mentors/${params.mentorId}/book?sessionType=${selectedSessionType}`);
  };

  const getExpertiseIcon = (area: string) => {
    switch (area) {
      case 'resume': return <BookOpen className="h-4 w-4" />;
      case 'github': return <Github className="h-4 w-4" />;
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'career': return <Briefcase className="h-4 w-4" />;
      case 'interview': return <MessageSquare className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link
                href="/dashboard/mentors"
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Back to Mentors
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Mentor Not Found</h2>
              <p className="text-gray-600 mb-4">The mentor you're looking for doesn't exist.</p>
              <Link
                href="/dashboard/mentors"
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Browse Mentors
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const selectedSession = mentor.sessionTypes.find(st => st.type === selectedSessionType);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard/mentors"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Mentors</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Header */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start gap-6">
                  <div className="relative">
                    {mentor.avatar ? (
                      <Image
                        src={mentor.avatar}
                        alt={mentor.name}
                        width={120}
                        height={120}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-30 h-30 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-16 w-16 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{mentor.name}</h1>
                    <p className="text-xl text-gray-600 mb-2">
                      {mentor.role}
                      {mentor.company && ` at ${mentor.company}`}
                    </p>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-400 fill-current" />
                        <span className="ml-1 text-lg font-medium">
                          {mentor.rating.average > 0 ? mentor.rating.average.toFixed(1) : 'New'}
                        </span>
                        <span className="ml-1 text-gray-600">
                          ({mentor.rating.count} reviews)
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Award className="h-5 w-5 mr-1" />
                        <span>{mentor.totalSessions} sessions completed</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-gray-600">
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-1" />
                        <span>{mentor.yearsOfExperience}+ years experience</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Joined {formatDate(mentor.joinedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed">{mentor.bio}</p>
              </div>

              {/* Expertise */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Expertise</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mentor.expertise.map((exp, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getExpertiseIcon(exp.area)}
                        <h3 className="font-semibold text-gray-900">
                          {expertiseNames[exp.area] || exp.area}
                        </h3>
                        <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                          {exp.level}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {exp.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              {mentor.recentFeedback.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Reviews</h2>
                  <div className="space-y-4">
                    {mentor.recentFeedback.map((feedback, index) => (
                      <div key={index} className="border-l-4 border-primary pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < feedback.sessionQuality
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">
                            {new Date(feedback.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {feedback.comments && (
                          <p className="text-gray-700 text-sm">{feedback.comments}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {mentor.socialLinks && Object.keys(mentor.socialLinks).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect</h2>
                  <div className="flex gap-4">
                    {mentor.socialLinks.linkedin && (
                      <a
                        href={mentor.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-linkedin text-white px-4 py-2 rounded-lg hover:bg-linkedin/90 transition-colors"
                      >
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {mentor.socialLinks.github && (
                      <a
                        href={mentor.socialLinks.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Github className="h-4 w-4" />
                        GitHub
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {mentor.socialLinks.portfolio && (
                      <a
                        href={mentor.socialLinks.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        Portfolio
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Booking Card */}
              <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Book a Session</h3>
                
                {/* Session Type Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Session Type
                  </label>
                  <select
                    value={selectedSessionType}
                    onChange={(e) => setSelectedSessionType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {mentor.sessionTypes.map((session) => (
                      <option key={session.type} value={session.type}>
                        {session.name} - {session.price} tokens
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Session Details */}
                {selectedSession && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {selectedSession.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {selectedSession.description}
                    </p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {selectedSession.duration} minutes
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {selectedSession.price} tokens
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBookSession}
                  className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Book Session
                </button>
              </div>

              {/* Rating Breakdown */}
              {mentor.ratingBreakdown.totalRatings > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Rating Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Knowledge</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(mentor.ratingBreakdown.knowledge / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {mentor.ratingBreakdown.knowledge.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Communication</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(mentor.ratingBreakdown.communication / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {mentor.ratingBreakdown.communication.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Helpfulness</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(mentor.ratingBreakdown.helpfulness / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {mentor.ratingBreakdown.helpfulness.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Would Recommend</span>
                        <span className="text-sm font-medium text-green-600">
                          {mentor.ratingBreakdown.wouldRecommend}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Availability */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Availability</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Timezone: {mentor.availability.timezone}
                </p>
                <div className="space-y-2">
                  {mentor.availability.weeklySlots.map((daySlot, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-700">
                        {dayNames[daySlot.day]}
                      </span>
                      <div className="text-gray-600">
                        {daySlot.slots.filter(slot => slot.isAvailable).length > 0 ? (
                          <span>
                            {daySlot.slots
                              .filter(slot => slot.isAvailable)
                              .map(slot => `${slot.startTime}-${slot.endTime}`)
                              .join(', ')}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not available</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  * Times shown are in mentor's timezone
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}