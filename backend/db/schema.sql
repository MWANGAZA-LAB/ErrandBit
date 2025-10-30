-- ErrandBit Database Schema

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'runner', 'admin')),
  phone VARCHAR(20) UNIQUE,
  phone_verified BOOLEAN DEFAULT FALSE,
  email VARCHAR(255) UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  nostr_pubkey VARCHAR(64) UNIQUE,
  auth_method VARCHAR(20) CHECK (auth_method IN ('phone', 'email', 'nostr')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT auth_method_check CHECK (
    (auth_method = 'phone' AND phone IS NOT NULL) OR
    (auth_method = 'email' AND email IS NOT NULL) OR
    (auth_method = 'nostr' AND nostr_pubkey IS NOT NULL)
  )
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_nostr_pubkey ON users(nostr_pubkey);
CREATE INDEX idx_users_role ON users(role);

-- Runner profiles
CREATE TABLE runner_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  lightning_address VARCHAR(255),
  hourly_rate_cents INTEGER,
  tags TEXT[],
  location GEOGRAPHY(POINT, 4326),
  avatar_url TEXT,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_runner_profiles_user_id ON runner_profiles(user_id);
CREATE INDEX idx_runner_profiles_location ON runner_profiles USING GIST(location);
CREATE INDEX idx_runner_profiles_tags ON runner_profiles USING GIN(tags);

-- Jobs table
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES users(id),
  runner_id INTEGER REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  price_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (
    status IN ('requested', 'accepted', 'in_progress', 'awaiting_payment', 
               'payment_confirmed', 'completed', 'disputed', 'cancelled')
  ),
  client_location GEOGRAPHY(POINT, 4326),
  target_location GEOGRAPHY(POINT, 4326),
  distance_km_est DECIMAL(10,2),
  requested_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  started_at TIMESTAMP,
  ready_for_payment_at TIMESTAMP,
  payment_confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_runner_id ON jobs(runner_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT,
  media_url TEXT,
  ln_invoice TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_job_id ON messages(job_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Reviews table
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  job_id INTEGER UNIQUE NOT NULL REFERENCES jobs(id),
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  reviewee_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_job_id ON reviews(job_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);

-- Trust tiers table
CREATE TABLE trust_tiers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (tier IN ('new', 'established', 'verified_pro')),
  score_cache INTEGER DEFAULT 0,
  job_cap_cents INTEGER DEFAULT 5000,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trust_tiers_user_id ON trust_tiers(user_id);

-- Subscriptions table
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  runner_id INTEGER NOT NULL REFERENCES users(id),
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'pro')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  renewal_at TIMESTAMP,
  sats_paid_total INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_runner_id ON subscriptions(runner_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Boosts table
CREATE TABLE boosts (
  id SERIAL PRIMARY KEY,
  runner_id INTEGER NOT NULL REFERENCES users(id),
  category VARCHAR(50),
  starts_at TIMESTAMP DEFAULT NOW(),
  ends_at TIMESTAMP NOT NULL,
  sats_paid INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_boosts_runner_id ON boosts(runner_id);
CREATE INDEX idx_boosts_category ON boosts(category);
CREATE INDEX idx_boosts_ends_at ON boosts(ends_at);

-- Disputes table
CREATE TABLE disputes (
  id SERIAL PRIMARY KEY,
  job_id INTEGER UNIQUE NOT NULL REFERENCES jobs(id),
  opened_by INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'peer_mediation', 'admin_review', 'resolved', 'dismissed')
  ),
  evidence_urls TEXT[],
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_disputes_job_id ON disputes(job_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- Optional: Bonds table (for micro-bonds feature)
CREATE TABLE bonds (
  id SERIAL PRIMARY KEY,
  runner_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  sats_locked INTEGER NOT NULL,
  proof_ref TEXT,
  badge_active BOOLEAN DEFAULT TRUE,
  locked_at TIMESTAMP DEFAULT NOW(),
  unlocked_at TIMESTAMP
);

CREATE INDEX idx_bonds_runner_id ON bonds(runner_id);
