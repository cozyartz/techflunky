// Enterprise-grade authentication and security system for TechFlunky
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'seller' | 'buyer' | 'investor';
  verified: boolean;
  mfaEnabled: boolean;
  lastLogin: string;
  permissions: string[];
  tier: 'basic' | 'pro' | 'enterprise';
  securityLevel: number;
}

export interface SessionData {
  user: User;
  sessionId: string;
  csrfToken: string;
  createdAt: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  sessionDuration: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  mfaRequired: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
}

// Default security configuration
const DEFAULT_CONFIG: SecurityConfig = {
  jwtSecret: '', // Will be set from environment
  sessionDuration: 24 * 60 * 60 * 1000, // 24 hours
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  mfaRequired: false,
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true
  }
};

export class AuthenticationService {
  private config: SecurityConfig;
  private secretKey: Uint8Array;

  constructor(env?: any) {
    this.config = {
      ...DEFAULT_CONFIG,
      jwtSecret: env?.JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production'
    };

    this.secretKey = new TextEncoder().encode(this.config.jwtSecret);
  }

  // Generate secure JWT token
  async generateToken(user: User, sessionId: string): Promise<string> {
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      sessionId,
      permissions: user.permissions,
      securityLevel: user.securityLevel,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.config.sessionDuration) / 1000)
    };

    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .setIssuer('techflunky.com')
      .setAudience('techflunky-users')
      .sign(this.secretKey);
  }

  // Verify and decode JWT token
  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey, {
        issuer: 'techflunky.com',
        audience: 'techflunky-users'
      });

      // Check if token is expired
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  // Extract token from request
  extractToken(request: Request): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookies for session token
    const cookies = request.headers.get('Cookie');
    if (cookies) {
      const tokenMatch = cookies.match(/session_token=([^;]+)/);
      if (tokenMatch) {
        return tokenMatch[1];
      }
    }

    return null;
  }

  // Generate CSRF token
  generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Validate password against security policy
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const policy = this.config.passwordPolicy;

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain repeated characters');
    }

    if (/123|abc|qwerty|password/i.test(password)) {
      errors.push('Password cannot contain common patterns');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Hash password securely
  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + this.config.jwtSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Verify password against hash
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  // Check if user has permission
  hasPermission(user: User, permission: string): boolean {
    if (user.role === 'admin') return true;
    return user.permissions.includes(permission);
  }

  // Check if user has required security level
  hasSecurityLevel(user: User, requiredLevel: number): boolean {
    return user.securityLevel >= requiredLevel;
  }
}

// Rate limiting service
export class RateLimitService {
  private attempts: Map<string, { count: number; lastAttempt: number; lockedUntil?: number }> = new Map();

  // Check if IP/user is rate limited
  isRateLimited(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return false;
    }

    // Check if locked out
    if (record.lockedUntil && now < record.lockedUntil) {
      return true;
    }

    // Reset if window has passed
    if (now - record.lastAttempt > windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return false;
    }

    // Increment attempts
    record.count++;
    record.lastAttempt = now;

    // Lock if max attempts reached
    if (record.count > maxAttempts) {
      record.lockedUntil = now + windowMs;
      return true;
    }

    return false;
  }

  // Reset rate limit for identifier
  resetRateLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }

  // Get remaining attempts
  getRemainingAttempts(identifier: string, maxAttempts: number = 5): number {
    const record = this.attempts.get(identifier);
    if (!record) return maxAttempts;
    return Math.max(0, maxAttempts - record.count);
  }
}

// Input sanitization service
export class InputSanitizer {
  // Sanitize HTML to prevent XSS
  static sanitizeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Sanitize SQL input to prevent injection
  static sanitizeSql(input: string): string {
    return input
      .replace(/['";\\]/g, '')
      .replace(/-{2,}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
  }

  // Validate email format
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  // Validate UUID format
  static validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Remove dangerous characters from filename
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }

  // Validate and sanitize JSON input
  static sanitizeJson(input: string): any {
    try {
      const parsed = JSON.parse(input);
      // Remove any potential prototype pollution
      if (parsed && typeof parsed === 'object') {
        delete parsed.__proto__;
        delete parsed.constructor;
        delete parsed.prototype;
      }
      return parsed;
    } catch {
      throw new Error('Invalid JSON format');
    }
  }
}

// Security event logger
export class SecurityLogger {
  // Log security events
  static async logEvent(event: {
    type: 'auth_success' | 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'permission_denied' | 'data_access';
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event,
      id: crypto.randomUUID()
    };

    // In production, send to security monitoring system
    console.log('SECURITY_EVENT:', JSON.stringify(logEntry));

    // Alert on critical events
    if (event.severity === 'critical') {
      await this.sendSecurityAlert(logEntry);
    }
  }

  // Send security alerts
  private static async sendSecurityAlert(event: any): Promise<void> {
    // In production, integrate with alerting system (email, Slack, PagerDuty)
    console.error('CRITICAL_SECURITY_EVENT:', event);
  }
}

// Export singleton instances
export const authService = new AuthenticationService();
export const rateLimitService = new RateLimitService();

// Utility functions for middleware
export async function getCurrentUser(request: Request, env?: any): Promise<User | null> {
  const auth = new AuthenticationService(env);
  const token = auth.extractToken(request);

  if (!token) return null;

  const payload = await auth.verifyToken(token);
  if (!payload) return null;

  // In production, fetch from database
  return {
    id: payload.sub as string,
    email: payload.email as string,
    role: payload.role as any,
    verified: true,
    mfaEnabled: false,
    lastLogin: new Date().toISOString(),
    permissions: payload.permissions as string[] || [],
    tier: payload.tier as any || 'basic',
    securityLevel: payload.securityLevel as number || 1
  };
}

export function requireAuth(user: User | null): User {
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export function requireRole(user: User | null, role: string): User {
  const authenticatedUser = requireAuth(user);
  if (authenticatedUser.role !== role && authenticatedUser.role !== 'admin') {
    throw new Error('Insufficient permissions');
  }
  return authenticatedUser;
}

export function requirePermission(user: User | null, permission: string): User {
  const authenticatedUser = requireAuth(user);
  if (!authService.hasPermission(authenticatedUser, permission)) {
    throw new Error('Permission denied');
  }
  return authenticatedUser;
}