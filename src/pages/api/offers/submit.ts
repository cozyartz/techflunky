import type { APIRoute } from 'astro';

interface Offer {
  id: string;
  platformId: string;
  buyerEmail: string;
  buyerName: string;
  offerAmount: number;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'countered' | 'expired';
  createdAt: string;
  expiresAt: string;
}

// In a real implementation, this would be stored in a database
const offers = new Map<string, Offer>();

export const POST: APIRoute = async ({ request }) => {
  try {
    const { platformId, buyerEmail, buyerName, offerAmount, message } = await request.json();

    // Validation
    if (!platformId || !buyerEmail || !buyerName || !offerAmount) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: platformId, buyerEmail, buyerName, offerAmount'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (offerAmount < 1000) {
      return new Response(JSON.stringify({
        error: 'Minimum offer amount is $1,000'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create offer
    const offerId = `offer_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (72 * 60 * 60 * 1000)); // 72 hours

    const offer: Offer = {
      id: offerId,
      platformId,
      buyerEmail,
      buyerName,
      offerAmount,
      message: message || '',
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    offers.set(offerId, offer);

    // In production, you would:
    // 1. Save to database
    // 2. Send notification email to seller
    // 3. Log the event for analytics
    // 4. Validate buyer credentials
    // 5. Check platform availability

    console.log(`New offer received: ${offerId} for platform ${platformId} - $${offerAmount}`);

    return new Response(JSON.stringify({
      success: true,
      offerId,
      offer: {
        id: offer.id,
        platformId: offer.platformId,
        offerAmount: offer.offerAmount,
        status: offer.status,
        expiresAt: offer.expiresAt
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error submitting offer:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit offer' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const platformId = url.searchParams.get('platformId');

    if (!platformId) {
      return new Response(JSON.stringify({ error: 'Platform ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all offers for this platform
    const platformOffers = Array.from(offers.values())
      .filter(offer => offer.platformId === platformId)
      .map(offer => ({
        id: offer.id,
        offerAmount: offer.offerAmount,
        status: offer.status,
        createdAt: offer.createdAt,
        expiresAt: offer.expiresAt
      }));

    return new Response(JSON.stringify({
      platformId,
      offers: platformOffers,
      totalOffers: platformOffers.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting offers:', error);
    return new Response(JSON.stringify({ error: 'Failed to get offers' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};