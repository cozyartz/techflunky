import { defineMiddleware } from 'astro:middleware';
import { getCurrentUser } from './lib/auth';
import { SecurityLogger } from './lib/security/auth';
import { RateLimitValidator, AdvancedSanitizer, CSRFValidator, CSPValidator } from './lib/security/validation';

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/admin',
  '/dashboard',
  '/seller',
  '/api/admin',
  '/api/seller',
  '/api/buyer/profile',
  '/api/investor'
];

// Public routes that bypass authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/api/auth',
  '/api/webhooks',
  '/api/stripe/test-sandbox',
  '/test',
  '/api/listings',
  '/api/platform/create',
  '/api/email/validate',
  '/api/notifications',
  '/api/blueprint',
  '/api/ai',
  '/api/validation'
];

// High-security routes requiring elevated permissions
const HIGH_SECURITY_ROUTES = [
  '/admin',
  '/api/admin',
  '/api/containerization'
];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  const pathname = url.pathname;
  const clientIP = request.headers.get('CF-Connecting-IP') ||
                   request.headers.get('X-Forwarded-For') ||
                   'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';

  // Get user context first for rate limiting
  const env = context.locals.runtime?.env || {};
  const user = await getCurrentUser(request, env);
  if (user) {
    context.locals.user = user;
  }

  // Advanced rate limiting check with role-based limits
  const userRole = user?.role || 'guest';
  const rateLimitResult = RateLimitValidator.checkRateLimit(clientIP, pathname, userRole);

  if (!rateLimitResult.allowed) {
    await SecurityLogger.logEvent({
      type: 'rate_limit',
      ipAddress: clientIP,
      userAgent,
      details: {
        path: pathname,
        method: request.method,
        userRole,
        resetTime: rateLimitResult.resetTime
      },
      severity: 'medium'
    });

    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    });
  }

  // Check route types early
  const requiresAuth = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  const isHighSecurityRoute = HIGH_SECURITY_ROUTES.some(route => pathname.startsWith(route));

  // Authentication check BEFORE calling next()
  if (requiresAuth && !isPublicRoute) {
    if (!user) {
      await SecurityLogger.logEvent({
        type: 'auth_failure',
        ipAddress: clientIP,
        userAgent,
        details: { path: pathname, reason: 'No authentication' },
        severity: 'medium'
      });

      // Redirect to login for page requests
      if (!pathname.startsWith('/api/')) {
        return Response.redirect(new URL('/login', url.origin), 302);
      }

      return new Response('Authentication required', { status: 401 });
    }

    // Log successful authentication
    await SecurityLogger.logEvent({
      type: 'auth_success',
      userId: user.id,
      ipAddress: clientIP,
      userAgent,
      details: { path: pathname },
      severity: 'low'
    });
  }

  // High-security route checks
  if (isHighSecurityRoute && user) {
    // Require admin role for high-security routes
    if (user.role !== 'admin') {
      await SecurityLogger.logEvent({
        type: 'permission_denied',
        userId: user.id,
        ipAddress: clientIP,
        userAgent,
        details: { path: pathname, requiredRole: 'admin', userRole: user.role },
        severity: 'high'
      });

      return new Response('Insufficient permissions', { status: 403 });
    }

    // High security routes require admin role only (simplified from complex enterprise system)
  }

  // Admin route protection
  if (pathname.startsWith('/admin') && user && user.role !== 'admin') {
    await SecurityLogger.logEvent({
      type: 'permission_denied',
      userId: user.id,
      ipAddress: clientIP,
      userAgent,
      details: { path: pathname, attemptedAccess: 'admin_area' },
      severity: 'high'
    });

    return new Response('Admin access required', { status: 403 });
  }

  // Call next() AFTER authentication checks pass
  const response = await next();

  // Add security headers if not already present
  if (!response.headers.get('X-Content-Type-Options')) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }
  if (!response.headers.get('X-Frame-Options')) {
    response.headers.set('X-Frame-Options', 'DENY');
  }
  if (!response.headers.get('X-XSS-Protection')) {
    response.headers.set('X-XSS-Protection', '0');
  }

  // Store original request for body validation without consuming it
  let validationPassed = true;
  let validationError: string | null = null;

  // Comprehensive input validation for API routes (skip for public routes)
  if (pathname.startsWith('/api/') && request.method !== 'GET' && !isPublicRoute) {
    try {
      const contentType = request.headers.get('Content-Type');

      if (contentType?.includes('application/json')) {
        // Clone request to read body without consuming original
        const clonedRequest = request.clone();
        const body = await clonedRequest.text();

        if (body) {
          // Advanced JSON validation and sanitization
          try {
            const sanitizedData = AdvancedSanitizer.sanitizeJson(body);

            // Validate content for CSP violations
            const cspValidation = CSPValidator.validateInlineContent(body);
            if (!cspValidation.safe) {
              validationPassed = false;
              validationError = 'Request contains unsafe content';

              await SecurityLogger.logEvent({
                type: 'suspicious_activity',
                ipAddress: clientIP,
                userAgent,
                details: {
                  path: pathname,
                  violations: cspValidation.violations,
                  error: 'CSP violation in request body'
                },
                severity: 'high'
              });
            }

            // Store sanitized data for use in API handlers (optional)
            // Note: sanitizedBody would need to be added to Locals type definition
          } catch (jsonError) {
            validationPassed = false;
            validationError = 'Invalid JSON format';
          }
        }
      }

      // Validate file uploads
      if (contentType?.includes('multipart/form-data')) {
        const contentLength = request.headers.get('Content-Length');
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (contentLength && parseInt(contentLength) > maxSize) {
          await SecurityLogger.logEvent({
            type: 'suspicious_activity',
            ipAddress: clientIP,
            userAgent,
            details: { path: pathname, error: 'File size exceeds limit', size: contentLength },
            severity: 'medium'
          });

          return new Response('File size too large', { status: 413 });
        }
      }

    } catch (error) {
      validationPassed = false;
      validationError = 'Input validation failed';

      await SecurityLogger.logEvent({
        type: 'suspicious_activity',
        ipAddress: clientIP,
        userAgent,
        details: { path: pathname, error: 'Input validation failed', details: String(error) },
        severity: 'medium'
      });
    }

    // Return validation errors after checking, but before calling next()
    if (!validationPassed) {
      return new Response(validationError || 'Invalid request format', { status: 400 });
    }
  }

  // Authentication checks already handled above

  // Enhanced API route security
  if (pathname.startsWith('/api/')) {
    // Enhanced CSRF protection for state-changing operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfToken = request.headers.get('X-CSRF-Token');
      const origin = request.headers.get('Origin');

      // Validate CSRF token if user is authenticated
      if (user) {
        const sessionId = request.headers.get('X-Session-ID');
        if (!sessionId || !CSRFValidator.validateToken(sessionId, csrfToken || '')) {
          await SecurityLogger.logEvent({
            type: 'suspicious_activity',
            userId: user.id,
            ipAddress: clientIP,
            userAgent,
            details: { path: pathname, reason: 'Invalid CSRF token' },
            severity: 'high'
          });

          return new Response('CSRF token validation failed', { status: 403 });
        }
      }

      // Validate origin for CORS protection
      if (origin && !origin.includes(url.origin)) {
        await SecurityLogger.logEvent({
          type: 'suspicious_activity',
          userId: user?.id,
          ipAddress: clientIP,
          userAgent,
          details: { path: pathname, reason: 'Invalid origin', origin },
          severity: 'high'
        });

        return new Response('Invalid request origin', { status: 403 });
      }
    }

    // Advanced endpoint-specific rate limiting
    const authEndpoints = ['/auth/', '/login', '/register', '/password-reset'];
    const paymentEndpoints = ['/payment/', '/stripe/', '/purchase'];

    if (authEndpoints.some(endpoint => pathname.includes(endpoint))) {
      const authLimit = RateLimitValidator.checkRateLimit(`auth:${clientIP}`, '/api/auth/', userRole);
      if (!authLimit.allowed) {
        await SecurityLogger.logEvent({
          type: 'rate_limit',
          ipAddress: clientIP,
          userAgent,
          details: { path: pathname, type: 'auth_rate_limit', resetTime: authLimit.resetTime },
          severity: 'high'
        });

        return new Response('Too many authentication attempts', {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((authLimit.resetTime - Date.now()) / 1000).toString()
          }
        });
      }
    }

    if (paymentEndpoints.some(endpoint => pathname.includes(endpoint))) {
      const paymentLimit = RateLimitValidator.checkRateLimit(`payment:${clientIP}`, '/api/payment/', userRole);
      if (!paymentLimit.allowed) {
        await SecurityLogger.logEvent({
          type: 'rate_limit',
          ipAddress: clientIP,
          userAgent,
          details: { path: pathname, type: 'payment_rate_limit', resetTime: paymentLimit.resetTime },
          severity: 'high'
        });

        return new Response('Too many payment requests', {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((paymentLimit.resetTime - Date.now()) / 1000).toString()
          }
        });
      }
    }

    // Additional security headers for API responses
    response.headers.set('X-API-Version', '1.0');
    response.headers.set('X-Request-ID', crypto.randomUUID());

    if (user) {
      response.headers.set('X-User-Role', user.role);
    }
  }

  return response;
});