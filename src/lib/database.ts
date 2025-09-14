import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

export interface UserDocument {
  _id?: ObjectId | string;
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
  _id?: ObjectId | string;
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
  _id?: ObjectId | string;
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
  _id?: ObjectId | string;
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
  _id?: ObjectId | string;
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
  private _client: MongoClient;
  private db: Db | undefined;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private static instance: DatabaseManager;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000; // 5 seconds
  
  // Getter for the MongoDB client (needed for NextAuth adapter)
  get client(): MongoClient {
    return this._client;
  }

  private constructor(uri: string) {
    this._client = new MongoClient(uri);
  }

  // Singleton pattern implementation
  public static getInstance(uri?: string): DatabaseManager {
    if (!DatabaseManager.instance) {
      if (!uri) {
        throw new Error('Database URI required for first initialization');
      }
      DatabaseManager.instance = new DatabaseManager(uri);
    }
    return DatabaseManager.instance;
  }

  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.isConnected) return;
    
    // If connection is in progress, return the existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create a new connection promise
    this.connectionPromise = new Promise<void>(async (resolve, reject) => {
      try {
        await this._client.connect();
        this.db = this._client.db();
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        console.log('Connected to MongoDB');
        
        // Set up connection monitoring
        this._client.on('close', this.handleDisconnect.bind(this));
        this._client.on('error', this.handleError.bind(this));
        
        // Create indexes
        await this.createIndexes();
        resolve();
      } catch (error) {
        console.error('MongoDB connection error:', error);
        this.connectionPromise = null; // Reset promise on error
        
        // Attempt to reconnect if within retry limits
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
          resolve(); // Resolve anyway to prevent blocking the application
        } else {
          console.error(`Failed to connect to MongoDB after ${this.maxReconnectAttempts} attempts`);
          reject(error);
        }
      }
    });

    return this.connectionPromise;
  }
  
  private handleDisconnect() {
    if (this.isConnected) {
      this.isConnected = false;
      this.connectionPromise = null;
      console.warn('MongoDB connection lost');
      this.attemptReconnect();
    }
  }
  
  private handleError(error: Error) {
    console.error('MongoDB connection error:', error);
    if (this.isConnected) {
      this.isConnected = false;
      this.connectionPromise = null;
      this.attemptReconnect();
    }
  }
  
  private attemptReconnect() {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect to MongoDB (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        this.connectionPromise = null; // Reset the connection promise
        await this.connect();
        console.log('Successfully reconnected to MongoDB');
      } catch (error) {
        console.error('MongoDB reconnection attempt failed:', error);
        // The connect method will handle further reconnection attempts
      }
    }, this.reconnectInterval);
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this._client.close();
      this.isConnected = false;
      this.connectionPromise = null;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('MongoDB disconnection error:', error);
      throw error;
    }
  }

  async getDb(): Promise<Db> {
    if (!this.isConnected || !this.db) {
      // Try to reconnect if not connected
      await this.connect();
      
      if (!this.isConnected || !this.db) {
        throw new Error('Database not connected and reconnection failed');
      }
    }
    return this.db;
  }

  // Collection getters - synchronous versions that use the db property directly
  // These should only be used internally when we know the connection is established
  get users(): Collection<UserDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('users');
  }

  get profiles(): Collection<ProfileDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('profiles');
  }

  get preferences(): Collection<PreferencesDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('preferences');
  }

  get integrations(): Collection<IntegrationDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('integrations');
  }
  
  // Async collection getters - for external use
  async getUsersCollection(): Promise<Collection<UserDocument>> {
    const db = await this.getDb();
    return db.collection('users');
  }
  
  async getProfilesCollection(): Promise<Collection<ProfileDocument>> {
    const db = await this.getDb();
    return db.collection('profiles');
  }
  
  async getPreferencesCollection(): Promise<Collection<PreferencesDocument>> {
    const db = await this.getDb();
    return db.collection('preferences');
  }
  
  async getIntegrationsCollection(): Promise<Collection<IntegrationDocument>> {
    const db = await this.getDb();
    return db.collection('integrations');
  }

  get repositories(): Collection<GitHubRepositoryDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('repositories');
  }

  get documents(): Collection<DocumentDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('documents');
  }

  get recommendations(): Collection<RecommendationDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('recommendations');
  }

  get analytics(): Collection<AnalyticsDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('analytics');
  }

  get notifications(): Collection<NotificationDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('notifications');
  }

  get userRequests(): Collection<UserRequestDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('userRequests');
  }
  
  async getRepositoriesCollection(): Promise<Collection<GitHubRepositoryDocument>> {
    const db = await this.getDb();
    return db.collection('repositories');
  }
  
  async getDocumentsCollection(): Promise<Collection<DocumentDocument>> {
    const db = await this.getDb();
    return db.collection('documents');
  }
  
  async getRecommendationsCollection(): Promise<Collection<RecommendationDocument>> {
    const db = await this.getDb();
    return db.collection('recommendations');
  }
  
  async getAnalyticsCollection(): Promise<Collection<AnalyticsDocument>> {
    const db = await this.getDb();
    return db.collection('analytics');
  }
  
  async getNotificationsCollection(): Promise<Collection<NotificationDocument>> {
    const db = await this.getDb();
    return db.collection('notifications');
  }
  
  async getUserRequestsCollection(): Promise<Collection<UserRequestDocument>> {
    const db = await this.getDb();
    return db.collection('userRequests');
  }

  get serviceResponses(): Collection<ServiceResponseDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('serviceResponses');
  }

  get userActivities(): Collection<UserActivityDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('userActivities');
  }

  get referrals(): Collection<ReferralDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('referrals');
  }

  get blogs(): Collection<BlogDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('blogs');
  }

  get userQueries(): Collection<UserQueryDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('userQueries');
  }

  get faqs(): Collection<FAQDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('faqs');
  }

  get faqInteractions(): Collection<FAQInteractionDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('faqInteractions');
  }

  get chatSessions(): Collection<ChatSessionDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('chatSessions');
  }

  get navigationTracking(): Collection<NavigationTrackingDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('navigationTracking');
  }

  get securityAudit(): Collection<SecurityAuditDocument> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db.collection('securityAudit');
  }
  
  async getServiceResponsesCollection(): Promise<Collection<ServiceResponseDocument>> {
    const db = await this.getDb();
    return db.collection('serviceResponses');
  }
  
  async getUserActivitiesCollection(): Promise<Collection<UserActivityDocument>> {
    const db = await this.getDb();
    return db.collection('userActivities');
  }
  
  async getReferralsCollection(): Promise<Collection<ReferralDocument>> {
    const db = await this.getDb();
    return db.collection('referrals');
  }
  
  async getCreditTransactionsCollection(): Promise<Collection<any>> {
    const db = await this.getDb();
    return db.collection('credit_transactions');
  }
  
  async getBlogsCollection(): Promise<Collection<BlogDocument>> {
    const db = await this.getDb();
    return db.collection('blogs');
  }
  
  async getUserQueriesCollection(): Promise<Collection<UserQueryDocument>> {
    const db = await this.getDb();
    return db.collection('userQueries');
  }
  
  async getFaqsCollection(): Promise<Collection<FAQDocument>> {
    const db = await this.getDb();
    return db.collection('faqs');
  }
  
  async getFaqInteractionsCollection(): Promise<Collection<FAQInteractionDocument>> {
    const db = await this.getDb();
    return db.collection('faqInteractions');
  }
  
  async getChatSessionsCollection(): Promise<Collection<ChatSessionDocument>> {
    const db = await this.getDb();
    return db.collection('chatSessions');
  }
  
  async getNavigationTrackingCollection(): Promise<Collection<NavigationTrackingDocument>> {
    const db = await this.getDb();
    return db.collection('navigationTracking');
  }
  
  async getSecurityAuditCollection(): Promise<Collection<SecurityAuditDocument>> {
    const db = await this.getDb();
    return db.collection('securityAudit');
  }

  private async createIndexes(): Promise<void> {
    try {
      if (!this.db) {
        throw new Error('Database not connected');
      }
      
      // Users indexes
      await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
      await this.db.collection('users').createIndex({ createdAt: 1 });

      // Profiles indexes
      await this.db.collection('profiles').createIndex({ userId: 1 }, { unique: true });
      await this.db.collection('profiles').createIndex({ profileScore: -1 });
      await this.db.collection('profiles').createIndex({ lastAnalyzed: -1 });

      // Preferences indexes
      await this.db.collection('preferences').createIndex({ userId: 1 }, { unique: true });

      // Integrations indexes
      await this.db.collection('integrations').createIndex({ userId: 1, type: 1 }, { unique: true });
      await this.db.collection('integrations').createIndex({ lastSyncedAt: -1 });

      // Repositories indexes
      await this.db.collection('repositories').createIndex({ userId: 1 });
      await this.db.collection('repositories').createIndex({ githubId: 1 }, { unique: true });
      await this.db.collection('repositories').createIndex({ language: 1 });
      await this.db.collection('repositories').createIndex({ stars: -1 });
      await this.db.collection('repositories').createIndex({ lastAnalyzedAt: -1 });

      // Documents indexes
      await this.db.collection('documents').createIndex({ userId: 1 });
      await this.db.collection('documents').createIndex({ type: 1 });
      await this.db.collection('documents').createIndex({ status: 1 });
      await this.db.collection('documents').createIndex({ uploadedAt: -1 });

      // Recommendations indexes
      await this.db.collection('recommendations').createIndex({ userId: 1 });
      await this.db.collection('recommendations').createIndex({ priority: -1, createdAt: -1 });
      await this.db.collection('recommendations').createIndex({ type: 1 });
      await this.db.collection('recommendations').createIndex({ isCompleted: 1 });
      await this.db.collection('recommendations').createIndex({ isDismissed: 1 });

      // Analytics indexes
      await this.db.collection('analytics').createIndex({ userId: 1, date: -1 });
      await this.db.collection('analytics').createIndex({ date: -1 });

      // Notifications indexes
      await this.db.collection('notifications').createIndex({ userId: 1 });
      await this.db.collection('notifications').createIndex({ isRead: 1 });
      await this.db.collection('notifications').createIndex({ createdAt: -1 });
      await this.db.collection('notifications').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      // User requests indexes
      await this.db.collection('userRequests').createIndex({ userId: 1 });
      await this.db.collection('userRequests').createIndex({ serviceType: 1 });
      await this.db.collection('userRequests').createIndex({ status: 1 });
      await this.db.collection('userRequests').createIndex({ createdAt: -1 });
      await this.db.collection('userRequests').createIndex({ userId: 1, createdAt: -1 });

      // Service responses indexes
      await this.db.collection('serviceResponses').createIndex({ userId: 1 });
      await this.db.collection('serviceResponses').createIndex({ requestId: 1 }, { unique: true });
      await this.db.collection('serviceResponses').createIndex({ serviceType: 1 });
      await this.db.collection('serviceResponses').createIndex({ createdAt: -1 });
      await this.db.collection('serviceResponses').createIndex({ userId: 1, serviceType: 1, createdAt: -1 });

      // User activities indexes
      await this.db.collection('userActivities').createIndex({ userId: 1 });
      await this.db.collection('userActivities').createIndex({ sessionId: 1 });
      await this.db.collection('userActivities').createIndex({ actionType: 1 });
      await this.db.collection('userActivities').createIndex({ timestamp: -1 });
      await this.db.collection('userActivities').createIndex({ userId: 1, timestamp: -1 });

      // Referrals indexes
      await this.db.collection('referrals').createIndex({ referrerId: 1 });
      await this.db.collection('referrals').createIndex({ referredUserId: 1 });
      await this.db.collection('referrals').createIndex({ referralCode: 1 }, { unique: true });
      await this.db.collection('referrals').createIndex({ status: 1 });
      await this.db.collection('referrals').createIndex({ email: 1 });
      await this.db.collection('referrals').createIndex({ createdAt: -1 });
      await this.db.collection('referrals').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      // Blogs indexes
      await this.db.collection('blogs').createIndex({ userId: 1 });
      await this.db.collection('blogs').createIndex({ platform: 1 });
      await this.db.collection('blogs').createIndex({ lastFetchedAt: -1 });
      await this.db.collection('blogs').createIndex({ fetchStatus: 1 });

      // Contact/Support indexes
      await this.db.collection('userQueries').createIndex({ email: 1 });
      await this.db.collection('userQueries').createIndex({ status: 1 });
      await this.db.collection('userQueries').createIndex({ priority: 1 });
      await this.db.collection('userQueries').createIndex({ createdAt: -1 });
      await this.db.collection('userQueries').createIndex({ userId: 1 });
      await this.db.collection('userQueries').createIndex({ category: 1 });
      await this.db.collection('userQueries').createIndex({ assignedTo: 1 });

      await this.db.collection('faqs').createIndex({ category: 1 });
      await this.db.collection('faqs').createIndex({ keywords: 1 });
      await this.db.collection('faqs').createIndex({ isActive: 1 });
      await this.db.collection('faqs').createIndex({ priority: -1 });
      await this.db.collection('faqs').createIndex({ viewCount: -1 });
      await this.db.collection('faqs').createIndex({ helpfulCount: -1 });

      await this.db.collection('faqInteractions').createIndex({ faqId: 1 });
      await this.db.collection('faqInteractions').createIndex({ userId: 1 });
      await this.db.collection('faqInteractions').createIndex({ sessionId: 1 });
      await this.db.collection('faqInteractions').createIndex({ timestamp: -1 });

      await this.db.collection('chatSessions').createIndex({ sessionId: 1 }, { unique: true });
      await this.db.collection('chatSessions').createIndex({ userId: 1 });
      await this.db.collection('chatSessions').createIndex({ status: 1 });
      await this.db.collection('chatSessions').createIndex({ startedAt: -1 });
      await this.db.collection('chatSessions').createIndex({ lastActivityAt: -1 });

      // Navigation tracking indexes
      await this.db.collection('navigationTracking').createIndex({ userId: 1 });
      await this.db.collection('navigationTracking').createIndex({ sessionId: 1 });
      await this.db.collection('navigationTracking').createIndex({ timestamp: -1 });
      await this.db.collection('navigationTracking').createIndex({ fromPath: 1 });
      await this.db.collection('navigationTracking').createIndex({ toPath: 1 });
      await this.db.collection('navigationTracking').createIndex({ isAuthenticated: 1 });

      // Security audit indexes
      await this.db.collection('securityAudit').createIndex({ type: 1 });
      await this.db.collection('securityAudit').createIndex({ severity: 1 });
      await this.db.collection('securityAudit').createIndex({ userId: 1 });
      await this.db.collection('securityAudit').createIndex({ sessionId: 1 });
      await this.db.collection('securityAudit').createIndex({ timestamp: -1 });
      await this.db.collection('securityAudit').createIndex({ path: 1 });
      await this.db.collection('securityAudit').createIndex({ ipAddress: 1 });

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }
}

// Export a function to get the singleton instance
export const getDbManager = (uri?: string): DatabaseManager => {
  return DatabaseManager.getInstance(uri);
};

// Helper functions for common operations
export const createUser = async (userData: Omit<UserDocument, '_id' | 'createdAt' | 'updatedAt' | 'credits' | 'totalReferrals' | 'requestCounts' | 'onboardingCompleted' | 'isFirstTimeLogin'>): Promise<string> => {
  const db = getDbManager();
  await db.connect();
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

  const usersCollection = await db.getUsersCollection();
  const result = await usersCollection.insertOne(user);
  return result.insertedId.toString();
};

export const createProfile = async (userId: string): Promise<string> => {
  const db = getDbManager();
  await db.connect();
  const now = new Date();
  
  const profile: ProfileDocument = {
    userId,
    profileScore: 0,
    documents: [],
    createdAt: now,
    updatedAt: now,
  };

  const profilesCollection = await db.getProfilesCollection();
  const result = await profilesCollection.insertOne(profile);
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
    personalization: {
      recommendationTypes: [],
      contentPreferences: [],
      dashboardLayout: 'detailed',
    },
    createdAt: now,
    updatedAt: now,
  };

  const preferencesCollection = await db.getPreferencesCollection();
  const result = await preferencesCollection.insertOne(preferences);
  return result.insertedId.toString();
};

export const updateProfileScore = async (userId: string, scores: any): Promise<void> => {
  const db = getDbManager();
  await db.connect();
  
  const profilesCollection = await db.getProfilesCollection();
  await profilesCollection.updateOne(
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