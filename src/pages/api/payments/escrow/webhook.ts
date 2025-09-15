import type { APIRoute } from 'astro';
import { StripeEscrowService } from '../../../../lib/payments/stripe-escrow';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    // Initialize Stripe escrow service
    const escrowService = new StripeEscrowService(
      locals.runtime.env.STRIPE_SECRET_KEY,
      locals.runtime.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle webhook event
    const result = await escrowService.handleWebhook(payload, signature);

    if (!result.handled) {
      console.log(`Unhandled webhook event: ${result.event}`);
    }

    return new Response('Webhook handled successfully', { status: 200 });

  } catch (error) {
    console.error('Webhook handling error:', error);

    if (error.message?.includes('Invalid webhook signature')) {
      return new Response('Invalid webhook signature', { status: 400 });
    }

    return new Response('Webhook handling failed', { status: 500 });
  }
};