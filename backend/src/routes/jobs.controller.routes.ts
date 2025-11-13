/**
 * Job Routes - Controller-based
 * Routes for job management using JobController
 */

import { Router } from 'express';
import { JobController } from '../controllers/JobController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const jobController = new JobController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/jobs
 * @desc    Create a new job
 * @access  Private (authenticated users)
 */
router.post('/', jobController.createJob);

/**
 * @route   GET /api/jobs/search
 * @desc    Search jobs with filters (location, status, etc.)
 * @access  Private
 * @note    Must be before /:id route to avoid conflicts
 */
router.get('/search', jobController.searchJobs);

/**
 * @route   GET /api/jobs/my-jobs
 * @desc    Get jobs created by current user
 * @access  Private
 */
router.get('/my-jobs', jobController.getMyJobs);

/**
 * @route   GET /api/jobs/assigned
 * @desc    Get jobs assigned to current runner
 * @access  Private
 */
router.get('/assigned', jobController.getAssignedJobs);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get job by ID
 * @access  Private
 */
router.get('/:id', jobController.getJobById);

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs with optional filters
 * @access  Private
 */
router.get('/', jobController.getAllJobs);

/**
 * @route   PATCH /api/jobs/:id
 * @desc    Update job
 * @access  Private (job owner only)
 */
router.patch('/:id', jobController.updateJob);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete job
 * @access  Private (job owner only)
 */
router.delete('/:id', jobController.deleteJob);

/**
 * @route   POST /api/jobs/:id/assign
 * @desc    Assign runner to job
 * @access  Private (runners only)
 */
router.post('/:id/assign', jobController.assignRunner);

/**
 * @route   POST /api/jobs/:id/start
 * @desc    Start job (transition to in_progress)
 * @access  Private (assigned runner only)
 */
router.post('/:id/start', jobController.startJob);

/**
 * @route   POST /api/jobs/:id/complete
 * @desc    Mark job as completed
 * @access  Private (assigned runner only)
 */
router.post('/:id/complete', jobController.completeJob);

/**
 * @route   POST /api/jobs/:id/cancel
 * @desc    Cancel job
 * @access  Private (job owner only)
 */
router.post('/:id/cancel', jobController.cancelJob);

export default router;
