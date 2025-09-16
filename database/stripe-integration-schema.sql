-- Additional tables for Stripe integration and marketing packages
-- Run this after the main schema to add new functionality

-- Marketing Package Orders table
CREATE TABLE IF NOT EXISTS marketing_package_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    package_slug TEXT NOT NULL,
    stripe_payment_intent_id TEXT,
    stripe_customer_id TEXT,
    total_amount INTEGER NOT NULL,
    order_items TEXT, -- JSON array of items
    add_ons TEXT, -- JSON array of add-on services
    rush_delivery INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending_payment',
    stripe_payment_status TEXT,
    project_details TEXT, -- JSON object with project requirements
    special_requests TEXT,
    estimated_delivery INTEGER,
    actual_delivery INTEGER,
    fulfillment_team_assigned TEXT,
    fulfillment_status TEXT DEFAULT 'pending',
    client_approval_status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Enhanced revenue analytics with more detail
CREATE TABLE IF NOT EXISTS enhanced_revenue_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_type TEXT NOT NULL, -- subscription_payment, marketing_package, platform_sale, etc.
    transaction_id TEXT NOT NULL, -- Stripe payment intent/subscription ID
    user_id TEXT NOT NULL,

    -- Financial details
    gross_amount INTEGER NOT NULL,
    platform_fee INTEGER DEFAULT 0,
    net_amount INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'usd',

    -- Member discount tracking
    is_member INTEGER DEFAULT 0,
    member_discount_rate REAL DEFAULT 0.0, -- 0.02 for 2% discount
    base_fee_rate REAL DEFAULT 0.10, -- 10% base rate
    applied_fee_rate REAL DEFAULT 0.10, -- Actual rate applied

    -- Subscription specific
    subscription_tier TEXT,
    billing_cycle TEXT, -- monthly, yearly
    subscription_period_start INTEGER,
    subscription_period_end INTEGER,

    -- Marketing package specific
    package_slug TEXT,
    package_name TEXT,
    add_ons_purchased TEXT, -- JSON array
    rush_delivery INTEGER DEFAULT 0,

    -- Platform sale specific
    platform_id TEXT,
    seller_id TEXT,
    buyer_id TEXT,
    escrow_status TEXT,

    -- Metadata and tracking
    stripe_fee INTEGER DEFAULT 0, -- Stripe's processing fee
    tax_amount INTEGER DEFAULT 0,
    refund_amount INTEGER DEFAULT 0,
    refund_reason TEXT,

    metadata TEXT, -- JSON object for additional data
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,

    INDEX idx_revenue_user_id (user_id),
    INDEX idx_revenue_type (transaction_type),
    INDEX idx_revenue_created_at (created_at),
    INDEX idx_revenue_member_status (is_member)
);

-- User subscription enhancements for member benefits
ALTER TABLE user_subscriptions ADD COLUMN member_benefits_active INTEGER DEFAULT 1;
ALTER TABLE user_subscriptions ADD COLUMN fee_discount_rate REAL DEFAULT 0.02;
ALTER TABLE user_subscriptions ADD COLUMN last_payment_status TEXT;
ALTER TABLE user_subscriptions ADD COLUMN last_payment_date INTEGER;
ALTER TABLE user_subscriptions ADD COLUMN stripe_customer_id TEXT;

-- Marketing package fulfillment tracking
CREATE TABLE IF NOT EXISTS marketing_fulfillment_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    task_type TEXT NOT NULL, -- logo_design, video_production, business_plan, etc.
    task_name TEXT NOT NULL,
    assigned_to TEXT,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, approved, revision_needed
    priority INTEGER DEFAULT 3, -- 1=urgent, 2=high, 3=normal, 4=low, 5=deferred

    -- Time tracking
    estimated_hours REAL DEFAULT 0,
    actual_hours REAL DEFAULT 0,
    started_at INTEGER,
    completed_at INTEGER,
    approved_at INTEGER,

    -- Deliverables
    deliverable_type TEXT, -- file, link, document, video, etc.
    deliverable_url TEXT,
    client_notes TEXT,
    revision_count INTEGER DEFAULT 0,

    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,

    FOREIGN KEY (order_id) REFERENCES marketing_package_orders(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_fulfillment_order (order_id),
    INDEX idx_fulfillment_status (status),
    INDEX idx_fulfillment_assigned (assigned_to)
);

-- Stripe customer mapping for better customer management
CREATE TABLE IF NOT EXISTS stripe_customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    email TEXT,
    name TEXT,

    -- Subscription info
    active_subscriptions INTEGER DEFAULT 0,
    total_subscription_value INTEGER DEFAULT 0,

    -- Purchase history
    total_spent INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    last_purchase_date INTEGER,

    -- Member status
    is_member INTEGER DEFAULT 0,
    member_since INTEGER,
    member_tier TEXT,

    -- Payment methods
    default_payment_method_id TEXT,
    has_valid_payment_method INTEGER DEFAULT 0,

    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Webhook events log for debugging and audit
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed INTEGER DEFAULT 0,
    processing_error TEXT,

    -- Event data
    user_id TEXT,
    subscription_id TEXT,
    payment_intent_id TEXT,
    customer_id TEXT,

    event_data TEXT, -- JSON of the full event
    created_at INTEGER NOT NULL,
    processed_at INTEGER,

    INDEX idx_webhook_type (event_type),
    INDEX idx_webhook_processed (processed),
    INDEX idx_webhook_created_at (created_at)
);

-- Fee optimization tracking (for analyzing member conversion)
CREATE TABLE IF NOT EXISTS fee_savings_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL,

    -- Fee comparison
    base_fee_rate REAL NOT NULL, -- 0.10 (10%)
    applied_fee_rate REAL NOT NULL, -- 0.08 (8%) for members
    discount_rate REAL NOT NULL, -- 0.02 (2%)

    -- Dollar amounts
    transaction_amount INTEGER NOT NULL,
    base_fee_amount INTEGER NOT NULL,
    applied_fee_amount INTEGER NOT NULL,
    savings_amount INTEGER NOT NULL, -- Dollars saved by being member

    -- Member info
    is_member INTEGER NOT NULL,
    member_tier TEXT,
    subscription_cost INTEGER, -- Monthly cost of membership

    -- ROI calculation
    savings_roi REAL, -- Savings amount / subscription cost
    payback_transactions INTEGER, -- How many transactions to pay back membership

    created_at INTEGER NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_fee_savings_user (user_id),
    INDEX idx_fee_savings_member (is_member)
);

-- Insert default fee savings data for analysis
INSERT OR IGNORE INTO fee_savings_tracking (
    user_id, transaction_id, base_fee_rate, applied_fee_rate, discount_rate,
    transaction_amount, base_fee_amount, applied_fee_amount, savings_amount,
    is_member, member_tier, subscription_cost, savings_roi, payback_transactions,
    created_at
) VALUES
-- Examples for ROI analysis
('example_member', 'example_10k', 0.10, 0.08, 0.02, 1000000, 100000, 80000, 20000, 1, 'starter-investor', 1900, 10.53, 1, unixepoch()),
('example_member', 'example_25k', 0.10, 0.08, 0.02, 2500000, 250000, 200000, 50000, 1, 'starter-investor', 1900, 26.32, 1, unixepoch()),
('example_member', 'example_50k', 0.10, 0.08, 0.02, 5000000, 500000, 400000, 100000, 1, 'starter-investor', 1900, 52.63, 1, unixepoch());