-- Performance Indexes Migration
-- Adds indexes for frequently queried columns and patterns
-- Note: CONCURRENTLY removed for initial setup (use in production with separate commands)

-- Jobs table indexes
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_runner_id ON jobs(runner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at DESC);

-- Spatial index for location-based job queries
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs USING GIST(location);

-- Runner profiles indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_runner_profiles_user_id ON runner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_runner_profiles_rating ON runner_profiles(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_runner_profiles_tags ON runner_profiles USING GIN(tags);

-- Spatial index for location-based runner queries
CREATE INDEX IF NOT EXISTS idx_runner_profiles_location ON runner_profiles USING GIST(location);

-- Payments indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_hash ON payments(payment_hash) WHERE payment_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Reviews indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_job_id ON reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Users table indexes (if not already present)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
