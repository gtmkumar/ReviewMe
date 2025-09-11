import { getDbManager } from '@/lib/database';
import type { 
  FAQDocument,
  FAQInteractionDocument,
  ChatSessionDocument
} from '@/lib/database';
import type { FAQ as FAQType, FAQSearchResult } from '@/types';

export class FAQService {
  private static instance: FAQService;
  
  public static getInstance(): FAQService {
    if (!FAQService.instance) {
      FAQService.instance = new FAQService();
    }
    return FAQService.instance;
  }

  /**
   * Search FAQs based on user query with keyword matching and scoring
   */
  async searchFAQs(
    query: string, 
    category?: string, 
    limit: number = 10
  ): Promise<FAQSearchResult[]> {
    try {
      const db = getDbManager();
      
      // Normalize query for better matching
      const normalizedQuery = this.normalizeQuery(query);
      const keywords = this.extractKeywords(normalizedQuery);
      
      // Build search criteria
      const searchCriteria: any = {
        isActive: true
      };
      
      if (category) {
        searchCriteria.category = category;
      }
      
      // Get all active FAQs
      const faqsCollection = await db.getFaqsCollection();
      const faqs = await faqsCollection.find(searchCriteria).toArray();
      
      // Score and rank FAQs based on relevance
      const scoredResults: FAQSearchResult[] = [];
      
      for (const faq of faqs) {
        const score = this.calculateRelevanceScore(faq, query, keywords);
        const matchedKeywords = this.getMatchedKeywords(faq, keywords);
        
        if (score > 0) {
          scoredResults.push({
            faq: this.convertToFAQ(faq),
            score,
            matchedKeywords
          });
        }
      }
      
      // Sort by score (descending) and priority
      scoredResults.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (b.faq as any).priority - (a.faq as any).priority;
      });
      
      return scoredResults.slice(0, limit);
    } catch (error) {
      console.error('Error searching FAQs:', error);
      throw new Error('Failed to search FAQs');
    }
  }

  /**
   * Get popular FAQs by category
   */
  async getPopularFAQs(category?: string, limit: number = 20): Promise<FAQType[]> {
    try {
      const db = getDbManager();
      
      const criteria: any = { isActive: true };
      if (category) {
        criteria.category = category;
      }
      
      const faqs = await db.faqs
        .find(criteria)
        .sort({ 
          helpfulCount: -1, 
          viewCount: -1, 
          priority: -1 
        })
        .limit(limit)
        .toArray();
      
      return faqs.map(faq => this.convertToFAQ(faq));
    } catch (error) {
      console.error('Error fetching popular FAQs:', error);
      throw new Error('Failed to fetch popular FAQs');
    }
  }

  /**
   * Get FAQ by ID and increment view count
   */
  async getFAQById(id: string, sessionId?: string): Promise<FAQType | null> {
    try {
      const db = getDbManager();
      
      const faqsCollection = await db.getFaqsCollection();
      const faq = await faqsCollection.findOne({ 
        _id: id,
        isActive: true 
      });
      
      if (faq) {
        // Increment view count
        await faqsCollection.updateOne(
          { _id: id },
          { $inc: { viewCount: 1 } }
        );
        
        // Track interaction
        if (sessionId) {
          await this.trackFAQInteraction(id, sessionId, 'view');
        }
        
        return this.convertToFAQ(faq);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching FAQ by ID:', error);
      throw new Error('Failed to fetch FAQ');
    }
  }

  /**
   * Get related FAQs
   */
  async getRelatedFAQs(faqId: string, limit: number = 5): Promise<FAQType[]> {
    try {
      const db = getDbManager();
      
      const faqsCollection = await db.getFaqsCollection();
      const faq = await faqsCollection.findOne({ _id: faqId });
      if (!faq || !faq.relatedFaqs?.length) {
        return [];
      }
      
      const relatedFaqs = await faqsCollection
        .find({
          _id: { $in: faq.relatedFaqs },
          isActive: true
        })
        .sort({ priority: -1, helpfulCount: -1 })
        .limit(limit)
        .toArray();
      
      return relatedFaqs.map(f => this.convertToFAQ(f));
    } catch (error) {
      console.error('Error fetching related FAQs:', error);
      return [];
    }
  }

  /**
   * Submit FAQ feedback
   */
  async submitFeedback(
    faqId: string,
    wasHelpful: boolean,
    userId?: string,
    sessionId?: string,
    feedback?: string
  ): Promise<void> {
    try {
      const db = getDbManager();
      
      // Update FAQ counters
      const updateField = wasHelpful ? 'helpfulCount' : 'notHelpfulCount';
      const faqsCollection = await db.getFaqsCollection();
      await faqsCollection.updateOne(
        { _id: faqId },
        { $inc: { [updateField]: 1 } }
      );
      
      // Track interaction
      if (sessionId) {
        await this.trackFAQInteraction(
          faqId, 
          sessionId, 
          wasHelpful ? 'helpful' : 'not_helpful',
          undefined,
          userId
        );
      }
      
      // Store detailed feedback if provided
      if (feedback) {
        const feedbackDoc = {
          faqId,
          userId,
          wasHelpful,
          feedback,
          createdAt: new Date()
        };
        
        // You could create a separate feedback collection if needed
        // await db.faqFeedback.insertOne(feedbackDoc);
      }
    } catch (error) {
      console.error('Error submitting FAQ feedback:', error);
      throw new Error('Failed to submit feedback');
    }
  }

  /**
   * Get FAQ categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const db = getDbManager();
      
      const faqsCollection = await db.getFaqsCollection();
      const categories = await faqsCollection.distinct('category', { isActive: true });
      return categories.sort();
    } catch (error) {
      console.error('Error fetching FAQ categories:', error);
      return [];
    }
  }

  /**
   * Get suggested questions for a category
   */
  async getSuggestedQuestions(category: string, limit: number = 10): Promise<string[]> {
    try {
      const db = getDbManager();
      
      const faqsCollection = await db.getFaqsCollection();
      const faqs = await faqsCollection
        .find({ 
          category, 
          isActive: true 
        })
        .sort({ 
          helpfulCount: -1, 
          viewCount: -1, 
          priority: -1 
        })
        .limit(limit)
        .toArray();
      
      return faqs.map(faq => faq.question);
    } catch (error) {
      console.error('Error fetching suggested questions:', error);
      return [];
    }
  }

  /**
   * Track FAQ interactions for analytics
   */
  private async trackFAQInteraction(
    faqId: string,
    sessionId: string,
    action: 'view' | 'helpful' | 'not_helpful' | 'escalate',
    query?: string,
    userId?: string
  ): Promise<void> {
    try {
      const db = getDbManager();
      
      const interaction: Omit<FAQInteractionDocument, '_id'> = {
        faqId,
        sessionId,
        userId,
        action,
        query,
        timestamp: new Date()
      };
      
      const faqInteractionsCollection = await db.getFaqInteractionsCollection();
      await faqInteractionsCollection.insertOne(interaction);
    } catch (error) {
      console.error('Error tracking FAQ interaction:', error);
      // Don't throw error here as it's not critical
    }
  }

  /**
   * Calculate relevance score for FAQ based on query
   */
  private calculateRelevanceScore(
    faq: FAQDocument, 
    query: string, 
    keywords: string[]
  ): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Exact question match (highest score)
    if (faq.question.toLowerCase().includes(queryLower)) {
      score += 100;
    }
    
    // Exact answer match
    if (faq.answer.toLowerCase().includes(queryLower)) {
      score += 50;
    }
    
    // Keyword matches in FAQ keywords
    const matchedKeywords = faq.keywords.filter(keyword => 
      keywords.some(qKeyword => 
        keyword.toLowerCase().includes(qKeyword) || 
        qKeyword.includes(keyword.toLowerCase())
      )
    );
    score += matchedKeywords.length * 20;
    
    // Tag matches
    const matchedTags = faq.tags.filter(tag =>
      keywords.some(keyword => 
        tag.toLowerCase().includes(keyword) || 
        keyword.includes(tag.toLowerCase())
      )
    );
    score += matchedTags.length * 15;
    
    // Partial word matches in question
    keywords.forEach(keyword => {
      if (faq.question.toLowerCase().includes(keyword)) {
        score += 10;
      }
      if (faq.answer.toLowerCase().includes(keyword)) {
        score += 5;
      }
    });
    
    // Boost score based on FAQ quality metrics
    const qualityBoost = (faq.helpfulCount - faq.notHelpfulCount) * 0.1;
    score += Math.max(0, qualityBoost);
    
    // Priority boost
    score += faq.priority * 2;
    
    return Math.max(0, score);
  }

  /**
   * Get keywords that matched in the FAQ
   */
  private getMatchedKeywords(faq: FAQDocument, keywords: string[]): string[] {
    const matched: string[] = [];
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      // Check in FAQ keywords
      const matchedFaqKeywords = faq.keywords.filter(faqKeyword =>
        faqKeyword.toLowerCase().includes(keywordLower) ||
        keywordLower.includes(faqKeyword.toLowerCase())
      );
      matched.push(...matchedFaqKeywords);
      
      // Check in tags
      const matchedTags = faq.tags.filter(tag =>
        tag.toLowerCase().includes(keywordLower) ||
        keywordLower.includes(tag.toLowerCase())
      );
      matched.push(...matchedTags);
    });
    
    return [...new Set(matched)]; // Remove duplicates
  }

  /**
   * Normalize query for better matching
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'were', 'will', 'with', 'how', 'what', 'when', 'where',
      'why', 'who', 'can', 'could', 'should', 'would', 'do', 'does', 'did',
      'i', 'my', 'me', 'you', 'your'
    ]);
    
    return query
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to 10 keywords
  }

  /**
   * Convert FAQDocument to FAQ type
   */
  private convertToFAQ(doc: FAQDocument): FAQType {
    return {
      id: doc._id!.toString(),
      question: doc.question,
      answer: doc.answer,
      category: doc.category as any,
      tags: doc.tags,
      helpful: doc.helpfulCount,
      notHelpful: doc.notHelpfulCount,
      searchKeywords: doc.keywords,
      relatedQuestions: doc.relatedFaqs,
      createdAt: doc.createdAt,
      updatedAt: doc.lastUpdated
    };
  }

  /**
   * Initialize default FAQs (for development/demo)
   */
  async initializeDefaultFAQs(): Promise<void> {
    try {
      const db = getDbManager();
      
      // Check if FAQs already exist
      const existingCount = await db.faqs.countDocuments();
      if (existingCount > 0) {
        console.log('FAQs already initialized');
        return;
      }
      
      const defaultFAQs: Omit<FAQDocument, '_id'>[] = [
        {
          question: "How do I connect my GitHub account?",
          answer: "To connect your GitHub account, go to your Dashboard and click on the GitHub section. Then click 'Connect GitHub' and authorize the application to access your public repositories and profile information.",
          category: "github",
          subcategory: "setup",
          keywords: ["github", "connect", "account", "setup", "authorization"],
          priority: 10,
          isActive: true,
          viewCount: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          relatedFaqs: [],
          tags: ["setup", "github", "integration"],
          lastUpdated: new Date(),
          createdAt: new Date(),
          createdBy: "system",
          updatedBy: "system"
        },
        {
          question: "How is my profile score calculated?",
          answer: "Your profile score is calculated based on multiple factors including: GitHub activity and repository quality, LinkedIn profile completeness and engagement, resume ATS compatibility and content quality. Each section contributes to your overall score with detailed breakdowns available in each section.",
          category: "general",
          subcategory: "scoring",
          keywords: ["profile", "score", "calculation", "rating", "metrics"],
          priority: 9,
          isActive: true,
          viewCount: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          relatedFaqs: [],
          tags: ["scoring", "metrics", "profile"],
          lastUpdated: new Date(),
          createdAt: new Date(),
          createdBy: "system",
          updatedBy: "system"
        },
        {
          question: "Can I make my profile private?",
          answer: "Yes, you can control your profile visibility in Settings. You can choose to make your profile completely private, or selectively share certain sections like GitHub or LinkedIn data while keeping others private.",
          category: "privacy",
          subcategory: "settings",
          keywords: ["privacy", "private", "profile", "visibility", "settings"],
          priority: 8,
          isActive: true,
          viewCount: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          relatedFaqs: [],
          tags: ["privacy", "settings", "profile"],
          lastUpdated: new Date(),
          createdAt: new Date(),
          createdBy: "system",
          updatedBy: "system"
        },
        {
          question: "What file formats are supported for resume upload?",
          answer: "We support PDF and DOCX formats for resume uploads. PDF is recommended for best results. Maximum file size is 10MB. Make sure your resume has selectable text (not just an image) for accurate parsing.",
          category: "resume",
          subcategory: "upload",
          keywords: ["resume", "upload", "pdf", "docx", "format", "file"],
          priority: 7,
          isActive: true,
          viewCount: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          relatedFaqs: [],
          tags: ["resume", "upload", "format"],
          lastUpdated: new Date(),
          createdAt: new Date(),
          createdBy: "system",
          updatedBy: "system"
        },
        {
          question: "How do I get more credits?",
          answer: "You can earn more credits by: 1) Referring friends (20 credits per successful referral), 2) Completing your profile setup, 3) Regular platform usage, 4) Participating in community features. Premium plans with unlimited credits are also available.",
          category: "billing",
          subcategory: "credits",
          keywords: ["credits", "earn", "referral", "premium", "billing"],
          priority: 6,
          isActive: true,
          viewCount: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          relatedFaqs: [],
          tags: ["credits", "billing", "referral"],
          lastUpdated: new Date(),
          createdAt: new Date(),
          createdBy: "system",
          updatedBy: "system"
        }
      ];
      
      await db.faqs.insertMany(defaultFAQs);
      console.log(`Initialized ${defaultFAQs.length} default FAQs`);
    } catch (error) {
      console.error('Error initializing default FAQs:', error);
    }
  }
}

// Export singleton instance
export const faqService = FAQService.getInstance();