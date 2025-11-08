/**
 * Lightning Service - TypeScript
 * LNBits integration for Lightning Network payments
 */

import axios, { AxiosInstance } from 'axios';
import { getPool } from '../db.js';

export interface CreateInvoiceInput {
  amount_sats: number;
  amount_usd: number;
  job_id: string;
  user_id: string;
  description: string;
}

export interface LightningInvoice {
  payment_hash: string;
  payment_request: string; // BOLT11 invoice
  amount_sats: number;
  expires_at: Date;
  checking_id: string;
}

export interface PaymentStatus {
  paid: boolean;
  payment_hash: string;
  payment_preimage?: string;
  amount_sats: number;
  paid_at: Date | undefined;
}

export class LightningService {
  private lnbitsClient: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env['LNBITS_API_KEY'] || '';
    this.baseUrl = process.env['LNBITS_URL'] || 'https://legend.lnbits.com';
    
    this.lnbitsClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Create Lightning invoice for job payment
   */
  async createInvoice(input: CreateInvoiceInput): Promise<LightningInvoice> {
    try {
      // Create invoice via LNBits API
      const response = await this.lnbitsClient.post('/api/v1/payments', {
        out: false, // incoming payment
        amount: input.amount_sats,
        memo: input.description,
        webhook: `${process.env['API_URL']}/api/v1/payments/webhook`
      });

      const { payment_hash, payment_request, checking_id } = response.data;

      // Store transaction in database
      const pool = getPool();
      if (pool) {
        await pool.query(
          `INSERT INTO lightning_transactions (
            job_id, user_id, transaction_type, amount_sats, amount_usd,
            payment_hash, payment_request, status, provider
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            input.job_id,
            input.user_id,
            'job_payment',
            input.amount_sats,
            input.amount_usd,
            payment_hash,
            payment_request,
            'pending',
            'lnbits'
          ]
        );
      }

      return {
        payment_hash,
        payment_request,
        amount_sats: input.amount_sats,
        expires_at: new Date(Date.now() + 3600000), // 1 hour
        checking_id
      };
    } catch (error) {
      const err = error as any;
      console.error('Create invoice error:', err.response?.data || err.message);
      throw new Error(`Failed to create Lightning invoice: ${err.message}`);
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentHash: string): Promise<PaymentStatus> {
    try {
      const pool = getPool();
      if (!pool) {
        throw new Error('Database not configured');
      }

      // Get transaction from database
      const result = await pool.query(
        `SELECT payment_hash, status, amount_sats, payment_preimage, updated_at
         FROM lightning_transactions
         WHERE payment_hash = $1`,
        [paymentHash]
      );

      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const tx = result.rows[0];

      // If already paid, return cached status
      if (tx.status === 'completed') {
        return {
          paid: true,
          payment_hash: tx.payment_hash,
          payment_preimage: tx.payment_preimage,
          amount_sats: parseInt(tx.amount_sats),
          paid_at: tx.updated_at
        };
      }

      // Check with LNBits
      const response = await this.lnbitsClient.get(`/api/v1/payments/${paymentHash}`);
      const { paid, preimage } = response.data;

      // Update database if payment confirmed
      if (paid && tx.status !== 'completed') {
        await pool.query(
          `UPDATE lightning_transactions
           SET status = 'completed', payment_preimage = $1, updated_at = NOW()
           WHERE payment_hash = $2`,
          [preimage, paymentHash]
        );
      }

      return {
        paid,
        payment_hash: paymentHash,
        payment_preimage: preimage,
        amount_sats: parseInt(tx.amount_sats),
        paid_at: paid ? new Date() : undefined
      };
    } catch (error) {
      const err = error as any;
      console.error('Check payment error:', err.response?.data || err.message);
      throw new Error(`Failed to check payment status: ${err.message}`);
    }
  }

  /**
   * Handle payment webhook from LNBits
   */
  async handleWebhook(paymentHash: string): Promise<void> {
    try {
      const pool = getPool();
      if (!pool) {
        throw new Error('Database not configured');
      }

      // Get payment status
      const status = await this.checkPaymentStatus(paymentHash);

      if (status.paid) {
        // Get transaction details
        const result = await pool.query(
          `SELECT job_id FROM lightning_transactions WHERE payment_hash = $1`,
          [paymentHash]
        );

        if (result.rows.length > 0) {
          const { job_id } = result.rows[0];

          // Update job status to paid
          await pool.query(
            `UPDATE jobs SET status = 'paid', paid_at = NOW() WHERE id = $1`,
            [job_id]
          );

          console.log(`✅ Payment confirmed for job ${job_id}`);
        }
      }
    } catch (error) {
      const err = error as Error;
      console.error('Webhook handler error:', err.message);
      throw error;
    }
  }

  /**
   * Get transaction by payment hash
   */
  async getTransaction(paymentHash: string) {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not configured');
    }

    const result = await pool.query(
      `SELECT 
        lt.id, lt.job_id, lt.user_id, lt.transaction_type,
        lt.amount_sats, lt.amount_usd, lt.payment_hash,
        lt.payment_request, lt.payment_preimage, lt.status,
        lt.provider, lt.created_at, lt.updated_at,
        j.title as job_title
       FROM lightning_transactions lt
       LEFT JOIN jobs j ON lt.job_id = j.id
       WHERE lt.payment_hash = $1`,
      [paymentHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Get all transactions for a job
   */
  async getJobTransactions(jobId: string) {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not configured');
    }

    const result = await pool.query(
      `SELECT 
        id, job_id, user_id, transaction_type,
        amount_sats, amount_usd, payment_hash,
        payment_request, payment_preimage, status,
        provider, created_at, updated_at
       FROM lightning_transactions
       WHERE job_id = $1
       ORDER BY created_at DESC`,
      [jobId]
    );

    return result.rows;
  }

  /**
   * Calculate BTC/USD rate (simplified - in production use real API)
   */
  async getBtcUsdRate(): Promise<number> {
    try {
      // In production, use a real price API (e.g., CoinGecko, Kraken)
      // For MVP, use a fixed rate or simple API
      const response = await axios.get('https://api.coinbase.com/v2/exchange-rates?currency=BTC');
      const usdRate = parseFloat(response.data.data.rates.USD);
      return usdRate;
    } catch (error) {
      console.error('Failed to fetch BTC rate, using fallback');
      // Fallback rate (update periodically)
      return 45000; // $45,000 per BTC
    }
  }

  /**
   * Convert USD to satoshis
   */
  async usdToSats(usdAmount: number): Promise<number> {
    const btcUsdRate = await this.getBtcUsdRate();
    const btcAmount = usdAmount / btcUsdRate;
    const sats = Math.round(btcAmount * 100000000); // 1 BTC = 100M sats
    return sats;
  }

  /**
   * Convert satoshis to USD
   */
  async satsToUsd(sats: number): Promise<number> {
    const btcUsdRate = await this.getBtcUsdRate();
    const btcAmount = sats / 100000000;
    const usdAmount = btcAmount * btcUsdRate;
    return parseFloat(usdAmount.toFixed(2));
  }

  /**
   * Validate LNBits connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.lnbitsClient.get('/api/v1/wallet');
      return response.status === 200;
    } catch (error) {
      console.error('LNBits connection failed:', error);
      return false;
    }
  }
}

export const lightningService = new LightningService();
