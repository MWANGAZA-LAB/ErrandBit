/**
 * Payment Routes - Controller-based
 * Routes for Lightning payment management using PaymentController
 */

import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const paymentController = new PaymentController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/payments
 * @desc    Create payment for job
 * @access  Private
 */
router.post('/', paymentController.createPayment);

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics
 * @access  Private
 * @note    Must be before /:id route to avoid conflicts
 */
router.get('/stats', paymentController.getPaymentStats);

/**
 * @route   GET /api/payments/job/:jobId
 * @desc    Get payment by job ID
 * @access  Private
 */
router.get('/job/:jobId', paymentController.getPaymentByJobId);

/**
 * @route   GET /api/payments/hash/:hash
 * @desc    Get payment by payment hash
 * @access  Private
 */
router.get('/hash/:hash', paymentController.getPaymentByHash);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private
 */
router.get('/:id', paymentController.getPaymentById);

/**
 * @route   GET /api/payments
 * @desc    List all payments with pagination
 * @access  Private
 */
router.get('/', paymentController.listPayments);

/**
 * @route   POST /api/payments/:id/confirm
 * @desc    Confirm payment with preimage
 * @access  Private
 */
router.post('/:id/confirm', paymentController.confirmPayment);

/**
 * @route   POST /api/payments/create-invoice-multi-wallet
 * @desc    Create Lightning invoice for multi-wallet payment
 * @access  Private
 */
router.post('/create-invoice-multi-wallet', paymentController.createInvoiceMultiWallet);

export default router;
