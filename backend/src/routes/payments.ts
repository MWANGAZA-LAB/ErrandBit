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

export default router;
