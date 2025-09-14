// Social Proof and Viral Growth Features
import type { APIContext } from 'astro';

interface SocialAction {
  userId: string;
  actionType: 'share' | 'like' | 'follow' | 'recommend' | 'invite';
  targetType: 'listing' | 'user' | 'platform';
  targetId?: string;
  platform?: string;
  metadata?: Record<string, any>;
}

// Record social action
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const action: SocialAction = await request.json();
    const { userId, actionType, targetType, targetId, platform, metadata = {} } = action;

    if (!userId || !actionType || !targetType) {
      return new Response(JSON.stringify({
        error: 'User ID, action type, and target type required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Record the social action
    await DB.prepare(`
      INSERT INTO social_actions
      (user_id, action_type, target_type, target_id, platform, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      actionType,
      targetType,
      targetId,
      platform,
      JSON.stringify(metadata),
      now
    ).run();

    // Award reputation points for social engagement
    const pointsMap = {
      share: 15,
      like: 5,
      follow: 10,
      recommend: 25,
      invite: 30
    };

    const points = pointsMap[actionType] || 0;
    if (points > 0) {
      await fetch('/api/gamification/reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'social_engagement',
          data: { actionType, points }
        })
      });
    }

    // Update social proof metrics
    if (targetId) {
      await updateSocialProofMetrics(DB, targetType, targetId, actionType);
    }

    // Generate viral insights
    const viralInsights = await generateViralInsights(DB, userId, actionType);

    return new Response(JSON.stringify({
      success: true,
      pointsAwarded: points,
      viralInsights
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error recording social action:', error);
    return new Response(JSON.stringify({ error: 'Failed to record social action' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get social proof data for display
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const targetType = url.searchParams.get('targetType');
  const targetId = url.searchParams.get('targetId');
  const timeframe = url.searchParams.get('timeframe') || '7'; // days

  if (!targetType) {
    return new Response(JSON.stringify({ error: 'Target type required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const timeframeSecs = parseInt(timeframe) * 24 * 60 * 60;
    const cutoffTime = Math.floor(Date.now() / 1000) - timeframeSecs;

    let socialProof;

    if (targetType === 'platform') {
      // Platform-wide social proof
      socialProof = await getPlatformSocialProof(DB, cutoffTime);
    } else if (targetType === 'listing' && targetId) {
      // Listing-specific social proof
      socialProof = await getListingSocialProof(DB, targetId, cutoffTime);
    } else if (targetType === 'user' && targetId) {
      // User-specific social proof
      socialProof = await getUserSocialProof(DB, targetId, cutoffTime);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid target type or missing target ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(socialProof), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting social proof:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve social proof' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get trending content and FOMO triggers
export async function OPTIONS({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const category = url.searchParams.get('category') || 'all';

  try {
    // Get trending listings (most social activity in last 24 hours)
    const trending = await DB.prepare(`
      SELECT l.id, l.title, l.price, l.industry, l.category,
             COUNT(sa.id) as social_activity_count,
             MAX(sa.created_at) as last_activity
      FROM listings l
      JOIN social_actions sa ON l.id = sa.target_id AND sa.target_type = 'listing'
      WHERE sa.created_at > ? AND l.status = 'active'
        ${category !== 'all' ? 'AND l.category = ?' : ''}
      GROUP BY l.id
      HAVING social_activity_count >= 3
      ORDER BY social_activity_count DESC, last_activity DESC
      LIMIT 10
    `).bind(
      Math.floor(Date.now() / 1000) - (24 * 60 * 60),
      ...(category !== 'all' ? [category] : [])
    ).all();

    // Get recent purchases for FOMO
    const recentPurchases = await DB.prepare(`
      SELECT o.amount, l.title, l.industry, u.name as buyer_name, o.created_at,
             p.company
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      JOIN users u ON o.buyer_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE o.status = 'completed' AND o.created_at > ?
      ORDER BY o.created_at DESC
      LIMIT 5
    `).bind(Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60)).all();

    // Get platform momentum metrics
    const momentum = await DB.prepare(`
      SELECT
        COUNT(CASE WHEN u.created_at > ? THEN 1 END) as new_users_24h,
        COUNT(CASE WHEN l.created_at > ? THEN 1 END) as new_listings_24h,
        COUNT(CASE WHEN o.created_at > ? THEN 1 END) as new_deals_24h,
        COUNT(CASE WHEN sa.created_at > ? THEN 1 END) as social_actions_24h
      FROM users u
      CROSS JOIN listings l
      CROSS JOIN offers o
      CROSS JOIN social_actions sa
      WHERE u.created_at > ? OR l.created_at > ? OR o.created_at > ? OR sa.created_at > ?
    `).bind(
      ...(new Array(8).fill(Math.floor(Date.now() / 1000) - (24 * 60 * 60)))
    ).first();

    // Generate FOMO messages
    const fomoMessages = generateFOMOMessages(recentPurchases, momentum);

    return new Response(JSON.stringify({
      trending: trending.map(t => ({
        ...t,
        formattedPrice: `$${(t.price / 100).toLocaleString()}`,
        lastActivity: new Date(t.last_activity * 1000).toISOString()
      })),
      recentPurchases: recentPurchases.map(p => ({
        ...p,
        formattedAmount: `$${(p.amount / 100).toLocaleString()}`,
        buyerDisplay: p.company || p.buyer_name,
        timeAgo: getTimeAgo(p.created_at)
      })),
      momentum,
      fomoMessages,
      socialVelocity: calculateSocialVelocity(trending)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting trending data:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve trending data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateSocialProofMetrics(DB: any, targetType: string, targetId: string, actionType: string) {
  if (targetType === 'listing') {
    // Update listing metrics based on social action
    if (actionType === 'like' || actionType === 'share') {
      await DB.prepare(`
        UPDATE listings
        SET favorites_count = favorites_count + 1, updated_at = ?
        WHERE id = ?
      `).bind(Math.floor(Date.now() / 1000), targetId).run();
    }

    if (actionType === 'share') {
      // Track viral coefficient
      await DB.prepare(`
        INSERT INTO analytics
        (listing_id, event_type, metadata, created_at)
        VALUES (?, 'viral_share', ?, ?)
      `).bind(targetId, JSON.stringify({ platform: actionType }), Math.floor(Date.now() / 1000)).run();
    }
  }
}

async function generateViralInsights(DB: any, userId: string, actionType: string) {
  // Get user's social engagement history
  const userStats = await DB.prepare(`
    SELECT
      COUNT(*) as total_actions,
      COUNT(CASE WHEN action_type = 'share' THEN 1 END) as shares,
      COUNT(CASE WHEN action_type = 'invite' THEN 1 END) as invites,
      COUNT(CASE WHEN created_at > ? THEN 1 END) as recent_actions
    FROM social_actions
    WHERE user_id = ?
  `).bind(Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), userId).first();

  // Calculate viral score
  const viralScore = Math.min(100, (userStats.shares * 5 + userStats.invites * 10 + userStats.recent_actions * 2));

  let insights = [];

  if (viralScore >= 80) {
    insights.push('🔥 You\'re a viral superstar! Your engagement is driving platform growth.');
  } else if (viralScore >= 50) {
    insights.push('🚀 Great social engagement! Keep sharing to unlock more rewards.');
  } else if (viralScore >= 20) {
    insights.push('💪 Building momentum! Share more content to increase your viral score.');
  } else {
    insights.push('🌱 Start your viral journey by sharing content you love!');
  }

  return {
    viralScore,
    insights,
    nextReward: getNextSocialReward(userStats.total_actions)
  };
}

async function getPlatformSocialProof(DB: any, cutoffTime: number) {
  const stats = await DB.prepare(`
    SELECT
      COUNT(CASE WHEN action_type = 'share' THEN 1 END) as shares,
      COUNT(CASE WHEN action_type = 'like' THEN 1 END) as likes,
      COUNT(CASE WHEN action_type = 'follow' THEN 1 END) as follows,
      COUNT(CASE WHEN action_type = 'recommend' THEN 1 END) as recommendations,
      COUNT(DISTINCT user_id) as active_users
    FROM social_actions
    WHERE created_at > ?
  `).bind(cutoffTime).first();

  const totalEngagement = stats.shares + stats.likes + stats.follows + stats.recommendations;

  return {
    totalEngagement,
    breakdown: {
      shares: stats.shares,
      likes: stats.likes,
      follows: stats.follows,
      recommendations: stats.recommendations
    },
    activeUsers: stats.active_users,
    engagementRate: stats.active_users > 0 ? (totalEngagement / stats.active_users) : 0
  };
}

async function getListingSocialProof(DB: any, listingId: string, cutoffTime: number) {
  const stats = await DB.prepare(`
    SELECT
      COUNT(CASE WHEN action_type = 'share' THEN 1 END) as shares,
      COUNT(CASE WHEN action_type = 'like' THEN 1 END) as likes,
      COUNT(CASE WHEN action_type = 'recommend' THEN 1 END) as recommendations,
      COUNT(DISTINCT user_id) as unique_engagers
    FROM social_actions
    WHERE target_id = ? AND target_type = 'listing' AND created_at > ?
  `).bind(listingId, cutoffTime).first();

  // Get recent engagers
  const recentEngagers = await DB.prepare(`
    SELECT DISTINCT u.name, p.avatar_url, sa.action_type, sa.created_at
    FROM social_actions sa
    JOIN users u ON sa.user_id = u.id
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE sa.target_id = ? AND sa.target_type = 'listing' AND sa.created_at > ?
    ORDER BY sa.created_at DESC
    LIMIT 5
  `).bind(listingId, cutoffTime).all();

  return {
    ...stats,
    totalEngagement: stats.shares + stats.likes + stats.recommendations,
    recentEngagers: recentEngagers.map(e => ({
      ...e,
      timeAgo: getTimeAgo(e.created_at)
    })),
    socialScore: calculateListingSocialScore(stats)
  };
}

async function getUserSocialProof(DB: any, userId: string, cutoffTime: number) {
  const stats = await DB.prepare(`
    SELECT
      COUNT(*) as total_actions,
      COUNT(CASE WHEN action_type = 'share' THEN 1 END) as shares,
      COUNT(CASE WHEN action_type = 'recommend' THEN 1 END) as recommendations_given,
      COUNT(DISTINCT target_id) as unique_interactions
    FROM social_actions
    WHERE user_id = ? AND created_at > ?
  `).bind(userId, cutoffTime).first();

  // Get recommendations received
  const recommendationsReceived = await DB.prepare(`
    SELECT COUNT(*) as count
    FROM social_actions
    WHERE target_id = ? AND target_type = 'user' AND action_type = 'recommend' AND created_at > ?
  `).bind(userId, cutoffTime).first();

  return {
    actionsGiven: stats.total_actions,
    sharesGiven: stats.shares,
    recommendationsGiven: stats.recommendations_given,
    recommendationsReceived: recommendationsReceived.count,
    uniqueInteractions: stats.unique_interactions,
    socialInfluence: calculateSocialInfluence(stats, recommendationsReceived.count)
  };
}

function generateFOMOMessages(recentPurchases: any[], momentum: any) {
  const messages = [];

  if (recentPurchases.length > 0) {
    const latest = recentPurchases[0];
    messages.push(`🔥 ${latest.buyerDisplay} just bought "${latest.title}" for ${latest.formattedAmount}!`);
  }

  if (momentum.new_users_24h > 0) {
    messages.push(`👥 ${momentum.new_users_24h} entrepreneurs joined in the last 24 hours!`);
  }

  if (momentum.new_listings_24h > 0) {
    messages.push(`💡 ${momentum.new_listings_24h} new business ideas added today!`);
  }

  if (momentum.new_deals_24h > 0) {
    messages.push(`💰 ${momentum.new_deals_24h} deals closed in the last 24 hours!`);
  }

  return messages.slice(0, 3); // Return top 3 messages
}

function calculateSocialVelocity(trending: any[]) {
  if (trending.length === 0) return 0;

  const totalActivity = trending.reduce((sum, item) => sum + item.social_activity_count, 0);
  const avgActivityPerListing = totalActivity / trending.length;

  // Normalize to 0-100 scale
  return Math.min(100, Math.round(avgActivityPerListing * 10));
}

function calculateListingSocialScore(stats: any): number {
  const { shares, likes, recommendations, unique_engagers } = stats;

  // Weighted scoring system
  const score = (shares * 10) + (likes * 3) + (recommendations * 15) + (unique_engagers * 5);

  // Normalize to 0-100 scale
  return Math.min(100, Math.round(score / 2));
}

function calculateSocialInfluence(givenStats: any, recommendationsReceived: number): number {
  const { total_actions, shares, recommendations_given, unique_interactions } = givenStats;

  // Calculate influence based on actions given and received
  const influenceScore = (shares * 2) + (recommendations_given * 5) + (recommendationsReceived * 8) + unique_interactions;

  return Math.min(100, Math.round(influenceScore / 3));
}

function getNextSocialReward(totalActions: number) {
  const rewards = [
    { threshold: 10, reward: 'Social Starter Badge', points: 100 },
    { threshold: 25, reward: 'Community Builder Badge', points: 250 },
    { threshold: 50, reward: 'Viral Creator Badge', points: 500 },
    { threshold: 100, reward: 'Social Influencer Badge', points: 1000 },
    { threshold: 250, reward: 'Platform Ambassador Badge', points: 2500 }
  ];

  for (const reward of rewards) {
    if (totalActions < reward.threshold) {
      return {
        ...reward,
        actionsNeeded: reward.threshold - totalActions
      };
    }
  }

  return null; // All rewards unlocked
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}