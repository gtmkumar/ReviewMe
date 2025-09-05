import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';
import { body, validationResult, ValidationChain } from 'express-validator';

// CSRF Protection
export class CSRFProtection {
  private static readonly CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret';
  private static readonly TOKEN_LIFETIME = 3600000; // 1 hour

  static generateToken(sessionId: string): string {
    const timestamp = Date.now().toString();
    const hash = crypto
      .createHmac('sha256', this.CSRF_SECRET)
      .update(`${sessionId}:${timestamp}`)
      .digest('hex');
    
    return `${timestamp}:${hash}`;
  }

  static validateToken(token: string, sessionId: string): boolean {
    if (!token || !sessionId) return false;

    try {
      const [timestamp, hash] = token.split(':');
      const tokenAge = Date.now() - parseInt(timestamp);
      
      if (tokenAge > this.TOKEN_LIFETIME) return false;

      const expectedHash = crypto
        .createHmac('sha256', this.CSRF_SECRET)
        .update(`${sessionId}:${timestamp}`)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(expectedHash, 'hex')
      );
    } catch (error) {
      return false;
    }
  }
}

// Rate Limiting Configurations for Express (Legacy)
// Note: Use the rateLimit function below for Next.js API routes
export const rateLimitConfigs = {
  // These are kept for reference but not used in Next.js
  // Use the rateLimit function instead
};

// Input Validation Schemas
export const validationSchemas = {
  register: [
    body('name')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),
    
    body('email')
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail()
      .isLength({ max: 254 })
      .withMessage('Email is too long'),
    
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ],

  login: [
    body('email')
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required'),
  ],

  updateProfile: [
    body('name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    
    body('location')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Location cannot exceed 100 characters'),
    
    body('website')
      .optional()
      .isURL()
      .withMessage('Must be a valid URL'),
  ],

  fileUpload: [
    body('type')
      .optional()
      .isIn(['resume', 'cover_letter', 'portfolio', 'certificate', 'other'])
      .withMessage('Invalid file type'),
  ],
};

// Security Headers Middleware
export function securityHeaders() {
  return (req: NextRequest) => {
    const response = NextResponse.next();

    // HSTS (HTTP Strict Transport Security)
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    // Content Security Policy
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval for dev
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.github.com https://accounts.google.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );

    // X-Content-Type-Options
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options
    response.headers.set('X-Frame-Options', 'DENY');

    // X-XSS-Protection
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    );

    // Remove server header
    response.headers.delete('Server');
    response.headers.delete('X-Powered-By');

    return response;
  };
}

// Authentication Middleware
export async function authenticateRequest(req: NextRequest): Promise<{ authenticated: boolean; user?: any; error?: string }> {
  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return { authenticated: false, error: 'No authentication token found' };
    }

    // Check if token is expired
    if (token.exp && Date.now() >= token.exp * 1000) {
      return { authenticated: false, error: 'Token has expired' };
    }

    return { 
      authenticated: true, 
      user: {
        id: token.sub,
        email: token.email,
        name: token.name,
      }
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authenticated: false, error: 'Authentication failed' };
  }
}

// Input Sanitization
export class InputSanitizer {
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '') // Remove event handlers
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .slice(0, 1000); // Limit length
  }

  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') return '';
    
    return email
      .toLowerCase()
      .trim()
      .slice(0, 254); // Email length limit
  }

  static sanitizeFileName(fileName: string): string {
    if (typeof fileName !== 'string') return '';
    
    return fileName
      .replace(/[^a-zA-Z0-9\-_\.]/g, '') // Allow only alphanumeric, dash, underscore, dot
      .slice(0, 255); // Filename length limit
  }

  static sanitizeUrl(url: string): string {
    if (typeof url !== 'string') return '';
    
    try {
      const parsedUrl = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return '';
      }
      
      return parsedUrl.toString();
    } catch {
      return '';
    }
  }
}

// Validation Error Handler
export function handleValidationErrors(req: any, res: any, next: any) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  
  next();
}

// File Upload Security
export class FileUploadSecurity {
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/html',
    'application/zip', // For LinkedIn data exports
  ];

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File size exceeds limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB` 
      };
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: `File type ${file.type} is not allowed` 
      };
    }

    // Check file extension
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.html', '.zip'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      return { 
        valid: false, 
        error: `File extension ${fileExtension} is not allowed` 
      };
    }

    return { valid: true };
  }

  static scanFileContent(buffer: Buffer): { safe: boolean; threats?: string[] } {
    const threats: string[] = [];
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024)); // Check first 1KB

    // Simple malware patterns (in a real app, use a proper antivirus API)
    const malwarePatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /document\.write/i,
    ];

    for (const pattern of malwarePatterns) {
      if (pattern.test(content)) {
        threats.push(`Potentially malicious content detected: ${pattern.source}`);
      }
    }

    return {
      safe: threats.length === 0,
      threats: threats.length > 0 ? threats : undefined,
    };
  }
}

// Session Security
export class SessionSecurity {
  static generateSecureSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static validateSessionIntegrity(sessionData: any): boolean {
    if (!sessionData || typeof sessionData !== 'object') return false;
    
    // Check required session fields
    const requiredFields = ['user', 'expires'];
    for (const field of requiredFields) {
      if (!sessionData[field]) return false;
    }

    // Check session expiration
    if (new Date(sessionData.expires) < new Date()) return false;

    return true;
  }

  static detectSuspiciousActivity(req: NextRequest, userAgent?: string, ip?: string): boolean {
    // Detect rapid requests from same IP
    // Detect unusual user agent changes
    // Detect requests from multiple locations
    // This would typically involve maintaining a cache of recent requests
    
    // Simple implementation - just check for missing user agent
    if (!userAgent || userAgent.length < 10) {
      return true; // Suspicious
    }

    return false;
  }
}

// API Security Middleware Factory
export function createSecureAPIHandler(options: {
  requireAuth?: boolean;
  validateCSRF?: boolean;
  rateLimit?: keyof typeof rateLimitConfigs;
  validation?: ValidationChain[];
}) {
  return async (req: NextRequest, handler: Function) => {
    try {
      // Apply rate limiting
      if (options.rateLimit) {
        // Note: Rate limiting would be applied at the Express.js level
        // This is a placeholder for Next.js API routes
      }

      // Authenticate request
      if (options.requireAuth) {
        const auth = await authenticateRequest(req);
        if (!auth.authenticated) {
          return NextResponse.json(
            { error: auth.error || 'Authentication required' },
            { status: 401 }
          );
        }
        (req as any).user = auth.user;
      }

      // Validate CSRF token for state-changing operations
      if (options.validateCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method || '')) {
        const csrfToken = req.headers.get('x-csrf-token');
        const sessionId = req.headers.get('x-session-id');
        
        if (!csrfToken || !sessionId || !CSRFProtection.validateToken(csrfToken, sessionId)) {
          return NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
          );
        }
      }

      // Apply input validation
      if (options.validation) {
        // Note: express-validator works with Express.js
        // For Next.js, you'd need to implement custom validation
      }

      return await handler(req);
    } catch (error) {
      console.error('Security middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Data Encryption Utilities
export class DataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

  static encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ALGORITHM, this.KEY);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: (cipher as any).getAuthTag().toString('hex'),
    };
  }

  static decrypt(encryptedData: { encrypted: string; iv: string; authTag: string }): string {
    const decipher = crypto.createDecipher(this.ALGORITHM, this.KEY);
    (decipher as any).setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcryptjs');
    return bcrypt.hash(password, 12);
  }

  static verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(password, hash);
  }
}

// Simple Rate Limiting for Next.js API Routes
interface RateLimitConfig {
  requests: number;
  window: number; // in milliseconds
}

interface RateLimitResult {
  success: boolean;
  retryAfter?: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  const key = `${clientIP}:${request.nextUrl.pathname}`;
  const now = Date.now();
  
  // Clean up expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (now > v.resetTime) {
      rateLimitStore.delete(k);
    }
  }
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.window
    });
    return { success: true };
  }
  
  if (current.count >= config.requests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    return { success: false, retryAfter };
  }
  
  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);
  
  return { success: true };
}

export default {
  CSRFProtection,
  rateLimitConfigs,
  validationSchemas,
  securityHeaders,
  authenticateRequest,
  InputSanitizer,
  handleValidationErrors,
  FileUploadSecurity,
  SessionSecurity,
  createSecureAPIHandler,
  DataEncryption,
};