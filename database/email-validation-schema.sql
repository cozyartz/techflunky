-- TechFlunky Email Validation and Offers Database Schema
-- This file shows the recommended database structure for production deployment

-- Email validation results table
CREATE TABLE IF NOT EXISTS email_validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    is_valid BOOLEAN NOT NULL,
    validation_score INTEGER NOT NULL, -- 0-100 confidence score
    valid_format BOOLEAN NOT NULL,
    valid_domain BOOLEAN NOT NULL,
    has_mx_record BOOLEAN NOT NULL,
    is_disposable BOOLEAN NOT NULL,
    is_free_provider BOOLEAN NOT NULL,
    is_role_based BOOLEAN NOT NULL,
    domain_suggestion TEXT NULL,
    validation_errors TEXT NULL, -- JSON array of error messages
    validated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL, -- Cache TTL
    INDEX idx_email (email),
    INDEX idx_validated_at (validated_at),
    INDEX idx_expires_at (expires_at)
);

-- Enhanced offers table with email validation tracking
CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY, -- e.g., offer_1234567890_abc123
    platform_id TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    offer_amount INTEGER NOT NULL, -- Amount in dollars (not cents)
    message TEXT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, countered, expired

    -- Email validation tracking
    email_validation_id INTEGER NULL,
    email_validation_score INTEGER NOT NULL,
    email_is_disposable BOOLEAN NOT NULL DEFAULT FALSE,
    email_is_role_based BOOLEAN NOT NULL DEFAULT FALSE,
    email_is_free_provider BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    FOREIGN KEY (email_validation_id) REFERENCES email_validations(id),

    -- Indexes for performance
    INDEX idx_platform_id (platform_id),
    INDEX idx_buyer_email (buyer_email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at),
    INDEX idx_email_validation_score (email_validation_score)
);

-- Platform view tracking with email validation
CREATE TABLE IF NOT EXISTS platform_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id TEXT NOT NULL,
    viewer_email TEXT NULL, -- Only if user is logged in
    viewer_ip TEXT NULL, -- For anonymous tracking
    user_agent TEXT NULL,
    referrer TEXT NULL,

    -- Email validation info (if email provided)
    email_validation_score INTEGER NULL,
    email_is_validated BOOLEAN DEFAULT FALSE,

    viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_platform_id (platform_id),
    INDEX idx_viewer_email (viewer_email),
    INDEX idx_viewed_at (viewed_at)
);

-- Blacklisted emails (for spam prevention)
CREATE TABLE IF NOT EXISTS email_blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL, -- spam, fraud, abuse, etc.
    blacklisted_by TEXT NULL, -- admin user who added it
    blacklisted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    INDEX idx_email (email),
    INDEX idx_blacklisted_at (blacklisted_at)
);

-- Email validation cache cleanup trigger
CREATE TRIGGER IF NOT EXISTS cleanup_expired_validations
    AFTER INSERT ON email_validations
    FOR EACH ROW
    WHEN (SELECT COUNT(*) FROM email_validations WHERE expires_at < datetime('now')) > 1000
BEGIN
    DELETE FROM email_validations
    WHERE expires_at < datetime('now', '-1 day')
    LIMIT 500;
END;

-- Update timestamps trigger for offers
CREATE TRIGGER IF NOT EXISTS update_offer_timestamp
    AFTER UPDATE ON offers
    FOR EACH ROW
BEGIN
    UPDATE offers
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Views for analytics and reporting
CREATE VIEW IF NOT EXISTS email_validation_stats AS
SELECT
    DATE(validated_at) as validation_date,
    COUNT(*) as total_validations,
    COUNT(CASE WHEN is_valid = TRUE THEN 1 END) as valid_emails,
    COUNT(CASE WHEN is_disposable = TRUE THEN 1 END) as disposable_emails,
    COUNT(CASE WHEN is_role_based = TRUE THEN 1 END) as role_based_emails,
    COUNT(CASE WHEN is_free_provider = TRUE THEN 1 END) as free_provider_emails,
    AVG(validation_score) as avg_validation_score
FROM email_validations
GROUP BY DATE(validated_at)
ORDER BY validation_date DESC;

CREATE VIEW IF NOT EXISTS offer_quality_metrics AS
SELECT
    DATE(created_at) as offer_date,
    COUNT(*) as total_offers,
    COUNT(CASE WHEN email_validation_score >= 80 THEN 1 END) as high_quality_offers,
    COUNT(CASE WHEN email_is_disposable = TRUE THEN 1 END) as disposable_email_offers,
    COUNT(CASE WHEN email_is_role_based = TRUE THEN 1 END) as role_based_email_offers,
    AVG(email_validation_score) as avg_email_score,
    AVG(offer_amount) as avg_offer_amount
FROM offers
GROUP BY DATE(created_at)
ORDER BY offer_date DESC;

-- Sample data for testing (remove in production)
INSERT OR IGNORE INTO email_validations (email, is_valid, validation_score, valid_format, valid_domain, has_mx_record, is_disposable, is_free_provider, is_role_based, expires_at) VALUES
('test@gmail.com', TRUE, 85, TRUE, TRUE, TRUE, FALSE, TRUE, FALSE, datetime('now', '+30 minutes')),
('admin@tempmail.com', FALSE, 25, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, datetime('now', '+30 minutes')),
('user@example.com', TRUE, 90, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, datetime('now', '+30 minutes'));

-- Production deployment notes:
-- 1. Replace this in-memory storage with actual Cloudflare D1 database
-- 2. Set up regular cleanup jobs for expired validations
-- 3. Implement email validation caching with appropriate TTL
-- 4. Add monitoring for email validation API rate limits
-- 5. Set up alerts for high percentages of invalid emails
-- 6. Consider implementing email verification via confirmation links for high-value offers