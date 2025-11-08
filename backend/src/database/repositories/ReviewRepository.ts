/**
 * Review Repository
 * Data access layer for reviews table
 */

import { BaseRepository } from './BaseRepository.js';
import { NotFoundError } from '../../core/errors/AppError.js';

export interface Review {
  id: number;
  job_id: number;
  reviewer_id: number;
  rating: number;
  comment: string | null;
  created_at: Date;
}

export interface CreateReviewDto {
  jobId: number;
  reviewerId: number;
  rating: number;
  comment?: string | undefined;
}

export interface UpdateReviewDto {
  rating?: number | undefined;
  comment?: string | undefined;
}

export class ReviewRepository extends BaseRepository<Review> {
  /**
   * Find review by ID
   */
  async findById(id: number): Promise<Review> {
    const query = `
      SELECT id, job_id, reviewer_id, rating, comment, created_at
      FROM reviews
      WHERE id = $1
    `;
    const review = await this.queryOne<Review>(query, [id]);
    
    if (!review) {
      throw new NotFoundError(
        `Review with ID ${id} not found`,
        'REVIEW_NOT_FOUND'
      );
    }
    
    return review;
  }

  /**
   * Find review by job ID
   */
  async findByJobId(jobId: number): Promise<Review | null> {
    const query = `
      SELECT id, job_id, reviewer_id, rating, comment, created_at
      FROM reviews
      WHERE job_id = $1
    `;
    return this.queryOne<Review>(query, [jobId]);
  }

  /**
   * Find reviews by reviewer ID
   */
  async findByReviewerId(reviewerId: number, limit: number = 20, offset: number = 0): Promise<Review[]> {
    const query = `
      SELECT id, job_id, reviewer_id, rating, comment, created_at
      FROM reviews
      WHERE reviewer_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    return this.queryRows<Review>(query, [reviewerId, limit, offset]);
  }

  /**
   * Find reviews for a runner (reviews of jobs they completed)
   */
  async findForRunner(runnerId: number, limit: number = 20, offset: number = 0): Promise<Review[]> {
    const query = `
      SELECT r.id, r.job_id, r.reviewer_id, r.rating, r.comment, r.created_at
      FROM reviews r
      INNER JOIN jobs j ON r.job_id = j.id
      WHERE j.runner_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    return this.queryRows<Review>(query, [runnerId, limit, offset]);
  }

  /**
   * Check if review exists for job
   */
  async existsByJobId(jobId: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM reviews WHERE job_id = $1
      ) as exists
    `;
    return this.exists(query, [jobId]);
  }

  /**
   * Create review
   */
  async create(data: CreateReviewDto): Promise<Review> {
    const query = `
      INSERT INTO reviews (job_id, reviewer_id, rating, comment, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, job_id, reviewer_id, rating, comment, created_at
    `;

    const reviews = await this.queryRows<Review>(query, [
      data.jobId,
      data.reviewerId,
      data.rating,
      data.comment || null,
    ]);

    if (reviews.length === 0) {
      throw new NotFoundError('Failed to create review', 'REVIEW_CREATE_FAILED');
    }

    return reviews[0]!;
  }

  /**
   * Update review
   */
  async update(id: number, data: UpdateReviewDto): Promise<Review> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.rating !== undefined) {
      updates.push(`rating = $${paramCount++}`);
      values.push(data.rating);
    }

    if (data.comment !== undefined) {
      updates.push(`comment = $${paramCount++}`);
      values.push(data.comment);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE reviews
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, job_id, reviewer_id, rating, comment, created_at
    `;

    const reviews = await this.queryRows<Review>(query, values);
    
    if (reviews.length === 0) {
      throw new NotFoundError(
        `Review with ID ${id} not found`,
        'REVIEW_NOT_FOUND'
      );
    }

    return reviews[0]!;
  }

  /**
   * Get average rating for a runner
   */
  async getAverageRatingForRunner(runnerId: number): Promise<number> {
    const query = `
      SELECT COALESCE(AVG(r.rating), 0) as avg_rating
      FROM reviews r
      INNER JOIN jobs j ON r.job_id = j.id
      WHERE j.runner_id = $1
    `;
    const result = await this.queryOne<{ avg_rating: number }>(query, [runnerId]);
    return result?.avg_rating || 0;
  }

  /**
   * Get review count for a runner
   */
  async countForRunner(runnerId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM reviews r
      INNER JOIN jobs j ON r.job_id = j.id
      WHERE j.runner_id = $1
    `;
    const result = await this.queryOne<{ count: string }>(query, [runnerId]);
    return parseInt(result?.count || '0', 10);
  }

  /**
   * List all reviews
   */
  async list(limit: number = 20, offset: number = 0): Promise<Review[]> {
    const query = `
      SELECT id, job_id, reviewer_id, rating, comment, created_at
      FROM reviews
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    return this.queryRows<Review>(query, [limit, offset]);
  }

  /**
   * Count all reviews
   */
  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM reviews';
    const result = await this.queryOne<{ count: string }>(query);
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Delete review
   */
  async delete(id: number): Promise<void> {
    const query = 'DELETE FROM reviews WHERE id = $1';
    await this.query(query, [id]);
  }
}
