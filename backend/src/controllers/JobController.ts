/**
 * Job Controller
 * Handles HTTP requests for job management
 */

import { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { JobService } from '../services/job/JobService.js';
import { JobRepository } from '../database/repositories/JobRepository.js';
import { UserRepository } from '../database/repositories/UserRepository.js';
import { ValidationError } from '../core/errors/AppError.js';
import logger from '../utils/logger.js';

export class JobController {
  private jobService: JobService;

  constructor() {
    const jobRepository = new JobRepository();
    const userRepository = new UserRepository();
    this.jobService = new JobService(jobRepository, userRepository);
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
   * Create a new job
   * POST /api/jobs
   */
  createJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const clientId = this.ensureUserId(req.user?.id);

      // Convert budget_max_usd to priceCents if provided
      let priceCents = req.body.priceCents;
      if (!priceCents && req.body.budget_max_usd !== undefined) {
        priceCents = Math.round(req.body.budget_max_usd * 100);
      }

      // Handle location - support both old format (location object) and new format (pickup/dropoff)
      let location = req.body.location;
      if (!location && req.body.pickup_lat && req.body.pickup_lng) {
        location = {
          lat: req.body.pickup_lat,
          lng: req.body.pickup_lng,
        };
      }

      const jobData = {
        clientId,
        title: req.body.title,
        description: req.body.description,
        priceCents,
        location,
        address: req.body.pickup_address || req.body.address,
        deadline: req.body.deadline,
      };

      const job = await this.jobService.createJob(jobData);

      logger.info('Job created successfully', { jobId: job.id, clientId });

      res.status(201).json({
        success: true,
        data: job,
        message: 'Job created successfully',
      });
    } catch (error) {
      logger.error('Error creating job', { error, body: req.body });
      throw error;
    }
  };

  /**
   * Get job by ID
   * GET /api/jobs/:id
   */
  getJobById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params['id'] as string, 10);

      if (isNaN(jobId)) {
        throw new ValidationError('Invalid job ID', 'INVALID_ID');
      }

      const job = await this.jobService.getJobById(jobId);

      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      logger.error('Error fetching job', { error, jobId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Get all jobs (with optional filters)
   * GET /api/jobs
   */
  getAllJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const status = req.query['status'] as string | undefined;
      const filters = {
        status: status as any,
        clientId: req.query['clientId'] ? parseInt(req.query['clientId'] as string, 10) : undefined,
        runnerId: req.query['runnerId'] ? parseInt(req.query['runnerId'] as string, 10) : undefined,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20,
        offset: req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0,
      } as any;

      const jobs = await this.jobService.searchJobs(filters);

      res.status(200).json({
        success: true,
        data: jobs,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: jobs.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching jobs', { error, query: req.query });
      throw error;
    }
  };

  /**
   * Update job
   * PATCH /api/jobs/:id
   */
  updateJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params['id'] as string, 10);
      const clientId = this.ensureUserId(req.user?.id);

      if (isNaN(jobId)) {
        throw new ValidationError('Invalid job ID', 'INVALID_ID');
      }

      const updatedJob = await this.jobService.updateJob(jobId, clientId, req.body);

      logger.info('Job updated successfully', { jobId, clientId });

      res.status(200).json({
        success: true,
        data: updatedJob,
        message: 'Job updated successfully',
      });
    } catch (error) {
      logger.error('Error updating job', { error, jobId: req.params['id'], body: req.body });
      throw error;
    }
  };

  /**
   * Delete job
   * DELETE /api/jobs/:id
   */
  deleteJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params['id'] as string, 10);
      const clientId = this.ensureUserId(req.user?.id);

      if (isNaN(jobId)) {
        throw new ValidationError('Invalid job ID', 'INVALID_ID');
      }

      await this.jobService.deleteJob(jobId, clientId);

      logger.info('Job deleted successfully', { jobId, clientId });

      res.status(200).json({
        success: true,
        message: 'Job deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting job', { error, jobId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Assign runner to job
   * POST /api/jobs/:id/assign
   */
  assignRunner = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params['id'] as string, 10);
      const runnerId = this.ensureUserId(req.user?.id);

      if (isNaN(jobId)) {
        throw new ValidationError('Invalid job ID', 'INVALID_ID');
      }

      const updatedJob = await this.jobService.assignRunner(jobId, runnerId);

      logger.info('Runner assigned to job', { jobId, runnerId });

      res.status(200).json({
        success: true,
        data: updatedJob,
        message: 'Runner assigned successfully',
      });
    } catch (error) {
      logger.error('Error assigning runner', { error, jobId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Start job
   * POST /api/jobs/:id/start
   */
  startJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params['id'] as string, 10);
      const runnerId = this.ensureUserId(req.user?.id);

      if (isNaN(jobId)) {
        throw new ValidationError('Invalid job ID', 'INVALID_ID');
      }

      const updatedJob = await this.jobService.startJob(jobId, runnerId);

      logger.info('Job started', { jobId, runnerId });

      res.status(200).json({
        success: true,
        data: updatedJob,
        message: 'Job started successfully',
      });
    } catch (error) {
      logger.error('Error starting job', { error, jobId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Complete job
   * POST /api/jobs/:id/complete
   */
  completeJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params['id'] as string, 10);
      const runnerId = this.ensureUserId(req.user?.id);

      if (isNaN(jobId)) {
        throw new ValidationError('Invalid job ID', 'INVALID_ID');
      }

      const updatedJob = await this.jobService.completeJob(jobId, runnerId);

      logger.info('Job completed', { jobId, runnerId });

      res.status(200).json({
        success: true,
        data: updatedJob,
        message: 'Job completed successfully',
      });
    } catch (error) {
      logger.error('Error completing job', { error, jobId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Cancel job
   * POST /api/jobs/:id/cancel
   */
  cancelJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params['id'] as string, 10);
      const clientId = this.ensureUserId(req.user?.id);

      if (isNaN(jobId)) {
        throw new ValidationError('Invalid job ID', 'INVALID_ID');
      }

      const updatedJob = await this.jobService.cancelJob(jobId, clientId);

      logger.info('Job cancelled', { jobId, clientId });

      res.status(200).json({
        success: true,
        data: updatedJob,
        message: 'Job cancelled successfully',
      });
    } catch (error) {
      logger.error('Error cancelling job', { error, jobId: req.params['id'] });
      throw error;
    }
  };

  /**
   * Search jobs
   * GET /api/jobs/search
   */
  searchJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const status = req.query['status'] as string | undefined;
      const params = {
        status: status as any,
        clientId: req.query['clientId'] ? parseInt(req.query['clientId'] as string, 10) : undefined,
        runnerId: req.query['runnerId'] ? parseInt(req.query['runnerId'] as string, 10) : undefined,
        lat: req.query['lat'] ? parseFloat(req.query['lat'] as string) : undefined,
        lng: req.query['lng'] ? parseFloat(req.query['lng'] as string) : undefined,
        radiusKm: req.query['radius'] ? parseFloat(req.query['radius'] as string) : undefined,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20,
        offset: req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0,
      } as any;

      const jobs = await this.jobService.searchJobs(params);

      res.status(200).json({
        success: true,
        data: jobs,
        pagination: {
          limit: params.limit,
          offset: params.offset,
          total: jobs.length,
        },
      });
    } catch (error) {
      logger.error('Error searching jobs', { error, query: req.query });
      throw error;
    }
  };

  /**
   * Get jobs for current user (both as client and runner)
   * GET /api/jobs/my-jobs
   */
  getMyJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = this.ensureUserId(req.user?.id);

      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 100;
      const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;

      // Get jobs posted by user (as client) AND jobs assigned to user (as runner)
      const [clientJobs, runnerJobs] = await Promise.all([
        this.jobService.getJobsByClient(userId, limit, offset),
        this.jobService.getJobsByRunner(userId, limit, offset)
      ]);

      // Combine and deduplicate jobs
      const jobMap = new Map();
      [...clientJobs, ...runnerJobs].forEach(job => {
        if (!jobMap.has(job.id)) {
          jobMap.set(job.id, job);
        }
      });

      const jobs = Array.from(jobMap.values());

      res.status(200).json({
        success: true,
        data: jobs,
        total: jobs.length,
      });
    } catch (error) {
      logger.error('Error fetching user jobs', { error, userId: req.user?.id });
      throw error;
    }
  };

  /**
   * Get jobs assigned to current runner
   * GET /api/jobs/assigned
   */
  getAssignedJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const runnerId = this.ensureUserId(req.user?.id);

      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;
      const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;

      const jobs = await this.jobService.getJobsByRunner(runnerId, limit, offset);

      res.status(200).json({
        success: true,
        data: jobs,
        total: jobs.length,
      });
    } catch (error) {
      logger.error('Error fetching assigned jobs', { error, userId: req.user?.id });
      throw error;
    }
  };
}
