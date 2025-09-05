'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Globe, ExternalLink, Clock, Tag, RefreshCw, Plus, AlertCircle } from 'lucide-react';
import { DashboardNavigation } from '@/components/dashboard-navigation';

interface BlogArticle {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  author?: string;
  tags: string[];
  readTime?: number;
  excerpt?: string;
  platform: string;
}

interface BlogData {
  platform: string;
  profileUrl: string;
  username?: string;
  articles: BlogArticle[];
  analytics: {
    totalArticles: number;
    averageReadTime?: number;
    topTags: string[];
    publishingFrequency?: string;
    latestPost?: string;
    oldestPost?: string;
  };
  lastFetched: string;
  fetchStatus: 'pending' | 'success' | 'error';
}

// Blog Card Component
function BlogCard({ blog, onRefresh, isRefreshing }: {
  blog: BlogData;
  onRefresh: (platform: string, profileUrl: string) => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow">
      {/* Blog Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Globe className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {blog.platform}
            </span>
          </div>
          <button
            onClick={() => onRefresh(blog.platform, blog.profileUrl)}
            disabled={isRefreshing}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Refresh blog data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <a
          href={blog.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
        >
          {blog.username || 'View Profile'}
          <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </div>

      {/* Analytics */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{blog.analytics.totalArticles}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Articles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {blog.analytics.averageReadTime || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Read Time</div>
          </div>
        </div>

        {/* Top Tags */}
        {blog.analytics.topTags.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Top Tags
            </h4>
            <div className="flex flex-wrap gap-1">
              {blog.analytics.topTags.slice(0, 6).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Publishing Frequency */}
        {blog.analytics.publishingFrequency && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Publishing:</span> {blog.analytics.publishingFrequency}
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-4 flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Updated {new Date(blog.lastFetched).toLocaleDateString()}
        </div>
      </div>

      {/* Recent Articles */}
      {blog.articles.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Recent Articles
            </h4>
            <div className="space-y-2">
              {blog.articles.slice(0, 3).map((article, articleIndex) => (
                <a
                  key={articleIndex}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {article.title}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {new Date(article.publishedAt).toLocaleDateString()}
                    {article.readTime && (
                      <span className="ml-2">{article.readTime} min read</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogsPage() {
  const { data: session } = useSession();
  const [blogs, setBlogs] = useState<BlogData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBlogUrl, setNewBlogUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'medium' | 'dev.to' | 'hashnode'>('medium');

  useEffect(() => {
    if (session?.user) {
      fetchBlogs();
    }
  }, [session]);

  const fetchBlogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/blogs');
      if (response.ok) {
        const data = await response.json();
        setBlogs(data.blogs || []);
      } else {
        setError('Failed to fetch blogs');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const addNewBlog = async () => {
    if (!newBlogUrl.trim()) return;

    try {
      setIsRefreshing(true);
      const response = await fetch('/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          profileUrl: newBlogUrl,
        }),
      });

      if (response.ok) {
        setNewBlogUrl('');
        await fetchBlogs();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add blog');
      }
    } catch (err) {
      setError('Failed to add blog');
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshBlog = async (platform: string, profileUrl: string) => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          profileUrl,
        }),
      });

      if (response.ok) {
        await fetchBlogs();
      } else {
        setError('Failed to refresh blog data');
      }
    } catch (err) {
      setError('Failed to refresh blog data');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardNavigation />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Sign In Required</h2>
            <p className="text-gray-600 dark:text-gray-400">Please sign in to view your blog analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Blog Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and analyze your blog content across different platforms
          </p>
        </div>

        {/* Add New Blog Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Add New Blog
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="medium">Medium</option>
              <option value="dev.to">Dev.to</option>
              <option value="hashnode">Hashnode</option>
            </select>
            
            <input
              type="url"
              value={newBlogUrl}
              onChange={(e) => setNewBlogUrl(e.target.value)}
              placeholder="https://medium.com/@yourusername"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            
            <button
              onClick={addNewBlog}
              disabled={isRefreshing || !newBlogUrl.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Blog
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No blogs connected yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add your first blog platform to start tracking your content analytics
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {blogs.map((blog, index) => (
              <BlogCard
                key={index}
                blog={blog}
                onRefresh={refreshBlog}
                isRefreshing={isRefreshing}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
