-- Migration: Add payment method tracking to lightning transactions
-- Date: 2025-11-11
-- Description: Adds payment_method column to support multi-wallet Lightning payments

-- Check if lightning_transactions table exists, create if not
CREATE TABLE IF NOT EXISTS lightning_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID,
  user_id UUID,
  transaction_type VARCHAR(30) NOT NULL,
  amount_sats BIGINT NOT NULL,
  amount_usd DECIMAL(10,2),
  payment_hash VARCHAR(64) UNIQUE NOT NULL,
  payment_request TEXT,
  payment_preimage VARCHAR(64),
  status VARCHAR(20) DEFAULT 'pending',
  provider VARCHAR(20) DEFAULT 'lnbits',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add payment_method column with constraint
ALTER TABLE lightning_transactions 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'webln' 
CHECK (payment_method IN ('webln', 'qr', 'manual', 'upload'));

-- Add column for storing payment proof images (for 'upload' method)
ALTER TABLE lightning_transactions 
ADD COLUMN IF NOT EXISTS payment_proof_image TEXT;

-- Add column for payment verification status
ALTER TABLE lightning_transactions 
ADD COLUMN IF NOT EXISTS verification_level VARCHAR(30) DEFAULT 'pending'
CHECK (verification_level IN ('cryptographic', 'pending_manual', 'verified_manual', 'disputed'));

-- Create index for querying by payment method
CREATE INDEX IF NOT EXISTS idx_ln_transactions_method 
ON lightning_transactions(payment_method, status);

-- Create index for pending manual verifications
CREATE INDEX IF NOT EXISTS idx_ln_transactions_verification 
ON lightning_transactions(verification_level, created_at) 
WHERE verification_level = 'pending_manual';

-- Add comments for documentation
COMMENT ON COLUMN lightning_transactions.payment_method IS 
'Payment method used: webln (browser wallet), qr (scanned), manual (pasted invoice), upload (screenshot)';

COMMENT ON COLUMN lightning_transactions.verification_level IS 
'Verification status: cryptographic (preimage verified), pending_manual (awaiting runner confirmation), verified_manual (runner confirmed), disputed (needs admin review)';

COMMENT ON COLUMN lightning_transactions.payment_proof_image IS 
'Base64-encoded payment proof image for upload method (max 5MB)';
