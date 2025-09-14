/**
 * Cache entry interface
 */
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
}

// Advanced Caching Service for ReviewMe
export class CacheService {
  private static memoryCache = new Map<string, CacheEntry>();
  private static readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
  
  // Cache configuration by data type
  private static readonly CACHE_CONFIG = {
    blogs: { ttl: 60 * 60 * 1000, maxSize: 1000 }, // 1 hour
    profiles: { ttl: 30 * 60 * 1000, maxSize: 500 }, // 30 minutes
    recommendations: { ttl: 2 * 60 * 60 * 1000, maxSize: 200 }, // 2 hours
    analytics: { ttl: 15 * 60 * 1000, maxSize: 100 }, // 15 minutes
    onboarding: { ttl: 24 * 60 * 60 * 1000, maxSize: 1000 }, // 24 hours
  };

  /**
   * Get cached data with automatic cleanup
   */
  static async get<T>(key: string, type?: keyof typeof CacheService.CACHE_CONFIG): Promise<T | null> {
    // Perform periodic cleanup
    this.cleanup();

    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.data as T;
  }

  /**
   * Set cached data with metadata
   */
  static async set(
    key: string, 
    data: any, 
    type: keyof typeof CacheService.CACHE_CONFIG = 'blogs',
    options?: { ttl?: number; tags?: string[] }
  ): Promise<void> {
    const config = this.CACHE_CONFIG[type];
    const ttl = options?.ttl || config.ttl;
    const tags = options?.tags || [];

    // Check cache size limit
    if (this.memoryCache.size >= config.maxSize) {
      this.evictLRU(config.maxSize * 0.8); // Evict 20% when full
    }

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags,
    };

    this.memoryCache.set(key, entry);
  }

  /**
   * Delete specific cache entry
   */
  static async delete(key: string): Promise<boolean> {
    return this.memoryCache.delete(key);
  }

  /**
   * Clear cache by tags
   */
  static async deleteByTags(tags: string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.memoryCache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Clear entire cache
   */
  static async clear(): Promise<void> {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): CacheStats {
    const entries = Array.from(this.memoryCache.values());
    const now = Date.now();
    
    return {
      totalEntries: entries.length,
      totalSize: this.getMemoryUsage(),
      expiredEntries: entries.filter(entry => now - entry.timestamp > entry.ttl).length,
      avgAccessCount: entries.reduce((sum, entry) => sum + entry.accessCount, 0) / entries.length || 0,
      oldestEntry: Math.min(...entries.map(entry => entry.timestamp)),
      newestEntry: Math.max(...entries.map(entry => entry.timestamp)),
    };
  }

  /**
   * Cleanup expired entries
   */
  private static cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key));
  }

  /**
   * Evict least recently used entries
   */
  private static evictLRU(targetSize: number): void {
    const entries = Array.from(this.memoryCache.entries());
    
    // Sort by last accessed time (oldest first)
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    // Remove oldest entries until we reach target size
    const entriesToRemove = entries.length - targetSize;
    for (let i = 0; i < entriesToRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private static getMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.memoryCache.values()) {
      totalSize += JSON.stringify(entry).length * 2; // Rough estimate
    }
    
    return totalSize;
  }

  /**
   * Blog-specific caching methods
   */
  static async getBlogData(userId: string, platform: string): Promise<any> {
    const key = `blog:${userId}:${platform}`;
    return this.get(key, 'blogs');
  }

  static async setBlogData(userId: string, platform: string, data: any): Promise<void> {
    const key = `blog:${userId}:${platform}`;
    const tags = [`user:${userId}`, `platform:${platform}`, 'blogs'];
    await this.set(key, data, 'blogs', { tags });
  }

  /**
   * Profile-specific caching methods
   */
  static async getProfileData(userId: string): Promise<any> {
    const key = `profile:${userId}`;
    return this.get(key, 'profiles');
  }

  static async setProfileData(userId: string, data: any): Promise<void> {
    const key = `profile:${userId}`;
    const tags = [`user:${userId}`, 'profiles'];
    await this.set(key, data, 'profiles', { tags });
  }

  /**
   * Recommendations caching
   */
  static async getRecommendations(userId: string, type: string): Promise<any> {
    const key = `recommendations:${userId}:${type}`;
    return this.get(key, 'recommendations');
  }

  static async setRecommendations(userId: string, type: string, data: any): Promise<void> {
    const key = `recommendations:${userId}:${type}`;
    const tags = [`user:${userId}`, `type:${type}`, 'recommendations'];
    await this.set(key, data, 'recommendations', { tags });
  }

  /**
   * Analytics caching
   */
  static async getAnalytics(userId: string, timeframe: string): Promise<any> {
    const key = `analytics:${userId}:${timeframe}`;
    return this.get(key, 'analytics');
  }

  static async setAnalytics(userId: string, timeframe: string, data: any): Promise<void> {
    const key = `analytics:${userId}:${timeframe}`;
    const tags = [`user:${userId}`, `timeframe:${timeframe}`, 'analytics'];
    await this.set(key, data, 'analytics', { tags });
  }

  /**
   * Onboarding data caching
   */
  static async getOnboardingData(userId: string): Promise<any> {
    const key = `onboarding:${userId}`;
    return this.get(key, 'onboarding');
  }

  static async setOnboardingData(userId: string, data: any): Promise<void> {
    const key = `onboarding:${userId}`;
    const tags = [`user:${userId}`, 'onboarding'];
    await this.set(key, data, 'onboarding', { tags });
  }

  /**
   * Invalidate user-specific cache
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    await this.deleteByTags([`user:${userId}`]);
  }

  /**
   * Preload cache with commonly accessed data
   */
  static async preloadUserData(userId: string): Promise<void> {
    try {
      // This would typically fetch from database and cache
      const promises = [
        this.getOnboardingData(userId),
        this.getProfileData(userId),
        this.getBlogData(userId, 'medium'),
      ];

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error preloading cache:', error);
    }
  }
}

// Cache statistics interface
interface CacheStats {
  totalEntries: number;
  totalSize: number;
  expiredEntries: number;
  avgAccessCount: number;
  oldestEntry: number;
  newestEntry: number;
}

// Personalization Engine with caching
export class PersonalizationEngine {
  /**
   * Get personalized recommendations with caching
   */
  static async getPersonalizedRecommendations(userId: string, onboardingData: any): Promise<any> {
    const cacheKey = `personalization:${userId}:${this.getDataHash(onboardingData)}`;
    
    // Try to get from cache first
    let recommendations = await CacheService.get(cacheKey, 'recommendations');
    
    if (!recommendations) {
      // Generate fresh recommendations
      recommendations = await this.generateRecommendations(userId, onboardingData);
      
      // Cache the results
      await CacheService.set(cacheKey, recommendations, 'recommendations', {
        tags: [`user:${userId}`, 'personalization']
      });
    }
    
    return recommendations;
  }

  /**
   * Generate personalized dashboard layout
   */
  static async getPersonalizedDashboard(userId: string, preferences: any): Promise<any> {
    const cacheKey = `dashboard:${userId}:${preferences.dashboardLayout || 'default'}`;
    
    let layout = await CacheService.get(cacheKey, 'profiles');
    
    if (!layout) {
      layout = await this.generateDashboardLayout(preferences);
      await CacheService.set(cacheKey, layout, 'profiles', {
        tags: [`user:${userId}`, 'dashboard']
      });
    }
    
    return layout;
  }

  /**
   * Generate content recommendations based on user type and goals
   */
  private static async generateRecommendations(userId: string, onboardingData: any): Promise<any> {
    const { userType, careerGoals, socialProfiles, preferences } = onboardingData;
    
    const recommendations = {
      priorityActions: [] as string[],
      skillDevelopment: [] as string[],
      contentSuggestions: [] as string[],
      networkingOpportunities: [] as string[],
    };

    // Generate recommendations based on user type
    switch (userType) {
      case 'student':
        recommendations.priorityActions = [
          'Complete your LinkedIn profile',
          'Build a portfolio of projects',
          'Connect with classmates and professors',
        ];
        break;
      
      case 'job_seeker':
        recommendations.priorityActions = [
          'Optimize your resume for ATS',
          'Update your LinkedIn with recent experience',
          'Showcase your best projects on GitHub',
        ];
        break;
      
      case 'professional':
        recommendations.priorityActions = [
          'Share your expertise through blog posts',
          'Engage with your professional network',
          'Contribute to open-source projects',
        ];
        break;
    }

    // Add career goal specific recommendations
    if (careerGoals?.includes('Personal Branding')) {
      recommendations.contentSuggestions.push('Start a technical blog on Medium');
    }
    
    if (careerGoals?.includes('Networking')) {
      recommendations.networkingOpportunities.push('Join relevant LinkedIn groups');
    }

    return recommendations;
  }

  /**
   * Generate personalized dashboard layout
   */
  private static async generateDashboardLayout(preferences: any): Promise<any> {
    const layout = {
      layout: preferences.dashboardLayout || 'detailed',
      widgets: [] as string[],
      priorities: [] as string[],
    };

    // Customize based on communication style
    if (preferences.communicationStyle === 'technical') {
      layout.widgets = ['code-stats', 'repo-activity', 'tech-trends'];
    } else if (preferences.communicationStyle === 'casual') {
      layout.widgets = ['quick-wins', 'social-engagement', 'fun-facts'];
    } else {
      layout.widgets = ['profile-score', 'recommendations', 'progress'];
    }

    return layout;
  }

  /**
   * Generate hash for caching
   */
  private static getDataHash(data: any): string {
    return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 8);
  }
}