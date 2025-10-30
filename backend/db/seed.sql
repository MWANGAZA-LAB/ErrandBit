-- Seed data for testing ErrandBit

-- Insert test users
INSERT INTO users (role, phone, phone_verified, email, email_verified) VALUES
  ('client', '+15551234567', true, 'client1@test.com', true),
  ('runner', '+15559876543', true, 'runner1@test.com', true),
  ('runner', '+15555555555', true, 'runner2@test.com', true),
  ('admin', '+15551111111', true, 'admin@errandbit.com', true);

-- Insert runner profiles
INSERT INTO runner_profiles (user_id, display_name, bio, lightning_address, hourly_rate_cents, tags, location, completion_rate, avg_rating, total_jobs) VALUES
  (2, 'Alex Runner', 'Fast and reliable delivery service', 'alex@getalby.com', 2500, ARRAY['delivery', 'shopping'], ST_GeogFromText('POINT(-97.7431 30.2672)'), 95.5, 4.8, 42),
  (3, 'Sam Helper', 'Tech help and errands', 'sam@wallet.com', 3000, ARRAY['tech-help', 'assembly'], ST_GeogFromText('POINT(-97.7500 30.2700)'), 88.0, 4.5, 25);

-- Insert trust tiers
INSERT INTO trust_tiers (user_id, tier, score_cache, job_cap_cents) VALUES
  (1, 'new', 0, 5000),
  (2, 'established', 150, 20000),
  (3, 'established', 100, 20000),
  (4, 'verified_pro', 500, 999999);

-- Insert test jobs
INSERT INTO jobs (client_id, runner_id, title, description, category, price_cents, status, client_location, target_location, distance_km_est, requested_at, accepted_at) VALUES
  (1, 2, 'Grocery pickup', 'Pick up items from Whole Foods', 'shopping', 1500, 'accepted', ST_GeogFromText('POINT(-97.7431 30.2672)'), ST_GeogFromText('POINT(-97.7500 30.2700)'), 1.2, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes'),
  (1, NULL, 'Package delivery', 'Deliver package to downtown', 'delivery', 2000, 'requested', ST_GeogFromText('POINT(-97.7431 30.2672)'), ST_GeogFromText('POINT(-97.7400 30.2650)'), 0.8, NOW() - INTERVAL '15 minutes', NULL);

-- Insert test messages
INSERT INTO messages (job_id, sender_id, content) VALUES
  (1, 1, 'Hi! Can you pick up the items by 3pm?'),
  (1, 2, 'Sure! I can do that. On my way now.');

-- Insert test subscriptions
INSERT INTO subscriptions (runner_id, plan, status, renewal_at, sats_paid_total) VALUES
  (2, 'pro', 'active', NOW() + INTERVAL '30 days', 50000);

-- Insert test review
INSERT INTO reviews (job_id, reviewer_id, reviewee_id, rating, comment) VALUES
  (1, 1, 2, 5, 'Great service! Very fast and professional.');
