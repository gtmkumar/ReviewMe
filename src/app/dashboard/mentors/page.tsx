'use client';
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Star, Users, Clock, Filter, Search, BookOpen, Github, Linkedin, 
  User, Briefcase, MessageSquare, ArrowLeft, Plus, CreditCard 
} from 'lucide-react';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { cn } from '@/lib/utils';

interface Mentor {
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
  totalSessions: number;
  socialLinks?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  joinedAt: string;
}

interface MentorListResponse {
  mentors: Mentor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    expertise: string[];
    sessionTypes: string[];
    priceRange: {
      min: number;
      max: number;
    };
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

const expertiseNames: Record<string, string> = {
  resume: 'Resume',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  career: 'Career',
  technical: 'Technical',
  interview: 'Interview'
};

export default function MentorsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    expertise: '',
    sessionType: '',
    minPrice: '',
    maxPrice: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [availableFilters, setAvailableFilters] = useState<MentorListResponse['filters']>({
    expertise: [],
    sessionTypes: [],
    priceRange: { min: 89, max: 299 }
  });

  const fetchMentors = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.expertise) params.append('expertise', filters.expertise);
      if (filters.sessionType) params.append('sessionType', filters.sessionType);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

      const response = await fetch(`/api/mentors?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch mentors');
      }

      const data: MentorListResponse = await response.json();
      setMentors(data.mentors);
      setPagination(data.pagination);
      setAvailableFilters(data.filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, []);

  const handleSearch = () => {
    fetchMentors(1);
  };

  const handlePageChange = (newPage: number) => {
    fetchMentors(newPage);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      expertise: '',
      sessionType: '',
      minPrice: '',
      maxPrice: ''
    });
    fetchMentors(1);
  };

  if (status === 'loading') {
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
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Dashboard</span>
                </Link>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Removed Become a Mentor button - now in user dropdown */}
              </div>
            </div>
            
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Users className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-gray-900">Find Your Mentor</h1>
              </div>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Connect with experienced professionals for personalized feedback and guidance on your career journey
              </p>
            </div>
          </div>
          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search mentors by name, role, or company..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors",
                showFilters ? "border-primary bg-primary/10 text-primary" : "border-gray-300 hover:bg-gray-50"
              )}
            >
              <Filter className="h-5 w-5" />
              Filters
            </button>
            <button
              onClick={handleSearch}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expertise Area
                  </label>
                  <select
                    value={filters.expertise}
                    onChange={(e) => setFilters({ ...filters, expertise: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Areas</option>
                    {availableFilters.expertise.map((area) => (
                      <option key={area} value={area}>
                        {expertiseNames[area] || area}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Type
                  </label>
                  <select
                    value={filters.sessionType}
                    onChange={(e) => setFilters({ ...filters, sessionType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    {availableFilters.sessionTypes.map((type) => (
                      <option key={type} value={type}>
                        {sessionTypeNames[type] || type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Price (KTokens)
                  </label>
                  <input
                    type="number"
                    placeholder="89"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Price (KTokens)
                  </label>
                  <input
                    type="number"
                    placeholder="299"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={resetFilters}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Mentors Grid */}
          {!loading && !error && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {mentors.map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-4">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Empty State */}
              {mentors.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No mentors found</h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search criteria or filters
                  </p>
                  <button
                    onClick={resetFilters}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Mentor Card Component
function MentorCard({ mentor }: { mentor: Mentor }) {
  const router = useRouter();

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

  const lowestPrice = Math.min(...mentor.sessionTypes.map(st => st.price));

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            {mentor.avatar ? (
              <Image
                src={mentor.avatar}
                alt={mentor.name}
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
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {mentor.name}
            </h3>
            <p className="text-sm text-gray-600 truncate">
              {mentor.role}
              {mentor.company && ` at ${mentor.company}`}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600 ml-1">
                  {mentor.rating.average > 0 ? mentor.rating.average.toFixed(1) : 'New'}
                </span>
              </div>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-600">
                {mentor.totalSessions} sessions
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-gray-700 text-sm mb-4 line-clamp-3">
          {mentor.bio}
        </p>

        {/* Expertise Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {mentor.expertise.slice(0, 3).map((exp, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
            >
              {getExpertiseIcon(exp.area)}
              {expertiseNames[exp.area] || exp.area}
            </div>
          ))}
          {mentor.expertise.length > 3 && (
            <span className="text-xs text-gray-500 px-2 py-1">
              +{mentor.expertise.length - 3} more
            </span>
          )}
        </div>

        {/* Session Types */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Available Sessions:</p>
          <div className="space-y-1">
            {mentor.sessionTypes.slice(0, 2).map((session, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-700">{session.name}</span>
                <span className="text-primary font-medium">
                  {session.price} tokens
                </span>
              </div>
            ))}
            {mentor.sessionTypes.length > 2 && (
              <p className="text-xs text-gray-500">
                +{mentor.sessionTypes.length - 2} more types
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-sm">
            <span className="text-gray-500">From </span>
            <span className="text-gray-900 font-medium">{lowestPrice} tokens</span>
          </div>
          <Link
            href={`/dashboard/mentors/${mentor.id}`}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}