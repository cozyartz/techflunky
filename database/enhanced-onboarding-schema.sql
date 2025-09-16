-- Enhanced Seller Onboarding Database Schema
-- Supports the new revenue model with readiness assessment and member benefits

-- Enhanced seller profiles with readiness assessment
CREATE TABLE IF NOT EXISTS seller_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,

    -- Platform information
    platform_name TEXT NOT NULL,
    platform_description TEXT NOT NULL,
    platform_type TEXT NOT NULL,
    tech_stack TEXT, -- JSON array
    estimated_users TEXT,
    months_development INTEGER,
    suggested_price INTEGER, -- In cents
    price_flexible INTEGER DEFAULT 1,
    accepts_escrow INTEGER DEFAULT 1,

    -- Readiness assessment
    readiness_score INTEGER DEFAULT 0, -- 0-100
    readiness_details TEXT, -- JSON object with full assessment
    readiness_missing TEXT, -- JSON array of missing items
    readiness_present TEXT, -- JSON array of present items
    completion_level TEXT, -- excellent, good, fair, needs_work

    -- Marketing package recommendations
    recommended_package TEXT, -- diy-starter, professional, market-ready, investor-grade
    package_purchased TEXT, -- Track if they bought recommended package
    package_order_id TEXT,

    -- Fee structure based on readiness
    marketplace_fee_rate REAL DEFAULT 0.10, -- 8-12% based on readiness
    base_fee_rate REAL DEFAULT 0.10,
    member_discount_eligible INTEGER DEFAULT 0,

    -- Membership
    membership_tier TEXT, -- none, starter-investor, professional-investor, enterprise-investor
    membership_active INTEGER DEFAULT 0,
    membership_subscription_id TEXT,
    membership_benefits_active INTEGER DEFAULT 0,

    -- Status tracking
    status TEXT DEFAULT 'draft', -- draft, onboarding_complete, listing_created, active, suspended
    profile_completeness REAL DEFAULT 0.0, -- 0.0-1.0
    listing_optimization_score INTEGER DEFAULT 0, -- 0-100

    -- Timestamps
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    onboarding_completed_at INTEGER,
    first_listing_created_at INTEGER,

    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_seller_readiness (readiness_score),
    INDEX idx_seller_membership (membership_tier),
    INDEX idx_seller_status (status)
);

-- Legal agreement tracking for liability protection
CREATE TABLE IF NOT EXISTS legal_agreements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    agreement_type TEXT NOT NULL, -- seller_onboarding_liability, terms_of_service, etc.
    agreement_version TEXT NOT NULL,
    agreed_at INTEGER NOT NULL,

    -- Legal compliance tracking
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,

    -- Agreement specifics
    agreement_data TEXT, -- JSON with specific agreements accepted
    witnessed_by TEXT,
    electronic_signature TEXT,

    -- Status
    status TEXT DEFAULT 'active', -- active, superseded, revoked
    superseded_by INTEGER, -- References newer agreement ID
    revoked_at INTEGER,
    revoked_reason TEXT,

    created_at INTEGER NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (superseded_by) REFERENCES legal_agreements(id),
    INDEX idx_legal_user_type (user_id, agreement_type),
    INDEX idx_legal_status (status),
    INDEX idx_legal_agreed_at (agreed_at)
);

-- Readiness assessment history for tracking improvements
CREATE TABLE IF NOT EXISTS readiness_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    seller_profile_id TEXT NOT NULL,

    -- Assessment details
    assessment_date INTEGER NOT NULL,
    score INTEGER NOT NULL, -- 0-100
    previous_score INTEGER DEFAULT 0,
    improvement INTEGER DEFAULT 0, -- Score difference from last assessment

    -- Detailed breakdown
    has_logo INTEGER DEFAULT 0,
    has_brand_kit INTEGER DEFAULT 0,
    has_business_plan INTEGER DEFAULT 0,
    has_financial_projections INTEGER DEFAULT 0,
    has_sales_video INTEGER DEFAULT 0,
    has_pitch_deck INTEGER DEFAULT 0,
    has_executive_summary INTEGER DEFAULT 0,
    has_marketing_materials INTEGER DEFAULT 0,
    has_legal_documents INTEGER DEFAULT 0,

    -- Calculated recommendations
    recommended_package TEXT,
    calculated_fee_rate REAL,
    membership_savings_potential INTEGER, -- Dollars saved per year with membership

    -- Assessment metadata
    assessment_trigger TEXT, -- onboarding, manual_update, package_purchase, etc.
    assessor TEXT DEFAULT 'system', -- system, admin, manual
    notes TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (seller_profile_id) REFERENCES seller_profiles(id),
    INDEX idx_assessment_user (user_id),
    INDEX idx_assessment_date (assessment_date),
    INDEX idx_assessment_score (score)
);

-- Fee optimization tracking (expanded)
CREATE TABLE IF NOT EXISTS fee_optimization_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    seller_profile_id TEXT NOT NULL,

    -- Fee structure changes
    previous_fee_rate REAL,
    new_fee_rate REAL,
    change_reason TEXT, -- readiness_improvement, membership_upgrade, package_purchase, etc.

    -- Impact calculation
    estimated_savings_per_10k INTEGER, -- Dollars saved per $10K sale
    estimated_annual_savings INTEGER, -- Based on projected sales
    optimization_value REAL, -- Business value score 0-100

    -- Change details
    change_date INTEGER NOT NULL,
    effective_date INTEGER,
    changed_by TEXT, -- system, admin, user_action
    change_metadata TEXT, -- JSON with additional context

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (seller_profile_id) REFERENCES seller_profiles(id),
    INDEX idx_fee_optimization_user (user_id),
    INDEX idx_fee_optimization_date (change_date)
);

-- Marketing package integration tracking
CREATE TABLE IF NOT EXISTS package_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    seller_profile_id TEXT NOT NULL,

    -- Recommendation details
    recommended_package TEXT NOT NULL, -- diy-starter, professional, market-ready, investor-grade
    recommendation_date INTEGER NOT NULL,
    recommendation_reason TEXT, -- Based on readiness assessment
    confidence_score REAL, -- 0-1 confidence in recommendation

    -- User response
    user_response TEXT, -- interested, not_interested, purchased, deferred
    response_date INTEGER,
    purchase_order_id TEXT, -- Links to marketing_package_orders

    -- Outcome tracking
    package_completed INTEGER DEFAULT 0,
    readiness_improvement INTEGER DEFAULT 0, -- Score increase after package
    fee_reduction_achieved REAL DEFAULT 0.0, -- Actual fee reduction
    roi_realized REAL DEFAULT 0.0, -- Return on package investment

    -- Follow-up
    follow_up_scheduled INTEGER,
    follow_up_completed INTEGER DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (seller_profile_id) REFERENCES seller_profiles(id),
    INDEX idx_package_recommendations_user (user_id),
    INDEX idx_package_recommendations_response (user_response)
);

-- Onboarding analytics for business intelligence
CREATE TABLE IF NOT EXISTS onboarding_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Time-based metrics
    date DATE NOT NULL,

    -- Onboarding funnel
    started_onboarding INTEGER DEFAULT 0,
    completed_step_1 INTEGER DEFAULT 0,
    completed_step_2 INTEGER DEFAULT 0,
    completed_step_3 INTEGER DEFAULT 0,
    completed_step_4 INTEGER DEFAULT 0,
    completed_step_5 INTEGER DEFAULT 0,
    completed_onboarding INTEGER DEFAULT 0,

    -- Readiness score distribution
    score_0_20 INTEGER DEFAULT 0,
    score_21_40 INTEGER DEFAULT 0,
    score_41_60 INTEGER DEFAULT 0,
    score_61_80 INTEGER DEFAULT 0,
    score_81_100 INTEGER DEFAULT 0,

    -- Package recommendations
    recommended_diy INTEGER DEFAULT 0,
    recommended_professional INTEGER DEFAULT 0,
    recommended_market_ready INTEGER DEFAULT 0,
    recommended_investor_grade INTEGER DEFAULT 0,

    -- Membership selections
    selected_starter INTEGER DEFAULT 0,
    selected_professional INTEGER DEFAULT 0,
    selected_enterprise INTEGER DEFAULT 0,
    selected_no_membership INTEGER DEFAULT 0,

    -- Fee rate distribution
    fee_rate_8_percent INTEGER DEFAULT 0,
    fee_rate_9_percent INTEGER DEFAULT 0,
    fee_rate_10_percent INTEGER DEFAULT 0,
    fee_rate_12_percent INTEGER DEFAULT 0,

    -- Conversion metrics
    package_purchase_rate REAL DEFAULT 0.0, -- Percentage who bought recommended package
    membership_conversion_rate REAL DEFAULT 0.0,
    onboarding_completion_rate REAL DEFAULT 0.0,

    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(date)
);

-- Insert sample legal agreement for reference
INSERT OR IGNORE INTO legal_agreements (
    user_id, agreement_type, agreement_version, agreed_at,
    ip_address, user_agent, agreement_data, status
) VALUES (
    'sample_user',
    'seller_onboarding_liability',
    '1.0',
    unixepoch(),
    '127.0.0.1',
    'Sample Browser/1.0',
    json_object(
        'agreesToTerms', true,
        'understandsRisks', true,
        'holdsHarmless', true,
        'noGuarantees', true,
        'timestamp', unixepoch(),
        'version', '1.0'
    ),
    'active'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_agreements_user_agreement ON legal_agreements(user_id, agreement_type, status);