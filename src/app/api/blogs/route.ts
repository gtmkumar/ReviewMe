import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { z } from 'zod';

const blogFetchSchema = z.object({
  platform: z.enum(['medium', 'dev.to', 'hashnode']),
  profileUrl: z.string().url(),
});

// Medium RSS feed parser
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
    article.tags.forEach((tag: string) => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });
  
  return Object.entries(tagCount)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([tag]) => tag);
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
    const user = await db.users.findOne({ 
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
      } else {
        throw new Error(`Platform ${platform} not supported yet`);
      }

      // Save blog data to database
      await db.blogs.updateOne(
        { userId, platform },
        {
          $set: {
            userId,
            platform,
            profileUrl,
            username: extractUsernameFromUrl(profileUrl),
            articles: blogData.articles,
            analytics: blogData.analytics,
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
        message: 'Blog data fetched successfully',
        data: {
          articlesCount: blogData.articles.length,
          analytics: blogData.analytics,
        }
      });

    } catch (fetchError: any) {
      // Save error status to database
      await db.blogs.updateOne(
        { userId, platform },
        {
          $set: {
            userId,
            platform,
            profileUrl,
            fetchStatus: 'error',
            fetchError: fetchError.message,
            lastFetchedAt: new Date(),
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
            articles: [],
            analytics: { totalArticles: 0, topTags: [] },
          }
        },
        { upsert: true }
      );

      return NextResponse.json(
        { 
          error: 'Failed to fetch blog data',
          details: fetchError.message 
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
    const user = await db.users.findOne({ 
      email: session.user.email.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      );
    }

    // Get all blog data for user
    const blogs = await db.blogs.find({ userId: user._id.toString() }).toArray();

    return NextResponse.json({ blogs });

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
    if (url.includes('@')) {
      return url.split('@')[1].split('/')[0];
    }
    return url.split('/').pop() || '';
  } catch {
    return '';
  }
}