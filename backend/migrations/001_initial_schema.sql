-- =====================================================
-- ErrandBit Database Schema
-- Refactored version with INTEGER IDs and updated structure
-- =====================================================

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  
  -- Authentication
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Profile
  display_name VARCHAR(100),
  phone_number VARCHAR(20),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- =====================================================
-- RUNNER PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS runner_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Profile Details
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  lightning_address VARCHAR(255),
  
  -- Service Details
  hourly_rate_cents INTEGER, -- Store in cents to avoid decimal issues
  tags TEXT[] DEFAULT '{}',
  
  -- Location (PostGIS)
  location GEOGRAPHY(POINT, 4326),
  avatar_url TEXT,
  
  -- Trust Metrics
  completion_rate DECIMAL(5,2) DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_runner_profiles_user_id ON runner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_runner_profiles_location ON runner_profiles USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_runner_profiles_rating ON runner_profiles(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_runner_profiles_tags ON runner_profiles USING GIN(tags);

-- =====================================================
-- JOBS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  
  -- Parties
  client_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  runner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Job Details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL, -- Store in cents
  
  -- Location
  location GEOGRAPHY(POINT, 4326),
  
  -- Status Flow
  -- open → accepted → completed → payment_confirmed
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  
  -- Deadline
  deadline TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,
  payment_confirmed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_runner_id ON jobs(runner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs USING GIST(location);

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  
  -- Association
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Payment Details
  amount_sats BIGINT NOT NULL,
  payment_hash VARCHAR(64),
  preimage VARCHAR(64),
  
  -- Metadata
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_hash ON payments(payment_hash) WHERE payment_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- =====================================================
-- REVIEWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  
  -- Association
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE UNIQUE NOT NULL,
  reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Review Details
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_job_id ON reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

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
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_runner_profiles_updated_at 
  BEFORE UPDATE ON runner_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at 
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
-- Tables: 5 (users, runner_profiles, jobs, payments, reviews)
-- Indexes: 20+
-- Functions: 1
-- Triggers: 3
-- =====================================================
