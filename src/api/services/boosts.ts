// Listing Boost/Promotion System API
import type { APIContext } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Boost pricing configuration
const BOOST_PRICING = {
  featured: { 
    price: 4900, // $49
    duration: 7, // days
    description: 'Featured in category for 7 days'
  },
  premium: { 
    price: 9900, // $99
    duration: 14, // days
    description: 'Premium placement + badge for 14 days'
  },
  homepage: { 
    price: 19900, // $199
    duration: 3, // days
    description: 'Homepage spotlight for 3 days'
  }
};

export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  
  try {
    const data = await request.json();
    const { listingId, boostType, customDuration } = data;

    // TODO: Get authenticated user
    const userId = 'temp-user-id';

    // Verify listing ownership
    const listing = await DB.prepare(
      'SELECT * FROM listings WHERE id = ? AND seller_id = ?'
    ).bind(listingId, userId).first();

    if (!listing) {
      return new Response(JSON.stringify({ 
        error: 'Listing not found or access denied' 
      }), { status: 404 });
    }

    // Validate boost type
    if (!BOOST_PRICING[boostType]) {
      return new Response(JSON.stringify({ 
        error: 'Invalid boost type' 
      }), { status: 400 });
    }

    const boostConfig = BOOST_PRICING[boostType];
    const duration = customDuration || boostConfig.duration;
    const price = customDuration ? 
      Math.ceil((boostConfig.price / boostConfig.duration) * customDuration) : 
      boostConfig.price;

    // Check for existing active boosts
    const existingBoost = await DB.prepare(`
      SELECT id FROM listing_boosts 
      WHERE listing_id = ? AND boost_type = ? AND status = 'active' AND expires_at > unixepoch()
    `).bind(listingId, boostType).first();

    if (existingBoost) {
      return new Response(JSON.stringify({ 
        error: `Listing already has an active ${boostType} boost` 
      }), { status: 400 });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price,
      currency: 'usd',
      metadata: {
        listing_id: listingId,
        boost_type: boostType,
        duration_days: duration.toString(),
        user_id: userId
      }
    });

    return new Response(JSON.stringify({
      success: true,
      boost: {
        type: boostType,
        price,
        duration,
        description: boostConfig.description
      },
      paymentIntent: {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id
      }
    }), { status: 201 });

  } catch (error) {
    console.error('Error creating boost:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create boost' 
    }), { status: 500 });
  }
}

// Activate boost after payment confirmation
export async function activateBoost(paymentIntentId: string, env: any) {
  const { DB } = env;

  try {
    // Verify payment
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment not completed');
    }

    const { 
      listing_id: listingId, 
      boost_type: boostType, 
      duration_days: duration,
      user_id: userId
    } = paymentIntent.metadata;

    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + (parseInt(duration) * 24 * 60 * 60);

    // Create boost record
    await DB.prepare(`
      INSERT INTO listing_boosts (
        listing_id, boost_type, price, duration_days, 
        status, stripe_payment_intent_id, started_at, expires_at
      ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
    `).bind(
      listingId,
      boostType,
      paymentIntent.amount,
      parseInt(duration),
      paymentIntentId,
      startTime,
      endTime
    ).run();

    // Update listing to reflect boost status
    await DB.prepare(`
      UPDATE listings 
      SET updated_at = unixepoch() 
      WHERE id = ?
    `).bind(listingId).run();

    // Create notification
    await DB.prepare(`
      INSERT INTO notifications (
        user_id, type, title, message, action_url
      ) VALUES (?, 'listing_boosted', 'Listing Boost Activated', 
                'Your listing boost is now active and will increase visibility.', 
                '/listings/${listingId}')
    `).bind(userId).run();

    // Track revenue
    await DB.prepare(`
      INSERT INTO revenue_analytics (
        transaction_type, transaction_id, gross_amount, 
        platform_fee, net_amount, user_id
      ) VALUES ('listing_boost', ?, ?, 0, ?, ?)
    `).bind(
      paymentIntentId,
      paymentIntent.amount,
      paymentIntent.amount,
      userId
    ).run();

    console.log(`Boost activated for listing ${listingId}, type: ${boostType}`);
    return { success: true };

  } catch (error) {
    console.error('Error activating boost:', error);
    throw error;
  }
}

// Get boost analytics for sellers
export async function GET({ params, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const { listingId } = params;

  try {
    // TODO: Get authenticated user and verify ownership
    const userId = 'temp-user-id';

    // Verify listing ownership
    const listing = await DB.prepare(
      'SELECT id FROM listings WHERE id = ? AND seller_id = ?'
    ).bind(listingId, userId).first();

    if (!listing) {
      return new Response(JSON.stringify({ 
        error: 'Listing not found or access denied' 
      }), { status: 404 });
    }

    // Get boost history
    const boosts = await DB.prepare(`
      SELECT * FROM listing_boosts 
      WHERE listing_id = ? 
      ORDER BY created_at DESC
    `).bind(listingId).all();

    // Get current active boosts
    const activeBoosts = await DB.prepare(`
      SELECT * FROM listing_boosts 
      WHERE listing_id = ? AND status = 'active' AND expires_at > unixepoch()
    `).bind(listingId).all();

    // Get boost performance analytics (views during boost periods)
    const boostAnalytics = await DB.prepare(`
      SELECT 
        lb.boost_type,
        lb.started_at,
        lb.expires_at,
        COUNT(a.id) as views_during_boost
      FROM listing_boosts lb
      LEFT JOIN analytics a ON (
        a.listing_id = lb.listing_id 
        AND a.event_type = 'listing_view'
        AND a.created_at >= lb.started_at 
        AND a.created_at <= lb.expires_at
      )
      WHERE lb.listing_id = ?
      GROUP BY lb.id
      ORDER BY lb.created_at DESC
    `).bind(listingId).all();

    return new Response(JSON.stringify({
      boosts: boosts.results,
      activeBoosts: activeBoosts.results,
      analytics: boostAnalytics.results,
      availableBoosts: BOOST_PRICING
    }));

  } catch (error) {
    console.error('Error fetching boost analytics:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch boost analytics' 
    }), { status: 500 });
  }
}

// Admin function to expire old boosts (run via cron)
export async function expireOldBoosts(env: any) {
  const { DB } = env;

  try {
    const currentTime = Math.floor(Date.now() / 1000);

    // Update expired boosts
    const result = await DB.prepare(`
      UPDATE listing_boosts 
      SET status = 'expired' 
      WHERE status = 'active' AND expires_at <= ?
    `).bind(currentTime).run();

    console.log(`Expired ${result.changes} boost records`);
    return { expired: result.changes };

  } catch (error) {
    console.error('Error expiring boosts:', error);
    throw error;
  }
}

// Get boosted listings for homepage/category display
export async function getBoostedListings(boostType: string = 'featured', env: any) {
  const { DB } = env;

  try {
    const currentTime = Math.floor(Date.now() / 1000);

    const listings = await DB.prepare(`
      SELECT DISTINCT l.*, u.name as seller_name, p.avatar_url, 
             lb.boost_type, lb.expires_at
      FROM listings l
      JOIN listing_boosts lb ON l.id = lb.listing_id
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE l.status = 'active' 
        AND lb.status = 'active' 
        AND lb.expires_at > ?
        AND lb.boost_type = ?
      ORDER BY lb.started_at DESC
    `).bind(currentTime, boostType).all();

    return listings.results;

  } catch (error) {
    console.error('Error fetching boosted listings:', error);
    return [];
  }
}
