// Stripe Webhook Handler
import type { APIContext } from 'astro';

export async function POST({ request, locals }: APIContext) {
  try {
    const sig = request.headers.get('stripe-signature');
    const body = await request.text();

    if (!sig) {
      return new Response('Missing Stripe signature', { status: 400 });
    }

    // Environment-aware configuration
    const isProduction = process.env.NODE_ENV === 'production';
    const STRIPE_SECRET_KEY = isProduction
      ? locals.runtime?.env?.AUTIMIND_STRIPE_KEY
      : (locals.runtime?.env?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY);

    const WEBHOOK_SECRET = isProduction
      ? locals.runtime?.env?.STRIPE_WEBHOOK_SECRET_LIVE
      : (locals.runtime?.env?.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET);

    if (!STRIPE_SECRET_KEY || !WEBHOOK_SECRET) {
      return new Response('Stripe configuration missing', { status: 500 });
    }

    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });

    // Verify webhook signature
    let event;
    try {
      event = stripeClient.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response('Invalid signature', { status: 400 });
    }

    const DB = locals.runtime?.env?.DB;

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, DB);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object, DB);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object, DB);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object, DB);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response('Webhook received', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook error', { status: 500 });
  }
}

async function handleCheckoutCompleted(session: any, DB: any) {
  console.log('Checkout completed:', session.id);

  if (DB) {
    try {
      // Update purchase session status
      await DB.prepare(`
        UPDATE purchase_sessions
        SET status = 'completed', completed_at = ?
        WHERE session_id = ?
      `).bind(Date.now(), session.id).run();

      // Create purchase record
      const metadata = session.metadata || {};
      await DB.prepare(`
        INSERT INTO purchases (
          id, session_id, platform_id, seller_id, buyer_id,
          amount, platform_fee, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        session.id,
        metadata.platform_id,
        metadata.seller_id,
        metadata.buyer_id || null,
        session.amount_total,
        parseInt(metadata.platform_fee || '0'),
        'completed',
        Date.now()
      ).run();

      // Update platform sales stats
      if (metadata.platform_id) {
        await DB.prepare(`
          UPDATE business_blueprints
          SET sales_count = COALESCE(sales_count, 0) + 1,
              total_revenue = COALESCE(total_revenue, 0) + ?
          WHERE id = ?
        `).bind(session.amount_total, metadata.platform_id).run();
      }

    } catch (error) {
      console.error('Database update failed:', error);
    }
  }
}

async function handlePaymentSucceeded(paymentIntent: any, DB: any) {
  console.log('Payment succeeded:', paymentIntent.id);

  if (DB) {
    try {
      await DB.prepare(`
        UPDATE purchases
        SET payment_status = 'succeeded', payment_intent_id = ?
        WHERE session_id IN (
          SELECT session_id FROM purchase_sessions
          WHERE session_id = ?
        )
      `).bind(paymentIntent.id, paymentIntent.metadata?.session_id).run();
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  }
}

async function handlePaymentFailed(paymentIntent: any, DB: any) {
  console.log('Payment failed:', paymentIntent.id);

  if (DB) {
    try {
      await DB.prepare(`
        UPDATE purchases
        SET payment_status = 'failed', failure_reason = ?
        WHERE payment_intent_id = ?
      `).bind(paymentIntent.last_payment_error?.message || 'Unknown error', paymentIntent.id).run();
    } catch (error) {
      console.error('Failed to update payment failure:', error);
    }
  }
}

async function handleTransferCreated(transfer: any, DB: any) {
  console.log('Transfer created:', transfer.id);

  if (DB) {
    try {
      await DB.prepare(`
        UPDATE purchases
        SET transfer_id = ?, transfer_status = 'created'
        WHERE payment_intent_id = ?
      `).bind(transfer.id, transfer.source_transaction).run();
    } catch (error) {
      console.error('Failed to update transfer:', error);
    }
  }
}