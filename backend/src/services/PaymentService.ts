/**
 * Payment Service
 * Handles Lightning payment verification and proof validation
 */

import crypto from 'crypto';
import { getPool } from '../db.js';

export type PaymentMethod = 'webln' | 'qr' | 'manual' | 'upload';

export enum PaymentVerificationLevel {
  CRYPTOGRAPHIC = 'cryptographic',
  PENDING_MANUAL = 'pending_manual',
  VERIFIED_MANUAL = 'verified_manual',
  DISPUTED = 'disputed'
}

export interface PaymentVerificationResult {
  verified: boolean;
  level: PaymentVerificationLevel;
  message: string;
}

/**
 * Verify a Lightning payment preimage against a payment hash
 * This provides cryptographic proof of payment
 * 
 * @param paymentHash - The payment hash (32 bytes hex)
 * @param preimage - The preimage to verify (32 bytes hex)
 * @returns true if preimage matches hash
 */
export function verifyPreimage(paymentHash: string, preimage: string): boolean {
  try {
    // Validate input format (64 hex characters = 32 bytes)
    if (!/^[a-fA-F0-9]{64}$/.test(paymentHash)) {
      console.error('Invalid payment hash format');
      return false;
    }
    if (!/^[a-fA-F0-9]{64}$/.test(preimage)) {
      console.error('Invalid preimage format');
      return false;
    }

    // Convert preimage to buffer and hash it with SHA256
    const preimageBuffer = Buffer.from(preimage, 'hex');
    const computedHash = crypto.createHash('sha256').update(preimageBuffer).digest('hex');

    // Compare computed hash with provided payment hash
    return computedHash.toLowerCase() === paymentHash.toLowerCase();
  } catch (error) {
    console.error('Error verifying preimage:', error);
    return false;
  }
}

/**
 * Verify a payment based on the payment method used
 * 
 * @param paymentHash - The payment hash from the invoice
 * @param proof - The payment proof (preimage or image data)
 * @param method - The payment method used
 * @returns Verification result with level and message
 */
export async function verifyPayment(
  paymentHash: string,
  proof: string,
  method: PaymentMethod
): Promise<PaymentVerificationResult> {
  
  // WebLN and Manual methods provide cryptographic proof
  if (method === 'webln' || method === 'manual') {
    const isValid = verifyPreimage(paymentHash, proof);
    
    if (isValid) {
      return {
        verified: true,
        level: PaymentVerificationLevel.CRYPTOGRAPHIC,
        message: 'Payment verified cryptographically via preimage'
      };
    } else {
      return {
        verified: false,
        level: PaymentVerificationLevel.DISPUTED,
        message: 'Invalid preimage - does not match payment hash'
      };
    }
  }
  
  // QR and Upload methods require manual verification
  if (method === 'qr' || method === 'upload') {
    // Store the proof for manual review
    await storePaymentProof(paymentHash, proof);
    
    return {
      verified: false, // Not yet verified
      level: PaymentVerificationLevel.PENDING_MANUAL,
      message: 'Payment proof submitted. Awaiting runner confirmation.'
    };
  }

  return {
    verified: false,
    level: PaymentVerificationLevel.DISPUTED,
    message: 'Unknown payment method'
  };
}

/**
 * Store payment proof for manual verification
 * 
 * @param paymentHash - The payment hash
 * @param proof - The payment proof (image data or other evidence)
 */
async function storePaymentProof(
  paymentHash: string,
  proof: string
): Promise<void> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection not available');
  }

  await pool.query(
    `UPDATE lightning_transactions 
     SET payment_proof_image = $1, 
         verification_level = $2,
         updated_at = NOW()
     WHERE payment_hash = $3`,
    [proof, PaymentVerificationLevel.PENDING_MANUAL, paymentHash]
  );
}

/**
 * Update payment verification status
 * Called by runner or admin to confirm/dispute payment
 * 
 * @param paymentHash - The payment hash
 * @param level - The new verification level
 * @param verifierId - ID of user performing verification
 */
export async function updatePaymentVerification(
  paymentHash: string,
  level: PaymentVerificationLevel,
  verifierId: number
): Promise<void> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection not available');
  }

  await pool.query(
    `UPDATE lightning_transactions 
     SET verification_level = $1,
         status = CASE 
           WHEN $1 IN ('cryptographic', 'verified_manual') THEN 'completed'
           WHEN $1 = 'disputed' THEN 'failed'
           ELSE status
         END,
         updated_at = NOW()
     WHERE payment_hash = $2`,
    [level, paymentHash]
  );

  // Log the verification action
  console.log('Payment verification updated:', {
    paymentHash,
    level,
    verifierId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get pending manual verifications for a runner
 * Returns payments that need manual confirmation
 * 
 * @param runnerId - The runner's user ID
 * @returns Array of pending payment verifications
 */
export async function getPendingVerifications(runnerId: number) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection not available');
  }

  const result = await pool.query(
    `SELECT 
      lt.id,
      lt.payment_hash,
      lt.amount_sats,
      lt.payment_proof_image,
      lt.payment_method,
      lt.created_at,
      j.id as job_id,
      j.title as job_title,
      u.username as client_username
     FROM lightning_transactions lt
     JOIN jobs j ON lt.job_id = j.id
     JOIN users u ON j.client_id = u.id
     WHERE j.runner_id = $1
       AND lt.verification_level = $2
       AND lt.status = 'pending'
     ORDER BY lt.created_at ASC`,
    [runnerId, PaymentVerificationLevel.PENDING_MANUAL]
  );

  return result.rows;
}

/**
 * Create a Lightning invoice (mock for development)
 * In production, this would call LNBits or other Lightning backend
 * 
 * @param amountSats - Amount in satoshis
 * @param memo - Invoice description
 * @returns Invoice details
 */
export async function createInvoice(amountSats: number, memo: string) {
  // Mock invoice for testing
  // In production, integrate with LNBits, LND, CLN, etc.
  const paymentHash = crypto.randomBytes(32).toString('hex');
  const preimage = crypto.randomBytes(32).toString('hex');
  
  // Verify our mock data is correct
  const isValid = verifyPreimage(paymentHash, preimage);
  if (!isValid) {
    // If mock doesn't match, compute correct hash
    const preimageBuffer = Buffer.from(preimage, 'hex');
    const correctHash = crypto.createHash('sha256').update(preimageBuffer).digest('hex');
    
    return {
      paymentRequest: `lnbc${amountSats}n1...mock_invoice_${correctHash.substring(0, 8)}`,
      paymentHash: correctHash,
      amountSats,
      memo,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
      // Include preimage for testing only
      _testPreimage: preimage
    };
  }

  return {
    paymentRequest: `lnbc${amountSats}n1...mock_invoice_${paymentHash.substring(0, 8)}`,
    paymentHash,
    amountSats,
    memo,
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
    // Include preimage for testing only
    _testPreimage: preimage
  };
}

/**
 * Record a payment transaction in the database
 * 
 * @param jobId - The job ID
 * @param paymentHash - The payment hash
 * @param amountSats - Amount in satoshis
 * @param method - Payment method used
 */
export async function recordPaymentTransaction(
  jobId: number,
  paymentHash: string,
  amountSats: number,
  method: PaymentMethod
) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection not available');
  }

  // Get client ID from job
  const jobResult = await pool.query(
    'SELECT client_id FROM jobs WHERE id = $1',
    [jobId]
  );

  if (jobResult.rows.length === 0) {
    throw new Error('Job not found');
  }

  const clientId = jobResult.rows[0].client_id;

  const result = await pool.query(
    `INSERT INTO lightning_transactions (
      job_id, user_id, payment_hash, amount_sats, 
      transaction_type, payment_method, status, verification_level
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`,
    [
      jobId,
      clientId,
      paymentHash,
      amountSats,
      'job_payment',
      method,
      'pending',
      PaymentVerificationLevel.PENDING_MANUAL
    ]
  );

  return result.rows[0];
}
