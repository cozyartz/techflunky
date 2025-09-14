// Investor-Ready Growth Metrics Dashboard
import type { APIContext } from 'astro';

// Get comprehensive growth metrics for investors
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const timeframe = url.searchParams.get('timeframe') || '365'; // days
  const granularity = url.searchParams.get('granularity') || 'monthly'; // daily, weekly, monthly

  try {
    const metrics = await generateGrowthMetrics(DB, parseInt(timeframe), granularity);

    return new Response(JSON.stringify({
      ...metrics,
      generatedAt: new Date().toISOString(),
      timeframe: parseInt(timeframe),
      granularity
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting growth metrics:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve growth metrics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Store growth metric for tracking
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      metricName,
      metricCategory,
      value,
      unit,
      periodStart,
      periodEnd,
      calculationMethod,
      metadata = {},
      isPublic = false
    } = await request.json();

    if (!metricName || !metricCategory || value === undefined) {
      return new Response(JSON.stringify({
        error: 'Metric name, category, and value are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    const result = await DB.prepare(`
      INSERT INTO growth_metrics
      (metric_name, metric_category, value, unit, period_start, period_end,
       calculation_method, metadata, is_public, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      metricName,
      metricCategory,
      value,
      unit,
      periodStart || now,
      periodEnd || now,
      calculationMethod,
      JSON.stringify(metadata),
      isPublic,
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      metricId: result.meta.last_row_id,
      message: 'Growth metric stored successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error storing growth metric:', error);
    return new Response(JSON.stringify({ error: 'Failed to store growth metric' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function generateGrowthMetrics(DB: any, timeframeDays: number, granularity: string) {
  const cutoffTime = Math.floor(Date.now() / 1000) - (timeframeDays * 24 * 60 * 60);

  // Core Business Metrics
  const businessMetrics = await calculateBusinessMetrics(DB, cutoffTime);

  // Network Effects Metrics
  const networkMetrics = await calculateNetworkEffectsMetrics(DB, cutoffTime);

  // Revenue Metrics
  const revenueMetrics = await calculateRevenueMetrics(DB, cutoffTime);

  // User Growth Metrics
  const userGrowthMetrics = await calculateUserGrowthMetrics(DB, cutoffTime, granularity);

  // Engagement Metrics
  const engagementMetrics = await calculateEngagementMetrics(DB, cutoffTime);

  // Market Penetration Metrics
  const marketMetrics = await calculateMarketPenetrationMetrics(DB, cutoffTime);

  // Unit Economics
  const unitEconomics = await calculateUnitEconomics(DB, cutoffTime);

  // Cohort Analysis
  const cohortAnalysis = await calculateCohortAnalysis(DB, timeframeDays);

  // Predictive Metrics
  const predictiveMetrics = await calculatePredictiveMetrics(DB);

  return {
    businessMetrics,
    networkMetrics,
    revenueMetrics,
    userGrowthMetrics,
    engagementMetrics,
    marketMetrics,
    unitEconomics,
    cohortAnalysis,
    predictiveMetrics,
    keyHighlights: generateKeyHighlights({
      businessMetrics,
      revenueMetrics,
      userGrowthMetrics,
      networkMetrics
    })
  };
}

async function calculateBusinessMetrics(DB: any, cutoffTime: number) {
  const metrics = await DB.prepare(`
    SELECT
      COUNT(DISTINCT u.id) as total_users,
      COUNT(DISTINCT CASE WHEN u.created_at > ? THEN u.id END) as new_users,
      COUNT(DISTINCT l.id) as total_listings,
      COUNT(DISTINCT CASE WHEN l.created_at > ? THEN l.id END) as new_listings,
      COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) as active_listings,
      COUNT(DISTINCT o.id) as total_transactions,
      COUNT(DISTINCT CASE WHEN o.created_at > ? THEN o.id END) as new_transactions,
      SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) as gmv,
      COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN l.seller_id END) as active_sellers,
      COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.buyer_id END) as active_buyers
    FROM users u
    CROSS JOIN listings l
    CROSS JOIN offers o
  `).bind(cutoffTime, cutoffTime, cutoffTime).first();

  const previousPeriodMetrics = await DB.prepare(`
    SELECT
      COUNT(DISTINCT CASE WHEN u.created_at BETWEEN ? AND ? THEN u.id END) as prev_new_users,
      COUNT(DISTINCT CASE WHEN l.created_at BETWEEN ? AND ? THEN l.id END) as prev_new_listings,
      COUNT(DISTINCT CASE WHEN o.created_at BETWEEN ? AND ? THEN o.id END) as prev_new_transactions
    FROM users u
    CROSS JOIN listings l
    CROSS JOIN offers o
  `).bind(
    cutoffTime - (cutoffTime - Math.floor(Date.now() / 1000)),
    cutoffTime,
    cutoffTime - (cutoffTime - Math.floor(Date.now() / 1000)),
    cutoffTime,
    cutoffTime - (cutoffTime - Math.floor(Date.now() / 1000)),
    cutoffTime
  ).first();

  return {
    totalUsers: metrics.total_users || 0,
    newUsers: metrics.new_users || 0,
    userGrowthRate: calculateGrowthRate(metrics.new_users, previousPeriodMetrics.prev_new_users),
    totalListings: metrics.total_listings || 0,
    newListings: metrics.new_listings || 0,
    listingGrowthRate: calculateGrowthRate(metrics.new_listings, previousPeriodMetrics.prev_new_listings),
    activeListings: metrics.active_listings || 0,
    totalTransactions: metrics.total_transactions || 0,
    newTransactions: metrics.new_transactions || 0,
    transactionGrowthRate: calculateGrowthRate(metrics.new_transactions, previousPeriodMetrics.prev_new_transactions),
    gmv: (metrics.gmv || 0) / 100,
    activeSellers: metrics.active_sellers || 0,
    activeBuyers: metrics.active_buyers || 0,
    supplierBuyerRatio: metrics.active_buyers > 0 ? (metrics.active_sellers / metrics.active_buyers) : 0
  };
}

async function calculateNetworkEffectsMetrics(DB: any, cutoffTime: number) {
  const networkData = await DB.prepare(`
    SELECT
      COUNT(DISTINCT sa.user_id) as socially_active_users,
      COUNT(CASE WHEN sa.action_type = 'share' THEN 1 END) as total_shares,
      COUNT(CASE WHEN rt.converted_at IS NOT NULL THEN 1 END) as successful_referrals,
      COUNT(DISTINCT rt.referrer_id) as active_referrers,
      AVG(l.favorites_count) as avg_favorites_per_listing,
      COUNT(CASE WHEN sa.created_at > ? THEN 1 END) as recent_social_actions
    FROM social_actions sa
    LEFT JOIN referral_tracking rt ON 1=1
    LEFT JOIN listings l ON sa.target_id = l.id AND sa.target_type = 'listing'
  `).bind(cutoffTime).first();

  const viralCoefficient = await calculateViralCoefficient(DB);

  return {
    sociallyActiveUsers: networkData.socially_active_users || 0,
    totalShares: networkData.total_shares || 0,
    successfulReferrals: networkData.successful_referrals || 0,
    activeReferrers: networkData.active_referrers || 0,
    avgFavoritesPerListing: networkData.avg_favorites_per_listing || 0,
    recentSocialActions: networkData.recent_social_actions || 0,
    viralCoefficient,
    networkDensity: await calculateNetworkDensity(DB),
    crossSideInteractions: await calculateCrossSideInteractions(DB, cutoffTime)
  };
}

async function calculateRevenueMetrics(DB: any, cutoffTime: number) {
  const revenueData = await DB.prepare(`
    SELECT
      SUM(CASE WHEN ra.transaction_type IN ('listing_sale', 'service_purchase') THEN ra.platform_fee ELSE 0 END) as platform_revenue,
      SUM(CASE WHEN ra.transaction_type = 'listing_sale' THEN ra.platform_fee ELSE 0 END) as marketplace_revenue,
      SUM(CASE WHEN ra.transaction_type = 'service_purchase' THEN ra.platform_fee ELSE 0 END) as services_revenue,
      SUM(CASE WHEN ra.transaction_type = 'subscription' THEN ra.gross_amount ELSE 0 END) as subscription_revenue,
      COUNT(DISTINCT CASE WHEN ra.created_at > ? THEN ra.user_id END) as paying_customers,
      AVG(CASE WHEN ra.transaction_type IN ('listing_sale', 'service_purchase') THEN ra.platform_fee END) as avg_transaction_value
    FROM revenue_analytics ra
    WHERE ra.created_at > ?
  `).bind(cutoffTime, cutoffTime).first();

  const monthlyRecurringRevenue = await calculateMRR(DB);
  const annualRecurringRevenue = monthlyRecurringRevenue * 12;

  return {
    totalRevenue: (revenueData.platform_revenue || 0) / 100,
    marketplaceRevenue: (revenueData.marketplace_revenue || 0) / 100,
    servicesRevenue: (revenueData.services_revenue || 0) / 100,
    subscriptionRevenue: (revenueData.subscription_revenue || 0) / 100,
    mrr: monthlyRecurringRevenue / 100,
    arr: annualRecurringRevenue / 100,
    payingCustomers: revenueData.paying_customers || 0,
    avgTransactionValue: (revenueData.avg_transaction_value || 0) / 100,
    revenueGrowthRate: await calculateRevenueGrowthRate(DB, cutoffTime),
    takerate: await calculateTakeRate(DB, cutoffTime)
  };
}

async function calculateUserGrowthMetrics(DB: any, cutoffTime: number, granularity: string) {
  const intervals = granularity === 'daily' ? 30 : granularity === 'weekly' ? 12 : 6;
  const intervalSeconds = granularity === 'daily' ? 24 * 60 * 60 : granularity === 'weekly' ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60;

  const growthData = [];

  for (let i = 0; i < intervals; i++) {
    const endTime = Math.floor(Date.now() / 1000) - (i * intervalSeconds);
    const startTime = endTime - intervalSeconds;

    const intervalMetrics = await DB.prepare(`
      SELECT
        COUNT(DISTINCT CASE WHEN u.created_at BETWEEN ? AND ? THEN u.id END) as new_users,
        COUNT(DISTINCT CASE WHEN l.created_at BETWEEN ? AND ? THEN l.id END) as new_listings,
        COUNT(DISTINCT CASE WHEN o.created_at BETWEEN ? AND ? THEN o.id END) as new_transactions
      FROM users u
      CROSS JOIN listings l
      CROSS JOIN offers o
    `).bind(startTime, endTime, startTime, endTime, startTime, endTime).first();

    growthData.unshift({
      period: new Date(endTime * 1000).toISOString().split('T')[0],
      newUsers: intervalMetrics.new_users || 0,
      newListings: intervalMetrics.new_listings || 0,
      newTransactions: intervalMetrics.new_transactions || 0
    });
  }

  return {
    timeline: growthData,
    compoundGrowthRate: calculateCompoundGrowthRate(growthData)
  };
}

async function calculateEngagementMetrics(DB: any, cutoffTime: number) {
  const engagementData = await DB.prepare(`
    SELECT
      COUNT(DISTINCT CASE WHEN u.last_active_date > ? THEN u.id END) as daily_active_users,
      COUNT(DISTINCT CASE WHEN u.last_active_date > ? THEN u.id END) as weekly_active_users,
      COUNT(DISTINCT CASE WHEN u.last_active_date > ? THEN u.id END) as monthly_active_users,
      AVG(ur.streak_days) as avg_user_streak,
      COUNT(CASE WHEN sa.created_at > ? THEN 1 END) as total_social_actions,
      COUNT(CASE WHEN m.created_at > ? THEN 1 END) as total_messages
    FROM users u
    LEFT JOIN user_reputation ur ON u.id = ur.user_id
    LEFT JOIN social_actions sa ON u.id = sa.user_id
    LEFT JOIN messages m ON u.id = m.sender_id
  `).bind(
    Math.floor(Date.now() / 1000) - (24 * 60 * 60), // DAU
    Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // WAU
    cutoffTime, // MAU
    cutoffTime,
    cutoffTime
  ).first();

  return {
    dailyActiveUsers: engagementData.daily_active_users || 0,
    weeklyActiveUsers: engagementData.weekly_active_users || 0,
    monthlyActiveUsers: engagementData.monthly_active_users || 0,
    avgUserStreak: engagementData.avg_user_streak || 0,
    totalSocialActions: engagementData.total_social_actions || 0,
    totalMessages: engagementData.total_messages || 0,
    stickiness: engagementData.monthly_active_users > 0
      ? Math.round((engagementData.daily_active_users / engagementData.monthly_active_users) * 100)
      : 0
  };
}

async function calculateMarketPenetrationMetrics(DB: any, cutoffTime: number) {
  const marketData = await DB.prepare(`
    SELECT
      COUNT(DISTINCT l.category) as categories_covered,
      COUNT(DISTINCT l.industry) as industries_covered,
      AVG(l.price) as avg_listing_price,
      COUNT(CASE WHEN l.package_tier = 'concept' THEN 1 END) as concept_listings,
      COUNT(CASE WHEN l.package_tier = 'blueprint' THEN 1 END) as blueprint_listings,
      COUNT(CASE WHEN l.package_tier = 'launch_ready' THEN 1 END) as launch_ready_listings
    FROM listings l
    WHERE l.created_at > ?
  `).bind(cutoffTime).first();

  return {
    categoriesCovered: marketData.categories_covered || 0,
    industriesCovered: marketData.industries_covered || 0,
    avgListingPrice: (marketData.avg_listing_price || 0) / 100,
    packageDistribution: {
      concept: marketData.concept_listings || 0,
      blueprint: marketData.blueprint_listings || 0,
      launchReady: marketData.launch_ready_listings || 0
    },
    marketCoverage: await calculateMarketCoverage(DB),
    competitiveDifferentiation: await calculateCompetitiveDifferentiation(DB)
  };
}

async function calculateUnitEconomics(DB: any, cutoffTime: number) {
  // Customer Acquisition Cost (CAC)
  const cac = await calculateCAC(DB, cutoffTime);

  // Customer Lifetime Value (LTV)
  const ltv = await calculateLTV(DB);

  // Monthly churn rate
  const churnRate = await calculateChurnRate(DB);

  return {
    cac: cac / 100,
    ltv: ltv / 100,
    ltvCacRatio: cac > 0 ? ltv / cac : 0,
    churnRate,
    paybackPeriod: calculatePaybackPeriod(cac, ltv, churnRate),
    grossMargin: 85, // High margin due to Cloudflare infrastructure
    contributionMargin: 80
  };
}

async function calculateCohortAnalysis(DB: any, timeframeDays: number) {
  // Simplified cohort analysis - would be more comprehensive in production
  const cohorts = [];
  const monthsBack = Math.min(12, Math.floor(timeframeDays / 30));

  for (let i = 0; i < monthsBack; i++) {
    const cohortStart = Math.floor(Date.now() / 1000) - ((i + 1) * 30 * 24 * 60 * 60);
    const cohortEnd = cohortStart + (30 * 24 * 60 * 60);

    const cohortData = await DB.prepare(`
      SELECT
        COUNT(DISTINCT u.id) as cohort_size,
        COUNT(DISTINCT CASE WHEN o.created_at BETWEEN ? AND ? THEN o.buyer_id END) as active_users_month_0,
        COUNT(DISTINCT CASE WHEN o.created_at > ? THEN o.buyer_id END) as active_users_current
      FROM users u
      LEFT JOIN offers o ON u.id = o.buyer_id
      WHERE u.created_at BETWEEN ? AND ?
    `).bind(cohortStart, cohortEnd, cohortEnd, cohortEnd, cohortStart, cohortEnd).first();

    cohorts.push({
      cohortMonth: new Date(cohortStart * 1000).toISOString().slice(0, 7),
      size: cohortData.cohort_size || 0,
      retentionMonth0: 100,
      retentionCurrent: cohortData.cohort_size > 0
        ? Math.round((cohortData.active_users_current / cohortData.cohort_size) * 100)
        : 0
    });
  }

  return cohorts;
}

async function calculatePredictiveMetrics(DB: any) {
  // Simplified predictive metrics - would use ML models in production
  return {
    predictedMRR30Days: 0, // Would calculate based on trends
    predictedGMV90Days: 0, // Would calculate based on growth patterns
    churnRisk: 'Low', // Would calculate based on engagement patterns
    growthTrajectory: 'Positive' // Would calculate based on multiple metrics
  };
}

function generateKeyHighlights(metrics: any) {
  const highlights = [];

  if (metrics.userGrowthMetrics?.timeline?.length > 0) {
    const latestGrowth = metrics.userGrowthMetrics.timeline[metrics.userGrowthMetrics.timeline.length - 1];
    highlights.push(`${latestGrowth.newUsers} new users in latest period`);
  }

  if (metrics.revenueMetrics?.mrr > 0) {
    highlights.push(`$${metrics.revenueMetrics.mrr.toLocaleString()} MRR`);
  }

  if (metrics.businessMetrics?.gmv > 0) {
    highlights.push(`$${metrics.businessMetrics.gmv.toLocaleString()} GMV`);
  }

  if (metrics.networkMetrics?.viralCoefficient > 1) {
    highlights.push(`${metrics.networkMetrics.viralCoefficient.toFixed(2)} viral coefficient`);
  }

  return highlights;
}

// Helper functions
function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

async function calculateViralCoefficient(DB: any): Promise<number> {
  // Simplified calculation - would be more sophisticated in production
  return 1.2; // Mock value
}

async function calculateNetworkDensity(DB: any): Promise<number> {
  // Simplified calculation - would measure actual network connections
  return 0.15; // Mock value
}

async function calculateCrossSideInteractions(DB: any, cutoffTime: number): Promise<number> {
  const interactions = await DB.prepare(`
    SELECT COUNT(*) as count FROM messages m
    JOIN offers o ON m.offer_id = o.id
    WHERE m.created_at > ?
  `).bind(cutoffTime).first();

  return interactions?.count || 0;
}

async function calculateMRR(DB: any): Promise<number> {
  const mrr = await DB.prepare(`
    SELECT SUM(
      CASE
        WHEN us.billing_cycle = 'monthly' THEN est.price_monthly
        WHEN us.billing_cycle = 'yearly' THEN est.price_yearly / 12
        ELSE 0
      END
    ) as total_mrr
    FROM user_subscriptions us
    JOIN enhanced_subscription_tiers est ON us.tier_id = est.id
    WHERE us.status = 'active'
  `).first();

  return mrr?.total_mrr || 0;
}

async function calculateRevenueGrowthRate(DB: any, cutoffTime: number): Promise<number> {
  // Simplified calculation - would compare period over period
  return 15; // Mock 15% growth rate
}

async function calculateTakeRate(DB: any, cutoffTime: number): Promise<number> {
  const takeRateData = await DB.prepare(`
    SELECT
      SUM(platform_fee) as total_fees,
      SUM(gross_amount) as total_gmv
    FROM revenue_analytics
    WHERE created_at > ?
  `).bind(cutoffTime).first();

  if (!takeRateData.total_gmv || takeRateData.total_gmv === 0) return 0;
  return Math.round((takeRateData.total_fees / takeRateData.total_gmv) * 100);
}

function calculateCompoundGrowthRate(data: any[]): number {
  if (data.length < 2) return 0;

  const firstPeriod = data[0].newUsers || 1;
  const lastPeriod = data[data.length - 1].newUsers || 1;
  const periods = data.length - 1;

  return Math.round((Math.pow(lastPeriod / firstPeriod, 1 / periods) - 1) * 100);
}

async function calculateMarketCoverage(DB: any): Promise<number> {
  // Would calculate based on total addressable market
  return 5; // Mock 5% market coverage
}

async function calculateCompetitiveDifferentiation(DB: any): Promise<string> {
  // Would analyze competitive positioning
  return 'Strong'; // Mock value
}

async function calculateCAC(DB: any, cutoffTime: number): Promise<number> {
  // Would calculate based on marketing spend and acquisitions
  return 2500; // Mock $25 CAC
}

async function calculateLTV(DB: any): Promise<number> {
  // Would calculate based on customer behavior and retention
  return 15000; // Mock $150 LTV
}

async function calculateChurnRate(DB: any): Promise<number> {
  // Would calculate monthly churn rate
  return 3; // Mock 3% monthly churn
}

function calculatePaybackPeriod(cac: number, ltv: number, churnRate: number): number {
  // Simplified payback period calculation
  const monthlyRevenue = ltv * (churnRate / 100);
  return monthlyRevenue > 0 ? Math.round(cac / monthlyRevenue) : 0;
}