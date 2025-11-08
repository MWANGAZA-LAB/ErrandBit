/**
 * Reviews Routes - TypeScript (MVP)
 * Job review and rating management
 */

import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/index.js';
import logger from '../utils/logger.js';
import { reviewService } from '../services/review.service.js';
import { jobService } from '../services/job.service.js';

const router = Router();

/**
 * POST /api/v1/reviews
 * Create a review for a completed job
 */
router.post('/', authenticate,
  [
    body('job_id').notEmpty().withMessage('Job ID required'),
    body('reviewee_id').notEmpty().withMessage('Reviewee ID required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review_text').optional().isLength({ max: 1000 }).withMessage('Review text must be less than 1000 characters')
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

      const { job_id, reviewee_id, rating, review_text } = req.body;

      // Verify job exists and is paid
      const job = await jobService.getJobById(job_id);
      if (!job) {
        res.status(404).json({ 
          success: false,
          error: 'Job not found' 
        });
        return;
      }

      if (job.status !== 'paid') {
        res.status(400).json({ 
          success: false,
          error: 'Job must be paid before reviewing' 
        });
        return;
      }

      // Verify user is part of the job
      if (job.client_id !== req.userId && job.runner_id !== req.userId) {
        res.status(403).json({ 
          success: false,
          error: 'You are not part of this job' 
        });
        return;
      }

      // Verify reviewee is the other party
      const validReviewee = (job.client_id === req.userId && job.runner_id === reviewee_id) ||
                           (job.runner_id === req.userId && job.client_id === reviewee_id);
      
      if (!validReviewee) {
        res.status(400).json({ 
          success: false,
          error: 'Invalid reviewee for this job' 
        });
        return;
      }

      // Check if user can review
      const canReview = await reviewService.canReviewJob(job_id, req.userId!);
      if (!canReview) {
        res.status(400).json({ 
          success: false,
          error: 'You have already reviewed this job or cannot review it' 
        });
        return;
      }

      // Create review
      const review = await reviewService.createReview({
        job_id,
        reviewer_id: req.userId!,
        reviewee_id,
        rating: parseInt(rating),
        review_text
      });

      res.status(201).json({
        success: true,
        message: 'Review created successfully',
        review
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Create review error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create review',
        message: err.message 
      });
    }
  }
);

/**
 * GET /api/v1/reviews/:id
 * Get review by ID
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ 
        success: false,
        error: 'Review ID required' 
      });
      return;
    }

    const review = await reviewService.getReviewById(id);

    if (!review) {
      res.status(404).json({ 
        success: false,
        error: 'Review not found' 
      });
      return;
    }

    res.json({
      success: true,
      review
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get review error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch review',
      message: err.message 
    });
  }
});

/**
 * GET /api/v1/reviews/user/:userId
 * Get all reviews for a user
 */
router.get('/user/:userId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 20;

    if (!userId) {
      res.status(400).json({ 
        success: false,
        error: 'User ID required' 
      });
      return;
    }

    const reviews = await reviewService.getReviewsForUser(userId, limit);
    const stats = await reviewService.getAverageRating(userId);

    res.json({
      success: true,
      count: reviews.length,
      average_rating: stats.average,
      total_reviews: stats.count,
      reviews
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get user reviews error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch reviews',
      message: err.message 
    });
  }
});

/**
 * GET /api/v1/reviews/job/:jobId
 * Get all reviews for a job
 */
router.get('/job/:jobId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({ 
        success: false,
        error: 'Job ID required' 
      });
      return;
    }

    const reviews = await reviewService.getReviewsForJob(jobId);

    res.json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get job reviews error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch reviews',
      message: err.message 
    });
  }
});

export default router;
