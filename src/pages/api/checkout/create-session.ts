// API endpoint to create Stripe checkout session
import type { APIRoute } from 'astro';
import { stripe, calculatePlatformFee } from '../../../lib/stripe-config';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { listingId, listingPrice, listingTitle, sellerId, sellerTier = 'standard' } = await request.json();

    // In production, verify the user is authenticated
    // const userId = locals.userId; // From auth middleware

    // Calculate platform fee based on seller tier
    const platformFee = calculatePlatformFee({
      amount: listingPrice,
      sellerTier
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: listingTitle,
              description: `Business concept package: ${listingTitle}`,
              metadata: {
                listingId,
                sellerId,
              },
            },
            unit_amount: listingPrice,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/listing/${listingId}`,
      payment_intent_data: {
        // Hold funds for verification period
        capture_method: 'manual',
        metadata: {
          listingId,
          sellerId,
          type: 'listing_purchase',
        },
        // Take calculated platform fee based on seller tier
        application_fee_amount: platformFee,
        // Send to seller's connected account
        transfer_data: {
          destination: sellerId,
        },
      },
      metadata: {
        listingId,
        sellerId,
      },
    });

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Checkout session error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
