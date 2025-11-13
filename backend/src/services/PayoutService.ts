/**
 * Payout Service
 * Handles automatic Lightning payouts to runners after job completion
 */

import axios from 'axios';
import { getPool } from '../db.js';
import logger from '../utils/logger.js';

interface PayoutResult {
  success: boolean;
  paymentHash?: string;
  paymentPreimage?: string;
  error?: string;
}

export class PayoutService {
  private lnbitsUrl: string;
  private lnbitsApiKey: string;

  constructor() {
    this.lnbitsUrl = process.env['LNBITS_URL'] || 'https://legend.lnbits.com';
    this.lnbitsApiKey = process.env['LNBITS_ADMIN_KEY'] || '';
  }

  /**
   * Calculate platform fee (0% for now - free platform to build trust)
   */
  private calculateFee(amountCents: number): { feeCents: number; netCents: number } {
    const feePercent = Number(process.env['PLATFORM_FEE_PERCENT'] || '0');
    const feeCents = Math.floor(amountCents * (feePercent / 100));
    const netCents = amountCents - feeCents;
    return { feeCents, netCents };
  }

  /**
   * Convert USD cents to sats (rough conversion: 1 USD = 2000 sats)
   */
  private centsToSats(cents: number): number {
    return Math.floor((cents / 100) * 2000);
  }

  /**
   * Send Lightning payment to runner's Lightning address
   */
  private async sendLightningPayment(
    lightningAddress: string,
    amountSats: number,
    memo: string
  ): Promise<PayoutResult> {
    try {
      // In development mode, simulate successful payment
      if (process.env.NODE_ENV === 'development' || !this.lnbitsApiKey) {
        logger.info('🔧 DEV MODE: Simulating Lightning payout', {
          lightningAddress,
          amountSats,
          memo
        });

        return {
          success: true,
          paymentHash: 'dev_' + Date.now().toString(16),
          paymentPreimage: 'dev_preimage_' + Math.random().toString(36).substring(7)
        };
      }

      // Production: Use LNbits to send payment
      // First, get invoice from Lightning address
      const [username, domain] = lightningAddress.split('@');
      const lnurlResponse = await axios.get(
        `https://${domain}/.well-known/lnurlp/${username}`
      );

      const { callback, minSendable, maxSendable } = lnurlResponse.data;
      const amountMsat = amountSats * 1000;

      if (amountMsat < minSendable || amountMsat > maxSendable) {
        throw new Error(
          `Amount ${amountSats} sats is outside allowed range for ${lightningAddress}`
        );
      }

      // Get invoice from callback
      const invoiceResponse = await axios.get(callback, {
        params: { amount: amountMsat }
      });

      const { pr: paymentRequest } = invoiceResponse.data;

      // Pay invoice using LNbits
      const paymentResponse = await axios.post(
        `${this.lnbitsUrl}/api/v1/payments`,
        { out: true, bolt11: paymentRequest },
        {
          headers: {
            'X-Api-Key': this.lnbitsApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const { payment_hash, payment_preimage } = paymentResponse.data;

      return {
        success: true,
        paymentHash: payment_hash,
        paymentPreimage: payment_preimage
      };
    } catch (error: any) {
      logger.error('Lightning payment failed', {
        lightningAddress,
        amountSats,
        error: error.message
      });

      return {
        success: false,
        error: error.message || 'Payment failed'
      };
    }
  }

  /**
   * Create runner earnings record for a job
   */
  async createRunnerEarning(
    jobId: number,
    runnerId: number,
    amountCents: number,
    lightningAddress: string | null
  ): Promise<number> {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const { feeCents, netCents } = this.calculateFee(amountCents);
    const amountSats = this.centsToSats(amountCents);
    const feeSats = this.centsToSats(feeCents);
    const netSats = this.centsToSats(netCents);

    const result = await pool.query(
      `INSERT INTO runner_earnings 
       (runner_id, job_id, amount_cents, amount_sats, 
        platform_fee_cents, platform_fee_sats, 
        net_amount_cents, net_amount_sats,
        lightning_address, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        runnerId,
        jobId,
        amountCents,
        amountSats,
        feeCents,
        feeSats,
        netCents,
        netSats,
        lightningAddress,
        'pending'
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Process payout to runner
   */
  async processPayout(earningId: number): Promise<boolean> {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    try {
      // Get earning record
      const earningResult = await pool.query(
        `SELECT * FROM runner_earnings WHERE id = $1`,
        [earningId]
      );

      if (earningResult.rows.length === 0) {
        throw new Error('Earning record not found');
      }

      const earning = earningResult.rows[0];

      if (earning.status !== 'pending') {
        logger.warn('Earning already processed', { earningId, status: earning.status });
        return false;
      }

      // Update status to processing
      await pool.query(
        `UPDATE runner_earnings 
         SET status = 'processing', processed_at = NOW()
         WHERE id = $1`,
        [earningId]
      );

      // Check if runner has Lightning address
      if (!earning.lightning_address) {
        logger.warn('Runner has no Lightning address, skipping payout', {
          earningId,
          runnerId: earning.runner_id
        });

        await pool.query(
          `UPDATE runner_earnings 
           SET status = 'failed', 
               failed_at = NOW(),
               error_message = 'No Lightning address configured'
           WHERE id = $1`,
          [earningId]
        );

        return false;
      }

      // Send Lightning payment
      const payoutResult = await this.sendLightningPayment(
        earning.lightning_address,
        earning.net_amount_sats,
        `Payout for job #${earning.job_id}`
      );

      if (payoutResult.success) {
        // Update earning record with success
        await pool.query(
          `UPDATE runner_earnings 
           SET status = 'completed',
               completed_at = NOW(),
               payment_hash = $2,
               payment_preimage = $3
           WHERE id = $1`,
          [earningId, payoutResult.paymentHash, payoutResult.paymentPreimage]
        );

        logger.info('✅ Payout completed successfully', {
          earningId,
          runnerId: earning.runner_id,
          amountSats: earning.net_amount_sats,
          paymentHash: payoutResult.paymentHash
        });

        return true;
      } else {
        // Update earning record with failure
        await pool.query(
          `UPDATE runner_earnings 
           SET status = 'failed',
               failed_at = NOW(),
               error_message = $2,
               retry_count = retry_count + 1
           WHERE id = $1`,
          [earningId, payoutResult.error]
        );

        logger.error('❌ Payout failed', {
          earningId,
          error: payoutResult.error
        });

        return false;
      }
    } catch (error: any) {
      logger.error('Payout processing error', {
        earningId,
        error: error.message
      });

      // Update earning record with error
      await pool.query(
        `UPDATE runner_earnings 
         SET status = 'failed',
             failed_at = NOW(),
             error_message = $2,
             retry_count = retry_count + 1
         WHERE id = $1`,
        [earningId, error.message]
      );

      return false;
    }
  }

  /**
   * Process payout for a completed job
   */
  async processJobPayout(jobId: number): Promise<boolean> {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    try {
      // Get job details with runner's Lightning address
      const jobResult = await pool.query(
        `SELECT j.id, j.runner_id, j.price_cents, rp.lightning_address
         FROM jobs j
         LEFT JOIN runner_profiles rp ON j.runner_id = rp.user_id
         WHERE j.id = $1`,
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const job = jobResult.rows[0];

      if (!job.runner_id) {
        throw new Error('No runner assigned to job');
      }

      // Check if earning already exists
      const existingResult = await pool.query(
        `SELECT id FROM runner_earnings WHERE job_id = $1`,
        [jobId]
      );

      let earningId: number;

      if (existingResult.rows.length > 0) {
        earningId = existingResult.rows[0].id;
        logger.info('Using existing earning record', { earningId, jobId });
      } else {
        // Create new earning record
        earningId = await this.createRunnerEarning(
          jobId,
          job.runner_id,
          job.price_cents,
          job.lightning_address
        );

        logger.info('Created new earning record', { earningId, jobId });
      }

      // Process the payout
      return await this.processPayout(earningId);
    } catch (error: any) {
      logger.error('Job payout processing error', {
        jobId,
        error: error.message
      });

      return false;
    }
  }

  /**
   * Get runner's earnings summary
   */
  async getRunnerEarnings(runnerId: number) {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_payouts,
         SUM(CASE WHEN status = 'completed' THEN net_amount_cents ELSE 0 END) as total_earned_cents,
         SUM(CASE WHEN status = 'pending' THEN net_amount_cents ELSE 0 END) as pending_cents,
         SUM(CASE WHEN status = 'completed' THEN net_amount_sats ELSE 0 END) as total_earned_sats
       FROM runner_earnings
       WHERE runner_id = $1`,
      [runnerId]
    );

    return result.rows[0];
  }

  /**
   * Get runner's payout history
   */
  async getRunnerPayoutHistory(runnerId: number, limit: number = 50) {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const result = await pool.query(
      `SELECT 
         re.*,
         j.title as job_title
       FROM runner_earnings re
       LEFT JOIN jobs j ON re.job_id = j.id
       WHERE re.runner_id = $1
       ORDER BY re.created_at DESC
       LIMIT $2`,
      [runnerId, limit]
    );

    return result.rows;
  }
}

export const payoutService = new PayoutService();
