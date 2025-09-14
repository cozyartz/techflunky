// Premium Subscription Tiers System
import type { APIContext } from 'astro';

const DEFAULT_TIERS = [
  {
    name: 'Pro Seller',
    slug: 'pro-seller',
    priceMonthly: 19900, // $199/month
    priceYearly: 199000, // $1,990/year (save $398)
    features: [
      'Unlimited business idea listings',
      'Advanced analytics dashboard',
      'Priority customer support',
      'Featured listing placement',
      'AI-powered market insights',
      'Reduced platform fees (12% vs 15%)',
      'Export capabilities',
      'Custom branding options'
    ],
    limits: {
      listings: null, // unlimited
      ai_validations: 10,
      expert_consultations: 2,
      market_reports: 5,
      api_calls: 10000
    },
    aiFeatures: {
      advanced_matching: true,
      market_predictions: true,
      competitor_analysis: true,
      pricing_optimization: true,
      trend_alerts: true
    },
    priorityLevel: 2
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    priceMonthly: 89900, // $899/month
    priceYearly: 899000, // $8,990/year (save $1,798)
    features: [
      'Everything in Pro Seller',
      'White-label platform access',
      'Custom domain support',
      'API access with higher limits',
      'Dedicated account manager',
      'Custom integrations',
      'Advanced reporting suite',
      'Team collaboration tools',
      'Priority expert matching',
      'Custom contract terms',
      'Bulk operations',
      'Advanced security features'
    ],
    limits: {
      listings: null, // unlimited
      ai_validations: 100,
      expert_consultations: 10,
      market_reports: 50,
      api_calls: 100000,
      team_members: 25
    },
    aiFeatures: {
      advanced_matching: true,
      market_predictions: true,
      competitor_analysis: true,
      pricing_optimization: true,
      trend_alerts: true,
      custom_ai_models: true,
      predictive_analytics: true,
      market_forecasting: true
    },
    priorityLevel: 5
  },
  {
    name: 'Investor Access',
    slug: 'investor-access',
    priceMonthly: 49900, // $499/month
    priceYearly: 499000, // $4,990/year (save $998)
    features: [
      'Access to vetted deal flow',
      'Advanced filtering and search',
      'Due diligence tools',
      'Portfolio tracking',
      'Startup analytics dashboard',
      'Direct founder communication',
      'Investment tracking',
      'Market intelligence reports',
      'Early access to top deals',
      'Investor network access'
    ],
    limits: {
      deal_flow_access: null, // unlimited
      due_diligence_reports: 20,
      portfolio_tracking: 100,
      market_reports: 25,
      founder_messages: 500
    },
    aiFeatures: {
      deal_scoring: true,
      risk_assessment: true,
      market_analysis: true,
      founder_matching: true,
      portfolio_optimization: true
    },
    priorityLevel: 4
  }
];

// Get all subscription tiers
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');

  try {
    // Initialize tiers if not exist
    await initializeTiers(DB);

    const tiers = await DB.prepare(`
      SELECT * FROM enhanced_subscription_tiers WHERE is_active = 1 ORDER BY price_monthly
    `).all();

    // Get user's current subscription if userId provided
    let userSubscription = null;
    if (userId) {
      userSubscription = await DB.prepare(`
        SELECT us.*, est.name as tier_name, est.slug as tier_slug
        FROM user_subscriptions us
        JOIN enhanced_subscription_tiers est ON us.tier_id = est.id
        WHERE us.user_id = ? AND us.status = 'active'
        ORDER BY us.current_period_end DESC LIMIT 1
      `).bind(userId).first();
    }

    return new Response(JSON.stringify({
      tiers: tiers.map(tier => ({
        ...tier,
        features: JSON.parse(tier.features || '[]'),
        limits: JSON.parse(tier.limits || '{}'),
        aiFeatures: JSON.parse(tier.ai_features || '{}'),
        formattedPriceMonthly: `$${(tier.price_monthly / 100).toLocaleString()}`,
        formattedPriceYearly: `$${(tier.price_yearly / 100).toLocaleString()}`,
        yearlyDiscount: Math.round((1 - (tier.price_yearly / 12) / tier.price_monthly) * 100)
      })),
      userSubscription: userSubscription ? {
        ...userSubscription,
        currentPeriodStart: new Date(userSubscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(userSubscription.current_period_end * 1000).toISOString(),
        trialEnd: userSubscription.trial_end ? new Date(userSubscription.trial_end * 1000).toISOString() : null
      } : null
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting subscription tiers:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve subscription tiers' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Subscribe to a tier
export async function POST({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY } = locals.runtime.env;

  try {
    const { userId, tierId, billingCycle = 'monthly', trialDays = 0 } = await request.json();

    if (!userId || !tierId) {
      return new Response(JSON.stringify({
        error: 'User ID and tier ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get tier details
    const tier = await DB.prepare(`
      SELECT * FROM enhanced_subscription_tiers WHERE id = ? AND is_active = 1
    `).bind(tierId).first();

    if (!tier) {
      return new Response(JSON.stringify({ error: 'Subscription tier not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await DB.prepare(`
      SELECT * FROM user_subscriptions WHERE user_id = ? AND status = 'active'
    `).bind(userId).first();

    if (existingSubscription) {
      return new Response(JSON.stringify({
        error: 'User already has an active subscription',
        currentSubscription: existingSubscription
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const price = billingCycle === 'yearly' ? tier.price_yearly : tier.price_monthly;
    const periodLength = billingCycle === 'yearly' ? 365 * 24 * 60 * 60 : 30 * 24 * 60 * 60;

    // Calculate subscription periods
    const trialEndTime = trialDays > 0 ? now + (trialDays * 24 * 60 * 60) : null;
    const periodStart = trialEndTime || now;
    const periodEnd = periodStart + periodLength;

    // Create Stripe subscription
    const stripeSubscription = await createStripeSubscription(
      userId,
      tier.slug,
      billingCycle,
      price,
      trialDays,
      STRIPE_SECRET_KEY
    );

    // Create subscription record
    const subscriptionResult = await DB.prepare(`
      INSERT INTO user_subscriptions
      (user_id, tier_id, status, billing_cycle, current_period_start, current_period_end,
       trial_end, stripe_subscription_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      tierId,
      trialDays > 0 ? 'trialing' : 'active',
      billingCycle,
      periodStart,
      periodEnd,
      trialEndTime,
      stripeSubscription.id,
      now,
      now
    ).run();

    // Award reputation points for subscription
    await awardSubscriptionReward(DB, userId, tier.slug, billingCycle);

    return new Response(JSON.stringify({
      success: true,
      subscriptionId: subscriptionResult.meta.last_row_id,
      stripeSubscriptionId: stripeSubscription.id,
      tier: {
        name: tier.name,
        slug: tier.slug,
        price,
        formattedPrice: `$${(price / 100).toLocaleString()}`
      },
      billingCycle,
      trialDays,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update subscription
export async function PUT({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY } = locals.runtime.env;

  try {
    const { subscriptionId, userId, newTierId, billingCycle } = await request.json();

    if (!subscriptionId || !userId) {
      return new Response(JSON.stringify({
        error: 'Subscription ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify subscription ownership
    const subscription = await DB.prepare(`
      SELECT * FROM user_subscriptions WHERE id = ? AND user_id = ?
    `).bind(subscriptionId, userId).first();

    if (!subscription) {
      return new Response(JSON.stringify({
        error: 'Subscription not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const updates: any = { updated_at: now };

    if (newTierId) {
      const newTier = await DB.prepare(`
        SELECT * FROM enhanced_subscription_tiers WHERE id = ?
      `).bind(newTierId).first();

      if (!newTier) {
        return new Response(JSON.stringify({ error: 'New tier not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      updates.tier_id = newTierId;

      // Update Stripe subscription
      if (subscription.stripe_subscription_id) {
        await updateStripeSubscription(
          subscription.stripe_subscription_id,
          newTier.slug,
          billingCycle || subscription.billing_cycle,
          STRIPE_SECRET_KEY
        );
      }
    }

    if (billingCycle) {
      updates.billing_cycle = billingCycle;
    }

    // Build dynamic update query
    const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const updateValues = Object.values(updates);

    await DB.prepare(`
      UPDATE user_subscriptions SET ${updateFields} WHERE id = ? AND user_id = ?
    `).bind(...updateValues, subscriptionId, userId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription updated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cancel subscription
export async function DELETE({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY } = locals.runtime.env;

  try {
    const { subscriptionId, userId, cancelAtPeriodEnd = true } = await request.json();

    if (!subscriptionId || !userId) {
      return new Response(JSON.stringify({
        error: 'Subscription ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify subscription ownership
    const subscription = await DB.prepare(`
      SELECT * FROM user_subscriptions WHERE id = ? AND user_id = ?
    `).bind(subscriptionId, userId).first();

    if (!subscription) {
      return new Response(JSON.stringify({
        error: 'Subscription not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Cancel Stripe subscription
    if (subscription.stripe_subscription_id) {
      await cancelStripeSubscription(
        subscription.stripe_subscription_id,
        cancelAtPeriodEnd,
        STRIPE_SECRET_KEY
      );
    }

    // Update subscription status
    const newStatus = cancelAtPeriodEnd ? 'cancelled' : 'cancelled';
    await DB.prepare(`
      UPDATE user_subscriptions
      SET status = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).bind(newStatus, now, subscriptionId, userId).run();

    return new Response(JSON.stringify({
      success: true,
      message: cancelAtPeriodEnd
        ? 'Subscription will be cancelled at the end of the current period'
        : 'Subscription cancelled immediately',
      cancelAtPeriodEnd
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to cancel subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function initializeTiers(DB: any) {
  for (const tier of DEFAULT_TIERS) {
    await DB.prepare(`
      INSERT OR IGNORE INTO enhanced_subscription_tiers
      (name, slug, price_monthly, price_yearly, features, limits, ai_features,
       priority_level, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      tier.name,
      tier.slug,
      tier.priceMonthly,
      tier.priceYearly,
      JSON.stringify(tier.features),
      JSON.stringify(tier.limits),
      JSON.stringify(tier.aiFeatures),
      tier.priorityLevel,
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000)
    ).run();
  }
}

async function createStripeSubscription(
  userId: string,
  tierSlug: string,
  billingCycle: string,
  price: number,
  trialDays: number,
  stripeSecretKey: string
) {
  if (!stripeSecretKey) {
    // Return mock subscription for development
    return {
      id: `sub_mock_${Date.now()}`,
      status: trialDays > 0 ? 'trialing' : 'active'
    };
  }

  const params = new URLSearchParams({
    'customer': `cus_${userId}`, // In production, create/retrieve actual Stripe customer
    'items[0][price_data][currency]': 'usd',
    'items[0][price_data][product_data][name]': `TechFlunky ${tierSlug}`,
    'items[0][price_data][unit_amount]': price.toString(),
    'items[0][price_data][recurring][interval]': billingCycle === 'yearly' ? 'year' : 'month',
    'metadata[userId]': userId,
    'metadata[tierSlug]': tierSlug
  });

  if (trialDays > 0) {
    params.append('trial_period_days', trialDays.toString());
  }

  const response = await fetch('https://api.stripe.com/v1/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    throw new Error('Failed to create Stripe subscription');
  }

  return await response.json();
}

async function updateStripeSubscription(
  subscriptionId: string,
  newTierSlug: string,
  billingCycle: string,
  stripeSecretKey: string
) {
  if (!stripeSecretKey) return; // Mock for development

  // In production, update the Stripe subscription
  // This is a simplified version - actual implementation would handle price changes, prorations, etc.
}

async function cancelStripeSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean,
  stripeSecretKey: string
) {
  if (!stripeSecretKey) return; // Mock for development

  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      'cancel_at_period_end': cancelAtPeriodEnd.toString()
    })
  });

  if (!response.ok) {
    throw new Error('Failed to cancel Stripe subscription');
  }

  return await response.json();
}

async function awardSubscriptionReward(DB: any, userId: string, tierSlug: string, billingCycle: string) {
  const pointsMap = {
    'pro-seller': { monthly: 500, yearly: 2000 },
    'enterprise': { monthly: 2000, yearly: 8000 },
    'investor-access': { monthly: 1000, yearly: 4000 }
  };

  const points = pointsMap[tierSlug as keyof typeof pointsMap]?.[billingCycle as keyof typeof pointsMap[typeof tierSlug]] || 500;

  await fetch('/api/gamification/reputation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      action: 'subscription_created',
      data: { tierSlug, billingCycle, pointsAwarded: points }
    })
  });
}