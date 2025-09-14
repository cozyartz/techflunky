// AI-Powered Idea Validation Service
import type { APIContext } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Validation service pricing
const VALIDATION_PRICING = {
  basic: 19900, // $199 - AI analysis only
  comprehensive: 49900, // $499 - AI + expert review
  market_analysis: 99900 // $999 - Full market research + validation
};

export async function POST({ request, locals }: APIContext) {
  const { DB, CACHE } = locals.runtime.env;
  
  try {
    const data = await request.json();
    const { listingId, validationType = 'basic', urgentDelivery = false } = data;

    // TODO: Get authenticated user
    const userId = 'temp-user-id';

    // Validate listing exists and user has access
    const listing = await DB.prepare(
      'SELECT * FROM listings WHERE id = ? AND (seller_id = ? OR status = "active")'
    ).bind(listingId, userId).first();

    if (!listing) {
      return new Response(JSON.stringify({ 
        error: 'Listing not found or access denied' 
      }), { status: 404 });
    }

    let price = VALIDATION_PRICING[validationType];
    if (urgentDelivery) price *= 1.5; // 50% rush fee

    // Create validation request
    const validationRequest = await DB.prepare(`
      INSERT INTO validation_requests (
        listing_id, requester_id, validation_type, 
        price, status
      ) VALUES (?, ?, ?, ?, 'pending')
    `).bind(listingId, userId, validationType, price).run();

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price,
      currency: 'usd',
      metadata: {
        validation_request_id: validationRequest.meta.last_row_id,
        listing_id: listingId,
        validation_type: validationType
      }
    });

    // Queue AI analysis
    await DB.prepare(`
      INSERT INTO ai_analysis_queue (
        listing_id, analysis_type, status, input_data
      ) VALUES (?, 'market_validation', 'pending', ?)
    `).bind(
      listingId, 
      JSON.stringify({
        validation_request_id: validationRequest.meta.last_row_id,
        validation_type: validationType,
        listing_data: listing
      })
    ).run();

    return new Response(JSON.stringify({
      success: true,
      validationRequestId: validationRequest.meta.last_row_id,
      price,
      estimatedDelivery: urgentDelivery ? 24 : 72, // hours
      paymentIntent: {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id
      }
    }), { status: 201 });

  } catch (error) {
    console.error('Error creating validation request:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create validation request' 
    }), { status: 500 });
  }
}

// Process AI validation (called by cron job or webhook)
export async function processAIValidation(validationRequestId: string, env: any) {
  const { DB } = env;

  try {
    // Get validation request and listing data
    const validation = await DB.prepare(`
      SELECT vr.*, l.title, l.description, l.category, l.industry, l.market_research
      FROM validation_requests vr
      JOIN listings l ON vr.listing_id = l.id
      WHERE vr.id = ?
    `).bind(validationRequestId).first();

    if (!validation) return;

    // Call Claude API for analysis
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.CLAUDE_API_KEY
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Analyze this business concept for market viability:

Title: ${validation.title}
Description: ${validation.description}
Category: ${validation.category}
Industry: ${validation.industry}
Market Research: ${validation.market_research || 'None provided'}

Provide analysis in this JSON format:
{
  "market_score": (1-10),
  "feasibility_score": (1-10),
  "competition_level": "low|medium|high",
  "market_size_estimate": "Small ($<10M)|Medium ($10M-1B)|Large ($1B+)",
  "key_strengths": ["strength1", "strength2"],
  "key_risks": ["risk1", "risk2"],
  "recommendations": ["rec1", "rec2"],
  "next_steps": ["step1", "step2"],
  "overall_rating": "Poor|Fair|Good|Excellent"
}

Be objective and thorough in your analysis.`
        }]
      })
    });

    const aiResult = await claudeResponse.json();
    const analysis = JSON.parse(aiResult.content[0].text);

    // Update validation request with AI analysis
    await DB.prepare(`
      UPDATE validation_requests 
      SET status = 'completed',
          ai_analysis = ?,
          market_score = ?,
          feasibility_score = ?,
          completed_at = unixepoch()
      WHERE id = ?
    `).bind(
      JSON.stringify(analysis),
      analysis.market_score,
      analysis.feasibility_score,
      validationRequestId
    ).run();

    // Create notification for user
    await DB.prepare(`
      INSERT INTO notifications (
        user_id, type, title, message, action_url
      ) VALUES (?, 'validation_completed', 'Idea Validation Complete', 
                'Your business concept analysis is ready for review.', 
                '/dashboard/validations/${validationRequestId}')
    `).bind(validation.requester_id).run();

    console.log(`AI validation completed for request ${validationRequestId}`);

  } catch (error) {
    console.error('Error processing AI validation:', error);
    
    // Mark as failed
    await DB.prepare(`
      UPDATE validation_requests 
      SET status = 'failed' 
      WHERE id = ?
    `).bind(validationRequestId).run();
  }
}

export async function GET({ params, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const { id } = params;

  try {
    // TODO: Get authenticated user and verify access
    const userId = 'temp-user-id';

    const validation = await DB.prepare(`
      SELECT vr.*, l.title as listing_title, l.slug as listing_slug
      FROM validation_requests vr
      JOIN listings l ON vr.listing_id = l.id
      WHERE vr.id = ? AND vr.requester_id = ?
    `).bind(id, userId).first();

    if (!validation) {
      return new Response(JSON.stringify({ 
        error: 'Validation request not found' 
      }), { status: 404 });
    }

    // Parse AI analysis if available
    let analysis = null;
    if (validation.ai_analysis) {
      try {
        analysis = JSON.parse(validation.ai_analysis);
      } catch (e) {
        console.error('Error parsing AI analysis:', e);
      }
    }

    return new Response(JSON.stringify({
      validation: {
        ...validation,
        analysis
      }
    }));

  } catch (error) {
    console.error('Error fetching validation request:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch validation request' 
    }), { status: 500 });
  }
}
