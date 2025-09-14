'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Globe, RefreshCw, Plus, AlertCircle, ExternalLink, Heart, 
  MessageCircle, Calendar, Tag, Clock, User, Database, 
  Zap, Eye, X, Award, TrendingUp, BarChart3
} from 'lucide-react';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import Link from 'next/link';
import Image from 'next/image';

interface BlogUser {
  name: string;
  username: string;
  profile_image?: string;
  profile_image_90?: string;
}

interface BlogArticle {
  id: string;
  title: string;
  description?: string;
  url: string;
  canonical_url?: string;
  cover_image?: string;
  social_image?: string;
  publishedAt: string;
  tags: string[];
  readTime?: number;
  excerpt?: string;
  comments_count?: number;
  public_reactions_count?: number;
  positive_reactions_count?: number;
  user?: BlogUser;
  created_at?: string;
  published_at?: string;
  readable_publish_date?: string;
}

interface BlogData {
  _id: string;
  platform: string;
  profileUrl: string;
  username?: string;
  articles: BlogArticle[];
  analytics: {
    totalArticles: number;
    averageReadTime?: number;
    topTags: string[];
    totalReactions?: number;
    totalComments?: number;
    publishingFrequency?: string;
    latestPost?: string;
    oldestPost?: string;
    score?: number;
  };
  lastFetchedAt: string;
  fetchStatus: 'pending' | 'success' | 'error';
  fetchError?: string;
  isDataFresh?: boolean;
}

// Article Detail Modal Component
function ArticleDetailModal({ article, blog, isOpen, onClose }: {
  article: BlogArticle | null;
  blog: BlogData | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !article || !blog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {article.title}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-1" />
                  <span className="capitalize">{blog.platform}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{article.readable_publish_date || new Date(article.publishedAt).toLocaleDateString()}</span>
                </div>
                {article.readTime && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{article.readTime} min read</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Cover Image */}
        {article.cover_image && (
          <div className="relative h-64 w-full">
            <Image
              src={article.cover_image}
              alt={article.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6">
          {/* Author Info */}
          {article.user && (
            <div className="flex items-center space-x-3 mb-6">
              {article.user.profile_image_90 && (
                <Image
                  src={article.user.profile_image_90}
                  alt={article.user.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                  unoptimized
                />
              )}
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {article.user.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  @{article.user.username}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {article.description && (
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {article.description}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Read Full Article
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Blog Card Component
function BlogCard({ blog, onRefresh, isRefreshing, onArticleClick }: {
  blog: BlogData;
  onRefresh: (platform: string, profileUrl: string) => void;
  isRefreshing: boolean;
  onArticleClick: (article: BlogArticle, blog: BlogData) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow">
      {/* Notification Bar */}
      <div className={`px-4 py-2 text-xs rounded-t-lg ${
        blog.isDataFresh 
          ? 'bg-green-50 text-green-700 border-b border-green-200' 
          : 'bg-blue-50 text-blue-700 border-b border-blue-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {blog.isDataFresh ? (
              <>
                <Zap className="h-3 w-3" />
                <span>Fresh Data</span>
              </>
            ) : (
              <>
                <Database className="h-3 w-3" />
                <span>Saved Data</span>
              </>
            )}
          </div>
          <span>{new Date(blog.lastFetchedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Blog Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Globe className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {blog.platform}
            </span>
            {blog.analytics.score && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Score: {blog.analytics.score}
              </span>
            )}
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
              {Math.round(blog.analytics.averageReadTime || 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Read Time</div>
          </div>
        </div>

        {/* Recent Articles with Images */}
        {blog.articles.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Recent Articles
            </h4>
            {blog.articles.slice(0, 3).map((article, articleIndex) => (
              <div
                key={articleIndex}
                onClick={() => onArticleClick(article, blog)}
                className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                {/* Article Cover Image */}
                {article.cover_image && (
                  <div className="flex-shrink-0">
                    <Image
                      src={article.cover_image}
                      alt={article.title}
                      width={60}
                      height={40}
                      className="object-cover rounded"
                      unoptimized
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {article.title}
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <span>{article.readable_publish_date || new Date(article.publishedAt).toLocaleDateString()}</span>
                    {article.readTime && (
                      <span>{article.readTime} min read</span>
                    )}
                    {article.public_reactions_count !== undefined && (
                      <div className="flex items-center">
                        <Heart className="h-3 w-3 mr-1" />
                        <span>{article.public_reactions_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlogsPage() {
  const { data: session } = useSession();
  const [blogs, setBlogs] = useState<BlogData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newBlogUrl, setNewBlogUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'medium' | 'dev.to' | 'hashnode'>('dev.to');
  const [selectedArticle, setSelectedArticle] = useState<BlogArticle | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<BlogData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      setError(null);
      setSuccess(null);
      
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
        const data = await response.json();
        setNewBlogUrl('');
        setSuccess(`Successfully fetched ${data.data.articlesCount} articles from ${data.data.platform}`);
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
      setError(null);
      setSuccess(null);
      
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
        const data = await response.json();
        setSuccess(`Refreshed ${data.data.articlesCount} articles from ${data.data.platform}`);
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

  const handleArticleClick = (article: BlogArticle, blog: BlogData) => {
    setSelectedArticle(article);
    setSelectedBlog(blog);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedArticle(null);
    setSelectedBlog(null);
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
              <option value="dev.to">Dev.to</option>
              <option value="medium">Medium</option>
              <option value="hashnode">Hashnode</option>
            </select>
            
            <input
              type="url"
              value={newBlogUrl}
              onChange={(e) => setNewBlogUrl(e.target.value)}
              placeholder={selectedPlatform === 'dev.to' ? 'https://dev.to/username' : 'https://medium.com/@username'}
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

        {/* Success/Error Notifications */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Zap className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">{success}</span>
              <button
                onClick={() => setSuccess(null)}
                className="ml-auto text-green-600 hover:text-green-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {blogs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {blogs.reduce((acc, blog) => acc + blog.analytics.totalArticles, 0)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Articles</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <Globe className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {blogs.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Connected Platforms</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round(blogs.reduce((acc, blog) => acc + (blog.analytics.score || 0), 0) / blogs.length) || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Average Score</div>
                </div>
              </div>
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
                onArticleClick={handleArticleClick}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Article Detail Modal */}
      <ArticleDetailModal
        article={selectedArticle}
        blog={selectedBlog}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}
