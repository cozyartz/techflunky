// Stripe Connect configuration for TechFlunky marketplace
import Stripe from 'stripe';

// Initialize Stripe with your secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Platform configuration
export const PLATFORM_CONFIG = {
  // Sliding scale platform commission: 8% - 18%
  platformFeePercent: {
    min: 0.08, // 8% for high-value or established sellers
    max: 0.18, // 18% for new sellers or low-value items
    standard: 0.15 // 15% default rate
  },
  
  // Hold payments for 3-7 days for verification
  defaultPayoutDelay: 3, // days
  maxPayoutDelay: 7, // days for high-value listings
  
  // Stripe Connect account types
  accountType: 'custom', // or 'express' for simpler onboarding
  
  // Payment method types to accept
  paymentMethods: ['card', 'bank_transfer'],
};

// Create a connected account for a seller
export async function createSellerAccount(seller: {
  email: string;
  name: string;
  businessType: 'individual' | 'company';
  country?: string;
}) {
  const account = await stripe.accounts.create({
    type: PLATFORM_CONFIG.accountType,
    country: seller.country === 'United States' ? 'US' : 'US', // Default to US for now
    email: seller.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: seller.businessType,
    business_profile: {
      mcc: '5734', // Computer Software Stores
      name: seller.name,
      product_description: 'Complete software platforms and business solutions',
    },
    settings: {
      payouts: {
        schedule: {
          delay_days: 'manual', // We control when payouts happen
        },
      },
    },
  });

  return account;
}

// Calculate dynamic platform fee based on seller tier and transaction value
export function calculatePlatformFee({
  amount,
  sellerTier = 'standard',
  transactionValue = 'medium'
}: {
  amount: number;
  sellerTier?: 'new' | 'standard' | 'established' | 'premium';
  transactionValue?: 'low' | 'medium' | 'high';
}): number {
  let feeRate = PLATFORM_CONFIG.platformFeePercent.standard;
  
  // Adjust based on seller tier
  switch (sellerTier) {
    case 'new':
      feeRate = PLATFORM_CONFIG.platformFeePercent.max; // 18%
      break;
    case 'established':
      feeRate = PLATFORM_CONFIG.platformFeePercent.min; // 8%
      break;
    case 'premium':
      feeRate = 0.06; // 6% for top-tier sellers
      break;
    default:
      feeRate = PLATFORM_CONFIG.platformFeePercent.standard; // 15%
  }
  
  // Adjust based on transaction value
  if (transactionValue === 'high' && amount >= 50000) { // $500+
    feeRate *= 0.9; // 10% discount on fees for high-value transactions
  } else if (transactionValue === 'low' && amount <= 1000) { // Under $10
    feeRate = Math.min(feeRate * 1.2, PLATFORM_CONFIG.platformFeePercent.max); // 20% increase, capped at max
  }
  
  return Math.round(amount * feeRate);
}

// Process a marketplace transaction
export async function processListingPurchase({
  buyerId,
  sellerId,
  listingId,
  amount, // in cents
  description,
  sellerTier = 'standard',
}: {
  buyerId: string;
  sellerId: string;
  listingId: string;
  amount: number;
  description: string;
  sellerTier?: 'new' | 'standard' | 'established' | 'premium';
}) {
  // Calculate dynamic platform fee
  const transactionValue = amount >= 50000 ? 'high' : amount <= 1000 ? 'low' : 'medium';
  const platformFee = calculatePlatformFee({ amount, sellerTier, transactionValue });
  
  // Create payment intent with destination charge
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    description,
    metadata: {
      listingId,
      buyerId,
      sellerId,
      type: 'listing_purchase',
    },
    
    // Destination charge - money goes to seller's account
    transfer_data: {
      destination: sellerId, // seller's Stripe account ID
    },
    
    // Take platform fee
    application_fee_amount: platformFee,
    
    // Hold the payment initially
    capture_method: 'manual',
  });

  return paymentIntent;
}

// Release payment to seller after verification
export async function releaseFundsToSeller({
  paymentIntentId,
  sellerId,
}: {
  paymentIntentId: string;
  sellerId: string;
}) {
  // First capture the payment if not already captured
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  if (paymentIntent.status === 'requires_capture') {
    await stripe.paymentIntents.capture(paymentIntentId);
  }
  
  // Create payout to seller's bank account
  const payout = await stripe.payouts.create(
    {
      amount: paymentIntent.amount - paymentIntent.application_fee_amount!,
      currency: 'usd',
      metadata: {
        payment_intent: paymentIntentId,
        type: 'listing_sale',
      },
    },
    {
      stripeAccount: sellerId,
    }
  );

  return payout;
}

// Handle refunds
export async function refundBuyer({
  paymentIntentId,
  reason,
  amount, // optional partial refund
}: {
  paymentIntentId: string;
  reason: string;
  amount?: number;
}) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer',
    amount, // if not provided, refunds full amount
    metadata: {
      dispute_reason: reason,
    },
  });

  return refund;
}

// Webhook handler for Stripe events
export async function handleStripeWebhook(
  payload: string,
  signature: string,
  webhookSecret: string
) {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Payment successful, but still held
      console.log('Payment succeeded, awaiting release');
      break;
      
    case 'account.updated':
      // Seller account verification status changed
      const account = event.data.object as Stripe.Account;
      if (account.charges_enabled && account.payouts_enabled) {
        // Seller is fully verified and can receive payouts
        console.log('Seller account verified:', account.id);
      }
      break;
      
    case 'payout.paid':
      // Funds successfully sent to seller
      console.log('Payout completed');
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
