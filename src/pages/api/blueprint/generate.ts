import type { APIRoute } from 'astro';
import { CloudflareAIBlueprintGenerator, type BlueprintGenerationRequest, type BusinessBlueprint } from '../../../lib/ai/blueprint-generator';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    const requestData: BlueprintGenerationRequest = await request.json();

    // Validate required fields
    if (!requestData.ideaDescription || !requestData.industry || !requestData.targetMarket || !requestData.businessModel) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate tier and apply pricing
    const tierPricing = {
      basic: 19,
      premium: 49,
      enterprise: 299
    };

    if (!tierPricing[requestData.tier as keyof typeof tierPricing]) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid service tier'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize AI generator
    const generator = new CloudflareAIBlueprintGenerator(locals.runtime.env);

    // Generate blueprint using Cloudflare AI
    const blueprint = await generator.generateBusinessBlueprint(requestData);

    // Store blueprint in database
    const savedBlueprint = await saveBlueprint(blueprint, locals.runtime.env);

    // For premium/enterprise tiers, trigger additional processing
    if (requestData.tier === 'premium' || requestData.tier === 'enterprise') {
      // Queue for expert review (enterprise tier)
      if (requestData.tier === 'enterprise') {
        await queueForExpertReview(savedBlueprint.id, locals.runtime.env);
      }

      // Generate additional analysis
      await generateAdditionalAnalysis(savedBlueprint.id, requestData, locals.runtime.env);
    }

    // Log generation event for analytics
    await logBlueprintGeneration({
      blueprintId: savedBlueprint.id,
      tier: requestData.tier,
      industry: requestData.industry,
      businessModel: requestData.businessModel,
      timestamp: new Date().toISOString()
    }, locals.runtime.env);

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: savedBlueprint.id,
        tier: requestData.tier,
        price: tierPricing[requestData.tier as keyof typeof tierPricing],
        estimatedCompletionTime: getEstimatedCompletionTime(requestData.tier),
        paymentRequired: true
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Blueprint generation error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error during blueprint generation'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function saveBlueprint(blueprint: BusinessBlueprint, env: any): Promise<BusinessBlueprint> {
  // Save to Cloudflare D1 database
  const stmt = env.DB.prepare(`
    INSERT INTO business_blueprints (
      id, title, problem_statement, target_customer, value_proposition,
      revenue_model, pricing_strategy, go_to_market_plan, competitive_advantage,
      tech_stack, mvp_features, roadmap, market_size, financial_projections,
      risk_assessment, legal_considerations, ip_strategy, status, tier,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    blueprint.id,
    blueprint.title,
    blueprint.problemStatement,
    blueprint.targetCustomer,
    blueprint.valueProposition,
    blueprint.revenueModel,
    blueprint.pricingStrategy,
    blueprint.goToMarketPlan,
    blueprint.competitiveAdvantage,
    blueprint.techStack,
    JSON.stringify(blueprint.mvpFeatures),
    blueprint.roadmap,
    blueprint.marketSize,
    blueprint.financialProjections,
    blueprint.riskAssessment,
    blueprint.legalConsiderations,
    blueprint.ipStrategy,
    blueprint.status,
    blueprint.tier,
    blueprint.createdAt.toISOString(),
    blueprint.updatedAt.toISOString()
  ).run();

  return blueprint;
}

async function queueForExpertReview(blueprintId: string, env: any): Promise<void> {
  // Add to expert review queue
  const stmt = env.DB.prepare(`
    INSERT INTO expert_review_queue (
      blueprint_id, status, priority, created_at
    ) VALUES (?, ?, ?, ?)
  `);

  await stmt.bind(
    blueprintId,
    'pending',
    'high', // Enterprise tier gets high priority
    new Date().toISOString()
  ).run();

  // Send notification to expert reviewers
  await sendExpertNotification(blueprintId, env);
}

async function generateAdditionalAnalysis(blueprintId: string, request: BlueprintGenerationRequest, env: any): Promise<void> {
  // Queue additional AI analysis for premium/enterprise tiers
  const analysisJobs = [];

  if (request.tier === 'premium' || request.tier === 'enterprise') {
    analysisJobs.push('competitive_analysis');
    analysisJobs.push('market_research');
  }

  if (request.tier === 'enterprise') {
    analysisJobs.push('investor_presentation');
    analysisJobs.push('financial_modeling');
    analysisJobs.push('risk_assessment');
  }

  // Queue jobs using Cloudflare Queues
  for (const jobType of analysisJobs) {
    await env.BLUEPRINT_ANALYSIS_QUEUE.send({
      blueprintId,
      analysisType: jobType,
      tier: request.tier,
      industry: request.industry,
      businessModel: request.businessModel
    });
  }
}

async function sendExpertNotification(blueprintId: string, env: any): Promise<void> {
  // Send email notification to expert reviewers
  const emailData = {
    to: 'experts@techflunky.com',
    subject: 'New Enterprise Blueprint Ready for Review',
    template: 'expert-review-notification',
    data: {
      blueprintId,
      reviewUrl: `https://admin.techflunky.com/blueprints/${blueprintId}/review`,
      priority: 'high'
    }
  };

  await env.EMAIL_QUEUE.send(emailData);
}

async function logBlueprintGeneration(data: any, env: any): Promise<void> {
  // Log to analytics database
  const stmt = env.DB.prepare(`
    INSERT INTO blueprint_analytics (
      blueprint_id, tier, industry, business_model, timestamp
    ) VALUES (?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    data.blueprintId,
    data.tier,
    data.industry,
    data.businessModel,
    data.timestamp
  ).run();

  // Send to analytics service
  await env.ANALYTICS_QUEUE.send({
    event: 'blueprint_generated',
    properties: data
  });
}

function getEstimatedCompletionTime(tier: string): string {
  switch (tier) {
    case 'basic':
      return '5-10 minutes';
    case 'premium':
      return '15-30 minutes';
    case 'enterprise':
      return '2-4 hours (includes expert review)';
    default:
      return '10-15 minutes';
  }
}