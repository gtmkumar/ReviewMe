import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { z } from 'zod';

const blogFetchSchema = z.object({
  platform: z.enum(['medium', 'dev.to', 'hashnode']),
  profileUrl: z.string().url(),
});

// Dev.to API fetcher
async function fetchDevToArticles(profileUrl: string) {
  try {
    // Extract username from Dev.to URL
    const username = extractUsernameFromUrl(profileUrl);
    
    if (!username) {
      throw new Error('Invalid Dev.to profile URL');
    }

    // Dev.to API endpoint
    const apiUrl = `https://dev.to/api/articles?username=${username}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'ReviewMe/1.0 (Blog Fetcher)',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Dev.to articles: ${response.status}`);
    }

    const rawArticles = await response.json();
    
    // Transform Dev.to articles to our format
    const articles = rawArticles.map((article: any) => ({
      id: `devto-${article.id}`,
      title: article.title,
      description: article.description,
      url: article.url,
      canonical_url: article.canonical_url,
      cover_image: article.cover_image,
      social_image: article.social_image,
      publishedAt: new Date(article.published_timestamp),
      tags: article.tag_list || [],
      readTime: article.reading_time_minutes,
      excerpt: article.description,
      comments_count: article.comments_count,
      public_reactions_count: article.public_reactions_count,
      positive_reactions_count: article.positive_reactions_count,
      user: {
        name: article.user.name,
        username: article.user.username,
        profile_image: article.user.profile_image,
        profile_image_90: article.user.profile_image_90
      },
      created_at: article.created_at,
      published_at: article.published_at,
      readable_publish_date: article.readable_publish_date
    }));
    
    return {
      articles,
      analytics: {
        totalArticles: articles.length,
        averageReadTime: articles.reduce((acc: number, article: any) => acc + (article.readTime || 0), 0) / articles.length,
        topTags: extractTopTags(articles),
        totalReactions: articles.reduce((acc: number, article: any) => acc + (article.public_reactions_count || 0), 0),
        totalComments: articles.reduce((acc: number, article: any) => acc + (article.comments_count || 0), 0),
        publishingFrequency: calculatePublishingFrequency(articles),
        latestPost: articles.length > 0 ? articles[0].publishedAt : null,
        oldestPost: articles.length > 0 ? articles[articles.length - 1].publishedAt : null,
      }
    };
  } catch (error) {
    console.error('Error fetching Dev.to articles:', error);
    throw error;
  }
}

// Enhanced Medium RSS feed parser
async function fetchMediumArticles(profileUrl: string) {
  try {
    // Extract username from Medium URL
    const username = profileUrl.includes('@') 
      ? profileUrl.split('@')[1].split('/')[0]
      : profileUrl.split('/').pop();

    if (!username) {
      throw new Error('Invalid Medium profile URL');
    }

    // Medium RSS feed URL
    const rssUrl = `https://medium.com/feed/@${username}`;
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'ReviewMe/1.0 (Blog Fetcher)',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Medium feed: ${response.status}`);
    }

    const xmlText = await response.text();
    
    // Parse XML to extract articles (simplified parser)
    const articles = parseMediumRSS(xmlText);
    
    return {
      articles,
      analytics: {
        totalArticles: articles.length,
        averageReadTime: articles.reduce((acc, article) => acc + (article.readTime || 0), 0) / articles.length,
        topTags: extractTopTags(articles),
        publishingFrequency: calculatePublishingFrequency(articles),
        latestPost: articles.length > 0 ? articles[0].publishedAt : null,
        oldestPost: articles.length > 0 ? articles[articles.length - 1].publishedAt : null,
      }
    };
  } catch (error) {
    console.error('Error fetching Medium articles:', error);
    throw error;
  }
}

function parseMediumRSS(xmlText: string) {
  // Simple XML parser for Medium RSS
  const articles: any[] = [];
  
  // Extract items using regex (for demo - in production use proper XML parser)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  let index = 0;
  
  while ((match = itemRegex.exec(xmlText)) !== null && index < 10) {
    const itemContent = match[1];
    const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
    const descriptionMatch = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
    
    if (titleMatch && linkMatch) {
      articles.push({
        id: `medium-${index}`,
        title: titleMatch[1],
        url: linkMatch[1],
        publishedAt: pubDateMatch ? new Date(pubDateMatch[1]) : new Date(),
        tags: extractTagsFromDescription(descriptionMatch?.[1] || ''),
        readTime: estimateReadTime(descriptionMatch?.[1] || ''),
        excerpt: extractExcerpt(descriptionMatch?.[1] || ''),
      });
    }
    index++;
  }
  
  return articles;
}

function extractTagsFromDescription(description: string): string[] {
  // Extract tags from Medium post description
  const tagRegex = /#(\w+)/g;
  const matches = description.match(tagRegex) || [];
  return matches.map(tag => tag.replace('#', '')).slice(0, 5);
}

function estimateReadTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.split(' ').length;
  return Math.ceil(wordCount / wordsPerMinute);
}

function extractExcerpt(description: string, maxLength: number = 200): string {
  const cleanText = description.replace(/<[^>]*>/g, '').trim();
  return cleanText.length > maxLength 
    ? cleanText.substring(0, maxLength) + '...' 
    : cleanText;
}

function extractTopTags(articles: any[]): string[] {
  const tagCount: { [key: string]: number } = {};
  
  articles.forEach(article => {
    (article.tags || []).forEach((tag: string) => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });
  
  return Object.entries(tagCount)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([tag]) => tag);
}

function calculatePublishingFrequency(articles: any[]): string {
  if (articles.length < 2) return 'Insufficient data';
  
  const sortedArticles = articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const latestDate = new Date(sortedArticles[0].publishedAt);
  const oldestDate = new Date(sortedArticles[sortedArticles.length - 1].publishedAt);
  
  const timeDiff = latestDate.getTime() - oldestDate.getTime();
  const daysDiff = timeDiff / (1000 * 3600 * 24);
  
  if (daysDiff === 0) return 'Multiple posts today';
  
  const frequency = daysDiff / articles.length;
  
  if (frequency <= 1) return 'Daily';
  if (frequency <= 7) return 'Weekly';
  if (frequency <= 30) return 'Monthly';
  return 'Irregular';
}

// Calculate blog score based on analytics
function calculateBlogScore(analytics: any): number {
  let score = 0;
  
  // Article count (30 points)
  const articleCount = analytics.totalArticles || 0;
  score += Math.min(articleCount * 3, 30);
  
  // Engagement (40 points) - for dev.to
  if (analytics.totalReactions) {
    score += Math.min(analytics.totalReactions / 10, 20);
  }
  if (analytics.totalComments) {
    score += Math.min(analytics.totalComments / 5, 20);
  }
  
  // Publishing frequency (20 points)
  const frequency = analytics.publishingFrequency;
  if (frequency === 'Daily') score += 20;
  else if (frequency === 'Weekly') score += 15;
  else if (frequency === 'Monthly') score += 10;
  else if (frequency !== 'Insufficient data') score += 5;
  
  // Content diversity (10 points)
  const tagCount = analytics.topTags?.length || 0;
  score += Math.min(tagCount * 2, 10);
  
  return Math.min(score, 100);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { platform, profileUrl } = blogFetchSchema.parse(body);

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Find user
    const usersCollection = await db.getUsersCollection();
    const user = await usersCollection.findOne({ 
      email: session.user.email.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    const userId = user._id.toString();

    try {
      let blogData;
      
      if (platform === 'medium') {
        blogData = await fetchMediumArticles(profileUrl);
      } else if (platform === 'dev.to') {
        blogData = await fetchDevToArticles(profileUrl);
      } else {
        throw new Error(`Platform ${platform} not supported yet`);
      }

      // Calculate blog score
      const blogScore = calculateBlogScore(blogData.analytics);

      // Save blog data to database
      const blogsCollection = await db.getBlogsCollection();
      const result = await blogsCollection.updateOne(
        { userId, platform },
        {
          $set: {
            userId,
            platform,
            profileUrl,
            username: extractUsernameFromUrl(profileUrl),
            articles: blogData.articles,
            analytics: {
              ...blogData.analytics,
              score: blogScore
            },
            lastFetchedAt: new Date(),
            fetchStatus: 'success',
            fetchError: undefined,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          }
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        message: `${platform} blog data fetched successfully`,
        data: {
          platform,
          username: extractUsernameFromUrl(profileUrl),
          articlesCount: blogData.articles.length,
          analytics: {
            ...blogData.analytics,
            score: blogScore
          },
          isNewData: true
        }
      });

    } catch (fetchError: any) {
      // Save error status to database
      const blogsCollection = await db.getBlogsCollection();
      await blogsCollection.updateOne(
        { userId, platform },
        {
          $set: {
            userId,
            platform,
            profileUrl,
            username: extractUsernameFromUrl(profileUrl),
            fetchStatus: 'error',
            fetchError: fetchError.message,
            lastFetchedAt: new Date(),
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
            articles: [],
            analytics: { totalArticles: 0, topTags: [], score: 0 },
          }
        },
        { upsert: true }
      );

      return NextResponse.json(
        { 
          error: `Failed to fetch ${platform} blog data`,
          details: fetchError.message,
          platform
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in blog fetch API:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Initialize database connection
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    // Find user
    const usersCollection = await db.getUsersCollection();
    const user = await usersCollection.findOne({ 
      email: session.user.email.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    // Get all blog data for user
    const blogsCollection = await db.getBlogsCollection();
    const blogs = await blogsCollection.find({ userId: user._id.toString() }).toArray();

    // Transform blogs data to include computed fields
    const transformedBlogs = blogs.map(blog => ({
      ...blog,
      analytics: {
        ...blog.analytics,
        score: blog.analytics?.score || calculateBlogScore(blog.analytics || {})
      },
      // Determine data freshness (within last 24 hours)
      isDataFresh: blog.lastFetchedAt && (new Date().getTime() - new Date(blog.lastFetchedAt).getTime()) < 24 * 60 * 60 * 1000
    }));

    return NextResponse.json({ 
      blogs: transformedBlogs,
      totalPlatforms: transformedBlogs.length,
      totalArticles: transformedBlogs.reduce((acc, blog) => acc + (blog.analytics?.totalArticles || 0), 0)
    });

  } catch (error) {
    console.error('Error fetching blog data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractUsernameFromUrl(url: string): string {
  try {
    // Handle Medium URLs
    if (url.includes('medium.com') && url.includes('@')) {
      return url.split('@')[1].split('/')[0];
    }
    
    // Handle Dev.to URLs
    if (url.includes('dev.to/')) {
      const parts = url.split('dev.to/');
      if (parts.length > 1) {
        return parts[1].split('/')[0];
      }
    }
    
    // Fallback: get last part of URL
    const lastPart = url.split('/').pop() || '';
    return lastPart.replace('@', '');
  } catch {
    return '';
  }
}