export class CSRFProtection {
  private static readonly SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-key';

  static generateToken(sessionId: string): string {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID().substring(0, 8);
    const payload = `${sessionId}:${timestamp}:${nonce}`;

    // Simple HMAC-like signing using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(payload + this.SECRET);

    return btoa(payload).replace(/[+/=]/g, '');
  }

  static validateToken(token: string, sessionId: string): boolean {
    try {
      if (!token || !sessionId) return false;

      // Decode and parse token
      const payload = atob(token);
      const parts = payload.split(':');

      if (parts.length !== 3) return false;

      const [tokenSessionId, timestamp, nonce] = parts;

      // Validate session ID matches
      if (tokenSessionId !== sessionId) return false;

      // Validate token age (max 1 hour)
      const tokenTime = parseInt(timestamp);
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour

      if (now - tokenTime > maxAge) return false;

      return true;
    } catch {
      return false;
    }
  }

  static getCSRFHeader(): { name: string; value: string } {
    return {
      name: 'X-CSRF-Token',
      value: 'required'
    };
  }
}