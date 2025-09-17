'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Calendar, Clock, User, Star, CheckCircle, XCircle, 
  AlertTriangle, MessageSquare, ExternalLink, Filter,
  Eye, MoreHorizontal
} from 'lucide-react';
import { DashboardNavigation } from '@/components/dashboard-navigation';

interface SessionBooking {
  id: string;
  mentorId: string;
  menteeId: string;
  sessionType: string;
  requestedSlot: {
    date: string;
    startTime: string;
    endTime: string;
  };
  tokensReserved: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  message?: string;
  mentorResponse?: {
    accepted: boolean;
    meetingLink?: string;
    notes?: string;
    respondedAt: string;
  };
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  mentor?: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  mentee?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Session {
  id: string;
  mentorId: string;
  menteeId: string;
  sessionType: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  scheduledAt: string;
  duration: number;
  tokensCharged: number;
  meetingLink?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  mentor?: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  mentee?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

const sessionTypeNames: Record<string, string> = {
  resume_review: 'Resume Review',
  linkedin_review: 'LinkedIn Review',
  github_review: 'GitHub Review',
  career_discussion: 'Career Discussion',
  project_review: 'Project Review',
  interview_prep: 'Interview Prep'
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
  no_show: 'bg-red-100 text-red-800'
};

export default function SessionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [bookings, setBookings] = useState<SessionBooking[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'bookings' | 'sessions' | 'completed'>('bookings');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (session?.user?.id) {
      fetchBookings();
      fetchSessions();
    }
  }, [session?.user?.id]);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/sessions/bookings?role=mentee');
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions?role=mentee');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const filteredBookings = bookings.filter(booking => 
    statusFilter === 'all' || booking.status === statusFilter
  );

  const filteredSessions = sessions.filter(session => {
    if (activeTab === 'sessions') {
      return ['pending', 'confirmed'].includes(session.status) && (statusFilter === 'all' || session.status === statusFilter);
    } else if (activeTab === 'completed') {
      return session.status === 'completed';
    }
    return statusFilter === 'all' || session.status === statusFilter;
  });

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardNavigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Sessions</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your mentoring sessions and booking requests
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'bookings'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Booking Requests ({bookings.length})
                </button>
                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'sessions'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Confirmed Sessions ({sessions.filter(s => ['pending', 'confirmed'].includes(s.status)).length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'completed'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Completed Sessions ({sessions.filter(s => s.status === 'completed').length})
                </button>
              </nav>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Content */}
          {activeTab === 'bookings' ? (
            <div className="space-y-4">
              {filteredBookings.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No booking requests</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {statusFilter === 'all' 
                      ? "You haven't made any booking requests yet."
                      : `No booking requests with status "${statusFilter}".`
                    }
                  </p>
                  <Link
                    href="/dashboard/mentors"
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Browse Mentors
                  </Link>
                </div>
              ) : (
                filteredBookings.map((booking) => (
                  <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          {booking.mentor?.avatar ? (
                            <Image
                              src={booking.mentor.avatar}
                              alt={booking.mentor.name}
                              width={60}
                              height={60}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-15 h-15 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-8 w-8 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {booking.mentor?.name || 'Unknown Mentor'}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                            {booking.mentor?.role || 'Mentor'}
                          </p>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span>{sessionTypeNames[booking.sessionType] || booking.sessionType}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {formatDate(booking.requestedSlot.date)} at{' '}
                                  {formatTime(booking.requestedSlot.startTime)} - {formatTime(booking.requestedSlot.endTime)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{booking.tokensReserved} credits reserved</span>
                            </div>
                          </div>
                          {booking.message && (
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                              <span className="font-medium">Your message:</span> {booking.message}
                            </div>
                          )}
                          {booking.mentorResponse && (
                            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/50 rounded text-sm">
                              <span className="font-medium">Mentor response:</span> {booking.mentorResponse.notes}
                              {booking.mentorResponse.meetingLink && (
                                <div className="mt-1">
                                  <a
                                    href={booking.mentorResponse.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    Join Meeting <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(booking.status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'sessions' ? (
            <div className="space-y-4">
              {filteredSessions.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No confirmed sessions</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You don't have any confirmed sessions yet.
                  </p>
                  <Link
                    href="/dashboard/mentors"
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Book a Session
                  </Link>
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div key={session.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          {session.mentor?.avatar ? (
                            <Image
                              src={session.mentor.avatar}
                              alt={session.mentor.name}
                              width={60}
                              height={60}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-15 h-15 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-8 w-8 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {session.mentor?.name || 'Unknown Mentor'}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[session.status]}`}>
                              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                            {session.mentor?.role || 'Mentor'}
                          </p>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span>{sessionTypeNames[session.sessionType] || session.sessionType}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {(() => {
                                    const { date, time } = formatDateTime(session.scheduledAt);
                                    return `${date} at ${time}`;
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{session.duration} minutes</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{session.tokensCharged} credits charged</span>
                            </div>
                          </div>
                          {session.meetingLink && (
                            <div className="mt-2">
                              <a
                                href={session.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 text-sm"
                              >
                                Join Meeting <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          {session.notes && (
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                              <span className="font-medium">Notes:</span> {session.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(session.status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Completed Sessions Tab
            <div className="space-y-4">
              {sessions.filter(s => s.status === 'completed').length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No completed sessions</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You haven't completed any mentoring sessions yet.
                  </p>
                  <Link
                    href="/dashboard/mentors"
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Book a Session
                  </Link>
                </div>
              ) : (
                sessions.filter(s => s.status === 'completed').map((session) => (
                  <div key={session.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          {session.mentor?.avatar ? (
                            <Image
                              src={session.mentor.avatar}
                              alt={session.mentor.name}
                              width={60}
                              height={60}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-15 h-15 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-8 w-8 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {session.mentor?.name || 'Unknown Mentor'}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[session.status]}`}>
                              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                            {session.mentor?.role || 'Mentor'}
                          </p>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span>{sessionTypeNames[session.sessionType] || session.sessionType}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {(() => {
                                    const { date, time } = formatDateTime(session.scheduledAt);
                                    return `${date} at ${time}`;
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{session.duration} minutes</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{session.tokensCharged} credits charged</span>
                            </div>
                          </div>
                          {session.notes && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                              <span className="font-medium">Session Notes:</span> {session.notes}
                            </div>
                          )}
                          
                          {/* Add feedback/rating section for completed sessions */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Session completed</span>
                              <div className="flex items-center gap-2">
                                <button className="text-primary hover:text-primary/80 text-sm font-medium">
                                  Rate Session
                                </button>
                                <span className="text-gray-300">•</span>
                                <button className="text-primary hover:text-primary/80 text-sm font-medium">
                                  Book Again
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(session.status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}