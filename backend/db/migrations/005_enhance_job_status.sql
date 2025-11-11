-- Migration: Enhance job status flow for payment verification
-- Date: 2025-11-11
-- Description: Adds new job statuses to support multi-wallet payment flow

-- Add paid_at column if it doesn't exist
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- First, check existing constraint name
DO $$ 
BEGIN
  -- Drop old constraint if it exists (from original schema)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_status_check' AND conrelid = 'jobs'::regclass
  ) THEN
    ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
  END IF;
END $$;

-- Add new enhanced status constraint
ALTER TABLE jobs 
ADD CONSTRAINT jobs_status_check 
CHECK (status IN (
  'open',                          -- Job posted, awaiting runner
  'accepted',                      -- Runner accepted job
  'in_progress',                   -- Runner working on job
  'completed',                     -- Job completed by runner
  'awaiting_payment',              -- Job done, waiting for client payment
  'payment_pending_verification',  -- Payment submitted, needs manual verification
  'payment_confirmed',             -- Payment verified and confirmed
  'paid',                          -- Payment completed (legacy status)
  'disputed',                      -- Payment or job disputed
  'cancelled'                      -- Job cancelled
));

-- Add index for payment-related status queries
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status 
ON jobs(status) 
WHERE status IN ('awaiting_payment', 'payment_pending_verification', 'payment_confirmed');

-- Add index for runner's pending payment verifications
CREATE INDEX IF NOT EXISTS idx_jobs_runner_pending_payment 
ON jobs(runner_id, status) 
WHERE status = 'payment_pending_verification';

-- Add comments
COMMENT ON COLUMN jobs.status IS 
'Job lifecycle status: open → accepted → in_progress → completed → awaiting_payment → payment_confirmed/payment_pending_verification → paid';

-- Update existing jobs with old statuses if needed
-- Map any existing 'completed' jobs to 'awaiting_payment' if not yet paid
UPDATE jobs 
SET status = 'awaiting_payment' 
WHERE status = 'completed' 
  AND paid_at IS NULL
  AND completed_at IS NOT NULL;
