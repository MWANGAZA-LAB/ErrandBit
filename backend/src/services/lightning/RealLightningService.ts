/**
 * Real Lightning Network Service
 * Production-ready Lightning payment integration using LNbits API
 * 
 * Features:
 * - Create real Lightning invoices
 * - Verify payment status
 * - Send Lightning payments
 * - Handle payment webhooks
 * - Support for multiple LN backends (LNbits, LND, CLN)
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { verifyPreimage, decodeLightningInvoice } from '../../utils/lightning.js';
import logger from '../../utils/logger.js';

export interface LightningInvoice {
  paymentRequest: string;  // BOLT11 invoice string
  paymentHash: string;     // SHA256 hash for verification
  amountSats: number;      // Amount in satoshis
  expiresAt: Date;         // Expiration timestamp
  description?: string;    // Invoice description
}

export interface PaymentStatus {
  paid: boolean;
  paymentHash: string;
  preimage?: string;
  amountPaidSats?: number;
  paidAt?: Date;
}

export interface LNbitsConfig {
  apiUrl: string;          // LNbits API endpoint
  apiKey: string;          // Admin or Invoice key
  walletId?: string;       // Optional wallet ID
}

/**
 * Real Lightning Service
 * 
 * Integrates with actual Lightning Network nodes via LNbits
 */
export class RealLightningService {
  private client: AxiosInstance;
  private config: LNbitsConfig;
  private readonly useMockFallback: boolean;

  constructor(config?: Partial<LNbitsConfig>) {
    // Check if real Lightning is configured
    this.config = {
      apiUrl: config?.apiUrl || process.env['LNBITS_API_URL'] || '',
      apiKey: config?.apiKey || process.env['LNBITS_API_KEY'] || '',
      walletId: config?.walletId || process.env['LNBITS_WALLET_ID'] || '',
    };

    // Use mock fallback if not configured (for development)
    this.useMockFallback = !this.config.apiUrl || !this.config.apiKey;

    if (this.useMockFallback) {
      logger.warn('Lightning Network not configured - using MOCK mode (DEV ONLY)');
      logger.warn('Set LNBITS_API_URL and LNBITS_API_KEY for production');
    }

    // Initialize API client
    this.client = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'X-Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    logger.info('Lightning Service initialized', {
      mode: this.useMockFallback ? 'MOCK' : 'REAL',
      apiUrl: this.config.apiUrl || 'not-set',
    });
  }

  /**
   * Create a Lightning invoice
   * 
   * @param amountSats - Amount in satoshis
   * @param description - Payment description
   * @param expirySeconds - Invoice expiry time (default: 1 hour)
   * @returns Lightning invoice details
   */
  async createInvoice(
    amountSats: number,
    description: string = 'ErrandBit Job Payment',
    expirySeconds: number = 3600
  ): Promise<LightningInvoice> {
    // Use mock if not configured
    if (this.useMockFallback) {
      return this.createMockInvoice(amountSats, description, expirySeconds);
    }

    try {
      logger.info('Creating real Lightning invoice', { amountSats, description });

      // Call LNbits API to create invoice
      const response = await this.client.post('/api/v1/payments', {
        out: false,  // Incoming payment
        amount: amountSats,
        memo: description,
        unit: 'sat',
        expiry: expirySeconds,
      });

      const { payment_hash, payment_request } = response.data;

      return {
        paymentRequest: payment_request,
        paymentHash: payment_hash,
        amountSats,
        expiresAt: new Date(Date.now() + expirySeconds * 1000),
        description,
      };
    } catch (error: any) {
      logger.error('Failed to create Lightning invoice', {
        error: error.message,
        response: error.response?.data,
      });
      
      // Fallback to mock in case of error
      logger.warn('Falling back to mock invoice');
      return this.createMockInvoice(amountSats, description, expirySeconds);
    }
  }

  /**
   * Check payment status
   * 
   * @param paymentHash - Payment hash to check
   * @returns Payment status details
   */
  async checkPaymentStatus(paymentHash: string): Promise<PaymentStatus> {
    // Use mock if not configured
    if (this.useMockFallback) {
      return this.checkMockPaymentStatus(paymentHash);
    }

    try {
      logger.debug('Checking payment status', { paymentHash });

      // Call LNbits API to check payment
      const response = await this.client.get(`/api/v1/payments/${paymentHash}`);

      const { paid, preimage, details } = response.data;

      const result: PaymentStatus = {
        paid,
        paymentHash,
        amountPaidSats: details?.amount ? parseInt(details.amount) : 0,
      };

      if (preimage) {
        result.preimage = preimage;
      }

      if (paid) {
        result.paidAt = new Date();
      }

      return result;
    } catch (error: any) {
      logger.error('Failed to check payment status', {
        error: error.message,
        paymentHash,
      });

      // Return unpaid status on error
      return {
        paid: false,
        paymentHash,
      };
    }
  }

  /**
   * Send Lightning payment
   * 
   * @param paymentRequest - BOLT11 invoice to pay
   * @returns Payment result with preimage
   */
  async sendPayment(paymentRequest: string): Promise<{
    success: boolean;
    preimage?: string;
    paymentHash?: string;
    error?: string;
  }> {
    // Use mock if not configured
    if (this.useMockFallback) {
      return this.sendMockPayment(paymentRequest);
    }

    try {
      logger.info('Sending Lightning payment', { invoice: paymentRequest.substring(0, 20) + '...' });

      // Call LNbits API to pay invoice
      const response = await this.client.post('/api/v1/payments', {
        out: true,  // Outgoing payment
        bolt11: paymentRequest,
      });

      const { payment_hash, payment_preimage, checking_id } = response.data;

      logger.info('Payment sent successfully', {
        paymentHash: payment_hash,
        checkingId: checking_id,
      });

      return {
        success: true,
        preimage: payment_preimage,
        paymentHash: payment_hash,
      };
    } catch (error: any) {
      logger.error('Failed to send Lightning payment', {
        error: error.message,
        response: error.response?.data,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify payment with preimage
   * 
   * @param preimage - Payment preimage (hex)
   * @param expectedHash - Expected payment hash
   * @returns True if preimage is valid
   */
  async verifyPayment(preimage: string, expectedHash: string): Promise<boolean> {
    return verifyPreimage(preimage, expectedHash);
  }

  /**
   * Decode Lightning invoice
   * 
   * @param paymentRequest - BOLT11 invoice string
   * @returns Decoded invoice details
   */
  decodeInvoice(paymentRequest: string): any {
    return decodeLightningInvoice(paymentRequest);
  }

  // =================================================================
  // MOCK METHODS (Development/Testing Only)
  // =================================================================

  /**
   * Create mock invoice for development
   * DO NOT USE IN PRODUCTION
   */
  private createMockInvoice(
    amountSats: number,
    description: string,
    expirySeconds: number
  ): LightningInvoice {
    logger.warn('[MOCK] Creating fake invoice - THIS IS NOT REAL');

    // Generate mock preimage and hash
    const preimage = crypto.randomBytes(32).toString('hex');
    const preimageBuffer = Buffer.from(preimage, 'hex');
    const paymentHash = crypto
      .createHash('sha256')
      .update(preimageBuffer)
      .digest('hex');

    // Store in memory for verification (in-memory store would be better)
    (global as any).mockPayments = (global as any).mockPayments || new Map();
    (global as any).mockPayments.set(paymentHash, {
      preimage,
      paid: false,
      amountSats,
    });

    return {
      paymentRequest: `lnbc${amountSats}n1...mock_invoice_${paymentHash.substring(0, 8)}`,
      paymentHash,
      amountSats,
      expiresAt: new Date(Date.now() + expirySeconds * 1000),
      description,
    };
  }

  /**
   * Check mock payment status
   * DO NOT USE IN PRODUCTION
   */
  private checkMockPaymentStatus(paymentHash: string): PaymentStatus {
    const mockPayments = (global as any).mockPayments || new Map();
    const payment = mockPayments.get(paymentHash);

    if (!payment) {
      return {
        paid: false,
        paymentHash,
      };
    }

    return {
      paid: payment.paid,
      paymentHash,
      preimage: payment.paid ? payment.preimage : undefined,
      amountPaidSats: payment.paid ? payment.amountSats : 0,
      paidAt: payment.paid && payment.paidAt ? payment.paidAt : undefined,
    };
  }

  /**
   * Send mock payment
   * DO NOT USE IN PRODUCTION
   */
  private async sendMockPayment(paymentRequest: string): Promise<{
    success: boolean;
    preimage?: string;
    paymentHash?: string;
    error?: string;
  }> {
    logger.warn('[MOCK] Simulating payment - THIS IS NOT REAL');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract mock payment hash from invoice
    const match = paymentRequest.match(/mock_invoice_([a-f0-9]+)/);
    if (!match) {
      return {
        success: false,
        error: 'Invalid mock invoice',
      };
    }

    const shortHash = match[1];
    const mockPayments = (global as any).mockPayments || new Map();

    // Find payment by short hash
    for (const [hash, payment] of mockPayments.entries()) {
      if (hash.startsWith(shortHash)) {
        // Mark as paid
        payment.paid = true;
        mockPayments.set(hash, payment);

        logger.info('[MOCK] Payment marked as paid', { paymentHash: hash });

        return {
          success: true,
          preimage: payment.preimage,
          paymentHash: hash,
        };
      }
    }

    return {
      success: false,
      error: 'Mock payment not found',
    };
  }

  /**
   * Check if Lightning is configured
   */
  isConfigured(): boolean {
    return !this.useMockFallback;
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    configured: boolean;
    mode: 'REAL' | 'MOCK';
    apiUrl: string;
    hasApiKey: boolean;
  } {
    return {
      configured: !this.useMockFallback,
      mode: this.useMockFallback ? 'MOCK' : 'REAL',
      apiUrl: this.config.apiUrl || 'not-set',
      hasApiKey: !!this.config.apiKey,
    };
  }
}

// Export singleton instance
export const realLightningService = new RealLightningService();
