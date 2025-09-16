// Enhanced Investor Onboarding API - Tier-based registration
import type { APIContext } from 'astro';

interface InvestorData {
  // Basic Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  investorType: 'angel' | 'accredited' | 'vc-fund' | 'beta-partner';

  // Investment Profile
  investmentRange: string;
  preferredSectors: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentHorizon: 'short' | 'medium' | 'long';
  previousExperience: 'none' | 'some' | 'experienced' | 'expert';

  // Accreditation (for qualified investors)
  accreditationType?: 'income' | 'net-worth' | 'professional' | 'entity';
  verificationDocuments?: boolean;

  // Agreements
  agreesToTerms: boolean;
}

export async function POST({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY } = locals.runtime.env;

  try {
    const investorData: InvestorData = await request.json();

    // Validate required agreements
    if (!investorData.agreesToTerms) {
      return new Response(JSON.stringify({
        error: 'Must agree to terms and conditions'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = generateUserId();
    const now = Math.floor(Date.now() / 1000);

    // Create user account
    await DB.prepare(`
      INSERT INTO users (
        id, email, first_name, last_name, user_type,
        created_at, updated_at, status, email_verified
      ) VALUES (?, ?, ?, ?, 'investor', ?, ?, 'pending', 0)
    `).bind(
      userId,
      investorData.email,
      investorData.firstName,
      investorData.lastName,
      now,
      now
    ).run();

    // Calculate AI matching score
    const matchingProfile = calculateMatchingProfile(investorData);

    // Create investor profile
    const investorProfileId = generateInvestorProfileId();
    await DB.prepare(`
      INSERT INTO investor_profiles (
        id, user_id, investor_tier, investment_range, preferred_sectors,
        risk_tolerance, investment_horizon, previous_experience,
        accreditation_type, accreditation_status, ai_matching_score,
        profile_completeness, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification', ?, ?)
    `).bind(
      investorProfileId,
      userId,
      investorData.investorType,
      investorData.investmentRange,
      JSON.stringify(investorData.preferredSectors),
      investorData.riskTolerance,
      investorData.investmentHorizon,
      investorData.previousExperience,
      investorData.accreditationType || null,
      ['accredited', 'vc-fund'].includes(investorData.investorType) ? 'pending' : 'not_required',
      matchingProfile.score,
      matchingProfile.completeness,
      now,
      now
    ).run();

    // Create initial investment preferences
    await DB.prepare(`
      INSERT INTO investment_preferences (
        id, investor_id, preferred_sectors, deal_size_min, deal_size_max,
        risk_tolerance, investment_horizon, geographic_preference,
        follow_on_investment, syndicate_participation, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generatePreferenceId(),
      investorProfileId,
      JSON.stringify(investorData.preferredSectors),
      getDealSizeRange(investorData.investmentRange).min,
      getDealSizeRange(investorData.investmentRange).max,
      investorData.riskTolerance,
      investorData.investmentHorizon,
      'global', // Default to global
      true, // Enable follow-on investments
      true, // Enable syndicate participation
      now
    ).run();

    // Generate initial deal recommendations
    const recommendedDeals = await generateDealRecommendations(
      investorData.preferredSectors,
      investorData.investmentRange,
      investorData.riskTolerance
    );

    // Store deal recommendations
    for (const deal of recommendedDeals) {
      await DB.prepare(`
        INSERT INTO deal_recommendations (
          id, investor_id, listing_id, recommendation_score,
          recommendation_reason, ai_analysis, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        generateRecommendationId(),
        investorProfileId,
        deal.listingId,
        deal.score,
        deal.reason,
        JSON.stringify(deal.analysis),
        now
      ).run();
    }

    // Log onboarding completion for analytics
    await DB.prepare(`
      INSERT INTO investor_analytics (
        date, started_onboarding, completed_angel, completed_accredited,
        completed_vc_fund, completed_beta_partner, avg_matching_score
      ) VALUES (
        DATE('now'), 0, 0, 0, 0, 0, 0
      ) ON CONFLICT(date) DO UPDATE SET
        completed_${investorData.investorType.replace('-', '_')} = completed_${investorData.investorType.replace('-', '_')} + 1,
        avg_matching_score = (avg_matching_score * (completed_angel + completed_accredited + completed_vc_fund + completed_beta_partner - 1) + ?) / (completed_angel + completed_accredited + completed_vc_fund + completed_beta_partner)
    `).bind(matchingProfile.score).run();

    // Send welcome email based on tier
    await sendInvestorWelcomeEmail(investorData, matchingProfile, recommendedDeals);

    return new Response(JSON.stringify({
      success: true,
      userId,
      investorProfileId,
      investorTier: investorData.investorType,
      matchingScore: matchingProfile.score,
      recommendedDeals: recommendedDeals.length,
      nextSteps: getNextSteps(investorData.investorType),
      dashboardUrl: '/investor/dashboard',
      message: `Welcome to TechFlunky! Your ${getTierDisplayName(investorData.investorType)} account has been created.`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Investor onboarding error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to complete investor onboarding. Please try again.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function calculateMatchingProfile(data: InvestorData) {
  let score = 60; // Base score
  let completeness = 0.6; // Base completeness

  // Sector diversity bonus
  if (data.preferredSectors.length >= 3) {
    score += 15;
    completeness += 0.1;
  }

  // Experience bonus
  const experienceBonus = {
    'expert': 20,
    'experienced': 15,
    'some': 10,
    'none': 5
  };
  score += experienceBonus[data.previousExperience];
  completeness += experienceBonus[data.previousExperience] / 100;

  // Risk tolerance alignment (moderate is generally preferred)
  if (data.riskTolerance === 'moderate') {
    score += 5;
    completeness += 0.05;
  }

  // Investment horizon bonus (long-term preferred)
  if (data.investmentHorizon === 'long') {
    score += 10;
    completeness += 0.1;
  }

  // Tier-specific adjustments
  const tierBonus = {
    'angel': 5,
    'accredited': 10,
    'vc-fund': 15,
    'beta-partner': 12
  };
  score += tierBonus[data.investorType];

  return {
    score: Math.min(score, 100),
    completeness: Math.min(completeness, 1.0)
  };
}

function getDealSizeRange(investmentRange: string) {
  const ranges = {
    '5k-25k': { min: 5000, max: 25000 },
    '25k-100k': { min: 25000, max: 100000 },
    '100k-500k': { min: 100000, max: 500000 },
    '500k-1m': { min: 500000, max: 1000000 },
    '1m+': { min: 1000000, max: 10000000 }
  };
  return ranges[investmentRange as keyof typeof ranges] || { min: 5000, max: 25000 };
}

async function generateDealRecommendations(
  preferredSectors: string[],
  investmentRange: string,
  riskTolerance: string
) {
  // Mock AI-powered deal recommendations
  const mockDeals = [
    {
      listingId: 'listing_1',
      score: 92,
      reason: 'Perfect sector match with strong financials',
      analysis: {
        sectorMatch: true,
        priceRange: 'optimal',
        riskLevel: 'moderate',
        growthPotential: 'high'
      }
    },
    {
      listingId: 'listing_2',
      score: 87,
      reason: 'High growth potential in preferred sector',
      analysis: {
        sectorMatch: true,
        priceRange: 'stretch',
        riskLevel: 'moderate-high',
        growthPotential: 'very-high'
      }
    },
    {
      listingId: 'listing_3',
      score: 83,
      reason: 'Conservative play with steady returns',
      analysis: {
        sectorMatch: false,
        priceRange: 'comfortable',
        riskLevel: 'low',
        growthPotential: 'moderate'
      }
    }
  ];

  // Filter based on preferences
  return mockDeals.filter(deal => {
    if (riskTolerance === 'conservative' && deal.analysis.riskLevel.includes('high')) return false;
    if (riskTolerance === 'aggressive' && deal.analysis.riskLevel === 'low') return false;
    return deal.score >= 80; // Only recommend high-quality deals
  });
}

function getNextSteps(investorType: string) {
  const steps = {
    'angel': [
      'Complete email verification',
      'Explore recommended deals',
      'Set up investment preferences',
      'Review deal room materials'
    ],
    'accredited': [
      'Complete email verification',
      'Upload accreditation documents',
      'Access advanced deal analytics',
      'Join investor syndicates'
    ],
    'vc-fund': [
      'Complete email verification',
      'Upload fund documentation',
      'Access institutional tools',
      'Set up API integration'
    ],
    'beta-partner': [
      'Complete email verification',
      'Schedule strategy consultation',
      'Define partnership parameters',
      'Access revenue-sharing deals'
    ]
  };
  return steps[investorType] || steps.angel;
}

function getTierDisplayName(tier: string) {
  const names = {
    'angel': 'Angel Investor',
    'accredited': 'Accredited Investor',
    'vc-fund': 'VC Fund Manager',
    'beta-partner': 'Beta Revenue Partner'
  };
  return names[tier as keyof typeof names] || 'Investor';
}

async function sendInvestorWelcomeEmail(
  data: InvestorData,
  profile: any,
  deals: any[]
) {
  // Mock email service integration
  console.log(`Investor welcome email would be sent to ${data.email}`, {
    name: `${data.firstName} ${data.lastName}`,
    tier: data.investorType,
    matchingScore: profile.score,
    recommendedDeals: deals.length,
    nextSteps: getNextSteps(data.investorType)
  });

  // In production:
  // - Send tier-specific welcome email
  // - Include investment matching results
  // - Provide access credentials and next steps
  // - Schedule onboarding calls for VC/institutional investors
}

function generateUserId(): string {
  return `user_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}

function generateInvestorProfileId(): string {
  return `investor_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}

function generatePreferenceId(): string {
  return `pref_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}

function generateRecommendationId(): string {
  return `rec_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}