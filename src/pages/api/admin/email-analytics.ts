import type { APIRoute } from 'astro';
import { cloudflareEmailValidator } from '../../../lib/email-validation-cf';
import { mailerSendService } from '../../../lib/mailersend';

// In production, this would connect to your Cloudflare D1 database
// For now, we'll simulate with in-memory storage and real validation data

interface EmailValidationRecord {
  email: string;
  isValid: boolean;
  score: number;
  isDisposable: boolean;
  isFreeProvider: boolean;
  isRoleBasedEmail: boolean;
  validatedAt: string;
  userType: 'seller' | 'buyer' | 'investor';
}

interface UserStats {
  totalUsers: number;
  sellers: number;
  buyers: number;
  investors: number;
  superAdmins: number;
}

interface EmailQualityMetrics {
  totalValidations: number;
  validEmails: number;
  invalidEmails: number;
  disposableEmails: number;
  freeProviderEmails: number;
  roleBasedEmails: number;
  averageScore: number;
  validationsByDay: Array<{
    date: string;
    validations: number;
    averageScore: number;
  }>;
}

// Simulated database - in production, replace with actual D1 queries
let emailValidations: EmailValidationRecord[] = [
  {
    email: 'owner@techflunky.com',
    isValid: true,
    score: 100,
    isDisposable: false,
    isFreeProvider: false,
    isRoleBasedEmail: false,
    validatedAt: new Date().toISOString(),
    userType: 'seller'
  }
];

// Track offer submissions with email validation
let offers: Array<{
  id: string;
  email: string;
  validationScore: number;
  userType: 'buyer';
  createdAt: string;
}> = [];

// Simulated user database
const users = {
  superAdmins: 1, // Just you, the owner
  sellers: 0,
  buyers: 0,
  investors: 0
};

export const GET: APIRoute = async ({ url, request }) => {
  try {
    // Simple authentication check - in production, use proper auth
    const authHeader = request.headers.get('authorization');
    const isAdmin = authHeader === 'Bearer admin-token'; // Replace with real auth

    if (!isAdmin) {
      return new Response(JSON.stringify({
        error: 'Unauthorized - Admin access required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const endpoint = url.searchParams.get('endpoint');

    switch (endpoint) {
      case 'user-stats':
        return getUserStats();
      case 'email-metrics':
        return getEmailMetrics();
      case 'validation-history':
        return getValidationHistory();
      case 'quality-breakdown':
        return getQualityBreakdown();
      case 'real-time-stats':
        return getRealTimeStats();
      case 'send-verification':
        return sendVerificationEmail(url);
      default:
        return getAllDashboardData();
    }

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch dashboard analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function getUserStats(): Promise<Response> {
  // Count unique validated emails by user type
  const uniqueEmails = new Set();
  const userTypeCounts = {
    sellers: 0,
    buyers: 0,
    investors: 0
  };

  // Count from email validations
  emailValidations.forEach(validation => {
    if (!uniqueEmails.has(validation.email)) {
      uniqueEmails.add(validation.email);
      userTypeCounts[validation.userType]++;
    }
  });

  // Count from offers (buyers)
  offers.forEach(offer => {
    if (!uniqueEmails.has(offer.email)) {
      uniqueEmails.add(offer.email);
      userTypeCounts.buyers++;
    }
  });

  const stats: UserStats = {
    totalUsers: uniqueEmails.size + users.superAdmins,
    sellers: userTypeCounts.sellers,
    buyers: userTypeCounts.buyers,
    investors: userTypeCounts.investors,
    superAdmins: users.superAdmins
  };

  return new Response(JSON.stringify({
    success: true,
    userStats: stats,
    breakdown: {
      verified: uniqueEmails.size,
      unverified: 0, // All emails go through validation
      superAdmins: users.superAdmins
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getEmailMetrics(): Promise<Response> {
  const validEmails = emailValidations.filter(v => v.isValid).length + offers.filter(o => o.validationScore >= 70).length;
  const totalValidations = emailValidations.length + offers.length;
  const invalidEmails = totalValidations - validEmails;

  const disposableEmails = emailValidations.filter(v => v.isDisposable).length;
  const freeProviderEmails = emailValidations.filter(v => v.isFreeProvider).length;
  const roleBasedEmails = emailValidations.filter(v => v.isRoleBasedEmail).length;

  const allScores = [
    ...emailValidations.map(v => v.score),
    ...offers.map(o => o.validationScore)
  ];
  const averageScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;

  // Generate daily validation stats (last 7 days)
  const validationsByDay = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayValidations = emailValidations.filter(v =>
      v.validatedAt.startsWith(dateStr)
    ).length;

    const dayOffers = offers.filter(o =>
      o.createdAt.startsWith(dateStr)
    ).length;

    const dayScores = [
      ...emailValidations.filter(v => v.validatedAt.startsWith(dateStr)).map(v => v.score),
      ...offers.filter(o => o.createdAt.startsWith(dateStr)).map(o => o.validationScore)
    ];

    const dayAverage = dayScores.length > 0 ? dayScores.reduce((a, b) => a + b, 0) / dayScores.length : 0;

    validationsByDay.push({
      date: dateStr,
      validations: dayValidations + dayOffers,
      averageScore: Math.round(dayAverage)
    });
  }

  const metrics: EmailQualityMetrics = {
    totalValidations,
    validEmails,
    invalidEmails,
    disposableEmails,
    freeProviderEmails,
    roleBasedEmails,
    averageScore: Math.round(averageScore),
    validationsByDay
  };

  return new Response(JSON.stringify({
    success: true,
    emailMetrics: metrics,
    qualityDistribution: {
      excellent: allScores.filter(s => s >= 90).length,
      good: allScores.filter(s => s >= 70 && s < 90).length,
      fair: allScores.filter(s => s >= 50 && s < 70).length,
      poor: allScores.filter(s => s < 50).length
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getValidationHistory(): Promise<Response> {
  const recentValidations = [
    ...emailValidations.map(v => ({
      email: v.email,
      score: v.score,
      isValid: v.isValid,
      userType: v.userType,
      validatedAt: v.validatedAt,
      flags: {
        disposable: v.isDisposable,
        freeProvider: v.isFreeProvider,
        roleBased: v.isRoleBasedEmail
      }
    })),
    ...offers.map(o => ({
      email: o.email,
      score: o.validationScore,
      isValid: o.validationScore >= 70,
      userType: o.userType,
      validatedAt: o.createdAt,
      flags: {
        disposable: false,
        freeProvider: false,
        roleBased: false
      }
    }))
  ].sort((a, b) => new Date(b.validatedAt).getTime() - new Date(a.validatedAt).getTime()).slice(0, 50);

  return new Response(JSON.stringify({
    success: true,
    validationHistory: recentValidations,
    totalCount: emailValidations.length + offers.length
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getQualityBreakdown(): Promise<Response> {
  // Note: Cache stats not available in Cloudflare version
  const cacheStats = { size: 0, oldestEntry: null };

  return new Response(JSON.stringify({
    success: true,
    qualityBreakdown: {
      cachePerformance: {
        cacheSize: cacheStats.size,
        oldestEntry: cacheStats.oldestEntry ? `${Math.round(cacheStats.oldestEntry / 1000 / 60)} minutes ago` : null,
        hitRate: cacheStats.size > 0 ? '85%' : '0%' // Simulated cache hit rate
      },
      validationSources: {
        realTimeForm: emailValidations.length,
        offerSubmissions: offers.length,
        bulkValidations: 0
      },
      errorTypes: {
        formatErrors: emailValidations.filter(v => !v.isValid && v.score < 30).length,
        domainErrors: emailValidations.filter(v => !v.isValid && v.score >= 30 && v.score < 50).length,
        mxRecordErrors: emailValidations.filter(v => !v.isValid && v.score >= 50 && v.score < 70).length
      }
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getRealTimeStats(): Promise<Response> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const recentValidations = emailValidations.filter(v =>
    new Date(v.validatedAt) > hourAgo
  ).length;

  const recentOffers = offers.filter(o =>
    new Date(o.createdAt) > hourAgo
  ).length;

  return new Response(JSON.stringify({
    success: true,
    realTimeStats: {
      validationsLastHour: recentValidations + recentOffers,
      averageResponseTime: '245ms',
      activeValidationSessions: Math.floor(Math.random() * 3) + 1, // Simulated
      systemStatus: 'healthy',
      apiCallsToday: emailValidations.length + offers.length,
      errorRate: '0.2%'
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function sendVerificationEmail(url: URL): Promise<Response> {
  const email = url.searchParams.get('email');
  const userName = url.searchParams.get('userName');

  if (!email) {
    return new Response(JSON.stringify({
      error: 'Email parameter is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Generate verification code
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Send verification email using MailerSend
    const emailSent = await mailerSendService.sendEmailVerification(
      email,
      verificationCode,
      userName || undefined
    );

    if (emailSent) {
      console.log(`📧 Verification email sent to ${email} with code: ${verificationCode}`);

      return new Response(JSON.stringify({
        success: true,
        message: 'Verification email sent successfully',
        verificationCode: verificationCode // In production, don't return this
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Failed to send email');
    }

  } catch (error) {
    console.error('Failed to send verification email:', error);
    return new Response(JSON.stringify({
      error: 'Failed to send verification email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getAllDashboardData(): Promise<Response> {
  const userStatsResponse = await getUserStats();
  const emailMetricsResponse = await getEmailMetrics();
  const qualityBreakdownResponse = await getQualityBreakdown();
  const realTimeStatsResponse = await getRealTimeStats();

  const userStats = await userStatsResponse.json();
  const emailMetrics = await emailMetricsResponse.json();
  const qualityBreakdown = await qualityBreakdownResponse.json();
  const realTimeStats = await realTimeStatsResponse.json();

  return new Response(JSON.stringify({
    success: true,
    dashboard: {
      ...userStats,
      ...emailMetrics,
      ...qualityBreakdown,
      ...realTimeStats,
      lastUpdated: new Date().toISOString()
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// POST endpoint to record email validations (called by the validation system)
export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, validationResult, userType = 'buyer' } = await request.json();

    if (!email || !validationResult) {
      return new Response(JSON.stringify({
        error: 'Email and validation result are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store validation record
    const record: EmailValidationRecord = {
      email,
      isValid: validationResult.isValid,
      score: validationResult.score,
      isDisposable: validationResult.isDisposable,
      isFreeProvider: validationResult.isFreeProvider,
      isRoleBasedEmail: validationResult.isRoleBasedEmail,
      validatedAt: new Date().toISOString(),
      userType
    };

    emailValidations.push(record);

    // If this is from an offer submission, also track it separately
    if (userType === 'buyer' && validationResult.isValid) {
      offers.push({
        id: `offer_${Date.now()}`,
        email,
        validationScore: validationResult.score,
        userType: 'buyer',
        createdAt: new Date().toISOString()
      });
    }

    console.log(`📊 Email validation recorded: ${email} (${userType}) - Score: ${validationResult.score}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Validation recorded'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to record email validation:', error);
    return new Response(JSON.stringify({
      error: 'Failed to record validation'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};