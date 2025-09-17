'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Star, Clock, ArrowLeft, Calendar, CreditCard, User, CheckCircle, XCircle,
  AlertCircle, CalendarDays, MessageSquare
} from 'lucide-react';
import { DashboardNavigation } from '@/components/dashboard-navigation';

interface MentorDetail {
  id: string;
  name: string;
  avatar?: string;
  bio: string;
  role: string;
  company?: string;
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
}

interface UserProfile {
  credits: number;
  name: string;
  email: string;
}

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  day: string;
}

const sessionTypeNames: Record<string, string> = {
  resume_review: 'Resume Review',
  linkedin_review: 'LinkedIn Review',
  github_review: 'GitHub Review',
  career_discussion: 'Career Discussion',
  project_review: 'Project Review',
  interview_prep: 'Interview Prep'
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

export default function BookSessionPage({ params }: { params: { mentorId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionType = searchParams.get('sessionType');

  const [mentor, setMentor] = useState<MentorDetail | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [params.mentorId, session?.user?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch mentor details
      const mentorResponse = await fetch(`/api/mentors/${params.mentorId}`);
      if (!mentorResponse.ok) {
        throw new Error('Failed to fetch mentor details');
      }
      const mentorData = await mentorResponse.json();
      setMentor(mentorData.mentor);

      // Fetch user profile
      const userResponse = await fetch('/api/user/profile');
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const userData = await userResponse.json();
      setUserProfile(userData);

      // Generate available time slots for the next 7 days
      generateAvailableSlots(mentorData.mentor.availability);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableSlots = (availability: MentorDetail['availability']) => {
    const slots: TimeSlot[] = [];
    const today = new Date();
    
    // Generate slots for the next 14 days
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const daySlots = availability.weeklySlots.find(ws => ws.day === dayName);
      
      if (daySlots) {
        daySlots.slots.forEach(slot => {
          if (slot.isAvailable) {
            slots.push({
              date: date.toISOString().split('T')[0],
              startTime: slot.startTime,
              endTime: slot.endTime,
              day: dayName
            });
          }
        });
      }
    }
    
    setAvailableSlots(slots);
  };

  const handleBookSession = async () => {
    if (!selectedSlot || !mentor || !sessionType) {
      alert('Please select a time slot');
      return;
    }

    const selectedSessionType = mentor.sessionTypes.find(st => st.type === sessionType);
    if (!selectedSessionType) {
      alert('Invalid session type');
      return;
    }

    if (!userProfile || userProfile.credits < selectedSessionType.price) {
      alert(`Insufficient credits. You need ${selectedSessionType.price} credits but only have ${userProfile?.credits || 0}`);
      return;
    }

    try {
      setSubmitting(true);
      
      const bookingData = {
        mentorId: params.mentorId,
        sessionType: sessionType,
        requestedSlot: {
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime
        },
        message: message.trim()
      };

      const response = await fetch('/api/sessions/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const result = await response.json();
      setBookingSuccess(true);
      
      // Refresh user credits
      const userResponse = await fetch('/api/user/profile');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserProfile(userData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book session');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

  if (!sessionType) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Type Required</h2>
              <p className="text-gray-600 mb-4">Please select a session type from the mentor's profile.</p>
              <Link
                href={`/dashboard/mentors/${params.mentorId}`}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Back to Mentor Profile
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
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
                href={`/dashboard/mentors/${params.mentorId}`}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Back to Mentor Profile
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
              <p className="text-gray-600 mb-4">The mentor you're trying to book doesn't exist.</p>
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

  const selectedSessionType = mentor.sessionTypes.find(st => st.type === sessionType);
  
  if (!selectedSessionType) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Type Not Available</h2>
              <p className="text-gray-600 mb-4">This mentor doesn't offer the selected session type.</p>
              <Link
                href={`/dashboard/mentors/${params.mentorId}`}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Back to Mentor Profile
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavigation />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Request Submitted!</h2>
              <p className="text-gray-600 mb-6">
                Your session request has been sent to {mentor.name}. They have 24 hours to respond.
                You'll receive an email notification once they accept or decline.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Booking Details</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Session:</strong> {selectedSessionType.name}</p>
                  <p><strong>Date:</strong> {selectedSlot && formatDate(selectedSlot.date)}</p>
                  <p><strong>Time:</strong> {selectedSlot && `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}`}</p>
                  <p><strong>Credits Reserved:</strong> {selectedSessionType.price}</p>
                  <p><strong>Remaining Credits:</strong> {userProfile?.credits}</p>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/dashboard/sessions"
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  View My Sessions
                </Link>
                <Link
                  href="/dashboard/mentors"
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Browse More Mentors
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4">
              <Link 
                href={`/dashboard/mentors/${params.mentorId}`}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Profile</span>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">Book a Session</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Mentor Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {mentor.avatar ? (
                      <Image
                        src={mentor.avatar}
                        alt={mentor.name}
                        width={80}
                        height={80}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-10 w-10 text-primary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{mentor.name}</h2>
                    <p className="text-gray-600">
                      {mentor.role}
                      {mentor.company && ` at ${mentor.company}`}
                    </p>
                    <div className="flex items-center mt-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm font-medium">
                        {mentor.rating.average > 0 ? mentor.rating.average.toFixed(1) : 'New'}
                      </span>
                      <span className="ml-1 text-sm text-gray-600">
                        ({mentor.rating.count} reviews)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Details */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Session Details</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {selectedSessionType.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedSessionType.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {selectedSessionType.duration} minutes
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {selectedSessionType.price} credits
                    </span>
                  </div>
                </div>
              </div>

              {/* Time Slot Selection */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Select Time Slot</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Times shown are in {mentor.availability.timezone} timezone
                </p>
                
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No available time slots in the next 14 days.</p>
                    <p className="text-sm text-gray-500 mt-1">Please try again later or contact the mentor directly.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          selectedSlot === slot
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">
                          {formatDate(slot.date)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Message (Optional)</h3>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Let the mentor know what you'd like to focus on during the session..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={4}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Credit Balance */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Credit Balance</h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Available Credits:</span>
                  <span className="text-2xl font-bold text-primary">
                    {userProfile?.credits || 0}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Session Cost:</span>
                    <span className="font-medium">
                      {selectedSessionType.price} credits
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">After Booking:</span>
                    <span className={`font-medium ${
                      (userProfile?.credits || 0) >= selectedSessionType.price
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {(userProfile?.credits || 0) - selectedSessionType.price} credits
                    </span>
                  </div>
                </div>
                
                {userProfile && userProfile.credits < selectedSessionType.price && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span className="text-sm text-red-700 font-medium">
                        Insufficient Credits
                      </span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      You need {selectedSessionType.price - userProfile.credits} more credits to book this session.
                    </p>
                  </div>
                )}
              </div>

              {/* Booking Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Summary</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mentor:</span>
                    <span className="font-medium">{mentor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Session:</span>
                    <span className="font-medium">{selectedSessionType.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{selectedSessionType.duration} min</span>
                  </div>
                  {selectedSlot && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">{formatDate(selectedSlot.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium">
                          {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <span className="text-gray-600">Cost:</span>
                    <span className="text-lg font-bold text-primary">
                      {selectedSessionType.price} credits
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleBookSession}
                  disabled={
                    !selectedSlot || 
                    submitting || 
                    !userProfile || 
                    userProfile.credits < selectedSessionType.price
                  }
                  className="w-full mt-6 bg-primary text-white py-3 rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submitting ? 'Booking...' : 'Request Session'}
                </button>
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Credits will be reserved until the mentor responds
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}