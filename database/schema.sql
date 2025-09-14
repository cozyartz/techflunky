-- TechFlunky Database Schema
-- Cloudflare D1 (SQLite)

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'premium')),
  subscription_expires_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- User profiles
CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  bio TEXT,
  company TEXT,
  website TEXT,
  linkedin TEXT,
  avatar_url TEXT,
  seller_rating REAL DEFAULT 0,
  seller_reviews_count INTEGER DEFAULT 0,
  buyer_verified BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Business concepts/listings
CREATE TABLE listings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  seller_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  industry TEXT NOT NULL,
  price INTEGER NOT NULL, -- in cents
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'pending', 'sold', 'archived')),
  package_tier TEXT DEFAULT 'concept' CHECK (package_tier IN ('concept', 'blueprint', 'launch_ready')),
  
  -- Package contents
  market_research TEXT,
  business_plan_url TEXT,
  financial_model_url TEXT,
  technical_specs TEXT,
  mvp_url TEXT,
  pitch_deck_url TEXT,
  customer_validation TEXT,
  
  -- Metrics
  views_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  ai_score REAL,
  ai_feedback TEXT,
  
  -- Dates
  published_at INTEGER,
  sold_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Listing tags
CREATE TABLE listing_tags (
  listing_id TEXT NOT NULL REFERENCES listings(id),
  tag TEXT NOT NULL,
  PRIMARY KEY (listing_id, tag)
);

-- Offers/transactions
CREATE TABLE offers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL, -- in cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'completed')),
  stripe_payment_intent_id TEXT,
  escrow_released_at INTEGER,
  message TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Messages between buyers and sellers
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  offer_id TEXT NOT NULL REFERENCES offers(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  read_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Favorites/watchlist
CREATE TABLE favorites (
  user_id TEXT NOT NULL REFERENCES users(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, listing_id)
);

-- Reviews
CREATE TABLE reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  offer_id TEXT NOT NULL REFERENCES offers(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  reviewed_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Analytics events
CREATE TABLE analytics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id),
  listing_id TEXT REFERENCES listings(id),
  event_type TEXT NOT NULL,
  metadata TEXT, -- JSON
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for performance
CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_offers_listing ON offers(listing_id);
CREATE INDEX idx_offers_buyer ON offers(buyer_id);
CREATE INDEX idx_messages_offer ON messages(offer_id);
CREATE INDEX idx_analytics_user ON analytics(user_id);
CREATE INDEX idx_analytics_listing ON analytics(listing_id);
