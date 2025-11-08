-- =====================================================
-- ErrandBit MVP Database Schema
-- Phase 0: Minimal Viable Product (5 core tables)
-- =====================================================

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Authentication
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Profile
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_created ON users(created_at);

-- =====================================================
-- RUNNER PROFILES TABLE
-- =====================================================
CREATE TABLE runner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Service Details
  hourly_rate_usd DECIMAL(10,2) NOT NULL,
  lightning_address VARCHAR(255) NOT NULL,
  
  -- Location (PostGIS)
  current_location GEOGRAPHY(POINT, 4326),
  service_radius_km DECIMAL(5,2) DEFAULT 5.0,
  
  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  service_categories TEXT[] DEFAULT '{}',
  
  -- Trust Metrics (simple for MVP)
  total_jobs_completed INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_runner_location ON runner_profiles USING GIST(current_location);
CREATE INDEX idx_runner_available ON runner_profiles(is_available);
CREATE INDEX idx_runner_user ON runner_profiles(user_id);

-- =====================================================
-- JOBS TABLE
-- =====================================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parties
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  runner_id UUID REFERENCES runner_profiles(id) ON DELETE SET NULL,
  
  -- Job Details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  
  -- Location
  pickup_location GEOGRAPHY(POINT, 4326),
  pickup_address TEXT,
  dropoff_location GEOGRAPHY(POINT, 4326),
  dropoff_address TEXT,
  
  -- Pricing
  budget_max_usd DECIMAL(10,2),
  agreed_price_usd DECIMAL(10,2),
  agreed_price_sats BIGINT,
  
  -- Status Flow (simplified for MVP)
  -- open → accepted → in_progress → completed → paid
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  paid_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_jobs_status ON jobs(status, created_at DESC);
CREATE INDEX idx_jobs_client ON jobs(client_id, status);
CREATE INDEX idx_jobs_runner ON jobs(runner_id, status);
CREATE INDEX idx_jobs_category ON jobs(category, status);
CREATE INDEX idx_jobs_location ON jobs USING GIST(pickup_location);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);

-- =====================================================
-- REVIEWS TABLE
-- =====================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Who reviewed whom
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Rating (1-5 stars)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- One review per job per reviewer
  UNIQUE(job_id, reviewer_id)
);

-- Indexes
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id, rating);
CREATE INDEX idx_reviews_job ON reviews(job_id);

-- =====================================================
-- LIGHTNING TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE lightning_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Association
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Transaction Details
  transaction_type VARCHAR(30) NOT NULL, -- job_payment, subscription, etc
  amount_sats BIGINT NOT NULL,
  amount_usd DECIMAL(10,2),
  
  -- Lightning Details
  payment_hash VARCHAR(64) UNIQUE NOT NULL,
  payment_request TEXT, -- BOLT11 invoice
  payment_preimage VARCHAR(64),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
  
  -- Provider
  provider VARCHAR(20) DEFAULT 'lnbits',
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ln_transactions_job ON lightning_transactions(job_id);
CREATE INDEX idx_ln_transactions_user ON lightning_transactions(user_id, status);
CREATE INDEX idx_ln_transactions_hash ON lightning_transactions(payment_hash);
CREATE INDEX idx_ln_transactions_status ON lightning_transactions(status, created_at);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_runner_profiles_updated_at BEFORE UPDATE ON runner_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lightning_transactions_updated_at BEFORE UPDATE ON lightning_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA (for testing)
-- =====================================================

-- Insert test user
INSERT INTO users (id, phone_number, phone_verified, display_name)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '+254700000001', true, 'Test Client'),
  ('00000000-0000-0000-0000-000000000002', '+254700000002', true, 'Test Runner');

-- Insert test runner profile
INSERT INTO runner_profiles (
  user_id, 
  hourly_rate_usd, 
  lightning_address, 
  current_location,
  service_categories
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  15.00,
  'runner@getalby.com',
  ST_SetSRID(ST_MakePoint(36.817223, -1.286389), 4326)::geography, -- Nairobi
  ARRAY['delivery', 'shopping']
);

-- =====================================================
-- VIEWS (for convenience)
-- =====================================================

-- View: Jobs with runner details
CREATE VIEW jobs_with_details AS
SELECT 
  j.*,
  c.display_name as client_name,
  c.phone_number as client_phone,
  r.hourly_rate_usd as runner_rate,
  u.display_name as runner_name,
  ST_Y(j.pickup_location::geometry) as pickup_lat,
  ST_X(j.pickup_location::geometry) as pickup_lng
FROM jobs j
LEFT JOIN users c ON j.client_id = c.id
LEFT JOIN runner_profiles r ON j.runner_id = r.id
LEFT JOIN users u ON r.user_id = u.id;

-- View: Runner profiles with user details
CREATE VIEW runners_with_details AS
SELECT 
  r.*,
  u.display_name,
  u.phone_number,
  u.avatar_url,
  ST_Y(r.current_location::geometry) as lat,
  ST_X(r.current_location::geometry) as lng
FROM runner_profiles r
JOIN users u ON r.user_id = u.id;

-- =====================================================
-- GRANTS (adjust based on your user)
-- =====================================================

-- Grant permissions to application user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO errandbit_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO errandbit_user;

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
-- Tables: 5
-- Indexes: 15
-- Views: 2
-- Functions: 1
-- Triggers: 4
-- =====================================================
