/**
 * Review Controller
 * Handles HTTP requests for review management
 */

import { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { ReviewService } from '../services/review/ReviewService.js';
import { ReviewRepository } from '../database/repositories/ReviewRepository.js';
import { JobRepository } from '../database/repositories/JobRepository.js';
import { RunnerRepository } from '../database/repositories/RunnerRepository.js';
import { ValidationError } from '../core/errors/AppError.js';
import logger from '../utils/logger.js';

export class ReviewController {
  private reviewService: ReviewService;

  constructor() {
    const reviewRepository = new ReviewRepository();
    const jobRepository = new JobRepository();
    const runnerRepository = new RunnerRepository();
    this.reviewService = new ReviewService(reviewRepository, jobRepository, runnerRepository);
  }

  /**
   * Helper to ensure userId is a number
   */
  private ensureUserId(userId: string | number | undefined): number {
    if (!userId) {
      throw new ValidationError('User not authenticated', 'UNAUTHORIZED');
    }
    return typeof userId === 'string' ? parseInt(userId, 10) : userId;
  }

  /**
   * Create review for completed job
   * POST /api/reviews
   */
  createReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reviewerId = this.ensureUserId(req.user?.id);

      const { jobId, rating, comment } = req.body;

      if (!jobId || !rating) {
        throw new ValidationError('Job ID and rating are required', 'MISSING_FIELDS');
      }

      const reviewData = {
        jobId: parseInt(jobId, 10),
        reviewerId,
        rating: parseInt(rating, 10),
        comment,
      };

      const review = await this.reviewService.createReview(reviewData);

      logger.info('Review created', { reviewId: review.id, jobId });

      res.status(201).json({
        success: true,
        data: review,
        message: 'Review created successfully',
      });
    } catch (error) {
      logger.error('Error creating review', { error, body: req.body });
      throw error;
    }
  };

  /**
   * Get review by ID
   * GET /api/reviews/:id
   */
  getReviewById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reviewId = parseInt(req.params['id'] as string, 10);

      if (isNaN(reviewId)) {
        throw new ValidationError('Invalid review ID', 'INVALID_ID');
      }

      const review = await this.reviewService.getReviewById(reviewId);

      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      logger.error('Error fetching review', { error, reviewId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Get review by job ID
   * GET /api/reviews/job/:jobId
   */
  getReviewByJobId = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params['jobId'] as string, 10);

      if (isNaN(jobId)) {
        throw new ValidationError('Invalid job ID', 'INVALID_ID');
      }

      const review = await this.reviewService.getReviewByJobId(jobId);

      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      logger.error('Error fetching review by job', { error, jobId: req.params['jobId'] });
      throw error;
    }
  };

  /**
   * Get reviews for runner
   * GET /api/reviews/runner/:runnerId
   */
  getReviewsForRunner = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const runnerId = parseInt(req.params['runnerId'] as string, 10);
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;
      const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;

      if (isNaN(runnerId)) {
        throw new ValidationError('Invalid runner ID', 'INVALID_ID');
      }

      const reviews = await this.reviewService.getReviewsForRunner(runnerId, limit, offset);

      res.status(200).json({
        success: true,
        data: reviews,
        pagination: {
          limit,
          offset,
          total: reviews.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching reviews for runner', { error, runnerId: req.params['runnerId'] });
      throw error;
    }
  };

  /**
   * Get reviews by reviewer
   * GET /api/reviews/reviewer/:reviewerId
   */
  getReviewsByReviewer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reviewerId = parseInt(req.params['reviewerId'] as string, 10);
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;
      const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;

      if (isNaN(reviewerId)) {
        throw new ValidationError('Invalid reviewer ID', 'INVALID_ID');
      }

      const reviews = await this.reviewService.getReviewsByReviewer(reviewerId, limit, offset);

      res.status(200).json({
        success: true,
        data: reviews,
        pagination: {
          limit,
          offset,
          total: reviews.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching reviews by reviewer', { error, reviewerId: req.params['reviewerId'] });
      throw error;
    }
  };

  /**
   * Update review
   * PATCH /api/reviews/:id
   */
  updateReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reviewId = parseInt(req.params['id'] as string, 10);
      const reviewerId = this.ensureUserId(req.user?.id);

      if (isNaN(reviewId)) {
        throw new ValidationError('Invalid review ID', 'INVALID_ID');
      }

      const updatedReview = await this.reviewService.updateReview(reviewId, reviewerId, req.body);

      logger.info('Review updated', { reviewId, reviewerId });

      res.status(200).json({
        success: true,
        data: updatedReview,
        message: 'Review updated successfully',
      });
    } catch (error) {
      logger.error('Error updating review', { error, reviewId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Delete review
   * DELETE /api/reviews/:id
   */
  deleteReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reviewId = parseInt(req.params['id'] as string, 10);
      const reviewerId = this.ensureUserId(req.user?.id);

      if (isNaN(reviewId)) {
        throw new ValidationError('Invalid review ID', 'INVALID_ID');
      }

      await this.reviewService.deleteReview(reviewId, reviewerId);

      logger.info('Review deleted', { reviewId, reviewerId });

      res.status(200).json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting review', { error, reviewId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Get runner rating statistics
   * GET /api/reviews/runner/:runnerId/stats
   */
  getRunnerRatingStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const runnerId = parseInt(req.params['runnerId'] as string, 10);

      if (isNaN(runnerId)) {
        throw new ValidationError('Invalid runner ID', 'INVALID_ID');
      }

      const stats = await this.reviewService.getRunnerRatingStats(runnerId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching runner rating stats', { error, runnerId: req.params['runnerId'] });
      throw error;
    }
  };
}
