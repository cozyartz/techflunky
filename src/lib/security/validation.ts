// Comprehensive Input Validation & OWASP Protection
// Enterprise-grade security validation for TechFlunky marketplace

import { z } from 'zod';
import validator from 'validator';
import disposableEmailDomains from 'disposable-email-domains';

// Custom validation schemas for TechFlunky business model
export const ValidationSchemas = {
  // User registration and authentication
  userRegistration: z.object({
    email: z.string()
      .email('Invalid email format')
      .max(254, 'Email too long')
      .refine((email) => !disposableEmailDomains.includes(email.split('@')[1]), {
        message: 'Disposable email addresses are not allowed'
      })
      .refine((email) => validator.isEmail(email), {
        message: 'Invalid email format'
      }),
    password: z.string()
      .min(12, 'Password must be at least 12 characters')
      .max(128, 'Password too long')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{12,}$/, {
        message: 'Password must contain uppercase, lowercase, number, and special character'
      })
      .refine((password) => !/(.)\1{2,}/.test(password), {
        message: 'Password cannot contain repeated characters'
      })
      .refine((password) => !/123|abc|qwerty|password/i.test(password), {
        message: 'Password cannot contain common patterns'
      }),
    firstName: z.string()
      .min(1, 'First name required')
      .max(50, 'First name too long')
      .regex(/^[a-zA-Z\s\-']+$/, 'First name contains invalid characters'),
    lastName: z.string()
      .min(1, 'Last name required')
      .max(50, 'Last name too long')
      .regex(/^[a-zA-Z\s\-']+$/, 'Last name contains invalid characters'),
    role: z.enum(['seller', 'buyer', 'investor'], {
      errorMap: () => ({ message: 'Invalid role selection' })
    }),
    termsAccepted: z.boolean().refine(val => val === true, {
      message: 'Terms and conditions must be accepted'
    })
  }),

  // Business blueprint creation
  businessBlueprint: z.object({
    title: z.string()
      .min(5, 'Title must be at least 5 characters')
      .max(100, 'Title too long')
      .regex(/^[a-zA-Z0-9\s\-_.,!()]+$/, 'Title contains invalid characters'),
    description: z.string()
      .min(50, 'Description must be at least 50 characters')
      .max(5000, 'Description too long'),
    category: z.enum(['saas', 'ecommerce', 'marketplace', 'ai-tool', 'mobile-app', 'web-app', 'other'], {
      errorMap: () => ({ message: 'Invalid category selection' })
    }),
    techStack: z.array(z.string().max(30)).max(20, 'Too many technologies selected'),
    targetMarket: z.string()
      .min(20, 'Target market description too short')
      .max(1000, 'Target market description too long'),
    revenueModel: z.string()
      .min(20, 'Revenue model description too short')
      .max(1000, 'Revenue model description too long'),
    fundingGoal: z.number()
      .min(1000, 'Minimum funding goal is $1,000')
      .max(10000000, 'Maximum funding goal is $10,000,000'),
    timeline: z.number()
      .min(1, 'Timeline must be at least 1 month')
      .max(24, 'Timeline cannot exceed 24 months'),
    businessPlan: z.string()
      .min(500, 'Business plan too short')
      .max(50000, 'Business plan too long')
  }),

  // Marketplace listing
  marketplaceListing: z.object({
    blueprintId: z.string().uuid('Invalid blueprint ID'),
    price: z.number()
      .min(99, 'Minimum price is $99')
      .max(999999, 'Maximum price is $999,999'),
    title: z.string()
      .min(10, 'Title must be at least 10 characters')
      .max(100, 'Title too long'),
    shortDescription: z.string()
      .min(50, 'Short description must be at least 50 characters')
      .max(500, 'Short description too long'),
    features: z.array(z.string().max(100)).min(3, 'At least 3 features required').max(20, 'Too many features'),
    techStack: z.array(z.string().max(30)).max(15, 'Too many technologies'),
    demoUrl: z.string().url('Invalid demo URL').optional(),
    sourceCodeIncluded: z.boolean(),
    documentationIncluded: z.boolean(),
    supportIncluded: z.boolean(),
    deploymentGuide: z.boolean(),
    tags: z.array(z.string().max(30)).max(10, 'Too many tags')
  }),

  // Investment application
  investmentApplication: z.object({
    investorType: z.enum(['angel', 'accredited', 'vc-fund', 'beta-partner'], {
      errorMap: () => ({ message: 'Invalid investor type' })
    }),
    investmentRange: z.object({
      min: z.number().min(5000, 'Minimum investment is $5,000'),
      max: z.number().max(10000000, 'Maximum investment is $10,000,000')
    }).refine(data => data.min <= data.max, {
      message: 'Minimum investment cannot exceed maximum'
    }),
    accreditation: z.object({
      isAccredited: z.boolean(),
      netWorth: z.number().optional(),
      annualIncome: z.number().optional(),
      certificationDocument: z.string().optional()
    }),
    investmentFocus: z.array(z.string().max(50)).max(10, 'Too many focus areas'),
    riskTolerance: z.enum(['low', 'medium', 'high'], {
      errorMap: () => ({ message: 'Invalid risk tolerance' })
    }),
    dueDiligenceExperience: z.boolean(),
    portfolioSize: z.number().min(0).max(10000),
    linkedinProfile: z.string().url('Invalid LinkedIn URL').optional(),
    websiteUrl: z.string().url('Invalid website URL').optional()
  }),

  // Message validation
  messageContent: z.object({
    content: z.string()
      .min(1, 'Message cannot be empty')
      .max(5000, 'Message too long')
      .refine(content => !/<script|javascript:|data:|vbscript:/i.test(content), {
        message: 'Message contains potentially dangerous content'
      }),
    recipientId: z.string().uuid('Invalid recipient ID'),
    messageType: z.enum(['text', 'file', 'system'], {
      errorMap: () => ({ message: 'Invalid message type' })
    })
  }),

  // File upload validation
  fileUpload: z.object({
    filename: z.string()
      .min(1, 'Filename required')
      .max(255, 'Filename too long')
      .regex(/^[a-zA-Z0-9._-]+$/, 'Filename contains invalid characters')
      .refine(filename => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.zip'];
        return allowedExtensions.some(ext => filename.toLowerCase().endsWith(ext));
      }, { message: 'File type not allowed' }),
    fileSize: z.number()
      .min(1, 'File cannot be empty')
      .max(10 * 1024 * 1024, 'File size cannot exceed 10MB'),
    mimeType: z.string().refine(type => {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip'
      ];
      return allowedTypes.includes(type);
    }, { message: 'File type not allowed' })
  }),

  // Payment processing
  paymentData: z.object({
    amount: z.number()
      .min(99, 'Minimum payment amount is $99')
      .max(999999, 'Maximum payment amount is $999,999'),
    currency: z.enum(['usd'], { errorMap: () => ({ message: 'Only USD supported' }) }),
    paymentMethodId: z.string().min(1, 'Payment method required'),
    blueprintId: z.string().uuid('Invalid blueprint ID'),
    buyerId: z.string().uuid('Invalid buyer ID'),
    sellerId: z.string().uuid('Invalid seller ID')
  }),

  // Search and filtering
  searchQuery: z.object({
    query: z.string()
      .max(100, 'Search query too long')
      .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Search query contains invalid characters')
      .optional(),
    category: z.string().max(50).optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().max(999999).optional(),
    techStack: z.array(z.string().max(30)).max(10).optional(),
    sortBy: z.enum(['price', 'rating', 'date', 'popularity']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: z.number().min(1).max(1000).default(1),
    limit: z.number().min(1).max(50).default(20)
  }),

  // API key validation
  apiRequest: z.object({
    userId: z.string().uuid('Invalid user ID'),
    timestamp: z.number().min(Date.now() - 300000).max(Date.now() + 60000), // 5 min window
    signature: z.string().min(1, 'Request signature required')
  })
};

// Advanced input sanitization class
export class AdvancedSanitizer {
  // Sanitize HTML content with whitelist approach
  static sanitizeHtml(input: string, allowBasicTags = false): string {
    if (!allowBasicTags) {
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    // Allow only basic formatting tags
    const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'br', 'p'];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

    return input.replace(tagRegex, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        return match;
      }
      return '';
    });
  }

  // Sanitize SQL input to prevent injection
  static sanitizeSql(input: string): string {
    return input
      .replace(/['\";\\]/g, '') // Remove quotes and backslashes
      .replace(/-{2,}/g, '') // Remove SQL comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/gi, '') // Remove SQL keywords
      .trim();
  }

  // Sanitize NoSQL injection attempts
  static sanitizeNoSql(input: any): any {
    if (typeof input === 'string') {
      return input.replace(/[${}]/g, '');
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        // Remove dangerous operators
        if (!key.startsWith('$') && !key.includes('.')) {
          sanitized[key] = this.sanitizeNoSql(value);
        }
      }
      return sanitized;
    }

    return input;
  }

  // Validate and sanitize file paths
  static sanitizeFilePath(path: string): string {
    return path
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/[^a-zA-Z0-9._/-]/g, '') // Allow only safe characters
      .replace(/\/{2,}/g, '/') // Remove double slashes
      .substring(0, 255); // Limit length
  }

  // Sanitize URL parameters
  static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Only allow HTTPS URLs
      if (urlObj.protocol !== 'https:') {
        throw new Error('Only HTTPS URLs allowed');
      }

      // Validate domain whitelist for external URLs
      const allowedDomains = [
        'github.com', 'gitlab.com', 'bitbucket.org',
        'vercel.app', 'netlify.app', 'heroku.com',
        'techflunky.com'
      ];

      const domain = urlObj.hostname.toLowerCase();
      const isAllowed = allowedDomains.some(allowed =>
        domain === allowed || domain.endsWith('.' + allowed)
      );

      if (!isAllowed) {
        throw new Error('Domain not in whitelist');
      }

      return urlObj.toString();
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  // Sanitize JSON input to prevent prototype pollution
  static sanitizeJson(input: string): any {
    try {
      const parsed = JSON.parse(input);
      return this.removePrototypePollution(parsed);
    } catch {
      throw new Error('Invalid JSON format');
    }
  }

  // Remove prototype pollution attempts
  private static removePrototypePollution(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removePrototypePollution(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Block dangerous keys
      if (!['__proto__', 'constructor', 'prototype'].includes(key)) {
        sanitized[key] = this.removePrototypePollution(value);
      }
    }

    return sanitized;
  }

  // Validate business metrics to prevent manipulation
  static validateBusinessMetrics(metrics: any): any {
    const validatedMetrics: any = {};

    // Revenue validation
    if (metrics.revenue !== undefined) {
      const revenue = Number(metrics.revenue);
      if (isNaN(revenue) || revenue < 0 || revenue > 100000000) {
        throw new Error('Invalid revenue value');
      }
      validatedMetrics.revenue = Math.round(revenue * 100) / 100; // Round to cents
    }

    // User count validation
    if (metrics.userCount !== undefined) {
      const userCount = Number(metrics.userCount);
      if (isNaN(userCount) || userCount < 0 || userCount > 10000000) {
        throw new Error('Invalid user count');
      }
      validatedMetrics.userCount = Math.floor(userCount);
    }

    // Growth rate validation (percentage)
    if (metrics.growthRate !== undefined) {
      const growthRate = Number(metrics.growthRate);
      if (isNaN(growthRate) || growthRate < -100 || growthRate > 10000) {
        throw new Error('Invalid growth rate');
      }
      validatedMetrics.growthRate = Math.round(growthRate * 100) / 100;
    }

    return validatedMetrics;
  }
}

// OWASP-compliant rate limiting
export class RateLimitValidator {
  private static attempts: Map<string, { count: number; window: number; blocked: number }> = new Map();

  // Validate rate limits based on endpoint sensitivity
  static checkRateLimit(
    identifier: string,
    endpoint: string,
    userRole: string = 'guest'
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const limits = this.getRateLimits(endpoint, userRole);
    const now = Date.now();
    const windowStart = Math.floor(now / limits.windowMs) * limits.windowMs;

    const key = `${identifier}:${endpoint}`;
    const record = this.attempts.get(key) || { count: 0, window: windowStart, blocked: 0 };

    // Reset if new window
    if (record.window < windowStart) {
      record.count = 0;
      record.window = windowStart;
      record.blocked = 0;
    }

    // Check if blocked
    if (record.blocked > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.blocked
      };
    }

    // Check rate limit
    if (record.count >= limits.maxRequests) {
      record.blocked = now + limits.blockDuration;
      this.attempts.set(key, record);
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.blocked
      };
    }

    // Increment and allow
    record.count++;
    this.attempts.set(key, record);

    return {
      allowed: true,
      remaining: limits.maxRequests - record.count,
      resetTime: windowStart + limits.windowMs
    };
  }

  private static getRateLimits(endpoint: string, userRole: string) {
    const baseLimits = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDuration: 60 * 60 * 1000, // 1 hour
      maxRequests: 100
    };

    // Endpoint-specific limits
    const endpointLimits: Record<string, Partial<typeof baseLimits>> = {
      '/api/auth/login': { maxRequests: 5, blockDuration: 15 * 60 * 1000 },
      '/api/auth/register': { maxRequests: 3, blockDuration: 60 * 60 * 1000 },
      '/api/payment/': { maxRequests: 10, blockDuration: 30 * 60 * 1000 },
      '/api/messaging/': { maxRequests: 200 },
      '/api/search': { maxRequests: 50 },
      '/api/upload': { maxRequests: 20 }
    };

    // Role-based multipliers
    const roleMultipliers: Record<string, number> = {
      admin: 5,
      seller: 3,
      investor: 2,
      buyer: 1.5,
      guest: 1
    };

    const endpointConfig = endpointLimits[endpoint] || {};
    const multiplier = roleMultipliers[userRole] || 1;

    return {
      ...baseLimits,
      ...endpointConfig,
      maxRequests: Math.floor((endpointConfig.maxRequests || baseLimits.maxRequests) * multiplier)
    };
  }
}

// CSRF token validation
export class CSRFValidator {
  private static tokens: Map<string, { token: string; expires: number }> = new Map();

  // Generate CSRF token for session
  static generateToken(sessionId: string): string {
    const token = this.generateSecureToken();
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour

    this.tokens.set(sessionId, { token, expires });
    return token;
  }

  // Validate CSRF token
  static validateToken(sessionId: string, providedToken: string): boolean {
    const record = this.tokens.get(sessionId);

    if (!record || Date.now() > record.expires) {
      this.tokens.delete(sessionId);
      return false;
    }

    return record.token === providedToken;
  }

  private static generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

// Content Security Policy validator
export class CSPValidator {
  // Validate inline script attempts
  static validateInlineContent(content: string): { safe: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check for script tags
    if (/<script[\s\S]*?>[\s\S]*?<\/script>/gi.test(content)) {
      violations.push('Inline script tags detected');
    }

    // Check for event handlers
    if (/on\w+\s*=/gi.test(content)) {
      violations.push('Event handler attributes detected');
    }

    // Check for javascript: URLs
    if (/javascript:/gi.test(content)) {
      violations.push('JavaScript URLs detected');
    }

    // Check for data: URLs with scripts
    if (/data:.*script/gi.test(content)) {
      violations.push('Data URLs with scripts detected');
    }

    return {
      safe: violations.length === 0,
      violations
    };
  }
}

// Export validation middleware function
export function createValidationMiddleware(schema: z.ZodSchema) {
  return async (data: any) => {
    try {
      // Sanitize data first
      const sanitizedData = AdvancedSanitizer.removePrototypePollution(data);

      // Validate against schema
      const validatedData = schema.parse(sanitizedData);

      return {
        success: true,
        data: validatedData,
        errors: []
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: null,
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }

      return {
        success: false,
        data: null,
        errors: [{ path: 'validation', message: 'Validation failed', code: 'invalid_input' }]
      };
    }
  };
}