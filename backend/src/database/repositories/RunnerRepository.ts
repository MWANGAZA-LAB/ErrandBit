/**
 * Runner Repository
 * Data access layer for runner_profiles table
 */

import { BaseRepository } from './BaseRepository.js';
import { NotFoundError } from '../../core/errors/AppError.js';

export interface RunnerProfile {
  id: number;
  user_id: number;
  display_name: string;
  bio: string | null;
  lightning_address: string | null;
  hourly_rate_cents: number | null;
  tags: string[];
  location: string | null;
  avatar_url: string | null;
  completion_rate: number;
  avg_rating: number;
  total_jobs: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRunnerProfileDto {
  userId: number;
  displayName: string;
  bio?: string | undefined;
  lightningAddress?: string | undefined;
  hourlyRateCents?: number | undefined;
  tags?: string[] | undefined;
  location?: { lat: number; lng: number } | undefined;
  avatarUrl?: string | undefined;
}

export interface UpdateRunnerProfileDto {
  display_name?: string | undefined;
  bio?: string | undefined;
  lightning_address?: string | undefined;
  hourly_rate_cents?: number | undefined;
  tags?: string[] | undefined;
  location?: { lat: number; lng: number } | undefined;
  avatar_url?: string | undefined;
}

export interface RunnerSearchFilters {
  tags?: string[] | undefined;
  minRate?: number | undefined;
  maxRate?: number | undefined;
  minRating?: number | undefined;
  lat?: number | undefined;
  lng?: number | undefined;
  radiusKm?: number | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export class RunnerRepository extends BaseRepository<RunnerProfile> {
  /**
   * Find runner profile by ID
   */
  async findById(id: number): Promise<RunnerProfile> {
    const query = `
      SELECT id, user_id, display_name, bio, lightning_address,
             hourly_rate_cents, tags, location, avatar_url,
             completion_rate, avg_rating, total_jobs,
             created_at, updated_at
      FROM runner_profiles
      WHERE id = $1
    `;
    const profile = await this.queryOne<RunnerProfile>(query, [id]);
    
    if (!profile) {
      throw new NotFoundError(
        `Runner profile with ID ${id} not found`,
        'RUNNER_NOT_FOUND'
      );
    }
    
    return profile;
  }

  /**
   * Find runner profile by user ID
   */
  async findByUserId(userId: number): Promise<RunnerProfile | null> {
    const query = `
      SELECT id, user_id, display_name, bio, lightning_address,
             hourly_rate_cents, tags, location, avatar_url,
             completion_rate, avg_rating, total_jobs,
             created_at, updated_at
      FROM runner_profiles
      WHERE user_id = $1
    `;
    return this.queryOne<RunnerProfile>(query, [userId]);
  }

  /**
   * Check if user has a runner profile
   */
  async existsByUserId(userId: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM runner_profiles WHERE user_id = $1
      ) as exists
    `;
    return this.exists(query, [userId]);
  }

  /**
   * Create runner profile
   */
  async create(data: CreateRunnerProfileDto): Promise<RunnerProfile> {
    const query = data.location
      ? `
        INSERT INTO runner_profiles (
          user_id, display_name, bio, lightning_address, hourly_rate_cents,
          tags, location, avatar_url, completion_rate, avg_rating, total_jobs,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326), $9, 0, 0, 0, NOW(), NOW())
        RETURNING id, user_id, display_name, bio, lightning_address,
                  hourly_rate_cents, tags, location, avatar_url,
                  completion_rate, avg_rating, total_jobs,
                  created_at, updated_at
      `
      : `
        INSERT INTO runner_profiles (
          user_id, display_name, bio, lightning_address, hourly_rate_cents,
          tags, location, avatar_url, completion_rate, avg_rating, total_jobs,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, 0, 0, 0, NOW(), NOW())
        RETURNING id, user_id, display_name, bio, lightning_address,
                  hourly_rate_cents, tags, location, avatar_url,
                  completion_rate, avg_rating, total_jobs,
                  created_at, updated_at
      `;

    const params = data.location
      ? [
          data.userId,
          data.displayName,
          data.bio || null,
          data.lightningAddress || null,
          data.hourlyRateCents || null,
          data.tags || [],
          data.location.lng,
          data.location.lat,
          data.avatarUrl || null,
        ]
      : [
          data.userId,
          data.displayName,
          data.bio || null,
          data.lightningAddress || null,
          data.hourlyRateCents || null,
          data.tags || [],
          data.avatarUrl || null,
        ];

    const profiles = await this.queryRows<RunnerProfile>(query, params);

    if (profiles.length === 0) {
      throw new NotFoundError('Failed to create runner profile', 'RUNNER_CREATE_FAILED');
    }

    return profiles[0]!;
  }

  /**
   * Update runner profile
   */
  async update(id: number, data: UpdateRunnerProfileDto): Promise<RunnerProfile> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.display_name !== undefined) {
      updates.push(`display_name = $${paramCount++}`);
      values.push(data.display_name);
    }

    if (data.bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(data.bio);
    }

    if (data.lightning_address !== undefined) {
      updates.push(`lightning_address = $${paramCount++}`);
      values.push(data.lightning_address);
    }

    if (data.hourly_rate_cents !== undefined) {
      updates.push(`hourly_rate_cents = $${paramCount++}`);
      values.push(data.hourly_rate_cents);
    }

    if (data.tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(data.tags);
    }

    if (data.location !== undefined) {
      updates.push(`location = ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount + 1}), 4326)`);
      values.push(data.location.lng, data.location.lat);
      paramCount += 2;
    }

    if (data.avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(data.avatar_url);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE runner_profiles
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, user_id, display_name, bio, lightning_address,
                hourly_rate_cents, tags, location, avatar_url,
                completion_rate, avg_rating, total_jobs,
                created_at, updated_at
    `;

    const profiles = await this.queryRows<RunnerProfile>(query, values);
    
    if (profiles.length === 0) {
      throw new NotFoundError(
        `Runner profile with ID ${id} not found`,
        'RUNNER_NOT_FOUND'
      );
    }

    return profiles[0]!;
  }

  /**
   * Update runner statistics
   */
  async updateStats(
    id: number,
    stats: {
      completionRate?: number;
      avgRating?: number;
      totalJobs?: number;
    }
  ): Promise<RunnerProfile> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (stats.completionRate !== undefined) {
      updates.push(`completion_rate = $${paramCount++}`);
      values.push(stats.completionRate);
    }

    if (stats.avgRating !== undefined) {
      updates.push(`avg_rating = $${paramCount++}`);
      values.push(stats.avgRating);
    }

    if (stats.totalJobs !== undefined) {
      updates.push(`total_jobs = $${paramCount++}`);
      values.push(stats.totalJobs);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE runner_profiles
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, user_id, display_name, bio, lightning_address,
                hourly_rate_cents, tags, location, avatar_url,
                completion_rate, avg_rating, total_jobs,
                created_at, updated_at
    `;

    const profiles = await this.queryRows<RunnerProfile>(query, values);
    
    if (profiles.length === 0) {
      throw new NotFoundError(
        `Runner profile with ID ${id} not found`,
        'RUNNER_NOT_FOUND'
      );
    }

    return profiles[0]!;
  }

  /**
   * Search runners nearby
   */
  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<RunnerProfile[]> {
    const query = `
      SELECT id, user_id, display_name, bio, lightning_address,
             hourly_rate_cents, tags, location, avatar_url,
             completion_rate, avg_rating, total_jobs,
             created_at, updated_at,
             ST_Distance(
               location::geography,
               ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
             ) / 1000 as distance_km
      FROM runner_profiles
      WHERE location IS NOT NULL
        AND ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3 * 1000
        )
      ORDER BY distance_km ASC, avg_rating DESC
      LIMIT $4 OFFSET $5
    `;

    return this.queryRows<RunnerProfile>(query, [lng, lat, radiusKm, limit, offset]);
  }

  /**
   * Search runners with filters
   */
  async search(filters: RunnerSearchFilters = {}): Promise<RunnerProfile[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`tags && $${paramCount++}::text[]`);
      values.push(filters.tags);
    }

    if (filters.minRate !== undefined) {
      conditions.push(`hourly_rate_cents >= $${paramCount++}`);
      values.push(filters.minRate);
    }

    if (filters.maxRate !== undefined) {
      conditions.push(`hourly_rate_cents <= $${paramCount++}`);
      values.push(filters.maxRate);
    }

    if (filters.minRating !== undefined) {
      conditions.push(`avg_rating >= $${paramCount++}`);
      values.push(filters.minRating);
    }

    // Location-based search
    if (filters.lat !== undefined && filters.lng !== undefined && filters.radiusKm !== undefined) {
      conditions.push(`location IS NOT NULL`);
      conditions.push(`
        ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount + 1}), 4326)::geography,
          $${paramCount + 2} * 1000
        )
      `);
      values.push(filters.lng, filters.lat, filters.radiusKm);
      paramCount += 3;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    // Build ORDER BY clause with parameterized location if provided
    let orderBy: string;
    let selectDistance = '';
    
    if (filters.lat !== undefined && filters.lng !== undefined) {
      // Calculate distance once in SELECT clause for sorting
      selectDistance = `, ST_Distance(
        location::geography,
        ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount + 1}), 4326)::geography
      ) / 1000 as distance_km`;
      values.push(filters.lng, filters.lat);
      paramCount += 2;
      orderBy = 'distance_km ASC, avg_rating DESC';
    } else {
      orderBy = 'avg_rating DESC, total_jobs DESC';
    }

    const query = `
      SELECT id, user_id, display_name, bio, lightning_address,
             hourly_rate_cents, tags, location, avatar_url,
             completion_rate, avg_rating, total_jobs,
             created_at, updated_at${selectDistance}
      FROM runner_profiles
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    values.push(limit, offset);

    return this.queryRows<RunnerProfile>(query, values);
  }

  /**
   * List all runners
   */
  async list(limit: number = 20, offset: number = 0): Promise<RunnerProfile[]> {
    const query = `
      SELECT id, user_id, display_name, bio, lightning_address,
             hourly_rate_cents, tags, location, avatar_url,
             completion_rate, avg_rating, total_jobs,
             created_at, updated_at
      FROM runner_profiles
      ORDER BY avg_rating DESC, total_jobs DESC
      LIMIT $1 OFFSET $2
    `;

    return this.queryRows<RunnerProfile>(query, [limit, offset]);
  }

  /**
   * Count runners
   */
  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM runner_profiles';
    const result = await this.queryOne<{ count: string }>(query);
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Delete runner profile
   */
  async delete(id: number): Promise<void> {
    const query = 'DELETE FROM runner_profiles WHERE id = $1';
    await this.query(query, [id]);
  }
}
