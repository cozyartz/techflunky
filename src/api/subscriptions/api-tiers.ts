// API Access Tier Management System
import type { APIContext } from 'astro';

// Updated API pricing tiers with Cloudflare AI integration
const API_TIERS = {
  free: {
    name: 'Free Tier',
    price: 0,
    requests: 10000,
    aiAnalyses: 100,
    features: ['basic_listings', 'search_api', 'limited_ai'],
    rateLimit: 100, // requests per minute
    description: 'Perfect for testing and small projects'
  },
  starter: {
    name: 'Starter',
    price: 1900, // $19/month
    requests: 100000,
    aiAnalyses: 1000,
    features: ['basic_listings', 'search_api', 'ai_matching', 'basic_analytics'],
    rateLimit: 500,
    description: 'Ideal for growing applications'
  },
  pro: {
    name: 'Professional',
    price: 7900, // $79/month
    requests: 500000,
    aiAnalyses: 10000,
    features: ['all_endpoints', 'ai_matching', 'market_intelligence', 'advanced_analytics', 'webhook_support'],
    rateLimit: 1000,
    description: 'Full-featured access for professional use'
  },
  enterprise: {
    name: 'Enterprise',
    price: 19900, // $199/month
    requests: 2000000,
    aiAnalyses: -1, // Unlimited
    features: ['all_endpoints', 'unlimited_ai', 'white_label_basic', 'priority_support', 'custom_rate_limits'],
    rateLimit: 2000,
    description: 'Enterprise-grade with unlimited AI and basic white-labeling'
  }
};

// Create or update API subscription
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      userId,
      tier,
      paymentMethodId,
      billingCycle = 'monthly' // monthly or yearly
    } = await request.json();

    if (!userId || !tier) {
      return new Response(JSON.stringify({
        error: 'User ID and tier are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate tier
    if (!API_TIERS[tier]) {
      return new Response(JSON.stringify({
        error: 'Invalid API tier'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tierConfig = API_TIERS[tier];
    const now = Math.floor(Date.now() / 1000);

    // For free tier, no payment required
    if (tier === 'free') {
      await createOrUpdateSubscription(DB, userId, tier, tierConfig, null, now);

      return new Response(JSON.stringify({
        success: true,
        subscription: {
          tier,
          ...tierConfig,
          status: 'active',
          nextBilling: null
        },
        message: 'Free tier activated successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For paid tiers, integrate with Stripe (simplified for now)
    const subscriptionId = generateSubscriptionId();
    const nextBilling = billingCycle === 'yearly'
      ? now + (365 * 24 * 60 * 60)
      : now + (30 * 24 * 60 * 60);

    await createOrUpdateSubscription(DB, userId, tier, tierConfig, subscriptionId, now, nextBilling);

    // Generate new API key for the tier
    const apiKey = await generateTierAPIKey(DB, userId, tier, tierConfig);

    return new Response(JSON.stringify({
      success: true,
      subscription: {
        id: subscriptionId,
        tier,
        ...tierConfig,
        status: 'active',
        nextBilling: new Date(nextBilling * 1000).toISOString(),
        billingCycle
      },
      apiKey,
      message: `${tierConfig.name} subscription activated successfully`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating API subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get user's current API subscription and usage
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');
  const includeUsage = url.searchParams.get('usage') === 'true';

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get current subscription
    const subscription = await DB.prepare(`
      SELECT * FROM api_subscriptions WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `).bind(userId).first();

    if (!subscription) {
      // Return free tier as default
      return new Response(JSON.stringify({
        subscription: {
          tier: 'free',
          ...API_TIERS.free,
          status: 'active',
          isDefault: true
        },
        availableTiers: API_TIERS
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tierConfig = API_TIERS[subscription.tier];
    let response = {
      subscription: {
        ...subscription,
        ...tierConfig,
        subscription_data: subscription.subscription_data
          ? JSON.parse(subscription.subscription_data)
          : null
      },
      availableTiers: API_TIERS
    };

    // Include usage statistics if requested
    if (includeUsage) {
      const usage = await getCurrentUsage(DB, userId);
      response = {
        ...response,
        usage
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting API subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update subscription tier
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      userId,
      newTier,
      reason = 'upgrade'
    } = await request.json();

    if (!userId || !newTier) {
      return new Response(JSON.stringify({
        error: 'User ID and new tier are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!API_TIERS[newTier]) {
      return new Response(JSON.stringify({
        error: 'Invalid API tier'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const tierConfig = API_TIERS[newTier];

    // Get current subscription
    const currentSub = await DB.prepare(`
      SELECT * FROM api_subscriptions WHERE user_id = ? AND status = 'active'
    `).bind(userId).first();

    // Deactivate current subscription
    if (currentSub) {
      await DB.prepare(`
        UPDATE api_subscriptions SET status = 'cancelled', updated_at = ? WHERE id = ?
      `).bind(now, currentSub.id).run();
    }

    // Create new subscription
    const nextBilling = newTier === 'free' ? null : now + (30 * 24 * 60 * 60);
    await createOrUpdateSubscription(DB, userId, newTier, tierConfig, null, now, nextBilling);

    // Update API key permissions
    await updateAPIKeyForTier(DB, userId, newTier, tierConfig);

    return new Response(JSON.stringify({
      success: true,
      newTier,
      tierConfig,
      previousTier: currentSub?.tier || 'free',
      reason,
      message: `Successfully ${reason}d to ${tierConfig.name}`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating API subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cancel subscription
export async function DELETE({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { userId, reason = 'user_request' } = await request.json();

    if (!userId) {
      return new Response(JSON.stringify({
        error: 'User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Cancel current subscription and revert to free tier
    await DB.prepare(`
      UPDATE api_subscriptions
      SET status = 'cancelled', cancellation_reason = ?, updated_at = ?
      WHERE user_id = ? AND status = 'active'
    `).bind(reason, now, userId).run();

    // Create free tier subscription
    await createOrUpdateSubscription(DB, userId, 'free', API_TIERS.free, null, now);

    // Update API key to free tier limits
    await updateAPIKeyForTier(DB, userId, 'free', API_TIERS.free);

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription cancelled successfully. Reverted to free tier.',
      newTier: 'free'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error cancelling API subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to cancel subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper functions
async function createOrUpdateSubscription(
  DB: any,
  userId: string,
  tier: string,
  tierConfig: any,
  subscriptionId: string | null,
  now: number,
  nextBilling: number | null = null
) {
  const subId = subscriptionId || `free_${userId}_${now}`;

  await DB.prepare(`
    INSERT INTO api_subscriptions (
      id, user_id, tier, subscription_data, status, next_billing_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
  `).bind(
    subId,
    userId,
    tier,
    JSON.stringify({
      requests: tierConfig.requests,
      aiAnalyses: tierConfig.aiAnalyses,
      features: tierConfig.features,
      rateLimit: tierConfig.rateLimit
    }),
    nextBilling,
    now,
    now
  ).run();
}

async function generateTierAPIKey(DB: any, userId: string, tier: string, tierConfig: any) {
  const apiKey = `tk_${tier}_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
  const keyHash = await hashAPIKey(apiKey);
  const now = Math.floor(Date.now() / 1000);

  await DB.prepare(`
    INSERT INTO api_keys (
      user_id, key_hash, name, permissions, rate_limit, tier, is_active, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    userId,
    keyHash,
    `${tierConfig.name} API Key`,
    JSON.stringify(tierConfig.features),
    tierConfig.rateLimit,
    tier,
    now,
    now + (365 * 24 * 60 * 60)
  ).run();

  return {
    apiKey,
    tier,
    features: tierConfig.features,
    rateLimit: tierConfig.rateLimit
  };
}

async function updateAPIKeyForTier(DB: any, userId: string, tier: string, tierConfig: any) {
  await DB.prepare(`
    UPDATE api_keys SET
      permissions = ?,
      rate_limit = ?,
      tier = ?,
      updated_at = ?
    WHERE user_id = ? AND is_active = 1
  `).bind(
    JSON.stringify(tierConfig.features),
    tierConfig.rateLimit,
    tier,
    Math.floor(Date.now() / 1000),
    userId
  ).run();
}

async function getCurrentUsage(DB: any, userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const [dailyUsage, monthlyUsage, monthlyAI] = await Promise.all([
    DB.prepare(`
      SELECT SUM(request_count) as count FROM api_usage au
      JOIN api_keys ak ON au.api_key_id = ak.id
      WHERE ak.user_id = ? AND au.usage_date = ?
    `).bind(userId, today).first(),

    DB.prepare(`
      SELECT SUM(request_count) as count FROM api_usage au
      JOIN api_keys ak ON au.api_key_id = ak.id
      WHERE ak.user_id = ? AND au.usage_date LIKE ? || '%'
    `).bind(userId, thisMonth).first(),

    DB.prepare(`
      SELECT COUNT(*) as count FROM ai_analysis_logs
      WHERE user_id = ? AND DATE(datetime(created_at, 'unixepoch')) LIKE ? || '%'
    `).bind(userId, thisMonth).first()
  ]);

  return {
    today: {
      requests: dailyUsage?.count || 0,
      aiAnalyses: 0 // Would track daily AI usage
    },
    thisMonth: {
      requests: monthlyUsage?.count || 0,
      aiAnalyses: monthlyAI?.count || 0
    }
  };
}

async function hashAPIKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSubscriptionId(): string {
  return `sub_${crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')}`;
}

// Export tier configuration for use in other modules
export { API_TIERS };