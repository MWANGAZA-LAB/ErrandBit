/**
 * Runner Routes - Controller-based
 * Routes for runner profile management using RunnerController
 */

import { Router } from 'express';
import { RunnerController } from '../controllers/RunnerController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const runnerController = new RunnerController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/runners
 * @desc    Create runner profile
 * @access  Private (authenticated users)
 */
router.post('/', runnerController.createRunnerProfile);

/**
 * @route   GET /api/runners/search
 * @desc    Search runners with filters
 * @access  Private
 * @note    Must be before /:id route to avoid conflicts
 */
router.get('/search', runnerController.searchRunners);

/**
 * @route   GET /api/runners/me
 * @desc    Get current user's runner profile
 * @access  Private
 */
router.get('/me', runnerController.getMyRunnerProfile);

/**
 * @route   GET /api/runners/:id
 * @desc    Get runner profile by ID
 * @access  Private
 */
router.get('/:id', runnerController.getRunnerProfile);

/**
 * @route   GET /api/runners
 * @desc    Get all runners with pagination
 * @access  Private
 */
router.get('/', runnerController.getAllRunners);

/**
 * @route   PATCH /api/runners/:id
 * @desc    Update runner profile
 * @access  Private (profile owner only)
 */
router.patch('/:id', runnerController.updateRunnerProfile);

/**
 * @route   DELETE /api/runners/:id
 * @desc    Delete runner profile
 * @access  Private (profile owner only)
 */
router.delete('/:id', runnerController.deleteRunnerProfile);

/**
 * @route   PATCH /api/runners/:id/stats
 * @desc    Update runner statistics
 * @access  Private (system/admin use)
 */
router.patch('/:id/stats', runnerController.updateRunnerStats);

export default router;
