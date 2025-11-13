-- Migration 007: Add Profile Features
-- Lightning address, avatar, theme preferences, security settings

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS lightning_address VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'light';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP DEFAULT NOW();

-- Add preferences for notifications
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  marketing_emails BOOLEAN DEFAULT FALSE,
  job_updates BOOLEAN DEFAULT TRUE,
  payment_alerts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add avatar uploads tracking
CREATE TABLE IF NOT EXISTS user_avatars (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Add security audit log
CREATE TABLE IF NOT EXISTS security_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- 'login', 'password_change', '2fa_enable', etc.
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_lightning_address ON users(lightning_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON user_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit_log(created_at);

-- Add comments
COMMENT ON COLUMN users.lightning_address IS 'Lightning address for receiving payments (e.g., user@getalby.com)';
COMMENT ON COLUMN users.avatar_url IS 'URL to user profile picture/avatar';
COMMENT ON COLUMN users.theme_preference IS 'UI theme: light, dark, or system';
COMMENT ON TABLE user_preferences IS 'User notification and communication preferences';
COMMENT ON TABLE security_audit_log IS 'Security events and audit trail';
