import { getDbManager } from '@/lib/database';
import type { 
  UserQueryDocument,
  ChatSessionDocument
} from '@/lib/database';
import type { ContactFormData, UserQuery } from '@/types';

export class ContactService {
  private static instance: ContactService;
  
  public static getInstance(): ContactService {
    if (!ContactService.instance) {
      ContactService.instance = new ContactService();
    }
    return ContactService.instance;
  }

  /**
   * Submit a contact form query
   */
  async submitContactQuery(
    formData: ContactFormData,
    userId?: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
      sessionId?: string;
      escalatedFromFaq?: boolean;
      previousFaqAttempts?: string[];
    }
  ): Promise<string> {
    try {
      const db = getDbManager();
      await db.connect();
      
      // Check for duplicate submissions (prevent spam)
      const recentSubmission = await this.checkForDuplicateSubmission(
        formData.email, 
        formData.subject,
        5 // 5 minutes
      );
      
      if (recentSubmission) {
        throw new Error('Please wait before submitting another query with the same subject.');
      }
      
      // Auto-categorize based on subject/content
      const category = this.categorizeQuery(formData.subject, formData.message);
      
      // Determine priority based on keywords
      const priority = this.determinePriority(formData.subject, formData.message);
      
      const queryDoc: Omit<UserQueryDocument, '_id'> = {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        category,
        priority,
        status: 'pending',
        tags: this.extractTags(formData.subject, formData.message),
        userId,
        source: 'contact_form',
        isAnonymous: !userId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        metadata: {
          referrer: metadata?.referrer,
          sessionId: metadata?.sessionId,
          escalatedFromFaq: metadata?.escalatedFromFaq || false,
          previousFaqAttempts: metadata?.previousFaqAttempts || []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const userQueriesCollection = await db.getUserQueriesCollection();
      const result = await userQueriesCollection.insertOne(queryDoc);
      const queryId = result.insertedId.toString();
      
      // Send confirmation email (in a real app)
      await this.sendConfirmationEmail(formData.email, formData.name, queryId);
      
      // Notify support team for high priority queries
      if (priority === 'high' || priority === 'urgent') {
        await this.notifySupportTeam(queryDoc);
      }
      
      return queryId;
    } catch (error) {
      console.error('Error submitting contact query:', error);
      throw error;
    }
  }

  /**
   * Get user queries (for admin/support interface)
   */
  async getUserQueries(
    filters?: {
      status?: string;
      priority?: string;
      category?: string;
      assignedTo?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{
    queries: UserQuery[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const db = getDbManager();
      await db.connect();
      
      // Build filter criteria
      const criteria: any = {};
      
      if (filters?.status) criteria.status = filters.status;
      if (filters?.priority) criteria.priority = filters.priority;
      if (filters?.category) criteria.category = filters.category;
      if (filters?.assignedTo) criteria.assignedTo = filters.assignedTo;
      
      if (filters?.dateFrom || filters?.dateTo) {
        criteria.createdAt = {};
        if (filters.dateFrom) criteria.createdAt.$gte = filters.dateFrom;
        if (filters.dateTo) criteria.createdAt.$lte = filters.dateTo;
      }
      
      const skip = (page - 1) * limit;
      
      const userQueriesCollection = await db.getUserQueriesCollection();
      const [queries, total] = await Promise.all([
        userQueriesCollection
          .find(criteria)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        userQueriesCollection.countDocuments(criteria)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        queries: queries.map(doc => this.convertToUserQuery(doc)),
        total,
        page,
        totalPages
      };
    } catch (error) {
      console.error('Error fetching user queries:', error);
      throw new Error('Failed to fetch user queries');
    }
  }

  /**
   * Get query by ID
   */
  async getQueryById(id: string): Promise<UserQuery | null> {
    try {
      const db = getDbManager();
      await db.connect();
      
      const userQueriesCollection = await db.getUserQueriesCollection();
      const query = await userQueriesCollection.findOne({ _id: id });
      
      if (!query) {
        return null;
      }
      
      return this.convertToUserQuery(query);
    } catch (error) {
      console.error('Error fetching query by ID:', error);
      throw new Error('Failed to fetch query');
    }
  }

  /**
   * Update query status and response
   */
  async updateQueryStatus(
    id: string,
    status: 'pending' | 'in_progress' | 'resolved' | 'closed',
    response?: string,
    assignedTo?: string
  ): Promise<void> {
    try {
      const db = getDbManager();
      await db.connect();
      
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      
      if (response) {
        updateData.response = response;
        updateData.respondedAt = new Date();
      }
      
      if (assignedTo) {
        updateData.assignedTo = assignedTo;
      }
      
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedAt = new Date();
      }
      
      const userQueriesCollection = await db.getUserQueriesCollection();
      await userQueriesCollection.updateOne(
        { _id: id },
        { $set: updateData }
      );
      
      // Send notification email to user (in real app)
      if (response) {
        const query = await userQueriesCollection.findOne({ _id: id });
        if (query) {
          await this.sendResponseEmail(query.email, query.name, response);
        }
      }
    } catch (error) {
      console.error('Error updating query status:', error);
      throw new Error('Failed to update query status');
    }
  }

  /**
   * Get query statistics
   */
  async getQueryStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    averageResponseTime: number; // in hours
    resolutionRate: number; // percentage
  }> {
    try {
      const db = getDbManager();
      await db.connect();
      
      const userQueriesCollection = await db.getUserQueriesCollection();
      const [
        total,
        statusStats,
        priorityStats,
        categoryStats,
        responseTimeStats
      ] = await Promise.all([
        userQueriesCollection.countDocuments(),
        userQueriesCollection.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).toArray(),
        userQueriesCollection.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]).toArray(),
        userQueriesCollection.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]).toArray(),
        userQueriesCollection.aggregate([
          {
            $match: { 
              respondedAt: { $exists: true },
              createdAt: { $exists: true }
            }
          },
          {
            $project: {
              responseTime: {
                $divide: [
                  { $subtract: ['$respondedAt', '$createdAt'] },
                  1000 * 60 * 60 // Convert to hours
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avgResponseTime: { $avg: '$responseTime' },
              count: { $sum: 1 }
            }
          }
        ]).toArray()
      ]);
      
      // Process statistics
      const byStatus: Record<string, number> = {};
      statusStats.forEach(stat => {
        byStatus[stat._id] = stat.count;
      });
      
      const byPriority: Record<string, number> = {};
      priorityStats.forEach(stat => {
        byPriority[stat._id] = stat.count;
      });
      
      const byCategory: Record<string, number> = {};
      categoryStats.forEach(stat => {
        byCategory[stat._id || 'uncategorized'] = stat.count;
      });
      
      const averageResponseTime = responseTimeStats.length > 0 
        ? responseTimeStats[0].avgResponseTime || 0 
        : 0;
      
      const resolvedCount = byStatus.resolved || 0;
      const closedCount = byStatus.closed || 0;
      const resolutionRate = total > 0 
        ? ((resolvedCount + closedCount) / total) * 100 
        : 0;
      
      return {
        total,
        byStatus,
        byPriority,
        byCategory,
        averageResponseTime,
        resolutionRate
      };
    } catch (error) {
      console.error('Error fetching query statistics:', error);
      throw new Error('Failed to fetch statistics');
    }
  }

  /**
   * Check for duplicate submissions to prevent spam
   */
  private async checkForDuplicateSubmission(
    email: string, 
    subject: string, 
    minutes: number = 5
  ): Promise<boolean> {
    try {
      const db = getDbManager();
      await db.connect();
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
      
      const userQueriesCollection = await db.getUserQueriesCollection();
      const existingQuery = await userQueriesCollection.findOne({
        email,
        subject,
        createdAt: { $gte: cutoffTime }
      });
      
      return !!existingQuery;
    } catch (error) {
      console.error('Error checking for duplicate submission:', error);
      return false; // Allow submission on error
    }
  }

  /**
   * Auto-categorize query based on content
   */
  private categorizeQuery(subject: string, message: string): string {
    const content = `${subject} ${message}`.toLowerCase();
    
    // Define category keywords
    const categories = {
      'github': ['github', 'repository', 'repo', 'commit', 'code'],
      'linkedin': ['linkedin', 'profile', 'connection', 'network'],
      'resume': ['resume', 'cv', 'upload', 'ats', 'parsing'],
      'billing': ['credit', 'payment', 'bill', 'subscription', 'plan'],
      'account': ['account', 'login', 'password', 'signup', 'register'],
      'privacy': ['privacy', 'data', 'delete', 'gdpr', 'private']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }

  /**
   * Determine priority based on content
   */
  private determinePriority(subject: string, message: string): 'low' | 'medium' | 'high' | 'urgent' {
    const content = `${subject} ${message}`.toLowerCase();
    
    // Urgent keywords
    const urgentKeywords = ['urgent', 'emergency', 'critical', 'broken', 'error', 'bug'];
    if (urgentKeywords.some(keyword => content.includes(keyword))) {
      return 'urgent';
    }
    
    // High priority keywords
    const highKeywords = ['can\'t login', 'payment failed', 'data loss', 'security'];
    if (highKeywords.some(keyword => content.includes(keyword))) {
      return 'high';
    }
    
    // Medium priority keywords
    const mediumKeywords = ['help', 'question', 'issue', 'problem'];
    if (mediumKeywords.some(keyword => content.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Extract tags from content for better organization
   */
  private extractTags(subject: string, message: string): string[] {
    const content = `${subject} ${message}`.toLowerCase();
    const tags: string[] = [];
    
    // Common tag patterns
    const tagPatterns = {
      'technical': ['api', 'code', 'error', 'bug', 'integration'],
      'ui': ['interface', 'design', 'button', 'page', 'display'],
      'data': ['sync', 'import', 'export', 'data', 'information'],
      'feature-request': ['feature', 'request', 'suggest', 'improve', 'enhancement']
    };
    
    for (const [tag, keywords] of Object.entries(tagPatterns)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  /**
   * Send confirmation email (mock implementation)
   */
  private async sendConfirmationEmail(
    email: string, 
    name: string, 
    queryId: string
  ): Promise<void> {
    // In a real application, integrate with email service
    console.log(`Confirmation email sent to ${email} for query ${queryId}`);
    
    // TODO: Integrate with email service like SendGrid, AWS SES, etc.
  }

  /**
   * Send response email (mock implementation)
   */
  private async sendResponseEmail(
    email: string, 
    name: string, 
    response: string
  ): Promise<void> {
    // In a real application, integrate with email service
    console.log(`Response email sent to ${email}`);
    
    // TODO: Integrate with email service
  }

  /**
   * Notify support team for high priority queries
   */
  private async notifySupportTeam(query: Omit<UserQueryDocument, '_id'>): Promise<void> {
    // In a real application, send notifications via Slack, email, etc.
    console.log(`High priority query notification sent: ${query.subject}`);
    
    // TODO: Integrate with notification service
  }

  /**
   * Convert UserQueryDocument to UserQuery type
   */
  private convertToUserQuery(doc: UserQueryDocument): UserQuery {
    return {
      id: doc._id!.toString(),
      name: doc.name,
      email: doc.email,
      subject: doc.subject,
      message: doc.message,
      status: doc.status,
      priority: doc.priority as 'low' | 'medium' | 'high',
      category: doc.category,
      userId: doc.userId,
      assignedTo: doc.assignedTo,
      response: doc.response,
      responseAt: doc.respondedAt,
      resolvedAt: doc.closedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}

// Export singleton instance
export const contactService = ContactService.getInstance();