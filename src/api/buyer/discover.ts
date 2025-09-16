// Smart Platform Discovery API for Buyers
import type { APIContext } from 'astro';

interface DiscoveryFilters {
  businessType: string;
  budget: string;
  timeline: string;
  industry: string;
  techPreference: string;
  teamSize: string;
  experience: string;
}

interface PlatformListing {
  id: string;
  name: string;
  description: string;
  price: number;
  seller: string;
  rating: number;
  readinessScore: number;
  techStack: string[];
  industry: string;
  features: string[];
  screenshots: string[];
  estimatedRevenue: string;
  userBase: string;
  launchTime: string;
  aiMatchScore: number;
}

export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const filters: DiscoveryFilters = await request.json();

    // Get matching platforms from database
    const platforms = await findMatchingPlatforms(DB, filters);

    // Calculate AI match scores for each platform
    const enhancedPlatforms = platforms.map(platform => ({
      ...platform,
      aiMatchScore: calculateAIMatchScore(platform, filters)
    }));

    // Sort by match score and filter out low scores
    const sortedPlatforms = enhancedPlatforms
      .filter(p => p.aiMatchScore >= 60) // Only show good matches
      .sort((a, b) => b.aiMatchScore - a.aiMatchScore)
      .slice(0, 20); // Limit to top 20 results

    // Log search analytics
    await logDiscoverySearch(DB, filters, sortedPlatforms.length);

    return new Response(JSON.stringify(sortedPlatforms), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Platform discovery error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to discover platforms. Please try again.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function findMatchingPlatforms(DB: any, filters: DiscoveryFilters): Promise<PlatformListing[]> {
  // Build dynamic query based on filters
  let query = `
    SELECT
      sp.id,
      sp.platform_name as name,
      sp.platform_description as description,
      sp.suggested_price as price,
      u.first_name || ' ' || u.last_name as seller,
      sp.readiness_score,
      sp.tech_stack,
      sp.platform_type as industry,
      sp.estimated_users as userBase,
      sp.months_development,
      5.0 as rating,
      'TechFlunky Platform' as screenshots
    FROM seller_profiles sp
    JOIN users u ON sp.user_id = u.id
    WHERE sp.status = 'active'
  `;

  const queryParams = [];

  // Add budget filter
  if (filters.budget) {
    const budgetRange = getBudgetRange(filters.budget);
    query += ` AND sp.suggested_price BETWEEN ? AND ?`;
    queryParams.push(budgetRange.min, budgetRange.max);
  }

  // Add industry filter
  if (filters.industry) {
    query += ` AND sp.platform_type = ?`;
    queryParams.push(filters.industry.toLowerCase());
  }

  query += ` ORDER BY sp.readiness_score DESC, sp.suggested_price ASC LIMIT 50`;

  const result = await DB.prepare(query).bind(...queryParams).all();

  // Transform database results to PlatformListing format
  return result.results.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    seller: row.seller,
    rating: row.rating,
    readinessScore: row.readiness_score,
    techStack: JSON.parse(row.tech_stack || '[]'),
    industry: row.industry,
    features: generateFeatures(row.industry, JSON.parse(row.tech_stack || '[]')),
    screenshots: [],
    estimatedRevenue: estimateRevenue(row.price, row.industry),
    userBase: row.userBase || 'Growing user base',
    launchTime: estimateLaunchTime(row.readiness_score, filters.experience),
    aiMatchScore: 0 // Will be calculated separately
  }));
}

function calculateAIMatchScore(platform: PlatformListing, filters: DiscoveryFilters): number {
  let score = 70; // Base score

  // Budget alignment (25% weight)
  if (filters.budget) {
    const budgetRange = getBudgetRange(filters.budget);
    if (platform.price >= budgetRange.min && platform.price <= budgetRange.max) {
      score += 25;
    } else if (platform.price <= budgetRange.max * 1.2) {
      score += 15; // Slightly over budget
    } else if (platform.price >= budgetRange.min * 0.8) {
      score += 10; // Slightly under budget
    }
  }

  // Industry match (20% weight)
  if (filters.industry && platform.industry.toLowerCase() === filters.industry.toLowerCase()) {
    score += 20;
  }

  // Experience level alignment (15% weight)
  if (filters.experience) {
    const complexityScore = getComplexityScore(platform.techStack);
    if (filters.experience === 'beginner' && complexityScore <= 3) score += 15;
    else if (filters.experience === 'intermediate' && complexityScore >= 3 && complexityScore <= 6) score += 15;
    else if (filters.experience === 'advanced' && complexityScore >= 6) score += 15;
    else score += 5; // Partial match
  }

  // Timeline compatibility (15% weight)
  if (filters.timeline) {
    const launchWeeks = parseInt(platform.launchTime.split('-')[0]);
    if (filters.timeline === 'immediate' && launchWeeks <= 2) score += 15;
    else if (filters.timeline === 'fast' && launchWeeks <= 8) score += 15;
    else if (filters.timeline === 'standard' && launchWeeks <= 24) score += 15;
    else if (filters.timeline === 'flexible') score += 10;
  }

  // Business type alignment (10% weight)
  if (filters.businessType) {
    if (filters.businessType === 'startup' && platform.price <= 50000) score += 10;
    else if (filters.businessType === 'existing' && platform.readinessScore >= 70) score += 10;
    else if (filters.businessType === 'investor' && platform.estimatedRevenue) score += 10;
    else if (filters.businessType === 'enterprise' && platform.price >= 100000) score += 10;
  }

  // Readiness bonus (10% weight)
  if (platform.readinessScore >= 80) score += 10;
  else if (platform.readinessScore >= 60) score += 5;

  // Team size alignment (5% weight)
  if (filters.teamSize) {
    const complexity = getComplexityScore(platform.techStack);
    if (filters.teamSize === 'solo' && complexity <= 4) score += 5;
    else if (filters.teamSize === 'small' && complexity <= 7) score += 5;
    else if (filters.teamSize === 'medium' && complexity >= 5) score += 5;
    else if (filters.teamSize === 'large') score += 5;
  }

  return Math.min(Math.max(score, 0), 100);
}

function getBudgetRange(budget: string) {
  const ranges = {
    'under-25k': { min: 0, max: 25000 },
    '25k-50k': { min: 25000, max: 50000 },
    '50k-100k': { min: 50000, max: 100000 },
    '100k-250k': { min: 100000, max: 250000 },
    '250k+': { min: 250000, max: 1000000 }
  };
  return ranges[budget as keyof typeof ranges] || { min: 0, max: 1000000 };
}

function getComplexityScore(techStack: string[]): number {
  const complexityWeights = {
    'React': 2, 'Vue.js': 2, 'Angular': 3, 'Next.js': 3,
    'Node.js': 2, 'Python': 1, 'Django': 2, 'Flask': 1,
    'PostgreSQL': 2, 'MongoDB': 2, 'Redis': 3, 'Elasticsearch': 4,
    'AWS': 3, 'Google Cloud': 3, 'Azure': 3, 'Docker': 4,
    'Kubernetes': 5, 'TypeScript': 2, 'GraphQL': 3, 'REST API': 1
  };

  return techStack.reduce((total, tech) => {
    return total + (complexityWeights[tech as keyof typeof complexityWeights] || 1);
  }, 0);
}

function generateFeatures(industry: string, techStack: string[]): string[] {
  const baseFeatures = ['User management', 'Admin dashboard', 'Mobile responsive'];

  const industryFeatures = {
    'fintech': ['Payment processing', 'KYC compliance', 'Financial reporting'],
    'healthtech': ['HIPAA compliance', 'Patient management', 'Appointment scheduling'],
    'ecommerce': ['Shopping cart', 'Payment gateway', 'Inventory management'],
    'saas': ['Multi-tenancy', 'Subscription billing', 'Analytics dashboard'],
    'marketplace': ['Buyer/seller profiles', 'Transaction escrow', 'Rating system']
  };

  const techFeatures = {
    'React': ['Modern UI components'],
    'Node.js': ['RESTful APIs'],
    'PostgreSQL': ['Relational database'],
    'Stripe': ['Payment processing'],
    'AWS': ['Cloud infrastructure']
  };

  let features = [...baseFeatures];

  // Add industry-specific features
  const industrySpecific = industryFeatures[industry.toLowerCase() as keyof typeof industryFeatures];
  if (industrySpecific) features.push(...industrySpecific);

  // Add tech-specific features
  techStack.forEach(tech => {
    const techSpecific = techFeatures[tech as keyof typeof techFeatures];
    if (techSpecific) features.push(...techSpecific);
  });

  return [...new Set(features)].slice(0, 8); // Remove duplicates and limit
}

function estimateRevenue(price: number, industry: string): string {
  // Rough revenue estimates based on platform price and industry
  const baseRevenue = Math.round(price * 0.02); // 2% of platform price per month

  const industryMultipliers = {
    'fintech': 1.5,
    'healthtech': 1.3,
    'saas': 1.4,
    'ecommerce': 1.2,
    'marketplace': 1.6
  };

  const multiplier = industryMultipliers[industry.toLowerCase() as keyof typeof industryMultipliers] || 1.0;
  const estimatedRevenue = Math.round(baseRevenue * multiplier);

  if (estimatedRevenue < 1000) return `$${estimatedRevenue}`;
  if (estimatedRevenue < 10000) return `$${Math.round(estimatedRevenue / 100) / 10}K`;
  return `$${Math.round(estimatedRevenue / 1000)}K`;
}

function estimateLaunchTime(readinessScore: number, experience: string): string {
  let baseWeeks = 8; // Default 8 weeks

  // Adjust based on readiness
  if (readinessScore >= 80) baseWeeks = 2;
  else if (readinessScore >= 60) baseWeeks = 4;
  else if (readinessScore >= 40) baseWeeks = 6;

  // Adjust based on experience
  const experienceMultipliers = {
    'beginner': 1.5,
    'intermediate': 1.2,
    'advanced': 0.8
  };

  const multiplier = experienceMultipliers[experience as keyof typeof experienceMultipliers] || 1.0;
  const finalWeeks = Math.round(baseWeeks * multiplier);

  if (finalWeeks <= 2) return '1-2 weeks';
  if (finalWeeks <= 4) return '2-4 weeks';
  if (finalWeeks <= 8) return '4-8 weeks';
  if (finalWeeks <= 12) return '8-12 weeks';
  return '3-6 months';
}

async function logDiscoverySearch(DB: any, filters: DiscoveryFilters, resultCount: number) {
  try {
    await DB.prepare(`
      INSERT INTO buyer_analytics (
        date, platform_searches, avg_results_per_search,
        popular_budget_range, popular_industry, popular_timeline
      ) VALUES (
        DATE('now'), 1, ?, ?, ?, ?
      ) ON CONFLICT(date) DO UPDATE SET
        platform_searches = platform_searches + 1,
        avg_results_per_search = (avg_results_per_search * (platform_searches - 1) + ?) / platform_searches,
        popular_budget_range = CASE WHEN ? != '' THEN ? ELSE popular_budget_range END,
        popular_industry = CASE WHEN ? != '' THEN ? ELSE popular_industry END,
        popular_timeline = CASE WHEN ? != '' THEN ? ELSE popular_timeline END
    `).bind(
      resultCount,
      filters.budget || 'any',
      filters.industry || 'any',
      filters.timeline || 'any',
      resultCount,
      filters.budget,
      filters.budget,
      filters.industry,
      filters.industry,
      filters.timeline,
      filters.timeline
    ).run();
  } catch (error) {
    console.error('Failed to log discovery search:', error);
  }
}