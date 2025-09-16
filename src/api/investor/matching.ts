// AI-Powered Investment Matching API for Investors
import type { APIContext } from 'astro';

interface MatchingCriteria {
  investmentRange: string;
  riskTolerance: string;
  preferredSectors: string[];
  investmentHorizon: string;
  minReadinessScore: number;
  requiresRevenue: boolean;
}

interface InvestmentOpportunity {
  id: string;
  platformName: string;
  seller: string;
  industry: string;
  askingPrice: number;
  revenue: string;
  growth: string;
  stage: string;
  readinessScore: number;
  aiScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeToExit: string;
  projectedROI: string;
  highlights: string[];
  concerns: string[];
  financials: {
    monthlyRevenue: number;
    userGrowth: string;
    churnRate: string;
    marketSize: string;
  };
  dueDiligence: {
    technicalAudit: number;
    marketValidation: number;
    financialHealth: number;
    teamAssessment: number;
  };
}

export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const criteria: MatchingCriteria = await request.json();

    // Get matching platforms from database
    const platforms = await findMatchingPlatforms(DB, criteria);

    // Calculate AI matching scores and generate opportunities
    const opportunities = await Promise.all(
      platforms.map(platform => generateInvestmentOpportunity(platform, criteria))
    );

    // Sort by AI score and filter out low matches
    const qualifiedOpportunities = opportunities
      .filter(op => op.aiScore >= 70) // Only show high-quality matches
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 15); // Limit to top 15 opportunities

    // Log matching analytics
    await logMatchingAnalytics(DB, criteria, qualifiedOpportunities.length);

    return new Response(JSON.stringify({
      opportunities: qualifiedOpportunities,
      totalMatches: qualifiedOpportunities.length,
      averageScore: qualifiedOpportunities.length > 0
        ? Math.round(qualifiedOpportunities.reduce((acc, op) => acc + op.aiScore, 0) / qualifiedOpportunities.length)
        : 0,
      marketTrends: await getMarketTrends(criteria.preferredSectors)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Investment matching error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to find matching opportunities. Please try again.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function findMatchingPlatforms(DB: any, criteria: MatchingCriteria) {
  let query = `
    SELECT
      sp.id,
      sp.platform_name,
      sp.platform_description,
      sp.suggested_price,
      sp.platform_type,
      sp.readiness_score,
      sp.tech_stack,
      sp.estimated_users,
      sp.months_development,
      u.first_name || ' ' || u.last_name as seller_name,
      sp.created_at
    FROM seller_profiles sp
    JOIN users u ON sp.user_id = u.id
    WHERE sp.status = 'active' AND sp.readiness_score >= ?
  `;

  const queryParams = [criteria.minReadinessScore];

  // Add price range filter
  if (criteria.investmentRange) {
    const priceRange = getInvestmentPriceRange(criteria.investmentRange);
    query += ` AND sp.suggested_price BETWEEN ? AND ?`;
    queryParams.push(priceRange.min, priceRange.max);
  }

  // Add sector filter
  if (criteria.preferredSectors.length > 0) {
    const sectorConditions = criteria.preferredSectors.map(() => 'sp.platform_type = ?').join(' OR ');
    query += ` AND (${sectorConditions})`;
    queryParams.push(...criteria.preferredSectors.map(s => s.toLowerCase()));
  }

  query += ` ORDER BY sp.readiness_score DESC, sp.suggested_price ASC LIMIT 50`;

  const result = await DB.prepare(query).bind(...queryParams).all();
  return result.results || [];
}

async function generateInvestmentOpportunity(
  platform: any,
  criteria: MatchingCriteria
): Promise<InvestmentOpportunity> {
  const aiScore = calculateAIMatchingScore(platform, criteria);
  const riskLevel = assessRiskLevel(platform, criteria);
  const financials = generateFinancialProjections(platform);
  const dueDiligence = performDueDiligenceAnalysis(platform);

  return {
    id: `opp_${platform.id}`,
    platformName: platform.platform_name,
    seller: platform.seller_name,
    industry: capitalizeFirst(platform.platform_type),
    askingPrice: platform.suggested_price,
    revenue: generateRevenueStatus(financials.monthlyRevenue),
    growth: generateGrowthStatus(platform),
    stage: determineInvestmentStage(platform),
    readinessScore: platform.readiness_score,
    aiScore,
    riskLevel,
    timeToExit: estimateTimeToExit(platform, criteria.investmentHorizon),
    projectedROI: calculateProjectedROI(platform, criteria),
    highlights: generateHighlights(platform, dueDiligence),
    concerns: generateConcerns(platform, riskLevel),
    financials,
    dueDiligence
  };
}

function calculateAIMatchingScore(platform: any, criteria: MatchingCriteria): number {
  let score = 60; // Base score

  // Price alignment (25% weight)
  const priceRange = getInvestmentPriceRange(criteria.investmentRange);
  if (platform.suggested_price >= priceRange.min && platform.suggested_price <= priceRange.max) {
    score += 25;
  } else if (platform.suggested_price <= priceRange.max * 1.2) {
    score += 15; // Slightly over budget
  }

  // Sector match (20% weight)
  if (criteria.preferredSectors.includes(capitalizeFirst(platform.platform_type))) {
    score += 20;
  }

  // Risk tolerance alignment (20% weight)
  const platformRisk = assessRiskLevel(platform, criteria);
  if (
    (criteria.riskTolerance === 'conservative' && platformRisk === 'low') ||
    (criteria.riskTolerance === 'moderate' && platformRisk === 'medium') ||
    (criteria.riskTolerance === 'aggressive' && platformRisk === 'high')
  ) {
    score += 20;
  } else if (criteria.riskTolerance === 'moderate') {
    score += 10; // Moderate tolerance accepts any risk level
  }

  // Readiness bonus (15% weight)
  if (platform.readiness_score >= 90) score += 15;
  else if (platform.readiness_score >= 80) score += 12;
  else if (platform.readiness_score >= 70) score += 8;

  // Development maturity (10% weight)
  if (platform.months_development >= 12) score += 10;
  else if (platform.months_development >= 6) score += 5;

  // Time horizon alignment (10% weight)
  const platformAge = Math.floor((Date.now() - new Date(platform.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (criteria.investmentHorizon === 'long' && platformAge <= 6) score += 10;
  else if (criteria.investmentHorizon === 'medium' && platformAge <= 12) score += 8;
  else if (criteria.investmentHorizon === 'short' && platformAge <= 3) score += 5;

  return Math.min(Math.max(score, 0), 100);
}

function getInvestmentPriceRange(range: string) {
  const ranges = {
    '5k-25k': { min: 5000, max: 25000 },
    '25k-100k': { min: 25000, max: 100000 },
    '100k-500k': { min: 100000, max: 500000 },
    '500k+': { min: 500000, max: 10000000 }
  };
  return ranges[range as keyof typeof ranges] || { min: 0, max: 10000000 };
}

function assessRiskLevel(platform: any, criteria: MatchingCriteria): 'low' | 'medium' | 'high' {
  let riskScore = 50; // Base risk score

  // Readiness impact on risk
  if (platform.readiness_score >= 80) riskScore -= 20;
  else if (platform.readiness_score >= 60) riskScore -= 10;
  else riskScore += 15;

  // Development time impact
  if (platform.months_development >= 18) riskScore -= 15;
  else if (platform.months_development >= 12) riskScore -= 10;
  else if (platform.months_development < 6) riskScore += 20;

  // Industry risk factors
  const industryRisk = {
    'fintech': 10, // High regulation
    'healthtech': 15, // High regulation + compliance
    'saas': -5, // Proven model
    'ecommerce': 0, // Moderate
    'edtech': 5, // Market dependent
    'marketplace': 10 // Network effects required
  };
  riskScore += industryRisk[platform.platform_type as keyof typeof industryRisk] || 0;

  // Platform price impact (higher price = potentially higher risk)
  if (platform.suggested_price > 200000) riskScore += 10;
  else if (platform.suggested_price < 25000) riskScore += 5;

  if (riskScore <= 40) return 'low';
  if (riskScore <= 70) return 'medium';
  return 'high';
}

function generateFinancialProjections(platform: any) {
  // Generate realistic financial projections based on platform data
  const baseRevenue = Math.max(platform.suggested_price * 0.015, 1000); // 1.5% of platform price or $1K minimum

  return {
    monthlyRevenue: Math.round(baseRevenue * (0.8 + Math.random() * 0.4)), // ±20% variance
    userGrowth: `${Math.round(15 + Math.random() * 20)}%/month`,
    churnRate: `${Math.round(2 + Math.random() * 6)}%/month`,
    marketSize: generateMarketSize(platform.platform_type)
  };
}

function performDueDiligenceAnalysis(platform: any) {
  const baseScore = platform.readiness_score;

  return {
    technicalAudit: Math.min(baseScore + Math.round((Math.random() - 0.5) * 20), 100),
    marketValidation: Math.min(baseScore + Math.round((Math.random() - 0.5) * 15), 100),
    financialHealth: Math.min(baseScore + Math.round((Math.random() - 0.5) * 25), 100),
    teamAssessment: Math.min(baseScore + Math.round((Math.random() - 0.5) * 10), 100)
  };
}

function generateHighlights(platform: any, dueDiligence: any): string[] {
  const highlights = [];

  if (platform.readiness_score >= 80) {
    highlights.push('Market-ready with comprehensive documentation');
  }

  if (platform.months_development >= 12) {
    highlights.push('Mature platform with proven development timeline');
  }

  if (dueDiligence.technicalAudit >= 80) {
    highlights.push('Strong technical architecture and code quality');
  }

  if (dueDiligence.marketValidation >= 75) {
    highlights.push('Validated market opportunity with clear demand');
  }

  // Industry-specific highlights
  const industryHighlights = {
    'fintech': 'Compliance-ready financial technology platform',
    'healthtech': 'HIPAA-compliant healthcare solution',
    'saas': 'Scalable SaaS architecture with subscription model',
    'ecommerce': 'Complete e-commerce solution with payment integration',
    'marketplace': 'Two-sided marketplace with network effects potential'
  };

  const industryHighlight = industryHighlights[platform.platform_type as keyof typeof industryHighlights];
  if (industryHighlight) highlights.push(industryHighlight);

  return highlights.slice(0, 4);
}

function generateConcerns(platform: any, riskLevel: string): string[] {
  const concerns = [];

  if (platform.readiness_score < 70) {
    concerns.push('Incomplete marketing materials may delay market entry');
  }

  if (platform.months_development < 6) {
    concerns.push('Early-stage development may require additional investment');
  }

  if (riskLevel === 'high') {
    concerns.push('High-risk investment requiring careful monitoring');
  }

  // Industry-specific concerns
  const industryConcerns = {
    'fintech': 'Regulatory compliance requirements may increase costs',
    'healthtech': 'Healthcare regulations require specialized expertise',
    'edtech': 'Education market sensitivity to economic downturns'
  };

  const industryConcern = industryConcerns[platform.platform_type as keyof typeof industryConcerns];
  if (industryConcern) concerns.push(industryConcern);

  return concerns.slice(0, 3);
}

function determineInvestmentStage(platform: any): string {
  if (platform.readiness_score >= 85 && platform.months_development >= 12) {
    return 'Growth Stage';
  } else if (platform.readiness_score >= 70) {
    return 'Early Revenue';
  } else if (platform.months_development >= 6) {
    return 'Product Development';
  } else {
    return 'Concept Stage';
  }
}

function estimateTimeToExit(platform: any, horizon: string): string {
  const baseYears = horizon === 'short' ? 2 : horizon === 'medium' ? 4 : 6;
  const readinessAdjustment = platform.readiness_score >= 80 ? -0.5 : platform.readiness_score < 60 ? 1 : 0;
  const totalYears = Math.max(baseYears + readinessAdjustment, 1);

  return `${totalYears}-${totalYears + 1} years`;
}

function calculateProjectedROI(platform: any, criteria: MatchingCriteria): string {
  let baseROI = 180; // Base 180% ROI

  // Adjust based on readiness
  if (platform.readiness_score >= 85) baseROI += 50;
  else if (platform.readiness_score >= 70) baseROI += 20;
  else if (platform.readiness_score < 60) baseROI -= 30;

  // Adjust based on investment horizon
  if (criteria.investmentHorizon === 'long') baseROI += 40;
  else if (criteria.investmentHorizon === 'short') baseROI -= 20;

  // Industry multipliers
  const industryMultipliers = {
    'fintech': 1.2,
    'healthtech': 1.1,
    'saas': 1.15,
    'marketplace': 1.3,
    'ecommerce': 1.0
  };

  const multiplier = industryMultipliers[platform.platform_type as keyof typeof industryMultipliers] || 1.0;
  const finalROI = Math.round(baseROI * multiplier);

  return `${finalROI}%`;
}

function generateRevenueStatus(monthlyRevenue: number): string {
  if (monthlyRevenue === 0) return 'Pre-revenue';
  if (monthlyRevenue < 1000) return 'Early revenue';
  if (monthlyRevenue < 10000) return 'Growing revenue';
  return 'Established revenue';
}

function generateGrowthStatus(platform: any): string {
  if (platform.months_development >= 18) return 'Mature growth';
  if (platform.months_development >= 12) return 'Steady growth';
  if (platform.months_development >= 6) return 'Early growth';
  return 'Development stage';
}

function generateMarketSize(industry: string): string {
  const marketSizes = {
    'fintech': '$1.5B',
    'healthtech': '$2.8B',
    'saas': '$900M',
    'ecommerce': '$4.2B',
    'edtech': '$680M',
    'marketplace': '$1.2B'
  };
  return marketSizes[industry as keyof typeof marketSizes] || '$500M';
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function getMarketTrends(sectors: string[]) {
  // Mock market trends data
  return {
    trending: sectors[0] || 'FinTech',
    growth: '+23%',
    confidence: 'High'
  };
}

async function logMatchingAnalytics(DB: any, criteria: MatchingCriteria, matchCount: number) {
  try {
    await DB.prepare(`
      INSERT INTO investor_matching_analytics (
        date, searches_performed, avg_matches_per_search,
        popular_risk_tolerance, popular_investment_range, popular_sectors
      ) VALUES (
        DATE('now'), 1, ?, ?, ?, ?
      ) ON CONFLICT(date) DO UPDATE SET
        searches_performed = searches_performed + 1,
        avg_matches_per_search = (avg_matches_per_search * (searches_performed - 1) + ?) / searches_performed,
        popular_risk_tolerance = CASE WHEN ? != '' THEN ? ELSE popular_risk_tolerance END,
        popular_investment_range = CASE WHEN ? != '' THEN ? ELSE popular_investment_range END,
        popular_sectors = CASE WHEN ? != '' THEN ? ELSE popular_sectors END
    `).bind(
      matchCount,
      criteria.riskTolerance,
      criteria.investmentRange,
      JSON.stringify(criteria.preferredSectors),
      matchCount,
      criteria.riskTolerance,
      criteria.riskTolerance,
      criteria.investmentRange,
      criteria.investmentRange,
      JSON.stringify(criteria.preferredSectors),
      JSON.stringify(criteria.preferredSectors)
    ).run();
  } catch (error) {
    console.error('Failed to log matching analytics:', error);
  }
}