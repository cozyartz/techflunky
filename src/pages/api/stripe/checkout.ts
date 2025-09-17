// Production Stripe Checkout API
import type { APIContext } from 'astro';

export async function POST({ request, locals }: APIContext) {
  try {
    const body = await request.json();
    const {
      platformId,
      platformName,
      price,
      description,
      sellerId,
      buyerId
    } = body;

    // Validate required fields
    if (!platformId || !platformName || !price || !sellerId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: platformId, platformName, price, sellerId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Environment-aware Stripe key selection
    const isProduction = process.env.NODE_ENV === 'production';

    // For production: use AUTIMIND_STRIPE_KEY (secret) from Cloudflare secrets
    // For development: use test keys from environment
    const STRIPE_SECRET_KEY = isProduction
      ? locals.runtime?.env?.AUTIMIND_STRIPE_KEY
      : (locals.runtime?.env?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY);

    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Stripe configuration not found'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });

    // Calculate TechFlunky's 8% platform fee
    const platformFeeAmount = Math.round(price * 0.08);
    const sellerAmount = price - platformFeeAmount;

    // Create Stripe checkout session
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: platformName,
            description: description || `Complete business platform: ${platformName}`,
            metadata: {
              platform_id: platformId,
              seller_id: sellerId,
              buyer_id: buyerId || 'guest'
            }
          },
          unit_amount: price // Price in cents
        },
        quantity: 1
      }],
      mode: 'payment',

      // Platform fee configuration (8% to TechFlunky)
      payment_intent_data: {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: sellerId // Seller's Stripe Connect account
        },
        metadata: {
          platform_id: platformId,
          seller_id: sellerId,
          buyer_id: buyerId || 'guest',
          platform_fee: platformFeeAmount.toString(),
          seller_amount: sellerAmount.toString()
        }
      },

      // Success/cancel URLs
      success_url: `${process.env.SITE_URL || 'https://techflunky.com'}/purchase/success?session_id={CHECKOUT_SESSION_ID}&platform_id=${platformId}`,
      cancel_url: `${process.env.SITE_URL || 'https://techflunky.com'}/browse?cancelled=true`,

      // Customer information
      customer_email: buyerId ? undefined : undefined, // Will be collected during checkout

      // Additional options
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: true
      },
      tax_id_collection: {
        enabled: true
      },

      // Metadata for tracking
      metadata: {
        platform_id: platformId,
        seller_id: sellerId,
        buyer_id: buyerId || 'guest',
        platform_name: platformName,
        created_by: 'techflunky_marketplace'
      }
    });

    // Store session info in database if available
    const DB = locals.runtime?.env?.DB;
    if (DB) {
      try {
        await DB.prepare(`
          INSERT INTO purchase_sessions (
            id, session_id, platform_id, seller_id, buyer_id,
            amount, platform_fee, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          session.id,
          platformId,
          sellerId,
          buyerId || null,
          price,
          platformFeeAmount,
          'pending',
          Date.now()
        ).run();
      } catch (dbError) {
        console.warn('Failed to store purchase session:', dbError);
        // Continue anyway - checkout can still proceed
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
        platformFee: platformFeeAmount,
        sellerAmount: sellerAmount,
        totalAmount: price
      },
      message: 'Checkout session created successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create checkout session',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}