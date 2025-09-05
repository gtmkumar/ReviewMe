export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
  profile?: UserProfile;
  onboarding?: OnboardingData;
}

// Onboarding Types
export interface OnboardingData {
  completed: boolean;
  userType?: 'student' | 'professional' | 'job_seeker';
  experience?: string;
  industry?: string;
  careerGoals?: string[];
  socialProfiles?: {
    github?: string;
    medium?: string;
    linkedin?: string;
    portfolio?: string;
  };
  preferences?: {
    communicationStyle?: 'formal' | 'casual' | 'technical';
    feedbackFrequency?: 'immediate' | 'weekly' | 'monthly';
    privacyLevel?: 'public' | 'private' | 'limited';
  };
  consents?: {
    dataCollection: boolean;
    analytics: boolean;
    marketing: boolean;
    profileSharing: boolean;
  };
  completedAt?: Date;
}

// Blog Types
export interface BlogProfile {
  platform: 'medium' | 'dev.to' | 'hashnode';
  profileUrl: string;
  username?: string;
  articles: BlogArticle[];
  analytics: BlogAnalytics;
  lastFetched: Date;
  fetchStatus: 'pending' | 'success' | 'error';
}

export interface BlogArticle {
  id: string;
  title: string;
  url: string;
  publishedAt: Date;
  author?: string;
  tags: string[];
  readTime?: number;
  excerpt?: string;
  platform: string;
}

export interface BlogAnalytics {
  totalArticles: number;
  averageReadTime?: number;
  topTags: string[];
  publishingFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'irregular';
  latestPost?: Date;
  oldestPost?: Date;
}

// Contact Me / Support Types
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'account' | 'github' | 'linkedin' | 'resume' | 'general' | 'billing' | 'privacy';
  tags: string[];
  helpful: number; // Number of users who found it helpful
  notHelpful: number; // Number of users who didn't find it helpful
  searchKeywords: string[];
  relatedQuestions: string[]; // IDs of related FAQs
  createdAt: Date;
  updatedAt: Date;
}

export interface UserQuery {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  userId?: string; // If user is logged in
  assignedTo?: string; // Support agent ID
  response?: string;
  responseAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FAQSearchResult {
  faq: FAQ;
  score: number; // Relevance score
  matchedKeywords: string[];
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    weeklyDigest: boolean;
  };
  privacy: {
    profilePublic: boolean;
    analyticsOptOut: boolean;
  };
}

export interface UserProfile {
  id: string;
  userId: string;
  profileScore: number;
  lastAnalyzed: Date;
  github?: GitHubProfile;
  linkedin?: LinkedInProfile;
  resume?: ResumeProfile;
  documents: DocumentProfile[];
}

// GitHub Integration Types
export interface GitHubProfile {
  id: string;
  username: string;
  profileUrl: string;
  avatarUrl: string;
  name: string;
  bio: string;
  company: string;
  location: string;
  blog: string;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  createdAt: Date;
  updatedAt: Date;
  score: GitHubScore;
  repositories: GitHubRepository[];
  lastSyncedAt: Date;
}

export interface GitHubRepository {
  id: string;
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
}

export interface GitHubScore {
  overall: number;
  activity: number;
  quality: number;
  collaboration: number;
  documentation: number;
  consistency: number;
  breakdown: {
    repositoryCount: number;
    averageStars: number;
    totalCommits: number;
    languageDiversity: number;
    readmeQuality: number;
    testCoverage: number;
    collaborationScore: number;
    activityFrequency: number;
  };
}

// LinkedIn Types
export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  summary: string;
  location: string;
  industry: string;
  profileUrl: string;
  avatarUrl: string;
  connectionCount: number;
  score: LinkedInScore;
  experiences: LinkedInExperience[];
  education: LinkedInEducation[];
  skills: LinkedInSkill[];
  certifications: LinkedInCertification[];
  lastSyncedAt: Date;
}

export interface LinkedInExperience {
  title: string;
  company: string;
  companyUrl?: string;
  location?: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
}

export interface LinkedInEducation {
  school: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear?: number;
  description?: string;
}

export interface LinkedInSkill {
  name: string;
  endorsements: number;
}

export interface LinkedInCertification {
  name: string;
  authority: string;
  licenseNumber?: string;
  url?: string;
  issueDate: Date;
  expirationDate?: Date;
}

export interface LinkedInScore {
  overall: number;
  completeness: number;
  keywords: number;
  engagement: number;
  professional: number;
  breakdown: {
    profilePhoto: number;
    headline: number;
    summary: number;
    experience: number;
    education: number;
    skills: number;
    recommendations: number;
    connections: number;
    activityLevel: number;
  };
}

// Resume Types
export interface ResumeProfile {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'docx';
  uploadedAt: Date;
  parsedContent: ResumeParsedContent;
  score: ResumeScore;
  versions: ResumeVersion[];
}

export interface ResumeParsedContent {
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
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  certifications: ResumeCertification[];
  projects: ResumeProject[];
  languages: ResumeLanguage[];
  rawText: string;
}

export interface ResumeExperience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string[];
  achievements: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  location?: string;
  graduationDate?: string;
  gpa?: string;
  relevantCoursework?: string[];
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  githubUrl?: string;
  achievements: string[];
}

export interface ResumeLanguage {
  name: string;
  proficiency: 'Basic' | 'Intermediate' | 'Advanced' | 'Native';
}

export interface ResumeVersion {
  id: string;
  version: number;
  fileName: string;
  uploadedAt: Date;
  score: ResumeScore;
}

export interface ResumeScore {
  overall: number;
  ats: number;
  keywords: number;
  clarity: number;
  quantification: number;
  formatting: number;
  consistency: number;
  breakdown: {
    contactInfo: number;
    summary: number;
    experience: number;
    education: number;
    skills: number;
    achievements: number;
    formatting: number;
    atsCompatibility: number;
    keywordDensity: number;
    quantificationScore: number;
  };
}

// Document Types
export interface DocumentProfile {
  id: string;
  type: 'cover_letter' | 'portfolio' | 'certificate' | 'other';
  fileName: string;
  fileType: string;
  uploadedAt: Date;
  parsedContent?: string;
  analysis?: DocumentAnalysis;
}

export interface DocumentAnalysis {
  score: number;
  issues: DocumentIssue[];
  suggestions: string[];
  keywordRelevance: number;
  readabilityScore: number;
}

export interface DocumentIssue {
  type: 'grammar' | 'spelling' | 'formatting' | 'content' | 'structure';
  severity: 'low' | 'medium' | 'high';
  message: string;
  position?: {
    start: number;
    end: number;
  };
  suggestion?: string;
}

// Recommendation Types
export interface Recommendation {
  id: string;
  userId: string;
  type: 'github' | 'linkedin' | 'resume' | 'general';
  category: 'profile' | 'content' | 'activity' | 'networking' | 'skills';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionItems: ActionItem[];
  impactScore: number;
  effortScore: number;
  estimatedTime: string;
  createdAt: Date;
  completedAt?: Date;
  isCompleted: boolean;
  isDismissed: boolean;
}

export interface ActionItem {
  id: string;
  description: string;
  isCompleted: boolean;
  url?: string;
  example?: string;
}

// Analytics Types
export interface ProfileAnalytics {
  id: string;
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
}

export interface BenchmarkData {
  industry: string;
  experience: string;
  location: string;
  averageScores: {
    overall: number;
    github: number;
    linkedin: number;
    resume: number;
  };
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Integration Types
export interface Integration {
  id: string;
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
}

// Notification Types
export interface Notification {
  id: string;
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

// Store Types (Zustand)
export interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export interface ProfileStore {
  profile: UserProfile | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshAnalysis: () => Promise<void>;
}

export interface IntegrationStore {
  integrations: Integration[];
  isLoading: boolean;
  connect: (type: 'github' | 'linkedin' | 'google') => Promise<void>;
  disconnect: (type: 'github' | 'linkedin' | 'google') => Promise<void>;
  sync: (type: 'github' | 'linkedin') => Promise<void>;
  fetchIntegrations: () => Promise<void>;
}

export interface RecommendationStore {
  recommendations: Recommendation[];
  isLoading: boolean;
  fetchRecommendations: () => Promise<void>;
  completeRecommendation: (id: string) => Promise<void>;
  dismissRecommendation: (id: string) => Promise<void>;
  completeActionItem: (recommendationId: string, actionItemId: string) => Promise<void>;
}

// Component Props Types
export interface ScoreCardProps {
  title: string;
  score: number;
  maxScore?: number;
  trend?: number;
  description?: string;
  className?: string;
}

export interface ChartProps {
  data: any[];
  width?: number;
  height?: number;
  className?: string;
}

export interface FileUploadProps {
  accept: string[];
  maxSize: number;
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
  className?: string;
}