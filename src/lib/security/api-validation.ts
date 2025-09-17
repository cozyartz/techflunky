// API Route Validation Middleware
// Provides comprehensive OWASP protection for all API endpoints

import type { APIContext } from 'astro';
import { z } from 'zod';
import { ValidationSchemas, createValidationMiddleware, AdvancedSanitizer, RateLimitValidator } from './validation';
import { SecurityLogger, requireAuth, requireRole, requirePermission } from './auth';

export interface ValidatedAPIContext extends APIContext {
  locals: APIContext['locals'] & {
    validatedData?: any;
    sanitizedBody?: any;
    user?: any;
    rateLimitInfo?: {
      remaining: number;
      resetTime: number;
    };
  };
}

// Main API validation wrapper
export function createSecureAPIHandler(
  handler: (context: ValidatedAPIContext) => Promise<Response>,
  options: {
    requireAuth?: boolean;
    requiredRole?: string;
    requiredPermission?: string;
    validationSchema?: z.ZodSchema;
    rateLimitKey?: string;
    allowedMethods?: string[];
  } = {}
) {
  return async (context: APIContext): Promise<Response> => {
    const {
      requireAuth: needsAuth = false,
      requiredRole,
      requiredPermission,
      validationSchema,
      rateLimitKey,
      allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    } = options;

    const { request } = context;
    const method = request.method;
    const pathname = new URL(request.url).pathname;

    // Method validation
    if (!allowedMethods.includes(method)) {
      await SecurityLogger.logEvent({
        type: 'suspicious_activity',
        details: {
          action: 'invalid_http_method',
          method,
          pathname,
          allowedMethods
        },
        severity: 'medium'
      });

      return new Response('Method not allowed', {
        status: 405,
        headers: {
          'Allow': allowedMethods.join(', ')
        }
      });
    }

    // Enhanced rate limiting for API endpoints
    if (rateLimitKey) {
      const clientIP = request.headers.get('CF-Connecting-IP') ||
                       request.headers.get('X-Forwarded-For') ||
                       'unknown';
      const user = context.locals.user;
      const userRole = user?.role || 'guest';

      const rateLimitResult = RateLimitValidator.checkRateLimit(
        `${rateLimitKey}:${clientIP}`,
        pathname,
        userRole
      );

      if (!rateLimitResult.allowed) {
        await SecurityLogger.logEvent({
          type: 'rate_limit',
          userId: user?.id,
          ipAddress: clientIP,
          details: {
            action: 'api_rate_limit_exceeded',
            endpoint: rateLimitKey,
            pathname,
            resetTime: rateLimitResult.resetTime
          },
          severity: 'medium'
        });

        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          resetTime: rateLimitResult.resetTime,
          remaining: rateLimitResult.remaining
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        });
      }

      // Store rate limit info for handler
      context.locals.rateLimitInfo = {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime
      };
    }

    // Authentication and authorization
    if (needsAuth) {
      try {
        const user = requireAuth(context.locals.user);

        if (requiredRole) {
          requireRole(user, requiredRole);
        }

        if (requiredPermission) {
          requirePermission(user, requiredPermission);
        }
      } catch (error) {
        await SecurityLogger.logEvent({
          type: 'auth_failure',
          userId: context.locals.user?.id,
          details: {
            action: 'api_auth_failed',
            pathname,
            requiredRole,
            requiredPermission,
            error: error.message
          },
          severity: 'medium'
        });

        return new Response(JSON.stringify({
          error: 'Authentication required',
          details: error.message
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Request body validation
    if (validationSchema && ['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        let requestData: any = {};

        const contentType = request.headers.get('Content-Type') || '';

        if (contentType.includes('application/json')) {
          // Use sanitized body from middleware if available
          if (context.locals.sanitizedBody) {
            requestData = context.locals.sanitizedBody;
          } else {
            const body = await request.text();
            requestData = AdvancedSanitizer.sanitizeJson(body);
          }
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          requestData = Object.fromEntries(formData.entries());
          requestData = AdvancedSanitizer.removePrototypePollution(requestData);
        } else if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          requestData = {};

          for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
              // Validate file upload
              const fileValidation = validateFileUpload(value);
              if (!fileValidation.valid) {
                return new Response(JSON.stringify({
                  error: 'Invalid file upload',
                  details: fileValidation.errors
                }), {
                  status: 400,
                  headers: { 'Content-Type': 'application/json' }
                });
              }
              requestData[key] = value;
            } else {
              requestData[key] = AdvancedSanitizer.sanitizeHtml(value.toString());
            }
          }
        }

        // Validate against schema
        const validator = createValidationMiddleware(validationSchema);
        const validationResult = await validator(requestData);

        if (!validationResult.success) {
          await SecurityLogger.logEvent({
            type: 'suspicious_activity',
            userId: context.locals.user?.id,
            details: {
              action: 'api_validation_failed',
              pathname,
              errors: validationResult.errors
            },
            severity: 'medium'
          });

          return new Response(JSON.stringify({
            error: 'Validation failed',
            details: validationResult.errors
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Store validated data for handler
        context.locals.validatedData = validationResult.data;

      } catch (error) {
        await SecurityLogger.logEvent({
          type: 'suspicious_activity',
          userId: context.locals.user?.id,
          details: {
            action: 'api_request_parsing_failed',
            pathname,
            error: error.message
          },
          severity: 'medium'
        });

        return new Response(JSON.stringify({
          error: 'Invalid request format',
          details: error.message
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Security headers for API responses
    const secureHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '0',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-API-Version': '1.0',
      'X-Request-ID': crypto.randomUUID()
    };

    try {
      // Call the actual handler
      const response = await handler(context as ValidatedAPIContext);

      // Add security headers to response
      Object.entries(secureHeaders).forEach(([key, value]) => {
        if (!response.headers.has(key)) {
          response.headers.set(key, value);
        }
      });

      // Log successful API access
      await SecurityLogger.logEvent({
        type: 'data_access',
        userId: context.locals.user?.id,
        details: {
          action: 'api_access_success',
          pathname,
          method,
          statusCode: response.status
        },
        severity: 'low'
      });

      return response;

    } catch (error) {
      await SecurityLogger.logEvent({
        type: 'suspicious_activity',
        userId: context.locals.user?.id,
        details: {
          action: 'api_handler_error',
          pathname,
          method,
          error: error.message
        },
        severity: 'high'
      });

      return new Response(JSON.stringify({
        error: 'Internal server error',
        requestId: crypto.randomUUID()
      }), {
        status: 500,
        headers: secureHeaders
      });
    }
  };
}

// File upload validation
function validateFileUpload(file: File): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // File size validation (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('File size exceeds 10MB limit');
  }

  if (file.size === 0) {
    errors.push('File cannot be empty');
  }

  // File type validation
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip'
  ];

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} not allowed`);
  }

  // Filename validation
  const filename = file.name;
  if (filename.length > 255) {
    errors.push('Filename too long');
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    errors.push('Filename contains invalid characters');
  }

  // Extension validation
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.zip'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} not allowed`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Specific API endpoint validators
export const APIValidators = {
  // User registration validation
  userRegistration: createSecureAPIHandler,

  // Business blueprint validation
  businessBlueprint: (handler: Function) => createSecureAPIHandler(handler, {
    requireAuth: true,
    requiredRole: 'seller',
    validationSchema: ValidationSchemas.businessBlueprint,
    rateLimitKey: 'blueprint_creation',
    allowedMethods: ['POST', 'PUT']
  }),

  // Marketplace listing validation
  marketplaceListing: (handler: Function) => createSecureAPIHandler(handler, {
    requireAuth: true,
    requiredRole: 'seller',
    validationSchema: ValidationSchemas.marketplaceListing,
    rateLimitKey: 'marketplace_listing',
    allowedMethods: ['POST', 'PUT', 'DELETE']
  }),

  // Investment application validation
  investmentApplication: (handler: Function) => createSecureAPIHandler(handler, {
    requireAuth: true,
    requiredRole: 'investor',
    validationSchema: ValidationSchemas.investmentApplication,
    rateLimitKey: 'investment_application',
    allowedMethods: ['POST', 'PUT']
  }),

  // Payment processing validation
  paymentProcessing: (handler: Function) => createSecureAPIHandler(handler, {
    requireAuth: true,
    validationSchema: ValidationSchemas.paymentData,
    rateLimitKey: 'payment_processing',
    allowedMethods: ['POST']
  }),

  // Messaging validation
  messaging: (handler: Function) => createSecureAPIHandler(handler, {
    requireAuth: true,
    validationSchema: ValidationSchemas.messageContent,
    rateLimitKey: 'messaging',
    allowedMethods: ['POST', 'GET']
  }),

  // Search validation
  search: (handler: Function) => createSecureAPIHandler(handler, {
    validationSchema: ValidationSchemas.searchQuery,
    rateLimitKey: 'search',
    allowedMethods: ['GET', 'POST']
  }),

  // Admin-only endpoints
  adminOnly: (handler: Function) => createSecureAPIHandler(handler, {
    requireAuth: true,
    requiredRole: 'admin',
    rateLimitKey: 'admin_operations',
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
  }),

  // File upload endpoints
  fileUpload: (handler: Function) => createSecureAPIHandler(handler, {
    requireAuth: true,
    rateLimitKey: 'file_upload',
    allowedMethods: ['POST']
  })
};

// Response utilities for consistent API responses
export const APIResponse = {
  success: (data: any, status = 200) => new Response(JSON.stringify({
    success: true,
    data,
    timestamp: Date.now()
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  }),

  error: (message: string, details?: any, status = 400) => new Response(JSON.stringify({
    success: false,
    error: message,
    details,
    timestamp: Date.now()
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  }),

  validation: (errors: any[]) => new Response(JSON.stringify({
    success: false,
    error: 'Validation failed',
    details: errors,
    timestamp: Date.now()
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  }),

  unauthorized: (message = 'Authentication required') => new Response(JSON.stringify({
    success: false,
    error: message,
    timestamp: Date.now()
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  }),

  forbidden: (message = 'Insufficient permissions') => new Response(JSON.stringify({
    success: false,
    error: message,
    timestamp: Date.now()
  }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  }),

  rateLimit: (resetTime: number, remaining: number) => new Response(JSON.stringify({
    success: false,
    error: 'Rate limit exceeded',
    resetTime,
    remaining,
    timestamp: Date.now()
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(resetTime).toISOString()
    }
  })
};