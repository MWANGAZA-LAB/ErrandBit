-- Migration: Add username/password authentication
-- Date: 2025-11-06

-- Add username and password_hash columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Make phone_number optional (for username-based auth)
ALTER TABLE users 
ALTER COLUMN phone_number DROP NOT NULL;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update existing users to have a username (if any exist)
UPDATE users 
SET username = 'user_' || id::text 
WHERE username IS NULL;
