/**
 * Review Service
 * Handles review and rating operations
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_BASE = `${API_URL}/api`;

export interface Review {
  id: number;
  jobId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  reviewer?: {
    id: number;
    username: string;
  };
  reviewee?: {
    id: number;
    username: string;
  };
}

export interface RunnerRatingStats {
  runnerId: number;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
}

class ReviewService {
  /**
   * Get authorization headers
   */
  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Submit a review for a completed job
   */
  async submitReview(data: {
    jobId: number;
    rating: number;
    comment?: string;
  }): Promise<Review> {
    const response = await axios.post(
      `${API_BASE}/reviews`,
      data,
      { headers: this.getHeaders() }
    );
    return response.data.data || response.data.review;
  }

  /**
   * Get review by job ID
   */
  async getReviewByJobId(jobId: number): Promise<Review | null> {
    try {
      const response = await axios.get(
        `${API_BASE}/reviews/job/${jobId}`,
        { headers: this.getHeaders() }
      );
      return response.data.data || response.data.review;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  /**
   * Get reviews for a runner
   */
  async getReviewsForRunner(runnerId: number): Promise<Review[]> {
    try {
      const response = await axios.get(
        `${API_BASE}/reviews/runner/${runnerId}`,
        { headers: this.getHeaders() }
      );
      return response.data.data || response.data.reviews || [];
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  }

  /**
   * Get reviews by reviewer
   */
  async getReviewsByReviewer(reviewerId: number): Promise<Review[]> {
    try {
      const response = await axios.get(
        `${API_BASE}/reviews/reviewer/${reviewerId}`,
        { headers: this.getHeaders() }
      );
      return response.data.data || response.data.reviews || [];
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  }

  /**
   * Get runner rating statistics
   */
  async getRunnerRatingStats(runnerId: number): Promise<RunnerRatingStats | null> {
    try {
      const response = await axios.get(
        `${API_BASE}/reviews/runner/${runnerId}/stats`,
        { headers: this.getHeaders() }
      );
      return response.data.data || response.data.stats;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  /**
   * Update a review
   */
  async updateReview(reviewId: number, data: {
    rating?: number;
    comment?: string;
  }): Promise<Review> {
    const response = await axios.patch(
      `${API_BASE}/reviews/${reviewId}`,
      data,
      { headers: this.getHeaders() }
    );
    return response.data.data || response.data.review;
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: number): Promise<void> {
    await axios.delete(
      `${API_BASE}/reviews/${reviewId}`,
      { headers: this.getHeaders() }
    );
  }
}

export const reviewService = new ReviewService();
