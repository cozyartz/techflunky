// Advanced Analytics Suite
import type { APIContext } from 'astro';

// Get advanced analytics dashboard
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');
  const dateRange = url.searchParams.get('range') || '30'; // days
  const metrics = url.searchParams.get('metrics')?.split(',') || ['all'];

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const analytics = await generateAdvancedAnalytics(DB, userId, parseInt(dateRange), metrics);

    return new Response(JSON.stringify({
      ...analytics,
      generatedAt: new Date().toISOString(),
      dateRange: parseInt(dateRange)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting advanced analytics:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve analytics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function generateAdvancedAnalytics(DB: any, userId: string, dateRange: number, metrics: string[]) {
  const cutoffTime = Math.floor(Date.now() / 1000) - (dateRange * 24 * 60 * 60);

  // Performance Metrics
  const performanceMetrics = await DB.prepare(`
    SELECT
      COUNT(CASE WHEN l.seller_id = ? THEN 1 END) as total_listings,
      COUNT(CASE WHEN l.seller_id = ? AND l.status = 'sold' THEN 1 END) as sold_listings,
      COUNT(CASE WHEN l.seller_id = ? AND l.created_at > ? THEN 1 END) as new_listings,
      SUM(CASE WHEN o.seller_id = ? AND o.status = 'completed' THEN o.amount ELSE 0 END) as total_revenue,
      AVG(CASE WHEN l.seller_id = ? THEN l.views_count ELSE 0 END) as avg_views_per_listing,
      COUNT(CASE WHEN o.buyer_id = ? THEN 1 END) as purchases_made
    FROM listings l
    LEFT JOIN offers o ON l.id = o.listing_id
  `).bind(userId, userId, userId, cutoffTime, userId, userId, userId).first();

  // Engagement Analytics
  const engagementMetrics = await DB.prepare(`
    SELECT
      COUNT(CASE WHEN sa.user_id = ? THEN 1 END) as social_actions,
      COUNT(CASE WHEN sa.user_id = ? AND sa.created_at > ? THEN 1 END) as recent_social_actions,
      COUNT(CASE WHEN m.sender_id = ? THEN 1 END) as messages_sent,
      COUNT(CASE WHEN r.reviewer_id = ? THEN 1 END) as reviews_given
    FROM social_actions sa
    LEFT JOIN messages m ON 1=1
    LEFT JOIN reviews r ON 1=1
  `).bind(userId, userId, cutoffTime, userId, userId).first();

  // Conversion Funnel
  const conversionFunnel = await calculateConversionFunnel(DB, userId, cutoffTime);

  // Performance Trends
  const performanceTrends = await calculatePerformanceTrends(DB, userId, dateRange);

  // Competitive Position
  const competitivePosition = await calculateCompetitivePosition(DB, userId);

  // ROI Analysis
  const roiAnalysis = await calculateROIAnalysis(DB, userId, cutoffTime);

  return {
    performanceMetrics: {
      ...performanceMetrics,
      successRate: performanceMetrics.total_listings > 0
        ? Math.round((performanceMetrics.sold_listings / performanceMetrics.total_listings) * 100)
        : 0,
      formattedRevenue: `$${((performanceMetrics.total_revenue || 0) / 100).toLocaleString()}`
    },
    engagementMetrics,
    conversionFunnel,
    performanceTrends,
    competitivePosition,
    roiAnalysis,
    insights: generateInsights(performanceMetrics, engagementMetrics, conversionFunnel)
  };
}

async function calculateConversionFunnel(DB: any, userId: string, cutoffTime: number) {
  const funnelData = await DB.prepare(`
    SELECT
      COUNT(CASE WHEN l.seller_id = ? THEN 1 END) as listings_created,
      SUM(CASE WHEN l.seller_id = ? THEN l.views_count ELSE 0 END) as total_views,
      COUNT(CASE WHEN o.listing_id IN (SELECT id FROM listings WHERE seller_id = ?) THEN 1 END) as offers_received,
      COUNT(CASE WHEN o.listing_id IN (SELECT id FROM listings WHERE seller_id = ?) AND o.status = 'completed' THEN 1 END) as sales_completed
    FROM listings l
    LEFT JOIN offers o ON 1=1
    WHERE l.created_at > ?
  `).bind(userId, userId, userId, userId, cutoffTime).first();

  return {
    stages: [
      { name: 'Listings Created', value: funnelData.listings_created || 0, percentage: 100 },
      { name: 'Views Generated', value: funnelData.total_views || 0, percentage: 0 },
      { name: 'Offers Received', value: funnelData.offers_received || 0, percentage: 0 },
      { name: 'Sales Completed', value: funnelData.sales_completed || 0, percentage: 0 }
    ].map((stage, index, array) => ({
      ...stage,
      percentage: index === 0 ? 100 : array[0].value > 0 ? Math.round((stage.value / array[0].value) * 100) : 0
    }))
  };
}

async function calculatePerformanceTrends(DB: any, userId: string, dateRange: number) {
  const trends = [];
  const intervals = Math.min(dateRange, 30); // Max 30 data points
  const intervalDays = Math.ceil(dateRange / intervals);

  for (let i = 0; i < intervals; i++) {
    const endTime = Math.floor(Date.now() / 1000) - (i * intervalDays * 24 * 60 * 60);
    const startTime = endTime - (intervalDays * 24 * 60 * 60);

    const intervalData = await DB.prepare(`
      SELECT
        COUNT(CASE WHEN l.seller_id = ? AND l.created_at BETWEEN ? AND ? THEN 1 END) as listings,
        COUNT(CASE WHEN o.seller_id = ? AND o.created_at BETWEEN ? AND ? AND o.status = 'completed' THEN 1 END) as sales,
        SUM(CASE WHEN o.seller_id = ? AND o.created_at BETWEEN ? AND ? AND o.status = 'completed' THEN o.amount ELSE 0 END) as revenue
      FROM listings l
      LEFT JOIN offers o ON 1=1
    `).bind(userId, startTime, endTime, userId, startTime, endTime, userId, startTime, endTime).first();

    trends.unshift({
      date: new Date(endTime * 1000).toISOString().split('T')[0],
      listings: intervalData.listings || 0,
      sales: intervalData.sales || 0,
      revenue: (intervalData.revenue || 0) / 100
    });
  }

  return trends;
}

async function calculateCompetitivePosition(DB: any, userId: string) {
  // Get user's category performance
  const userCategories = await DB.prepare(`
    SELECT category, COUNT(*) as listing_count, AVG(price) as avg_price
    FROM listings WHERE seller_id = ?
    GROUP BY category
  `).bind(userId).all();

  const competitiveMetrics = [];

  for (const category of userCategories) {
    const marketData = await DB.prepare(`
      SELECT
        COUNT(*) as total_market_listings,
        AVG(price) as market_avg_price,
        COUNT(DISTINCT seller_id) as competitors_count
      FROM listings
      WHERE category = ? AND seller_id != ?
    `).bind(category.category, userId).first();

    const userRank = await DB.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM (
        SELECT seller_id, COUNT(*) as listing_count
        FROM listings
        WHERE category = ?
        GROUP BY seller_id
        HAVING listing_count > ?
      )
    `).bind(category.category, category.listing_count).first();

    competitiveMetrics.push({
      category: category.category,
      userListings: category.listing_count,
      marketShare: marketData.total_market_listings > 0
        ? Math.round((category.listing_count / marketData.total_market_listings) * 100)
        : 100,
      priceCompetitiveness: marketData.market_avg_price > 0
        ? Math.round((category.avg_price / marketData.market_avg_price) * 100)
        : 100,
      marketRank: userRank.rank,
      totalCompetitors: marketData.competitors_count || 0
    });
  }

  return competitiveMetrics;
}

async function calculateROIAnalysis(DB: any, userId: string, cutoffTime: number) {
  // Calculate investment in the platform vs returns
  const investments = await DB.prepare(`
    SELECT
      SUM(CASE WHEN pe.user_id = ? THEN ap.price ELSE 0 END) as program_investments,
      SUM(CASE WHEN us.user_id = ? THEN est.price_monthly ELSE 0 END) as subscription_costs,
      SUM(CASE WHEN lb.listing_id IN (SELECT id FROM listings WHERE seller_id = ?) THEN lb.price ELSE 0 END) as boost_investments
    FROM program_enrollments pe
    LEFT JOIN acceleration_programs ap ON pe.program_id = ap.id
    LEFT JOIN user_subscriptions us ON 1=1
    LEFT JOIN enhanced_subscription_tiers est ON us.tier_id = est.id
    LEFT JOIN listing_boosts lb ON 1=1
    WHERE (pe.created_at > ? OR us.created_at > ? OR lb.created_at > ?)
  `).bind(userId, userId, userId, cutoffTime, cutoffTime, cutoffTime).first();

  const returns = await DB.prepare(`
    SELECT
      SUM(CASE WHEN o.seller_id = ? AND o.status = 'completed' THEN o.amount ELSE 0 END) as gross_revenue,
      SUM(CASE WHEN rt.referrer_id = ? THEN rt.reward_amount ELSE 0 END) as referral_rewards
    FROM offers o
    LEFT JOIN referral_tracking rt ON 1=1
    WHERE (o.created_at > ? OR rt.converted_at > ?)
  `).bind(userId, userId, cutoffTime, cutoffTime).first();

  const totalInvestment = (investments.program_investments || 0) +
                         (investments.subscription_costs || 0) +
                         (investments.boost_investments || 0);
  const totalReturns = (returns.gross_revenue || 0) + (returns.referral_rewards || 0);

  return {
    totalInvestment: totalInvestment / 100,
    totalReturns: totalReturns / 100,
    netReturn: (totalReturns - totalInvestment) / 100,
    roi: totalInvestment > 0 ? Math.round(((totalReturns - totalInvestment) / totalInvestment) * 100) : 0,
    breakdown: {
      programInvestments: (investments.program_investments || 0) / 100,
      subscriptionCosts: (investments.subscription_costs || 0) / 100,
      boostInvestments: (investments.boost_investments || 0) / 100,
      grossRevenue: (returns.gross_revenue || 0) / 100,
      referralRewards: (returns.referral_rewards || 0) / 100
    }
  };
}

function generateInsights(performanceMetrics: any, engagementMetrics: any, conversionFunnel: any) {
  const insights = [];

  // Performance insights
  if (performanceMetrics.success_rate > 70) {
    insights.push({
      type: 'success',
      title: 'High Success Rate',
      description: `Your ${performanceMetrics.success_rate}% success rate is excellent. Consider raising prices or expanding inventory.`,
      priority: 'medium'
    });
  } else if (performanceMetrics.success_rate < 30) {
    insights.push({
      type: 'warning',
      title: 'Low Success Rate',
      description: `${performanceMetrics.success_rate}% success rate suggests pricing or quality improvements needed.`,
      priority: 'high'
    });
  }

  // Engagement insights
  if (engagementMetrics.social_actions < 10) {
    insights.push({
      type: 'opportunity',
      title: 'Increase Social Engagement',
      description: 'More social sharing and interaction could boost visibility and sales.',
      priority: 'medium'
    });
  }

  // Conversion insights
  const viewsToOffers = conversionFunnel.stages[1].value > 0 && conversionFunnel.stages[2].value > 0
    ? (conversionFunnel.stages[2].value / conversionFunnel.stages[1].value) * 100
    : 0;

  if (viewsToOffers < 5) {
    insights.push({
      type: 'warning',
      title: 'Low View-to-Offer Conversion',
      description: `${viewsToOffers.toFixed(1)}% conversion suggests listing optimization needed.`,
      priority: 'high'
    });
  }

  return insights;
}