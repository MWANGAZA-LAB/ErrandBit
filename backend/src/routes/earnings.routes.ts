/**
 * Earnings Routes
 * Routes for runner earnings and payout management
 */

import { Router } from 'express';
import { earningsController } from '../controllers/EarningsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/earnings/summary
 * @desc    Get runner's earnings summary
 * @access  Private (runners only)
 */
router.get('/summary', earningsController.getEarningsSummary);

/**
 * @route   GET /api/earnings/history
 * @desc    Get runner's payout history
 * @access  Private (runners only)
 */
router.get('/history', earningsController.getPayoutHistory);

/**
 * @route   POST /api/earnings/:id/retry
 * @desc    Retry failed payout
 * @access  Private (runners only)
 */
router.post('/:id/retry', earningsController.retryPayout);

export default router;
