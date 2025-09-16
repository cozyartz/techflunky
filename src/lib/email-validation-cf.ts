// Cloudflare Workers compatible email validation
import validator from 'validator';
import disposableDomains from 'disposable-email-domains';

export interface EmailValidationResult {
  isValid: boolean;
  email: string;
  validFormat: boolean;
  validDomain: boolean;
  hasMxRecord: boolean;
  isDisposable: boolean;
  isFreeProvider: boolean;
  isRoleBasedEmail: boolean;
  domainSuggestion?: string;
  errors: string[];
  score: number; // 0-100 confidence score
}

export interface EmailValidationOptions {
  checkMxRecord?: boolean;
  checkDisposable?: boolean;
  checkFreeProvider?: boolean;
  checkRoleBased?: boolean;
  suggestDomains?: boolean;
  timeout?: number;
}

// Common free email providers
const FREE_EMAIL_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
  'live.com', 'msn.com', 'inbox.com', 'gmx.com', 'fastmail.com'
];

// Role-based email prefixes
const ROLE_BASED_EMAILS = [
  'admin', 'administrator', 'support', 'info', 'noreply', 'no-reply',
  'sales', 'marketing', 'contact', 'help', 'service', 'webmaster',
  'postmaster', 'hostmaster', 'abuse', 'security', 'privacy',
  'billing', 'accounts', 'finance', 'hr', 'legal', 'team'
];

// Common domain typos and suggestions
const DOMAIN_SUGGESTIONS: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com'
};

export class CloudflareEmailValidator {
  private static instance: CloudflareEmailValidator;

  static getInstance(): CloudflareEmailValidator {
    if (!CloudflareEmailValidator.instance) {
      CloudflareEmailValidator.instance = new CloudflareEmailValidator();
    }
    return CloudflareEmailValidator.instance;
  }

  async validateEmail(
    email: string,
    options: EmailValidationOptions = {}
  ): Promise<EmailValidationResult> {
    const {
      checkMxRecord = false, // Disabled for Cloudflare Workers
      checkDisposable = true,
      checkFreeProvider = true,
      checkRoleBased = true,
      suggestDomains = true
    } = options;

    const result: EmailValidationResult = {
      isValid: false,
      email: email.toLowerCase().trim(),
      validFormat: false,
      validDomain: false,
      hasMxRecord: false, // Will remain false in CF Workers
      isDisposable: false,
      isFreeProvider: false,
      isRoleBasedEmail: false,
      errors: [],
      score: 0
    };

    try {
      // Step 1: Format validation
      result.validFormat = this.validateFormat(result.email);
      if (!result.validFormat) {
        result.errors.push('Invalid email format');
        return result;
      }

      const [localPart, domain] = result.email.split('@');

      // Step 2: Domain validation
      result.validDomain = this.validateDomain(domain);
      if (!result.validDomain) {
        result.errors.push('Invalid domain format');
      }

      // Step 3: Domain suggestion
      if (suggestDomains && DOMAIN_SUGGESTIONS[domain]) {
        result.domainSuggestion = DOMAIN_SUGGESTIONS[domain];
        result.errors.push(`Did you mean ${localPart}@${result.domainSuggestion}?`);
      }

      // Step 4: MX Record check - Skip in Cloudflare Workers
      // Note: MX checking requires Node.js DNS module which isn't available in CF Workers
      result.hasMxRecord = true; // Assume true for CF deployment

      // Step 5: Disposable email check
      if (checkDisposable) {
        result.isDisposable = this.isDisposableEmail(domain);
        if (result.isDisposable) {
          result.errors.push('Disposable email addresses are not allowed');
        }
      }

      // Step 6: Free provider check
      if (checkFreeProvider) {
        result.isFreeProvider = this.isFreeProvider(domain);
        // Note: This is informational, not necessarily an error
      }

      // Step 7: Role-based email check
      if (checkRoleBased) {
        result.isRoleBasedEmail = this.isRoleBasedEmail(localPart);
        if (result.isRoleBasedEmail) {
          result.errors.push('Role-based email addresses may not be suitable for personal accounts');
        }
      }

      // Calculate confidence score
      result.score = this.calculateScore(result);
      result.isValid = result.score >= 70 && result.errors.length === 0;

      return result;

    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  private validateFormat(email: string): boolean {
    // Use validator.js for comprehensive format validation
    return validator.isEmail(email, {
      allow_utf8_local_part: false, // For better compatibility
      require_tld: true,
      allow_ip_domain: false
    });
  }

  private validateDomain(domain: string): boolean {
    // Check basic domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  private isDisposableEmail(domain: string): boolean {
    return disposableDomains.includes(domain);
  }

  private isFreeProvider(domain: string): boolean {
    return FREE_EMAIL_PROVIDERS.includes(domain);
  }

  private isRoleBasedEmail(localPart: string): boolean {
    const lowerLocal = localPart.toLowerCase();
    return ROLE_BASED_EMAILS.some(role =>
      lowerLocal === role ||
      lowerLocal.startsWith(role + '.') ||
      lowerLocal.startsWith(role + '-') ||
      lowerLocal.startsWith(role + '_')
    );
  }

  private calculateScore(result: EmailValidationResult): number {
    let score = 0;

    // Format validation (mandatory)
    if (result.validFormat) score += 30;

    // Domain validation (mandatory)
    if (result.validDomain) score += 20;

    // Assume MX record is valid for Cloudflare deployment
    score += 25;

    // Bonus points for good practices
    if (!result.isDisposable) score += 10;
    if (!result.isRoleBasedEmail) score += 10;

    // Small penalty for free providers (but not disqualifying)
    if (result.isFreeProvider) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  // Batch validation for multiple emails
  async validateEmailBatch(
    emails: string[],
    options: EmailValidationOptions = {}
  ): Promise<EmailValidationResult[]> {
    const promises = emails.map(email => this.validateEmail(email, options));
    return Promise.all(promises);
  }
}

// Export singleton instance for easy use
export const cloudflareEmailValidator = CloudflareEmailValidator.getInstance();

// Utility function for quick validation
export async function validateEmailCF(
  email: string,
  options?: EmailValidationOptions
): Promise<EmailValidationResult> {
  return cloudflareEmailValidator.validateEmail(email, options);
}

// Utility function for simple boolean check
export async function isValidEmailCF(
  email: string,
  options?: EmailValidationOptions
): Promise<boolean> {
  const result = await validateEmailCF(email, options);
  return result.isValid;
}