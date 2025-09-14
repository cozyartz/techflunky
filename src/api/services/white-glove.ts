// White-Glove Business Services API
import type { APIContext } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Service pricing configuration
const SERVICE_PRICING = {
  business_plan: { base: 99900, rush: 149900 }, // $999-$1499
  mvp_development: { base: 499900, rush: 749900 }, // $4999-$7499
  market_research: { base: 29900, rush: 49900 }, // $299-$499
  investor_deck: { base: 199900, rush: 299900 }, // $1999-$2999
  due_diligence: { base: 19900, rush: 29900 }, // $199-$299
  full_package: { base: 999900, rush: 1499900 } // $9999-$14999
};

export async function POST({ request, locals }: APIContext) {
  const { DB, CACHE } = locals.runtime.env;
  
  try {
    const data = await request.json();
    const { 
      serviceType, 
      title, 
      description, 
      budgetMin, 
      budgetMax, 
      timelineWeeks,
      rushDelivery = false,
      additionalRequirements = []
    } = data;

    // TODO: Get authenticated user
    const userId = 'temp-user-id'; // Replace with auth

    // Validate service type
    if (!SERVICE_PRICING[serviceType]) {
      return new Response(JSON.stringify({ 
        error: 'Invalid service type' 
      }), { status: 400 });
    }

    // Calculate quote based on service type and requirements
    const basePrice = SERVICE_PRICING[serviceType][rushDelivery ? 'rush' : 'base'];
    let finalQuote = basePrice;

    // Add complexity multipliers
    if (additionalRequirements.includes('multi_state_compliance')) finalQuote *= 1.3;
    if (additionalRequirements.includes('ai_integration')) finalQuote *= 1.2;
    if (additionalRequirements.includes('custom_branding')) finalQuote *= 1.1;

    // Create service request
    const serviceRequest = await DB.prepare(`
      INSERT INTO service_requests (
        client_id, service_type, title, description, 
        budget_min, budget_max, timeline_weeks, 
        quote_amount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'quoted')
    `).bind(
      userId,
      serviceType,
      title,
      description,
      budgetMin * 100, // Convert to cents
      budgetMax * 100,
      timelineWeeks,
      finalQuote
    ).run();

    // Create Stripe Payment Intent for quote acceptance
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalQuote,
      currency: 'usd',
      metadata: {
        service_request_id: serviceRequest.meta.last_row_id,
        service_type: serviceType,
        client_id: userId
      }
    });

    return new Response(JSON.stringify({
      success: true,
      serviceRequestId: serviceRequest.meta.last_row_id,
      quote: {
        amount: finalQuote,
        currency: 'usd',
        breakdown: {
          base: basePrice,
          multipliers: finalQuote - basePrice,
          rushDelivery
        }
      },
      paymentIntent: {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id
      },
      estimatedDelivery: rushDelivery ? 
        Math.ceil(timelineWeeks / 2) : timelineWeeks
    }), { status: 201 });

  } catch (error) {
    console.error('Error creating service request:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create service request' 
    }), { status: 500 });
  }
}

export async function GET({ params, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  
  try {
    // TODO: Get authenticated user
    const userId = 'temp-user-id';

    const requests = await DB.prepare(`
      SELECT sr.*, u.name as client_name, u.email as client_email
      FROM service_requests sr
      JOIN users u ON sr.client_id = u.id
      WHERE sr.client_id = ?
      ORDER BY sr.created_at DESC
    `).bind(userId).all();

    return new Response(JSON.stringify({
      serviceRequests: requests.results
    }));

  } catch (error) {
    console.error('Error fetching service requests:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch service requests' 
    }), { status: 500 });
  }
}

// Accept service request quote
export async function PATCH({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  
  try {
    const { serviceRequestId, paymentIntentId } = await request.json();

    // Verify payment was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return new Response(JSON.stringify({ 
        error: 'Payment not completed' 
      }), { status: 400 });
    }

    // Update service request status
    await DB.prepare(`
      UPDATE service_requests 
      SET status = 'in_progress', 
          stripe_payment_intent_id = ?,
          updated_at = unixepoch()
      WHERE id = ?
    `).bind(paymentIntentId, serviceRequestId).run();

    // TODO: Notify service team, create project in internal system
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Service request accepted. Our team will contact you within 24 hours.'
    }));

  } catch (error) {
    console.error('Error accepting service request:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to accept service request' 
    }), { status: 500 });
  }
}
