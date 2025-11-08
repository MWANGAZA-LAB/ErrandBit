/**
 * Review Service
 * Business logic for review management
 */

import { ReviewRepository, CreateReviewDto, UpdateReviewDto } from '../../database/repositories/ReviewRepository.js';
import { JobRepository } from '../../database/repositories/JobRepository.js';
import { RunnerRepository } from '../../database/repositories/RunnerRepository.js';
import { ValidationError, ConflictError } from '../../core/errors/AppError.js';
import logger from '../../utils/logger.js';

export interface CreateReviewRequest {
  jobId: number;
  reviewerId: number;
  rating: number;
  comment?: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
}

export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly jobRepository: JobRepository,
    private readonly runnerRepository: RunnerRepository
  ) {}

  /**
   * Create review for completed job
   */
  async createReview(data: CreateReviewRequest): Promise<any> {
    logger.info('Creating review', { jobId: data.jobId, reviewerId: data.reviewerId });

    // Verify job exists
    const job = await this.jobRepository.findById(data.jobId);

    // Verify job is completed
    if (job.status !== 'completed' && job.status !== 'payment_confirmed') {
      throw new ConflictError('Can only review completed jobs', 'JOB_NOT_COMPLETED');
    }

    // Verify reviewer is the client
    if (job.client_id !== data.reviewerId) {
      throw new ConflictError('Only the client can review the job', 'NOT_JOB_CLIENT');
    }

    // Check if review already exists
    const existingReview = await this.reviewRepository.findByJobId(data.jobId);
    if (existingReview) {
      throw new ConflictError('Review already exists for this job', 'REVIEW_EXISTS');
    }

    // Validate rating
    if (data.rating < 1 || data.rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5', 'INVALID_RATING');
    }

    // Validate comment length
    if (data.comment && data.comment.length > 1000) {
      throw new ValidationError('Comment must be less than 1000 characters', 'COMMENT_TOO_LONG');
    }

    const createDto: CreateReviewDto = {
      jobId: data.jobId,
      reviewerId: data.reviewerId,
      rating: data.rating,
      comment: data.comment?.trim(),
    };

    const review = await this.reviewRepository.create(createDto);

    // Update runner statistics
    if (job.runner_id) {
      await this.updateRunnerRating(job.runner_id);
    }

    logger.info('Review created successfully', { reviewId: review.id, jobId: data.jobId });

    return {
      id: review.id,
      jobId: review.job_id,
      reviewerId: review.reviewer_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
    };
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId: number): Promise<any> {
    logger.debug('Fetching review', { reviewId });

    const review = await this.reviewRepository.findById(reviewId);

    return {
      id: review.id,
      jobId: review.job_id,
      reviewerId: review.reviewer_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
    };
  }

  /**
   * Get review by job ID
   */
  async getReviewByJobId(jobId: number): Promise<any | null> {
    logger.debug('Fetching review by job ID', { jobId });

    const review = await this.reviewRepository.findByJobId(jobId);

    if (!review) {
      return null;
    }

    return {
      id: review.id,
      jobId: review.job_id,
      reviewerId: review.reviewer_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
    };
  }

  /**
   * Get reviews for runner
   */
  async getReviewsForRunner(runnerId: number, limit: number = 20, offset: number = 0): Promise<any> {
    logger.debug('Fetching reviews for runner', { runnerId });

    const reviews = await this.reviewRepository.findForRunner(runnerId, limit, offset);

    return reviews.map(review => ({
      id: review.id,
      jobId: review.job_id,
      reviewerId: review.reviewer_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
    }));
  }

  /**
   * Get reviews by reviewer
   */
  async getReviewsByReviewer(reviewerId: number, limit: number = 20, offset: number = 0): Promise<any> {
    logger.debug('Fetching reviews by reviewer', { reviewerId });

    const reviews = await this.reviewRepository.findByReviewerId(reviewerId, limit, offset);

    return reviews.map(review => ({
      id: review.id,
      jobId: review.job_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
    }));
  }

  /**
   * Update review
   */
  async updateReview(reviewId: number, reviewerId: number, data: UpdateReviewRequest): Promise<any> {
    logger.info('Updating review', { reviewId, reviewerId });

    const review = await this.reviewRepository.findById(reviewId);

    // Verify ownership
    if (review.reviewer_id !== reviewerId) {
      throw new ConflictError('You can only update your own reviews', 'NOT_REVIEW_OWNER');
    }

    // Validate rating
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new ValidationError('Rating must be between 1 and 5', 'INVALID_RATING');
    }

    // Validate comment length
    if (data.comment !== undefined && data.comment.length > 1000) {
      throw new ValidationError('Comment must be less than 1000 characters', 'COMMENT_TOO_LONG');
    }

    const updateDto: UpdateReviewDto = {
      rating: data.rating,
      comment: data.comment?.trim(),
    };

    const updatedReview = await this.reviewRepository.update(reviewId, updateDto);

    // Update runner statistics if rating changed
    if (data.rating !== undefined) {
      const job = await this.jobRepository.findById(review.job_id);
      if (job.runner_id) {
        await this.updateRunnerRating(job.runner_id);
      }
    }

    logger.info('Review updated successfully', { reviewId });

    return {
      id: updatedReview.id,
      jobId: updatedReview.job_id,
      rating: updatedReview.rating,
      comment: updatedReview.comment,
      createdAt: updatedReview.created_at,
    };
  }

  /**
   * Get runner rating statistics
   */
  async getRunnerRatingStats(runnerId: number): Promise<any> {
    logger.debug('Fetching runner rating statistics', { runnerId });

    const avgRating = await this.reviewRepository.getAverageRatingForRunner(runnerId);
    const reviewCount = await this.reviewRepository.countForRunner(runnerId);

    return {
      runnerId,
      averageRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      totalReviews: reviewCount,
    };
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId: number, reviewerId: number): Promise<void> {
    logger.info('Deleting review', { reviewId, reviewerId });

    const review = await this.reviewRepository.findById(reviewId);

    // Verify ownership
    if (review.reviewer_id !== reviewerId) {
      throw new ConflictError('You can only delete your own reviews', 'NOT_REVIEW_OWNER');
    }

    // Get job to update runner stats after deletion
    const job = await this.jobRepository.findById(review.job_id);

    await this.reviewRepository.delete(reviewId);

    // Update runner statistics
    if (job.runner_id) {
      await this.updateRunnerRating(job.runner_id);
    }

    logger.info('Review deleted successfully', { reviewId });
  }

  /**
   * Update runner's average rating (internal helper)
   */
  private async updateRunnerRating(runnerId: number): Promise<void> {
    logger.debug('Updating runner rating', { runnerId });

    const avgRating = await this.reviewRepository.getAverageRatingForRunner(runnerId);
    const reviewCount = await this.reviewRepository.countForRunner(runnerId);
    
    // Get actual completed job count (not just reviews)
    const completedJobs = await this.jobRepository.countCompletedJobsForRunner(runnerId);

    // Get runner profile
    const runnerProfile = await this.runnerRepository.findByUserId(runnerId);
    
    if (runnerProfile) {
      await this.runnerRepository.updateStats(runnerProfile.id, {
        avgRating: Math.round(avgRating * 10) / 10,
        totalJobs: completedJobs, // Use actual completed job count
      });

      logger.debug('Runner rating updated', { 
        runnerId, 
        avgRating: Math.round(avgRating * 10) / 10, 
        reviewCount,
        completedJobs
      });
    }
  }
}
