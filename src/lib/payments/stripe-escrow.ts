import Stripe from 'stripe';

export interface EscrowTransaction {
  id: string;
  platformId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'held' | 'released' | 'disputed' | 'refunded';
  paymentIntentId: string;
  transferId?: string;
  holdUntil: Date;
  releaseConditions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EscrowConfig {
  holdPeriodDays: number;
  platformFeePercent: number;
  disputeWindowDays: number;
  autoReleaseEnabled: boolean;
}

export class StripeEscrowService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });
    this.webhookSecret = webhookSecret;
  }

  /**
   * Create escrow transaction for platform purchase
   */
  async createEscrowTransaction(params: {
    platformId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<{
    paymentIntent: Stripe.PaymentIntent;
    escrowTransaction: EscrowTransaction;
  }> {
    const { platformId, buyerId, sellerId, amount, currency, description, metadata = {} } = params;

    // Create connected account for seller if not exists
    await this.ensureSellerAccount(sellerId);

    // Calculate platform fee (8% of transaction)
    const platformFee = Math.round(amount * 0.08);

    // Create payment intent with escrow hold
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency,
      description,
      metadata: {
        type: 'platform_escrow',
        platform_id: platformId,
        buyer_id: buyerId,
        seller_id: sellerId,
        ...metadata
      },
      // Hold funds on platform account initially
      capture_method: 'manual',
      // Set up for later transfer to seller
      transfer_data: {
        destination: await this.getSellerStripeAccountId(sellerId),
        amount: amount - platformFee
      }
    });

    // Create escrow transaction record
    const escrowTransaction: EscrowTransaction = {
      id: `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platformId,
      buyerId,
      sellerId,
      amount,
      currency,
      status: 'pending',
      paymentIntentId: paymentIntent.id,
      holdUntil: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days
      releaseConditions: [
        'platform_deployed_successfully',
        'buyer_satisfaction_confirmed',
        'no_disputes_filed'
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { paymentIntent, escrowTransaction };
  }

  /**
   * Confirm escrow payment and hold funds
   */
  async confirmEscrowPayment(paymentIntentId: string): Promise<{
    success: boolean;
    escrowTransaction: EscrowTransaction;
  }> {
    try {
      // Capture the payment to hold funds
      const paymentIntent = await this.stripe.paymentIntents.capture(paymentIntentId);

      // Update escrow status to held
      const escrowTransaction = await this.updateEscrowStatus(paymentIntentId, 'held');

      // Schedule automatic release (30 days)
      await this.scheduleAutomaticRelease(escrowTransaction.id);

      return { success: true, escrowTransaction };
    } catch (error) {
      console.error('Escrow payment confirmation failed:', error);
      throw new Error('Failed to confirm escrow payment');
    }
  }

  /**
   * Release funds to seller after conditions met
   */
  async releaseFunds(escrowTransactionId: string, reason: string): Promise<{
    success: boolean;
    transfer: Stripe.Transfer;
  }> {
    const escrowTransaction = await this.getEscrowTransaction(escrowTransactionId);

    if (escrowTransaction.status !== 'held') {
      throw new Error('Funds not available for release');
    }

    // Calculate amounts
    const platformFee = Math.round(escrowTransaction.amount * 0.08);
    const sellerAmount = escrowTransaction.amount - platformFee;

    try {
      // Create transfer to seller
      const transfer = await this.stripe.transfers.create({
        amount: sellerAmount,
        currency: escrowTransaction.currency,
        destination: await this.getSellerStripeAccountId(escrowTransaction.sellerId),
        metadata: {
          escrow_transaction_id: escrowTransactionId,
          platform_id: escrowTransaction.platformId,
          release_reason: reason
        }
      });

      // Update escrow status
      await this.updateEscrowTransaction(escrowTransactionId, {
        status: 'released',
        transferId: transfer.id,
        updatedAt: new Date()
      });

      // Send notifications
      await this.sendEscrowNotification(escrowTransaction, 'funds_released', {
        transferId: transfer.id,
        amount: sellerAmount,
        reason
      });

      return { success: true, transfer };
    } catch (error) {
      console.error('Fund release failed:', error);
      throw new Error('Failed to release funds to seller');
    }
  }

  /**
   * Refund buyer and cancel escrow
   */
  async refundEscrow(escrowTransactionId: string, reason: string): Promise<{
    success: boolean;
    refund: Stripe.Refund;
  }> {
    const escrowTransaction = await this.getEscrowTransaction(escrowTransactionId);

    if (escrowTransaction.status === 'released') {
      throw new Error('Funds already released, cannot refund');
    }

    try {
      // Create refund
      const refund = await this.stripe.refunds.create({
        payment_intent: escrowTransaction.paymentIntentId,
        metadata: {
          escrow_transaction_id: escrowTransactionId,
          refund_reason: reason
        }
      });

      // Update escrow status
      await this.updateEscrowTransaction(escrowTransactionId, {
        status: 'refunded',
        updatedAt: new Date()
      });

      // Send notifications
      await this.sendEscrowNotification(escrowTransaction, 'escrow_refunded', {
        refundId: refund.id,
        reason
      });

      return { success: true, refund };
    } catch (error) {
      console.error('Escrow refund failed:', error);
      throw new Error('Failed to refund escrow transaction');
    }
  }

  /**
   * Handle dispute for escrow transaction
   */
  async handleDispute(escrowTransactionId: string, disputeDetails: {
    reason: string;
    description: string;
    evidence?: string[];
  }): Promise<{ success: boolean; disputeId: string }> {
    const escrowTransaction = await this.getEscrowTransaction(escrowTransactionId);

    // Update status to disputed
    await this.updateEscrowTransaction(escrowTransactionId, {
      status: 'disputed',
      updatedAt: new Date()
    });

    // Create dispute record
    const disputeId = await this.createDisputeRecord(escrowTransactionId, disputeDetails);

    // Notify stakeholders
    await this.sendEscrowNotification(escrowTransaction, 'dispute_created', {
      disputeId,
      reason: disputeDetails.reason
    });

    // Queue for manual review
    await this.queueForDisputeReview(disputeId);

    return { success: true, disputeId };
  }

  /**
   * Process automatic release after hold period
   */
  async processAutomaticRelease(escrowTransactionId: string): Promise<void> {
    const escrowTransaction = await this.getEscrowTransaction(escrowTransactionId);

    // Check if conditions are met for automatic release
    const canAutoRelease = await this.checkAutoReleaseConditions(escrowTransaction);

    if (canAutoRelease) {
      await this.releaseFunds(escrowTransactionId, 'automatic_release_after_hold_period');
    } else {
      // Extend hold period or require manual review
      await this.extendEscrowHold(escrowTransactionId, 7); // 7 more days
    }
  }

  /**
   * Webhook handler for Stripe events
   */
  async handleWebhook(payload: string, signature: string): Promise<{ handled: boolean; event?: string }> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new Error('Invalid webhook signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'transfer.created':
        await this.handleTransferCreated(event.data.object as Stripe.Transfer);
        break;

      case 'charge.dispute.created':
        await this.handleChargeDispute(event.data.object as Stripe.Dispute);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return { handled: false };
    }

    return { handled: true, event: event.type };
  }

  // Private helper methods

  private async ensureSellerAccount(sellerId: string): Promise<void> {
    const existingAccount = await this.getSellerStripeAccountId(sellerId);

    if (!existingAccount) {
      // Create connected account for seller
      const account = await this.stripe.accounts.create({
        type: 'express',
        metadata: {
          seller_id: sellerId,
          platform: 'techflunky'
        }
      });

      // Save account ID to database
      await this.saveSellerStripeAccount(sellerId, account.id);
    }
  }

  private async getSellerStripeAccountId(sellerId: string): Promise<string> {
    // Retrieve from database
    // This would be implemented based on your database structure
    throw new Error('Database lookup not implemented');
  }

  private async saveSellerStripeAccount(sellerId: string, accountId: string): Promise<void> {
    // Save to database
    // This would be implemented based on your database structure
    throw new Error('Database save not implemented');
  }

  private async getEscrowTransaction(escrowTransactionId: string): Promise<EscrowTransaction> {
    // Retrieve from database
    // This would be implemented based on your database structure
    throw new Error('Database lookup not implemented');
  }

  private async updateEscrowStatus(paymentIntentId: string, status: EscrowTransaction['status']): Promise<EscrowTransaction> {
    // Update in database
    // This would be implemented based on your database structure
    throw new Error('Database update not implemented');
  }

  private async updateEscrowTransaction(escrowTransactionId: string, updates: Partial<EscrowTransaction>): Promise<void> {
    // Update in database
    // This would be implemented based on your database structure
    throw new Error('Database update not implemented');
  }

  private async scheduleAutomaticRelease(escrowTransactionId: string): Promise<void> {
    // Schedule using your queue system (Cloudflare Queues, etc.)
    // This would trigger processAutomaticRelease after 30 days
    throw new Error('Queue scheduling not implemented');
  }

  private async sendEscrowNotification(
    escrowTransaction: EscrowTransaction,
    type: string,
    data: Record<string, any>
  ): Promise<void> {
    // Send email/SMS notifications to buyer and seller
    // This would be implemented based on your notification system
    console.log(`Sending ${type} notification for escrow ${escrowTransaction.id}`);
  }

  private async createDisputeRecord(escrowTransactionId: string, disputeDetails: any): Promise<string> {
    // Create dispute in your database
    const disputeId = `dispute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Save dispute details
    return disputeId;
  }

  private async queueForDisputeReview(disputeId: string): Promise<void> {
    // Queue for manual review by support team
    console.log(`Queuing dispute ${disputeId} for manual review`);
  }

  private async checkAutoReleaseConditions(escrowTransaction: EscrowTransaction): Promise<boolean> {
    // Check if platform was deployed successfully
    // Check if buyer confirmed satisfaction
    // Check if no disputes were filed
    return true; // Simplified for now
  }

  private async extendEscrowHold(escrowTransactionId: string, additionalDays: number): Promise<void> {
    // Extend the hold period
    const newHoldUntil = new Date(Date.now() + (additionalDays * 24 * 60 * 60 * 1000));
    await this.updateEscrowTransaction(escrowTransactionId, {
      holdUntil: newHoldUntil,
      updatedAt: new Date()
    });
  }

  // Webhook event handlers

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    if (paymentIntent.metadata?.type === 'platform_escrow') {
      await this.confirmEscrowPayment(paymentIntent.id);
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    if (paymentIntent.metadata?.type === 'platform_escrow') {
      // Handle failed escrow payment
      console.log(`Escrow payment failed: ${paymentIntent.id}`);
    }
  }

  private async handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
    if (transfer.metadata?.escrow_transaction_id) {
      console.log(`Funds transferred for escrow: ${transfer.metadata.escrow_transaction_id}`);
    }
  }

  private async handleChargeDispute(dispute: Stripe.Dispute): Promise<void> {
    // Handle Stripe-level disputes
    const charge = dispute.charge as string;
    console.log(`Dispute created for charge: ${charge}`);
  }
}