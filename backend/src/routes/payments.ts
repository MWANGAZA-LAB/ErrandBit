import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import { getPool } from '../db';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import {
  paymentInstructionValidation,
  validateInvoiceValidation,
  confirmPaymentValidation,
} from '../validators/payment';
import {
  validateLightningInvoice,
  centsToSats,
  verifyPreimage,
} from '../utils/lightning';
import {
  validatePaymentProof,
  validateVerificationUpdate,
  validateInvoiceCreation,
  rateLimitPayments,
  type PaymentValidationRequest
} from '../middleware/payment-validation';
import {
  verifyPayment,
  updatePaymentVerification,
  getPendingVerifications,
  createInvoice,
  recordPaymentTransaction,
  PaymentVerificationLevel
} from '../services/PaymentService';
import { payoutService } from '../services/PayoutService';

const router = Router();

/**
 * GET /payments/instruction?job_id=...
 * Get payment instruction for a job (requires authentication)
 */
router.get('/instruction', authenticate, paymentInstructionValidation, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const pool = getPool();
    if (!pool) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { job_id } = req.query as { job_id: string };

    // Fetch job details
    const jobResult = await pool.query(
      `SELECT j.id, j.price_cents, j.status, j.client_id, j.runner_id,
              rp.lightning_address, rp.display_name
       FROM jobs j
       JOIN runner_profiles rp ON j.runner_id = rp.user_id
       WHERE j.id = $1`,
      [job_id]
    );

    if (jobResult.rows.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const job = jobResult.rows[0];

    // Verify user is the client
    if (job.client_id !== req.userId) {
      res.status(403).json({ error: 'Only the client can request payment instructions' });
      return;
    }

    // Check job status
    if (job.status !== 'awaiting_payment' && job.status !== 'in_progress') {
      res.status(400).json({
        error: 'Job is not ready for payment',
        status: job.status,
      });
      return;
    }

    // Convert price to satoshis (using default BTC price)
    const amountSats = centsToSats(job.price_cents);

    res.json({
      job_id: parseInt(job_id),
      amount_cents: job.price_cents,
      amount_sats: amountSats,
      fiat_equiv_usd: (job.price_cents / 100).toFixed(2),
      runner: {
        lightning_address: job.lightning_address,
        display_name: job.display_name,
      },
      instructions: [
        'Request a Lightning invoice from the runner',
        'Verify the invoice amount matches the job price',
        'Pay the invoice using your Lightning wallet or WebLN',
        'Submit the payment preimage to confirm payment',
      ],
    });
  } catch (error) {
    console.error('Payment instruction error:', error);
    res.status(500).json({ error: 'Failed to get payment instructions', message: (error as Error).message });
  }
});

/**
 * POST /payments/validate-invoice
 * Validate a Lightning invoice for a job (requires authentication)
 */
router.post('/validate-invoice', authenticate, validateInvoiceValidation, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const pool = getPool();
    if (!pool) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { job_id, bolt11 } = req.body as { job_id: number; bolt11: string };

    // Fetch job details
    const jobResult = await pool.query(
      'SELECT id, price_cents, status, client_id, runner_id FROM jobs WHERE id = $1',
      [job_id]
    );

    if (jobResult.rows.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const job = jobResult.rows[0];

    // Verify user is involved in the job
    if (job.client_id !== req.userId && job.runner_id !== req.userId) {
      res.status(403).json({ error: 'You are not authorized to validate this invoice' });
      return;
    }

    // Convert expected amount to satoshis
    const expectedAmountSats = centsToSats(job.price_cents);

    // Validate the invoice
    const validation = await validateLightningInvoice(bolt11, expectedAmountSats, pool);

    if (!validation.isValid) {
      res.status(400).json({
        is_valid: false,
        error: validation.error,
        details: validation.details,
      });
      return;
    }

    res.json({
      is_valid: true,
      job_id: parseInt(String(job_id)),
      amount_sats: validation.invoice?.amountSats,
      amount_cents: job.price_cents,
      payment_hash: validation.invoice?.paymentHash,
      expires_at: validation.invoice?.expiresAt,
      description: validation.invoice?.description,
    });
  } catch (error) {
    console.error('Invoice validation error:', error);
    res.status(500).json({ error: 'Failed to validate invoice', message: (error as Error).message });
  }
});

/**
 * POST /payments/confirm
 * Confirm payment with preimage (requires authentication)
 */
router.post('/confirm', authenticate, confirmPaymentValidation, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const pool = getPool();
    if (!pool) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { job_id, preimage, payment_hash } = req.body as {
      job_id: number;
      preimage?: string;
      payment_hash?: string;
    };

    // Fetch job details
    const jobResult = await pool.query(
      'SELECT id, price_cents, status, client_id, runner_id FROM jobs WHERE id = $1',
      [job_id]
    );

    if (jobResult.rows.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const job = jobResult.rows[0];

    // Verify user is the client (only client can confirm payment)
    if (job.client_id !== req.userId) {
      res.status(403).json({ error: 'Only the client can confirm payment' });
      return;
    }

    // Verify preimage if provided
    if (preimage && payment_hash) {
      const isValid = await verifyPreimage(preimage, payment_hash);
      if (!isValid) {
        res.status(400).json({ error: 'Invalid preimage' });
        return;
      }
    }

    // Check if payment already recorded
    const existingPayment = await pool.query(
      'SELECT id FROM payments WHERE job_id = $1',
      [job_id]
    );

    if (existingPayment.rows.length > 0) {
      res.status(409).json({ error: 'Payment already confirmed for this job' });
      return;
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Record payment
      const amountSats = centsToSats(job.price_cents);
      await pool.query(
        `INSERT INTO payments (job_id, payment_hash, preimage, amount_sats, paid_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [job_id, payment_hash || null, preimage || null, amountSats]
      );

      // Update job status
      await pool.query(
        `UPDATE jobs 
         SET status = 'payment_confirmed', payment_confirmed_at = NOW()
         WHERE id = $1`,
        [job_id]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        job_id: parseInt(String(job_id)),
        status: 'payment_confirmed',
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm payment', message: (error as Error).message });
  }
});

/**
 * POST /api/payments/verify-multi-wallet
 * Verify a Lightning payment (multi-wallet support)
 */
router.post(
  '/verify-multi-wallet',
  authenticate,
  rateLimitPayments,
  validatePaymentProof,
  async (req: PaymentValidationRequest, res: Response) => {
    try {
      const { jobId, paymentHash, proof, method } = req.body;

      // Verify the payment
      const result = await verifyPayment(paymentHash, proof, method);

      // Record the transaction
      const transaction = await recordPaymentTransaction(
        jobId,
        paymentHash,
        0, // Amount will be updated from invoice
        method
      );

      // If cryptographically verified, update job status
      if (result.verified && result.level === PaymentVerificationLevel.CRYPTOGRAPHIC) {
        const pool = getPool();
        
        if (pool) {
          await pool.query(
            `UPDATE jobs 
             SET status = 'payment_confirmed',
                 paid_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1`,
            [jobId]
          );

          // Update transaction status
          await pool.query(
            `UPDATE lightning_transactions
             SET status = 'completed',
                 payment_preimage = $1,
                 verification_level = $2,
                 updated_at = NOW()
             WHERE payment_hash = $3`,
            [proof, PaymentVerificationLevel.CRYPTOGRAPHIC, paymentHash]
          );

          // AUTOMATICALLY TRIGGER RUNNER PAYOUT
          console.log(`Processing automatic payout for job ${jobId}...`);
          
          // Process payout asynchronously (don't block response)
          payoutService.processJobPayout(jobId)
            .then((success) => {
              if (success) {
                console.log(`Runner payout completed for job ${jobId}`);
              } else {
                console.error(`Runner payout failed for job ${jobId}`);
              }
            })
            .catch((error) => {
              console.error(`Runner payout error for job ${jobId}:`, error);
            });
        }
      }

      res.status(200).json({
        success: result.verified,
        verificationLevel: result.level,
        message: result.message,
        transactionId: transaction.id
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({
        error: 'Payment verification failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/payments/create-invoice-multi-wallet
 * Create a Lightning invoice for a job (multi-wallet support)
 */
router.post(
  '/create-invoice-multi-wallet',
  authenticate,
  rateLimitPayments,
  validateInvoiceCreation,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { jobId, amountSats } = req.body;
      const userId = req.userId;

      const pool = getPool();
      
      if (!pool) {
        throw new Error('Database connection not available');
      }

      const jobResult = await pool.query(
        'SELECT client_id, title FROM jobs WHERE id = $1',
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        res.status(404).json({
          error: 'Job not found'
        });
        return;
      }

      const job = jobResult.rows[0];
      if (job.client_id !== userId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You can only create invoices for your own jobs'
        });
        return;
      }

      // Create the invoice
      const invoice = await createInvoice(
        amountSats,
        `Payment for job: ${job.title}`
      );

      res.status(200).json({
        success: true,
        invoice: {
          paymentRequest: invoice.paymentRequest,
          paymentHash: invoice.paymentHash,
          amountSats: invoice.amountSats,
          expiresAt: invoice.expiresAt
        },
        // Only include test preimage in development
        ...(process.env.NODE_ENV === 'development' && {
          _testPreimage: invoice._testPreimage
        })
      });
    } catch (error) {
      console.error('Invoice creation error:', error);
      res.status(500).json({
        error: 'Invoice creation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/payments/update-verification
 * Update payment verification status (runner/admin only)
 */
router.put(
  '/update-verification',
  authenticate,
  validateVerificationUpdate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { paymentHash, verificationLevel } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required'
        });
        return;
      }

      await updatePaymentVerification(
        paymentHash,
        verificationLevel,
        userId as number
      );

      res.status(200).json({
        success: true,
        message: 'Verification status updated'
      });
    } catch (error) {
      console.error('Verification update error:', error);
      res.status(500).json({
        error: 'Verification update failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/payments/pending-verifications
 * Get pending payment verifications for current runner
 */
router.get(
  '/pending-verifications',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required'
        });
        return;
      }

      const pending = await getPendingVerifications(userId as number);

      res.status(200).json({
        success: true,
        count: pending.length,
        verifications: pending
      });
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      res.status(500).json({
        error: 'Failed to fetch pending verifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;
