import type { FAQ } from '@/types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class FAQCacheManager {
  private static instance: FAQCacheManager;
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly POPULAR_FAQ_TTL = 10 * 60 * 1000; // 10 minutes for popular FAQs

  public static getInstance(): FAQCacheManager {
    if (!FAQCacheManager.instance) {
      FAQCacheManager.instance = new FAQCacheManager();
    }
    return FAQCacheManager.instance;
  }

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.DEFAULT_TTL);
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
  }

  /**
   * Get cache entry if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Check if cache entry exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    const now = Date.now();
    
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache key for popular FAQs
   */
  getPopularFAQsKey(category?: string, limit: number = 20): string {
    return `popular_faqs_${category || 'all'}_${limit}`;
  }

  /**
   * Get cache key for FAQ search
   */
  getSearchKey(query: string, category?: string, limit: number = 10): string {
    // Normalize query for consistent caching
    const normalizedQuery = query.toLowerCase().trim();
    return `search_${normalizedQuery}_${category || 'all'}_${limit}`;
  }

  /**
   * Get cache key for categories
   */
  getCategoriesKey(): string {
    return 'faq_categories';
  }

  /**
   * Get cache key for suggested questions
   */
  getSuggestedQuestionsKey(category: string, limit: number = 10): string {
    return `suggested_${category}_${limit}`;
  }

  /**
   * Cached popular FAQs
   */
  setPopularFAQs(faqs: FAQ[], category?: string, limit: number = 20): void {
    const key = this.getPopularFAQsKey(category, limit);
    this.set(key, faqs, this.POPULAR_FAQ_TTL);
  }

  /**
   * Get cached popular FAQs
   */
  getPopularFAQs(category?: string, limit: number = 20): FAQ[] | null {
    const key = this.getPopularFAQsKey(category, limit);
    return this.get<FAQ[]>(key);
  }

  /**
   * Cache search results
   */
  setSearchResults(query: string, results: any[], category?: string, limit: number = 10): void {
    const key = this.getSearchKey(query, category, limit);
    this.set(key, results);
  }

  /**
   * Get cached search results
   */
  getSearchResults(query: string, category?: string, limit: number = 10): any[] | null {
    const key = this.getSearchKey(query, category, limit);
    return this.get<any[]>(key);
  }

  /**
   * Cache categories
   */
  setCategories(categories: string[]): void {
    const key = this.getCategoriesKey();
    this.set(key, categories, this.POPULAR_FAQ_TTL);
  }

  /**
   * Get cached categories
   */
  getCategories(): string[] | null {
    const key = this.getCategoriesKey();
    return this.get<string[]>(key);
  }

  /**
   * Cache suggested questions
   */
  setSuggestedQuestions(category: string, questions: string[], limit: number = 10): void {
    const key = this.getSuggestedQuestionsKey(category, limit);
    this.set(key, questions, this.POPULAR_FAQ_TTL);
  }

  /**
   * Get cached suggested questions
   */
  getSuggestedQuestions(category: string, limit: number = 10): string[] | null {
    const key = this.getSuggestedQuestionsKey(category, limit);
    return this.get<string[]>(key);
  }

  /**
   * Preload common FAQ data
   */
  async preloadCommonData(): Promise<void> {
    try {
      // Only preload if not already cached
      if (!this.has(this.getPopularFAQsKey())) {
        // This would typically be called from a service or hook
        console.log('Preloading FAQ data...');
      }
    } catch (error) {
      console.error('Failed to preload FAQ data:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: string[];
    oldestEntry?: string;
    newestEntry?: string;
  } {
    const entries = Array.from(this.cache.keys());
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    let oldestEntry: string | undefined;
    let newestEntry: string | undefined;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestEntry = key;
      }
      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
        newestEntry = key;
      }
    }

    return {
      size: this.cache.size,
      entries,
      oldestEntry,
      newestEntry
    };
  }
}

// Auto cleanup every 5 minutes
setInterval(() => {
  FAQCacheManager.getInstance().cleanup();
}, 5 * 60 * 1000);

export const faqCache = FAQCacheManager.getInstance();