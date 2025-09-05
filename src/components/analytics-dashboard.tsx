'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { 
  Calendar, Clock, MousePointer, Eye, TrendingUp, 
  Activity, Users, Target, Zap, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  totalSessions: number;
  totalPageViews: number;
  totalClicks: number;
  totalApiRequests: number;
  averageSessionDuration: number;
  topPages: Array<{ page: string; views: number }>;
  activityByDay: Array<{ date: string; activities: number }>;
}

interface AnalyticsDashboardProps {
  className?: string;
  days?: number;
  compact?: boolean;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function AnalyticsDashboard({ 
  className, 
  days = 30, 
  compact = false 
}: AnalyticsDashboardProps) {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.user?.email) return;
    
    loadAnalytics();
  }, [session, days]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/analytics?days=${days}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load analytics');
      }
      
      setAnalytics(data.analytics);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const getPageDisplayName = (page: string) => {
    const pageNames: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/dashboard/github': 'GitHub',
      '/dashboard/linkedin': 'LinkedIn',
      '/dashboard/resume': 'Resume',
      '/': 'Home',
      '/auth/signin': 'Sign In',
      '/auth/signup': 'Sign Up'
    };
    return pageNames[page] || page;
  };

  if (isLoading) {
    return (
      <div className={cn("bg-white rounded-lg shadow p-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("bg-white rounded-lg shadow p-6", className)}>
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Failed to load analytics</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button 
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={cn("bg-white rounded-lg shadow p-6", className)}>
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No analytics data available</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("bg-white rounded-lg shadow p-4", className)}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{analytics.totalPageViews}</div>
            <div className="text-sm text-gray-500">Page Views</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{analytics.totalClicks}</div>
            <div className="text-sm text-gray-500">Clicks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{analytics.totalSessions}</div>
            <div className="text-sm text-gray-500">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatDuration(analytics.averageSessionDuration / 1000 / 60)}
            </div>
            <div className="text-sm text-gray-500">Avg. Duration</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg shadow", className)}>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">User Analytics ({days} days)</h3>
        <p className="text-sm text-gray-500 mt-1">
          Your activity and engagement patterns on the platform
        </p>
      </div>
      
      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">{analytics.totalPageViews}</div>
            <div className="text-sm text-blue-600">Page Views</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <MousePointer className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">{analytics.totalClicks}</div>
            <div className="text-sm text-green-600">Clicks</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-700">{analytics.totalSessions}</div>
            <div className="text-sm text-purple-600">Sessions</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-700">
              {formatDuration(analytics.averageSessionDuration / 1000 / 60)}
            </div>
            <div className="text-sm text-orange-600">Avg. Session</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Activity Timeline */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Daily Activity
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.activityByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number) => [value, 'Activities']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="activities" 
                    stroke="#3B82F6" 
                    fill="#93C5FD" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Pages */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Most Visited Pages
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topPages.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="page" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={getPageDisplayName}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={getPageDisplayName}
                    formatter={(value: number) => [value, 'Views']}
                  />
                  <Bar 
                    dataKey="views" 
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Engagement Summary */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Engagement Summary
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">API Requests:</span>
              <span className="ml-2 font-medium text-gray-900">{analytics.totalApiRequests}</span>
            </div>
            <div>
              <span className="text-gray-600">Click-through Rate:</span>
              <span className="ml-2 font-medium text-gray-900">
                {analytics.totalPageViews > 0 
                  ? `${Math.round((analytics.totalClicks / analytics.totalPageViews) * 100)}%`
                  : '0%'
                }
              </span>
            </div>
            <div>
              <span className="text-gray-600">Pages per Session:</span>
              <span className="ml-2 font-medium text-gray-900">
                {analytics.totalSessions > 0 
                  ? (analytics.totalPageViews / analytics.totalSessions).toFixed(1)
                  : '0'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}