import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const { articleId } = await params;

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

    // Find article in user's blog data
    const blogsCollection = await db.getBlogsCollection();
    const blogs = await blogsCollection.find({ userId: user._id.toString() }).toArray();

    let foundArticle = null;
    let foundBlog = null;

    for (const blog of blogs) {
      const article = blog.articles?.find((a: any) => a.id === articleId);
      if (article) {
        foundArticle = article;
        foundBlog = blog;
        break;
      }
    }

    if (!foundArticle || !foundBlog) {
      return NextResponse.json(
        { error: 'Article not found' }, 
        { status: 404 }
      );
    }

    // Return article with blog context
    return NextResponse.json({
      article: foundArticle,
      blog: {
        platform: foundBlog.platform,
        username: foundBlog.username,
        profileUrl: foundBlog.profileUrl
      }
    });

  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}