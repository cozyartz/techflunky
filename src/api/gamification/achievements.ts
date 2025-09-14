// Gamification System: Achievements and Badges
import type { APIContext } from 'astro';

interface Achievement {
  id: string;
  name: string;
  description: string;
  badgeIcon: string;
  criteria: Record<string, any>;
  pointsReward: number;
  category: 'general' | 'seller' | 'buyer' | 'engagement' | 'milestone';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

// Initialize default achievements
const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'id'>[] = [
  // General Achievements
  {
    name: 'Welcome Aboard',
    description: 'Complete your profile and preferences',
    badgeIcon: '/badges/welcome.svg',
    criteria: { type: 'profile_completion', threshold: 100 },
    pointsReward: 100,
    category: 'general',
    rarity: 'common'
  },
  {
    name: 'Early Bird',
    description: 'Join during the first 1000 users',
    badgeIcon: '/badges/early-bird.svg',
    criteria: { type: 'user_rank', threshold: 1000 },
    pointsReward: 500,
    category: 'milestone',
    rarity: 'rare'
  },

  // Seller Achievements
  {
    name: 'First Listing',
    description: 'Create your first business idea listing',
    badgeIcon: '/badges/first-listing.svg',
    criteria: { type: 'listings_created', threshold: 1 },
    pointsReward: 200,
    category: 'seller',
    rarity: 'common'
  },
  {
    name: 'Rising Star',
    description: 'Get your first 4+ star rating',
    badgeIcon: '/badges/rising-star.svg',
    criteria: { type: 'avg_rating', threshold: 4.0 },
    pointsReward: 300,
    category: 'seller',
    rarity: 'uncommon'
  },
  {
    name: 'Deal Maker',
    description: 'Complete your first successful sale',
    badgeIcon: '/badges/deal-maker.svg',
    criteria: { type: 'sales_completed', threshold: 1 },
    pointsReward: 500,
    category: 'seller',
    rarity: 'uncommon'
  },
  {
    name: 'Power Seller',
    description: 'Complete 10 successful sales',
    badgeIcon: '/badges/power-seller.svg',
    criteria: { type: 'sales_completed', threshold: 10 },
    pointsReward: 2000,
    category: 'seller',
    rarity: 'rare'
  },
  {
    name: 'Millionaire Maker',
    description: 'Generate $1M+ in total sales',
    badgeIcon: '/badges/millionaire.svg',
    criteria: { type: 'total_revenue', threshold: 100000000 }, // in cents
    pointsReward: 10000,
    category: 'seller',
    rarity: 'legendary'
  },

  // Buyer Achievements
  {
    name: 'Idea Hunter',
    description: 'Browse 50+ listings',
    badgeIcon: '/badges/idea-hunter.svg',
    criteria: { type: 'listings_viewed', threshold: 50 },
    pointsReward: 150,
    category: 'buyer',
    rarity: 'common'
  },
  {
    name: 'Smart Investor',
    description: 'Purchase your first business idea',
    badgeIcon: '/badges/smart-investor.svg',
    criteria: { type: 'purchases_made', threshold: 1 },
    pointsReward: 400,
    category: 'buyer',
    rarity: 'uncommon'
  },
  {
    name: 'Portfolio Builder',
    description: 'Purchase 5+ business ideas',
    badgeIcon: '/badges/portfolio-builder.svg',
    criteria: { type: 'purchases_made', threshold: 5 },
    pointsReward: 1500,
    category: 'buyer',
    rarity: 'rare'
  },

  // Engagement Achievements
  {
    name: 'Communicator',
    description: 'Send 25+ messages to sellers/buyers',
    badgeIcon: '/badges/communicator.svg',
    criteria: { type: 'messages_sent', threshold: 25 },
    pointsReward: 200,
    category: 'engagement',
    rarity: 'common'
  },
  {
    name: 'Review Master',
    description: 'Leave 10+ helpful reviews',
    badgeIcon: '/badges/review-master.svg',
    criteria: { type: 'reviews_left', threshold: 10 },
    pointsReward: 300,
    category: 'engagement',
    rarity: 'uncommon'
  },
  {
    name: 'Network Builder',
    description: 'Refer 5+ new users to the platform',
    badgeIcon: '/badges/network-builder.svg',
    criteria: { type: 'referrals_made', threshold: 5 },
    pointsReward: 1000,
    category: 'engagement',
    rarity: 'rare'
  },
  {
    name: 'Streak Master',
    description: 'Maintain a 30-day activity streak',
    badgeIcon: '/badges/streak-master.svg',
    criteria: { type: 'activity_streak', threshold: 30 },
    pointsReward: 800,
    category: 'engagement',
    rarity: 'rare'
  }
];

// Initialize achievements in database
export async function initializeAchievements(DB: any) {
  for (const achievement of DEFAULT_ACHIEVEMENTS) {
    await DB.prepare(`
      INSERT OR IGNORE INTO achievements
      (name, description, badge_icon, criteria, points_reward, category, rarity, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      achievement.name,
      achievement.description,
      achievement.badgeIcon,
      JSON.stringify(achievement.criteria),
      achievement.pointsReward,
      achievement.category,
      achievement.rarity,
      Math.floor(Date.now() / 1000)
    ).run();
  }
}

// GET user achievements
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
    // Initialize achievements if not exists
    await initializeAchievements(DB);

    // Get user's unlocked achievements
    const unlockedAchievements = await DB.prepare(`
      SELECT a.*, ua.unlocked_at, ua.progress_data
      FROM achievements a
      JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE ua.user_id = ?
      ORDER BY ua.unlocked_at DESC
    `).bind(userId).all();

    // Get all achievements with progress
    const allAchievements = await DB.prepare(`
      SELECT a.*,
        CASE WHEN ua.user_id IS NOT NULL THEN 1 ELSE 0 END as is_unlocked,
        ua.unlocked_at,
        ua.progress_data
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      ORDER BY a.category, a.rarity, a.name
    `).bind(userId).all();

    // Get user's total points
    const userPoints = await DB.prepare(`
      SELECT COALESCE(total_points, 0) as total_points
      FROM user_reputation
      WHERE user_id = ?
    `).bind(userId).first();

    // Calculate progress for locked achievements
    const achievementsWithProgress = await Promise.all(
      allAchievements.map(async (achievement) => {
        const criteria = JSON.parse(achievement.criteria);
        const progress = await calculateAchievementProgress(DB, userId, criteria);

        return {
          ...achievement,
          criteria: criteria,
          progress: achievement.is_unlocked ? 100 : progress,
          progressData: achievement.progress_data ? JSON.parse(achievement.progress_data) : null
        };
      })
    );

    return new Response(JSON.stringify({
      unlockedAchievements: unlockedAchievements.map(a => ({
        ...a,
        criteria: JSON.parse(a.criteria),
        progressData: a.progress_data ? JSON.parse(a.progress_data) : null
      })),
      allAchievements: achievementsWithProgress,
      totalPoints: userPoints?.total_points || 0,
      unlockedCount: unlockedAchievements.length,
      totalCount: allAchievements.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting achievements:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve achievements' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Check and unlock achievements for a user
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { userId, triggerType, data } = await request.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all achievements that might be unlockable
    const achievements = await DB.prepare(`
      SELECT a.*
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      WHERE ua.user_id IS NULL
    `).bind(userId).all();

    const newlyUnlocked = [];

    for (const achievement of achievements) {
      const criteria = JSON.parse(achievement.criteria);
      const progress = await calculateAchievementProgress(DB, userId, criteria);

      if (progress >= 100) {
        // Unlock the achievement
        await DB.prepare(`
          INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, progress_data)
          VALUES (?, ?, ?, ?)
        `).bind(
          userId,
          achievement.id,
          Math.floor(Date.now() / 1000),
          JSON.stringify({ progress: 100, unlockedBy: triggerType })
        ).run();

        // Award points
        await DB.prepare(`
          INSERT OR REPLACE INTO user_reputation
          (user_id, total_points, created_at, updated_at)
          VALUES (?, COALESCE((SELECT total_points FROM user_reputation WHERE user_id = ?), 0) + ?, ?, ?)
        `).bind(
          userId,
          userId,
          achievement.points_reward,
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000)
        ).run();

        newlyUnlocked.push({
          ...achievement,
          criteria: criteria,
          pointsRewarded: achievement.points_reward
        });
      }
    }

    return new Response(JSON.stringify({
      newlyUnlocked,
      totalNewPoints: newlyUnlocked.reduce((sum, a) => sum + a.points_reward, 0)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error checking achievements:', error);
    return new Response(JSON.stringify({ error: 'Failed to check achievements' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function calculateAchievementProgress(DB: any, userId: string, criteria: any): Promise<number> {
  const { type, threshold } = criteria;

  try {
    switch (type) {
      case 'profile_completion':
        // Check profile completion percentage
        const profile = await DB.prepare(`
          SELECT u.name, u.email, p.bio, p.company, p.website, p.avatar_url
          FROM users u
          LEFT JOIN profiles p ON u.id = p.user_id
          WHERE u.id = ?
        `).bind(userId).first();

        const fields = [profile?.name, profile?.email, profile?.bio, profile?.company];
        const completedFields = fields.filter(field => field && field.trim().length > 0).length;
        return Math.min(100, (completedFields / fields.length) * 100);

      case 'listings_created':
        const listingsCount = await DB.prepare(`
          SELECT COUNT(*) as count FROM listings WHERE seller_id = ?
        `).bind(userId).first();
        return Math.min(100, (listingsCount.count / threshold) * 100);

      case 'sales_completed':
        const salesCount = await DB.prepare(`
          SELECT COUNT(*) as count FROM offers
          WHERE seller_id = ? AND status = 'completed'
        `).bind(userId).first();
        return Math.min(100, (salesCount.count / threshold) * 100);

      case 'purchases_made':
        const purchasesCount = await DB.prepare(`
          SELECT COUNT(*) as count FROM offers
          WHERE buyer_id = ? AND status = 'completed'
        `).bind(userId).first();
        return Math.min(100, (purchasesCount.count / threshold) * 100);

      case 'total_revenue':
        const revenue = await DB.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total FROM offers
          WHERE seller_id = ? AND status = 'completed'
        `).bind(userId).first();
        return Math.min(100, (revenue.total / threshold) * 100);

      case 'avg_rating':
        const rating = await DB.prepare(`
          SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewed_id = ?
        `).bind(userId).first();
        return rating?.avg_rating >= threshold ? 100 : ((rating?.avg_rating || 0) / threshold) * 100;

      case 'listings_viewed':
        const viewsCount = await DB.prepare(`
          SELECT COUNT(*) as count FROM analytics
          WHERE user_id = ? AND event_type = 'listing_view'
        `).bind(userId).first();
        return Math.min(100, (viewsCount.count / threshold) * 100);

      case 'messages_sent':
        const messagesCount = await DB.prepare(`
          SELECT COUNT(*) as count FROM messages WHERE sender_id = ?
        `).bind(userId).first();
        return Math.min(100, (messagesCount.count / threshold) * 100);

      case 'reviews_left':
        const reviewsCount = await DB.prepare(`
          SELECT COUNT(*) as count FROM reviews WHERE reviewer_id = ?
        `).bind(userId).first();
        return Math.min(100, (reviewsCount.count / threshold) * 100);

      case 'referrals_made':
        const referralsCount = await DB.prepare(`
          SELECT COUNT(*) as count FROM referral_tracking
          WHERE referrer_id = ? AND converted_at IS NOT NULL
        `).bind(userId).first();
        return Math.min(100, (referralsCount.count / threshold) * 100);

      case 'activity_streak':
        const reputation = await DB.prepare(`
          SELECT streak_days FROM user_reputation WHERE user_id = ?
        `).bind(userId).first();
        return Math.min(100, ((reputation?.streak_days || 0) / threshold) * 100);

      case 'user_rank':
        const userRank = await DB.prepare(`
          SELECT COUNT(*) + 1 as rank FROM users
          WHERE created_at < (SELECT created_at FROM users WHERE id = ?)
        `).bind(userId).first();
        return userRank.rank <= threshold ? 100 : 0;

      default:
        return 0;
    }
  } catch (error) {
    console.error(`Error calculating progress for ${type}:`, error);
    return 0;
  }
}