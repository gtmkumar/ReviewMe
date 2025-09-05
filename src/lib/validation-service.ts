import { z } from 'zod';

// Social Profile URL Validation Service
export class ValidationService {
  
  /**
   * Comprehensive URL validation schemas
   */
  static readonly schemas = {
    github: z.string()
      .url('Must be a valid URL')
      .refine(
        (url) => this.isValidGitHubUrl(url), 
        'Must be a valid GitHub profile URL (e.g., https://github.com/username)'
      ),
    
    linkedin: z.string()
      .url('Must be a valid URL')
      .refine(
        (url) => this.isValidLinkedInUrl(url), 
        'Must be a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)'
      ),
    
    medium: z.string()
      .url('Must be a valid URL')
      .refine(
        (url) => this.isValidMediumUrl(url), 
        'Must be a valid Medium profile URL (e.g., https://medium.com/@username)'
      ),
    
    portfolio: z.string()
      .url('Must be a valid URL')
      .refine(
        (url) => this.isValidWebsiteUrl(url), 
        'Must be a valid website URL'
      ),
    
    email: z.string()
      .email('Must be a valid email address')
      .max(254, 'Email address is too long'),
    
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
    
    industry: z.string()
      .min(2, 'Industry must be at least 2 characters')
      .max(100, 'Industry must be less than 100 characters'),
  };

  /**
   * Validate GitHub profile URL
   */
  static isValidGitHubUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check domain
      if (!['github.com', 'www.github.com'].includes(urlObj.hostname.toLowerCase())) {
        return false;
      }
      
      // Check path format
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Should have exactly one path segment (username)
      if (pathParts.length !== 1) {
        return false;
      }
      
      const username = pathParts[0];
      
      // GitHub username validation
      return this.isValidGitHubUsername(username);
    } catch {
      return false;
    }
  }

  /**
   * Validate LinkedIn profile URL
   */
  static isValidLinkedInUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check domain
      if (!['linkedin.com', 'www.linkedin.com'].includes(urlObj.hostname.toLowerCase())) {
        return false;
      }
      
      // Check path format
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Should be /in/username or /pub/username
      if (pathParts.length < 2 || !['in', 'pub'].includes(pathParts[0])) {
        return false;
      }
      
      const username = pathParts[1];
      
      // LinkedIn username validation
      return this.isValidLinkedInUsername(username);
    } catch {
      return false;
    }
  }

  /**
   * Validate Medium profile URL
   */
  static isValidMediumUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check domain patterns
      if (urlObj.hostname.toLowerCase() === 'medium.com' || urlObj.hostname.toLowerCase() === 'www.medium.com') {
        // Format: https://medium.com/@username
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length === 1 && pathParts[0].startsWith('@')) {
          const username = pathParts[0].substring(1);
          return this.isValidMediumUsername(username);
        }
        return false;
      }
      
      // Custom domain pattern (e.g., username.medium.com)
      if (urlObj.hostname.toLowerCase().endsWith('.medium.com')) {
        const subdomain = urlObj.hostname.split('.')[0];
        return this.isValidMediumUsername(subdomain);
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Validate general website URL
   */
  static isValidWebsiteUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Must be HTTP or HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      
      // Must have a valid hostname
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        return false;
      }
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /localhost/i,
        /127\.0\.0\.1/,
        /192\.168\./,
        /10\./,
        /file:/i,
        /javascript:/i,
        /data:/i,
      ];
      
      return !suspiciousPatterns.some(pattern => pattern.test(url));
    } catch {
      return false;
    }
  }

  /**
   * Validate GitHub username
   */
  private static isValidGitHubUsername(username: string): boolean {
    // GitHub username rules:
    // - May only contain alphanumeric characters or single hyphens
    // - Cannot begin or end with a hyphen
    // - Maximum 39 characters
    const githubUsernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]){0,37}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
    return githubUsernameRegex.test(username);
  }

  /**
   * Validate LinkedIn username
   */
  private static isValidLinkedInUsername(username: string): boolean {
    // LinkedIn username rules:
    // - Alphanumeric characters, hyphens, and underscores
    // - 3-100 characters
    const linkedinUsernameRegex = /^[a-zA-Z0-9_-]{3,100}$/;
    return linkedinUsernameRegex.test(username);
  }

  /**
   * Validate Medium username
   */
  private static isValidMediumUsername(username: string): boolean {
    // Medium username rules:
    // - Alphanumeric characters, hyphens, underscores, and dots
    // - 1-50 characters
    // - Cannot start or end with special characters
    const mediumUsernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,48}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
    return mediumUsernameRegex.test(username);
  }

  /**
   * Extract username from social profile URLs
   */
  static extractUsername(url: string, platform: 'github' | 'linkedin' | 'medium'): string | null {
    try {
      const urlObj = new URL(url);
      
      switch (platform) {
        case 'github':
          if (this.isValidGitHubUrl(url)) {
            return urlObj.pathname.split('/')[1];
          }
          break;
          
        case 'linkedin':
          if (this.isValidLinkedInUrl(url)) {
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            return pathParts[1];
          }
          break;
          
        case 'medium':
          if (this.isValidMediumUrl(url)) {
            if (urlObj.hostname.endsWith('.medium.com') && urlObj.hostname !== 'medium.com') {
              return urlObj.hostname.split('.')[0];
            }
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            if (pathParts[0]?.startsWith('@')) {
              return pathParts[0].substring(1);
            }
          }
          break;
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate onboarding form data
   */
  static validateOnboardingData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate user type
    if (!data.userType || !['student', 'professional', 'job_seeker'].includes(data.userType)) {
      errors.push('Valid user type is required');
    }

    // Validate experience for professionals
    if (data.userType === 'professional' && !data.experience) {
      errors.push('Experience level is required for professionals');
    }

    // Validate social profiles
    if (data.socialProfiles) {
      if (data.socialProfiles.github && !this.isValidGitHubUrl(data.socialProfiles.github)) {
        errors.push('Invalid GitHub profile URL');
      }
      
      if (data.socialProfiles.linkedin && !this.isValidLinkedInUrl(data.socialProfiles.linkedin)) {
        errors.push('Invalid LinkedIn profile URL');
      }
      
      if (data.socialProfiles.medium && !this.isValidMediumUrl(data.socialProfiles.medium)) {
        errors.push('Invalid Medium profile URL');
      }
      
      if (data.socialProfiles.portfolio && !this.isValidWebsiteUrl(data.socialProfiles.portfolio)) {
        errors.push('Invalid portfolio website URL');
      }

      // At least one social profile required
      const hasAnyProfile = data.socialProfiles.github || 
                           data.socialProfiles.linkedin || 
                           data.socialProfiles.medium ||
                           data.socialProfiles.portfolio;
      
      if (!hasAnyProfile) {
        errors.push('At least one social profile is required');
      }
    }

    // Validate preferences
    if (data.preferences) {
      const validCommStyles = ['formal', 'casual', 'technical'];
      if (data.preferences.communicationStyle && !validCommStyles.includes(data.preferences.communicationStyle)) {
        errors.push('Invalid communication style');
      }
      
      const validFrequencies = ['immediate', 'weekly', 'monthly'];
      if (data.preferences.feedbackFrequency && !validFrequencies.includes(data.preferences.feedbackFrequency)) {
        errors.push('Invalid feedback frequency');
      }
      
      const validPrivacyLevels = ['public', 'private', 'limited'];
      if (data.preferences.privacyLevel && !validPrivacyLevels.includes(data.preferences.privacyLevel)) {
        errors.push('Invalid privacy level');
      }
    }

    // Validate consents
    if (!data.consents || !data.consents.dataCollection) {
      errors.push('Data collection consent is required');
    }

    // Validate career goals
    if (data.careerGoals && Array.isArray(data.careerGoals)) {
      const validGoals = [
        'Skill Development', 'Career Advancement', 'Job Search', 'Networking',
        'Personal Branding', 'Technical Growth', 'Leadership', 'Entrepreneurship'
      ];
      
      const invalidGoals = data.careerGoals.filter((goal: string) => !validGoals.includes(goal));
      if (invalidGoals.length > 0) {
        errors.push(`Invalid career goals: ${invalidGoals.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize input data
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[<>\"']/g, ''); // Remove potentially dangerous characters
  }

  /**
   * Rate limiting validation for API calls
   */
  static validateRateLimit(userRequests: number, timeWindow: number, limit: number): boolean {
    return userRequests <= limit;
  }
}

// Export validation schemas for use in API routes
export const onboardingValidationSchema = z.object({
  userType: z.enum(['student', 'professional', 'job_seeker']),
  experience: z.string().optional(),
  industry: z.string().max(100).optional(),
  careerGoals: z.array(z.string()).optional(),
  socialProfiles: z.object({
    github: ValidationService.schemas.github.optional().or(z.literal('')),
    linkedin: ValidationService.schemas.linkedin.optional().or(z.literal('')),
    medium: ValidationService.schemas.medium.optional().or(z.literal('')),
    portfolio: ValidationService.schemas.portfolio.optional().or(z.literal('')),
  }),
  preferences: z.object({
    communicationStyle: z.enum(['formal', 'casual', 'technical']).optional(),
    feedbackFrequency: z.enum(['immediate', 'weekly', 'monthly']).optional(),
    privacyLevel: z.enum(['public', 'private', 'limited']).optional(),
  }).optional(),
  consents: z.object({
    dataCollection: z.boolean(),
    analytics: z.boolean(),
    marketing: z.boolean(),
    profileSharing: z.boolean(),
  }),
});