// Enhanced Escrow System with Milestone-Based Payments
import type { APIContext } from 'astro';

interface EscrowMilestone {
  description: string;
  amount: number; // in cents
  deliverables: string[];
}

interface EscrowRequest {
  offerId: string;
  milestones: EscrowMilestone[];
  totalAmount: number;
  platformFee: number;
}

// Create escrow transaction
export async function POST({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY } = locals.runtime.env;

  try {
    const data: EscrowRequest = await request.json();
    const { offerId, milestones, totalAmount, platformFee } = data;

    if (!offerId || !milestones || milestones.length === 0) {
      return new Response(JSON.stringify({
        error: 'Offer ID and milestones required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate milestone amounts sum to total
    const milestonesTotal = milestones.reduce((sum, m) => sum + m.amount, 0);
    if (milestonesTotal !== totalAmount) {
      return new Response(JSON.stringify({
        error: 'Milestone amounts must sum to total amount'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get offer details
    const offer = await DB.prepare(`
      SELECT * FROM offers WHERE id = ?
    `).bind(offerId).first();

    if (!offer) {
      return new Response(JSON.stringify({ error: 'Offer not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Create escrow transaction
    const escrowResult = await DB.prepare(`
      INSERT INTO escrow_transactions
      (offer_id, total_amount, platform_fee, current_milestone, total_milestones, status, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, 'created', ?, ?)
    `).bind(
      offerId,
      totalAmount,
      platformFee,
      milestones.length,
      now,
      now
    ).run();

    const escrowId = escrowResult.meta.last_row_id;

    // Create milestone records
    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i];
      await DB.prepare(`
        INSERT INTO escrow_milestones
        (escrow_id, milestone_number, description, amount, deliverables, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        escrowId,
        i + 1,
        milestone.description,
        milestone.amount,
        JSON.stringify(milestone.deliverables),
        now
      ).run();
    }

    // Create Stripe Payment Intent for the total amount
    const paymentIntent = await createStripePaymentIntent(
      totalAmount,
      offer.buyer_id,
      escrowId,
      STRIPE_SECRET_KEY
    );

    // Update escrow with Stripe payment intent ID
    await DB.prepare(`
      UPDATE escrow_transactions
      SET stripe_payment_intent_id = ?, updated_at = ?
      WHERE id = ?
    `).bind(paymentIntent.id, now, escrowId).run();

    return new Response(JSON.stringify({
      success: true,
      escrowId,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      milestones: milestones.map((m, i) => ({
        milestoneNumber: i + 1,
        ...m
      }))
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating escrow:', error);
    return new Response(JSON.stringify({ error: 'Failed to create escrow' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get escrow details
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const escrowId = url.searchParams.get('escrowId');
  const offerId = url.searchParams.get('offerId');

  try {
    let escrow;

    if (escrowId) {
      escrow = await DB.prepare(`
        SELECT * FROM escrow_transactions WHERE id = ?
      `).bind(escrowId).first();
    } else if (offerId) {
      escrow = await DB.prepare(`
        SELECT * FROM escrow_transactions WHERE offer_id = ? ORDER BY created_at DESC LIMIT 1
      `).bind(offerId).first();
    } else {
      return new Response(JSON.stringify({
        error: 'Either escrowId or offerId required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!escrow) {
      return new Response(JSON.stringify({ error: 'Escrow not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get milestones
    const milestones = await DB.prepare(`
      SELECT * FROM escrow_milestones
      WHERE escrow_id = ?
      ORDER BY milestone_number
    `).bind(escrow.id).all();

    // Get offer details
    const offer = await DB.prepare(`
      SELECT o.*, u_buyer.name as buyer_name, u_seller.name as seller_name
      FROM offers o
      JOIN users u_buyer ON o.buyer_id = u_buyer.id
      JOIN users u_seller ON o.seller_id = u_seller.id
      WHERE o.id = ?
    `).bind(escrow.offer_id).first();

    return new Response(JSON.stringify({
      escrow: {
        ...escrow,
        milestones: milestones.map(m => ({
          ...m,
          deliverables: JSON.parse(m.deliverables || '[]')
        })),
        offer
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting escrow:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve escrow' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Complete milestone
export async function PUT({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY } = locals.runtime.env;

  try {
    const { escrowId, milestoneNumber, completedBy, deliverables = [] } = await request.json();

    if (!escrowId || !milestoneNumber || !completedBy) {
      return new Response(JSON.stringify({
        error: 'Escrow ID, milestone number, and completed by required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Get escrow details
    const escrow = await DB.prepare(`
      SELECT * FROM escrow_transactions WHERE id = ?
    `).bind(escrowId).first();

    if (!escrow) {
      return new Response(JSON.stringify({ error: 'Escrow not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if this is the current milestone
    if (milestoneNumber !== escrow.current_milestone) {
      return new Response(JSON.stringify({
        error: `Can only complete current milestone (${escrow.current_milestone})`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Complete the milestone
    await DB.prepare(`
      UPDATE escrow_milestones
      SET status = 'completed', completed_at = ?, completed_by = ?, deliverables = ?
      WHERE escrow_id = ? AND milestone_number = ?
    `).bind(
      now,
      completedBy,
      JSON.stringify(deliverables),
      escrowId,
      milestoneNumber
    ).run();

    // Get milestone details for payment release
    const milestone = await DB.prepare(`
      SELECT * FROM escrow_milestones WHERE escrow_id = ? AND milestone_number = ?
    `).bind(escrowId, milestoneNumber).first();

    // Release payment for this milestone (in production, this would involve Stripe transfers)
    const releaseResult = await releasePaymentForMilestone(
      escrow,
      milestone,
      STRIPE_SECRET_KEY
    );

    // Update escrow status
    const isLastMilestone = milestoneNumber === escrow.total_milestones;
    const newStatus = isLastMilestone ? 'completed' : 'in_progress';
    const nextMilestone = isLastMilestone ? escrow.current_milestone : escrow.current_milestone + 1;

    await DB.prepare(`
      UPDATE escrow_transactions
      SET current_milestone = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).bind(nextMilestone, newStatus, now, escrowId).run();

    // Update offer status if escrow completed
    if (isLastMilestone) {
      await DB.prepare(`
        UPDATE offers SET status = 'completed', updated_at = ? WHERE id = ?
      `).bind(now, escrow.offer_id).run();

      // Update reputation for both parties
      const offer = await DB.prepare(`
        SELECT * FROM offers WHERE id = ?
      `).bind(escrow.offer_id).first();

      if (offer) {
        // Update seller reputation
        await fetch('/api/gamification/reputation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: offer.seller_id,
            action: 'sale_completed',
            data: { amount: escrow.total_amount, milestones: escrow.total_milestones }
          })
        });

        // Update buyer reputation
        await fetch('/api/gamification/reputation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: offer.buyer_id,
            action: 'purchase_completed',
            data: { amount: escrow.total_amount }
          })
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      milestoneCompleted: milestoneNumber,
      paymentReleased: releaseResult.success,
      escrowStatus: newStatus,
      nextMilestone: isLastMilestone ? null : nextMilestone
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error completing milestone:', error);
    return new Response(JSON.stringify({ error: 'Failed to complete milestone' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Dispute milestone
export async function DELETE({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { escrowId, milestoneNumber, initiatedBy, disputeType, description } = await request.json();

    if (!escrowId || !milestoneNumber || !initiatedBy || !disputeType || !description) {
      return new Response(JSON.stringify({
        error: 'All dispute fields required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Create dispute record
    const disputeResult = await DB.prepare(`
      INSERT INTO disputes
      (escrow_id, initiated_by, dispute_type, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'open', ?, ?)
    `).bind(escrowId, initiatedBy, disputeType, description, now, now).run();

    // Update milestone status to disputed
    await DB.prepare(`
      UPDATE escrow_milestones
      SET status = 'disputed'
      WHERE escrow_id = ? AND milestone_number = ?
    `).bind(escrowId, milestoneNumber).run();

    // Update escrow status
    await DB.prepare(`
      UPDATE escrow_transactions
      SET status = 'disputed', updated_at = ?
      WHERE id = ?
    `).bind(now, escrowId).run();

    return new Response(JSON.stringify({
      success: true,
      disputeId: disputeResult.meta.last_row_id,
      message: 'Dispute created successfully. Our team will review within 24 hours.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating dispute:', error);
    return new Response(JSON.stringify({ error: 'Failed to create dispute' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function createStripePaymentIntent(
  amount: number,
  buyerId: string,
  escrowId: string,
  stripeSecretKey: string
) {
  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      amount: amount.toString(),
      currency: 'usd',
      automatic_payment_methods: 'enabled',
      metadata: JSON.stringify({
        escrowId,
        buyerId,
        type: 'escrow_payment'
      })
    })
  });

  return await response.json();
}

async function releasePaymentForMilestone(
  escrow: any,
  milestone: any,
  stripeSecretKey: string
): Promise<{ success: boolean; transferId?: string }> {
  try {
    // In production, this would create a Stripe transfer to the seller
    // For now, we'll simulate the payment release

    // Calculate net amount (minus platform fee proportionally)
    const platformFeeForMilestone = Math.round(
      (escrow.platform_fee * milestone.amount) / escrow.total_amount
    );
    const netAmount = milestone.amount - platformFeeForMilestone;

    // Here you would create a Stripe transfer:
    // const transfer = await stripe.transfers.create({
    //   amount: netAmount,
    //   currency: 'usd',
    //   destination: sellerStripeAccountId,
    //   transfer_group: escrowId
    // });

    return {
      success: true,
      transferId: `simulated_transfer_${Date.now()}`
    };

  } catch (error) {
    console.error('Error releasing payment:', error);
    return { success: false };
  }
}