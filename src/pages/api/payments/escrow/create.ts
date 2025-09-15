import type { APIRoute } from 'astro';
import { StripeEscrowService } from '../../../../lib/payments/stripe-escrow';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const {
      platformId,
      buyerId,
      sellerId,
      amount,
      currency = 'usd',
      description,
      metadata = {}
    } = await request.json();

    // Validate required fields
    if (!platformId || !buyerId || !sellerId || !amount) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: platformId, buyerId, sellerId, amount'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate amount (minimum $100)
    if (amount < 10000) { // $100 in cents
      return new Response(JSON.stringify({
        success: false,
        error: 'Minimum transaction amount is $100'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Stripe escrow service
    const escrowService = new StripeEscrowService(
      locals.runtime.env.STRIPE_SECRET_KEY,
      locals.runtime.env.STRIPE_WEBHOOK_SECRET
    );

    // Verify platform exists and is available for purchase
    const platform = await getPlatformDetails(platformId, locals.runtime.env);
    if (!platform) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Platform not found or not available for purchase'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify seller owns the platform
    if (platform.sellerId !== sellerId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid seller for this platform'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create escrow transaction
    const { paymentIntent, escrowTransaction } = await escrowService.createEscrowTransaction({
      platformId,
      buyerId,
      sellerId,
      amount,
      currency,
      description: description || `Purchase of ${platform.title}`,
      metadata: {
        platform_title: platform.title,
        platform_category: platform.category,
        buyer_email: await getBuyerEmail(buyerId, locals.runtime.env),
        seller_email: await getSellerEmail(sellerId, locals.runtime.env),
        ...metadata
      }
    });

    // Save escrow transaction to database
    await saveEscrowTransaction(escrowTransaction, locals.runtime.env);

    // Log transaction for analytics
    await logEscrowTransaction({
      escrowTransactionId: escrowTransaction.id,
      platformId,
      amount,
      buyerId,
      sellerId,
      event: 'escrow_created',
      timestamp: new Date().toISOString()
    }, locals.runtime.env);

    return new Response(JSON.stringify({
      success: true,
      data: {
        escrowTransactionId: escrowTransaction.id,
        clientSecret: paymentIntent.client_secret,
        amount: escrowTransaction.amount,
        currency: escrowTransaction.currency,
        platformFee: Math.round(amount * 0.08),
        sellerAmount: amount - Math.round(amount * 0.08),
        holdUntil: escrowTransaction.holdUntil,
        releaseConditions: escrowTransaction.releaseConditions
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Escrow creation error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create escrow transaction'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function getPlatformDetails(platformId: string, env: any) {
  const result = await env.DB.prepare(`
    SELECT
      id, title, description, price, seller_id as sellerId,
      category, status, created_at
    FROM platforms
    WHERE id = ? AND status = 'active'
  `).bind(platformId).first();

  return result;
}

async function getBuyerEmail(buyerId: string, env: any): Promise<string> {
  const result = await env.DB.prepare(`
    SELECT email FROM users WHERE id = ?
  `).bind(buyerId).first();

  return result?.email || '';
}

async function getSellerEmail(sellerId: string, env: any): Promise<string> {
  const result = await env.DB.prepare(`
    SELECT email FROM users WHERE id = ?
  `).bind(sellerId).first();

  return result?.email || '';
}

async function saveEscrowTransaction(escrowTransaction: any, env: any): Promise<void> {
  const stmt = env.DB.prepare(`
    INSERT INTO escrow_transactions (
      id, platform_id, buyer_id, seller_id, amount, currency,
      status, payment_intent_id, hold_until, release_conditions,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    escrowTransaction.id,
    escrowTransaction.platformId,
    escrowTransaction.buyerId,
    escrowTransaction.sellerId,
    escrowTransaction.amount,
    escrowTransaction.currency,
    escrowTransaction.status,
    escrowTransaction.paymentIntentId,
    escrowTransaction.holdUntil.toISOString(),
    JSON.stringify(escrowTransaction.releaseConditions),
    escrowTransaction.createdAt.toISOString(),
    escrowTransaction.updatedAt.toISOString()
  ).run();
}

async function logEscrowTransaction(data: any, env: any): Promise<void> {
  // Log to analytics database
  const stmt = env.DB.prepare(`
    INSERT INTO escrow_analytics (
      escrow_transaction_id, platform_id, amount, buyer_id,
      seller_id, event, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    data.escrowTransactionId,
    data.platformId,
    data.amount,
    data.buyerId,
    data.sellerId,
    data.event,
    data.timestamp
  ).run();

  // Send to analytics queue
  await env.ANALYTICS_QUEUE.send({
    event: 'escrow_transaction',
    properties: data
  });
}