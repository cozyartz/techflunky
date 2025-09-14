-- TechFlunky Enhanced Database Schema
-- Includes all monetizable features discussed

-- Existing core tables (users, profiles, listings, etc.) remain the same...

-- Additional Services Tables

-- Course/Education System
CREATE TABLE courses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  instructor_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL, -- in cents
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  category TEXT NOT NULL,
  duration_hours INTEGER,
  thumbnail_url TEXT,
  trailer_url TEXT,
  rating REAL DEFAULT 0,
  enrollments_count INTEGER DEFAULT 0,
  revenue_total INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Course modules/lessons
CREATE TABLE course_modules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  course_id TEXT NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  video_url TEXT,
  content TEXT, -- Markdown content
  duration_minutes INTEGER,
  is_preview BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Course enrollments
CREATE TABLE course_enrollments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  course_id TEXT NOT NULL REFERENCES courses(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'refunded')),
  progress_percentage REAL DEFAULT 0,
  completed_at INTEGER,
  stripe_payment_intent_id TEXT,
  refunded_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(course_id, user_id)
);

-- White-Glove Service Requests
CREATE TABLE service_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  client_id TEXT NOT NULL REFERENCES users(id),
  service_type TEXT NOT NULL CHECK (service_type IN ('business_plan', 'mvp_development', 'market_research', 'investor_deck', 'due_diligence', 'full_package')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_min INTEGER, -- in cents
  budget_max INTEGER, -- in cents
  timeline_weeks INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'in_progress', 'completed', 'cancelled')),
  assigned_to TEXT REFERENCES users(id),
  quote_amount INTEGER,
  final_amount INTEGER,
  stripe_payment_intent_id TEXT,
  deliverables TEXT, -- JSON array of deliverable URLs
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comment TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Idea Validation Service
CREATE TABLE validation_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  listing_id TEXT REFERENCES listings(id),
  requester_id TEXT NOT NULL REFERENCES users(id),
  validation_type TEXT DEFAULT 'basic' CHECK (validation_type IN ('basic', 'comprehensive', 'market_analysis')),
  price INTEGER NOT NULL, -- in cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delivered')),
  ai_analysis TEXT,
  expert_review TEXT,
  market_score REAL,
  feasibility_score REAL,
  report_url TEXT,
  stripe_payment_intent_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER
);

-- Listing Boosts/Promotions
CREATE TABLE listing_boosts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  boost_type TEXT NOT NULL CHECK (boost_type IN ('featured', 'premium', 'homepage')),
  price INTEGER NOT NULL, -- in cents
  duration_days INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  stripe_payment_intent_id TEXT,
  started_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Affiliate/Partner Program
CREATE TABLE affiliates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  referral_code TEXT UNIQUE NOT NULL,
  commission_rate REAL DEFAULT 0.1, -- 10% default
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
  total_referrals INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0, -- in cents
  stripe_express_account_id TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Affiliate referrals tracking
CREATE TABLE referrals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  affiliate_id TEXT NOT NULL REFERENCES affiliates(id),
  referred_user_id TEXT NOT NULL REFERENCES users(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('listing_sale', 'course_purchase', 'service_purchase', 'subscription')),
  transaction_id TEXT NOT NULL, -- Reference to offers, enrollments, etc.
  commission_amount INTEGER NOT NULL, -- in cents
  commission_paid BOOLEAN DEFAULT FALSE,
  stripe_transfer_id TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Business Concept Templates
CREATE TABLE templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  creator_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL, -- in cents (0 for free)
  type TEXT DEFAULT 'business_plan' CHECK (type IN ('business_plan', 'pitch_deck', 'financial_model', 'technical_spec')),
  template_data TEXT NOT NULL, -- JSON structure
  downloads_count INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Template purchases
CREATE TABLE template_purchases (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  template_id TEXT NOT NULL REFERENCES templates(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL, -- in cents
  stripe_payment_intent_id TEXT,
  downloaded_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(template_id, buyer_id)
);

-- Subscription tiers and benefits
CREATE TABLE subscription_tiers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  price_monthly INTEGER NOT NULL, -- in cents
  price_yearly INTEGER NOT NULL, -- in cents
  features TEXT NOT NULL, -- JSON array of features
  listing_limit INTEGER, -- NULL for unlimited
  boost_credits INTEGER DEFAULT 0,
  commission_discount REAL DEFAULT 0, -- Percentage discount on platform fees
  priority_support BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (unixepoch())
);

-- AI Analysis Queue (for automated listing scoring)
CREATE TABLE ai_analysis_queue (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('market_validation', 'feasibility_check', 'plagiarism_check', 'quality_score')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  input_data TEXT, -- JSON
  result_data TEXT, -- JSON
  confidence_score REAL,
  processing_time_ms INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER
);

-- Platform revenue tracking
CREATE TABLE revenue_analytics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  transaction_type TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  gross_amount INTEGER NOT NULL, -- in cents
  platform_fee INTEGER NOT NULL, -- in cents
  net_amount INTEGER NOT NULL, -- in cents
  stripe_fee INTEGER, -- in cents
  user_id TEXT REFERENCES users(id),
  metadata TEXT, -- JSON for additional context
  created_at INTEGER DEFAULT (unixepoch())
);

-- Notification system
CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('listing_viewed', 'offer_received', 'offer_accepted', 'payment_received', 'course_enrolled', 'new_review')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at INTEGER,
  action_url TEXT,
  metadata TEXT, -- JSON
  created_at INTEGER DEFAULT (unixepoch())
);

-- Enhanced indexes for new tables
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX idx_service_requests_client ON service_requests(client_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_validation_requests_listing ON validation_requests(listing_id);
CREATE INDEX idx_listing_boosts_listing ON listing_boosts(listing_id);
CREATE INDEX idx_listing_boosts_expires ON listing_boosts(expires_at);
CREATE INDEX idx_affiliates_user ON affiliates(user_id);
CREATE INDEX idx_referrals_affiliate ON referrals(affiliate_id);
CREATE INDEX idx_templates_creator ON templates(creator_id);
CREATE INDEX idx_template_purchases_buyer ON template_purchases(buyer_id);
CREATE INDEX idx_ai_analysis_status ON ai_analysis_queue(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read_at);
