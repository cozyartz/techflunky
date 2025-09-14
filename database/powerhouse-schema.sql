-- TechFlunky Powerhouse Enhancement Schema
-- Additional tables for AI matching, gamification, trust & safety, containerization, and advanced features

-- User preferences for AI matching
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  industries TEXT, -- JSON array of preferred industries
  budget_range_min INTEGER, -- in cents
  budget_range_max INTEGER, -- in cents
  business_stages TEXT, -- JSON array: concept, blueprint, launch_ready
  investment_types TEXT, -- JSON array: acquire, partner, license
  communication_preferences TEXT, -- JSON object
  ai_matching_enabled BOOLEAN DEFAULT TRUE,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id)
);

-- AI matching scores and recommendations
CREATE TABLE ai_matches (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  match_score REAL NOT NULL, -- 0.0 to 1.0
  match_reasons TEXT, -- JSON array of reasons
  interaction_status TEXT DEFAULT 'pending' CHECK (interaction_status IN ('pending', 'viewed', 'contacted', 'dismissed')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Gamification: User achievements and badges
CREATE TABLE achievements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  badge_icon TEXT, -- URL to badge icon
  criteria TEXT NOT NULL, -- JSON object describing unlock criteria
  points_reward INTEGER DEFAULT 0,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'seller', 'buyer', 'engagement', 'milestone')),
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
  created_at INTEGER DEFAULT (unixepoch())
);

-- User achievement unlocks
CREATE TABLE user_achievements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  unlocked_at INTEGER DEFAULT (unixepoch()),
  progress_data TEXT, -- JSON object for partial progress
  UNIQUE(user_id, achievement_id)
);

-- User reputation and scoring
CREATE TABLE user_reputation (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  total_points INTEGER DEFAULT 0,
  seller_score REAL DEFAULT 0, -- 0.0 to 5.0
  buyer_score REAL DEFAULT 0, -- 0.0 to 5.0
  trust_level TEXT DEFAULT 'new' CHECK (trust_level IN ('new', 'verified', 'trusted', 'expert', 'legendary')),
  response_time_avg INTEGER, -- average response time in minutes
  completion_rate REAL DEFAULT 0, -- percentage of completed transactions
  streak_days INTEGER DEFAULT 0,
  last_active_date INTEGER DEFAULT (unixepoch()),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Trust & Safety: Identity verification
CREATE TABLE identity_verifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  verification_type TEXT NOT NULL CHECK (verification_type IN ('email', 'phone', 'id_document', 'business_license', 'bank_account')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  verification_data TEXT, -- JSON object with verification details
  verified_at INTEGER,
  expires_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Enhanced escrow system with milestones
CREATE TABLE escrow_transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  offer_id TEXT NOT NULL REFERENCES offers(id),
  total_amount INTEGER NOT NULL, -- in cents
  platform_fee INTEGER NOT NULL, -- in cents
  current_milestone INTEGER DEFAULT 1,
  total_milestones INTEGER NOT NULL,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'funded', 'in_progress', 'completed', 'disputed', 'cancelled')),
  stripe_payment_intent_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Escrow milestones
CREATE TABLE escrow_milestones (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  escrow_id TEXT NOT NULL REFERENCES escrow_transactions(id),
  milestone_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- in cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'disputed')),
  completed_at INTEGER,
  completed_by TEXT REFERENCES users(id),
  deliverables TEXT, -- JSON array of deliverable URLs/descriptions
  created_at INTEGER DEFAULT (unixepoch())
);

-- Dispute resolution system
CREATE TABLE disputes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  escrow_id TEXT NOT NULL REFERENCES escrow_transactions(id),
  initiated_by TEXT NOT NULL REFERENCES users(id),
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('quality', 'delivery', 'scope', 'payment', 'other')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution TEXT,
  resolved_by TEXT REFERENCES users(id), -- mediator/admin
  resolved_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Industry-specific verticals
CREATE TABLE industry_verticals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  banner_url TEXT,
  expert_requirements TEXT, -- JSON object
  specialized_fields TEXT, -- JSON array
  compliance_requirements TEXT, -- JSON array
  is_active BOOLEAN DEFAULT TRUE,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Expert profiles for industry verticals
CREATE TABLE industry_experts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  vertical_id TEXT NOT NULL REFERENCES industry_verticals(id),
  expertise_level TEXT DEFAULT 'consultant' CHECK (expertise_level IN ('consultant', 'specialist', 'expert', 'authority')),
  credentials TEXT, -- JSON array of credentials/certifications
  hourly_rate INTEGER, -- in cents
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'unavailable')),
  bio TEXT,
  specialties TEXT, -- JSON array
  languages TEXT, -- JSON array
  rating REAL DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Success acceleration programs
CREATE TABLE acceleration_programs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  program_type TEXT NOT NULL CHECK (program_type IN ('bootcamp', 'mentorship', 'investor_intro', 'patent_assistance')),
  duration_days INTEGER,
  price INTEGER NOT NULL, -- in cents
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  start_date INTEGER,
  end_date INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'cancelled')),
  curriculum TEXT, -- JSON object
  requirements TEXT, -- JSON array
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Program enrollments
CREATE TABLE program_enrollments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  program_id TEXT NOT NULL REFERENCES acceleration_programs(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped', 'refunded')),
  progress_percentage REAL DEFAULT 0,
  completion_date INTEGER,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comment TEXT,
  stripe_payment_intent_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Enhanced subscription tiers with feature flags
CREATE TABLE enhanced_subscription_tiers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_monthly INTEGER NOT NULL, -- in cents
  price_yearly INTEGER NOT NULL, -- in cents
  features TEXT NOT NULL, -- JSON array of features
  limits TEXT, -- JSON object with usage limits
  ai_features TEXT, -- JSON object with AI feature access
  priority_level INTEGER DEFAULT 1, -- 1 = lowest, 5 = highest
  is_active BOOLEAN DEFAULT TRUE,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- User subscription management
CREATE TABLE user_subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  tier_id TEXT NOT NULL REFERENCES enhanced_subscription_tiers(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid', 'trialing')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  trial_end INTEGER,
  stripe_subscription_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Market intelligence data
CREATE TABLE market_intelligence (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category TEXT NOT NULL,
  industry TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('funding_volume', 'startup_count', 'success_rate', 'average_valuation', 'trend_score')),
  value REAL NOT NULL,
  data_source TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.5, -- 0.0 to 1.0
  metadata TEXT, -- JSON object with additional context
  date_collected INTEGER DEFAULT (unixepoch()),
  is_current BOOLEAN DEFAULT TRUE
);

-- API usage tracking for monetization
CREATE TABLE api_usage (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  api_key_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  usage_date DATE DEFAULT (DATE('now')),
  request_count INTEGER DEFAULT 1,
  response_time_ms INTEGER,
  status_code INTEGER,
  tier_limit INTEGER,
  is_billable BOOLEAN DEFAULT TRUE,
  created_at INTEGER DEFAULT (unixepoch())
);

-- API keys management
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT, -- JSON array of allowed endpoints
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER
);

-- Social proof and viral features
CREATE TABLE social_actions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('share', 'like', 'follow', 'recommend', 'invite')),
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'user', 'platform')),
  target_id TEXT,
  platform TEXT, -- social media platform
  metadata TEXT, -- JSON object with additional data
  created_at INTEGER DEFAULT (unixepoch())
);

-- Referral tracking for viral growth
CREATE TABLE referral_tracking (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  referrer_id TEXT NOT NULL REFERENCES users(id),
  referee_id TEXT REFERENCES users(id), -- NULL until signup
  referral_code TEXT NOT NULL,
  source TEXT, -- email, social, direct, etc.
  conversion_type TEXT CHECK (conversion_type IN ('signup', 'first_purchase', 'subscription')),
  reward_amount INTEGER, -- in cents
  reward_claimed BOOLEAN DEFAULT FALSE,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  converted_at INTEGER
);

-- Investor-ready metrics tracking
CREATE TABLE growth_metrics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL CHECK (metric_category IN ('user_growth', 'revenue', 'engagement', 'network_effects', 'retention')),
  value REAL NOT NULL,
  unit TEXT NOT NULL, -- percentage, dollars, count, etc.
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  calculation_method TEXT,
  metadata TEXT, -- JSON object with additional context
  is_public BOOLEAN DEFAULT FALSE, -- for investor dashboard
  created_at INTEGER DEFAULT (unixepoch())
);

-- Enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_matches_user ON ai_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_matches_listing ON ai_matches(listing_id);
CREATE INDEX IF NOT EXISTS idx_ai_matches_score ON ai_matches(match_score);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reputation_trust_level ON user_reputation(trust_level);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_user ON identity_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_offer ON escrow_transactions(offer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_milestones_escrow ON escrow_milestones(escrow_id);
CREATE INDEX IF NOT EXISTS idx_disputes_escrow ON disputes(escrow_id);
CREATE INDEX IF NOT EXISTS idx_industry_experts_vertical ON industry_experts(vertical_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program ON program_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_category ON market_intelligence(category);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_social_actions_user ON social_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer ON referral_tracking(referrer_id);
CREATE INDEX IF NOT EXISTS idx_growth_metrics_category ON growth_metrics(metric_category);
CREATE INDEX IF NOT EXISTS idx_growth_metrics_period ON growth_metrics(period_start, period_end);

-- Code containerization system
CREATE TABLE code_containers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  framework TEXT, -- detected or specified framework
  dockerfile TEXT NOT NULL, -- generated or custom Dockerfile content
  build_command TEXT NOT NULL,
  start_command TEXT NOT NULL,
  port INTEGER DEFAULT 3000,
  environment_vars TEXT, -- JSON object of environment variables
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'ready', 'running', 'stopped', 'failed')),
  build_logs TEXT, -- JSON array of build log entries
  runtime_logs TEXT, -- JSON array of runtime log entries
  runtime_config TEXT, -- JSON object with container runtime configuration
  deployment_url TEXT, -- URL where container is accessible
  build_started_at INTEGER,
  build_completed_at INTEGER,
  started_at INTEGER,
  stopped_at INTEGER,
  current_build_id TEXT,
  security_scan_passed BOOLEAN DEFAULT FALSE,
  last_security_scan INTEGER,
  security_issues INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Container deployment tracking
CREATE TABLE container_deployments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  container_id TEXT NOT NULL REFERENCES code_containers(id),
  build_id TEXT NOT NULL,
  status TEXT DEFAULT 'deploying' CHECK (status IN ('deploying', 'ready', 'failed')),
  deployment_url TEXT,
  health_check_url TEXT,
  last_health_check INTEGER,
  resource_usage TEXT, -- JSON object with CPU, memory, network stats
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Security scanning results
CREATE TABLE security_scans (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  container_id TEXT NOT NULL REFERENCES code_containers(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  scan_results TEXT NOT NULL, -- JSON object with detailed scan results
  vulnerability_count INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'unknown' CHECK (risk_level IN ('safe', 'low', 'medium', 'high')),
  created_at INTEGER DEFAULT (unixepoch())
);

-- Seller onboarding progress
CREATE TABLE seller_onboarding (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  progress TEXT, -- JSON object tracking completion of onboarding steps
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id)
);

-- Containerization preferences
CREATE TABLE containerization_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  method TEXT NOT NULL CHECK (method IN ('github_integration', 'manual_upload', 'custom_docker', 'no_code')),
  github_integration TEXT, -- JSON object with GitHub integration settings
  preferred_frameworks TEXT, -- JSON array of preferred frameworks
  docker_preferences TEXT, -- JSON object with Docker configuration preferences
  auto_containerize BOOLEAN DEFAULT TRUE,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id)
);

-- GitHub integration tracking
CREATE TABLE github_integrations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  github_username TEXT,
  repository_access TEXT DEFAULT 'selected' CHECK (repository_access IN ('all', 'selected', 'none')),
  webhook_url TEXT,
  access_token TEXT, -- encrypted GitHub access token
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'failed', 'revoked')),
  last_sync INTEGER,
  repositories_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id)
);

-- Investor portal and deal-flow system
CREATE TABLE investor_applications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  investor_tier TEXT NOT NULL CHECK (investor_tier IN ('angel', 'accredited', 'vc_fund', 'beta_partner')),
  investor_info TEXT NOT NULL, -- JSON with personal and investment information
  investment_preferences TEXT, -- JSON with industry preferences, investment range, etc.
  references TEXT, -- JSON array of references
  motivation TEXT, -- Why they want to join
  beta_partner_interest BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'info_requested')),
  reviewer_id TEXT REFERENCES users(id),
  review_notes TEXT,
  assigned_tier TEXT,
  beta_partner_status TEXT,
  reviewed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id)
);

-- Investor profiles (approved investors)
CREATE TABLE investor_profiles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  investor_tier TEXT NOT NULL,
  investment_focus TEXT, -- JSON array of industries
  investment_range_min INTEGER, -- in cents
  investment_range_max INTEGER, -- in cents
  total_investments INTEGER DEFAULT 0,
  investment_preferences TEXT, -- JSON object with detailed preferences
  accreditation_status TEXT DEFAULT 'unverified' CHECK (accreditation_status IN ('verified', 'unverified', 'pending')),
  portfolio_size INTEGER DEFAULT 0,
  features_enabled TEXT, -- JSON array of enabled features
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id)
);

-- Investment syndicates for collaborative investing
CREATE TABLE investment_syndicates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  lead_investor_id TEXT NOT NULL REFERENCES users(id),
  target_listing_id TEXT REFERENCES listings(id),
  minimum_investment INTEGER DEFAULT 0,
  maximum_investment INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'funded', 'closed', 'cancelled')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Syndicate members
CREATE TABLE syndicate_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  syndicate_id TEXT NOT NULL REFERENCES investment_syndicates(id),
  investor_id TEXT NOT NULL REFERENCES users(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'co_lead', 'member')),
  investment_committed INTEGER DEFAULT 0,
  joined_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(syndicate_id, investor_id)
);

-- Syndicate discussions
CREATE TABLE syndicate_discussions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  syndicate_id TEXT NOT NULL REFERENCES investment_syndicates(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Syndicate due diligence tracking
CREATE TABLE syndicate_due_diligence (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  syndicate_id TEXT NOT NULL REFERENCES investment_syndicates(id),
  title TEXT NOT NULL,
  description TEXT,
  assigned_by TEXT NOT NULL REFERENCES users(id),
  assigned_to TEXT REFERENCES users(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  due_date INTEGER,
  completed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- AI-powered deal scoring
CREATE TABLE deal_scores (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  ai_score REAL NOT NULL, -- 0.0 to 1.0
  investment_potential REAL NOT NULL, -- 0.0 to 1.0
  risk_assessment TEXT DEFAULT 'unknown' CHECK (risk_assessment IN ('low', 'medium', 'high', 'unknown')),
  scoring_breakdown TEXT, -- JSON with detailed score breakdown
  risk_factors TEXT, -- JSON array of identified risk factors
  recommendations TEXT, -- JSON array of recommendations
  ai_analysis TEXT, -- Full AI analysis text
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(listing_id)
);

-- Investor interest tracking
CREATE TABLE investor_interests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  investor_id TEXT NOT NULL REFERENCES users(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  interest_level TEXT NOT NULL CHECK (interest_level IN ('interested', 'very_interested', 'want_meeting')),
  notes TEXT,
  investment_amount INTEGER, -- potential investment amount in cents
  investment_type TEXT DEFAULT 'acquire' CHECK (investment_type IN ('acquire', 'partner', 'license', 'equity')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(investor_id, listing_id)
);

-- Actual investments made through the platform
CREATE TABLE investor_investments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  investor_id TEXT NOT NULL REFERENCES users(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  amount_invested INTEGER NOT NULL, -- in cents
  investment_type TEXT NOT NULL CHECK (investment_type IN ('acquire', 'partner', 'license', 'equity')),
  terms TEXT, -- JSON object with investment terms
  notes TEXT,
  syndicate_id TEXT REFERENCES investment_syndicates(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'successful_exit', 'failed', 'partial_return')),
  current_value INTEGER, -- current estimated value in cents
  exit_value INTEGER, -- exit value if status is successful_exit
  exit_date INTEGER,
  investment_date INTEGER DEFAULT (unixepoch()),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Investment valuations tracking
CREATE TABLE investment_valuations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  investment_id TEXT NOT NULL REFERENCES investor_investments(id),
  valuation_amount INTEGER NOT NULL, -- in cents
  valuation_date INTEGER NOT NULL,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Portfolio tracking for analytics
CREATE TABLE portfolio_tracking (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  investor_id TEXT NOT NULL REFERENCES users(id),
  investment_id TEXT NOT NULL REFERENCES investor_investments(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  initial_amount INTEGER NOT NULL,
  investment_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at INTEGER DEFAULT (unixepoch())
);

-- Beta partner special status
CREATE TABLE beta_partners (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  partner_status TEXT NOT NULL CHECK (partner_status IN ('founding', 'early', 'standard')),
  revenue_share_percentage REAL DEFAULT 0,
  platform_influence_level TEXT DEFAULT 'medium' CHECK (platform_influence_level IN ('low', 'medium', 'high')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id)
);

-- Deal interactions for analytics
CREATE TABLE deal_interactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'favorite', 'contact', 'investor_interest', 'offer')),
  created_at INTEGER DEFAULT (unixepoch())
);

-- Additional indexes for containerization
CREATE INDEX IF NOT EXISTS idx_code_containers_user ON code_containers(user_id);
CREATE INDEX IF NOT EXISTS idx_code_containers_listing ON code_containers(listing_id);
CREATE INDEX IF NOT EXISTS idx_code_containers_status ON code_containers(status);
CREATE INDEX IF NOT EXISTS idx_container_deployments_container ON container_deployments(container_id);
CREATE INDEX IF NOT EXISTS idx_security_scans_container ON security_scans(container_id);
CREATE INDEX IF NOT EXISTS idx_seller_onboarding_user ON seller_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_containerization_preferences_user ON containerization_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_github_integrations_user ON github_integrations(user_id);

-- Additional indexes for investor system
CREATE INDEX IF NOT EXISTS idx_investor_applications_user ON investor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_applications_status ON investor_applications(status);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_user ON investor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_tier ON investor_profiles(investor_tier);
CREATE INDEX IF NOT EXISTS idx_investment_syndicates_lead ON investment_syndicates(lead_investor_id);
CREATE INDEX IF NOT EXISTS idx_investment_syndicates_listing ON investment_syndicates(target_listing_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_members_syndicate ON syndicate_members(syndicate_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_members_investor ON syndicate_members(investor_id);
CREATE INDEX IF NOT EXISTS idx_deal_scores_listing ON deal_scores(listing_id);
CREATE INDEX IF NOT EXISTS idx_deal_scores_score ON deal_scores(ai_score);
CREATE INDEX IF NOT EXISTS idx_investor_interests_investor ON investor_interests(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_interests_listing ON investor_interests(listing_id);
CREATE INDEX IF NOT EXISTS idx_investor_investments_investor ON investor_investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_investments_listing ON investor_investments(listing_id);
CREATE INDEX IF NOT EXISTS idx_deal_interactions_listing ON deal_interactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_deal_interactions_user ON deal_interactions(user_id);