import { getDbManager } from './database';

interface NavigationTrackingEvent {
  userId?: string;
  sessionId: string;
  fromPath: string;
  toPath: string;
  userAgent: string;
  ipAddress: string;
  timestamp: Date;
  isAuthenticated: boolean;
  referrer?: string;
  metadata?: Record<string, any>;
}

interface SecurityAuditEvent {
  type: 'auth_redirect' | 'protected_route_access' | 'unauthorized_attempt' | 'suspicious_activity';
  userId?: string;
  sessionId: string;
  path: string;
  userAgent: string;
  ipAddress: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class NavigationTrackingService {
  private static instance: NavigationTrackingService;

  public static getInstance(): NavigationTrackingService {
    if (!NavigationTrackingService.instance) {
      NavigationTrackingService.instance = new NavigationTrackingService();
    }
    return NavigationTrackingService.instance;
  }

  /**
   * Track user navigation events
   */
  async trackNavigation(event: NavigationTrackingEvent): Promise<void> {
    try {
      const db = getDbManager();
      const navigationTrackingCollection = await db.getNavigationTrackingCollection();
      await navigationTrackingCollection.insertOne({
        ...event,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Failed to track navigation:', error);
      // Don't throw - tracking failures shouldn't break user experience
    }
  }

  /**
   * Track security audit events
   */
  async trackSecurityEvent(event: SecurityAuditEvent): Promise<void> {
    try {
      const db = getDbManager();
      const securityAuditCollection = await db.getSecurityAuditCollection();
      await securityAuditCollection.insertOne({
        ...event,
        createdAt: new Date()
      });

      // Log critical events to console for immediate attention
      if (event.severity === 'critical' || event.severity === 'high') {
        console.warn('Security Event:', {
          type: event.type,
          severity: event.severity,
          path: event.path,
          userId: event.userId,
          details: event.details
        });
      }
    } catch (error) {
      console.error('Failed to track security event:', error);
      // Log critical security tracking failures
      console.error('CRITICAL: Security tracking failure for event:', event.type);
    }
  }

  /**
   * Get navigation patterns for a user
   */
  async getUserNavigationHistory(userId: string, limit: number = 50): Promise<NavigationTrackingEvent[]> {
    try {
      const db = getDbManager();
      const navigationTrackingCollection = await db.getNavigationTrackingCollection();
      const events = await navigationTrackingCollection
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      
      return events;
    } catch (error) {
      console.error('Failed to get user navigation history:', error);
      return [];
    }
  }

  /**
   * Get security events for analysis
   */
  async getSecurityEvents(
    filters: {
      type?: SecurityAuditEvent['type'];
      severity?: SecurityAuditEvent['severity'];
      userId?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {},
    limit: number = 100
  ): Promise<SecurityAuditEvent[]> {
    try {
      const db = getDbManager();
      const query: any = {};

      if (filters.type) query.type = filters.type;
      if (filters.severity) query.severity = filters.severity;
      if (filters.userId) query.userId = filters.userId;
      if (filters.fromDate || filters.toDate) {
        query.timestamp = {};
        if (filters.fromDate) query.timestamp.$gte = filters.fromDate;
        if (filters.toDate) query.timestamp.$lte = filters.toDate;
      }

      const securityAuditCollection = await db.getSecurityAuditCollection();
      const events = await securityAuditCollection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      
      return events;
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  /**
   * Track auth redirect events
   */
  async trackAuthRedirect(details: {
    fromPath: string;
    toPath: string;
    reason: 'already_authenticated' | 'not_authenticated';
    userId?: string;
    sessionId: string;
    userAgent: string;
    ipAddress: string;
  }): Promise<void> {
    await this.trackSecurityEvent({
      type: 'auth_redirect',
      userId: details.userId,
      sessionId: details.sessionId,
      path: details.fromPath,
      userAgent: details.userAgent,
      ipAddress: details.ipAddress,
      timestamp: new Date(),
      details: {
        fromPath: details.fromPath,
        toPath: details.toPath,
        reason: details.reason
      },
      severity: 'low'
    });
  }

  /**
   * Track protected route access attempts
   */
  async trackProtectedRouteAccess(details: {
    path: string;
    isAllowed: boolean;
    userId?: string;
    sessionId: string;
    userAgent: string;
    ipAddress: string;
    authStatus: 'authenticated' | 'unauthenticated' | 'expired';
  }): Promise<void> {
    await this.trackSecurityEvent({
      type: 'protected_route_access',
      userId: details.userId,
      sessionId: details.sessionId,
      path: details.path,
      userAgent: details.userAgent,
      ipAddress: details.ipAddress,
      timestamp: new Date(),
      details: {
        isAllowed: details.isAllowed,
        authStatus: details.authStatus
      },
      severity: details.isAllowed ? 'low' : 'medium'
    });
  }

  /**
   * Track unauthorized access attempts
   */
  async trackUnauthorizedAttempt(details: {
    path: string;
    attemptedAction: string;
    userId?: string;
    sessionId: string;
    userAgent: string;
    ipAddress: string;
    reason: string;
  }): Promise<void> {
    await this.trackSecurityEvent({
      type: 'unauthorized_attempt',
      userId: details.userId,
      sessionId: details.sessionId,
      path: details.path,
      userAgent: details.userAgent,
      ipAddress: details.ipAddress,
      timestamp: new Date(),
      details: {
        attemptedAction: details.attemptedAction,
        reason: details.reason
      },
      severity: 'high'
    });
  }

  /**
   * Detect suspicious activity patterns
   */
  async detectSuspiciousActivity(sessionId: string): Promise<boolean> {
    try {
      const db = getDbManager();
      const recentEvents = await db.securityAudit
        .find({
          sessionId,
          timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
        })
        .toArray();

      // Check for rapid unauthorized attempts
      const unauthorizedAttempts = recentEvents.filter(e => e.type === 'unauthorized_attempt');
      if (unauthorizedAttempts.length >= 5) {
        await this.trackSecurityEvent({
          type: 'suspicious_activity',
          sessionId,
          path: 'multiple',
          userAgent: unauthorizedAttempts[0]?.userAgent || 'unknown',
          ipAddress: unauthorizedAttempts[0]?.ipAddress || 'unknown',
          timestamp: new Date(),
          details: {
            pattern: 'rapid_unauthorized_attempts',
            count: unauthorizedAttempts.length,
            timeframe: '15_minutes'
          },
          severity: 'critical'
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error);
      return false;
    }
  }

  /**
   * Get analytics for navigation patterns
   */
  async getNavigationAnalytics(fromDate: Date, toDate: Date) {
    try {
      const db = getDbManager();
      
      // Most visited pages
      const mostVisited = await db.navigationTracking.aggregate([
        {
          $match: {
            timestamp: { $gte: fromDate, $lte: toDate }
          }
        },
        {
          $group: {
            _id: '$toPath',
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            path: '$_id',
            visits: '$count',
            uniqueUsers: { $size: '$uniqueUsers' }
          }
        },
        {
          $sort: { visits: -1 }
        },
        {
          $limit: 10
        }
      ]).toArray();

      // Authentication status distribution
      const authStats = await db.navigationTracking.aggregate([
        {
          $match: {
            timestamp: { $gte: fromDate, $lte: toDate }
          }
        },
        {
          $group: {
            _id: '$isAuthenticated',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      return {
        mostVisited,
        authStats,
        totalEvents: await db.navigationTracking.countDocuments({
          timestamp: { $gte: fromDate, $lte: toDate }
        })
      };
    } catch (error) {
      console.error('Failed to get navigation analytics:', error);
      return null;
    }
  }
}

export const navigationTracker = NavigationTrackingService.getInstance();
export type { NavigationTrackingEvent, SecurityAuditEvent };