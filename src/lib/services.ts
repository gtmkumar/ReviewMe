import { ObjectId } from 'mongodb';
import { getDbManager, UserDocument, UserRequestDocument, ServiceResponseDocument, UserActivityDocument, ReferralDocument } from './database';

// Credit costs for different services
export const CREDIT_COSTS = {
  github: 20,
  linkedin: 15,
  resume: 20,
} as const;

export const REFERRAL_BONUS = 200; // Credits for referrer
export const NEW_USER_REFERRAL_BONUS = 300; // Credits for new user who was referred

// Service types
export type ServiceType = 'github' | 'linkedin' | 'resume';

// Public Username Service
export class PublicUsernameService {
  static generatePublicUsername(firstName: string, lastName: string): string {
    // Remove special characters and spaces, convert to lowercase
    const cleanFirst = firstName.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const cleanLast = lastName.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    // Generate random 6-digit number
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    
    return `${cleanFirst}${cleanLast}${randomNum}`;
  }

  static async createUniquePublicUsername(firstName: string, lastName: string): Promise<string> {
    const db = getDbManager();
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const publicUsername = this.generatePublicUsername(firstName, lastName);
      
      // Check if username already exists
      const existingUser = await db.users.findOne({ publicUsername });
      if (!existingUser) {
        return publicUsername;
      }
      
      attempts++;
    }
    
    // Fallback: use timestamp if all attempts failed
    const timestamp = Date.now();
    return `${firstName.toLowerCase()}${lastName.toLowerCase()}${timestamp}`;
  }
}

// Credit Management Service
export class CreditService {
  static async getUserCredits(userId: string): Promise<number> {
    const db = getDbManager();
    const user = await db.users.findOne({ _id: new ObjectId(userId) });
    return user?.credits || 0;
  }

  static async deductCredits(userId: string, serviceType: ServiceType): Promise<boolean> {
    const db = getDbManager();
    const cost = CREDIT_COSTS[serviceType];
    
    const result = await db.users.updateOne(
      { 
        _id: new ObjectId(userId), 
        credits: { $gte: cost } 
      },
      { 
        $inc: { credits: -cost },
        $set: { updatedAt: new Date() }
      }
    );

    return result.modifiedCount > 0;
  }

  static async addCredits(userId: string, amount: number, reason: string = 'manual'): Promise<void> {
    const db = getDbManager();
    
    await db.users.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $inc: { credits: amount },
        $set: { updatedAt: new Date() }
      }
    );

    // Log the credit addition
    await db.userActivities.insertOne({
      userId,
      sessionId: 'system',
      actionType: 'api_request',
      metadata: {
        creditChange: amount,
        reason,
        newBalance: await this.getUserCredits(userId)
      },
      timestamp: new Date()
    });
  }

  static async checkLowCredits(userId: string): Promise<boolean> {
    const credits = await this.getUserCredits(userId);
    return credits < 20; // Alert threshold
  }
}

// Request Logging Service
export class RequestLogService {
  static async logRequest(
    userId: string,
    serviceType: ServiceType,
    payload: any,
    creditsDeducted: number
  ): Promise<string> {
    const db = getDbManager();
    
    const request: UserRequestDocument = {
      userId,
      serviceType,
      requestPayload: payload,
      creditsDeducted,
      status: 'pending',
      createdAt: new Date()
    };

    const result = await db.userRequests.insertOne(request);
    
    // Update user request count
    const updateField = `requestCounts.${serviceType}`;
    await db.users.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $inc: { [updateField]: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    return result.insertedId.toString();
  }

  static async updateRequestStatus(
    requestId: string,
    status: 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const db = getDbManager();
    
    const updateData: any = {
      status,
      ...(status === 'completed' || status === 'failed' ? { completedAt: new Date() } : {}),
      ...(errorMessage ? { errorMessage } : {})
    };

    await db.userRequests.updateOne(
      { _id: new ObjectId(requestId) },
      { $set: updateData }
    );
  }

  static async logResponse(
    userId: string,
    requestId: string,
    serviceType: ServiceType,
    responseData: any,
    analysisResults?: any,
    processingTime: number = 0
  ): Promise<void> {
    const db = getDbManager();
    
    const response: ServiceResponseDocument = {
      userId,
      requestId,
      serviceType,
      responseData,
      analysisResults,
      processingTime,
      createdAt: new Date()
    };

    await db.serviceResponses.insertOne(response);
  }

  static async getUserRequestHistory(
    userId: string,
    serviceType?: ServiceType,
    limit: number = 50
  ): Promise<(UserRequestDocument & { response?: ServiceResponseDocument })[]> {
    const db = getDbManager();
    
    const filter: any = { userId };
    if (serviceType) {
      filter.serviceType = serviceType;
    }

    const requests = await db.userRequests
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Fetch corresponding responses
    const requestsWithResponses = await Promise.all(
      requests.map(async (request) => {
        const response = await db.serviceResponses.findOne({ 
          requestId: request._id!.toString() 
        });
        return { ...request, response };
      })
    );

    return requestsWithResponses;
  }

  static async getServiceStats(userId: string, serviceType: ServiceType): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageProcessingTime: number;
    lastRequestDate?: Date;
  }> {
    const db = getDbManager();
    
    const requests = await db.userRequests
      .find({ userId, serviceType })
      .toArray();

    const responses = await db.serviceResponses
      .find({ userId, serviceType })
      .toArray();

    const totalRequests = requests.length;
    const successfulRequests = requests.filter(r => r.status === 'completed').length;
    const failedRequests = requests.filter(r => r.status === 'failed').length;
    const averageProcessingTime = responses.length > 0 
      ? responses.reduce((sum, r) => sum + r.processingTime, 0) / responses.length 
      : 0;
    
    const lastRequest = requests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageProcessingTime,
      lastRequestDate: lastRequest?.createdAt
    };
  }
}

// Analytics Service
export class AnalyticsService {
  static async trackActivity(
    userId: string,
    sessionId: string,
    actionType: 'page_view' | 'button_click' | 'file_upload' | 'api_request' | 'navigation',
    metadata?: any
  ): Promise<void> {
    const db = getDbManager();
    
    const activity: UserActivityDocument = {
      userId,
      sessionId,
      actionType,
      metadata,
      timestamp: new Date()
    };

    await db.userActivities.insertOne(activity);
  }

  static async trackPageView(
    userId: string,
    sessionId: string,
    page: string,
    duration?: number,
    previousPage?: string
  ): Promise<void> {
    await this.trackActivity(userId, sessionId, 'page_view', {
      page,
      duration,
      previousPage
    });
  }

  static async trackButtonClick(
    userId: string,
    sessionId: string,
    element: string,
    page: string,
    targetUrl?: string
  ): Promise<void> {
    await this.trackActivity(userId, sessionId, 'button_click', {
      element,
      page,
      targetUrl
    });
  }

  static async getUserAnalytics(userId: string, days: number = 30): Promise<{
    totalSessions: number;
    totalPageViews: number;
    totalClicks: number;
    totalApiRequests: number;
    averageSessionDuration: number;
    topPages: Array<{ page: string; views: number }>;
    activityByDay: Array<{ date: string; activities: number }>;
  }> {
    const db = getDbManager();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await db.userActivities
      .find({ 
        userId, 
        timestamp: { $gte: startDate } 
      })
      .toArray();

    // Calculate metrics
    const uniqueSessions = new Set(activities.map(a => a.sessionId)).size;
    const pageViews = activities.filter(a => a.actionType === 'page_view');
    const clicks = activities.filter(a => a.actionType === 'button_click');
    const apiRequests = activities.filter(a => a.actionType === 'api_request');

    // Calculate average session duration
    const sessionDurations = Object.values(
      pageViews.reduce((acc: any, view) => {
        const sessionId = view.sessionId;
        if (!acc[sessionId]) acc[sessionId] = [];
        acc[sessionId].push(view.metadata?.duration || 0);
        return acc;
      }, {})
    ).map((durations: any) => durations.reduce((a: number, b: number) => a + b, 0));

    const averageSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;

    // Top pages
    const pageStats = pageViews.reduce((acc: any, view) => {
      const page = view.metadata?.page || 'unknown';
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {});

    const topPages = Object.entries(pageStats)
      .map(([page, views]) => ({ page, views: views as number }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Activity by day
    const activityByDay = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayActivities = activities.filter(a => 
        a.timestamp >= dayStart && a.timestamp <= dayEnd
      ).length;

      activityByDay.push({
        date: dayStart.toISOString().split('T')[0],
        activities: dayActivities
      });
    }

    return {
      totalSessions: uniqueSessions,
      totalPageViews: pageViews.length,
      totalClicks: clicks.length,
      totalApiRequests: apiRequests.length,
      averageSessionDuration,
      topPages,
      activityByDay
    };
  }
}

// Referral Service
export class ReferralService {
  static generateReferralCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  static async createReferralCode(userId: string): Promise<string> {
    const db = getDbManager();
    
    // Check if user already has a referral code
    const user = await db.users.findOne({ _id: new ObjectId(userId) });
    if (user?.referralCode) {
      return user.referralCode;
    }

    let referralCode = this.generateReferralCode();
    
    // Ensure uniqueness
    while (await db.users.findOne({ referralCode })) {
      referralCode = this.generateReferralCode();
    }

    // Update user with referral code
    await db.users.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          referralCode,
          updatedAt: new Date()
        }
      }
    );

    return referralCode;
  }

  static async processReferral(referralCode: string, email: string): Promise<string | null> {
    const db = getDbManager();
    
    // Find the referrer
    const referrer = await db.users.findOne({ referralCode });
    if (!referrer) {
      return null;
    }

    // Create referral record
    const referral: ReferralDocument = {
      referrerId: referrer._id!.toString(),
      referralCode,
      email,
      status: 'pending',
      creditsAwarded: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    const result = await db.referrals.insertOne(referral);
    return result.insertedId.toString();
  }

  static async completeReferral(email: string, newUserId: string): Promise<void> {
    const db = getDbManager();
    
    // Find pending referral
    const referral = await db.referrals.findOne({ 
      email, 
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (!referral) return;

    // Update referral status
    await db.referrals.updateOne(
      { _id: referral._id },
      {
        $set: {
          referredUserId: newUserId,
          status: 'completed',
          creditsAwarded: REFERRAL_BONUS,
          completedAt: new Date()
        }
      }
    );

    // Award 200 credits to referrer
    await CreditService.addCredits(
      referral.referrerId, 
      REFERRAL_BONUS, 
      `Referral completed: ${email}`
    );

    // Award 300 credits to new user (in addition to their initial 100)
    await CreditService.addCredits(
      newUserId, 
      NEW_USER_REFERRAL_BONUS, 
      `Welcome bonus for referral signup`
    );

    // Update referrer's total referrals count
    await db.users.updateOne(
      { _id: new ObjectId(referral.referrerId) },
      { 
        $inc: { totalReferrals: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    // Update referred user
    await db.users.updateOne(
      { _id: new ObjectId(newUserId) },
      {
        $set: {
          referredBy: referral.referrerId,
          updatedAt: new Date()
        }
      }
    );
  }

  static async getReferralStats(userId: string): Promise<{
    referralCode: string;
    totalReferrals: number;
    pendingReferrals: number;
    totalCreditsEarned: number;
    recentReferrals: Array<{
      email: string;
      status: string;
      createdAt: Date;
      creditsAwarded: number;
    }>;
  }> {
    const db = getDbManager();
    
    const user = await db.users.findOne({ _id: new ObjectId(userId) });
    const referralCode = user?.referralCode || await this.createReferralCode(userId);
    
    const referrals = await db.referrals
      .find({ referrerId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    const totalReferrals = referrals.filter(r => r.status === 'completed').length;
    const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
    const totalCreditsEarned = referrals.reduce((sum, r) => sum + r.creditsAwarded, 0);

    const recentReferrals = referrals.slice(0, 10).map(r => ({
      email: r.email || 'N/A',
      status: r.status,
      createdAt: r.createdAt,
      creditsAwarded: r.creditsAwarded
    }));

    return {
      referralCode,
      totalReferrals,
      pendingReferrals,
      totalCreditsEarned,
      recentReferrals
    };
  }
}

// Data Cache Service
export class DataCacheService {
  static async getCachedServiceData(userId: string, serviceType: ServiceType): Promise<ServiceResponseDocument | null> {
    const db = getDbManager();
    
    // Get the most recent successful response for this service
    const response = await db.serviceResponses
      .findOne(
        { 
          userId, 
          serviceType
        },
        { 
          sort: { createdAt: -1 } 
        }
      );

    return response;
  }

  static async getAllCachedData(userId: string): Promise<{
    github?: ServiceResponseDocument;
    linkedin?: ServiceResponseDocument;
    resume?: ServiceResponseDocument;
  }> {
    const [github, linkedin, resume] = await Promise.all([
      this.getCachedServiceData(userId, 'github'),
      this.getCachedServiceData(userId, 'linkedin'),
      this.getCachedServiceData(userId, 'resume')
    ]);

    return { github, linkedin, resume };
  }

  static async isDataFresh(userId: string, serviceType: ServiceType, maxAgeHours: number = 24): Promise<boolean> {
    const cachedData = await this.getCachedServiceData(userId, serviceType);
    
    if (!cachedData) return false;
    
    const now = new Date();
    const dataAge = now.getTime() - new Date(cachedData.createdAt).getTime();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
    
    return dataAge < maxAge;
  }
}