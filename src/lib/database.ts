import { MongoClient, Db, Collection } from 'mongodb';

export interface UserDocument {
  _id?: string;
  name: string;
  email: string;
  password?: string; // Only for credential users
  avatar?: string;
  emailVerified?: Date;
  image?: string; // For OAuth users
  accounts?: any[]; // NextAuth accounts
  sessions?: any[]; // NextAuth sessions
  credits: number; // Credit balance (default: 100)
  referralCode?: string; // User's referral code
  referredBy?: string; // Who referred this user
  totalReferrals: number; // Number of successful referrals
  publicUsername?: string; // Unique public username for profile URL
  bio?: string; // Short description for public profile
  profilePublic: boolean; // Whether public profile is visible
  requestCounts: {
    github: number;
    linkedin: number;
    resume: number;
  };
  // Onboarding data
  onboardingCompleted: boolean; // Whether user has completed onboarding
  isFirstTimeLogin: boolean; // Track if user has logged in before
  firstLoginAt?: Date; // When user first logged in
  lastLoginAt?: Date; // When user last logged in
  onboardingData?: {
    userType: 'student' | 'professional' | 'job_seeker';
    experience?: string; // Years of experience or level
    industry?: string;
    careerGoals?: string[];
    socialProfiles: {
      github?: string; // GitHub username or URL
      medium?: string; // Medium URL
      linkedin?: string; // LinkedIn URL
      portfolio?: string; // Personal portfolio URL
    };
    preferences: {
      communicationStyle?: 'formal' | 'casual' | 'technical';
      feedbackFrequency?: 'immediate' | 'weekly' | 'monthly';
      privacyLevel?: 'public' | 'private' | 'limited';
    };
    consents: {
      dataCollection: boolean;
      analytics: boolean;
      marketing: boolean;
      profileSharing: boolean;
    };
    completedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileDocument {
  _id?: string;
  userId: string;
  profileScore: number;
  lastAnalyzed?: Date;
  github?: {
    username: string;
    profileUrl: string;
    avatarUrl: string;
    name: string;
    bio: string;
    company: string;
    location: string;
    followers: number;
    following: number;
    publicRepos: number;
    createdAt: Date;
    updatedAt: Date;
    score: {
      overall: number;
      activity: number;
      quality: number;
      collaboration: number;
      documentation: number;
      consistency: number;
    };
    lastSyncedAt: Date;
  };
  linkedin?: {
    firstName: string;
    lastName: string;
    headline: string;
    summary: string;
    location: string;
    industry: string;
    connectionCount: number;
    score: {
      overall: number;
      completeness: number;
      keywords: number;
      engagement: number;
      professional: number;
    };
    lastSyncedAt: Date;
  };
  resume?: {
    fileName: string;
    fileType: 'pdf' | 'docx';
    uploadedAt: Date;
    score: {
      overall: number;
      ats: number;
      keywords: number;
      clarity: number;
      quantification: number;
      formatting: number;
      consistency: number;
    };
    parsedContent: {
      personalInfo: {
        name: string;
        email: string;
        phone: string;
        location: string;
        linkedInUrl?: string;
        githubUrl?: string;
        portfolioUrl?: string;
      };
      summary?: string;
      experience: any[];
      education: any[];
      skills: string[];
      certifications: any[];
      projects: any[];
      languages: any[];
      rawText: string;
    };
  };
  documents: {
    id: string;
    type: 'cover_letter' | 'portfolio' | 'certificate' | 'other';
    fileName: string;
    fileType: string;
    uploadedAt: Date;
    parsedContent?: string;
    analysis?: {
      score: number;
      issues: any[];
      suggestions: string[];
      keywordRelevance: number;
      readabilityScore: number;
    };
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PreferencesDocument {
  _id?: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    weeklyDigest: boolean;
    blogUpdates?: boolean;
    recommendations?: boolean;
  };
  privacy: {
    profilePublic: boolean;
    analyticsOptOut: boolean;
    socialProfilesVisible?: boolean;
    blogSharingEnabled?: boolean;
  };
  personalization: {
    recommendationTypes?: string[];
    contentPreferences?: string[];
    dashboardLayout?: 'compact' | 'detailed' | 'minimal';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationDocument {
  _id?: string;
  userId: string;
  type: 'github' | 'linkedin' | 'google';
  isConnected: boolean;
  connectedAt?: Date;
  lastSyncedAt?: Date;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubRepositoryDocument {
  _id?: string;
  userId: string;
  githubId: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  watchers: number;
  size: number;
  openIssues: number;
  hasReadme: boolean;
  hasLicense: boolean;
  hasTests: boolean;
  hasDocumentation: boolean;
  defaultBranch: string;
  createdAt: Date;
  updatedAt: Date;
  pushedAt: Date;
  topics: string[];
  collaborators: number;
  commits: number;
  branches: number;
  releases: number;
  lastAnalyzedAt: Date;
}

export interface DocumentDocument {
  _id?: string;
  userId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  type: 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'error';
  uploadedAt: Date;
  processedAt?: Date;
  parsedContent?: any;
  analysis?: any;
  error?: string;
}

export interface RecommendationDocument {
  _id?: string;
  userId: string;
  type: 'github' | 'linkedin' | 'resume' | 'general';
  category: 'profile' | 'content' | 'activity' | 'networking' | 'skills';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionItems: {
    id: string;
    description: string;
    isCompleted: boolean;
    url?: string;
    example?: string;
  }[];
  impactScore: number;
  effortScore: number;
  estimatedTime: string;
  createdAt: Date;
  completedAt?: Date;
  isCompleted: boolean;
  isDismissed: boolean;
}

export interface AnalyticsDocument {
  _id?: string;
  userId: string;
  date: Date;
  scores: {
    overall: number;
    github: number;
    linkedin: number;
    resume: number;
    documents: number;
  };
  metrics: {
    profileViews: number;
    searchAppearances: number;
    connectionRequests: number;
    jobApplications: number;
  };
  improvements: {
    completedRecommendations: number;
    scoreImprovement: number;
    keyAreasImproved: string[];
  };
  createdAt: Date;
}

export interface NotificationDocument {
  _id?: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'recommendation' | 'milestone' | 'digest';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// New schemas for enhanced features
export interface UserRequestDocument {
  _id?: string;
  userId: string;
  serviceType: 'github' | 'linkedin' | 'resume';
  requestPayload: {
    username?: string;
    url?: string;
    fileName?: string;
    fileSize?: number;
    [key: string]: any;
  };
  creditsDeducted: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ServiceResponseDocument {
  _id?: string;
  userId: string;
  requestId: string; // Reference to UserRequestDocument
  serviceType: 'github' | 'linkedin' | 'resume';
  responseData: any; // The actual service response
  analysisResults?: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    [key: string]: any;
  };
  processingTime: number; // Time taken to process in milliseconds
  createdAt: Date;
}

export interface UserActivityDocument {
  _id?: string;
  userId: string;
  sessionId: string;
  actionType: 'page_view' | 'button_click' | 'file_upload' | 'api_request' | 'navigation';
  page?: string;
  element?: string; // Button ID, link, etc.
  metadata?: {
    duration?: number; // For page views
    previousPage?: string;
    targetUrl?: string;
    fileType?: string;
    [key: string]: any;
  };
  timestamp: Date;
}

export interface ReferralDocument {
  _id?: string;
  referrerId: string; // User who made the referral
  referredUserId?: string; // User who was referred (null if pending)
  referralCode: string;
  email?: string; // Email of referred user (before signup)
  status: 'pending' | 'completed' | 'expired';
  creditsAwarded: number;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

export interface BlogDocument {
  _id?: string;
  userId: string;
  platform: 'medium' | 'dev.to' | 'hashnode' | 'other';
  profileUrl: string;
  username?: string;
  articles: {
    id: string;
    title: string;
    url: string;
    publishedAt: Date;
    tags: string[];
    readTime?: number;
    claps?: number;
    responses?: number;
    excerpt?: string;
    thumbnail?: string;
  }[];
  analytics: {
    totalArticles: number;
    totalViews?: number;
    totalClaps?: number;
    averageReadTime?: number;
    topTags: string[];
  };
  lastFetchedAt: Date;
  fetchStatus: 'pending' | 'success' | 'error';
  fetchError?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Contact and Support System
export interface UserQueryDocument {
  _id?: string;
  userId?: string; // Optional for anonymous queries
  name: string;
  email: string;
  subject: string;
  message: string;
  category?: string; // Auto-categorized or manual
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  tags: string[];
  assignedTo?: string; // Support agent ID
  response?: string; // Admin response
  internalNotes?: string[]; // For support team
  ipAddress?: string;
  userAgent?: string;
  source: 'contact_form' | 'chat' | 'email' | 'phone';
  isAnonymous: boolean;
  metadata?: {
    chatSessionId?: string;
    referrer?: string;
    previousFaqAttempts?: string[];
    escalatedFromFaq?: boolean;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
  respondedAt?: Date;
  closedAt?: Date;
}

export interface FAQDocument {
  _id?: string;
  question: string;
  answer: string;
  category: string;
  subcategory?: string;
  keywords: string[]; // For search matching
  priority: number; // Higher priority FAQs shown first
  isActive: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  relatedFaqs: string[]; // FAQ IDs
  tags: string[];
  lastUpdated: Date;
  createdAt: Date;
  createdBy: string; // Admin user ID
  updatedBy: string; // Admin user ID
}

export interface FAQInteractionDocument {
  _id?: string;
  userId?: string; // Optional for anonymous users
  faqId: string;
  sessionId: string;
  action: 'view' | 'helpful' | 'not_helpful' | 'escalate';
  query?: string; // Original user query that led to this FAQ
  timestamp: Date;
  ipAddress?: string;
}

export interface ChatSessionDocument {
  _id?: string;
  sessionId: string;
  userId?: string; // Optional for anonymous users
  messages: {
    id: string;
    type: 'user' | 'bot' | 'system';
    content: string;
    timestamp: Date;
    metadata?: {
      suggestedFaqs?: string[]; // FAQ IDs
      confidence?: number;
      matchedKeywords?: string[];
      [key: string]: any;
    };
  }[];
  status: 'active' | 'escalated' | 'resolved' | 'abandoned';
  escalatedToQuery?: string; // UserQuery ID if escalated
  startedAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Navigation and Security Tracking
export interface NavigationTrackingDocument {
  _id?: string;
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
  createdAt: Date;
}

export interface SecurityAuditDocument {
  _id?: string;
  type: 'auth_redirect' | 'protected_route_access' | 'unauthorized_attempt' | 'suspicious_activity';
  userId?: string;
  sessionId: string;
  path: string;
  userAgent: string;
  ipAddress: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

// Database connection manager
export class DatabaseManager {
  private client: MongoClient;
  private db: Db | undefined;
  private isConnected: boolean = false;

  constructor(uri: string) {
    this.client = new MongoClient(uri);
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.client.connect();
      this.db = this.client.db();
      this.isConnected = true;
      console.log('Connected to MongoDB');
      
      // Create indexes
      await this.createIndexes();
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.close();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('MongoDB disconnection error:', error);
      throw error;
    }
  }

  getDb(): Db {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  // Collection getters
  get users(): Collection<UserDocument> {
    return this.getDb().collection('users');
  }

  get profiles(): Collection<ProfileDocument> {
    return this.getDb().collection('profiles');
  }

  get preferences(): Collection<PreferencesDocument> {
    return this.getDb().collection('preferences');
  }

  get integrations(): Collection<IntegrationDocument> {
    return this.getDb().collection('integrations');
  }

  get repositories(): Collection<GitHubRepositoryDocument> {
    return this.getDb().collection('repositories');
  }

  get documents(): Collection<DocumentDocument> {
    return this.getDb().collection('documents');
  }

  get recommendations(): Collection<RecommendationDocument> {
    return this.getDb().collection('recommendations');
  }

  get analytics(): Collection<AnalyticsDocument> {
    return this.getDb().collection('analytics');
  }

  get notifications(): Collection<NotificationDocument> {
    return this.getDb().collection('notifications');
  }

  get userRequests(): Collection<UserRequestDocument> {
    return this.getDb().collection('userRequests');
  }

  get serviceResponses(): Collection<ServiceResponseDocument> {
    return this.getDb().collection('serviceResponses');
  }

  get userActivities(): Collection<UserActivityDocument> {
    return this.getDb().collection('userActivities');
  }

  get referrals(): Collection<ReferralDocument> {
    return this.getDb().collection('referrals');
  }

  get blogs(): Collection<BlogDocument> {
    return this.getDb().collection('blogs');
  }

  get userQueries(): Collection<UserQueryDocument> {
    return this.getDb().collection('userQueries');
  }

  get faqs(): Collection<FAQDocument> {
    return this.getDb().collection('faqs');
  }

  get faqInteractions(): Collection<FAQInteractionDocument> {
    return this.getDb().collection('faqInteractions');
  }

  get chatSessions(): Collection<ChatSessionDocument> {
    return this.getDb().collection('chatSessions');
  }

  get navigationTracking(): Collection<NavigationTrackingDocument> {
    return this.getDb().collection('navigationTracking');
  }

  get securityAudit(): Collection<SecurityAuditDocument> {
    return this.getDb().collection('securityAudit');
  }

  private async createIndexes(): Promise<void> {
    try {
      // Users indexes
      await this.users.createIndex({ email: 1 }, { unique: true });
      await this.users.createIndex({ createdAt: 1 });

      // Profiles indexes
      await this.profiles.createIndex({ userId: 1 }, { unique: true });
      await this.profiles.createIndex({ profileScore: -1 });
      await this.profiles.createIndex({ lastAnalyzed: -1 });

      // Preferences indexes
      await this.preferences.createIndex({ userId: 1 }, { unique: true });

      // Integrations indexes
      await this.integrations.createIndex({ userId: 1, type: 1 }, { unique: true });
      await this.integrations.createIndex({ lastSyncedAt: -1 });

      // Repositories indexes
      await this.repositories.createIndex({ userId: 1 });
      await this.repositories.createIndex({ githubId: 1 }, { unique: true });
      await this.repositories.createIndex({ language: 1 });
      await this.repositories.createIndex({ stars: -1 });
      await this.repositories.createIndex({ lastAnalyzedAt: -1 });

      // Documents indexes
      await this.documents.createIndex({ userId: 1 });
      await this.documents.createIndex({ type: 1 });
      await this.documents.createIndex({ status: 1 });
      await this.documents.createIndex({ uploadedAt: -1 });

      // Recommendations indexes
      await this.recommendations.createIndex({ userId: 1 });
      await this.recommendations.createIndex({ priority: -1, createdAt: -1 });
      await this.recommendations.createIndex({ type: 1 });
      await this.recommendations.createIndex({ isCompleted: 1 });
      await this.recommendations.createIndex({ isDismissed: 1 });

      // Analytics indexes
      await this.analytics.createIndex({ userId: 1, date: -1 });
      await this.analytics.createIndex({ date: -1 });

      // Notifications indexes
      await this.notifications.createIndex({ userId: 1 });
      await this.notifications.createIndex({ isRead: 1 });
      await this.notifications.createIndex({ createdAt: -1 });
      await this.notifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      // User requests indexes
      await this.userRequests.createIndex({ userId: 1 });
      await this.userRequests.createIndex({ serviceType: 1 });
      await this.userRequests.createIndex({ status: 1 });
      await this.userRequests.createIndex({ createdAt: -1 });
      await this.userRequests.createIndex({ userId: 1, createdAt: -1 });

      // Service responses indexes
      await this.serviceResponses.createIndex({ userId: 1 });
      await this.serviceResponses.createIndex({ requestId: 1 }, { unique: true });
      await this.serviceResponses.createIndex({ serviceType: 1 });
      await this.serviceResponses.createIndex({ createdAt: -1 });
      await this.serviceResponses.createIndex({ userId: 1, serviceType: 1, createdAt: -1 });

      // User activities indexes
      await this.userActivities.createIndex({ userId: 1 });
      await this.userActivities.createIndex({ sessionId: 1 });
      await this.userActivities.createIndex({ actionType: 1 });
      await this.userActivities.createIndex({ timestamp: -1 });
      await this.userActivities.createIndex({ userId: 1, timestamp: -1 });

      // Referrals indexes
      await this.referrals.createIndex({ referrerId: 1 });
      await this.referrals.createIndex({ referredUserId: 1 });
      await this.referrals.createIndex({ referralCode: 1 }, { unique: true });
      await this.referrals.createIndex({ status: 1 });
      await this.referrals.createIndex({ email: 1 });
      await this.referrals.createIndex({ createdAt: -1 });
      await this.referrals.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      // Blogs indexes
      await this.blogs.createIndex({ userId: 1 });
      await this.blogs.createIndex({ platform: 1 });
      await this.blogs.createIndex({ lastFetchedAt: -1 });
      await this.blogs.createIndex({ fetchStatus: 1 });

      // Contact/Support indexes
      await this.userQueries.createIndex({ email: 1 });
      await this.userQueries.createIndex({ status: 1 });
      await this.userQueries.createIndex({ priority: 1 });
      await this.userQueries.createIndex({ createdAt: -1 });
      await this.userQueries.createIndex({ userId: 1 });
      await this.userQueries.createIndex({ category: 1 });
      await this.userQueries.createIndex({ assignedTo: 1 });

      await this.faqs.createIndex({ category: 1 });
      await this.faqs.createIndex({ keywords: 1 });
      await this.faqs.createIndex({ isActive: 1 });
      await this.faqs.createIndex({ priority: -1 });
      await this.faqs.createIndex({ viewCount: -1 });
      await this.faqs.createIndex({ helpfulCount: -1 });

      await this.faqInteractions.createIndex({ faqId: 1 });
      await this.faqInteractions.createIndex({ userId: 1 });
      await this.faqInteractions.createIndex({ sessionId: 1 });
      await this.faqInteractions.createIndex({ timestamp: -1 });

      await this.chatSessions.createIndex({ sessionId: 1 }, { unique: true });
      await this.chatSessions.createIndex({ userId: 1 });
      await this.chatSessions.createIndex({ status: 1 });
      await this.chatSessions.createIndex({ startedAt: -1 });
      await this.chatSessions.createIndex({ lastActivityAt: -1 });

      // Navigation tracking indexes
      await this.navigationTracking.createIndex({ userId: 1 });
      await this.navigationTracking.createIndex({ sessionId: 1 });
      await this.navigationTracking.createIndex({ timestamp: -1 });
      await this.navigationTracking.createIndex({ fromPath: 1 });
      await this.navigationTracking.createIndex({ toPath: 1 });
      await this.navigationTracking.createIndex({ isAuthenticated: 1 });

      // Security audit indexes
      await this.securityAudit.createIndex({ type: 1 });
      await this.securityAudit.createIndex({ severity: 1 });
      await this.securityAudit.createIndex({ userId: 1 });
      await this.securityAudit.createIndex({ sessionId: 1 });
      await this.securityAudit.createIndex({ timestamp: -1 });
      await this.securityAudit.createIndex({ path: 1 });
      await this.securityAudit.createIndex({ ipAddress: 1 });

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }
}

// Singleton instance
let dbManager: DatabaseManager;

export const getDbManager = (uri?: string): DatabaseManager => {
  if (!dbManager) {
    if (!uri) {
      throw new Error('Database URI required for first initialization');
    }
    dbManager = new DatabaseManager(uri);
  }
  return dbManager;
};

// Helper functions for common operations
export const createUser = async (userData: Omit<UserDocument, '_id' | 'createdAt' | 'updatedAt' | 'credits' | 'totalReferrals' | 'requestCounts' | 'onboardingCompleted' | 'isFirstTimeLogin'>): Promise<string> => {
  const db = getDbManager();
  const now = new Date();
  
  const user: UserDocument = {
    ...userData,
    credits: 100, // Initial credit balance
    totalReferrals: 0,
    onboardingCompleted: false, // New users need to complete onboarding
    isFirstTimeLogin: true, // Mark as first-time user
    firstLoginAt: now,
    requestCounts: {
      github: 0,
      linkedin: 0,
      resume: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.users.insertOne(user);
  return result.insertedId.toString();
};

export const createProfile = async (userId: string): Promise<string> => {
  const db = getDbManager();
  const now = new Date();
  
  const profile: ProfileDocument = {
    userId,
    profileScore: 0,
    documents: [],
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.profiles.insertOne(profile);
  return result.insertedId.toString();
};

export const createPreferences = async (userId: string): Promise<string> => {
  const db = getDbManager();
  const now = new Date();
  
  const preferences: PreferencesDocument = {
    userId,
    theme: 'system',
    notifications: {
      email: true,
      push: true,
      weeklyDigest: true,
    },
    privacy: {
      profilePublic: false,
      analyticsOptOut: false,
    },
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.preferences.insertOne(preferences);
  return result.insertedId.toString();
};

export const updateProfileScore = async (userId: string, scores: any): Promise<void> => {
  const db = getDbManager();
  
  await db.profiles.updateOne(
    { userId },
    {
      $set: {
        ...scores,
        lastAnalyzed: new Date(),
        updatedAt: new Date(),
      }
    }
  );
};