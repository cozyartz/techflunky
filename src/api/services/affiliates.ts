// Affiliate/Referral Program API
import type { APIContext } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Default commission rates by transaction type
const COMMISSION_RATES = {
  listing_sale: 0.10, // 10% of platform fee
  course_purchase: 0.20, // 20% of course price
  service_purchase: 0.15, // 15% of service price
  subscription: 0.25 // 25% of first month subscription
};

export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  
  try {
    // TODO: Get authenticated user
    const userId = 'temp-user-id';

    // Check if user already has affiliate account
    const existingAffiliate = await DB.prepare(
      'SELECT id FROM affiliates WHERE user_id = ?'
    ).bind(userId).first();

    if (existingAffiliate) {
      return new Response(JSON.stringify({ 
        error: 'User already has an affiliate account' 
      }), { status: 400 });
    }

    // Generate unique referral code
    const referralCode = `TF${userId.slice(-6).toUpperCase()}${Math.random().toString(36).slice(-4).toUpperCase()}`;

    // Create Stripe Express account for payouts
    const stripeAccount = await stripe.accounts.create({
      type: 'express',
      capabilities: {
        transfers: { requested: true }
      },
      metadata: {
        user_id: userId,
        referral_code: referralCode
      }
    });

    // Create affiliate record
    const affiliate = await DB.prepare(`
      INSERT INTO affiliates (
        user_id, referral_code, commission_rate, 
        stripe_express_account_id, status
      ) VALUES (?, ?, ?, ?, 'active')
    `).bind(
      userId,
      referralCode,
      COMMISSION_RATES.listing_sale, // Default rate
      stripeAccount.id
    ).run();

    // Create Stripe account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      refresh_url: `${request.headers.get('origin')}/affiliate/setup?refresh=1`,
      return_url: `${request.headers.get('origin')}/affiliate/dashboard`,
      type: 'account_onboarding'
    });

    return new Response(JSON.stringify({
      success: true,
      affiliateId: affiliate.meta.last_row_id,
      referralCode,
      onboardingUrl: accountLink.url
    }), { status: 201 });

  } catch (error) {
    console.error('Error creating affiliate account:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create affiliate account' 
    }), { status: 500 });
  }
}

// Track referral and create commission
export async function trackReferral(
  referralCode: string, 
  referredUserId: string, 
  transactionType: string, 
  transactionId: string, 
  transactionAmount: number,
  env: any
) {
  const { DB } = env;

  try {
    // Find affiliate by referral code
    const affiliate = await DB.prepare(
      'SELECT * FROM affiliates WHERE referral_code = ? AND status = "active"'
    ).bind(referralCode).first();

    if (!affiliate) {
      console.log(`No active affiliate found for code: ${referralCode}`);
      return;
    }

    // Don't track self-referrals
    if (affiliate.user_id === referredUserId) {
      console.log('Self-referral blocked');
      return;
    }

    // Calculate commission based on transaction type
    const commissionRate = COMMISSION_RATES[transactionType] || 0.10;
    const commissionAmount = Math.floor(transactionAmount * commissionRate);

    // Create referral record
    await DB.prepare(`
      INSERT INTO referrals (
        affiliate_id, referred_user_id, transaction_type, 
        transaction_id, commission_amount
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      affiliate.id,
      referredUserId,
      transactionType,
      transactionId,
      commissionAmount
    ).run();

    // Update affiliate totals
    await DB.prepare(`
      UPDATE affiliates 
      SET total_referrals = total_referrals + 1,
          total_earnings = total_earnings + ?
      WHERE id = ?
    `).bind(commissionAmount, affiliate.id).run();

    // Create notification for affiliate
    await DB.prepare(`
      INSERT INTO notifications (
        user_id, type, title, message
      ) VALUES (?, 'commission_earned', 'Commission Earned', 
                'You earned $${commissionAmount / 100} from a referral!')
    `).bind(affiliate.user_id).run();

    console.log(`Tracked referral: ${referralCode} -> ${transactionType} -> $${commissionAmount / 100}`);

  } catch (error) {
    console.error('Error tracking referral:', error);
  }
}

// Process affiliate payouts (run monthly via cron)
export async function processAffiliatePayout(affiliateId: string, env: any) {
  const { DB } = env;

  try {
    // Get affiliate details
    const affiliate = await DB.prepare(
      'SELECT * FROM affiliates WHERE id = ? AND status = "active"'
    ).bind(affiliateId).first();

    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    // Get unpaid commissions
    const unpaidCommissions = await DB.prepare(`
      SELECT SUM(commission_amount) as total_amount, COUNT(*) as total_count
      FROM referrals 
      WHERE affiliate_id = ? AND commission_paid = FALSE
    `).bind(affiliateId).first();

    if (!unpaidCommissions || unpaidCommissions.total_amount < 10000) { // Minimum $100
      console.log(`Affiliate ${affiliateId} below minimum payout threshold`);
      return;
    }

    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: unpaidCommissions.total_amount,
      currency: 'usd',
      destination: affiliate.stripe_express_account_id,
      metadata: {
        affiliate_id: affiliateId,
        payout_period: new Date().toISOString().slice(0, 7) // YYYY-MM
      }
    });

    // Mark commissions as paid
    await DB.prepare(`
      UPDATE referrals 
      SET commission_paid = TRUE, stripe_transfer_id = ?
      WHERE affiliate_id = ? AND commission_paid = FALSE
    `).bind(transfer.id, affiliateId).run();

    // Create notification
    await DB.prepare(`
      INSERT INTO notifications (
        user_id, type, title, message
      ) VALUES (?, 'payout_sent', 'Affiliate Payout Sent', 
                'Your commission payout of $${unpaidCommissions.total_amount / 100} has been sent.')
    `).bind(affiliate.user_id).run();

    console.log(`Processed payout for affiliate ${affiliateId}: $${unpaidCommissions.total_amount / 100}`);

  } catch (error) {
    console.error('Error processing affiliate payout:', error);
    throw error;
  }
}

export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  
  try {
    // TODO: Get authenticated user
    const userId = 'temp-user-id';

    // Get affiliate details
    const affiliate = await DB.prepare(
      'SELECT * FROM affiliates WHERE user_id = ?'
    ).bind(userId).first();

    if (!affiliate) {
      return new Response(JSON.stringify({ 
        error: 'No affiliate account found' 
      }), { status: 404 });
    }

    // Get recent referrals
    const recentReferrals = await DB.prepare(`
      SELECT r.*, u.name as referred_user_name
      FROM referrals r
      LEFT JOIN users u ON r.referred_user_id = u.id
      WHERE r.affiliate_id = ?
      ORDER BY r.created_at DESC
      LIMIT 50
    `).bind(affiliate.id).all();

    // Get monthly earnings
    const monthlyEarnings = await DB.prepare(`
      SELECT 
        strftime('%Y-%m', datetime(created_at, 'unixepoch')) as month,
        SUM(commission_amount) as earnings,
        COUNT(*) as referrals
      FROM referrals 
      WHERE affiliate_id = ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).bind(affiliate.id).all();

    // Get pending payout amount
    const pendingPayout = await DB.prepare(`
      SELECT SUM(commission_amount) as amount
      FROM referrals 
      WHERE affiliate_id = ? AND commission_paid = FALSE
    `).bind(affiliate.id).first();

    return new Response(JSON.stringify({
      affiliate,
      recentReferrals: recentReferrals.results,
      monthlyEarnings: monthlyEarnings.results,
      pendingPayout: pendingPayout?.amount || 0,
      referralLink: `${url.origin}?ref=${affiliate.referral_code}`
    }));

  } catch (error) {
    console.error('Error fetching affiliate dashboard:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch affiliate dashboard' 
    }), { status: 500 });
  }
}

// Generate referral links for specific items
export async function generateReferralLink(
  affiliateId: string, 
  itemType: string, 
  itemId: string,
  env: any
) {
  const { DB } = env;

  try {
    const affiliate = await DB.prepare(
      'SELECT referral_code FROM affiliates WHERE id = ? AND status = "active"'
    ).bind(affiliateId).first();

    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const baseUrl = env.SITE_URL || 'https://techflunky.com';
    
    const links = {
      listing: `${baseUrl}/listings/${itemId}?ref=${affiliate.referral_code}`,
      course: `${baseUrl}/courses/${itemId}?ref=${affiliate.referral_code}`,
      general: `${baseUrl}?ref=${affiliate.referral_code}`
    };

    return links[itemType] || links.general;

  } catch (error) {
    console.error('Error generating referral link:', error);
    throw error;
  }
}
