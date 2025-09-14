// Network Effects: Referral and Viral Growth System
import type { APIContext } from 'astro';

interface ReferralReward {
  referrer: number; // cents
  referee: number;  // cents
}

const REFERRAL_REWARDS: Record<string, ReferralReward> = {
  signup: { referrer: 500, referee: 200 }, // $5 for referrer, $2 for referee
  first_purchase: { referrer: 2000, referee: 1000 }, // $20 for referrer, $10 for referee
  subscription: { referrer: 5000, referee: 2500 } // $50 for referrer, $25 for referee
};

const VIRAL_THRESHOLDS = {
  influencer: { referrals: 10, bonus: 10000 }, // $100 bonus
  ambassador: { referrals: 25, bonus: 25000 }, // $250 bonus
  evangelist: { referrals: 50, bonus: 50000 }  // $500 bonus
};

// Generate referral code for user
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { userId } = await request.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already has a referral code
    const existingCode = await DB.prepare(`
      SELECT referral_code FROM referral_tracking WHERE referrer_id = ? LIMIT 1
    `).bind(userId).first();

    if (existingCode) {
      return new Response(JSON.stringify({
        referralCode: existingCode.referral_code,
        referralUrl: `https://techflunky.com?ref=${existingCode.referral_code}`,
        message: 'Existing referral code retrieved'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode(DB);

    // Create initial referral tracking record
    await DB.prepare(`
      INSERT INTO referral_tracking
      (referrer_id, referral_code, created_at)
      VALUES (?, ?, ?)
    `).bind(userId, referralCode, Math.floor(Date.now() / 1000)).run();

    // Get user details for personalized sharing
    const user = await DB.prepare(`
      SELECT u.name, p.company FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?
    `).bind(userId).first();

    return new Response(JSON.stringify({
      referralCode,
      referralUrl: `https://techflunky.com?ref=${referralCode}`,
      shareTemplates: generateShareTemplates(user, referralCode),
      rewards: REFERRAL_REWARDS
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating referral code:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate referral code' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get referral stats for user
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get referral stats
    const stats = await DB.prepare(`
      SELECT
        COUNT(CASE WHEN referee_id IS NOT NULL THEN 1 END) as total_referrals,
        COUNT(CASE WHEN conversion_type = 'signup' THEN 1 END) as signup_conversions,
        COUNT(CASE WHEN conversion_type = 'first_purchase' THEN 1 END) as purchase_conversions,
        COUNT(CASE WHEN conversion_type = 'subscription' THEN 1 END) as subscription_conversions,
        SUM(CASE WHEN reward_claimed = 1 THEN reward_amount ELSE 0 END) as total_earned,
        SUM(CASE WHEN reward_claimed = 0 THEN reward_amount ELSE 0 END) as pending_rewards
      FROM referral_tracking
      WHERE referrer_id = ?
    `).bind(userId).first();

    // Get recent referrals
    const recentReferrals = await DB.prepare(`
      SELECT rt.*, u.name as referee_name
      FROM referral_tracking rt
      LEFT JOIN users u ON rt.referee_id = u.id
      WHERE rt.referrer_id = ?
      ORDER BY rt.created_at DESC
      LIMIT 10
    `).bind(userId).all();

    // Get referral code
    const referralCode = await DB.prepare(`
      SELECT DISTINCT referral_code FROM referral_tracking WHERE referrer_id = ? LIMIT 1
    `).bind(userId).first();

    // Calculate viral tier
    const viralTier = calculateViralTier(stats.total_referrals || 0);

    // Calculate conversion rates
    const conversionRates = {
      signupRate: stats.total_referrals ? (stats.signup_conversions / stats.total_referrals * 100) : 0,
      purchaseRate: stats.signup_conversions ? (stats.purchase_conversions / stats.signup_conversions * 100) : 0,
      subscriptionRate: stats.signup_conversions ? (stats.subscription_conversions / stats.signup_conversions * 100) : 0
    };

    return new Response(JSON.stringify({
      referralCode: referralCode?.referral_code,
      referralUrl: referralCode ? `https://techflunky.com?ref=${referralCode.referral_code}` : null,
      stats: {
        totalReferrals: stats.total_referrals || 0,
        signupConversions: stats.signup_conversions || 0,
        purchaseConversions: stats.purchase_conversions || 0,
        subscriptionConversions: stats.subscription_conversions || 0,
        totalEarned: stats.total_earned || 0,
        pendingRewards: stats.pending_rewards || 0
      },
      conversionRates,
      viralTier,
      recentReferrals: recentReferrals.map(r => ({
        ...r,
        createdAt: new Date(r.created_at * 1000).toISOString(),
        convertedAt: r.converted_at ? new Date(r.converted_at * 1000).toISOString() : null
      })),
      nextTierGoal: getNextTierGoal(stats.total_referrals || 0)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting referral stats:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve referral stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Track referral click/visit
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { referralCode, ipAddress, userAgent, source = 'direct' } = await request.json();

    if (!referralCode) {
      return new Response(JSON.stringify({ error: 'Referral code required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find referrer
    const referrer = await DB.prepare(`
      SELECT referrer_id FROM referral_tracking WHERE referral_code = ? LIMIT 1
    `).bind(referralCode).first();

    if (!referrer) {
      return new Response(JSON.stringify({ error: 'Invalid referral code' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create tracking record for click
    await DB.prepare(`
      INSERT INTO referral_tracking
      (referrer_id, referral_code, source, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      referrer.referrer_id,
      referralCode,
      source,
      ipAddress,
      userAgent,
      Math.floor(Date.now() / 1000)
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Referral click tracked'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error tracking referral click:', error);
    return new Response(JSON.stringify({ error: 'Failed to track referral' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Process referral conversion
export async function PATCH({ request, locals }: APIContext) {
  const { DB, STRIPE_SECRET_KEY } = locals.runtime.env;

  try {
    const { referralCode, refereeId, conversionType } = await request.json();

    if (!referralCode || !refereeId || !conversionType) {
      return new Response(JSON.stringify({
        error: 'Referral code, referee ID, and conversion type required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Update referral tracking with conversion
    const updateResult = await DB.prepare(`
      UPDATE referral_tracking
      SET referee_id = ?, conversion_type = ?, converted_at = ?, reward_amount = ?
      WHERE referral_code = ? AND referee_id IS NULL
      ORDER BY created_at DESC LIMIT 1
    `).bind(
      refereeId,
      conversionType,
      now,
      REFERRAL_REWARDS[conversionType]?.referrer || 0,
      referralCode
    ).run();

    if (updateResult.changes === 0) {
      return new Response(JSON.stringify({
        error: 'No matching referral found or already converted'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get referrer details
    const referral = await DB.prepare(`
      SELECT * FROM referral_tracking
      WHERE referral_code = ? AND referee_id = ?
    `).bind(referralCode, refereeId).first();

    // Award rewards to both parties
    const rewards = REFERRAL_REWARDS[conversionType];
    if (rewards) {
      // Award to referrer
      await awardReferralReward(DB, referral.referrer_id, rewards.referrer, conversionType, STRIPE_SECRET_KEY);

      // Award to referee
      await awardReferralReward(DB, refereeId, rewards.referee, conversionType, STRIPE_SECRET_KEY);

      // Update reputation points
      await updateReputationForReferral(DB, referral.referrer_id, conversionType);
    }

    // Check for viral tier bonuses
    const totalReferrals = await DB.prepare(`
      SELECT COUNT(*) as count FROM referral_tracking
      WHERE referrer_id = ? AND conversion_type IS NOT NULL
    `).bind(referral.referrer_id).first();

    await checkViralTierBonus(DB, referral.referrer_id, totalReferrals.count, STRIPE_SECRET_KEY);

    return new Response(JSON.stringify({
      success: true,
      conversionType,
      rewards: {
        referrer: rewards.referrer,
        referee: rewards.referee
      },
      totalReferrals: totalReferrals.count
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing referral conversion:', error);
    return new Response(JSON.stringify({ error: 'Failed to process conversion' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function generateUniqueReferralCode(DB: any): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const exists = await DB.prepare(`
      SELECT 1 FROM referral_tracking WHERE referral_code = ? LIMIT 1
    `).bind(code).first();

    if (!exists) {
      return code;
    }
    attempts++;
  }

  // Fallback with timestamp
  return `REF${Date.now().toString(36).toUpperCase()}`;
}

function generateShareTemplates(user: any, referralCode: string) {
  const name = user?.name || 'A friend';
  const company = user?.company ? ` from ${user.company}` : '';
  const url = `https://techflunky.com?ref=${referralCode}`;

  return {
    email: {
      subject: `${name} invited you to TechFlunky - Get business ideas that actually sell`,
      body: `Hi there!\n\n${name}${company} thought you'd love TechFlunky - the marketplace where you can discover, buy, and sell profitable business ideas.\n\n✨ Browse validated business concepts\n💰 Find ideas with proven market demand\n🚀 Get complete launch packages\n\nUse my referral link and we both get rewards: ${url}\n\nBest regards,\n${name}`
    },
    social: {
      twitter: `Just discovered TechFlunky - amazing marketplace for buying & selling business ideas! 🚀 Join me and let's find our next venture: ${url} #entrepreneur #businessideas #startup`,
      linkedin: `Excited to share TechFlunky${company} - a marketplace for validated business ideas with real market potential. Perfect for entrepreneurs looking for their next venture. Check it out: ${url}`,
      facebook: `Found this incredible platform called TechFlunky where entrepreneurs buy and sell validated business ideas. If you're looking for your next business opportunity, you should check it out: ${url}`
    },
    whatsapp: `Hey! I found this cool platform called TechFlunky where you can buy and sell business ideas that actually work. Thought you might be interested: ${url}`,
    copy: `Join me on TechFlunky - the marketplace for profitable business ideas: ${url}`
  };
}

function calculateViralTier(referralCount: number): string {
  if (referralCount >= VIRAL_THRESHOLDS.evangelist.referrals) return 'Evangelist';
  if (referralCount >= VIRAL_THRESHOLDS.ambassador.referrals) return 'Ambassador';
  if (referralCount >= VIRAL_THRESHOLDS.influencer.referrals) return 'Influencer';
  return 'Starter';
}

function getNextTierGoal(referralCount: number) {
  if (referralCount < VIRAL_THRESHOLDS.influencer.referrals) {
    return {
      tier: 'Influencer',
      target: VIRAL_THRESHOLDS.influencer.referrals,
      remaining: VIRAL_THRESHOLDS.influencer.referrals - referralCount,
      bonus: VIRAL_THRESHOLDS.influencer.bonus
    };
  } else if (referralCount < VIRAL_THRESHOLDS.ambassador.referrals) {
    return {
      tier: 'Ambassador',
      target: VIRAL_THRESHOLDS.ambassador.referrals,
      remaining: VIRAL_THRESHOLDS.ambassador.referrals - referralCount,
      bonus: VIRAL_THRESHOLDS.ambassador.bonus
    };
  } else if (referralCount < VIRAL_THRESHOLDS.evangelist.referrals) {
    return {
      tier: 'Evangelist',
      target: VIRAL_THRESHOLDS.evangelist.referrals,
      remaining: VIRAL_THRESHOLDS.evangelist.referrals - referralCount,
      bonus: VIRAL_THRESHOLDS.evangelist.bonus
    };
  }
  return null; // Already at highest tier
}

async function awardReferralReward(DB: any, userId: string, amount: number, type: string, stripeSecretKey: string) {
  // In production, this would create a Stripe transfer or credit
  // For now, we'll track it in the database
  await DB.prepare(`
    INSERT INTO revenue_analytics
    (transaction_type, transaction_id, gross_amount, platform_fee, net_amount, user_id, metadata, created_at)
    VALUES ('referral_reward', ?, ?, 0, ?, ?, ?, ?)
  `).bind(
    `referral_${type}_${Date.now()}`,
    amount,
    amount,
    userId,
    JSON.stringify({ type, source: 'referral_program' }),
    Math.floor(Date.now() / 1000)
  ).run();
}

async function updateReputationForReferral(DB: any, userId: string, conversionType: string) {
  const points = {
    signup: 100,
    first_purchase: 200,
    subscription: 500
  };

  const pointsAwarded = points[conversionType as keyof typeof points] || 0;

  if (pointsAwarded > 0) {
    await fetch('/api/gamification/reputation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action: 'referral_converted',
        data: { conversionType, pointsAwarded }
      })
    });
  }
}

async function checkViralTierBonus(DB: any, userId: string, totalReferrals: number, stripeSecretKey: string) {
  for (const [tier, config] of Object.entries(VIRAL_THRESHOLDS)) {
    if (totalReferrals === config.referrals) {
      // User just hit this tier - award bonus
      await awardReferralReward(DB, userId, config.bonus, `viral_tier_${tier}`, stripeSecretKey);

      // Trigger achievement
      await fetch('/api/gamification/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          triggerType: 'viral_tier_reached',
          data: { tier, referrals: totalReferrals, bonus: config.bonus }
        })
      });

      break;
    }
  }
}