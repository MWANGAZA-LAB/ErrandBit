-- Migration: Add Security Fields to Users Table
-- Description: Adds fields required for secure authentication and user management
-- Created: 2025-11-09

-- Add security-related columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT true NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active and can log in';
COMMENT ON COLUMN users.is_banned IS 'Whether the user has been banned from the platform';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of the user last successful login';
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.account_locked_until IS 'Timestamp until which the account is locked due to failed attempts';
COMMENT ON COLUMN users.password_changed_at IS 'Timestamp of last password change';
COMMENT ON COLUMN users.email_verified IS 'Whether the user email has been verified';
COMMENT ON COLUMN users.phone_verified IS 'Whether the user phone has been verified';

-- Create indexes for performance on security queries
CREATE INDEX IF NOT EXISTS idx_users_active_banned 
ON users(is_active, is_banned) 
WHERE is_active = true AND is_banned = false;

CREATE INDEX IF NOT EXISTS idx_users_last_login 
ON users(last_login_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_account_locked 
ON users(account_locked_until) 
WHERE account_locked_until IS NOT NULL;

-- Create audit log table for security events
CREATE TABLE IF NOT EXISTS security_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  event_severity VARCHAR(20) NOT NULL CHECK (event_severity IN ('low', 'medium', 'high', 'critical')),
  ip_address INET,
  user_agent TEXT,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_security_audit_user 
ON security_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_type 
ON security_audit_log(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_severity 
ON security_audit_log(event_severity, created_at DESC) 
WHERE event_severity IN ('high', 'critical');

CREATE INDEX IF NOT EXISTS idx_security_audit_created 
ON security_audit_log(created_at DESC);

-- Add comment for audit log table
COMMENT ON TABLE security_audit_log IS 'Audit log for security-related events (login attempts, authorization failures, etc.)';

-- Function to automatically lock account after failed attempts
CREATE OR REPLACE FUNCTION check_and_lock_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Lock account for 30 minutes after 5 failed attempts
  IF NEW.failed_login_attempts >= 5 THEN
    NEW.account_locked_until = NOW() + INTERVAL '30 minutes';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for account locking
DROP TRIGGER IF EXISTS trigger_lock_account ON users;
CREATE TRIGGER trigger_lock_account
  BEFORE UPDATE OF failed_login_attempts ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_and_lock_account();

-- Function to reset failed attempts on successful login
CREATE OR REPLACE FUNCTION reset_failed_attempts()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset failed attempts and unlock account on successful login
  IF NEW.last_login_at > OLD.last_login_at OR OLD.last_login_at IS NULL THEN
    NEW.failed_login_attempts = 0;
    NEW.account_locked_until = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for resetting failed attempts
DROP TRIGGER IF EXISTS trigger_reset_failed_attempts ON users;
CREATE TRIGGER trigger_reset_failed_attempts
  BEFORE UPDATE OF last_login_at ON users
  FOR EACH ROW
  EXECUTE FUNCTION reset_failed_attempts();

-- Insert initial audit log entry
INSERT INTO security_audit_log (event_type, event_severity, event_data)
VALUES ('migration_applied', 'low', '{"migration": "003_add_security_fields", "description": "Added security fields and audit logging"}');
