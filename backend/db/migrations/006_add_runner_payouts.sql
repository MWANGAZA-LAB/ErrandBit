-- Migration: Add Runner Payouts and Earnings Tracking
-- This enables automatic Lightning payouts to runners after jobs are paid

-- Runner Earnings Table
CREATE TABLE IF NOT EXISTS runner_earnings (
  id SERIAL PRIMARY KEY,
  runner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  
  -- Amount Details
  amount_cents INTEGER NOT NULL,
  amount_sats BIGINT NOT NULL,
  platform_fee_cents INTEGER DEFAULT 0,
  platform_fee_sats BIGINT DEFAULT 0,
  net_amount_cents INTEGER NOT NULL,
  net_amount_sats BIGINT NOT NULL,
  
  -- Payout Details
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  payout_method VARCHAR(30) DEFAULT 'lightning',
  lightning_address VARCHAR(255),
  
  -- Lightning Transaction
  payment_hash VARCHAR(64),
  payment_preimage VARCHAR(64),
  payment_request TEXT,
  
  -- Status Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- Error Tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_runner_earnings_runner ON runner_earnings(runner_id, status);
CREATE INDEX idx_runner_earnings_job ON runner_earnings(job_id);
CREATE INDEX idx_runner_earnings_status ON runner_earnings(status, created_at);
CREATE INDEX idx_runner_earnings_payment_hash ON runner_earnings(payment_hash);

-- Add payout tracking to lightning_transactions
ALTER TABLE lightning_transactions 
ADD COLUMN IF NOT EXISTS payout_to_runner_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS payout_status VARCHAR(30) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payout_completed_at TIMESTAMP;

-- Update trigger for runner_earnings
CREATE OR REPLACE FUNCTION update_runner_earnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_runner_earnings_updated_at
  BEFORE UPDATE ON runner_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_runner_earnings_updated_at();

-- Comments
COMMENT ON TABLE runner_earnings IS 'Tracks runner earnings and automatic Lightning payouts';
COMMENT ON COLUMN runner_earnings.status IS 'pending: awaiting payout, processing: payment sending, completed: paid, failed: payout failed';
COMMENT ON COLUMN runner_earnings.platform_fee_cents IS 'Platform commission in cents (e.g., 10% of job price)';
