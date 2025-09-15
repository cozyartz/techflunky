import type { APIRoute } from 'astro';
import { MarketplaceCertificationSystem } from '../../../lib/certification/marketplace-certification';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { blueprintId, requestLevel } = await request.json();

    if (!blueprintId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Blueprint ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Retrieve blueprint from database
    const blueprint = await getBlueprint(blueprintId, locals.runtime.env);
    if (!blueprint) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Blueprint not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize certification system
    const certificationSystem = new MarketplaceCertificationSystem(locals.runtime.env);

    // Evaluate blueprint for certification
    const certificationResult = await certificationSystem.evaluateBlueprint(blueprint);

    // Determine pricing based on requested level vs achieved level
    const pricing = calculateCertificationPricing(requestLevel, certificationResult.certificationLevel);

    // If expert review is required, queue it
    if (certificationResult.expertReviewRequired) {
      await certificationSystem.queueForExpertReview(certificationResult, locals.runtime.env);
    }

    // Save certification result
    await saveCertificationResult(certificationResult, locals.runtime.env);

    // Create marketplace certification if level is achieved
    let marketplaceCertification = null;
    if (certificationResult.certificationLevel !== 'none') {
      marketplaceCertification = await certificationSystem.createMarketplaceCertification(certificationResult);
      await saveMarketplaceCertification(marketplaceCertification, locals.runtime.env);
    }

    // Log certification event
    await logCertificationEvent({
      blueprintId,
      requestedLevel: requestLevel,
      achievedLevel: certificationResult.certificationLevel,
      score: certificationResult.overallScore,
      expertReviewRequired: certificationResult.expertReviewRequired,
      timestamp: new Date().toISOString()
    }, locals.runtime.env);

    return new Response(JSON.stringify({
      success: true,
      data: {
        certificationResult,
        marketplaceCertification,
        pricing,
        nextSteps: generateNextSteps(certificationResult)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Certification error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error during certification'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function getBlueprint(blueprintId: string, env: any) {
  const result = await env.DB.prepare(`
    SELECT * FROM business_blueprints WHERE id = ?
  `).bind(blueprintId).first();

  if (!result) return null;

  return {
    id: result.id,
    title: result.title,
    problemStatement: result.problem_statement,
    targetCustomer: result.target_customer,
    valueProposition: result.value_proposition,
    revenueModel: result.revenue_model,
    pricingStrategy: result.pricing_strategy,
    goToMarketPlan: result.go_to_market_plan,
    competitiveAdvantage: result.competitive_advantage,
    techStack: result.tech_stack,
    mvpFeatures: JSON.parse(result.mvp_features || '[]'),
    roadmap: result.roadmap,
    marketSize: result.market_size,
    financialProjections: result.financial_projections,
    riskAssessment: result.risk_assessment,
    legalConsiderations: result.legal_considerations,
    ipStrategy: result.ip_strategy,
    status: result.status,
    tier: result.tier,
    createdAt: new Date(result.created_at),
    updatedAt: new Date(result.updated_at)
  };
}

function calculateCertificationPricing(requestedLevel: string, achievedLevel: string) {
  const levelPricing = {
    'basic': 0, // Free with blueprint purchase
    'verified': 99,
    'premium': 299,
    'elite': 599
  };

  const basePricing = {
    requested: levelPricing[requestedLevel as keyof typeof levelPricing] || 0,
    achieved: levelPricing[achievedLevel as keyof typeof levelPricing] || 0
  };

  // If achieved level is higher than requested, user gets upgrade for free
  // If achieved level is lower, they pay for what they achieved
  const finalPrice = Math.min(basePricing.requested, basePricing.achieved);

  return {
    requestedLevel,
    achievedLevel,
    requestedPrice: basePricing.requested,
    achievedPrice: basePricing.achieved,
    finalPrice,
    savings: basePricing.requested - finalPrice,
    upgrade: achievedLevel !== 'none' && basePricing.achieved > basePricing.requested
  };
}

async function saveCertificationResult(result: any, env: any) {
  const stmt = env.DB.prepare(`
    INSERT INTO certification_results (
      id, blueprint_id, overall_score, category_scores, certification_level,
      badge, feedback, recommendations, expert_review_required, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    `cert_result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    result.blueprintId,
    result.overallScore,
    JSON.stringify(result.categoryScores),
    result.certificationLevel,
    result.badge,
    JSON.stringify(result.feedback),
    JSON.stringify(result.recommendations),
    result.expertReviewRequired ? 1 : 0,
    new Date().toISOString()
  ).run();
}

async function saveMarketplaceCertification(certification: any, env: any) {
  const stmt = env.DB.prepare(`
    INSERT INTO marketplace_certifications (
      id, blueprint_id, level, badge, trust_score, validated_by,
      certification_date, features, guarantees
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    certification.id,
    certification.blueprintId,
    certification.level,
    certification.badge,
    certification.trustScore,
    JSON.stringify(certification.validatedBy),
    certification.certificationDate.toISOString(),
    JSON.stringify(certification.features),
    JSON.stringify(certification.guarantees)
  ).run();
}

function generateNextSteps(result: any) {
  const steps = [];

  if (result.certificationLevel === 'none') {
    steps.push({
      action: 'improve_blueprint',
      title: 'Improve Your Blueprint',
      description: 'Address the feedback points to qualify for certification',
      priority: 'high'
    });
  }

  if (result.expertReviewRequired) {
    steps.push({
      action: 'expert_review',
      title: 'Expert Review Scheduled',
      description: 'A business expert will review your blueprint within 48 hours',
      priority: 'medium',
      estimatedTime: '24-48 hours'
    });
  }

  if (result.certificationLevel !== 'none' && !result.expertReviewRequired) {
    steps.push({
      action: 'marketplace_listing',
      title: 'List on Marketplace',
      description: 'Your certified blueprint is ready for the TechFlunky marketplace',
      priority: 'high'
    });
  }

  if (result.recommendations.length > 0) {
    steps.push({
      action: 'implement_recommendations',
      title: 'Implement Recommendations',
      description: 'Follow AI recommendations to improve your business plan',
      priority: 'medium'
    });
  }

  return steps;
}

async function logCertificationEvent(data: any, env: any) {
  // Save to analytics database
  const stmt = env.DB.prepare(`
    INSERT INTO certification_analytics (
      blueprint_id, requested_level, achieved_level, score,
      expert_review_required, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    data.blueprintId,
    data.requestedLevel,
    data.achievedLevel,
    data.score,
    data.expertReviewRequired ? 1 : 0,
    data.timestamp
  ).run();

  // Send to analytics queue
  await env.ANALYTICS_QUEUE.send({
    event: 'blueprint_certified',
    properties: data
  });
}