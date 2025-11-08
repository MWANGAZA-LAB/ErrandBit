/**
 * Job Service - TypeScript
 * Handles job CRUD operations with PostGIS proximity search
 */

import { Pool } from 'pg';
import { getPool } from '../db.js';

export type JobStatus = 'open' | 'accepted' | 'in_progress' | 'completed' | 'paid' | 'cancelled';
export type JobCategory = 'delivery' | 'shopping' | 'cleaning' | 'moving' | 'handyman' | 'other';

export interface CreateJobInput {
  client_id: string | number;
  title: string;
  description: string;
  category: JobCategory;
  pickup_lat?: number;  // Auto-detected from user's location
  pickup_lng?: number;  // Auto-detected from user's location
  pickup_address?: string;  // Reverse geocoded from coordinates
  dropoff_lat?: number;
  dropoff_lng?: number;
  dropoff_address?: string;
  budget_max_usd: number;
  use_current_location?: boolean;  // Flag to use auto-detected location
}

export interface UpdateJobStatusInput {
  job_id: string | number;
  new_status: JobStatus;
  runner_id?: string | number;
  agreed_price_usd?: number;
  agreed_price_sats?: number;
}

export interface Job {
  id: string;
  client_id: string;
  runner_id: string | null;
  title: string;
  description: string;
  category: string;
  pickup_location: { lat: number; lng: number };
  pickup_address: string;
  dropoff_location: { lat: number; lng: number } | null;
  dropoff_address: string | null;
  budget_max_usd: number;
  agreed_price_usd: number | null;
  agreed_price_sats: number | null;
  status: JobStatus;
  created_at: Date;
  updated_at: Date;
  accepted_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  paid_at: Date | null;
}

export interface NearbyJobsQuery {
  lat: number;
  lng: number;
  radius_km?: number;
  category?: JobCategory;
  limit?: number;
}

export class JobService {
  private pool: Pool | null;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Create a new job
   */
  async createJob(input: CreateJobInput): Promise<Job> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `INSERT INTO jobs (
        client_id, title, description, category,
        pickup_location, pickup_address,
        dropoff_location, dropoff_address,
        budget_max_usd, status
      ) VALUES (
        $1, $2, $3, $4,
        ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
        $7,
        $8,
        $9,
        $10,
        'open'
      )
      RETURNING 
        id, client_id, runner_id, title, description, category,
        ST_Y(pickup_location::geometry) as pickup_lat,
        ST_X(pickup_location::geometry) as pickup_lng,
        pickup_address,
        ST_Y(dropoff_location::geometry) as dropoff_lat,
        ST_X(dropoff_location::geometry) as dropoff_lng,
        dropoff_address,
        budget_max_usd, agreed_price_usd, agreed_price_sats,
        status, created_at, updated_at,
        accepted_at, started_at, completed_at, paid_at`,
      [
        input.client_id,
        input.title,
        input.description,
        input.category,
        input.pickup_lng,
        input.pickup_lat,
        input.pickup_address,
        input.dropoff_lat && input.dropoff_lng
          ? `ST_SetSRID(ST_MakePoint(${input.dropoff_lng}, ${input.dropoff_lat}), 4326)::geography`
          : null,
        input.dropoff_address || null,
        input.budget_max_usd
      ]
    );

    return this.formatJob(result.rows[0]);
  }

  /**
   * Get nearby jobs using PostGIS proximity search
   */
  async getNearbyJobs(query: NearbyJobsQuery): Promise<Array<Job & { distance_km: number }>> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const radius_km = query.radius_km || 10;
    const limit = query.limit || 20;

    let sql = `
      SELECT 
        j.id, j.client_id, j.runner_id, j.title, j.description, j.category,
        ST_Y(j.pickup_location::geometry) as pickup_lat,
        ST_X(j.pickup_location::geometry) as pickup_lng,
        j.pickup_address,
        ST_Y(j.dropoff_location::geometry) as dropoff_lat,
        ST_X(j.dropoff_location::geometry) as dropoff_lng,
        j.dropoff_address,
        j.budget_max_usd, j.agreed_price_usd, j.agreed_price_sats,
        j.status, j.created_at, j.updated_at,
        j.accepted_at, j.started_at, j.completed_at, j.paid_at,
        ST_Distance(
          j.pickup_location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000 as distance_km,
        u.display_name as client_name
      FROM jobs j
      LEFT JOIN users u ON j.client_id = u.id
      WHERE j.status = 'open'
        AND ST_DWithin(
          j.pickup_location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3 * 1000
        )
    `;

    const params: any[] = [query.lng, query.lat, radius_km];

    if (query.category) {
      sql += ` AND j.category = $${params.length + 1}`;
      params.push(query.category);
    }

    sql += ` ORDER BY distance_km ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(sql, params);

    return result.rows.map(row => ({
      ...this.formatJob(row),
      distance_km: parseFloat(row.distance_km),
      client_name: row.client_name
    }));
  }

  /**
   * Get job by ID
   */
  async getJobById(jobId: string | number): Promise<Job | null> {
    const id = String(jobId);
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `SELECT 
        j.id, j.client_id, j.runner_id, j.title, j.description, j.category,
        ST_Y(j.pickup_location::geometry) as pickup_lat,
        ST_X(j.pickup_location::geometry) as pickup_lng,
        j.pickup_address,
        ST_Y(j.dropoff_location::geometry) as dropoff_lat,
        ST_X(j.dropoff_location::geometry) as dropoff_lng,
        j.dropoff_address,
        j.budget_max_usd, j.agreed_price_usd, j.agreed_price_sats,
        j.status, j.created_at, j.updated_at,
        j.accepted_at, j.started_at, j.completed_at, j.paid_at,
        u.display_name as client_name,
        u.phone_number as client_phone,
        r.display_name as runner_name,
        rp.lightning_address as runner_lightning_address
      FROM jobs j
      LEFT JOIN users u ON j.client_id = u.id
      LEFT JOIN runner_profiles rp ON j.runner_id = rp.id
      LEFT JOIN users r ON rp.user_id = r.id
      WHERE j.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatJob(result.rows[0]);
  }

  /**
   * Get jobs by client ID
   */
  async getJobsByClient(clientId: string | number): Promise<Job[]> {
    const id = String(clientId);
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `SELECT 
        j.id, j.client_id, j.runner_id, j.title, j.description, j.category,
        ST_Y(j.pickup_location::geometry) as pickup_lat,
        ST_X(j.pickup_location::geometry) as pickup_lng,
        j.pickup_address,
        ST_Y(j.dropoff_location::geometry) as dropoff_lat,
        ST_X(j.dropoff_location::geometry) as dropoff_lng,
        j.dropoff_address,
        j.budget_max_usd, j.agreed_price_usd, j.agreed_price_sats,
        j.status, j.created_at, j.updated_at,
        j.accepted_at, j.started_at, j.completed_at, j.paid_at
      FROM jobs j
      WHERE j.client_id = $1
      ORDER BY j.created_at DESC`,
      [id]
    );

    return result.rows.map(row => this.formatJob(row));
  }

  /**
   * Get jobs by runner ID
   */
  async getJobsByRunner(runnerId: string | number): Promise<Job[]> {
    const id = String(runnerId);
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `SELECT 
        j.id, j.client_id, j.runner_id, j.title, j.description, j.category,
        ST_Y(j.pickup_location::geometry) as pickup_lat,
        ST_X(j.pickup_location::geometry) as pickup_lng,
        j.pickup_address,
        ST_Y(j.dropoff_location::geometry) as dropoff_lat,
        ST_X(j.dropoff_location::geometry) as dropoff_lng,
        j.dropoff_address,
        j.budget_max_usd, j.agreed_price_usd, j.agreed_price_sats,
        j.status, j.created_at, j.updated_at,
        j.accepted_at, j.started_at, j.completed_at, j.paid_at
      FROM jobs j
      WHERE j.runner_id = $1
      ORDER BY j.created_at DESC`,
      [id]
    );

    return result.rows.map(row => this.formatJob(row));
  }

  /**
   * Update job status with state machine validation
   */
  async updateJobStatus(input: UpdateJobStatusInput): Promise<Job> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    // Get current job
    const currentJob = await this.getJobById(input.job_id);
    if (!currentJob) {
      throw new Error('Job not found');
    }

    // Validate state transition
    this.validateStatusTransition(currentJob.status, input.new_status);

    // Build update query
    const updates: string[] = ['status = $2'];
    const values: any[] = [input.job_id, input.new_status];
    let paramCount = 3;

    if (input.runner_id) {
      updates.push(`runner_id = $${paramCount++}`);
      values.push(input.runner_id);
    }

    if (input.agreed_price_usd) {
      updates.push(`agreed_price_usd = $${paramCount++}`);
      values.push(input.agreed_price_usd);
    }

    if (input.agreed_price_sats) {
      updates.push(`agreed_price_sats = $${paramCount++}`);
      values.push(input.agreed_price_sats);
    }

    // Set timestamp based on status
    if (input.new_status === 'accepted') {
      updates.push('accepted_at = NOW()');
    } else if (input.new_status === 'in_progress') {
      updates.push('started_at = NOW()');
    } else if (input.new_status === 'completed') {
      updates.push('completed_at = NOW()');
    } else if (input.new_status === 'paid') {
      updates.push('paid_at = NOW()');
    }

    const result = await this.pool.query(
      `UPDATE jobs 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING 
        id, client_id, runner_id, title, description, category,
        ST_Y(pickup_location::geometry) as pickup_lat,
        ST_X(pickup_location::geometry) as pickup_lng,
        pickup_address,
        ST_Y(dropoff_location::geometry) as dropoff_lat,
        ST_X(dropoff_location::geometry) as dropoff_lng,
        dropoff_address,
        budget_max_usd, agreed_price_usd, agreed_price_sats,
        status, created_at, updated_at,
        accepted_at, started_at, completed_at, paid_at`,
      values
    );

    return this.formatJob(result.rows[0]);
  }

  /**
   * Validate job status state machine transitions
   */
  private validateStatusTransition(currentStatus: JobStatus, newStatus: JobStatus): void {
    const validTransitions: Record<JobStatus, JobStatus[]> = {
      open: ['accepted', 'cancelled'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: ['paid'],
      paid: [],
      cancelled: []
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${currentStatus} -> ${newStatus}`
      );
    }
  }

  /**
   * Format database row to Job object
   */
  private formatJob(row: any): Job {
    return {
      id: row.id,
      client_id: row.client_id,
      runner_id: row.runner_id,
      title: row.title,
      description: row.description,
      category: row.category,
      pickup_location: {
        lat: parseFloat(row.pickup_lat),
        lng: parseFloat(row.pickup_lng)
      },
      pickup_address: row.pickup_address,
      dropoff_location: row.dropoff_lat && row.dropoff_lng ? {
        lat: parseFloat(row.dropoff_lat),
        lng: parseFloat(row.dropoff_lng)
      } : null,
      dropoff_address: row.dropoff_address,
      budget_max_usd: parseFloat(row.budget_max_usd),
      agreed_price_usd: row.agreed_price_usd ? parseFloat(row.agreed_price_usd) : null,
      agreed_price_sats: row.agreed_price_sats ? parseInt(row.agreed_price_sats) : null,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      accepted_at: row.accepted_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      paid_at: row.paid_at
    };
  }
}

export const jobService = new JobService();
