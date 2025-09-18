export class InputSanitizer {
  // SQL injection prevention patterns
  private static readonly SQL_INJECTION_PATTERNS = [
    /('|(\\)|;|--|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|javascript|vbscript)/gi,
    /(or\s+1\s*=\s*1|and\s+1\s*=\s*1)/gi,
    /(UNION\s+(ALL\s+)?SELECT|INSERT\s+INTO|UPDATE\s+SET|DELETE\s+FROM)/gi
  ];

  // XSS prevention patterns
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ];

  // Command injection patterns
  private static readonly COMMAND_INJECTION_PATTERNS = [
    /[;&|`$(){}[\]\\]/g,
    /\.\.\//g,
    /(rm|ls|cat|echo|pwd|cd|mkdir|rmdir|mv|cp|chmod|chown|ps|kill|wget|curl|nc|telnet|ssh)/gi
  ];

  static sanitizeString(input: string, options: {
    allowHTML?: boolean;
    maxLength?: number;
    allowSpecialChars?: boolean
  } = {}): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input.trim();

    // Length limits
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // SQL injection prevention
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new Error('Potentially malicious SQL content detected');
      }
    }

    // Command injection prevention
    for (const pattern of this.COMMAND_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new Error('Potentially malicious command content detected');
      }
    }

    // XSS prevention
    if (!options.allowHTML) {
      for (const pattern of this.XSS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
      }

      // Encode HTML entities
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    // Special character restrictions
    if (!options.allowSpecialChars) {
      sanitized = sanitized.replace(/[<>'"&]/g, '');
    }

    return sanitized;
  }

  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email format');
    }

    const sanitized = this.sanitizeString(email, { maxLength: 254 }).toLowerCase();

    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }

    return sanitized;
  }

  static sanitizePassword(password: string): string {
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (password.length > 128) {
      throw new Error('Password too long (max 128 characters)');
    }

    // Check for at least one uppercase, lowercase, number, special char
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      throw new Error('Password must contain uppercase, lowercase, number, and special character');
    }

    return password; // Don't sanitize passwords - just validate
  }

  static sanitizeJSON(jsonString: string): any {
    try {
      const parsed = JSON.parse(jsonString);

      if (typeof parsed === 'object' && parsed !== null) {
        return this.sanitizeObject(parsed);
      }

      return parsed;
    } catch {
      throw new Error('Invalid JSON format');
    }
  }

  private static sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key, { maxLength: 100 });

        if (typeof value === 'string') {
          sanitized[sanitizedKey] = this.sanitizeString(value, { maxLength: 1000 });
        } else if (typeof value === 'number') {
          sanitized[sanitizedKey] = Number.isFinite(value) ? value : 0;
        } else if (typeof value === 'boolean') {
          sanitized[sanitizedKey] = Boolean(value);
        } else if (typeof value === 'object') {
          sanitized[sanitizedKey] = this.sanitizeObject(value);
        }
      }

      return sanitized;
    }

    return obj;
  }

  static validateAndSanitizeInput(input: any, type: 'email' | 'password' | 'string' | 'json', options?: any): any {
    switch (type) {
      case 'email':
        return this.sanitizeEmail(input);
      case 'password':
        return this.sanitizePassword(input);
      case 'string':
        return this.sanitizeString(input, options);
      case 'json':
        return this.sanitizeJSON(input);
      default:
        throw new Error('Unknown input type');
    }
  }
}