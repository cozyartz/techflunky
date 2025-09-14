// Premium Services Management System
import type { APIContext } from 'astro';

// Premium service configurations
const PREMIUM_SERVICES = {
  // White-label portal tiers
  whiteLabelPortal: {
    basic: {
      name: 'Basic White-Label',
      price: 49900, // $499/month
      features: ['custom_branding', 'custom_domain', 'basic_analytics', 'email_support'],
      limits: { users: 100, customization: 'basic' }
    },
    premium: {
      name: 'Premium White-Label',
      price: 79900, // $799/month
      features: ['custom_branding', 'custom_domain', 'advanced_analytics', 'priority_support', 'custom_features'],
      limits: { users: 500, customization: 'advanced' }
    },
    enterprise: {
      name: 'Enterprise White-Label',
      price: 99900, // $999/month
      features: ['full_customization', 'dedicated_infrastructure', 'advanced_analytics', 'dedicated_support', 'sla'],
      limits: { users: -1, customization: 'unlimited' }
    }
  },

  // Support tiers
  prioritySupport: {
    standard: {
      name: 'Priority Support',
      price: 9900, // $99/month
      features: ['priority_queue', '24h_response', 'email_chat_support', 'technical_guidance'],
      sla: '24_hours'
    }
  },

  // Custom integration services
  customIntegrations: {
    standard: {
      name: 'Custom Integrations',
      setupFee: 249900, // $2,499 setup
      monthlyFee: 29900, // $299/month
      features: ['custom_api_development', 'integration_maintenance', 'technical_support', 'documentation'],
      includes: ['initial_development', 'testing', 'deployment', 'ongoing_support']
    }
  },

  // Professional services
  professionalServices: {
    customAIReport: {
      name: 'Custom AI Market Report',
      price: 9900, // $99 per report
      deliveryTime: '3-5 business days',
      includes: ['market_analysis', 'competitive_intelligence', 'trend_prediction', 'actionable_insights']
    },
    dueDiligenceService: {
      name: 'AI Due Diligence Service',
      price: 49900, // $499 per deal
      deliveryTime: '5-7 business days',
      includes: ['technical_validation', 'market_fit_analysis', 'risk_assessment', 'investment_recommendation']
    },
    marketIntelligence: {
      name: 'Market Intelligence Consulting',
      price: 19900, // $199/hour
      minimum: 2, // 2-hour minimum
      includes: ['expert_consultation', 'custom_research', 'strategic_recommendations', 'follow_up_support']
    }
  }
};

// Subscribe to premium service
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      userId,
      serviceType,
      serviceTier,
      billingCycle = 'monthly',
      customizations = {},
      paymentMethodId
    } = await request.json();

    if (!userId || !serviceType || !serviceTier) {
      return new Response(JSON.stringify({
        error: 'User ID, service type, and service tier are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate service and tier
    if (!PREMIUM_SERVICES[serviceType] || !PREMIUM_SERVICES[serviceType][serviceTier]) {
      return new Response(JSON.stringify({
        error: 'Invalid service type or tier'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const serviceConfig = PREMIUM_SERVICES[serviceType][serviceTier];
    const now = Math.floor(Date.now() / 1000);
    const subscriptionId = generateServiceSubscriptionId();

    // Calculate billing
    let totalPrice = serviceConfig.price;
    let setupFee = serviceConfig.setupFee || 0;
    const nextBilling = now + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60;

    // Create premium service subscription
    await DB.prepare(`
      INSERT INTO premium_service_subscriptions (
        id, user_id, service_type, service_tier, service_config,
        total_price, setup_fee, billing_cycle, next_billing_date,
        customizations, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(
      subscriptionId,
      userId,
      serviceType,
      serviceTier,
      JSON.stringify(serviceConfig),
      totalPrice,
      setupFee,
      billingCycle,
      nextBilling,
      JSON.stringify(customizations),
      now,
      now
    ).run();

    // Record revenue (setup fee + first month/year)
    const initialRevenue = setupFee + totalPrice;
    if (initialRevenue > 0) {
      await DB.prepare(`
        INSERT INTO revenue_analytics (
          transaction_type, transaction_id, gross_amount, platform_fee,
          net_amount, user_id, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        `${serviceType}_service`,
        subscriptionId,
        initialRevenue,
        initialRevenue, // Full amount is platform revenue for services
        0, // Net amount to user is 0 for service subscriptions
        userId,
        JSON.stringify({
          serviceType,
          serviceTier,
          billingCycle,
          setupFee,
          recurringFee: totalPrice
        }),
        now
      ).run();
    }

    return new Response(JSON.stringify({
      success: true,
      subscription: {
        id: subscriptionId,
        serviceType,
        serviceTier,
        serviceConfig,
        totalPrice,
        setupFee,
        billingCycle,
        nextBilling: new Date(nextBilling * 1000).toISOString(),
        status: 'active'
      },
      message: `${serviceConfig.name} subscription created successfully`,
      initialCharge: initialRevenue
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating premium service subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to create premium service subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get user's premium services
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');
  const serviceType = url.searchParams.get('serviceType');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let query = `
      SELECT * FROM premium_service_subscriptions
      WHERE user_id = ? AND status = 'active'
    `;
    let params = [userId];

    if (serviceType) {
      query += ' AND service_type = ?';
      params.push(serviceType);
    }

    query += ' ORDER BY created_at DESC';

    const subscriptions = await DB.prepare(query).bind(...params).all();

    const activeServices = subscriptions.map(sub => ({
      ...sub,
      service_config: JSON.parse(sub.service_config),
      customizations: JSON.parse(sub.customizations || '{}'),
      next_billing_formatted: new Date(sub.next_billing_date * 1000).toLocaleDateString(),
      total_price_formatted: `$${(sub.total_price / 100).toLocaleString()}`
    }));

    return new Response(JSON.stringify({
      activeServices,
      availableServices: PREMIUM_SERVICES,
      totalMonthlySpend: activeServices.reduce((sum, service) =>
        sum + (service.billing_cycle === 'monthly' ? service.total_price : service.total_price / 12), 0) / 100
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting premium services:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve premium services' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Request professional service (one-time)
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      userId,
      serviceType,
      requirements = {},
      urgency = 'standard',
      additionalNotes
    } = await request.json();

    if (!userId || !serviceType) {
      return new Response(JSON.stringify({
        error: 'User ID and service type are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate professional service
    if (!PREMIUM_SERVICES.professionalServices[serviceType]) {
      return new Response(JSON.stringify({
        error: 'Invalid professional service type'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const serviceConfig = PREMIUM_SERVICES.professionalServices[serviceType];
    const now = Math.floor(Date.now() / 1000);
    const requestId = generateServiceRequestId();

    // Calculate pricing (add rush fee if urgent)
    let totalPrice = serviceConfig.price;
    if (urgency === 'urgent') {
      totalPrice = Math.round(totalPrice * 1.5); // 50% rush fee
    }

    // For hourly services, apply minimum
    if (serviceConfig.minimum) {
      const hours = requirements.estimatedHours || serviceConfig.minimum;
      totalPrice = totalPrice * Math.max(hours, serviceConfig.minimum);
    }

    // Create professional service request
    await DB.prepare(`
      INSERT INTO professional_service_requests (
        id, user_id, service_type, service_config, requirements,
        total_price, urgency, additional_notes, status,
        estimated_delivery, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).bind(
      requestId,
      userId,
      serviceType,
      JSON.stringify(serviceConfig),
      JSON.stringify(requirements),
      totalPrice,
      urgency,
      additionalNotes || null,
      calculateDeliveryDate(serviceConfig.deliveryTime, urgency),
      now,
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      serviceRequest: {
        id: requestId,
        serviceType,
        serviceConfig,
        totalPrice,
        urgency,
        status: 'pending',
        estimatedDelivery: calculateDeliveryDate(serviceConfig.deliveryTime, urgency),
        totalPriceFormatted: `$${(totalPrice / 100).toLocaleString()}`
      },
      message: 'Professional service request submitted successfully',
      nextSteps: [
        'Our team will review your request within 2 hours',
        'You will receive a detailed proposal and timeline',
        'Work begins immediately upon approval and payment'
      ]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating professional service request:', error);
    return new Response(JSON.stringify({ error: 'Failed to create professional service request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cancel premium service
export async function DELETE({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      subscriptionId,
      userId,
      reason = 'user_request',
      immediate = false
    } = await request.json();

    if (!subscriptionId || !userId) {
      return new Response(JSON.stringify({
        error: 'Subscription ID and User ID are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Verify ownership and get subscription details
    const subscription = await DB.prepare(`
      SELECT * FROM premium_service_subscriptions
      WHERE id = ? AND user_id = ? AND status = 'active'
    `).bind(subscriptionId, userId).first();

    if (!subscription) {
      return new Response(JSON.stringify({
        error: 'Subscription not found or already cancelled'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cancel subscription
    const cancelDate = immediate ? now : subscription.next_billing_date;
    const newStatus = immediate ? 'cancelled' : 'cancel_at_period_end';

    await DB.prepare(`
      UPDATE premium_service_subscriptions SET
        status = ?,
        cancellation_reason = ?,
        cancelled_at = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(newStatus, reason, cancelDate, now, subscriptionId).run();

    return new Response(JSON.stringify({
      success: true,
      subscriptionId,
      newStatus,
      cancelDate: new Date(cancelDate * 1000).toISOString(),
      message: immediate
        ? 'Service cancelled immediately'
        : 'Service will be cancelled at the end of current billing period',
      refundEligible: immediate && (now - subscription.created_at) < (7 * 24 * 60 * 60) // 7-day refund window
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error cancelling premium service:', error);
    return new Response(JSON.stringify({ error: 'Failed to cancel premium service' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper functions
function generateServiceSubscriptionId(): string {
  return `psub_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}

function generateServiceRequestId(): string {
  return `preq_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}

function calculateDeliveryDate(deliveryTime: string, urgency: string): number {
  const now = Date.now() / 1000;
  let days = 7; // default

  if (deliveryTime.includes('3-5')) days = urgency === 'urgent' ? 2 : 4;
  else if (deliveryTime.includes('5-7')) days = urgency === 'urgent' ? 3 : 6;
  else if (deliveryTime.includes('7-10')) days = urgency === 'urgent' ? 5 : 8;

  return now + (days * 24 * 60 * 60);
}

// Export service configurations
export { PREMIUM_SERVICES };