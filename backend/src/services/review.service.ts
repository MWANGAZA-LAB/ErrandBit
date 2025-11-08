/**
 * Review Service - TypeScript
 * Handles job reviews and runner ratings
 */

import { Pool } from 'pg';
import { getPool } from '../db.js';
import { runnerService } from './runner.service.js';

export interface CreateReviewInput {
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  review_text?: string;
}

export interface Review {
  id: string;
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  review_text: string | null;
  created_at: Date;
  reviewer_name?: string;
  job_title?: string;
}

export class ReviewService {
  private pool: Pool | null;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Create a review for a completed job
   */
  async createReview(input: CreateReviewInput): Promise<Review> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    // Validate rating
    if (input.rating < 1 || input.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if review already exists
    const existing = await this.pool.query(
      'SELECT id FROM reviews WHERE job_id = $1 AND reviewer_id = $2',
      [input.job_id, input.reviewer_id]
    );

    if (existing.rows.length > 0) {
      throw new Error('Review already exists for this job');
    }

    // Create review
    const result = await this.pool.query(
      `INSERT INTO reviews (job_id, reviewer_id, reviewee_id, rating, review_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, job_id, reviewer_id, reviewee_id, rating, review_text, created_at`,
      [
        input.job_id,
        input.reviewer_id,
        input.reviewee_id,
        input.rating,
        input.review_text || null
      ]
    );

    const review = result.rows[0];

    // Update runner stats if reviewee is a runner
    const runnerProfile = await runnerService.getRunnerProfileByUserId(input.reviewee_id);
    if (runnerProfile) {
      await runnerService.updateRunnerStats(runnerProfile.id, input.rating);
    }

    return this.formatReview(review);
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId: string): Promise<Review | null> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `SELECT 
        r.id, r.job_id, r.reviewer_id, r.reviewee_id, r.rating, r.review_text, r.created_at,
        u.display_name as reviewer_name,
        j.title as job_title
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       LEFT JOIN jobs j ON r.job_id = j.id
       WHERE r.id = $1`,
      [reviewId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatReview(result.rows[0]);
  }

  /**
   * Get all reviews for a user (as reviewee)
   */
  async getReviewsForUser(userId: string, limit: number = 20): Promise<Review[]> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `SELECT 
        r.id, r.job_id, r.reviewer_id, r.reviewee_id, r.rating, r.review_text, r.created_at,
        u.display_name as reviewer_name,
        j.title as job_title
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       LEFT JOIN jobs j ON r.job_id = j.id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(row => this.formatReview(row));
  }

  /**
   * Get reviews for a specific job
   */
  async getReviewsForJob(jobId: string): Promise<Review[]> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `SELECT 
        r.id, r.job_id, r.reviewer_id, r.reviewee_id, r.rating, r.review_text, r.created_at,
        u.display_name as reviewer_name
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       WHERE r.job_id = $1
       ORDER BY r.created_at DESC`,
      [jobId]
    );

    return result.rows.map(row => this.formatReview(row));
  }

  /**
   * Get average rating for a user
   */
  async getAverageRating(userId: string): Promise<{ average: number; count: number }> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `SELECT 
        COALESCE(AVG(rating), 0) as average,
        COUNT(*) as count
       FROM reviews
       WHERE reviewee_id = $1`,
      [userId]
    );

    return {
      average: parseFloat(result.rows[0].average),
      count: parseInt(result.rows[0].count)
    };
  }

  /**
   * Check if user can review a job
   */
  async canReviewJob(jobId: string, userId: string): Promise<boolean> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    // Check if job exists and is paid
    const jobResult = await this.pool.query(
      'SELECT status, client_id, runner_id FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return false;
    }

    const job = jobResult.rows[0];

    // Job must be paid
    if (job.status !== 'paid') {
      return false;
    }

    // User must be client or runner
    if (job.client_id !== userId && job.runner_id !== userId) {
      return false;
    }

    // Check if review already exists
    const reviewResult = await this.pool.query(
      'SELECT id FROM reviews WHERE job_id = $1 AND reviewer_id = $2',
      [jobId, userId]
    );

    return reviewResult.rows.length === 0;
  }

  /**
   * Format database row to Review object
   */
  private formatReview(row: any): Review {
    return {
      id: row.id,
      job_id: row.job_id,
      reviewer_id: row.reviewer_id,
      reviewee_id: row.reviewee_id,
      rating: row.rating,
      review_text: row.review_text,
      created_at: row.created_at,
      reviewer_name: row.reviewer_name,
      job_title: row.job_title
    };
  }
}

export const reviewService = new ReviewService();
