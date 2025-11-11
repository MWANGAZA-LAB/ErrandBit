-- Migration: Add role column to users table
-- Date: 2025-11-11

-- Add role column with default value
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'client'
CHECK (role IN ('client', 'runner', 'admin'));

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update description
COMMENT ON COLUMN users.role IS 'User role: client (posts jobs), runner (completes jobs), or admin';
