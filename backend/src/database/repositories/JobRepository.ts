/**
 * Job Repository
 * Data access layer for jobs table
 */

import { BaseRepository } from './BaseRepository.js';
import { NotFoundError } from '../../core/errors/AppError.js';
import { JobStatus } from '../../types/index.js';

export interface Job {
  id: number;
  client_id: number;
  runner_id: number | null;
  title: string;
  description: string;
  price_cents: number;
  location: string | null;
  status: JobStatus;
  deadline: Date | null;
  created_at: Date;
  updated_at: Date;
  accepted_at: Date | null;
  completed_at: Date | null;
  payment_confirmed_at: Date | null;
}

export interface CreateJobDto {
  clientId: number;
  title: string;
  description: string;
  priceCents: number;
  location?: { lat: number; lng: number } | undefined;
  deadline?: Date | undefined;
}

export interface UpdateJobDto {
  title?: string | undefined;
  description?: string | undefined;
  price_cents?: number | undefined;
  location?: { lat: number; lng: number } | undefined;
  deadline?: Date | undefined;
}

export interface JobFilters {
  status?: JobStatus | undefined;
  clientId?: number | undefined;
  runnerId?: number | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export class JobRepository extends BaseRepository<Job> {
  /**
   * Find job by ID
   */
  async findById(id: number): Promise<Job> {
    const query = `
      SELECT id, client_id, runner_id, title, description, price_cents,
             location, status, deadline, created_at, updated_at,
             accepted_at, completed_at, payment_confirmed_at
      FROM jobs
      WHERE id = $1
    `;
    const job = await this.queryOne<Job>(query, [id]);
    
    if (!job) {
      throw new NotFoundError(`Job with ID ${id} not found`, 'JOB_NOT_FOUND');
    }
    
    return job;
  }

  /**
   * Create new job
   */
  async create(data: CreateJobDto): Promise<Job> {
    const query = data.location
      ? `
        INSERT INTO jobs (
          client_id, title, description, price_cents, location, 
          status, deadline, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), 'open', $7, NOW(), NOW())
        RETURNING id, client_id, runner_id, title, description, price_cents,
                  location, status, deadline, created_at, updated_at,
                  accepted_at, completed_at, payment_confirmed_at
      `
      : `
        INSERT INTO jobs (
          client_id, title, description, price_cents, location, 
          status, deadline, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, NULL, 'open', $5, NOW(), NOW())
        RETURNING id, client_id, runner_id, title, description, price_cents,
                  location, status, deadline, created_at, updated_at,
                  accepted_at, completed_at, payment_confirmed_at
      `;

    const params = data.location
      ? [
          data.clientId,
          data.title,
          data.description,
          data.priceCents,
          data.location.lng,
          data.location.lat,
          data.deadline || null,
        ]
      : [
          data.clientId,
          data.title,
          data.description,
          data.priceCents,
          data.deadline || null,
        ];

    const jobs = await this.queryRows<Job>(query, params);

    if (jobs.length === 0) {
      throw new NotFoundError('Failed to create job', 'JOB_CREATE_FAILED');
    }

    return jobs[0]!;
  }

  /**
   * Update job
   */
  async update(id: number, data: UpdateJobDto): Promise<Job> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (data.price_cents !== undefined) {
      updates.push(`price_cents = $${paramCount++}`);
      values.push(data.price_cents);
    }

    if (data.location !== undefined) {
      updates.push(`location = ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount + 1}), 4326)`);
      values.push(data.location.lng, data.location.lat);
      paramCount += 2;
    }

    if (data.deadline !== undefined) {
      updates.push(`deadline = $${paramCount++}`);
      values.push(data.deadline);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE jobs
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, client_id, runner_id, title, description, price_cents,
                location, status, deadline, created_at, updated_at,
                accepted_at, completed_at, payment_confirmed_at
    `;

    const jobs = await this.queryRows<Job>(query, values);
    
    if (jobs.length === 0) {
      throw new NotFoundError(`Job with ID ${id} not found`, 'JOB_NOT_FOUND');
    }

    return jobs[0]!;
  }

  /**
   * Update job status
   */
  async updateStatus(id: number, status: JobStatus): Promise<Job> {
    const timestampField = this.getTimestampFieldForStatus(status);
    const timestampUpdate = timestampField ? `, ${timestampField} = NOW()` : '';

    const query = `
      UPDATE jobs
      SET status = $1, updated_at = NOW()${timestampUpdate}
      WHERE id = $2
      RETURNING id, client_id, runner_id, title, description, price_cents,
                location, status, deadline, created_at, updated_at,
                accepted_at, completed_at, payment_confirmed_at
    `;

    const jobs = await this.queryRows<Job>(query, [status, id]);
    
    if (jobs.length === 0) {
      throw new NotFoundError(`Job with ID ${id} not found`, 'JOB_NOT_FOUND');
    }

    return jobs[0]!;
  }

  /**
   * Assign runner to job
   */
  async assignRunner(jobId: number, runnerId: number): Promise<Job> {
    const query = `
      UPDATE jobs
      SET runner_id = $1, status = 'accepted', accepted_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND status = 'open'
      RETURNING id, client_id, runner_id, title, description, price_cents,
                location, status, deadline, created_at, updated_at,
                accepted_at, completed_at, payment_confirmed_at
    `;

    const jobs = await this.queryRows<Job>(query, [runnerId, jobId]);
    
    if (jobs.length === 0) {
      throw new NotFoundError(
        `Job with ID ${jobId} not found or not available`,
        'JOB_NOT_AVAILABLE'
      );
    }

    return jobs[0]!;
  }

  /**
   * Find jobs by client ID
   */
  async findByClientId(clientId: number, limit: number = 20, offset: number = 0): Promise<Job[]> {
    const query = `
      SELECT id, client_id, runner_id, title, description, price_cents,
             location, status, deadline, created_at, updated_at,
             accepted_at, completed_at, payment_confirmed_at
      FROM jobs
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    return this.queryRows<Job>(query, [clientId, limit, offset]);
  }

  /**
   * Find jobs by runner ID
   */
  async findByRunnerId(runnerId: number, limit: number = 20, offset: number = 0): Promise<Job[]> {
    const query = `
      SELECT id, client_id, runner_id, title, description, price_cents,
             location, status, deadline, created_at, updated_at,
             accepted_at, completed_at, payment_confirmed_at
      FROM jobs
      WHERE runner_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    return this.queryRows<Job>(query, [runnerId, limit, offset]);
  }

  /**
   * Find jobs by status
   */
  async findByStatus(status: JobStatus, limit: number = 20, offset: number = 0): Promise<Job[]> {
    const query = `
      SELECT id, client_id, runner_id, title, description, price_cents,
             location, status, deadline, created_at, updated_at,
             accepted_at, completed_at, payment_confirmed_at
      FROM jobs
      WHERE status = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    return this.queryRows<Job>(query, [status, limit, offset]);
  }

  /**
   * Find nearby jobs
   */
  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<Job[]> {
    const query = `
      SELECT id, client_id, runner_id, title, description, price_cents,
             location, status, deadline, created_at, updated_at,
             accepted_at, completed_at, payment_confirmed_at,
             ST_Distance(
               location::geography,
               ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
             ) / 1000 as distance_km
      FROM jobs
      WHERE status = 'open'
        AND location IS NOT NULL
        AND ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3 * 1000
        )
      ORDER BY distance_km ASC
      LIMIT $4 OFFSET $5
    `;

    return this.queryRows<Job>(query, [lng, lat, radiusKm, limit, offset]);
  }

  /**
   * List jobs with filters
   */
  async list(filters: JobFilters = {}): Promise<Job[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }

    if (filters.clientId) {
      conditions.push(`client_id = $${paramCount++}`);
      values.push(filters.clientId);
    }

    if (filters.runnerId) {
      conditions.push(`runner_id = $${paramCount++}`);
      values.push(filters.runnerId);
    }

    if (filters.minPrice) {
      conditions.push(`price_cents >= $${paramCount++}`);
      values.push(filters.minPrice);
    }

    if (filters.maxPrice) {
      conditions.push(`price_cents <= $${paramCount++}`);
      values.push(filters.maxPrice);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const query = `
      SELECT id, client_id, runner_id, title, description, price_cents,
             location, status, deadline, created_at, updated_at,
             accepted_at, completed_at, payment_confirmed_at
      FROM jobs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    values.push(limit, offset);

    return this.queryRows<Job>(query, values);
  }

  /**
   * Count jobs by filters
   */
  async count(filters: JobFilters = {}): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }

    if (filters.clientId) {
      conditions.push(`client_id = $${paramCount++}`);
      values.push(filters.clientId);
    }

    if (filters.runnerId) {
      conditions.push(`runner_id = $${paramCount++}`);
      values.push(filters.runnerId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `SELECT COUNT(*) as count FROM jobs ${whereClause}`;
    const result = await this.queryOne<{ count: string }>(query, values);
    
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Count completed jobs for a runner
   */
  async countCompletedJobsForRunner(runnerId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM jobs
      WHERE runner_id = $1 AND status = 'completed'
    `;
    
    const result = await this.queryOne<{ count: string }>(query, [runnerId]);
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Delete job
   */
  async delete(id: number): Promise<void> {
    const query = 'DELETE FROM jobs WHERE id = $1';
    await this.query(query, [id]);
  }

  /**
   * Get timestamp field for status
   */
  private getTimestampFieldForStatus(status: JobStatus): string | null {
    switch (status) {
      case 'accepted':
        return 'accepted_at';
      case 'completed':
        return 'completed_at';
      case 'payment_confirmed':
        return 'payment_confirmed_at';
      default:
        return null;
    }
  }
}
