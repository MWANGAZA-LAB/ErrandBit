/**
 * Job Service
 * Business logic for job management
 */

import { JobRepository, CreateJobDto, UpdateJobDto, JobFilters } from '../../database/repositories/JobRepository.js';
import { UserRepository } from '../../database/repositories/UserRepository.js';
import { NotFoundError, ValidationError, ConflictError } from '../../core/errors/AppError.js';
import { JobStatus } from '../../types/index.js';
import logger from '../../utils/logger.js';

export interface CreateJobRequest {
  clientId: number;
  title: string;
  description: string;
  priceCents: number;
  location?: { lat: number; lng: number };
  address?: string;
  deadline?: Date;
}

export interface UpdateJobRequest {
  title?: string;
  description?: string;
  priceCents?: number;
  location?: { lat: number; lng: number };
  deadline?: Date;
}

export interface SearchJobsRequest {
  status?: JobStatus;
  clientId?: number;
  runnerId?: number;
  minPrice?: number;
  maxPrice?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
  offset?: number;
}

export class JobService {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Create a new job
   */
  async createJob(data: CreateJobRequest): Promise<any> {
    logger.info('Creating new job', { clientId: data.clientId, title: data.title });

    // Validate client exists
    const client = await this.userRepository.findById(data.clientId);
    if (!client) {
      throw new NotFoundError('Client not found', 'CLIENT_NOT_FOUND');
    }

    // Validate price
    if (!data.priceCents || data.priceCents <= 0) {
      throw new ValidationError('Price must be greater than 0', 'INVALID_PRICE');
    }

    // Validate title length
    if (data.title.trim().length < 3) {
      throw new ValidationError('Title must be at least 3 characters', 'TITLE_TOO_SHORT');
    }

    if (data.title.length > 200) {
      throw new ValidationError('Title must be less than 200 characters', 'TITLE_TOO_LONG');
    }

    // Validate description
    if (data.description.trim().length < 10) {
      throw new ValidationError('Description must be at least 10 characters', 'DESCRIPTION_TOO_SHORT');
    }

    if (data.description.length > 2000) {
      throw new ValidationError('Description must be less than 2000 characters', 'DESCRIPTION_TOO_LONG');
    }

    // Validate deadline is in future
    if (data.deadline && data.deadline < new Date()) {
      throw new ValidationError('Deadline must be in the future', 'INVALID_DEADLINE');
    }

    const createDto: CreateJobDto = {
      clientId: data.clientId,
      title: data.title.trim(),
      description: data.description.trim(),
      priceCents: data.priceCents,
      location: data.location,
      address: data.address,
      deadline: data.deadline,
    };

    const job = await this.jobRepository.create(createDto);

    logger.info('Job created successfully', { jobId: job.id, clientId: data.clientId });

    return {
      id: job.id,
      clientId: job.client_id,
      title: job.title,
      description: job.description,
      priceCents: job.price_cents,
      address: job.address,
      status: job.status,
      deadline: job.deadline,
      createdAt: job.created_at,
    };
  }

  /**
   * Get job by ID
   */
  async getJobById(jobId: number): Promise<any> {
    logger.debug('Fetching job', { jobId });

    const job = await this.jobRepository.findById(jobId);

    return {
      id: job.id,
      clientId: job.client_id,
      runnerId: job.runner_id,
      title: job.title,
      description: job.description,
      priceCents: job.price_cents,
      status: job.status,
      deadline: job.deadline,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      acceptedAt: job.accepted_at,
      completedAt: job.completed_at,
      paymentConfirmedAt: job.payment_confirmed_at,
    };
  }

  /**
   * Update job
   */
  async updateJob(jobId: number, clientId: number, data: UpdateJobRequest): Promise<any> {
    logger.info('Updating job', { jobId, clientId });

    const job = await this.jobRepository.findById(jobId);

    // Verify ownership
    if (job.client_id !== clientId) {
      throw new ConflictError('You can only update your own jobs', 'NOT_JOB_OWNER');
    }

    // Only allow updates for open jobs
    if (job.status !== 'open') {
      throw new ConflictError('Can only update open jobs', 'JOB_NOT_OPEN');
    }

    // Validate updates
    if (data.title !== undefined) {
      if (data.title.trim().length < 3) {
        throw new ValidationError('Title must be at least 3 characters', 'TITLE_TOO_SHORT');
      }
      if (data.title.length > 200) {
        throw new ValidationError('Title must be less than 200 characters', 'TITLE_TOO_LONG');
      }
    }

    if (data.description !== undefined) {
      if (data.description.trim().length < 10) {
        throw new ValidationError('Description must be at least 10 characters', 'DESCRIPTION_TOO_SHORT');
      }
      if (data.description.length > 2000) {
        throw new ValidationError('Description must be less than 2000 characters', 'DESCRIPTION_TOO_LONG');
      }
    }

    if (data.priceCents !== undefined && data.priceCents <= 0) {
      throw new ValidationError('Price must be greater than 0', 'INVALID_PRICE');
    }

    if (data.deadline !== undefined && data.deadline < new Date()) {
      throw new ValidationError('Deadline must be in the future', 'INVALID_DEADLINE');
    }

    const updateDto: UpdateJobDto = {
      title: data.title?.trim(),
      description: data.description?.trim(),
      price_cents: data.priceCents,
      location: data.location,
      deadline: data.deadline,
    };

    const updatedJob = await this.jobRepository.update(jobId, updateDto);

    logger.info('Job updated successfully', { jobId });

    return {
      id: updatedJob.id,
      clientId: updatedJob.client_id,
      title: updatedJob.title,
      description: updatedJob.description,
      priceCents: updatedJob.price_cents,
      status: updatedJob.status,
      deadline: updatedJob.deadline,
      updatedAt: updatedJob.updated_at,
    };
  }

  /**
   * Assign runner to job
   */
  async assignRunner(jobId: number, runnerId: number): Promise<any> {
    logger.info('Assigning runner to job', { jobId, runnerId });

    // Verify runner exists before attempting assignment
    const runner = await this.userRepository.findById(runnerId);
    if (!runner) {
      throw new NotFoundError('Runner not found', 'RUNNER_NOT_FOUND');
    }

    // Atomic assignment - repository will throw if job is not available
    // This prevents race conditions where multiple runners try to accept the same job
    const updatedJob = await this.jobRepository.assignRunner(jobId, runnerId);

    logger.info('Runner assigned successfully', { jobId, runnerId });

    // Return complete job object for frontend
    return updatedJob;
  }

  /**
   * Start job (transition from accepted to in_progress)
   */
  async startJob(jobId: number, runnerId: number): Promise<any> {
    logger.info('Starting job', { jobId, runnerId });

    const job = await this.jobRepository.findById(jobId);

    // Verify runner is assigned
    if (job.runner_id !== runnerId) {
      throw new ConflictError('You are not assigned to this job', 'NOT_ASSIGNED_RUNNER');
    }

    // Verify job is accepted
    if (job.status !== 'accepted') {
      throw new ConflictError('Job must be in accepted status to start', 'INVALID_JOB_STATUS');
    }

    const updatedJob = await this.jobRepository.updateStatus(jobId, 'in_progress');

    logger.info('Job started successfully', { jobId });

    // Return complete job object for frontend
    return updatedJob;
  }

  /**
   * Complete job
   */
  async completeJob(jobId: number, runnerId: number): Promise<any> {
    logger.info('Completing job', { jobId, runnerId });

    const job = await this.jobRepository.findById(jobId);

    // Verify runner is assigned
    if (job.runner_id !== runnerId) {
      throw new ConflictError('You are not assigned to this job', 'NOT_ASSIGNED_RUNNER');
    }

    // Verify job is in progress
    if (job.status !== 'in_progress') {
      throw new ConflictError('Job must be in progress to complete', 'INVALID_JOB_STATUS');
    }

    // When runner completes job, it moves to awaiting_payment status
    const updatedJob = await this.jobRepository.updateStatus(jobId, 'awaiting_payment');

    logger.info('Job completed successfully', { jobId });

    // Return complete job object for frontend
    return updatedJob;
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: number, clientId: number): Promise<any> {
    logger.info('Cancelling job', { jobId, clientId });

    const job = await this.jobRepository.findById(jobId);

    // Verify ownership
    if (job.client_id !== clientId) {
      throw new ConflictError('You can only cancel your own jobs', 'NOT_JOB_OWNER');
    }

    // Can only cancel open or accepted jobs
    if (job.status !== 'open' && job.status !== 'accepted') {
      throw new ConflictError('Cannot cancel job in current status', 'INVALID_JOB_STATUS');
    }

    const updatedJob = await this.jobRepository.updateStatus(jobId, 'cancelled');

    logger.info('Job cancelled successfully', { jobId });

    return {
      id: updatedJob.id,
      status: updatedJob.status,
    };
  }

  /**
   * Search jobs
   */
  async searchJobs(params: SearchJobsRequest): Promise<any> {
    logger.debug('Searching jobs', params);

    let jobs;

    // Location-based search
    if (params.lat !== undefined && params.lng !== undefined && params.radiusKm !== undefined) {
      jobs = await this.jobRepository.findNearby(
        params.lat,
        params.lng,
        params.radiusKm,
        params.limit || 20,
        params.offset || 0
      );
    } else {
      // Filter-based search
      const filters: JobFilters = {
        status: params.status,
        clientId: params.clientId,
        runnerId: params.runnerId,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        limit: params.limit || 20,
        offset: params.offset || 0,
      };

      jobs = await this.jobRepository.list(filters);
    }

    return jobs.map(job => ({
      id: job.id,
      clientId: job.client_id,
      runnerId: job.runner_id,
      title: job.title,
      description: job.description,
      priceCents: job.price_cents,
      status: job.status,
      deadline: job.deadline,
      createdAt: job.created_at,
    }));
  }

  /**
   * Get jobs by client
   */
  async getJobsByClient(clientId: number, limit: number = 20, offset: number = 0): Promise<any> {
    logger.debug('Fetching jobs by client', { clientId });

    const jobs = await this.jobRepository.findByClientId(clientId, limit, offset);

    return jobs.map(job => ({
      id: job.id,
      clientId: job.client_id,
      title: job.title,
      description: job.description,
      priceCents: job.price_cents,
      status: job.status,
      runnerId: job.runner_id,
      deadline: job.deadline,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    }));
  }

  /**
   * Get jobs by runner
   */
  async getJobsByRunner(runnerId: number, limit: number = 20, offset: number = 0): Promise<any> {
    logger.debug('Fetching jobs by runner', { runnerId });

    const jobs = await this.jobRepository.findByRunnerId(runnerId, limit, offset);

    return jobs.map(job => ({
      id: job.id,
      clientId: job.client_id,
      title: job.title,
      description: job.description,
      priceCents: job.price_cents,
      status: job.status,
      deadline: job.deadline,
      createdAt: job.created_at,
      acceptedAt: job.accepted_at,
      completedAt: job.completed_at,
    }));
  }

  /**
   * Delete job
   */
  async deleteJob(jobId: number, clientId: number): Promise<void> {
    logger.info('Deleting job', { jobId, clientId });

    const job = await this.jobRepository.findById(jobId);

    // Verify ownership
    if (job.client_id !== clientId) {
      throw new ConflictError('You can only delete your own jobs', 'NOT_JOB_OWNER');
    }

    // Can only delete cancelled jobs or open jobs with no runner
    if (job.status !== 'cancelled' && !(job.status === 'open' && !job.runner_id)) {
      throw new ConflictError('Cannot delete job in current status', 'INVALID_JOB_STATUS');
    }

    await this.jobRepository.delete(jobId);

    logger.info('Job deleted successfully', { jobId });
  }
}
