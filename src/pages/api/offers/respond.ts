import type { APIRoute } from 'astro';
import { mailerSendService } from '../../../lib/mailersend';

interface OfferResponse {
  offerId: string;
  sellerEmail: string;
  sellerName: string;
  buyerEmail: string;
  buyerName: string;
  platformTitle: string;
  offerAmount: number;
  status: 'accepted' | 'declined' | 'countered';
  counterAmount?: number;
  message?: string;
}

// In production, this would connect to your database
const offerResponses = new Map<string, OfferResponse>();

export const POST: APIRoute = async ({ request }) => {
  try {
    const {
      offerId,
      sellerEmail,
      sellerName,
      buyerEmail,
      buyerName,
      platformTitle,
      offerAmount,
      status,
      counterAmount,
      message
    } = await request.json();

    // Validation
    if (!offerId || !sellerEmail || !buyerEmail || !status) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: offerId, sellerEmail, buyerEmail, status'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['accepted', 'declined', 'countered'].includes(status)) {
      return new Response(JSON.stringify({
        error: 'Status must be one of: accepted, declined, countered'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (status === 'countered' && !counterAmount) {
      return new Response(JSON.stringify({
        error: 'Counter amount is required when status is countered'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create offer response record
    const offerResponse: OfferResponse = {
      offerId,
      sellerEmail,
      sellerName: sellerName || 'TechFlunky Seller',
      buyerEmail,
      buyerName: buyerName || 'TechFlunky Buyer',
      platformTitle: platformTitle || 'Business Platform',
      offerAmount,
      status,
      counterAmount,
      message
    };

    offerResponses.set(offerId, offerResponse);

    // Send email notification to buyer about offer status update
    try {
      await mailerSendService.sendOfferStatusUpdate(
        buyerEmail,
        offerResponse.buyerName,
        offerResponse.platformTitle,
        offerAmount,
        status,
        counterAmount
      );

      console.log(`📧 Offer status update email sent to ${buyerEmail} for offer ${offerId} - Status: ${status}`);

      // If offer is accepted, send deployment notification
      if (status === 'accepted') {
        // In production, this would trigger actual deployment
        const deploymentUrl = `https://${platformTitle.toLowerCase().replace(/\s+/g, '-')}.techflunky-deploy.com`;

        await mailerSendService.sendDeploymentNotification(
          buyerEmail,
          offerResponse.buyerName,
          offerResponse.platformTitle,
          deploymentUrl,
          {
            username: 'admin',
            password: Math.random().toString(36).substring(2, 12)
          }
        );

        console.log(`📧 Deployment notification sent to ${buyerEmail} for ${platformTitle}`);
      }

      // Send admin notification about offer response
      await mailerSendService.sendAdminNotification(
        offerResponse.platformTitle,
        offerAmount,
        buyerEmail,
        sellerEmail
      );

    } catch (emailError) {
      console.error('Failed to send offer status email:', emailError);
      // Don't fail the response if email fails
    }

    console.log(`Offer ${offerId} ${status} by seller ${sellerEmail}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Offer ${status} successfully`,
      offerResponse: {
        offerId: offerResponse.offerId,
        status: offerResponse.status,
        counterAmount: offerResponse.counterAmount
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error responding to offer:', error);
    return new Response(JSON.stringify({
      error: 'Failed to respond to offer',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const offerId = url.searchParams.get('offerId');

    if (!offerId) {
      return new Response(JSON.stringify({ error: 'Offer ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const offerResponse = offerResponses.get(offerId);

    if (!offerResponse) {
      return new Response(JSON.stringify({ error: 'Offer response not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      offerResponse: {
        offerId: offerResponse.offerId,
        status: offerResponse.status,
        counterAmount: offerResponse.counterAmount,
        message: offerResponse.message
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting offer response:', error);
    return new Response(JSON.stringify({ error: 'Failed to get offer response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};