import type { APIRoute } from 'astro';
import MemberRetentionSystem, { MEMBERSHIP_TIERS } from '../../../lib/member-retention';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    // Simple auth check - in production, use proper authentication
    const authHeader = request.headers.get('authorization');
    const userId = url.searchParams.get('userId') || 'demo_user';

    // Mock member data - in production, fetch from database
    const memberData = {
      id: userId,
      email: 'member@techflunky.com',
      membershipLevel: url.searchParams.get('level') || 'pro',
      subscriptionType: url.searchParams.get('subscription') || 'annual',
      joinDate: '2024-01-15',
      lastLogin: '2024-09-15',
      transactionVolume: parseInt(url.searchParams.get('volume') || '25000'), // $250 in cents
      loyaltyPoints: parseInt(url.searchParams.get('points') || '1250'),
      monthsActive: 8,
      totalTransactions: 12,
      successfulSales: 10,
      averageRating: 4.8
    };

    const membershipTier = MEMBERSHIP_TIERS[memberData.membershipLevel];
    const daysSinceLogin = Math.floor((Date.now() - new Date(memberData.lastLogin).getTime()) / (1000 * 60 * 60 * 24));

    // Calculate member benefits
    const benefits = MemberRetentionSystem.getMemberBenefits(
      memberData.membershipLevel,
      memberData.subscriptionType as 'monthly' | 'annual',
      memberData.transactionVolume,
      memberData.loyaltyPoints
    );

    // Generate retention offer if applicable
    const retentionOffer = MemberRetentionSystem.generateRetentionOffer({
      level: memberData.membershipLevel,
      subscriptionType: memberData.subscriptionType,
      transactionVolume: memberData.transactionVolume,
      loyaltyPoints: memberData.loyaltyPoints,
      monthsActive: memberData.monthsActive,
      lastLoginDays: daysSinceLogin
    });

    // Calculate engagement features
    const engagementFeatures = MemberRetentionSystem.getEngagementFeatures(memberData.membershipLevel);

    // Calculate loyalty points for recent activity
    const recentPoints = MemberRetentionSystem.calculateLoyaltyPoints(
      5000, // $50 transaction
      memberData.membershipLevel,
      false
    );

    // Simulate member statistics
    const memberStats = {
      platformFeeSavings: benefits.totalSavings,
      loyaltyPointsValue: Math.floor(memberData.loyaltyPoints * 0.01), // 1 cent per point
      nextTierProgress: memberData.membershipLevel === 'basic' ? {
        nextTier: 'pro',
        transactionsNeeded: Math.max(0, 5 - memberData.totalTransactions),
        volumeNeeded: Math.max(0, 10000 - memberData.transactionVolume),
        timeLeft: '3 months to qualify'
      } : memberData.membershipLevel === 'pro' ? {
        nextTier: 'enterprise',
        transactionsNeeded: Math.max(0, 20 - memberData.totalTransactions),
        volumeNeeded: Math.max(0, 100000 - memberData.transactionVolume),
        timeLeft: '6 months to qualify'
      } : null,
      achievements: [
        { name: 'First Sale', earned: true, date: '2024-02-01' },
        { name: 'Trusted Seller', earned: memberData.averageRating >= 4.5, date: '2024-05-15' },
        { name: 'Volume Achiever', earned: memberData.transactionVolume >= 10000, date: '2024-07-10' },
        { name: 'Loyalty Champion', earned: memberData.loyaltyPoints >= 1000, date: '2024-08-20' },
        { name: 'Enterprise Elite', earned: memberData.membershipLevel === 'enterprise', date: null }
      ]
    };

    return new Response(JSON.stringify({
      success: true,
      member: memberData,
      membership: {
        current: membershipTier,
        benefits,
        engagementFeatures,
        stats: memberStats
      },
      retentionOffer: daysSinceLogin > 7 ? retentionOffer : null,
      recommendations: [
        {
          type: 'fee_optimization',
          title: 'Optimize Your Platform Fees',
          description: memberData.subscriptionType === 'monthly'
            ? 'Switch to annual billing and save 2% on all platform fees!'
            : 'You\'re already saving 2% with annual billing! 🎉',
          action: memberData.subscriptionType === 'monthly' ? 'upgrade_to_annual' : null,
          potential_savings: memberData.subscriptionType === 'monthly'
            ? Math.floor(memberData.transactionVolume * 0.02) / 100
            : 0
        },
        {
          type: 'loyalty_rewards',
          title: 'Redeem Your Loyalty Points',
          description: `You have ${memberData.loyaltyPoints} points worth $${Math.floor(memberData.loyaltyPoints * 0.01)}!`,
          action: 'view_rewards',
          available_rewards: benefits.rewards.length
        },
        {
          type: 'engagement',
          title: 'Maximize Your Success',
          description: 'Join our monthly seller webinar for advanced strategies',
          action: 'register_webinar',
          next_event: '2024-09-25'
        }
      ],
      timeline: [
        {
          date: '2024-09-15',
          type: 'login',
          description: 'Last platform visit'
        },
        {
          date: '2024-09-10',
          type: 'transaction',
          description: 'Sold "E-commerce Platform" for $899',
          points_earned: recentPoints
        },
        {
          date: '2024-09-05',
          type: 'achievement',
          description: 'Reached 1000+ loyalty points!'
        },
        {
          date: '2024-08-28',
          type: 'upgrade',
          description: 'Upgraded to Pro membership'
        }
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Member dashboard error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load member dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { action, memberId, data } = await request.json();

    switch (action) {
      case 'redeem_reward':
        return redeemLoyaltyReward(data);
      case 'upgrade_membership':
        return upgradeMembership(data);
      case 'switch_to_annual':
        return switchToAnnual(data);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function redeemLoyaltyReward(data: any): Promise<Response> {
  // In production, validate points balance and apply reward
  const pointsUsed = data.pointsCost || 500;

  return new Response(JSON.stringify({
    success: true,
    message: 'Reward redeemed successfully!',
    pointsUsed,
    rewardApplied: data.rewardId,
    newBalance: (data.currentPoints || 1250) - pointsUsed
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function upgradeMembership(data: any): Promise<Response> {
  const fromTier = data.currentTier || 'pro';
  const toTier = data.targetTier || 'enterprise';

  return new Response(JSON.stringify({
    success: true,
    message: `Successfully upgraded from ${fromTier} to ${toTier}!`,
    newBenefits: MEMBERSHIP_TIERS[toTier].features,
    immediateDiscount: '2% platform fee reduction starts now',
    loyaltyBonus: 1000
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function switchToAnnual(data: any): Promise<Response> {
  const currentTier = data.membershipLevel || 'pro';
  const tier = MEMBERSHIP_TIERS[currentTier];
  const monthlyTotal = tier.monthlyPrice * 12;
  const savings = monthlyTotal - tier.annualPrice;

  return new Response(JSON.stringify({
    success: true,
    message: 'Successfully switched to annual billing!',
    annualSavings: savings,
    platformFeeDiscount: '2% platform fee reduction activated',
    loyaltyBonus: 500,
    nextBilling: '2025-09-16'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}