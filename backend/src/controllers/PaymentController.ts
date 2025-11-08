/**
 * Payment Controller
 * Handles HTTP requests for payment management
 */

import { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { PaymentService } from '../services/payment/PaymentService.js';
import { PaymentRepository } from '../database/repositories/PaymentRepository.js';
import { JobRepository } from '../database/repositories/JobRepository.js';
import { ValidationError } from '../core/errors/AppError.js';
import logger from '../utils/logger.js';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    const paymentRepository = new PaymentRepository();
    const jobRepository = new JobRepository();
    this.paymentService = new PaymentService(paymentRepository, jobRepository);
  }

  /**
   * Create payment for job
   * POST /api/payments
   */
  createPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { jobId, amountSats } = req.body;

      if (!jobId || !amountSats) {
        throw new ValidationError('Job ID and amount are required', 'MISSING_FIELDS');
      }

      const paymentData = {
        jobId: parseInt(jobId, 10),
        amountSats: parseInt(amountSats, 10),
      };

      const payment = await this.paymentService.createPayment(paymentData);

      logger.info('Payment created', { paymentId: payment.id, jobId });

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment created successfully',
      });
    } catch (error) {
      logger.error('Error creating payment', { error, body: req.body });
      throw error;
    }
  };

  /**
   * Get payment by ID
   * GET /api/payments/:id
   */
  getPaymentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const paymentId = parseInt(req.params['id'] as string, 10);

      if (isNaN(paymentId)) {
        throw new ValidationError('Invalid payment ID', 'INVALID_ID');
      }

      const payment = await this.paymentService.getPaymentById(paymentId);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      logger.error('Error fetching payment', { error, paymentId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Get payment by job ID
   * GET /api/payments/job/:jobId
   */
  getPaymentByJobId = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params['jobId'] as string, 10);

      if (isNaN(jobId)) {
        throw new ValidationError('Invalid job ID', 'INVALID_ID');
      }

      const payment = await this.paymentService.getPaymentByJobId(jobId);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      logger.error('Error fetching payment by job', { error, jobId: req.params['jobId'] });
      throw error;
    }
  };

  /**
   * Get payment by payment hash
   * GET /api/payments/hash/:hash
   */
  getPaymentByHash = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const paymentHash = req.params['hash'] as string;

      if (!paymentHash) {
        throw new ValidationError('Payment hash is required', 'MISSING_HASH');
      }

      const payment = await this.paymentService.getPaymentByHash(paymentHash);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      logger.error('Error fetching payment by hash', { error, hash: req.params['hash'] });
      throw error;
    }
  };

  /**
   * Confirm payment with preimage
   * POST /api/payments/:id/confirm
   */
  confirmPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const paymentId = parseInt(req.params['id'] as string, 10);
      const { preimage } = req.body;

      if (isNaN(paymentId)) {
        throw new ValidationError('Invalid payment ID', 'INVALID_ID');
      }

      if (!preimage) {
        throw new ValidationError('Preimage is required', 'MISSING_PREIMAGE');
      }

      const payment = await this.paymentService.confirmPayment({
        paymentId,
        preimage,
      });

      logger.info('Payment confirmed', { paymentId });

      res.status(200).json({
        success: true,
        data: payment,
        message: 'Payment confirmed successfully',
      });
    } catch (error) {
      logger.error('Error confirming payment', { error, paymentId: req.params['id'] });
      throw error;
    }
  };

  /**
   * List all payments
   * GET /api/payments
   */
  listPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;
      const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;

      const payments = await this.paymentService.listPayments(limit, offset);

      res.status(200).json({
        success: true,
        data: payments,
        pagination: {
          limit,
          offset,
          total: payments.length,
        },
      });
    } catch (error) {
      logger.error('Error listing payments', { error, query: req.query });
      throw error;
    }
  };

  /**
   * Get payment statistics
   * GET /api/payments/stats
   */
  getPaymentStats = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stats = await this.paymentService.getPaymentStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching payment stats', { error });
      throw error;
    }
  };
}
