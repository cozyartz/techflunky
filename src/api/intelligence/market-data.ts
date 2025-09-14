// Market Intelligence Platform
import type { APIContext } from 'astro';

interface MarketDataPoint {
  category: string;
  industry: string;
  metricType: 'funding_volume' | 'startup_count' | 'success_rate' | 'average_valuation' | 'trend_score';
  value: number;
  dataSource: string;
  confidenceScore: number;
  metadata?: Record<string, any>;
}

// Get market intelligence data
export async function GET({ url, locals }: APIContext) {
  const { DB, CLAUDE_API_KEY } = locals.runtime.env;
  const category = url.searchParams.get('category') || 'all';
  const industry = url.searchParams.get('industry');
  const timeframe = url.searchParams.get('timeframe') || '90'; // days
  const metrics = url.searchParams.get('metrics')?.split(',') || ['all'];

  try {
    // Get stored market data
    const storedData = await getStoredMarketData(DB, category, industry, parseInt(timeframe), metrics);

    // Get AI-powered market insights
    const aiInsights = await generateAIMarketInsights(DB, CLAUDE_API_KEY, category, industry);

    // Get trending categories and industries
    const trends = await getTrendingData(DB, parseInt(timeframe));

    // Get competitive landscape
    const competitiveData = await getCompetitiveLandscape(DB, category, industry);

    // Calculate market scores and recommendations
    const marketScores = calculateMarketScores(storedData);

    return new Response(JSON.stringify({
      marketData: storedData,
      aiInsights,
      trends,
      competitiveData,
      marketScores,
      recommendations: generateRecommendations(marketScores, trends),
      lastUpdated: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting market intelligence:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve market intelligence' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Add market data point
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const dataPoint: MarketDataPoint = await request.json();
    const {
      category,
      industry,
      metricType,
      value,
      dataSource,
      confidenceScore = 0.5,
      metadata = {}
    } = dataPoint;

    if (!category || !industry || !metricType || value === undefined) {
      return new Response(JSON.stringify({
        error: 'Category, industry, metric type, and value are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Mark existing data as non-current
    await DB.prepare(`
      UPDATE market_intelligence
      SET is_current = 0
      WHERE category = ? AND industry = ? AND metric_type = ?
    `).bind(category, industry, metricType).run();

    // Insert new data point
    const result = await DB.prepare(`
      INSERT INTO market_intelligence
      (category, industry, metric_type, value, data_source, confidence_score,
       metadata, date_collected, is_current)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      category,
      industry,
      metricType,
      value,
      dataSource,
      confidenceScore,
      JSON.stringify(metadata),
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      dataPointId: result.meta.last_row_id,
      message: 'Market data point added successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error adding market data:', error);
    return new Response(JSON.stringify({ error: 'Failed to add market data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Bulk update market data (for scheduled data imports)
export async function PUT({ request, locals }: APIContext) {
  const { DB, CLAUDE_API_KEY } = locals.runtime.env;

  try {
    const { dataPoints = [], refreshAI = false } = await request.json();

    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      return new Response(JSON.stringify({
        error: 'Data points array is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    let insertedCount = 0;

    for (const dataPoint of dataPoints) {
      try {
        // Mark existing data as non-current
        await DB.prepare(`
          UPDATE market_intelligence
          SET is_current = 0
          WHERE category = ? AND industry = ? AND metric_type = ?
        `).bind(dataPoint.category, dataPoint.industry, dataPoint.metricType).run();

        // Insert new data point
        await DB.prepare(`
          INSERT INTO market_intelligence
          (category, industry, metric_type, value, data_source, confidence_score,
           metadata, date_collected, is_current)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).bind(
          dataPoint.category,
          dataPoint.industry,
          dataPoint.metricType,
          dataPoint.value,
          dataPoint.dataSource,
          dataPoint.confidenceScore || 0.5,
          JSON.stringify(dataPoint.metadata || {}),
          now
        ).run();

        insertedCount++;
      } catch (error) {
        console.error('Error inserting data point:', error);
      }
    }

    // Refresh AI insights if requested
    if (refreshAI && CLAUDE_API_KEY) {
      await refreshAIInsights(DB, CLAUDE_API_KEY);
    }

    return new Response(JSON.stringify({
      success: true,
      insertedCount,
      totalCount: dataPoints.length,
      message: `Successfully updated ${insertedCount} market data points`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error bulk updating market data:', error);
    return new Response(JSON.stringify({ error: 'Failed to bulk update market data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Generate market report
export async function OPTIONS({ url, locals }: APIContext) {
  const { DB, CLAUDE_API_KEY } = locals.runtime.env;
  const category = url.searchParams.get('category');
  const industry = url.searchParams.get('industry');
  const reportType = url.searchParams.get('type') || 'overview'; // overview, competitive, forecast

  if (!category) {
    return new Response(JSON.stringify({ error: 'Category is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Generate comprehensive market report
    const report = await generateMarketReport(DB, CLAUDE_API_KEY, category, industry, reportType);

    return new Response(JSON.stringify({
      report,
      generatedAt: new Date().toISOString(),
      reportType,
      category,
      industry
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating market report:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate market report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getStoredMarketData(
  DB: any,
  category: string,
  industry: string | null,
  timeframeDays: number,
  metrics: string[]
) {
  const cutoffTime = Math.floor(Date.now() / 1000) - (timeframeDays * 24 * 60 * 60);

  let query = `
    SELECT * FROM market_intelligence
    WHERE is_current = 1 AND date_collected > ?
  `;
  const params = [cutoffTime];

  if (category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (industry) {
    query += ' AND industry = ?';
    params.push(industry);
  }

  if (metrics.length > 0 && !metrics.includes('all')) {
    const placeholders = metrics.map(() => '?').join(',');
    query += ` AND metric_type IN (${placeholders})`;
    params.push(...metrics);
  }

  query += ' ORDER BY date_collected DESC';

  const data = await DB.prepare(query).bind(...params).all();

  // Group data by metric type for easier analysis
  const groupedData = data.reduce((acc: any, item: any) => {
    const key = `${item.category}_${item.industry}_${item.metric_type}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push({
      ...item,
      metadata: JSON.parse(item.metadata || '{}')
    });
    return acc;
  }, {});

  return groupedData;
}

async function generateAIMarketInsights(
  DB: any,
  claudeApiKey: string,
  category: string,
  industry: string | null
) {
  if (!claudeApiKey) {
    return {
      insights: ['AI insights require Claude API key configuration'],
      confidence: 0,
      recommendations: []
    };
  }

  try {
    // Get recent platform data for AI analysis
    const recentData = await DB.prepare(`
      SELECT
        COUNT(CASE WHEN l.created_at > ? THEN 1 END) as new_listings,
        COUNT(CASE WHEN o.created_at > ? THEN 1 END) as new_sales,
        AVG(l.price) as avg_price,
        COUNT(CASE WHEN l.status = 'active' THEN 1 END) as active_listings
      FROM listings l
      LEFT JOIN offers o ON l.id = o.listing_id AND o.status = 'completed'
      WHERE 1=1
      ${category !== 'all' ? 'AND l.category = ?' : ''}
      ${industry ? 'AND l.industry = ?' : ''}
    `).bind(
      Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // 30 days
      Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60),
      ...(category !== 'all' ? [category] : []),
      ...(industry ? [industry] : [])
    ).first();

    const prompt = `
      Analyze this market data for business idea marketplace:

      Category: ${category}
      Industry: ${industry || 'All industries'}

      Recent Activity (30 days):
      - New listings: ${recentData.new_listings}
      - Sales: ${recentData.new_sales}
      - Average price: $${recentData.avg_price ? (recentData.avg_price / 100).toFixed(0) : 'N/A'}
      - Active listings: ${recentData.active_listings}

      Provide:
      1. Market health assessment (3-4 sentences)
      2. Key trends and opportunities (3-5 points)
      3. Risk factors to consider (2-3 points)
      4. Actionable recommendations (3-5 points)

      Keep response concise and data-driven.
    `;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error('Claude API request failed');
    }

    const data = await response.json();
    const insights = data.content[0].text;

    return {
      insights: [insights],
      confidence: 0.8,
      recommendations: extractRecommendations(insights),
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error generating AI insights:', error);
    return {
      insights: ['AI analysis temporarily unavailable'],
      confidence: 0,
      recommendations: []
    };
  }
}

async function getTrendingData(DB: any, timeframeDays: number) {
  const cutoffTime = Math.floor(Date.now() / 1000) - (timeframeDays * 24 * 60 * 60);

  // Get trending categories
  const trendingCategories = await DB.prepare(`
    SELECT
      category,
      COUNT(*) as listing_count,
      COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as sales_count,
      AVG(price) as avg_price
    FROM listings l
    LEFT JOIN offers o ON l.id = o.listing_id
    WHERE l.created_at > ?
    GROUP BY category
    HAVING listing_count >= 3
    ORDER BY listing_count DESC, sales_count DESC
    LIMIT 10
  `).bind(cutoffTime).all();

  // Get trending industries
  const trendingIndustries = await DB.prepare(`
    SELECT
      industry,
      COUNT(*) as listing_count,
      COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as sales_count,
      AVG(price) as avg_price
    FROM listings l
    LEFT JOIN offers o ON l.id = o.listing_id
    WHERE l.created_at > ?
    GROUP BY industry
    HAVING listing_count >= 2
    ORDER BY listing_count DESC, sales_count DESC
    LIMIT 10
  `).bind(cutoffTime).all();

  return {
    categories: trendingCategories.map(c => ({
      ...c,
      formattedPrice: c.avg_price ? `$${(c.avg_price / 100).toLocaleString()}` : 'N/A',
      successRate: c.listing_count > 0 ? Math.round((c.sales_count / c.listing_count) * 100) : 0
    })),
    industries: trendingIndustries.map(i => ({
      ...i,
      formattedPrice: i.avg_price ? `$${(i.avg_price / 100).toLocaleString()}` : 'N/A',
      successRate: i.listing_count > 0 ? Math.round((i.sales_count / i.listing_count) * 100) : 0
    }))
  };
}

async function getCompetitiveLandscape(DB: any, category: string, industry: string | null) {
  let query = `
    SELECT
      seller_id,
      COUNT(*) as total_listings,
      COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_listings,
      AVG(price) as avg_price,
      MAX(price) as max_price,
      MIN(price) as min_price
    FROM listings
    WHERE 1=1
  `;
  const params = [];

  if (category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (industry) {
    query += ' AND industry = ?';
    params.push(industry);
  }

  query += `
    GROUP BY seller_id
    HAVING total_listings >= 2
    ORDER BY sold_listings DESC, total_listings DESC
    LIMIT 15
  `;

  const competitors = await DB.prepare(query).bind(...params).all();

  // Get user names for top competitors
  const competitorsWithNames = await Promise.all(
    competitors.map(async (comp: any) => {
      const user = await DB.prepare(`
        SELECT u.name, p.company FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = ?
      `).bind(comp.seller_id).first();

      return {
        ...comp,
        sellerName: user?.name || 'Anonymous',
        company: user?.company,
        successRate: comp.total_listings > 0 ? Math.round((comp.sold_listings / comp.total_listings) * 100) : 0,
        formattedAvgPrice: comp.avg_price ? `$${(comp.avg_price / 100).toLocaleString()}` : 'N/A'
      };
    })
  );

  return {
    topSellers: competitorsWithNames,
    marketConcentration: calculateMarketConcentration(competitors),
    competitiveIntensity: calculateCompetitiveIntensity(competitors.length)
  };
}

function calculateMarketScores(marketData: any) {
  const scores = {
    demandScore: 0,
    supplyScore: 0,
    priceStability: 0,
    growthPotential: 0,
    competitiveIntensity: 0
  };

  // Calculate scores based on available data
  // This is a simplified version - production would use more sophisticated algorithms

  const dataPoints = Object.values(marketData).flat() as any[];

  if (dataPoints.length > 0) {
    scores.demandScore = Math.min(100, dataPoints.length * 10);
    scores.supplyScore = Math.min(100, dataPoints.filter(d => d.metric_type === 'startup_count').length * 20);
    scores.priceStability = 75; // Would calculate from price variance
    scores.growthPotential = 60; // Would calculate from trend data
    scores.competitiveIntensity = 50; // Would calculate from market concentration
  }

  return scores;
}

function generateRecommendations(marketScores: any, trends: any) {
  const recommendations = [];

  if (marketScores.demandScore > 70) {
    recommendations.push({
      type: 'opportunity',
      title: 'High Demand Market',
      description: 'Strong buyer interest in this category. Consider premium pricing.',
      priority: 'high'
    });
  }

  if (trends.categories.length > 0) {
    const topCategory = trends.categories[0];
    recommendations.push({
      type: 'trend',
      title: `Focus on ${topCategory.category}`,
      description: `${topCategory.category} shows ${topCategory.listing_count} new listings with ${topCategory.successRate}% success rate.`,
      priority: 'medium'
    });
  }

  if (marketScores.competitiveIntensity < 30) {
    recommendations.push({
      type: 'opportunity',
      title: 'Low Competition',
      description: 'Limited competition in this space. Good opportunity for market entry.',
      priority: 'high'
    });
  }

  return recommendations;
}

async function generateMarketReport(
  DB: any,
  claudeApiKey: string,
  category: string,
  industry: string | null,
  reportType: string
) {
  // This would generate a comprehensive market report
  // For brevity, returning a structured template

  return {
    executiveSummary: `Market analysis for ${category}${industry ? ` in ${industry}` : ''}`,
    keyFindings: [
      'Market shows moderate growth potential',
      'Competition level is manageable',
      'Price points are stable'
    ],
    marketSize: {
      current: 'Data collection in progress',
      projected: 'Analysis pending'
    },
    opportunities: [
      'Underserved niches identified',
      'Premium segment potential',
      'International expansion possible'
    ],
    risks: [
      'Market saturation risk in 12-18 months',
      'Regulatory changes possible'
    ],
    recommendations: [
      'Focus on quality over quantity',
      'Build strong brand presence',
      'Develop strategic partnerships'
    ]
  };
}

function calculateMarketConcentration(competitors: any[]) {
  if (competitors.length === 0) return 0;

  const totalListings = competitors.reduce((sum, comp) => sum + comp.total_listings, 0);
  const topFiveListings = competitors.slice(0, 5).reduce((sum, comp) => sum + comp.total_listings, 0);

  return totalListings > 0 ? Math.round((topFiveListings / totalListings) * 100) : 0;
}

function calculateCompetitiveIntensity(competitorCount: number) {
  if (competitorCount === 0) return 'Low';
  if (competitorCount < 5) return 'Low';
  if (competitorCount < 15) return 'Moderate';
  return 'High';
}

function extractRecommendations(aiResponse: string): string[] {
  // Simple extraction - in production would use more sophisticated NLP
  const lines = aiResponse.split('\n').filter(line => line.trim());
  return lines.filter(line =>
    line.includes('recommend') ||
    line.includes('consider') ||
    line.includes('should') ||
    line.startsWith('•') ||
    line.startsWith('-')
  ).slice(0, 5);
}

async function refreshAIInsights(DB: any, claudeApiKey: string) {
  // This would refresh AI insights for all major categories
  // Implementation would cycle through categories and update insights
  console.log('Refreshing AI insights...');
}