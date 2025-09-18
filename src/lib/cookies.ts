export class SecureCookieManager {
  private static readonly COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict' as const,
    path: '/',
    domain: undefined // Will be set dynamically
  };

  static createSessionCookie(sessionToken: string, maxAge: number, isDevelopment = false): string {
    const options = {
      ...this.COOKIE_OPTIONS,
      secure: !isDevelopment, // Allow non-HTTPS in development
    };

    const cookieAttributes = [
      `session=${sessionToken}`,
      `Path=${options.path}`,
      `Max-Age=${maxAge}`,
      `SameSite=${options.sameSite}`
    ];

    if (options.httpOnly) {
      cookieAttributes.push('HttpOnly');
    }

    if (options.secure) {
      cookieAttributes.push('Secure');
    }

    // Add Partitioned attribute for cross-site isolation
    cookieAttributes.push('Partitioned');

    return cookieAttributes.join('; ');
  }

  static createCSRFCookie(csrfToken: string, maxAge: number, isDevelopment = false): string {
    const options = {
      ...this.COOKIE_OPTIONS,
      httpOnly: false, // CSRF tokens need to be accessible to JavaScript
      secure: !isDevelopment,
    };

    const cookieAttributes = [
      `csrf_token=${csrfToken}`,
      `Path=${options.path}`,
      `Max-Age=${maxAge}`,
      `SameSite=${options.sameSite}`
    ];

    if (options.secure) {
      cookieAttributes.push('Secure');
    }

    cookieAttributes.push('Partitioned');

    return cookieAttributes.join('; ');
  }

  static createLogoutCookie(isDevelopment = false): string {
    const options = {
      ...this.COOKIE_OPTIONS,
      secure: !isDevelopment,
    };

    const cookieAttributes = [
      'session=',
      `Path=${options.path}`,
      'Max-Age=0',
      `SameSite=${options.sameSite}`,
      'HttpOnly'
    ];

    if (options.secure) {
      cookieAttributes.push('Secure');
    }

    return cookieAttributes.join('; ');
  }

  static parseSessionCookie(cookieHeader: string): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('session=')) {
        const value = cookie.substring(8);
        return value || null;
      }
    }

    return null;
  }

  static addSecurityHeaders(response: Response): void {
    // Prevent cookie access via JavaScript (additional protection)
    response.headers.set('Set-Cookie-Security', 'HttpOnly; Secure; SameSite=Strict');

    // Additional security headers
    response.headers.set('Clear-Site-Data', '"cookies", "storage", "cache"');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  }
}