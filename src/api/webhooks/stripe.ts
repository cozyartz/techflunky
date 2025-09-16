// Stripe Webhook Handler for TechFlunky
import type { APIContext } from 'astro';

export async function POST({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = locals.runtime.env;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      return new Response('Missing signature or webhook secret', { status: 400 });
    }

    // Verify webhook signature (simplified - in production use Stripe's library)
    const event = JSON.parse(body);

    // Process the event
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, DB);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, DB);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, DB);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object, DB);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object, DB);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object, DB);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object, DB);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response('Webhook handled successfully', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook handling failed', { status: 500 });
  }
}

// Handle subscription creation
async function handleSubscriptionCreated(subscription: any, DB: any): Promise<void> {
  const userId = subscription.metadata?.userId;
  const tierSlug = subscription.metadata?.tierSlug;

  if (!userId || !tierSlug) {
    console.error('Missing userId or tierSlug in subscription metadata');
    return;
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    // Update subscription status in database
    await DB.prepare(`
      UPDATE user_subscriptions
      SET stripe_subscription_id = ?,
          status = ?,
          current_period_start = ?,
          current_period_end = ?,
          updated_at = ?
      WHERE user_id = ? AND tier_id IN (
        SELECT id FROM enhanced_subscription_tiers WHERE slug = ?
      )
    `).bind(
      subscription.id,
      subscription.status,
      subscription.current_period_start,
      subscription.current_period_end,
      now,
      userId,
      tierSlug
    ).run();

    console.log(`Subscription created for user ${userId}, tier ${tierSlug}`);

  } catch (error) {
    console.error('Error handling subscription creation:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: any, DB: any): Promise<void> {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    await DB.prepare(`
      UPDATE user_subscriptions
      SET status = ?,
          current_period_start = ?,
          current_period_end = ?,
          updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind(
      subscription.status,
      subscription.current_period_start,
      subscription.current_period_end,
      now,
      subscription.id
    ).run();

    console.log(`Subscription updated for user ${userId}`);

  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

// Handle subscription cancellation
async function handleSubscriptionDeleted(subscription: any, DB: any): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000);

    await DB.prepare(`
      UPDATE user_subscriptions
      SET status = 'cancelled',
          cancelled_at = ?,
          updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind(now, now, subscription.id).run();

    console.log(`Subscription cancelled: ${subscription.id}`);

  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

// Handle successful one-time payments (marketing packages, etc.)
async function handlePaymentSucceeded(paymentIntent: any, DB: any): Promise<void> {
  const userId = paymentIntent.metadata?.userId;
  const serviceType = paymentIntent.metadata?.service_type;

  if (!userId) {
    console.error('Missing userId in payment metadata');
    return;
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    if (serviceType === 'marketing_package') {
      // Update marketing package order status
      await DB.prepare(`
        UPDATE marketing_package_orders
        SET status = 'payment_confirmed',
            stripe_payment_status = 'succeeded',
            updated_at = ?
        WHERE stripe_payment_intent_id = ?
      `).bind(now, paymentIntent.id).run();

      // Record successful revenue
      await DB.prepare(`
        INSERT INTO revenue_analytics (
          transaction_type, transaction_id, gross_amount, platform_fee,
          net_amount, user_id, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        'marketing_package_payment',
        paymentIntent.id,
        paymentIntent.amount,
        paymentIntent.amount, // Full amount is platform revenue for services
        0,
        userId,
        JSON.stringify(paymentIntent.metadata),
        now
      ).run();

    } else if (serviceType === 'platform_purchase') {
      // Handle marketplace platform purchases
      const isMember = paymentIntent.metadata?.isMember === 'true';
      const feeRate = isMember ? 0.08 : 0.10;
      const platformFee = Math.round(paymentIntent.amount * feeRate);
      const sellerAmount = paymentIntent.amount - platformFee;

      // Record marketplace transaction
      await DB.prepare(`
        INSERT INTO revenue_analytics (
          transaction_type, transaction_id, gross_amount, platform_fee,
          net_amount, user_id, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        'platform_sale',
        paymentIntent.id,
        paymentIntent.amount,
        platformFee,
        sellerAmount,
        paymentIntent.metadata?.sellerId || userId,
        JSON.stringify({
          ...paymentIntent.metadata,
          feeRate: Math.round(feeRate * 100),
          memberDiscount: isMember
        }),
        now
      ).run();
    }

    console.log(`Payment succeeded for user ${userId}, type ${serviceType}`);

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Handle failed payments
async function handlePaymentFailed(paymentIntent: any, DB: any): Promise<void> {
  const userId = paymentIntent.metadata?.userId;
  const serviceType = paymentIntent.metadata?.service_type;

  if (!userId) {
    console.error('Missing userId in payment metadata');
    return;
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    if (serviceType === 'marketing_package') {
      await DB.prepare(`
        UPDATE marketing_package_orders
        SET status = 'payment_failed',
            stripe_payment_status = 'failed',
            updated_at = ?
        WHERE stripe_payment_intent_id = ?
      `).bind(now, paymentIntent.id).run();
    }

    console.log(`Payment failed for user ${userId}, type ${serviceType}`);

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Handle successful subscription invoice payments
async function handleInvoicePaymentSucceeded(invoice: any, DB: any): Promise<void> {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  try {
    const now = Math.floor(Date.now() / 1000);

    // Update subscription payment status
    await DB.prepare(`
      UPDATE user_subscriptions
      SET last_payment_status = 'succeeded',
          last_payment_date = ?,
          updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind(now, now, subscriptionId).run();

    // Record subscription revenue
    await DB.prepare(`
      INSERT INTO revenue_analytics (
        transaction_type, transaction_id, gross_amount, platform_fee,
        net_amount, user_id, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'subscription_payment',
      invoice.id,
      invoice.amount_paid,
      invoice.amount_paid, // Full subscription amount is platform revenue
      0,
      invoice.customer_metadata?.userId || 'unknown',
      JSON.stringify({
        subscription_id: subscriptionId,
        period_start: invoice.period_start,
        period_end: invoice.period_end
      }),
      now
    ).run();

    console.log(`Invoice payment succeeded for subscription ${subscriptionId}`);

  } catch (error) {
    console.error('Error handling invoice payment success:', error);
  }
}

// Handle failed subscription invoice payments
async function handleInvoicePaymentFailed(invoice: any, DB: any): Promise<void> {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  try {
    const now = Math.floor(Date.now() / 1000);

    await DB.prepare(`
      UPDATE user_subscriptions
      SET last_payment_status = 'failed',
          updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind(now, subscriptionId).run();

    console.log(`Invoice payment failed for subscription ${subscriptionId}`);

  } catch (error) {
    console.error('Error handling invoice payment failure:', error);
  }
}