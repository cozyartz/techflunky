import type { APIRoute } from 'astro';
import { StripeEscrowService } from '../../../../lib/payments/stripe-escrow';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const {
      escrowTransactionId,
      reason,
      description,
      evidence = [],
      userId,
      userRole
    } = await request.json();

    if (!escrowTransactionId || !reason || !description || !userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: escrowTransactionId, reason, description, userId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get escrow transaction details
    const escrowTransaction = await getEscrowTransaction(escrowTransactionId, locals.runtime.env);
    if (!escrowTransaction) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Escrow transaction not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify user can file dispute
    const authResult = await verifyDisputeAuthorization(userId, userRole, escrowTransaction, locals.runtime.env);
    if (!authResult.authorized) {
      return new Response(JSON.stringify({
        success: false,
        error: authResult.reason
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if escrow is in disputable status
    if (!['held', 'pending'].includes(escrowTransaction.status)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Cannot dispute escrow in status: ${escrowTransaction.status}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for existing disputes
    const existingDispute = await getExistingDispute(escrowTransactionId, locals.runtime.env);
    if (existingDispute) {
      return new Response(JSON.stringify({
        success: false,
        error: 'A dispute already exists for this transaction'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Stripe escrow service
    const escrowService = new StripeEscrowService(
      locals.runtime.env.STRIPE_SECRET_KEY,
      locals.runtime.env.STRIPE_WEBHOOK_SECRET
    );

    // Create dispute
    const { success, disputeId } = await escrowService.handleDispute(escrowTransactionId, {
      reason,
      description,
      evidence
    });

    if (!success) {
      throw new Error('Failed to create dispute');
    }

    // Save dispute details to database
    await saveDisputeDetails({
      disputeId,
      escrowTransactionId,
      reason,
      description,
      evidence,
      filedBy: userId,
      filedByRole: userRole,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    }, locals.runtime.env);

    // Send notifications
    await sendDisputeNotifications(escrowTransaction, disputeId, reason, locals.runtime.env);

    // Log dispute event
    await logDisputeEvent({
      disputeId,
      escrowTransactionId,
      event: 'dispute_filed',
      userId,
      userRole,
      reason,
      timestamp: new Date().toISOString()
    }, locals.runtime.env);

    return new Response(JSON.stringify({
      success: true,
      data: {
        disputeId,
        escrowTransactionId,
        status: 'open',
        filedAt: new Date().toISOString(),
        estimatedResolutionTime: '3-5 business days'
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Dispute creation error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create dispute'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET endpoint to retrieve dispute details
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const disputeId = url.searchParams.get('disputeId');
    const escrowTransactionId = url.searchParams.get('escrowTransactionId');

    if (!disputeId && !escrowTransactionId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either disputeId or escrowTransactionId is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let dispute;
    if (disputeId) {
      dispute = await getDispute(disputeId, locals.runtime.env);
    } else {
      dispute = await getExistingDispute(escrowTransactionId!, locals.runtime.env);
    }

    if (!dispute) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Dispute not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get dispute history
    const history = await getDisputeHistory(dispute.id, locals.runtime.env);

    return new Response(JSON.stringify({
      success: true,
      data: {
        dispute,
        history
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Dispute retrieval error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to retrieve dispute details'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function getEscrowTransaction(escrowTransactionId: string, env: any) {
  const result = await env.DB.prepare(`
    SELECT * FROM escrow_transactions WHERE id = ?
  `).bind(escrowTransactionId).first();

  if (!result) return null;

  return {
    id: result.id,
    platformId: result.platform_id,
    buyerId: result.buyer_id,
    sellerId: result.seller_id,
    amount: result.amount,
    currency: result.currency,
    status: result.status,
    paymentIntentId: result.payment_intent_id,
    createdAt: new Date(result.created_at),
    updatedAt: new Date(result.updated_at)
  };
}

async function verifyDisputeAuthorization(
  userId: string,
  userRole: string,
  escrowTransaction: any,
  env: any
): Promise<{ authorized: boolean; reason?: string }> {
  // Only buyer or seller can file disputes
  if (userRole === 'buyer' && userId === escrowTransaction.buyerId) {
    return { authorized: true };
  }

  if (userRole === 'seller' && userId === escrowTransaction.sellerId) {
    return { authorized: true };
  }

  // Admin can file disputes on behalf of users
  if (userRole === 'admin') {
    return { authorized: true };
  }

  return {
    authorized: false,
    reason: 'Only buyers and sellers can file disputes for their transactions'
  };
}

async function getExistingDispute(escrowTransactionId: string, env: any) {
  const result = await env.DB.prepare(`
    SELECT * FROM escrow_disputes
    WHERE escrow_transaction_id = ? AND status IN ('open', 'under_review')
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(escrowTransactionId).first();

  if (!result) return null;

  return {
    id: result.id,
    escrowTransactionId: result.escrow_transaction_id,
    reason: result.reason,
    description: result.description,
    evidence: JSON.parse(result.evidence || '[]'),
    filedBy: result.filed_by,
    filedByRole: result.filed_by_role,
    status: result.status,
    createdAt: new Date(result.created_at),
    updatedAt: new Date(result.updated_at)
  };
}

async function getDispute(disputeId: string, env: any) {
  const result = await env.DB.prepare(`
    SELECT * FROM escrow_disputes WHERE id = ?
  `).bind(disputeId).first();

  if (!result) return null;

  return {
    id: result.id,
    escrowTransactionId: result.escrow_transaction_id,
    reason: result.reason,
    description: result.description,
    evidence: JSON.parse(result.evidence || '[]'),
    filedBy: result.filed_by,
    filedByRole: result.filed_by_role,
    status: result.status,
    resolution: result.resolution,
    resolvedBy: result.resolved_by,
    resolvedAt: result.resolved_at ? new Date(result.resolved_at) : null,
    createdAt: new Date(result.created_at),
    updatedAt: new Date(result.updated_at)
  };
}

async function saveDisputeDetails(dispute: any, env: any) {
  const stmt = env.DB.prepare(`
    INSERT INTO escrow_disputes (
      id, escrow_transaction_id, reason, description, evidence,
      filed_by, filed_by_role, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    dispute.disputeId,
    dispute.escrowTransactionId,
    dispute.reason,
    dispute.description,
    JSON.stringify(dispute.evidence),
    dispute.filedBy,
    dispute.filedByRole,
    dispute.status,
    dispute.createdAt.toISOString(),
    dispute.updatedAt.toISOString()
  ).run();
}

async function sendDisputeNotifications(escrowTransaction: any, disputeId: string, reason: string, env: any) {
  // Notify both buyer and seller
  const notifications = [
    {
      to: await getBuyerEmail(escrowTransaction.buyerId, env),
      role: 'buyer'
    },
    {
      to: await getSellerEmail(escrowTransaction.sellerId, env),
      role: 'seller'
    }
  ];

  for (const notification of notifications) {
    await env.EMAIL_QUEUE.send({
      to: notification.to,
      subject: 'Escrow Dispute Filed - TechFlunky',
      template: 'escrow-dispute-notification',
      data: {
        disputeId,
        escrowTransactionId: escrowTransaction.id,
        platformId: escrowTransaction.platformId,
        reason,
        userRole: notification.role,
        disputeUrl: `https://techflunky.com/disputes/${disputeId}`
      }
    });
  }

  // Notify support team
  await env.EMAIL_QUEUE.send({
    to: 'disputes@techflunky.com',
    subject: `New Escrow Dispute: ${disputeId}`,
    template: 'escrow-dispute-admin',
    data: {
      disputeId,
      escrowTransactionId: escrowTransaction.id,
      platformId: escrowTransaction.platformId,
      amount: escrowTransaction.amount,
      reason,
      adminUrl: `https://admin.techflunky.com/disputes/${disputeId}`
    }
  });
}

async function getBuyerEmail(buyerId: string, env: any): Promise<string> {
  const result = await env.DB.prepare(`SELECT email FROM users WHERE id = ?`).bind(buyerId).first();
  return result?.email || '';
}

async function getSellerEmail(sellerId: string, env: any): Promise<string> {
  const result = await env.DB.prepare(`SELECT email FROM users WHERE id = ?`).bind(sellerId).first();
  return result?.email || '';
}

async function getDisputeHistory(disputeId: string, env: any) {
  const results = await env.DB.prepare(`
    SELECT * FROM dispute_history
    WHERE dispute_id = ?
    ORDER BY created_at ASC
  `).bind(disputeId).all();

  return results.results?.map((row: any) => ({
    id: row.id,
    disputeId: row.dispute_id,
    action: row.action,
    description: row.description,
    performedBy: row.performed_by,
    performedByRole: row.performed_by_role,
    createdAt: new Date(row.created_at)
  })) || [];
}

async function logDisputeEvent(data: any, env: any) {
  // Log to dispute history
  const stmt = env.DB.prepare(`
    INSERT INTO dispute_history (
      id, dispute_id, action, description, performed_by,
      performed_by_role, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    data.disputeId,
    data.event,
    `Dispute filed: ${data.reason}`,
    data.userId,
    data.userRole,
    data.timestamp
  ).run();

  // Send to analytics
  await env.ANALYTICS_QUEUE.send({
    event: 'escrow_dispute_filed',
    properties: data
  });
}