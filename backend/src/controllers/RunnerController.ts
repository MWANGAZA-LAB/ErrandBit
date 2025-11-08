/**
 * Runner Controller
 * Handles HTTP requests for runner profile management
 */

import { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { RunnerService } from '../services/runner/RunnerService.js';
import { RunnerRepository } from '../database/repositories/RunnerRepository.js';
import { UserRepository } from '../database/repositories/UserRepository.js';
import { ValidationError } from '../core/errors/AppError.js';
import logger from '../utils/logger.js';

export class RunnerController {
  private runnerService: RunnerService;

  constructor() {
    const runnerRepository = new RunnerRepository();
    const userRepository = new UserRepository();
    this.runnerService = new RunnerService(runnerRepository, userRepository);
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
   * Create runner profile
   * POST /api/runners
   */
  createRunnerProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = this.ensureUserId(req.user?.id);

      const profileData = {
        ...req.body,
        userId,
      };

      const profile = await this.runnerService.createProfile(profileData);

      logger.info('Runner profile created', { profileId: profile.id, userId });

      res.status(201).json({
        success: true,
        data: profile,
        message: 'Runner profile created successfully',
      });
    } catch (error) {
      logger.error('Error creating runner profile', { error, body: req.body });
      throw error;
    }
  };

  /**
   * Get runner profile by ID
   * GET /api/runners/:id
   */
  getRunnerProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const profileId = parseInt(req.params['id'] as string, 10);

      if (isNaN(profileId)) {
        throw new ValidationError('Invalid profile ID', 'INVALID_ID');
      }

      const profile = await this.runnerService.getProfileById(profileId);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error('Error fetching runner profile', { error, profileId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Get current user's runner profile
   * GET /api/runners/me
   */
  getMyRunnerProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = this.ensureUserId(req.user?.id);

      const profile = await this.runnerService.getProfileByUserId(userId);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error('Error fetching user runner profile', { error, userId: req.user?.id });
      throw error;
    }
  };

  /**
   * Update runner profile
   * PATCH /api/runners/:id
   */
  updateRunnerProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const profileId = parseInt(req.params['id'] as string, 10);
      const userId = this.ensureUserId(req.user?.id);

      if (isNaN(profileId)) {
        throw new ValidationError('Invalid profile ID', 'INVALID_ID');
      }

      const updatedProfile = await this.runnerService.updateProfile(
        profileId,
        userId,
        req.body
      );

      logger.info('Runner profile updated', { profileId, userId });

      res.status(200).json({
        success: true,
        data: updatedProfile,
        message: 'Runner profile updated successfully',
      });
    } catch (error) {
      logger.error('Error updating runner profile', { error, profileId: req.params['id'], body: req.body });
      throw error;
    }
  };

  /**
   * Delete runner profile
   * DELETE /api/runners/:id
   */
  deleteRunnerProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const profileId = parseInt(req.params['id'] as string, 10);
      const userId = this.ensureUserId(req.user?.id);

      if (isNaN(profileId)) {
        throw new ValidationError('Invalid profile ID', 'INVALID_ID');
      }

      await this.runnerService.deleteProfile(profileId, userId);

      logger.info('Runner profile deleted', { profileId, userId });

      res.status(200).json({
        success: true,
        message: 'Runner profile deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting runner profile', { error, profileId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Search runners
   * GET /api/runners/search
   */
  searchRunners = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const filters = {
        tags: req.query['tags'] ? (req.query['tags'] as string).split(',') : undefined,
        minRating: req.query['minRating'] ? parseFloat(req.query['minRating'] as string) : undefined,
        maxHourlyRate: req.query['maxHourlyRate'] ? parseInt(req.query['maxHourlyRate'] as string, 10) : undefined,
        latitude: req.query['lat'] ? parseFloat(req.query['lat'] as string) : undefined,
        longitude: req.query['lng'] ? parseFloat(req.query['lng'] as string) : undefined,
        radius: req.query['radius'] ? parseFloat(req.query['radius'] as string) : undefined,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20,
        offset: req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0,
      } as any;

      const runners = await this.runnerService.searchRunners(filters);

      res.status(200).json({
        success: true,
        data: runners,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: runners.length,
        },
      });
    } catch (error) {
      logger.error('Error searching runners', { error, query: req.query });
      throw error;
    }
  };

  /**
   * Get all runners
   * GET /api/runners
   */
  getAllRunners = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;
      const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;

      const runners = await this.runnerService.listRunners(limit, offset);

      res.status(200).json({
        success: true,
        data: runners,
        pagination: {
          limit,
          offset,
          total: runners.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching runners', { error, query: req.query });
      throw error;
    }
  };

  /**
   * Update runner statistics
   * PATCH /api/runners/:id/stats
   */
  updateRunnerStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const profileId = parseInt(req.params['id'] as string, 10);
      const { avgRating, totalJobs, completionRate } = req.body;

      if (isNaN(profileId)) {
        throw new ValidationError('Invalid profile ID', 'INVALID_ID');
      }

      const completionRateNum = completionRate !== undefined ? parseFloat(completionRate) : 0;
      const avgRatingNum = avgRating !== undefined ? parseFloat(avgRating) : 0;
      const totalJobsNum = totalJobs !== undefined ? parseInt(totalJobs, 10) : 0;

      await this.runnerService.updateStats(profileId, completionRateNum, avgRatingNum, totalJobsNum);

      logger.info('Runner stats updated', { profileId, completionRate: completionRateNum, avgRating: avgRatingNum, totalJobs: totalJobsNum });

      res.status(200).json({
        success: true,
        message: 'Runner statistics updated successfully',
      });
    } catch (error) {
      logger.error('Error updating runner stats', { error, profileId: req.params['id'], body: req.body });
      throw error;
    }
  };
}
