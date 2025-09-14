// User Reputation and Scoring System
import type { APIContext } from 'astro';

interface ReputationData {
  userId: string;
  totalPoints: number;
  sellerScore: number;
  buyerScore: number;
  trustLevel: string;
  responseTimeAvg: number;
  completionRate: number;
  streakDays: number;
  lastActiveDate: number;
}

const TRUST_LEVELS = {
  new: { minPoints: 0, benefits: [] },
  verified: { minPoints: 500, benefits: ['verified_badge', 'priority_support'] },
  trusted: { minPoints: 2000, benefits: ['verified_badge', 'priority_support', 'featured_listings'] },
  expert: { minPoints: 10000, benefits: ['verified_badge', 'priority_support', 'featured_listings', 'expert_consultation'] },
  legendary: { minPoints: 50000, benefits: ['all_benefits', 'vip_access', 'beta_features'] }
};

// GET user reputation
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
    // Get or create user reputation
    let reputation = await DB.prepare(`
      SELECT * FROM user_reputation WHERE user_id = ?
    `).bind(userId).first();

    if (!reputation) {
      // Create initial reputation record
      const now = Math.floor(Date.now() / 1000);
      await DB.prepare(`
        INSERT INTO user_reputation
        (user_id, total_points, seller_score, buyer_score, trust_level,
         response_time_avg, completion_rate, streak_days, last_active_date, created_at, updated_at)
        VALUES (?, 0, 0, 0, 'new', NULL, 0, 0, ?, ?, ?)
      `).bind(userId, now, now, now).run();

      reputation = {
        user_id: userId,
        total_points: 0,
        seller_score: 0,
        buyer_score: 0,
        trust_level: 'new',
        response_time_avg: null,
        completion_rate: 0,
        streak_days: 0,
        last_active_date: now,
        created_at: now,
        updated_at: now
      };
    }

    // Get additional metrics
    const additionalMetrics = await getAdditionalMetrics(DB, userId);

    // Calculate current trust level based on points
    const currentTrustLevel = calculateTrustLevel(reputation.total_points);

    // Update trust level if changed
    if (currentTrustLevel !== reputation.trust_level) {
      await DB.prepare(`
        UPDATE user_reputation SET trust_level = ?, updated_at = ?
        WHERE user_id = ?
      `).bind(currentTrustLevel, Math.floor(Date.now() / 1000), userId).run();
      reputation.trust_level = currentTrustLevel;
    }

    const result = {
      userId: reputation.user_id,
      totalPoints: reputation.total_points,
      sellerScore: reputation.seller_score,
      buyerScore: reputation.buyer_score,
      trustLevel: reputation.trust_level,
      responseTimeAvg: reputation.response_time_avg,
      completionRate: reputation.completion_rate,
      streakDays: reputation.streak_days,
      lastActiveDate: reputation.last_active_date,
      ...additionalMetrics,
      benefits: TRUST_LEVELS[reputation.trust_level as keyof typeof TRUST_LEVELS]?.benefits || [],
      nextLevel: getNextLevel(reputation.trust_level),
      progressToNext: calculateProgressToNextLevel(reputation.total_points, reputation.trust_level)
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting reputation:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve reputation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update user reputation based on actions
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { userId, action, data = {} } = await request.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);
    let pointsAwarded = 0;
    let updates: Record<string, any> = { updated_at: now };

    switch (action) {
      case 'listing_created':
        pointsAwarded = 50;
        break;

      case 'sale_completed':
        pointsAwarded = 200;
        // Update seller metrics
        const sellerStats = await calculateSellerStats(DB, userId);
        updates.seller_score = sellerStats.averageRating;
        updates.completion_rate = sellerStats.completionRate;
        break;

      case 'purchase_completed':
        pointsAwarded = 100;
        // Update buyer metrics
        const buyerStats = await calculateBuyerStats(DB, userId);
        updates.buyer_score = buyerStats.averageRating;
        break;

      case 'review_left':
        pointsAwarded = 25;
        break;

      case 'review_received':
        const { rating } = data;
        if (rating >= 4) pointsAwarded = 30;
        else if (rating >= 3) pointsAwarded = 15;
        break;

      case 'message_responded':
        const { responseTime } = data; // in minutes
        pointsAwarded = responseTime <= 60 ? 10 : 5;
        // Update response time average
        await updateResponseTime(DB, userId, responseTime);
        break;

      case 'referral_converted':
        pointsAwarded = 500;
        break;

      case 'daily_login':
        pointsAwarded = 10;
        // Update activity streak
        await updateActivityStreak(DB, userId);
        break;

      case 'profile_completed':
        pointsAwarded = 100;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // Update reputation
    await DB.prepare(`
      INSERT OR REPLACE INTO user_reputation
      (user_id, total_points, seller_score, buyer_score, trust_level,
       response_time_avg, completion_rate, streak_days, last_active_date, created_at, updated_at)
      VALUES (
        ?,
        COALESCE((SELECT total_points FROM user_reputation WHERE user_id = ?), 0) + ?,
        COALESCE(?, (SELECT seller_score FROM user_reputation WHERE user_id = ?), 0),
        COALESCE(?, (SELECT buyer_score FROM user_reputation WHERE user_id = ?), 0),
        COALESCE(?, (SELECT trust_level FROM user_reputation WHERE user_id = ?), 'new'),
        COALESCE(?, (SELECT response_time_avg FROM user_reputation WHERE user_id = ?)),
        COALESCE(?, (SELECT completion_rate FROM user_reputation WHERE user_id = ?), 0),
        COALESCE(?, (SELECT streak_days FROM user_reputation WHERE user_id = ?), 0),
        ?,
        COALESCE((SELECT created_at FROM user_reputation WHERE user_id = ?), ?),
        ?
      )
    `).bind(
      userId,
      userId, pointsAwarded,
      updates.seller_score, userId,
      updates.buyer_score, userId,
      updates.trust_level, userId,
      updates.response_time_avg, userId,
      updates.completion_rate, userId,
      updates.streak_days, userId,
      now,
      userId, now,
      now
    ).run();

    // Check for achievements
    await checkAchievements(DB, userId, action, data);

    return new Response(JSON.stringify({
      success: true,
      pointsAwarded,
      action
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating reputation:', error);
    return new Response(JSON.stringify({ error: 'Failed to update reputation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET leaderboard
export async function OPTIONS({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const timeframe = url.searchParams.get('timeframe') || 'all'; // all, monthly, weekly
  const category = url.searchParams.get('category') || 'points'; // points, seller, buyer

  try {
    let dateFilter = '';
    if (timeframe === 'monthly') {
      const monthAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
      dateFilter = `AND ur.updated_at >= ${monthAgo}`;
    } else if (timeframe === 'weekly') {
      const weekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      dateFilter = `AND ur.updated_at >= ${weekAgo}`;
    }

    const orderBy = category === 'seller' ? 'ur.seller_score DESC' :
                   category === 'buyer' ? 'ur.buyer_score DESC' :
                   'ur.total_points DESC';

    const leaderboard = await DB.prepare(`
      SELECT ur.*, u.name, p.avatar_url, p.company,
             ROW_NUMBER() OVER (ORDER BY ${orderBy}) as rank
      FROM user_reputation ur
      JOIN users u ON ur.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE ur.total_points > 0 ${dateFilter}
      ORDER BY ${orderBy}
      LIMIT 50
    `).all();

    return new Response(JSON.stringify({
      leaderboard: leaderboard.map(user => ({
        rank: user.rank,
        userId: user.user_id,
        name: user.name,
        company: user.company,
        avatarUrl: user.avatar_url,
        totalPoints: user.total_points,
        sellerScore: user.seller_score,
        buyerScore: user.buyer_score,
        trustLevel: user.trust_level,
        streakDays: user.streak_days
      })),
      timeframe,
      category
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve leaderboard' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getAdditionalMetrics(DB: any, userId: string) {
  // Get listing metrics
  const listingMetrics = await DB.prepare(`
    SELECT COUNT(*) as total_listings,
           COUNT(CASE WHEN status = 'active' THEN 1 END) as active_listings,
           COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_listings
    FROM listings WHERE seller_id = ?
  `).bind(userId).first();

  // Get transaction metrics
  const transactionMetrics = await DB.prepare(`
    SELECT COUNT(CASE WHEN seller_id = ? THEN 1 END) as sales_count,
           COUNT(CASE WHEN buyer_id = ? THEN 1 END) as purchases_count,
           SUM(CASE WHEN seller_id = ? THEN amount ELSE 0 END) as total_revenue
    FROM offers WHERE status = 'completed'
  `).bind(userId, userId, userId).first();

  return {
    totalListings: listingMetrics.total_listings || 0,
    activeListings: listingMetrics.active_listings || 0,
    soldListings: listingMetrics.sold_listings || 0,
    salesCount: transactionMetrics.sales_count || 0,
    purchasesCount: transactionMetrics.purchases_count || 0,
    totalRevenue: transactionMetrics.total_revenue || 0
  };
}

async function calculateSellerStats(DB: any, userId: string) {
  const stats = await DB.prepare(`
    SELECT AVG(r.rating) as avg_rating,
           COUNT(CASE WHEN o.status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as completion_rate
    FROM offers o
    LEFT JOIN reviews r ON o.id = r.offer_id
    WHERE o.seller_id = ?
  `).bind(userId).first();

  return {
    averageRating: stats.avg_rating || 0,
    completionRate: stats.completion_rate || 0
  };
}

async function calculateBuyerStats(DB: any, userId: string) {
  const stats = await DB.prepare(`
    SELECT AVG(r.rating) as avg_rating
    FROM offers o
    LEFT JOIN reviews r ON o.id = r.offer_id AND r.reviewer_id = ?
    WHERE o.buyer_id = ?
  `).bind(userId, userId).first();

  return {
    averageRating: stats.avg_rating || 0
  };
}

async function updateResponseTime(DB: any, userId: string, responseTime: number) {
  await DB.prepare(`
    UPDATE user_reputation
    SET response_time_avg = CASE
      WHEN response_time_avg IS NULL THEN ?
      ELSE (response_time_avg + ?) / 2
    END
    WHERE user_id = ?
  `).bind(responseTime, responseTime, userId).run();
}

async function updateActivityStreak(DB: any, userId: string) {
  const yesterday = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const twoDaysAgo = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000);

  const lastActive = await DB.prepare(`
    SELECT last_active_date FROM user_reputation WHERE user_id = ?
  `).bind(userId).first();

  let newStreak = 1;

  if (lastActive && lastActive.last_active_date >= yesterday) {
    // Continue streak
    const currentStreak = await DB.prepare(`
      SELECT streak_days FROM user_reputation WHERE user_id = ?
    `).bind(userId).first();
    newStreak = (currentStreak?.streak_days || 0) + 1;
  } else if (lastActive && lastActive.last_active_date < twoDaysAgo) {
    // Reset streak
    newStreak = 1;
  }

  await DB.prepare(`
    UPDATE user_reputation
    SET streak_days = ?, last_active_date = ?
    WHERE user_id = ?
  `).bind(newStreak, Math.floor(Date.now() / 1000), userId).run();
}

function calculateTrustLevel(totalPoints: number): string {
  for (const [level, config] of Object.entries(TRUST_LEVELS).reverse()) {
    if (totalPoints >= config.minPoints) {
      return level;
    }
  }
  return 'new';
}

function getNextLevel(currentLevel: string): { level: string; minPoints: number } | null {
  const levels = Object.keys(TRUST_LEVELS);
  const currentIndex = levels.indexOf(currentLevel);

  if (currentIndex < levels.length - 1) {
    const nextLevel = levels[currentIndex + 1];
    return {
      level: nextLevel,
      minPoints: TRUST_LEVELS[nextLevel as keyof typeof TRUST_LEVELS].minPoints
    };
  }

  return null;
}

function calculateProgressToNextLevel(totalPoints: number, currentLevel: string): number {
  const nextLevel = getNextLevel(currentLevel);
  if (!nextLevel) return 100;

  const currentLevelPoints = TRUST_LEVELS[currentLevel as keyof typeof TRUST_LEVELS].minPoints;
  const pointsNeeded = nextLevel.minPoints - currentLevelPoints;
  const pointsEarned = totalPoints - currentLevelPoints;

  return Math.min(100, (pointsEarned / pointsNeeded) * 100);
}

async function checkAchievements(DB: any, userId: string, action: string, data: any) {
  // Trigger achievement check API
  try {
    await fetch('/api/gamification/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, triggerType: action, data })
    });
  } catch (error) {
    console.error('Error triggering achievement check:', error);
  }
}