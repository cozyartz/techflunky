// Member retention and loyalty system for TechFlunky
import { calculatePlatformFee } from './stripe-config';

export interface MembershipTier {
  level: 'basic' | 'pro' | 'enterprise';
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualDiscount: number;
  features: string[];
  platformFeeDiscount: number;
  limits: {
    listings: number;
    aiValidations: number;
    prioritySupport: boolean;
    whiteGloveHours: number;
  };
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'fee_discount' | 'service_credit' | 'exclusive_feature' | 'priority_access';
  value: number;
  expiry?: string;
}

export interface MemberBenefits {
  totalSavings: number;
  loyaltyPoints: number;
  exclusiveFeatures: string[];
  priorityAccess: string[];
  rewards: LoyaltyReward[];
}

// Membership tier definitions
export const MEMBERSHIP_TIERS: Record<string, MembershipTier> = {
  basic: {
    level: 'basic',
    name: 'Basic',
    monthlyPrice: 0,
    annualPrice: 0,
    annualDiscount: 0,
    features: [
      'Free marketplace listings',
      'Basic email support',
      'Standard platform fees (10-12%)',
      'Basic analytics'
    ],
    platformFeeDiscount: 0,
    limits: {
      listings: 5,
      aiValidations: 2,
      prioritySupport: false,
      whiteGloveHours: 0
    }
  },
  pro: {
    level: 'pro',
    name: 'Pro Seller',
    monthlyPrice: 49,
    annualPrice: 490, // 2 months free
    annualDiscount: 0.17,
    features: [
      'Unlimited marketplace listings',
      'Priority email support',
      'Member platform fees (8%)',
      'Advanced analytics & insights',
      'AI business validation (10/month)',
      'Marketing boost features',
      'Custom seller profile'
    ],
    platformFeeDiscount: 0,
    limits: {
      listings: -1, // unlimited
      aiValidations: 10,
      prioritySupport: true,
      whiteGloveHours: 2
    }
  },
  enterprise: {
    level: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 199,
    annualPrice: 1990, // 2 months free
    annualDiscount: 0.17,
    features: [
      'Everything in Pro',
      'Premium platform fees (6-8%)',
      'Dedicated account manager',
      'White-glove setup service (20 hours)',
      'Custom integrations',
      'API access',
      'Bulk listing tools',
      'Advanced AI validation (unlimited)',
      'Priority marketplace placement',
      'Custom contract terms'
    ],
    platformFeeDiscount: 0.02, // 2% additional discount
    limits: {
      listings: -1,
      aiValidations: -1, // unlimited
      prioritySupport: true,
      whiteGloveHours: 20
    }
  }
};

// Loyalty points system
export const LOYALTY_REWARDS: LoyaltyReward[] = [
  {
    id: 'fee_discount_1',
    name: '1% Fee Discount',
    description: 'Reduce platform fees by 1% for next 3 transactions',
    pointsCost: 500,
    type: 'fee_discount',
    value: 0.01,
    expiry: '90 days'
  },
  {
    id: 'ai_validation_pack',
    name: 'AI Validation Pack',
    description: '5 additional AI business validations',
    pointsCost: 300,
    type: 'service_credit',
    value: 5
  },
  {
    id: 'marketing_boost',
    name: 'Marketing Boost',
    description: 'Featured listing placement for 30 days',
    pointsCost: 750,
    type: 'exclusive_feature',
    value: 30
  },
  {
    id: 'white_glove_hour',
    name: 'White Glove Hour',
    description: '1 hour of expert consultation',
    pointsCost: 400,
    type: 'service_credit',
    value: 1
  },
  {
    id: 'early_access',
    name: 'Beta Feature Access',
    description: 'Early access to new platform features',
    pointsCost: 200,
    type: 'priority_access',
    value: 1,
    expiry: '365 days'
  }
];

// Member retention features
export class MemberRetentionSystem {

  // Calculate total savings for member
  static calculateMemberSavings(
    membershipLevel: string,
    subscriptionType: 'monthly' | 'annual',
    transactionVolume: number,
    monthsActive: number
  ): number {
    const tier = MEMBERSHIP_TIERS[membershipLevel];
    if (!tier) return 0;

    let totalSavings = 0;

    // Subscription savings (annual discount)
    if (subscriptionType === 'annual') {
      const monthlyTotal = tier.monthlyPrice * 12;
      const annualSavings = monthlyTotal - tier.annualPrice;
      totalSavings += annualSavings;
    }

    // Platform fee savings
    const standardFee = transactionVolume * 0.10; // 10% standard rate
    const memberFee = calculatePlatformFee({
      amount: transactionVolume,
      sellerTier: 'established',
      subscriptionType,
      membershipLevel: tier.level
    });

    const feeSavings = standardFee - memberFee;
    totalSavings += feeSavings / 100; // Convert from cents

    return Math.round(totalSavings);
  }

  // Generate personalized retention offer
  static generateRetentionOffer(member: {
    level: string;
    subscriptionType: string;
    transactionVolume: number;
    loyaltyPoints: number;
    monthsActive: number;
    lastLoginDays: number;
  }): {
    offerType: string;
    discount: number;
    loyaltyBonus: number;
    message: string;
    urgency: string;
  } {
    const isAtRisk = member.lastLoginDays > 14;
    const isHighValue = member.transactionVolume > 50000; // $500+
    const canUpgrade = member.level === 'basic' || member.level === 'pro';

    if (isAtRisk && isHighValue) {
      return {
        offerType: 'premium_retention',
        discount: 0.30, // 30% off next tier
        loyaltyBonus: 1000,
        message: 'We miss you! Get 30% off Enterprise membership + 1000 loyalty points',
        urgency: 'Limited time: 7 days only'
      };
    }

    if (canUpgrade && member.transactionVolume > 10000) {
      return {
        offerType: 'upgrade_incentive',
        discount: 0.20, // 20% off upgrade
        loyaltyBonus: 500,
        message: 'Unlock lower fees! Upgrade and save hundreds on platform fees',
        urgency: 'This month only'
      };
    }

    if (member.monthsActive >= 12) {
      return {
        offerType: 'loyalty_appreciation',
        discount: 0.15,
        loyaltyBonus: 750,
        message: 'Thank you for your loyalty! Here\'s 15% off your next renewal',
        urgency: 'Loyalty reward expires in 30 days'
      };
    }

    return {
      offerType: 'standard_retention',
      discount: 0.10,
      loyaltyBonus: 250,
      message: 'Stay with us and save 10% on your next subscription',
      urgency: 'Limited time offer'
    };
  }

  // Calculate loyalty points earned
  static calculateLoyaltyPoints(
    transactionAmount: number,
    membershipLevel: string,
    isReferral: boolean = false
  ): number {
    const baseRate = membershipLevel === 'enterprise' ? 2 : membershipLevel === 'pro' ? 1.5 : 1;
    let points = Math.floor((transactionAmount / 100) * baseRate); // 1 point per dollar for basic

    if (isReferral) {
      points *= 2; // Double points for referrals
    }

    return points;
  }

  // Get member benefits summary
  static getMemberBenefits(
    membershipLevel: string,
    subscriptionType: 'monthly' | 'annual',
    transactionVolume: number,
    loyaltyPoints: number
  ): MemberBenefits {
    const tier = MEMBERSHIP_TIERS[membershipLevel];
    const totalSavings = this.calculateMemberSavings(membershipLevel, subscriptionType, transactionVolume, 12);

    const exclusiveFeatures = tier.features.filter(f =>
      f.includes('Priority') || f.includes('White-glove') || f.includes('Custom') || f.includes('API')
    );

    const priorityAccess = membershipLevel === 'enterprise'
      ? ['Beta features', 'New platform launches', 'Exclusive webinars', 'Direct founder access']
      : membershipLevel === 'pro'
      ? ['Beta features', 'Exclusive webinars']
      : [];

    const availableRewards = LOYALTY_REWARDS.filter(reward => reward.pointsCost <= loyaltyPoints);

    return {
      totalSavings,
      loyaltyPoints,
      exclusiveFeatures,
      priorityAccess,
      rewards: availableRewards
    };
  }

  // Member engagement features
  static getEngagementFeatures(membershipLevel: string): string[] {
    const baseFeatures = [
      'Monthly seller newsletter',
      'Success story features',
      'Community forums'
    ];

    const proFeatures = [
      ...baseFeatures,
      'Expert AMA sessions',
      'Private seller Slack channel',
      'Monthly 1:1 check-ins'
    ];

    const enterpriseFeatures = [
      ...proFeatures,
      'Quarterly business reviews',
      'Custom success planning',
      'VIP events and networking',
      'Direct founder access'
    ];

    switch (membershipLevel) {
      case 'enterprise': return enterpriseFeatures;
      case 'pro': return proFeatures;
      default: return baseFeatures;
    }
  }
}

// Retention campaign types
export const RETENTION_CAMPAIGNS = {
  winback: {
    name: 'Win-Back Campaign',
    triggers: ['inactive_30_days', 'failed_payment'],
    offers: ['discount_50', 'free_month', 'loyalty_bonus'],
    channels: ['email', 'in_app', 'sms']
  },
  upgrade: {
    name: 'Upgrade Incentive',
    triggers: ['high_volume', 'feature_limit_hit', 'success_milestone'],
    offers: ['tier_discount', 'feature_preview', 'success_bonus'],
    channels: ['email', 'in_app', 'phone_call']
  },
  loyalty: {
    name: 'Loyalty Appreciation',
    triggers: ['anniversary', 'referral_milestone', 'volume_threshold'],
    offers: ['exclusive_features', 'loyalty_points', 'recognition'],
    channels: ['email', 'in_app', 'personal_note']
  },
  at_risk: {
    name: 'At-Risk Prevention',
    triggers: ['decreased_usage', 'support_tickets', 'competitor_activity'],
    offers: ['personal_attention', 'feature_training', 'success_planning'],
    channels: ['phone_call', 'video_meeting', 'dedicated_support']
  }
};

export default MemberRetentionSystem;