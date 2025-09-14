// Stripe webhook handler for payment events
import type { APIRoute } from 'astro';
import { stripe, handleStripeWebhook } from '../../../lib/stripe-config';

export const POST: APIRoute = async ({ request }) => {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature')!;
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout completed:', session.id);
        
        // TODO: In production, this would:
        // 1. Create purchase record in D1
        // 2. Send confirmation email to buyer
        // 3. Queue document delivery
        // 4. Notify seller of pending sale
        
        break;
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('Payment captured, awaiting review period');
        
        // Start 3-day review timer
        // TODO: Schedule job to release funds after review period
        
        break;
      }
      
      case 'charge.dispute.created': {
        const dispute = event.data.object;
        console.log('Dispute created:', dispute.id);
        
        // TODO: Notify platform admin
        // Pause any pending payouts
        // Send dispute information to seller
        
        break;
      }
      
      case 'account.updated': {
        // Seller account verification status changed
        const account = event.data.object;
        if (account.charges_enabled && account.payouts_enabled) {
          console.log('Seller verified:', account.id);
          // TODO: Update seller status in D1
        }
        break;
      }
      
      case 'payout.paid': {
        // Funds successfully sent to seller
        const payout = event.data.object;
        console.log('Payout completed:', payout.id);
        // TODO: Update transaction status in D1
        break;
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook Error', { status: 400 });
  }
};
