// Blog Service for fetching and analyzing blog content
export class BlogService {
  private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  private static cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Fetch blogs from various platforms with caching
   */
  static async fetchUserBlogs(userId: string, socialProfiles: any) {
    const blogs = [];
    
    // Fetch Medium blogs
    if (socialProfiles.medium) {
      try {
        const mediumData = await this.fetchMediumBlogs(socialProfiles.medium);
        if (mediumData) {
          blogs.push({
            platform: 'medium',
            ...mediumData
          });
        }
      } catch (error) {
        console.error('Error fetching Medium blogs:', error);
      }
    }

    // Future: Add support for other platforms
    if (socialProfiles.devTo) {
      // TODO: Implement Dev.to fetching
    }

    return blogs;
  }

  /**
   * Fetch Medium articles using RSS feed
   */
  private static async fetchMediumBlogs(profileUrl: string) {
    const cacheKey = `medium-${profileUrl}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if valid
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Extract username from URL
      const username = this.extractMediumUsername(profileUrl);
      if (!username) {
        throw new Error('Invalid Medium profile URL');
      }

      const rssUrl = `https://medium.com/feed/@${username}`;
      
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'ReviewMe/1.0 (+https://reviewme.dev)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const articles = this.parseMediumRSS(xmlText);
      
      const blogData = {
        profileUrl,
        username,
        articles,
        analytics: this.calculateBlogAnalytics(articles),
        lastFetched: new Date(),
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: blogData,
        timestamp: Date.now()
      });

      return blogData;
    } catch (error) {
      console.error('Failed to fetch Medium blogs:', error);
      throw error;
    }
  }

  /**
   * Parse Medium RSS feed XML
   */
  private static parseMediumRSS(xmlText: string) {
    const articles: any[] = [];
    
    try {
      // Simple regex-based parsing for Medium RSS
      const itemRegex = /<item>(.*?)<\/item>/gs;
      const items = xmlText.match(itemRegex) || [];
      
      items.slice(0, 20).forEach((item, index) => {
        const title = this.extractXMLContent(item, 'title');
        const link = this.extractXMLContent(item, 'link');
        const pubDate = this.extractXMLContent(item, 'pubDate');
        const description = this.extractXMLContent(item, 'description');
        const creator = this.extractXMLContent(item, 'dc:creator');
        
        if (title && link) {
          articles.push({
            id: `medium-${Date.now()}-${index}`,
            title: title,
            url: link,
            publishedAt: pubDate ? new Date(pubDate) : new Date(),
            author: creator || 'Unknown',
            tags: this.extractTagsFromContent(description || ''),
            readTime: this.estimateReadTime(description || ''),
            excerpt: this.createExcerpt(description || ''),
            platform: 'medium'
          });
        }
      });
    } catch (error) {
      console.error('Error parsing Medium RSS:', error);
    }
    
    return articles;
  }

  /**
   * Extract content from XML tags
   */
  private static extractXMLContent(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}(?:[^>]*)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/${tag}>`, 's');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract Medium username from profile URL
   */
  private static extractMediumUsername(url: string): string | null {
    try {
      // Handle different Medium URL formats
      if (url.includes('@')) {
        const match = url.match(/@([^\/\?]+)/);
        return match ? match[1] : null;
      }
      
      // Handle medium.com/u/username format
      if (url.includes('/u/')) {
        const match = url.match(/\/u\/([^\/\?]+)/);
        return match ? match[1] : null;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract tags from article content
   */
  private static extractTagsFromContent(content: string): string[] {
    const tags: string[] = [];
    
    // Look for hashtags
    const hashtagRegex = /#(\w+)/g;
    let match;
    while ((match = hashtagRegex.exec(content)) !== null) {
      tags.push(match[1].toLowerCase());
    }
    
    // Look for common tech keywords
    const techKeywords = [
      'javascript', 'typescript', 'react', 'nodejs', 'python', 'java',
      'programming', 'development', 'webdev', 'frontend', 'backend',
      'api', 'database', 'sql', 'nosql', 'mongodb', 'postgresql'
    ];
    
    const lowerContent = content.toLowerCase();
    techKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword) && !tags.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    return tags.slice(0, 5); // Limit to 5 tags
  }

  /**
   * Estimate reading time based on content length
   */
  private static estimateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const plainText = content.replace(/<[^>]*>/g, '');
    const wordCount = plainText.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  /**
   * Create article excerpt
   */
  private static createExcerpt(content: string, maxLength: number = 200): string {
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (plainText.length <= maxLength) {
      return plainText;
    }
    
    return plainText.substring(0, maxLength).trim() + '...';
  }

  /**
   * Calculate blog analytics
   */
  private static calculateBlogAnalytics(articles: any[]) {
    const totalArticles = articles.length;
    const totalReadTime = articles.reduce((sum, article) => sum + (article.readTime || 0), 0);
    const averageReadTime = totalArticles > 0 ? Math.round(totalReadTime / totalArticles) : 0;
    
    // Extract and count all tags
    const tagCounts: { [key: string]: number } = {};
    articles.forEach(article => {
      article.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    // Get top 10 tags
    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([tag]) => tag);
    
    // Calculate publishing frequency
    const dates = articles.map(a => new Date(a.publishedAt));
    const sortedDates = dates.sort((a, b) => b.getTime() - a.getTime());
    
    let publishingFrequency = 'irregular';
    if (sortedDates.length >= 2) {
      const daysDiff = (sortedDates[0].getTime() - sortedDates[sortedDates.length - 1].getTime()) / (1000 * 60 * 60 * 24);
      const avgDaysBetweenPosts = daysDiff / (sortedDates.length - 1);
      
      if (avgDaysBetweenPosts <= 7) publishingFrequency = 'weekly';
      else if (avgDaysBetweenPosts <= 30) publishingFrequency = 'monthly';
      else if (avgDaysBetweenPosts <= 90) publishingFrequency = 'quarterly';
    }
    
    return {
      totalArticles,
      averageReadTime,
      topTags,
      publishingFrequency,
      latestPost: sortedDates[0] || null,
      oldestPost: sortedDates[sortedDates.length - 1] || null,
    };
  }

  /**
   * Validate social profile URLs
   */
  static validateSocialUrls(socialProfiles: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate Medium URL
    if (socialProfiles.medium) {
      if (!this.isValidMediumUrl(socialProfiles.medium)) {
        errors.push('Invalid Medium profile URL. Expected format: https://medium.com/@username');
      }
    }
    
    // Validate GitHub URL
    if (socialProfiles.github) {
      if (!this.isValidGitHubUrl(socialProfiles.github)) {
        errors.push('Invalid GitHub profile URL. Expected format: https://github.com/username');
      }
    }
    
    // Validate LinkedIn URL
    if (socialProfiles.linkedin) {
      if (!this.isValidLinkedInUrl(socialProfiles.linkedin)) {
        errors.push('Invalid LinkedIn profile URL. Expected format: https://linkedin.com/in/username');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static isValidMediumUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?medium\.com\/@[\w\-\.]+/i.test(url) ||
           /^https?:\/\/[\w\-]+\.medium\.com/i.test(url);
  }

  private static isValidGitHubUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/?$/i.test(url);
  }

  private static isValidLinkedInUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w\-\.]+\/?$/i.test(url);
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  static clearCache(): void {
    this.cache.clear();
  }
}