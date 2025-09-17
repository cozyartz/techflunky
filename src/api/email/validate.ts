// Email Validation API
// Comprehensive email validation with disposable email detection
import type { APIContext } from 'astro';
import validator from 'validator';
import disposableEmailDomains from 'disposable-email-domains';

export async function POST({ request }: APIContext) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validationResult = validateEmail(email);

    return new Response(JSON.stringify(validationResult), {
      status: validationResult.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Email validation failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function validateEmail(email: string) {
  const validationResults = {
    success: true,
    email: email.toLowerCase().trim(),
    checks: {},
    errors: []
  };

  // Basic format validation
  validationResults.checks.format = validator.isEmail(email);
  if (!validationResults.checks.format) {
    validationResults.success = false;
    validationResults.errors.push('Invalid email format');
  }

  // Length validation
  validationResults.checks.length = email.length <= 254; // RFC 5321 limit
  if (!validationResults.checks.length) {
    validationResults.success = false;
    validationResults.errors.push('Email address too long');
  }

  // Extract domain for further checks
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain) {
    // Disposable email detection
    validationResults.checks.disposable = !disposableEmailDomains.includes(domain);
    if (!validationResults.checks.disposable) {
      validationResults.success = false;
      validationResults.errors.push('Disposable email addresses are not allowed');
    }

    // Common typo detection
    validationResults.checks.typo = !detectCommonTypos(domain);
    if (!validationResults.checks.typo) {
      validationResults.success = false;
      validationResults.errors.push('Possible typo in email domain');
    }

    // Role-based email detection
    const localPart = email.split('@')[0]?.toLowerCase();
    validationResults.checks.roleBasedEmail = !isRoleBasedEmail(localPart);
    if (!validationResults.checks.roleBasedEmail) {
      validationResults.success = false;
      validationResults.errors.push('Role-based email addresses are not allowed');
    }

    // Domain validation
    validationResults.checks.validDomain = validator.isFQDN(domain);
    if (!validationResults.checks.validDomain) {
      validationResults.success = false;
      validationResults.errors.push('Invalid domain name');
    }
  }

  return validationResults;
}

function detectCommonTypos(domain: string): boolean {
  const commonDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'aol.com', 'icloud.com', 'protonmail.com', 'fastmail.com'
  ];

  const commonTypos = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'aol.co': 'aol.com'
  };

  // Check if it's a known typo
  if (commonTypos[domain]) {
    return false;
  }

  // Check for likely typos using edit distance
  for (const correctDomain of commonDomains) {
    if (calculateEditDistance(domain, correctDomain) === 1 && domain !== correctDomain) {
      return false;
    }
  }

  return true;
}

function isRoleBasedEmail(localPart: string): boolean {
  const roleBasedPrefixes = [
    'admin', 'administrator', 'postmaster', 'hostmaster', 'webmaster',
    'www', 'ftp', 'mail', 'email', 'marketing', 'sales', 'support',
    'help', 'info', 'contact', 'service', 'noreply', 'no-reply',
    'donotreply', 'do-not-reply', 'notification', 'notifications'
  ];

  return roleBasedPrefixes.includes(localPart);
}

function calculateEditDistance(str1: string, str2: string): number {
  const dp = Array(str1.length + 1).fill(null).map(() =>
    Array(str2.length + 1).fill(null)
  );

  for (let i = 0; i <= str1.length; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[str1.length][str2.length];
}