/**
 * Jobs Routes - TypeScript (MVP)
 * Job posting, browsing, and management
 */

import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { jobService, type JobCategory } from '../services/job.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /api/v1/jobs
 * Create a new job (requires authentication)
 */
router.post('/', authenticate,
  [
    body('title').isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
    body('description').isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
    body('category').isIn(['delivery', 'shopping', 'cleaning', 'moving', 'handyman', 'other']).withMessage('Invalid category'),
    body('pickup_lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid pickup latitude'),
    body('pickup_lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid pickup longitude'),
    body('pickup_address').notEmpty().withMessage('Pickup address required'),
    body('dropoff_lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid dropoff latitude'),
    body('dropoff_lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid dropoff longitude'),
    body('dropoff_address').optional().notEmpty().withMessage('Dropoff address cannot be empty'),
    body('budget_max_usd').isFloat({ min: 1 }).withMessage('Budget must be at least $1')
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
        return;
      }

      const {
        title,
        description,
        category,
        pickup_lat,
        pickup_lng,
        pickup_address,
        dropoff_lat,
        dropoff_lng,
        dropoff_address,
        budget_max_usd
      } = req.body;

      const jobData: any = {
        client_id: req.userId!,
        title,
        description,
        category: category as JobCategory,
        budget_max_usd: parseFloat(budget_max_usd)
      };

      if (pickup_lat) jobData.pickup_lat = parseFloat(pickup_lat);
      if (pickup_lng) jobData.pickup_lng = parseFloat(pickup_lng);
      if (pickup_address) jobData.pickup_address = pickup_address;
      if (dropoff_lat) jobData.dropoff_lat = parseFloat(dropoff_lat);
      if (dropoff_lng) jobData.dropoff_lng = parseFloat(dropoff_lng);
      if (dropoff_address) jobData.dropoff_address = dropoff_address;

      const job = await jobService.createJob(jobData);

      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        job
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Create job error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create job',
        message: err.message 
      });
    }
  }
);

/**
 * GET /api/v1/jobs
 * Get nearby jobs (requires authentication)
 */
router.get('/', authenticate,
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    query('radius_km').optional().isFloat({ min: 1, max: 100 }).withMessage('Radius must be 1-100 km'),
    query('category').optional().isIn(['delivery', 'shopping', 'cleaning', 'moving', 'handyman', 'other']).withMessage('Invalid category'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
        return;
      }

      const { lat, lng, radius_km, category, limit } = req.query;

      const queryParams: any = {
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string)
      };
      
      if (radius_km) queryParams.radius_km = parseFloat(radius_km as string);
      if (category) queryParams.category = category as JobCategory;
      if (limit) queryParams.limit = parseInt(limit as string);

      const jobs = await jobService.getNearbyJobs(queryParams);

      res.json({
        success: true,
        count: jobs.length,
        jobs
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Get nearby jobs error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch jobs',
        message: err.message 
      });
    }
  }
);

/**
 * GET /api/v1/jobs/my-jobs
 * Get jobs posted by current user
 */
router.get('/my-jobs', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const jobs = await jobService.getJobsByClient(req.userId!);

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get my jobs error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch jobs',
      message: err.message 
    });
  }
});

/**
 * GET /api/v1/jobs/:id
 * Get job details by ID
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ success: false, error: 'Job ID required' });
      return;
    }

    const job = await jobService.getJobById(id);

    if (!job) {
      res.status(404).json({ 
        success: false,
        error: 'Job not found' 
      });
      return;
    }

    res.json({
      success: true,
      job
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get job error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch job',
      message: err.message 
    });
  }
});

/**
 * POST /api/v1/jobs/:id/accept
 * Accept a job (runner only)
 */
router.post('/:id/accept', authenticate,
  [
    body('runner_id').notEmpty().withMessage('Runner ID required'),
    body('agreed_price_usd').optional().isFloat({ min: 1 }).withMessage('Price must be at least $1'),
    body('agreed_price_sats').optional().isInt({ min: 1 }).withMessage('Price must be at least 1 sat')
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
        return;
      }

      const { id } = req.params;
      const { runner_id, agreed_price_usd, agreed_price_sats } = req.body;

      if (!id) {
        res.status(400).json({ success: false, error: 'Job ID required' });
        return;
      }

      // Verify job exists and is open
      const job = await jobService.getJobById(id);
      if (!job) {
        res.status(404).json({ 
          success: false,
          error: 'Job not found' 
        });
        return;
      }

      if (job.status !== 'open') {
        res.status(400).json({ 
          success: false,
          error: `Job is ${job.status}, cannot accept` 
        });
        return;
      }

      // Update job status to accepted
      const statusUpdate: any = {
        job_id: id,
        new_status: 'accepted'
      };

      if (runner_id) statusUpdate.runner_id = runner_id;
      if (agreed_price_usd) statusUpdate.agreed_price_usd = parseFloat(agreed_price_usd);
      if (agreed_price_sats) statusUpdate.agreed_price_sats = parseInt(agreed_price_sats);

      const updatedJob = await jobService.updateJobStatus(statusUpdate);

      res.json({
        success: true,
        message: 'Job accepted successfully',
        job: updatedJob
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Accept job error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to accept job',
        message: err.message 
      });
    }
  }
);

/**
 * POST /api/v1/jobs/:id/start
 * Start working on a job (runner only)
 */
router.post('/:id/start', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, error: 'Job ID required' });
      return;
    }

    // Verify job exists and is accepted
    const job = await jobService.getJobById(id);
    if (!job) {
      res.status(404).json({ 
        success: false,
        error: 'Job not found' 
      });
      return;
    }

    if (job.status !== 'accepted') {
      res.status(400).json({ 
        success: false,
        error: `Job is ${job.status}, cannot start` 
      });
      return;
    }

    // Update job status to in_progress
    const updatedJob = await jobService.updateJobStatus({
      job_id: id!,
      new_status: 'in_progress'
    });

    res.json({
      success: true,
      message: 'Job started successfully',
      job: updatedJob
    });
  } catch (error) {
    const err = error as Error;
    console.error('Start job error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start job',
      message: err.message 
    });
  }
});

/**
 * POST /api/v1/jobs/:id/complete
 * Mark job as completed (runner only)
 */
router.post('/:id/complete', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, error: 'Job ID required' });
      return;
    }

    // Verify job exists and is in progress
    const job = await jobService.getJobById(id);
    if (!job) {
      res.status(404).json({ 
        success: false,
        error: 'Job not found' 
      });
      return;
    }

    if (job.status !== 'in_progress') {
      res.status(400).json({ 
        success: false,
        error: `Job is ${job.status}, cannot complete` 
      });
      return;
    }

    // Update job status to completed
    const updatedJob = await jobService.updateJobStatus({
      job_id: id!,
      new_status: 'completed'
    });

    res.json({
      success: true,
      message: 'Job completed successfully',
      job: updatedJob
    });
  } catch (error) {
    const err = error as Error;
    console.error('Complete job error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete job',
      message: err.message 
    });
  }
});

/**
 * POST /api/v1/jobs/:id/cancel
 * Cancel a job (client or runner)
 */
router.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, error: 'Job ID required' });
      return;
    }

    // Verify job exists
    const job = await jobService.getJobById(id);
    if (!job) {
      res.status(404).json({ 
        success: false,
        error: 'Job not found' 
      });
      return;
    }

    // Verify user is client or runner
    if (job.client_id !== req.userId && job.runner_id !== req.userId) {
      res.status(403).json({ 
        success: false,
        error: 'Not authorized to cancel this job' 
      });
      return;
    }

    if (job.status === 'completed' || job.status === 'paid') {
      res.status(400).json({ 
        success: false,
        error: 'Cannot cancel completed or paid job' 
      });
      return;
    }

    // Update job status to cancelled
    const updatedJob = await jobService.updateJobStatus({
      job_id: id!,
      new_status: 'cancelled'
    });

    res.json({
      success: true,
      message: 'Job cancelled successfully',
      job: updatedJob
    });
  } catch (error) {
    const err = error as Error;
    console.error('Cancel job error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to cancel job',
      message: err.message 
    });
  }
});

export default router;
