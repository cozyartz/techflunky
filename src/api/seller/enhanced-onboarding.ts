// Enhanced Seller Onboarding API - Integrated with New Revenue Model
import type { APIContext } from 'astro';

interface OnboardingData {
  // Step 1: Basic Info
  firstName: string;
  lastName: string;
  email: string;
  businessType: 'individual' | 'company';
  businessName?: string;

  // Step 2: Platform Details
  platformName: string;
  platformDescription: string;
  techStack: string[];
  platformType: string;
  estimatedUsers: string;
  monthsInDevelopment: number;

  // Step 3: Readiness Assessment
  hasLogo: boolean;
  hasBrandKit: boolean;
  hasBusinessPlan: boolean;
  hasFinancialProjections: boolean;
  hasSalesVideo: boolean;
  hasPitchDeck: boolean;
  hasExecutiveSummary: boolean;
  hasMarketingMaterials: boolean;
  hasLegalDocuments: boolean;

  // Step 4: Pricing & Membership
  suggestedPrice: number;
  priceFlexible: boolean;
  acceptsEscrow: boolean;
  membershipTier: string;

  // Step 5: Legal Agreements
  agreesToTerms: boolean;
  understandsRisks: boolean;
  holdsHarmless: boolean;
  noGuarantees: boolean;

  // Calculated fields
  readinessScore?: any;
  recommendedPackage?: string;
}

export async function POST({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY } = locals.runtime.env;

  try {
    const onboardingData: OnboardingData = await request.json();

    // Validate required legal agreements
    if (!onboardingData.agreesToTerms || !onboardingData.understandsRisks ||
        !onboardingData.holdsHarmless || !onboardingData.noGuarantees) {
      return new Response(JSON.stringify({
        error: 'All legal agreements must be accepted'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate readiness score and fee structure
    const readinessAssessment = calculateReadinessAssessment(onboardingData);
    const userId = generateUserId();
    const now = Math.floor(Date.now() / 1000);

    // Create user account
    await DB.prepare(`
      INSERT INTO users (
        id, email, first_name, last_name, business_type, business_name,
        created_at, updated_at, status, email_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
    `).bind(
      userId,
      onboardingData.email,
      onboardingData.firstName,
      onboardingData.lastName,
      onboardingData.businessType,
      onboardingData.businessName || null,
      now,
      now
    ).run();

    // Create seller profile with readiness assessment
    const sellerProfileId = generateSellerProfileId();
    await DB.prepare(`
      INSERT INTO seller_profiles (
        id, user_id, platform_name, platform_description, platform_type,
        tech_stack, suggested_price, months_development,
        readiness_score, readiness_details, recommended_package,
        marketplace_fee_rate, membership_tier, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'onboarding_complete', ?, ?)
    `).bind(
      sellerProfileId,
      userId,
      onboardingData.platformName,
      onboardingData.platformDescription,
      onboardingData.platformType,
      JSON.stringify(onboardingData.techStack),
      onboardingData.suggestedPrice,
      onboardingData.monthsInDevelopment,
      readinessAssessment.score,
      JSON.stringify(readinessAssessment),
      readinessAssessment.suggestedPackage,
      readinessAssessment.feeRate,
      onboardingData.membershipTier,
      now,
      now
    ).run();

    // Create subscription if membership tier selected
    let subscriptionResult = null;
    if (onboardingData.membershipTier !== 'none') {
      try {
        subscriptionResult = await createMembershipSubscription(
          userId,
          onboardingData.membershipTier,
          STRIPE_SECRET_KEY
        );
      } catch (error) {
        console.error('Subscription creation failed:', error);
        // Continue without subscription - they can subscribe later
      }
    }

    // Log liability acceptance for legal compliance
    await DB.prepare(`
      INSERT INTO legal_agreements (
        user_id, agreement_type, agreed_at, ip_address, user_agent,
        agreement_version, agreement_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      'seller_onboarding_liability',
      now,
      request.headers.get('cf-connecting-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      '1.0',
      JSON.stringify({
        agreesToTerms: onboardingData.agreesToTerms,
        understandsRisks: onboardingData.understandsRisks,
        holdsHarmless: onboardingData.holdsHarmless,
        noGuarantees: onboardingData.noGuarantees,
        onboardingTimestamp: now
      })
    ).run();

    // Send welcome email (placeholder)
    await sendWelcomeEmail(onboardingData, readinessAssessment);

    return new Response(JSON.stringify({
      success: true,
      userId,
      sellerProfileId,
      readinessScore: readinessAssessment.score,
      recommendedPackage: readinessAssessment.suggestedPackage,
      feeRate: Math.round(readinessAssessment.feeRate * 100),
      subscriptionCreated: !!subscriptionResult,
      redirectUrl: '/seller/dashboard',
      message: 'Welcome to TechFlunky! Your seller account has been created successfully.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Enhanced onboarding error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to complete onboarding. Please try again.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function calculateReadinessAssessment(data: OnboardingData) {
  const assessmentItems = [
    { key: 'hasLogo', weight: 10, name: 'Professional Logo & Branding' },
    { key: 'hasBrandKit', weight: 8, name: 'Brand Guidelines' },
    { key: 'hasBusinessPlan', weight: 20, name: 'Business Plan' },
    { key: 'hasFinancialProjections', weight: 15, name: 'Financial Projections' },
    { key: 'hasSalesVideo', weight: 12, name: 'Demo/Sales Video' },
    { key: 'hasPitchDeck', weight: 15, name: 'Investor Pitch Deck' },
    { key: 'hasExecutiveSummary', weight: 10, name: 'Executive Summary' },
    { key: 'hasMarketingMaterials', weight: 5, name: 'Marketing Materials' },
    { key: 'hasLegalDocuments', weight: 5, name: 'Legal Documentation' }
  ];

  let score = 0;
  const missing: string[] = [];
  const present: string[] = [];

  assessmentItems.forEach(item => {
    if (data[item.key as keyof OnboardingData]) {
      score += item.weight;
      present.push(item.name);
    } else {
      missing.push(item.name);
    }
  });

  // Determine fee rate and package recommendation
  let feeRate = 0.10; // 10% base
  let suggestedPackage = null;
  const recommendations: string[] = [];

  // Fee rate calculation based on completeness
  if (score >= 80) {
    feeRate = 0.08; // 8% for well-prepared sellers (member rate even without membership)
    recommendations.push('Excellent! Your platform is market-ready.');
    recommendations.push('Consider joining as a member to access advanced tools.');
    suggestedPackage = null;
  } else if (score >= 60) {
    feeRate = 0.09; // 9% for partially prepared
    recommendations.push('Good start! A few more materials will optimize your listing.');
    recommendations.push('Our Professional Package can complete your materials.');
    suggestedPackage = 'professional';
  } else if (score >= 40) {
    feeRate = 0.10; // 10% standard
    recommendations.push('Your platform has potential but needs marketing materials.');
    recommendations.push('Our Market-Ready Package will significantly improve your chances.');
    suggestedPackage = 'market-ready';
  } else {
    feeRate = 0.12; // 12% for minimal preparation
    recommendations.push('Starting from scratch? No problem!');
    recommendations.push('Our Investor-Grade Package creates everything you need.');
    suggestedPackage = 'investor-grade';
  }

  // Calculate potential savings with membership
  const membershipSavings = calculateMembershipROI(data.suggestedPrice, feeRate);

  return {
    score,
    missing,
    present,
    recommendations,
    suggestedPackage,
    feeRate,
    membershipSavings,
    completionLevel:
      score >= 80 ? 'excellent' :
      score >= 60 ? 'good' :
      score >= 40 ? 'fair' : 'needs_work'
  };
}

function calculateMembershipROI(platformPrice: number, currentFeeRate: number) {
  const memberFeeRate = 0.08;
  const savingsPerSale = platformPrice * (currentFeeRate - memberFeeRate);

  const membershipCosts = {
    'starter-investor': 1900, // $19/month
    'professional-investor': 4900, // $49/month
    'enterprise-investor': 14900 // $149/month
  };

  return Object.entries(membershipCosts).map(([tier, cost]) => ({
    tier,
    monthlyCost: cost / 100,
    savingsPerSale: savingsPerSale / 100,
    breakEvenSales: Math.ceil(cost / savingsPerSale) || 1,
    roi: savingsPerSale > 0 ? Math.round((savingsPerSale / cost) * 100) : 0
  }));
}

async function createMembershipSubscription(
  userId: string,
  membershipTier: string,
  stripeSecretKey: string
) {
  // This integrates with our existing subscription system
  const response = await fetch('/api/subscriptions/tiers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      tierId: membershipTier,
      billingCycle: 'monthly',
      trialDays: 14 // 14-day free trial
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create subscription');
  }

  return await response.json();
}

async function sendWelcomeEmail(data: OnboardingData, assessment: any) {
  // Placeholder for email service integration
  console.log(`Welcome email would be sent to ${data.email}`, {
    name: `${data.firstName} ${data.lastName}`,
    platform: data.platformName,
    readinessScore: assessment.score,
    recommendedPackage: assessment.suggestedPackage,
    feeRate: Math.round(assessment.feeRate * 100)
  });

  // In production, integrate with your email service:
  // - SendGrid, Mailgun, or similar
  // - Include onboarding checklist
  // - Recommend next steps based on assessment
  // - Invite to complete any missing materials
}

function generateUserId(): string {
  return `user_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}

function generateSellerProfileId(): string {
  return `seller_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}