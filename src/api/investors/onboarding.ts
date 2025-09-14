// Investor Onboarding and Beta Partner Recruitment
import type { APIContext } from 'astro';

const INVESTOR_TIERS = {
  'angel': {
    name: 'Angel Investor',
    minInvestment: 5000,
    maxInvestment: 250000,
    features: ['deal_discovery', 'basic_analytics', 'direct_messaging'],
    description: 'Individual angel investors looking for quality deals'
  },
  'accredited': {
    name: 'Accredited Investor',
    minInvestment: 25000,
    maxInvestment: 1000000,
    features: ['deal_discovery', 'advanced_analytics', 'syndicate_creation', 'priority_access'],
    description: 'High-net-worth individuals with significant investment capacity'
  },
  'vc_fund': {
    name: 'VC Fund',
    minInvestment: 100000,
    maxInvestment: 10000000,
    features: ['deal_discovery', 'advanced_analytics', 'syndicate_creation', 'priority_access', 'white_label_portal'],
    description: 'Venture capital funds and institutional investors'
  },
  'beta_partner': {
    name: 'Beta Partner',
    minInvestment: 10000,
    maxInvestment: 500000,
    features: ['deal_discovery', 'advanced_analytics', 'syndicate_creation', 'priority_access', 'platform_influence', 'revenue_sharing'],
    description: 'Founding investors who help shape the platform'
  }
};

// Get investor onboarding application
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const applicationId = url.searchParams.get('applicationId');
  const userId = url.searchParams.get('userId');
  const status = url.searchParams.get('status'); // all, pending, approved, rejected

  try {
    if (applicationId) {
      // Get specific application
      const application = await DB.prepare(`
        SELECT
          ia.*,
          u.name,
          u.email,
          ip.investment_focus,
          ip.total_investments
        FROM investor_applications ia
        JOIN users u ON ia.user_id = u.id
        LEFT JOIN investor_profiles ip ON ia.user_id = ip.user_id
        WHERE ia.id = ?
      `).bind(applicationId).first();

      if (!application) {
        return new Response(JSON.stringify({
          error: 'Application not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        application: {
          ...application,
          investor_info: application.investor_info ? JSON.parse(application.investor_info) : {},
          investment_preferences: application.investment_preferences ? JSON.parse(application.investment_preferences) : {},
          references: application.references ? JSON.parse(application.references) : []
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get applications list (admin view or user's own applications)
    let whereClause = '';
    let params = [];

    if (userId) {
      whereClause = 'WHERE ia.user_id = ?';
      params.push(userId);
    } else if (status && status !== 'all') {
      whereClause = 'WHERE ia.status = ?';
      params.push(status);
    }

    const applications = await DB.prepare(`
      SELECT
        ia.*,
        u.name,
        u.email
      FROM investor_applications ia
      JOIN users u ON ia.user_id = u.id
      ${whereClause}
      ORDER BY ia.created_at DESC
    `).bind(...params).all();

    return new Response(JSON.stringify({
      applications: applications.map(app => ({
        ...app,
        investor_info: app.investor_info ? JSON.parse(app.investor_info) : {},
        investment_preferences: app.investment_preferences ? JSON.parse(app.investment_preferences) : {}
      })),
      tiers: INVESTOR_TIERS
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting investor applications:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve applications' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Submit investor application
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      userId,
      investorTier,
      personalInfo,
      investmentInfo,
      preferences,
      references,
      motivation,
      betaPartnerInterest = false
    } = await request.json();

    if (!userId || !investorTier || !personalInfo || !investmentInfo) {
      return new Response(JSON.stringify({
        error: 'User ID, tier, personal info, and investment info required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already has an application
    const existingApp = await DB.prepare(`
      SELECT id FROM investor_applications WHERE user_id = ? AND status IN ('pending', 'approved')
    `).bind(userId).first();

    if (existingApp) {
      return new Response(JSON.stringify({
        error: 'Active application already exists'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate tier
    if (!INVESTOR_TIERS[investorTier]) {
      return new Response(JSON.stringify({
        error: 'Invalid investor tier'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const applicationId = generateApplicationId();

    // Determine initial status based on tier and information quality
    const initialStatus = determineInitialStatus(investorTier, investmentInfo, betaPartnerInterest);

    // Create application
    await DB.prepare(`
      INSERT INTO investor_applications
      (id, user_id, investor_tier, investor_info, investment_preferences, references,
       motivation, beta_partner_interest, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      applicationId,
      userId,
      investorTier,
      JSON.stringify({ ...personalInfo, ...investmentInfo }),
      JSON.stringify(preferences || {}),
      JSON.stringify(references || []),
      motivation || null,
      betaPartnerInterest ? 1 : 0,
      initialStatus,
      now,
      now
    ).run();

    // If approved automatically, create investor profile
    if (initialStatus === 'approved') {
      await createInvestorProfile(userId, investorTier, personalInfo, investmentInfo, preferences, DB);
    }

    // Send welcome email/notification
    await createWelcomeNotification(userId, investorTier, initialStatus, applicationId, DB);

    return new Response(JSON.stringify({
      success: true,
      applicationId,
      status: initialStatus,
      message: initialStatus === 'approved'
        ? 'Welcome! Your investor account has been activated.'
        : 'Application submitted successfully. We\'ll review and get back to you within 24-48 hours.',
      nextSteps: getNextSteps(initialStatus, investorTier, betaPartnerInterest)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error submitting investor application:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit application' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Review and approve/reject investor application (admin)
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      applicationId,
      reviewerId,
      action, // approve, reject, request_info
      reviewNotes,
      assignedTier,
      betaPartnerStatus
    } = await request.json();

    if (!applicationId || !reviewerId || !action) {
      return new Response(JSON.stringify({
        error: 'Application ID, reviewer ID, and action required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get application
    const application = await DB.prepare(`
      SELECT * FROM investor_applications WHERE id = ?
    `).bind(applicationId).first();

    if (!application) {
      return new Response(JSON.stringify({
        error: 'Application not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    let newStatus = application.status;

    if (action === 'approve') {
      newStatus = 'approved';

      // Create investor profile
      const personalInfo = JSON.parse(application.investor_info || '{}');
      const preferences = JSON.parse(application.investment_preferences || '{}');

      await createInvestorProfile(
        application.user_id,
        assignedTier || application.investor_tier,
        personalInfo,
        personalInfo,
        preferences,
        DB
      );

      // If beta partner, add special privileges
      if (betaPartnerStatus) {
        await createBetaPartnerRecord(application.user_id, betaPartnerStatus, DB);
      }

    } else if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'request_info') {
      newStatus = 'info_requested';
    }

    // Update application
    await DB.prepare(`
      UPDATE investor_applications SET
        status = ?,
        reviewer_id = ?,
        review_notes = ?,
        assigned_tier = ?,
        beta_partner_status = ?,
        reviewed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      newStatus,
      reviewerId,
      reviewNotes || null,
      assignedTier || null,
      betaPartnerStatus || null,
      now,
      now,
      applicationId
    ).run();

    // Create notification for applicant
    await createReviewNotification(application.user_id, action, reviewNotes, applicationId, DB);

    return new Response(JSON.stringify({
      success: true,
      newStatus,
      message: `Application ${action}d successfully`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error reviewing investor application:', error);
    return new Response(JSON.stringify({ error: 'Failed to review application' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function determineInitialStatus(tier: string, investmentInfo: any, betaInterest: boolean) {
  // Beta partners get priority review
  if (betaInterest) return 'pending';

  // Auto-approve smaller angel investors with good info
  if (tier === 'angel' &&
      investmentInfo.annualInvestments &&
      investmentInfo.investmentRange &&
      investmentInfo.experience) {
    return 'approved';
  }

  // All others need manual review
  return 'pending';
}

async function createInvestorProfile(userId: string, tier: string, personalInfo: any, investmentInfo: any, preferences: any, DB: any) {
  const profileId = generateProfileId();
  const now = Math.floor(Date.now() / 1000);

  const tierInfo = INVESTOR_TIERS[tier];

  await DB.prepare(`
    INSERT OR REPLACE INTO investor_profiles
    (id, user_id, investor_tier, investment_focus, investment_range_min, investment_range_max,
     total_investments, investment_preferences, accreditation_status, portfolio_size,
     features_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    profileId,
    userId,
    tier,
    JSON.stringify(preferences.industries || []),
    (investmentInfo.minInvestment || tierInfo.minInvestment) * 100,
    (investmentInfo.maxInvestment || tierInfo.maxInvestment) * 100,
    investmentInfo.annualInvestments || 0,
    JSON.stringify(preferences),
    personalInfo.accredited ? 'verified' : 'unverified',
    investmentInfo.portfolioSize || 0,
    JSON.stringify(tierInfo.features),
    now,
    now
  ).run();
}

async function createBetaPartnerRecord(userId: string, status: string, DB: any) {
  const partnerId = generatePartnerId();
  const now = Math.floor(Date.now() / 1000);

  await DB.prepare(`
    INSERT INTO beta_partners
    (id, user_id, partner_status, revenue_share_percentage, platform_influence_level,
     onboarding_completed, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).bind(
    partnerId,
    userId,
    status,
    5.0, // 5% revenue share on deals they originate
    'high', // High influence on platform development
    now
  ).run();
}

async function createWelcomeNotification(userId: string, tier: string, status: string, applicationId: string, DB: any) {
  let title, message;

  if (status === 'approved') {
    title = 'Welcome to TechFlunky Investor Portal!';
    message = `Your ${INVESTOR_TIERS[tier].name} account is now active. Start discovering deals immediately.`;
  } else {
    title = 'Investor Application Received';
    message = 'Thank you for your interest! We\'re reviewing your application and will respond within 24-48 hours.';
  }

  await DB.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
    VALUES (?, ?, 'investor_welcome', ?, ?, ?, ?)
  `).bind(
    generateNotificationId(),
    userId,
    title,
    message,
    JSON.stringify({ applicationId, tier, status }),
    Math.floor(Date.now() / 1000)
  ).run();
}

async function createReviewNotification(userId: string, action: string, notes: string, applicationId: string, DB: any) {
  const titles = {
    'approve': 'Investor Application Approved! 🎉',
    'reject': 'Investor Application Update',
    'request_info': 'Additional Information Requested'
  };

  const messages = {
    'approve': 'Congratulations! Your investor account is now active. Welcome to the TechFlunky community.',
    'reject': 'Thank you for your interest. Unfortunately, we cannot approve your application at this time.',
    'request_info': 'We need some additional information to complete your application review.'
  };

  await DB.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
    VALUES (?, ?, 'application_review', ?, ?, ?, ?)
  `).bind(
    generateNotificationId(),
    userId,
    titles[action],
    `${messages[action]}${notes ? ` ${notes}` : ''}`,
    JSON.stringify({ applicationId, action, reviewNotes: notes }),
    Math.floor(Date.now() / 1000)
  ).run();
}

function getNextSteps(status: string, tier: string, betaInterest: boolean): string[] {
  if (status === 'approved') {
    const steps = [
      'Complete your investor profile setup',
      'Browse available deals in your areas of interest',
      'Set up deal alerts and notifications'
    ];

    if (betaInterest) {
      steps.push('Schedule beta partner onboarding call');
    }

    return steps;
  }

  return [
    'We\'ll review your application within 24-48 hours',
    'Check your email for updates',
    'Prepare any additional documentation we might request'
  ];
}

function generateApplicationId(): string {
  const prefix = 'app_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generateProfileId(): string {
  const prefix = 'prof_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generatePartnerId(): string {
  const prefix = 'beta_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}

function generateNotificationId(): string {
  const prefix = 'not_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}