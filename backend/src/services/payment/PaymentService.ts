/**
 * Payment Service
 * Business logic for payment management
 */

import { PaymentRepository, CreatePaymentDto } from '../../database/repositories/PaymentRepository.js';
import { JobRepository } from '../../database/repositories/JobRepository.js';
import { ValidationError, ConflictError } from '../../core/errors/AppError.js';
import logger from '../../utils/logger.js';
import crypto from 'crypto';

export interface CreatePaymentRequest {
  jobId: number;
  amountSats: number;
  paymentHash?: string;
}

export interface ConfirmPaymentRequest {
  paymentId: number;
  preimage: string;
}

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly jobRepository: JobRepository
  ) {}

  /**
   * Create payment for job
   */
  async createPayment(data: CreatePaymentRequest): Promise<any> {
    logger.info('Creating payment', { jobId: data.jobId, amountSats: data.amountSats });

    // Verify job exists
    const job = await this.jobRepository.findById(data.jobId);

    // Verify job is completed
    if (job.status !== 'completed') {
      throw new ConflictError('Can only create payment for completed jobs', 'JOB_NOT_COMPLETED');
    }

    // Check if payment already exists
    const existingPayment = await this.paymentRepository.findByJobId(data.jobId);
    if (existingPayment) {
      throw new ConflictError('Payment already exists for this job', 'PAYMENT_EXISTS');
    }

    // Validate amount
    if (data.amountSats <= 0) {
      throw new ValidationError('Amount must be greater than 0', 'INVALID_AMOUNT');
    }

    // Verify amount matches job price (convert cents to sats, assuming 1 sat = 1 cent for simplicity)
    // In production, you'd use actual BTC/USD conversion
    const expectedSats = job.price_cents;
    if (data.amountSats !== expectedSats) {
      logger.warn('Payment amount mismatch', { 
        jobId: data.jobId, 
        expected: expectedSats, 
        provided: data.amountSats 
      });
      // You might want to throw an error or allow with warning
    }

    const createDto: CreatePaymentDto = {
      jobId: data.jobId,
      amountSats: data.amountSats,
      paymentHash: data.paymentHash || undefined,
    };

    const payment = await this.paymentRepository.create(createDto);

    // Update job status to payment_confirmed
    await this.jobRepository.updateStatus(data.jobId, 'payment_confirmed');

    logger.info('Payment created successfully', { paymentId: payment.id, jobId: data.jobId });

    return {
      id: payment.id,
      jobId: payment.job_id,
      amountSats: payment.amount_sats,
      paymentHash: payment.payment_hash,
      paidAt: payment.paid_at,
      createdAt: payment.created_at,
    };
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: number): Promise<any> {
    logger.debug('Fetching payment', { paymentId });

    const payment = await this.paymentRepository.findById(paymentId);

    return {
      id: payment.id,
      jobId: payment.job_id,
      amountSats: payment.amount_sats,
      paymentHash: payment.payment_hash,
      preimage: payment.preimage,
      paidAt: payment.paid_at,
      createdAt: payment.created_at,
    };
  }

  /**
   * Get payment by job ID
   */
  async getPaymentByJobId(jobId: number): Promise<any | null> {
    logger.debug('Fetching payment by job ID', { jobId });

    const payment = await this.paymentRepository.findByJobId(jobId);

    if (!payment) {
      return null;
    }

    return {
      id: payment.id,
      jobId: payment.job_id,
      amountSats: payment.amount_sats,
      paymentHash: payment.payment_hash,
      preimage: payment.preimage,
      paidAt: payment.paid_at,
      createdAt: payment.created_at,
    };
  }

  /**
   * Get payment by payment hash
   */
  async getPaymentByHash(paymentHash: string): Promise<any | null> {
    logger.debug('Fetching payment by hash', { paymentHash });

    const payment = await this.paymentRepository.findByPaymentHash(paymentHash);

    if (!payment) {
      return null;
    }

    return {
      id: payment.id,
      jobId: payment.job_id,
      amountSats: payment.amount_sats,
      paymentHash: payment.payment_hash,
      preimage: payment.preimage,
      paidAt: payment.paid_at,
      createdAt: payment.created_at,
    };
  }

  /**
   * Confirm payment with preimage
   */
  async confirmPayment(data: ConfirmPaymentRequest): Promise<any> {
    logger.info('Confirming payment', { paymentId: data.paymentId });

    // Validate preimage format (should be 64 hex characters for SHA256)
    if (!this.isValidPreimage(data.preimage)) {
      throw new ValidationError('Invalid preimage format', 'INVALID_PREIMAGE');
    }

    const payment = await this.paymentRepository.findById(data.paymentId);

    // Check if already confirmed
    if (payment.preimage) {
      throw new ConflictError('Payment already confirmed', 'PAYMENT_ALREADY_CONFIRMED');
    }

    // Verify preimage matches payment hash (in production, use actual cryptographic verification)
    if (payment.payment_hash && !this.verifyPreimage(data.preimage, payment.payment_hash)) {
      throw new ValidationError('Preimage does not match payment hash', 'PREIMAGE_MISMATCH');
    }

    const confirmedPayment = await this.paymentRepository.confirmPayment(data.paymentId, data.preimage);

    logger.info('Payment confirmed successfully', { paymentId: data.paymentId });

    return {
      id: confirmedPayment.id,
      jobId: confirmedPayment.job_id,
      amountSats: confirmedPayment.amount_sats,
      preimage: confirmedPayment.preimage,
      paidAt: confirmedPayment.paid_at,
    };
  }

  /**
   * List payments
   */
  async listPayments(limit: number = 20, offset: number = 0): Promise<any> {
    logger.debug('Listing payments', { limit, offset });

    const payments = await this.paymentRepository.list(limit, offset);

    return payments.map(payment => ({
      id: payment.id,
      jobId: payment.job_id,
      amountSats: payment.amount_sats,
      paymentHash: payment.payment_hash,
      paidAt: payment.paid_at,
      createdAt: payment.created_at,
    }));
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(): Promise<any> {
    logger.debug('Fetching payment statistics');

    const totalCount = await this.paymentRepository.count();
    const totalVolume = await this.paymentRepository.getTotalVolume();

    return {
      totalPayments: totalCount,
      totalVolumeSats: totalVolume,
      averagePaymentSats: totalCount > 0 ? Math.round(totalVolume / totalCount) : 0,
    };
  }

  /**
   * Validate preimage format
   */
  private isValidPreimage(preimage: string): boolean {
    // Preimage should be 64 hexadecimal characters (32 bytes)
    const preimageRegex = /^[a-fA-F0-9]{64}$/;
    return preimageRegex.test(preimage);
  }

  /**
   * Verify preimage matches payment hash
   * Uses SHA256 cryptographic verification for Lightning Network payments
   */
  private verifyPreimage(preimage: string, paymentHash: string): boolean {
    if (!this.isValidPreimage(preimage)) {
      logger.warn('Invalid preimage format', { preimage: preimage.substring(0, 10) + '...' });
      return false;
    }

    try {
      // Compute SHA256 hash of the preimage
      const preimageBuffer = Buffer.from(preimage, 'hex');
      const computedHash = crypto
        .createHash('sha256')
        .update(preimageBuffer)
        .digest('hex');

      // Compare with payment hash (case-insensitive)
      const isValid = computedHash.toLowerCase() === paymentHash.toLowerCase();
      
      if (!isValid) {
        logger.warn('Preimage verification failed', {
          computedHash: computedHash.substring(0, 10) + '...',
          expectedHash: paymentHash.substring(0, 10) + '...',
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying preimage', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      return false;
    }
  }

  /**
   * Create Lightning invoice for a job
   * Used by multi-wallet payment flow
   */
  async createInvoiceForJob(
    jobId: number,
    amountSats: number,
    userId: number
  ): Promise<{
    paymentRequest: string;
    paymentHash: string;
    amountSats: number;
    expiresAt: Date;
    _testPreimage?: string;
  }> {
    logger.info('Creating invoice for job', { jobId, amountSats, userId });

    // Verify job exists and user is authorized
    const job = await this.jobRepository.findById(jobId);

    if (job.client_id !== userId) {
      throw new ValidationError('You can only create invoices for your own jobs', 'UNAUTHORIZED');
    }

    // Mock invoice for testing (same as old PaymentService)
    // In production, integrate with LNBits, LND, CLN, etc.
    const preimage = crypto.randomBytes(32).toString('hex');
    
    // Compute correct hash from preimage
    const preimageBuffer = Buffer.from(preimage, 'hex');
    const correctHash = crypto.createHash('sha256').update(preimageBuffer).digest('hex');
    
    const invoice = {
      paymentRequest: `lnbc${amountSats}n1...mock_invoice_${correctHash.substring(0, 8)}`,
      paymentHash: correctHash,
      amountSats,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
      _testPreimage: preimage
    };

    logger.info('Invoice created', { jobId, paymentHash: correctHash.substring(0, 10) + '...' });

    return invoice;
  }
}
