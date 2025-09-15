import type { APIRoute } from 'astro';
import { StripeEscrowService } from '../../../../lib/payments/stripe-escrow';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const {
      escrowTransactionId,
      reason,
      userId,
      userRole, // 'buyer', 'seller', 'admin'
      releaseConditions = []
    } = await request.json();

    if (!escrowTransactionId || !reason || !userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: escrowTransactionId, reason, userId'
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

    // Verify user authorization
    const authResult = await verifyReleaseAuthorization(
      userId,
      userRole,
      escrowTransaction,
      locals.runtime.env
    );

    if (!authResult.authorized) {
      return new Response(JSON.stringify({
        success: false,
        error: authResult.reason
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if escrow is in correct status for release
    if (escrowTransaction.status !== 'held') {
      return new Response(JSON.stringify({
        success: false,
        error: `Cannot release funds. Current status: ${escrowTransaction.status}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate release conditions if specified
    if (releaseConditions.length > 0) {
      const conditionsValid = await validateReleaseConditions(
        escrowTransaction,
        releaseConditions,
        locals.runtime.env
      );

      if (!conditionsValid.valid) {
        return new Response(JSON.stringify({
          success: false,
          error: `Release conditions not met: ${conditionsValid.failedConditions.join(', ')}`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Initialize Stripe escrow service
    const escrowService = new StripeEscrowService(
      locals.runtime.env.STRIPE_SECRET_KEY,
      locals.runtime.env.STRIPE_WEBHOOK_SECRET
    );

    // Release funds to seller
    const { success, transfer } = await escrowService.releaseFunds(escrowTransactionId, reason);

    if (!success) {
      throw new Error('Fund release failed');
    }

    // Update escrow transaction status
    await updateEscrowTransaction(escrowTransactionId, {
      status: 'released',
      transfer_id: transfer.id,
      released_by: userId,
      release_reason: reason,
      released_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, locals.runtime.env);

    // Send notifications
    await sendReleaseNotifications(escrowTransaction, transfer, reason, locals.runtime.env);

    // Log release event
    await logEscrowEvent({
      escrowTransactionId,
      event: 'funds_released',
      userId,
      userRole,
      reason,
      transferId: transfer.id,
      amount: transfer.amount,
      timestamp: new Date().toISOString()
    }, locals.runtime.env);

    return new Response(JSON.stringify({
      success: true,
      data: {
        escrowTransactionId,
        transferId: transfer.id,
        releasedAmount: transfer.amount,
        platformFee: escrowTransaction.amount - transfer.amount,
        releasedAt: new Date().toISOString(),
        reason
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Escrow release error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to release escrow funds'
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
    transferId: result.transfer_id,
    holdUntil: new Date(result.hold_until),
    releaseConditions: JSON.parse(result.release_conditions || '[]'),
    createdAt: new Date(result.created_at),
    updatedAt: new Date(result.updated_at)
  };
}

async function verifyReleaseAuthorization(
  userId: string,
  userRole: string,
  escrowTransaction: any,
  env: any
): Promise<{ authorized: boolean; reason?: string }> {
  // Admin can always release
  if (userRole === 'admin') {
    return { authorized: true };
  }

  // Buyer can release after platform deployment
  if (userRole === 'buyer' && userId === escrowTransaction.buyerId) {
    // Check if platform has been deployed
    const deployment = await checkPlatformDeployment(escrowTransaction.platformId, env);
    if (deployment.deployed) {
      return { authorized: true };
    } else {
      return {
        authorized: false,
        reason: 'Platform must be successfully deployed before buyer can release funds'
      };
    }
  }

  // Seller cannot self-release (must be buyer or admin)
  if (userRole === 'seller' && userId === escrowTransaction.sellerId) {
    return {
      authorized: false,
      reason: 'Sellers cannot release their own escrow funds'
    };
  }

  // Automatic release after hold period
  if (new Date() > escrowTransaction.holdUntil) {
    return { authorized: true };
  }

  return {
    authorized: false,
    reason: 'Insufficient authorization to release funds'
  };
}

async function validateReleaseConditions(
  escrowTransaction: any,
  requestedConditions: string[],
  env: any
): Promise<{ valid: boolean; failedConditions: string[] }> {
  const failedConditions: string[] = [];

  for (const condition of requestedConditions) {
    switch (condition) {
      case 'platform_deployed_successfully':
        const deployment = await checkPlatformDeployment(escrowTransaction.platformId, env);
        if (!deployment.deployed || !deployment.healthy) {
          failedConditions.push('Platform deployment not successful');
        }
        break;

      case 'buyer_satisfaction_confirmed':
        const satisfaction = await checkBuyerSatisfaction(escrowTransaction.id, env);
        if (!satisfaction.confirmed) {
          failedConditions.push('Buyer satisfaction not confirmed');
        }
        break;

      case 'no_disputes_filed':
        const disputes = await checkForDisputes(escrowTransaction.id, env);
        if (disputes.hasDisputes) {
          failedConditions.push('Active disputes prevent release');
        }
        break;

      case 'platform_performance_verified':
        const performance = await checkPlatformPerformance(escrowTransaction.platformId, env);
        if (!performance.meetsStandards) {
          failedConditions.push('Platform performance below standards');
        }
        break;

      default:
        failedConditions.push(`Unknown release condition: ${condition}`);
    }
  }

  return {
    valid: failedConditions.length === 0,
    failedConditions
  };
}

async function checkPlatformDeployment(platformId: string, env: any) {
  const result = await env.DB.prepare(`
    SELECT status, health_check_url, last_health_check
    FROM platform_deployments
    WHERE platform_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(platformId).first();

  return {
    deployed: result?.status === 'deployed',
    healthy: result?.last_health_check &&
             new Date(result.last_health_check) > new Date(Date.now() - 24*60*60*1000) // Last 24 hours
  };
}

async function checkBuyerSatisfaction(escrowTransactionId: string, env: any) {
  const result = await env.DB.prepare(`
    SELECT satisfaction_confirmed, satisfaction_rating
    FROM buyer_satisfaction
    WHERE escrow_transaction_id = ?
  `).bind(escrowTransactionId).first();

  return {
    confirmed: result?.satisfaction_confirmed === 1,
    rating: result?.satisfaction_rating || 0
  };
}

async function checkForDisputes(escrowTransactionId: string, env: any) {
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as dispute_count
    FROM escrow_disputes
    WHERE escrow_transaction_id = ? AND status IN ('open', 'under_review')
  `).bind(escrowTransactionId).first();

  return {
    hasDisputes: result?.dispute_count > 0
  };
}

async function checkPlatformPerformance(platformId: string, env: any) {
  const result = await env.DB.prepare(`
    SELECT avg_response_time, uptime_percentage, error_rate
    FROM platform_performance
    WHERE platform_id = ? AND recorded_at > datetime('now', '-7 days')
  `).bind(platformId).first();

  if (!result) return { meetsStandards: false };

  return {
    meetsStandards:
      result.avg_response_time < 500 && // Under 500ms
      result.uptime_percentage > 99.0 && // Over 99% uptime
      result.error_rate < 1.0 // Under 1% error rate
  };
}

async function updateEscrowTransaction(escrowTransactionId: string, updates: any, env: any) {
  const setParts = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);

  const stmt = env.DB.prepare(`
    UPDATE escrow_transactions SET ${setParts} WHERE id = ?
  `);

  await stmt.bind(...values, escrowTransactionId).run();
}

async function sendReleaseNotifications(escrowTransaction: any, transfer: any, reason: string, env: any) {
  // Send email to seller
  await env.EMAIL_QUEUE.send({
    to: await getSellerEmail(escrowTransaction.sellerId, env),
    subject: 'Escrow Funds Released - TechFlunky',
    template: 'escrow-funds-released',
    data: {
      amount: transfer.amount / 100,
      currency: escrowTransaction.currency,
      platformId: escrowTransaction.platformId,
      reason,
      transferId: transfer.id
    }
  });

  // Send email to buyer
  await env.EMAIL_QUEUE.send({
    to: await getBuyerEmail(escrowTransaction.buyerId, env),
    subject: 'Escrow Transaction Completed - TechFlunky',
    template: 'escrow-completed',
    data: {
      amount: escrowTransaction.amount / 100,
      currency: escrowTransaction.currency,
      platformId: escrowTransaction.platformId,
      reason
    }
  });
}

async function getSellerEmail(sellerId: string, env: any): Promise<string> {
  const result = await env.DB.prepare(`SELECT email FROM users WHERE id = ?`).bind(sellerId).first();
  return result?.email || '';
}

async function getBuyerEmail(buyerId: string, env: any): Promise<string> {
  const result = await env.DB.prepare(`SELECT email FROM users WHERE id = ?`).bind(buyerId).first();
  return result?.email || '';
}

async function logEscrowEvent(data: any, env: any) {
  const stmt = env.DB.prepare(`
    INSERT INTO escrow_events (
      escrow_transaction_id, event, user_id, user_role, reason,
      transfer_id, amount, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    data.escrowTransactionId,
    data.event,
    data.userId,
    data.userRole,
    data.reason,
    data.transferId || null,
    data.amount || null,
    data.timestamp
  ).run();

  // Send to analytics
  await env.ANALYTICS_QUEUE.send({
    event: 'escrow_funds_released',
    properties: data
  });
}