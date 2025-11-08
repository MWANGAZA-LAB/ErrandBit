/**
 * Runner Service - TypeScript
 * Handles runner profile management and location-based queries
 */

import { Pool } from 'pg';
import { getPool } from '../db.js';

export interface CreateRunnerProfileInput {
  user_id: string | number;
  hourly_rate_usd: number;
  lightning_address: string;
  current_lat?: number;
  current_lng?: number;
  service_radius_km?: number;
  service_categories?: string[];
}

export interface UpdateRunnerProfileInput {
  runner_id: string | number;
  hourly_rate_usd?: number;
  lightning_address?: string;
  current_lat?: number;
  current_lng?: number;
  service_radius_km?: number;
  service_categories?: string[];
  is_available?: boolean;
}

export interface RunnerProfile {
  id: string;
  user_id: string;
  hourly_rate_usd: number;
  lightning_address: string;
  current_location: { lat: number; lng: number } | null;
  service_radius_km: number;
  is_available: boolean;
  service_categories: string[];
  total_jobs_completed: number;
  average_rating: number;
  total_reviews: number;
  created_at: Date;
  updated_at: Date;
}

export interface NearbyRunnersQuery {
  lat: number;
  lng: number;
  radius_km?: number;
  category?: string;
  available_only?: boolean;
  limit?: number;
}

export class RunnerService {
  private pool: Pool | null;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Create runner profile
   */
  async createRunnerProfile(input: CreateRunnerProfileInput): Promise<RunnerProfile> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    // Check if user already has a runner profile
    const existing = await this.pool.query(
      'SELECT id FROM runner_profiles WHERE user_id = $1',
      [input.user_id]
    );

    if (existing.rows.length > 0) {
      throw new Error('User already has a runner profile');
    }

    const result = await this.pool.query(
      `INSERT INTO runner_profiles (
        user_id, hourly_rate_usd, lightning_address,
        current_location, service_radius_km, service_categories
      ) VALUES (
        $1, $2, $3,
        $4,
        $5,
        $6
      )
      RETURNING 
        id, user_id, hourly_rate_usd, lightning_address,
        ST_Y(current_location::geometry) as current_lat,
        ST_X(current_location::geometry) as current_lng,
        service_radius_km, is_available, service_categories,
        total_jobs_completed, average_rating, total_reviews,
        created_at, updated_at`,
      [
        input.user_id,
        input.hourly_rate_usd,
        input.lightning_address,
        input.current_lat && input.current_lng
          ? `ST_SetSRID(ST_MakePoint(${input.current_lng}, ${input.current_lat}), 4326)::geography`
          : null,
        input.service_radius_km || 5.0,
        input.service_categories || []
      ]
    );

    return this.formatRunnerProfile(result.rows[0]);
  }

  /**
   * Get runner profile by ID
   */
  async getRunnerProfileById(runnerId: string | number | undefined): Promise<RunnerProfile | null> {
    if (!runnerId) return null;
    const id = String(runnerId);
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `SELECT 
        rp.id, rp.user_id, rp.hourly_rate_usd, rp.lightning_address,
        ST_Y(rp.current_location::geometry) as current_lat,
        ST_X(rp.current_location::geometry) as current_lng,
        rp.service_radius_km, rp.is_available, rp.service_categories,
        rp.total_jobs_completed, rp.average_rating, rp.total_reviews,
        rp.created_at, rp.updated_at,
        u.display_name, u.avatar_url, u.phone_number
      FROM runner_profiles rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatRunnerProfile(result.rows[0]);
  }

  /**
   * Get runner profile by user ID
   */
  async getRunnerProfileByUserId(userId: string | number): Promise<RunnerProfile | null> {
    const id = String(userId);
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `SELECT 
        rp.id, rp.user_id, rp.hourly_rate_usd, rp.lightning_address,
        ST_Y(rp.current_location::geometry) as current_lat,
        ST_X(rp.current_location::geometry) as current_lng,
        rp.service_radius_km, rp.is_available, rp.service_categories,
        rp.total_jobs_completed, rp.average_rating, rp.total_reviews,
        rp.created_at, rp.updated_at
      FROM runner_profiles rp
      WHERE rp.user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatRunnerProfile(result.rows[0]);
  }

  /**
   * Search nearby runners using PostGIS
   */
  async searchNearbyRunners(query: NearbyRunnersQuery): Promise<Array<RunnerProfile & { distance_km: number }>> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const radius_km = query.radius_km || 10;
    const limit = query.limit || 20;
    const available_only = query.available_only !== false; // Default true

    let sql = `
      SELECT 
        rp.id, rp.user_id, rp.hourly_rate_usd, rp.lightning_address,
        ST_Y(rp.current_location::geometry) as current_lat,
        ST_X(rp.current_location::geometry) as current_lng,
        rp.service_radius_km, rp.is_available, rp.service_categories,
        rp.total_jobs_completed, rp.average_rating, rp.total_reviews,
        rp.created_at, rp.updated_at,
        ST_Distance(
          rp.current_location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000 as distance_km,
        u.display_name, u.avatar_url
      FROM runner_profiles rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.current_location IS NOT NULL
        AND ST_DWithin(
          rp.current_location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3 * 1000
        )
    `;

    const params: any[] = [query.lng, query.lat, radius_km];

    if (available_only) {
      sql += ` AND rp.is_available = true`;
    }

    if (query.category) {
      sql += ` AND $${params.length + 1} = ANY(rp.service_categories)`;
      params.push(query.category);
    }

    sql += ` ORDER BY distance_km ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(sql, params);

    return result.rows.map(row => ({
      ...this.formatRunnerProfile(row),
      distance_km: parseFloat(row.distance_km),
      display_name: row.display_name,
      avatar_url: row.avatar_url
    }));
  }

  /**
   * Update runner profile
   */
  async updateRunnerProfile(input: UpdateRunnerProfileInput): Promise<RunnerProfile> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.hourly_rate_usd !== undefined) {
      updates.push(`hourly_rate_usd = $${paramCount++}`);
      values.push(input.hourly_rate_usd);
    }

    if (input.lightning_address !== undefined) {
      updates.push(`lightning_address = $${paramCount++}`);
      values.push(input.lightning_address);
    }

    if (input.current_lat !== undefined && input.current_lng !== undefined) {
      updates.push(`current_location = ST_SetSRID(ST_MakePoint($${paramCount++}, $${paramCount++}), 4326)::geography`);
      values.push(input.current_lng, input.current_lat);
    }

    if (input.service_radius_km !== undefined) {
      updates.push(`service_radius_km = $${paramCount++}`);
      values.push(input.service_radius_km);
    }

    if (input.service_categories !== undefined) {
      updates.push(`service_categories = $${paramCount++}`);
      values.push(input.service_categories);
    }

    if (input.is_available !== undefined) {
      updates.push(`is_available = $${paramCount++}`);
      values.push(input.is_available);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(input.runner_id);

    const result = await this.pool.query(
      `UPDATE runner_profiles 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING 
        id, user_id, hourly_rate_usd, lightning_address,
        ST_Y(current_location::geometry) as current_lat,
        ST_X(current_location::geometry) as current_lng,
        service_radius_km, is_available, service_categories,
        total_jobs_completed, average_rating, total_reviews,
        created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Runner profile not found');
    }

    return this.formatRunnerProfile(result.rows[0]);
  }

  /**
   * Update runner location
   */
  async updateRunnerLocation(runnerId: string | number | undefined, lat: number, lng: number): Promise<void> {
    if (!runnerId) throw new Error('Runner ID required');
    const id = String(runnerId);
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    await this.pool.query(
      `UPDATE runner_profiles 
       SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           updated_at = NOW()
       WHERE id = $3`,
      [lng, lat, id]
    );
  }

  /**
   * Toggle runner availability
   */
  async toggleAvailability(runnerId: string | number | undefined, isAvailable: boolean): Promise<RunnerProfile> {
    if (!runnerId) throw new Error('Runner ID required');
    const id = String(runnerId);
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `UPDATE runner_profiles 
       SET is_available = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING 
        id, user_id, hourly_rate_usd, lightning_address,
        ST_Y(current_location::geometry) as current_lat,
        ST_X(current_location::geometry) as current_lng,
        service_radius_km, is_available, service_categories,
        total_jobs_completed, average_rating, total_reviews,
        created_at, updated_at`,
      [isAvailable, id]
    );

    if (result.rows.length === 0) {
      throw new Error('Runner profile not found');
    }

    return this.formatRunnerProfile(result.rows[0]);
  }

  /**
   * Update runner stats after job completion
   */
  async updateRunnerStats(runnerId: string | number, newRating: number): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not configured');
    }

    await this.pool.query(
      `UPDATE runner_profiles 
       SET 
        total_jobs_completed = total_jobs_completed + 1,
        total_reviews = total_reviews + 1,
        average_rating = (
          (average_rating * total_reviews + $1) / (total_reviews + 1)
        ),
        updated_at = NOW()
       WHERE id = $2`,
      [newRating, String(runnerId)]
    );
  }

  /**
   * Format database row to RunnerProfile object
   */
  private formatRunnerProfile(row: any): RunnerProfile {
    return {
      id: row.id,
      user_id: row.user_id,
      hourly_rate_usd: parseFloat(row.hourly_rate_usd),
      lightning_address: row.lightning_address,
      current_location: row.current_lat && row.current_lng ? {
        lat: parseFloat(row.current_lat),
        lng: parseFloat(row.current_lng)
      } : null,
      service_radius_km: parseFloat(row.service_radius_km),
      is_available: row.is_available,
      service_categories: row.service_categories || [],
      total_jobs_completed: row.total_jobs_completed,
      average_rating: parseFloat(row.average_rating),
      total_reviews: row.total_reviews,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export const runnerService = new RunnerService();
