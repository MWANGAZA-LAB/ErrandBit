/**
 * Runner Service
 * Business logic for runner profile management
 */

import { RunnerRepository, CreateRunnerProfileDto, UpdateRunnerProfileDto, RunnerSearchFilters } from '../../database/repositories/RunnerRepository.js';
import { UserRepository } from '../../database/repositories/UserRepository.js';
import { NotFoundError, ValidationError, ConflictError } from '../../core/errors/AppError.js';
import logger from '../../utils/logger.js';

export interface CreateRunnerProfileRequest {
  userId: number;
  displayName: string;
  bio?: string;
  lightningAddress?: string;
  hourlyRateCents?: number;
  tags?: string[];
  location?: { lat: number; lng: number };
  avatarUrl?: string;
}

export interface UpdateRunnerProfileRequest {
  displayName?: string;
  bio?: string;
  lightningAddress?: string;
  hourlyRateCents?: number;
  tags?: string[];
  location?: { lat: number; lng: number };
  avatarUrl?: string;
}

export interface SearchRunnersRequest {
  tags?: string[];
  minRate?: number;
  maxRate?: number;
  minRating?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
  offset?: number;
}

export class RunnerService {
  constructor(
    private readonly runnerRepository: RunnerRepository,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Create runner profile
   */
  async createProfile(data: CreateRunnerProfileRequest): Promise<any> {
    logger.info('Creating runner profile', { userId: data.userId });

    // Verify user exists
    const user = await this.userRepository.findById(data.userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    // Check if profile already exists
    const existingProfile = await this.runnerRepository.findByUserId(data.userId);
    if (existingProfile) {
      throw new ConflictError('Runner profile already exists', 'PROFILE_EXISTS');
    }

    // Validate display name
    if (data.displayName.trim().length < 2) {
      throw new ValidationError('Display name must be at least 2 characters', 'NAME_TOO_SHORT');
    }

    if (data.displayName.length > 100) {
      throw new ValidationError('Display name must be less than 100 characters', 'NAME_TOO_LONG');
    }

    // Validate bio
    if (data.bio && data.bio.length > 500) {
      throw new ValidationError('Bio must be less than 500 characters', 'BIO_TOO_LONG');
    }

    // Validate hourly rate
    if (data.hourlyRateCents !== undefined && data.hourlyRateCents < 0) {
      throw new ValidationError('Hourly rate cannot be negative', 'INVALID_RATE');
    }

    // Validate Lightning address format (basic check)
    if (data.lightningAddress && !this.isValidLightningAddress(data.lightningAddress)) {
      throw new ValidationError('Invalid Lightning address format', 'INVALID_LIGHTNING_ADDRESS');
    }

    const createDto: CreateRunnerProfileDto = {
      userId: data.userId,
      displayName: data.displayName.trim(),
      bio: data.bio?.trim(),
      lightningAddress: data.lightningAddress,
      hourlyRateCents: data.hourlyRateCents,
      tags: data.tags || [],
      location: data.location,
      avatarUrl: data.avatarUrl,
    };

    const profile = await this.runnerRepository.create(createDto);

    logger.info('Runner profile created successfully', { profileId: profile.id, userId: data.userId });

    return {
      id: profile.id,
      userId: profile.user_id,
      displayName: profile.display_name,
      bio: profile.bio,
      lightningAddress: profile.lightning_address,
      hourlyRateCents: profile.hourly_rate_cents,
      tags: profile.tags,
      avatarUrl: profile.avatar_url,
      completionRate: profile.completion_rate,
      avgRating: profile.avg_rating,
      totalJobs: profile.total_jobs,
      createdAt: profile.created_at,
    };
  }

  /**
   * Get runner profile by ID
   */
  async getProfileById(profileId: number): Promise<any> {
    logger.debug('Fetching runner profile', { profileId });

    const profile = await this.runnerRepository.findById(profileId);

    return {
      id: profile.id,
      userId: profile.user_id,
      displayName: profile.display_name,
      bio: profile.bio,
      lightningAddress: profile.lightning_address,
      hourlyRateCents: profile.hourly_rate_cents,
      tags: profile.tags,
      avatarUrl: profile.avatar_url,
      completionRate: profile.completion_rate,
      avgRating: profile.avg_rating,
      totalJobs: profile.total_jobs,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }

  /**
   * Get runner profile by user ID
   */
  async getProfileByUserId(userId: number): Promise<any | null> {
    logger.debug('Fetching runner profile by user ID', { userId });

    const profile = await this.runnerRepository.findByUserId(userId);

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      userId: profile.user_id,
      displayName: profile.display_name,
      bio: profile.bio,
      lightningAddress: profile.lightning_address,
      hourlyRateCents: profile.hourly_rate_cents,
      tags: profile.tags,
      avatarUrl: profile.avatar_url,
      completionRate: profile.completion_rate,
      avgRating: profile.avg_rating,
      totalJobs: profile.total_jobs,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }

  /**
   * Update runner profile
   */
  async updateProfile(profileId: number, userId: number, data: UpdateRunnerProfileRequest): Promise<any> {
    logger.info('Updating runner profile', { profileId, userId });

    const profile = await this.runnerRepository.findById(profileId);

    // Verify ownership
    if (profile.user_id !== userId) {
      throw new ConflictError('You can only update your own profile', 'NOT_PROFILE_OWNER');
    }

    // Validate updates
    if (data.displayName !== undefined) {
      if (data.displayName.trim().length < 2) {
        throw new ValidationError('Display name must be at least 2 characters', 'NAME_TOO_SHORT');
      }
      if (data.displayName.length > 100) {
        throw new ValidationError('Display name must be less than 100 characters', 'NAME_TOO_LONG');
      }
    }

    if (data.bio !== undefined && data.bio.length > 500) {
      throw new ValidationError('Bio must be less than 500 characters', 'BIO_TOO_LONG');
    }

    if (data.hourlyRateCents !== undefined && data.hourlyRateCents < 0) {
      throw new ValidationError('Hourly rate cannot be negative', 'INVALID_RATE');
    }

    if (data.lightningAddress && !this.isValidLightningAddress(data.lightningAddress)) {
      throw new ValidationError('Invalid Lightning address format', 'INVALID_LIGHTNING_ADDRESS');
    }

    const updateDto: UpdateRunnerProfileDto = {
      display_name: data.displayName?.trim(),
      bio: data.bio?.trim(),
      lightning_address: data.lightningAddress,
      hourly_rate_cents: data.hourlyRateCents,
      tags: data.tags,
      location: data.location,
      avatar_url: data.avatarUrl,
    };

    const updatedProfile = await this.runnerRepository.update(profileId, updateDto);

    logger.info('Runner profile updated successfully', { profileId });

    return {
      id: updatedProfile.id,
      displayName: updatedProfile.display_name,
      bio: updatedProfile.bio,
      lightningAddress: updatedProfile.lightning_address,
      hourlyRateCents: updatedProfile.hourly_rate_cents,
      tags: updatedProfile.tags,
      avatarUrl: updatedProfile.avatar_url,
      updatedAt: updatedProfile.updated_at,
    };
  }

  /**
   * Search runners
   */
  async searchRunners(params: SearchRunnersRequest): Promise<any> {
    logger.debug('Searching runners', params);

    let runners;

    // Location-based search
    if (params.lat !== undefined && params.lng !== undefined && params.radiusKm !== undefined) {
      runners = await this.runnerRepository.findNearby(
        params.lat,
        params.lng,
        params.radiusKm,
        params.limit || 20,
        params.offset || 0
      );
    } else {
      // Filter-based search
      const filters: RunnerSearchFilters = {
        tags: params.tags,
        minRate: params.minRate,
        maxRate: params.maxRate,
        minRating: params.minRating,
        lat: params.lat,
        lng: params.lng,
        radiusKm: params.radiusKm,
        limit: params.limit || 20,
        offset: params.offset || 0,
      };

      runners = await this.runnerRepository.search(filters);
    }

    return runners.map(runner => ({
      id: runner.id,
      userId: runner.user_id,
      displayName: runner.display_name,
      bio: runner.bio,
      hourlyRateCents: runner.hourly_rate_cents,
      tags: runner.tags,
      avatarUrl: runner.avatar_url,
      completionRate: runner.completion_rate,
      avgRating: runner.avg_rating,
      totalJobs: runner.total_jobs,
    }));
  }

  /**
   * List all runners
   */
  async listRunners(limit: number = 20, offset: number = 0): Promise<any> {
    logger.debug('Listing runners', { limit, offset });

    const runners = await this.runnerRepository.list(limit, offset);

    return runners.map(runner => ({
      id: runner.id,
      userId: runner.user_id,
      displayName: runner.display_name,
      bio: runner.bio,
      hourlyRateCents: runner.hourly_rate_cents,
      tags: runner.tags,
      avatarUrl: runner.avatar_url,
      completionRate: runner.completion_rate,
      avgRating: runner.avg_rating,
      totalJobs: runner.total_jobs,
    }));
  }

  /**
   * Update runner statistics (internal use)
   */
  async updateStats(profileId: number, completionRate: number, avgRating: number, totalJobs: number): Promise<void> {
    logger.info('Updating runner statistics', { profileId, completionRate, avgRating, totalJobs });

    await this.runnerRepository.updateStats(profileId, {
      completionRate,
      avgRating,
      totalJobs,
    });

    logger.info('Runner statistics updated successfully', { profileId });
  }

  /**
   * Delete runner profile
   */
  async deleteProfile(profileId: number, userId: number): Promise<void> {
    logger.info('Deleting runner profile', { profileId, userId });

    const profile = await this.runnerRepository.findById(profileId);

    // Verify ownership
    if (profile.user_id !== userId) {
      throw new ConflictError('You can only delete your own profile', 'NOT_PROFILE_OWNER');
    }

    // Check if runner has active jobs
    if (profile.total_jobs > 0) {
      logger.warn('Attempting to delete profile with job history', { profileId, totalJobs: profile.total_jobs });
      // You might want to prevent deletion or handle differently
    }

    await this.runnerRepository.delete(profileId);

    logger.info('Runner profile deleted successfully', { profileId });
  }

  /**
   * Validate Lightning address format
   */
  private isValidLightningAddress(address: string): boolean {
    // Basic validation: should be in format user@domain.com
    const lightningAddressRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return lightningAddressRegex.test(address);
  }
}
