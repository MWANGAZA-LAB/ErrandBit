/**
 * Payments Routes - TypeScript (MVP)
 * Lightning Network payment handling
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { lightningService } from '../services/lightning.service.js';
import { jobService } from '../services/job.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /api/v1/payments/create-invoice
 * Create Lightning invoice for job payment
 */
router.post('/create-invoice', authenticate,
  [
    body('job_id').notEmpty().withMessage('Job ID required'),
    body('amount_usd').optional().isFloat({ min: 1 }).withMessage('Amount must be at least $1')
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
        return;
      }

      const { job_id, amount_usd } = req.body;

      // Get job details
      const job = await jobService.getJobById(job_id);
      if (!job) {
        res.status(404).json({ 
          success: false,
          error: 'Job not found' 
        });
        return;
      }

      // Verify job is completed
      if (job.status !== 'completed') {
        res.status(400).json({ 
          success: false,
          error: 'Job must be completed before payment' 
        });
        return;
      }

      // Verify user is the client
      if (job.client_id !== req.userId!) {
        res.status(403).json({ 
          success: false,
          error: 'Only the client can pay for this job' 
        });
        return;
      }

      // Use agreed price or provided amount
      const paymentAmount = amount_usd 
        ? parseFloat(amount_usd) 
        : job.agreed_price_usd || job.budget_max_usd;

      // Convert USD to satoshis
      const amountSats = await lightningService.usdToSats(paymentAmount);

      // Create Lightning invoice
      const invoice = await lightningService.createInvoice({
        amount_sats: amountSats,
        amount_usd: paymentAmount,
        job_id,
        user_id: req.userId!,
        description: `Payment for: ${job.title}`
      });

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        invoice: {
          payment_request: invoice.payment_request,
          payment_hash: invoice.payment_hash,
          amount_sats: invoice.amount_sats,
          amount_usd: paymentAmount,
          expires_at: invoice.expires_at
        }
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Create invoice error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create invoice',
        message: err.message 
      });
    }
  }
);

/**
 * GET /api/v1/payments/:hash/status
 * Check payment status
 */
router.get('/:hash/status', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { hash } = req.params;

    if (!hash) {
      res.status(400).json({ 
        success: false,
        error: 'Payment hash required' 
      });
      return;
    }

    const status = await lightningService.checkPaymentStatus(hash);

    res.json({
      success: true,
      payment: status
    });
  } catch (error) {
    const err = error as Error;
    console.error('Check payment status error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check payment status',
      message: err.message 
    });
  }
});

/**
 * GET /api/v1/payments/:hash
 * Get payment transaction details
 */
router.get('/:hash', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { hash } = req.params;

    if (!hash) {
      res.status(400).json({ 
        success: false,
        error: 'Payment hash required' 
      });
      return;
    }

    const transaction = await lightningService.getTransaction(hash);

    if (!transaction) {
      res.status(404).json({ 
        success: false,
        error: 'Transaction not found' 
      });
      return;
    }

    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get transaction error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch transaction',
      message: err.message 
    });
  }
});

/**
 * GET /api/v1/payments/job/:jobId
 * Get all transactions for a job
 */
router.get('/job/:jobId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({ 
        success: false,
        error: 'Job ID required' 
      });
      return;
    }

    const transactions = await lightningService.getJobTransactions(jobId);

    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get job transactions error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch transactions',
      message: err.message 
    });
  }
});

/**
 * POST /api/v1/payments/webhook
 * LNBits webhook handler (no auth required)
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const { payment_hash } = req.body;

    if (!payment_hash) {
      res.status(400).json({ 
        success: false,
        error: 'Payment hash required' 
      });
      return;
    }

    // Handle webhook
    await lightningService.handleWebhook(payment_hash);

    res.json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    const err = error as Error;
    console.error('Webhook error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Webhook processing failed',
      message: err.message 
    });
  }
});

/**
 * GET /api/v1/payments/rates/btc-usd
 * Get current BTC/USD exchange rate
 */
router.get('/rates/btc-usd', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rate = await lightningService.getBtcUsdRate();

    res.json({
      success: true,
      rate,
      currency: 'USD',
      timestamp: new Date()
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get BTC rate error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch exchange rate',
      message: err.message 
    });
  }
});

/**
 * POST /api/v1/payments/convert
 * Convert between USD and satoshis
 */
router.post('/convert', authenticate,
  [
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('from').isIn(['usd', 'sats']).withMessage('From must be usd or sats'),
    body('to').isIn(['usd', 'sats']).withMessage('To must be usd or sats')
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
        return;
      }

      const { amount, from, to } = req.body;

      if (from === to) {
        res.json({
          success: true,
          amount: parseFloat(amount),
          from,
          to
        });
        return;
      }

      let result: number;
      if (from === 'usd' && to === 'sats') {
        result = await lightningService.usdToSats(parseFloat(amount));
      } else {
        result = await lightningService.satsToUsd(parseInt(amount));
      }

      res.json({
        success: true,
        amount: result,
        from,
        to,
        original_amount: parseFloat(amount)
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Convert currency error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to convert currency',
        message: err.message 
      });
    }
  }
);

export default router;
