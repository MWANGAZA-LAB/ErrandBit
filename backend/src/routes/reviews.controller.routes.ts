/**
 * Review Routes - Controller-based
 * Routes for review and rating management using ReviewController
 */

import { Router } from 'express';
import { ReviewController } from '../controllers/ReviewController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const reviewController = new ReviewController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/reviews
 * @desc    Create review for completed job
 * @access  Private
 */
router.post('/', reviewController.createReview);

/**
 * @route   GET /api/reviews/job/:jobId
 * @desc    Get review by job ID
 * @access  Private
 * @note    Must be before /:id route to avoid conflicts
 */
router.get('/job/:jobId', reviewController.getReviewByJobId);

/**
 * @route   GET /api/reviews/runner/:runnerId/stats
 * @desc    Get runner rating statistics
 * @access  Private
 */
router.get('/runner/:runnerId/stats', reviewController.getRunnerRatingStats);

/**
 * @route   GET /api/reviews/runner/:runnerId
 * @desc    Get reviews for runner
 * @access  Private
 */
router.get('/runner/:runnerId', reviewController.getReviewsForRunner);

/**
 * @route   GET /api/reviews/reviewer/:reviewerId
 * @desc    Get reviews by reviewer
 * @access  Private
 */
router.get('/reviewer/:reviewerId', reviewController.getReviewsByReviewer);

/**
 * @route   GET /api/reviews/:id
 * @desc    Get review by ID
 * @access  Private
 */
router.get('/:id', reviewController.getReviewById);

/**
 * @route   PATCH /api/reviews/:id
 * @desc    Update review
 * @access  Private (reviewer only)
 */
router.patch('/:id', reviewController.updateReview);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete review
 * @access  Private (reviewer only)
 */
router.delete('/:id', reviewController.deleteReview);

export default router;
