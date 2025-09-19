// AI-Powered Deal Scoring and Due Diligence Automation
import type { APIContext } from 'astro';

const SCORING_WEIGHTS = {
  business_model: 0.25,
  market_opportunity: 0.20,
  financial_viability: 0.20,
  founder_quality: 0.15,
  technical_execution: 0.10,
  competitive_advantage: 0.10
};

const RISK_FACTORS = {
  high_risk: ['unproven_model', 'no_revenue', 'single_founder', 'saturated_market'],
  medium_risk: ['early_revenue', 'small_team', 'competitive_market', 'regulatory_uncertainty'],
  low_risk: ['proven_revenue', 'experienced_team', 'unique_positioning', 'growing_market']
};

// Generate AI-powered deal score
export async function POST({ request, locals }: APIContext) {
  // Guard against build-time execution
  if (!locals?.runtime?.env) {
    return new Response(JSON.stringify({
      error: 'Service temporarily unavailable'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { DB, ANTHROPIC_API_KEY } = locals.runtime.env;

  try {
    const { listingId, forceRecalculate = false } = await request.json();

    if (!listingId) {
      return new Response(JSON.stringify({
        error: 'Listing ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if score already exists and is recent
    if (!forceRecalculate) {
      const existingScore = await DB.prepare(`
        SELECT * FROM deal_scores
        WHERE listing_id = ? AND created_at > ?
      `).bind(listingId, Math.floor(Date.now() / 1000) - 86400).first(); // 24 hours

      if (existingScore) {
        return new Response(JSON.stringify({
          success: true,
          dealScore: {
            ...existingScore,
            scoring_breakdown: JSON.parse(existingScore.scoring_breakdown || '{}'),
            risk_factors: JSON.parse(existingScore.risk_factors || '[]'),
            recommendations: JSON.parse(existingScore.recommendations || '[]')
          },
          cached: true
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Get listing details for scoring
    const listing = await DB.prepare(`
      SELECT
        l.*,
        u.name as seller_name,
        COALESCE(ur.overall_score, 0) as seller_reputation,
        COALESCE(iv.status, 'unverified') as verification_status,
        COALESCE(cc.security_scan_passed, 0) as has_secure_code
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN user_reputation ur ON l.seller_id = ur.user_id
      LEFT JOIN identity_verifications iv ON l.seller_id = iv.user_id
      LEFT JOIN code_containers cc ON l.id = cc.listing_id
      WHERE l.id = ?
    `).bind(listingId).first();

    if (!listing) {
      return new Response(JSON.stringify({
        error: 'Listing not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate comprehensive deal score
    const dealAnalysis = await generateDealAnalysis(listing, ANTHROPIC_API_KEY);
    const quantitativeScore = calculateQuantitativeScore(listing);
    const riskAssessment = assessDealRisks(listing, dealAnalysis);

    const finalScore = combineScores(quantitativeScore, dealAnalysis.aiScore || 0.5);
    const investmentPotential = calculateInvestmentPotential(finalScore, riskAssessment.level);

    const now = Math.floor(Date.now() / 1000);
    const scoreId = generateScoreId();

    // Store deal score
    await DB.prepare(`
      INSERT OR REPLACE INTO deal_scores
      (id, listing_id, ai_score, investment_potential, risk_assessment, scoring_breakdown,
       risk_factors, recommendations, ai_analysis, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      scoreId,
      listingId,
      finalScore,
      investmentPotential,
      riskAssessment.level,
      JSON.stringify(quantitativeScore.breakdown),
      JSON.stringify(riskAssessment.factors),
      JSON.stringify(dealAnalysis.recommendations || []),
      dealAnalysis.fullAnalysis || null,
      now,
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      dealScore: {
        id: scoreId,
        listing_id: listingId,
        ai_score: finalScore,
        investment_potential: investmentPotential,
        risk_assessment: riskAssessment.level,
        scoring_breakdown: quantitativeScore.breakdown,
        risk_factors: riskAssessment.factors,
        recommendations: dealAnalysis.recommendations || [],
        ai_analysis: dealAnalysis.summary,
        score_explanation: generateScoreExplanation(finalScore, riskAssessment),
        created_at: now
      },
      cached: false
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating deal score:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate deal score' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get deal scores with filtering and sorting
export async function GET({ url, locals }: APIContext) {
  // Guard against build-time execution
  if (!locals?.runtime?.env) {
    return new Response(JSON.stringify({
      error: 'Service temporarily unavailable'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { DB } = locals.runtime.env;
  const listingId = url.searchParams.get('listingId');
  const investorId = url.searchParams.get('investorId');
  const minScore = parseFloat(url.searchParams.get('minScore') || '0');
  const maxRisk = url.searchParams.get('maxRisk') || 'high';
  const category = url.searchParams.get('category');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  try {
    if (listingId) {
      // Get specific deal score
      const dealScore = await DB.prepare(`
        SELECT
          ds.*,
          l.title,
          l.category,
          l.price,
          u.name as seller_name
        FROM deal_scores ds
        JOIN listings l ON ds.listing_id = l.id
        JOIN users u ON l.seller_id = u.id
        WHERE ds.listing_id = ?
        ORDER BY ds.created_at DESC
        LIMIT 1
      `).bind(listingId).first();

      if (!dealScore) {
        return new Response(JSON.stringify({
          error: 'Deal score not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        dealScore: {
          ...dealScore,
          scoring_breakdown: JSON.parse(dealScore.scoring_breakdown || '{}'),
          risk_factors: JSON.parse(dealScore.risk_factors || '[]'),
          recommendations: JSON.parse(dealScore.recommendations || '[]')
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get filtered list of scored deals
    let whereClause = 'WHERE ds.ai_score >= ?';
    let params = [minScore];

    if (maxRisk !== 'high') {
      const riskLevels = maxRisk === 'low' ? ['low'] : ['low', 'medium'];
      whereClause += ` AND ds.risk_assessment IN (${riskLevels.map(() => '?').join(',')})`;
      params.push(...riskLevels);
    }

    if (category) {
      whereClause += ' AND l.category = ?';
      params.push(category);
    }

    if (investorId) {
      // Optionally filter by investor preferences
      const investor = await DB.prepare(`
        SELECT investment_preferences FROM investor_profiles WHERE user_id = ?
      `).bind(investorId).first();

      if (investor && investor.investment_preferences) {
        const preferences = JSON.parse(investor.investment_preferences);
        if (preferences.industries && preferences.industries.length > 0) {
          whereClause += ` AND l.category IN (${preferences.industries.map(() => '?').join(',')})`;
          params.push(...preferences.industries);
        }
      }
    }

    const scoredDeals = await DB.prepare(`
      SELECT
        ds.*,
        l.title,
        l.category,
        l.price,
        l.business_stage,
        u.name as seller_name,
        COALESCE(ur.overall_score, 0) as seller_reputation,
        CASE WHEN ii.listing_id IS NOT NULL THEN 1 ELSE 0 END as investor_interested
      FROM deal_scores ds
      JOIN listings l ON ds.listing_id = l.id
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN user_reputation ur ON l.seller_id = ur.user_id
      LEFT JOIN investor_interests ii ON ds.listing_id = ii.listing_id AND ii.investor_id = ?
      ${whereClause}
      ORDER BY ds.ai_score DESC, ds.created_at DESC
      LIMIT ?
    `).bind(investorId || null, ...params, limit).all();

    return new Response(JSON.stringify({
      deals: scoredDeals.map(deal => ({
        ...deal,
        scoring_breakdown: JSON.parse(deal.scoring_breakdown || '{}'),
        risk_factors: JSON.parse(deal.risk_factors || '[]'),
        recommendations: JSON.parse(deal.recommendations || '[]'),
        price_formatted: `$${(deal.price / 100).toLocaleString()}`,
        score_percentage: Math.round(deal.ai_score * 100),
        risk_badge: getRiskBadge(deal.risk_assessment)
      })),
      filters: {
        minScore,
        maxRisk,
        category,
        appliedCount: scoredDeals.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting deal scores:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve deal scores' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function generateDealAnalysis(listing: any, apiKey?: string) {
  if (!apiKey) {
    return {
      aiScore: calculateBasicAIScore(listing),
      summary: 'Basic scoring applied (no AI analysis available)',
      recommendations: generateBasicRecommendations(listing)
    };
  }

  try {
    const prompt = `Analyze this business opportunity for angel investment potential:

Business: ${listing.title}
Category: ${listing.category}
Price: $${(listing.price / 100).toLocaleString()}
Stage: ${listing.business_stage}
Description: ${listing.description?.substring(0, 500)}

Seller Profile:
- Name: ${listing.seller_name}
- Reputation Score: ${listing.seller_reputation}/100
- Verified: ${listing.verification_status === 'approved' ? 'Yes' : 'No'}
- Has Secure Code: ${listing.has_secure_code ? 'Yes' : 'No'}

Please provide:
1. Investment Score (0.0-1.0)
2. Key Strengths (2-3 points)
3. Risk Concerns (2-3 points)
4. Investment Recommendations (2-3 actions)

Format as JSON with keys: score, strengths, risks, recommendations`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const analysis = JSON.parse(data.content[0].text);

      return {
        aiScore: Math.max(0, Math.min(1, analysis.score || 0.5)),
        summary: `AI Analysis: ${analysis.strengths?.join('; ') || 'Analysis completed'}`,
        recommendations: analysis.recommendations || [],
        fullAnalysis: data.content[0].text
      };
    }
  } catch (error) {
    console.warn('AI analysis failed:', error);
  }

  return {
    aiScore: calculateBasicAIScore(listing),
    summary: 'Basic scoring applied (AI analysis unavailable)',
    recommendations: generateBasicRecommendations(listing)
  };
}

function calculateQuantitativeScore(listing: any) {
  const scores = {
    verification: listing.verification_status === 'approved' ? 0.9 : 0.3,
    reputation: listing.seller_reputation / 100,
    security: listing.has_secure_code ? 0.8 : 0.4,
    stage: getStageScore(listing.business_stage),
    category: getCategoryScore(listing.category),
    pricing: getPricingScore(listing.price)
  };

  const weightedScore = (
    scores.verification * 0.25 +
    scores.reputation * 0.20 +
    scores.security * 0.15 +
    scores.stage * 0.15 +
    scores.category * 0.15 +
    scores.pricing * 0.10
  );

  return {
    score: Math.max(0, Math.min(1, weightedScore)),
    breakdown: scores
  };
}

function calculateBasicAIScore(listing: any) {
  let score = 0.5; // Base score

  // Business stage adjustment
  if (listing.business_stage === 'launch_ready') score += 0.2;
  else if (listing.business_stage === 'blueprint') score += 0.1;

  // Category adjustment (tech categories score higher)
  const techCategories = ['saas', 'fintech', 'healthtech', 'ai_ml'];
  if (techCategories.includes(listing.category?.toLowerCase())) score += 0.1;

  // Verification bonus
  if (listing.verification_status === 'approved') score += 0.15;

  // Reputation bonus
  if (listing.seller_reputation > 80) score += 0.1;

  return Math.max(0.1, Math.min(1.0, score));
}

function assessDealRisks(listing: any, analysis: any) {
  const risks = [];
  let riskLevel = 'medium';

  // Business stage risks
  if (listing.business_stage === 'concept') {
    risks.push({ factor: 'early_stage', impact: 'high', description: 'Very early stage business' });
  }

  // Verification risks
  if (listing.verification_status !== 'approved') {
    risks.push({ factor: 'unverified_seller', impact: 'medium', description: 'Seller identity not verified' });
  }

  // Reputation risks
  if (listing.seller_reputation < 50) {
    risks.push({ factor: 'low_reputation', impact: 'medium', description: 'Seller has low reputation score' });
  }

  // Technical risks
  if (!listing.has_secure_code && listing.category?.toLowerCase().includes('tech')) {
    risks.push({ factor: 'security_concerns', impact: 'medium', description: 'Code security not validated' });
  }

  // Determine overall risk level
  const highRiskCount = risks.filter(r => r.impact === 'high').length;
  const mediumRiskCount = risks.filter(r => r.impact === 'medium').length;

  if (highRiskCount >= 2) riskLevel = 'high';
  else if (highRiskCount === 1 || mediumRiskCount >= 3) riskLevel = 'medium';
  else if (risks.length <= 1) riskLevel = 'low';

  return { level: riskLevel, factors: risks };
}

function combineScores(quantScore: any, aiScore: number) {
  return (quantScore.score * 0.6) + (aiScore * 0.4);
}

function calculateInvestmentPotential(score: number, riskLevel: string) {
  let potential = score;

  // Adjust for risk
  if (riskLevel === 'low') potential += 0.1;
  else if (riskLevel === 'high') potential -= 0.15;

  return Math.max(0.1, Math.min(1.0, potential));
}

function generateScoreExplanation(score: number, riskAssessment: any) {
  const percentage = Math.round(score * 100);

  if (percentage >= 80) {
    return `Excellent investment opportunity (${percentage}%). ${riskAssessment.level === 'low' ? 'Low risk profile' : 'Consider risk factors'}.`;
  } else if (percentage >= 70) {
    return `Strong investment potential (${percentage}%). ${riskAssessment.level === 'high' ? 'Higher risk requires careful evaluation' : 'Good risk-reward balance'}.`;
  } else if (percentage >= 60) {
    return `Moderate investment potential (${percentage}%). Requires thorough due diligence.`;
  } else {
    return `Below average investment score (${percentage}%). Significant risks identified.`;
  }
}

function generateBasicRecommendations(listing: any) {
  const recommendations = [];

  if (listing.verification_status !== 'approved') {
    recommendations.push('Request seller identity verification');
  }

  if (!listing.has_secure_code && listing.category?.toLowerCase().includes('tech')) {
    recommendations.push('Conduct technical due diligence');
  }

  if (listing.business_stage === 'concept') {
    recommendations.push('Request detailed business plan and financials');
  }

  return recommendations.length > 0 ? recommendations : ['Conduct standard due diligence process'];
}

function getStageScore(stage: string) {
  const scores = {
    'concept': 0.3,
    'blueprint': 0.6,
    'launch_ready': 0.9
  };
  return scores[stage] || 0.5;
}

function getCategoryScore(category: string) {
  const highValueCategories = ['saas', 'fintech', 'healthtech', 'ai_ml'];
  return highValueCategories.includes(category?.toLowerCase()) ? 0.8 : 0.6;
}

function getPricingScore(price: number) {
  // Sweet spot for angel investments is typically $25K-$500K
  const priceK = price / 100000; // Convert to thousands
  if (priceK >= 25 && priceK <= 500) return 0.9;
  if (priceK >= 10 && priceK <= 1000) return 0.7;
  return 0.5;
}

function getRiskBadge(riskLevel: string) {
  const badges = {
    'low': { color: 'green', text: 'Low Risk' },
    'medium': { color: 'yellow', text: 'Medium Risk' },
    'high': { color: 'red', text: 'High Risk' }
  };
  return badges[riskLevel] || badges.medium;
}

function generateScoreId(): string {
  const prefix = 'score_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}