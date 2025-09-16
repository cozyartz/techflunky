// Marketplace Fee Structure - 8% Success Fee Model
import type { APIContext } from 'astro';

// Marketplace fee configuration
const MARKETPLACE_FEES = {
  BASE_SUCCESS_FEE_RATE: 0.10, // 10% base success fee for non-members
  MEMBER_SUCCESS_FEE_RATE: 0.08, // 8% success fee for members (2% discount)
  MEMBER_DISCOUNT: 0.02, // 2% member discount
  LISTING_FEE: 0, // Free listings
  PREMIUM_BOOST_FEE: 2900, // $29/month for premium boost
  SYNDICATE_SETUP_FEE: 29900, // $299 setup for syndicates
};

// Premium service pricing
const PREMIUM_SERVICES = {
  whiteLabelPortal: {
    basic: 49900, // $499/month
    premium: 79900, // $799/month
    enterprise: 99900, // $999/month
  },
  prioritySupport: 9900, // $99/month
  customIntegrations: {
    setup: 249900, // $2,499 setup
    monthly: 29900, // $299/month maintenance
  },
  professionalServices: {
    customAIReport: 9900, // $99 per report
    dueDiligenceService: 49900, // $499 per deal
    marketIntelligence: 19900, // $199/hour
  }
};

// Calculate platform fee for completed transaction
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const {
      transactionId,
      grossAmount,
      transactionType = 'listing_sale',
      userId,
      isMember = false, // Member status determines fee rate
      metadata = {}
    } = await request.json();

    if (!transactionId || !grossAmount || !userId) {
      return new Response(JSON.stringify({
        error: 'Transaction ID, gross amount, and user ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate platform fee based on transaction type
    let platformFee = 0;
    let feeRate = 0;

    switch (transactionType) {
      case 'listing_sale':
        feeRate = isMember ? MARKETPLACE_FEES.MEMBER_SUCCESS_FEE_RATE : MARKETPLACE_FEES.BASE_SUCCESS_FEE_RATE;
        platformFee = Math.round(grossAmount * feeRate);
        break;
      case 'premium_boost':
        platformFee = grossAmount; // Full amount for premium services
        break;
      case 'syndicate_setup':
        platformFee = grossAmount; // Full amount for setup fees
        break;
      case 'white_label_service':
        platformFee = grossAmount; // Full amount for subscription services
        break;
      default:
        feeRate = isMember ? MARKETPLACE_FEES.MEMBER_SUCCESS_FEE_RATE : MARKETPLACE_FEES.BASE_SUCCESS_FEE_RATE;
        platformFee = Math.round(grossAmount * feeRate);
    }

    const netAmount = grossAmount - platformFee;
    const now = Math.floor(Date.now() / 1000);

    // Record revenue analytics
    const result = await DB.prepare(`
      INSERT INTO revenue_analytics (
        transaction_type, transaction_id, gross_amount, platform_fee,
        net_amount, user_id, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      transactionType,
      transactionId,
      grossAmount,
      platformFee,
      netAmount,
      userId,
      JSON.stringify({
        ...metadata,
        feeRate,
        calculatedAt: now
      }),
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      revenueId: result.meta.last_row_id,
      grossAmount,
      platformFee,
      netAmount,
      feeRate: Math.round(feeRate * 100), // Return as percentage
      message: 'Platform fee calculated and recorded'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error calculating platform fee:', error);
    return new Response(JSON.stringify({ error: 'Failed to calculate platform fee' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get fee structure information
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');
  const serviceType = url.searchParams.get('service');

  try {
    let response = {
      marketplaceFees: {
        baseSuccessFeeRate: MARKETPLACE_FEES.BASE_SUCCESS_FEE_RATE * 100, // 10% for non-members
        memberSuccessFeeRate: MARKETPLACE_FEES.MEMBER_SUCCESS_FEE_RATE * 100, // 8% for members
        memberDiscount: MARKETPLACE_FEES.MEMBER_DISCOUNT * 100, // 2% savings
        listingFee: MARKETPLACE_FEES.LISTING_FEE,
        premiumBoostFee: MARKETPLACE_FEES.PREMIUM_BOOST_FEE,
        syndicateSetupFee: MARKETPLACE_FEES.SYNDICATE_SETUP_FEE,
      },
      premiumServices: PREMIUM_SERVICES
    };

    // If user ID provided, get their transaction history with fees
    if (userId) {
      const userFeeHistory = await DB.prepare(`
        SELECT
          transaction_type,
          SUM(gross_amount) as total_gross,
          SUM(platform_fee) as total_fees_paid,
          SUM(net_amount) as total_net,
          COUNT(*) as transaction_count,
          AVG(platform_fee * 100.0 / gross_amount) as avg_fee_rate
        FROM revenue_analytics
        WHERE user_id = ?
        GROUP BY transaction_type
        ORDER BY total_gross DESC
      `).bind(userId).all();

      response = {
        ...response,
        userFeeHistory: userFeeHistory.map(row => ({
          ...row,
          avg_fee_rate: Math.round(row.avg_fee_rate || 0),
          total_gross_formatted: `$${(row.total_gross / 100).toLocaleString()}`,
          total_fees_formatted: `$${(row.total_fees_paid / 100).toLocaleString()}`,
          total_net_formatted: `$${(row.total_net / 100).toLocaleString()}`
        }))
      };
    }

    // If specific service requested, return detailed pricing
    if (serviceType && PREMIUM_SERVICES[serviceType]) {
      response = {
        ...response,
        serviceDetails: {
          service: serviceType,
          pricing: PREMIUM_SERVICES[serviceType],
          description: getServiceDescription(serviceType)
        }
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting fee structure:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve fee structure' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Calculate estimated fees for a transaction
export async function PUT({ request, locals }: APIContext) {
  try {
    const { amount, transactionType = 'listing_sale', isMember = false } = await request.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({
        error: 'Valid amount required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let platformFee = 0;
    let feeRate = 0;

    switch (transactionType) {
      case 'listing_sale':
        feeRate = isMember ? MARKETPLACE_FEES.MEMBER_SUCCESS_FEE_RATE : MARKETPLACE_FEES.BASE_SUCCESS_FEE_RATE;
        platformFee = Math.round(amount * feeRate);
        break;
      case 'premium_boost':
        platformFee = MARKETPLACE_FEES.PREMIUM_BOOST_FEE;
        feeRate = platformFee / amount;
        break;
      case 'syndicate_setup':
        platformFee = MARKETPLACE_FEES.SYNDICATE_SETUP_FEE;
        feeRate = platformFee / amount;
        break;
      default:
        feeRate = isMember ? MARKETPLACE_FEES.MEMBER_SUCCESS_FEE_RATE : MARKETPLACE_FEES.BASE_SUCCESS_FEE_RATE;
        platformFee = Math.round(amount * feeRate);
    }

    const netAmount = amount - platformFee;

    return new Response(JSON.stringify({
      grossAmount: amount,
      platformFee,
      netAmount,
      feeRate: Math.round(feeRate * 100),
      breakdown: {
        grossFormatted: `$${(amount / 100).toLocaleString()}`,
        feeFormatted: `$${(platformFee / 100).toLocaleString()}`,
        netFormatted: `$${(netAmount / 100).toLocaleString()}`,
        feePercentage: `${Math.round(feeRate * 100)}%`
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error calculating estimated fees:', error);
    return new Response(JSON.stringify({ error: 'Failed to calculate estimated fees' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function getServiceDescription(serviceType: string): string {
  const descriptions = {
    whiteLabelPortal: 'Branded investor portal with custom domain and advanced analytics',
    prioritySupport: 'Dedicated support team with guaranteed response times',
    customIntegrations: 'Custom API integrations and enterprise development services',
    professionalServices: 'Expert analysis, due diligence, and market intelligence services'
  };

  return descriptions[serviceType] || 'Premium service offering';
}

// Export fee constants for use in other modules
export { MARKETPLACE_FEES, PREMIUM_SERVICES };