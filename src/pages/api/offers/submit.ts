import type { APIRoute } from 'astro';
import { validateEmail } from '../../../lib/email-validation';

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

    // Comprehensive email validation
    console.log(`Validating email: ${buyerEmail}`);
    const emailValidation = await validateEmail(buyerEmail, {
      checkMxRecord: true,
      checkDisposable: true,
      checkFreeProvider: true,
      checkRoleBased: true,
      timeout: 5000
    });

    if (!emailValidation.isValid) {
      return new Response(JSON.stringify({
        error: 'Invalid email address',
        details: emailValidation.errors.join(', '),
        suggestion: emailValidation.domainSuggestion ? `Did you mean ${buyerEmail.split('@')[0]}@${emailValidation.domainSuggestion}?` : undefined
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log email validation score for analytics
    console.log(`Email ${buyerEmail} validated with score: ${emailValidation.score}`);

    // Record email validation in analytics (for dashboard)
    try {
      await fetch('/api/admin/email-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: buyerEmail,
          validationResult: emailValidation,
          userType: 'buyer'
        })
      });
    } catch (analyticsError) {
      console.error('Failed to record email analytics:', analyticsError);
      // Don't fail the offer submission if analytics recording fails
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

    console.log(`New offer received: ${offerId} for platform ${platformId} - $${offerAmount} from validated email: ${buyerEmail} (score: ${emailValidation.score})`);

    // In production, you would also:
    // 1. Store email validation score in database for future reference
    // 2. Flag offers from disposable/role-based emails for manual review
    // 3. Set up email notification preferences based on validation results
    if (emailValidation.isDisposable) {
      console.log(`⚠️  Warning: Offer from disposable email domain: ${buyerEmail}`);
    }
    if (emailValidation.isRoleBasedEmail) {
      console.log(`⚠️  Warning: Offer from role-based email: ${buyerEmail}`);
    }

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