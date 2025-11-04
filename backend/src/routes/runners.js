import { Router } from 'express';
import { validationResult } from 'express-validator';
import { getPool } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createRunnerValidation,
  updateRunnerValidation,
  searchRunnersValidation,
  getRunnerValidation,
} from '../validators/runner.js';

const router = Router();

/**
 * GET /runners/search
 * Search runners by location and tags (public endpoint)
 */
router.get('/', searchRunnersValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pool = getPool();
    if (!pool) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { lat, lng, radius_km = 10, tags, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT 
        rp.id,
        rp.user_id,
        rp.display_name,
        rp.bio,
        rp.lightning_address,
        rp.hourly_rate_cents,
        rp.tags,
        rp.completion_rate,
        rp.avg_rating,
        rp.total_jobs,
        rp.avatar_url,
        ST_Y(rp.location::geometry) as lat,
        ST_X(rp.location::geometry) as lng
    `;

    const params = [];
    let paramCount = 0;

    // Add distance calculation if location provided
    if (lat && lng) {
      paramCount++;
      query += `,
        ST_Distance(
          rp.location,
          ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount + 1}), 4326)::geography
        ) / 1000 as distance_km`;
      params.push(parseFloat(lng), parseFloat(lat));
      paramCount++;
    }

    query += `
      FROM runner_profiles rp
      WHERE 1=1
    `;

    // Filter by location radius
    if (lat && lng && radius_km) {
      paramCount++;
      query += ` AND ST_DWithin(
        rp.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $${paramCount} * 1000
      )`;
      params.push(parseFloat(radius_km));
    }

    // Filter by tags
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      paramCount++;
      query += ` AND rp.tags && $${paramCount}::text[]`;
      params.push(tagArray);
    }

    // Order by distance if location provided, otherwise by rating
    if (lat && lng) {
      query += ` ORDER BY distance_km ASC`;
    } else {
      query += ` ORDER BY rp.avg_rating DESC, rp.total_jobs DESC`;
    }

    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM runner_profiles rp WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (lat && lng && radius_km) {
      countQuery += ` AND ST_DWithin(
        rp.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3 * 1000
      )`;
      countParams.push(parseFloat(lng), parseFloat(lat), parseFloat(radius_km));
      countParamCount = 3;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      countParamCount++;
      countQuery += ` AND rp.tags && $${countParamCount}::text[]`;
      countParams.push(tagArray);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      results: result.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Search runners error:', error);
    res.status(500).json({ error: 'Failed to search runners', message: error.message });
  }
});

/**
 * GET /runners/:id
 * Get runner profile by ID (public endpoint)
 */
router.get('/:id', getRunnerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pool = getPool();
    if (!pool) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        rp.id,
        rp.user_id,
        rp.display_name,
        rp.bio,
        rp.lightning_address,
        rp.hourly_rate_cents,
        rp.tags,
        rp.completion_rate,
        rp.avg_rating,
        rp.total_jobs,
        rp.avatar_url,
        rp.created_at,
        ST_Y(rp.location::geometry) as lat,
        ST_X(rp.location::geometry) as lng
       FROM runner_profiles rp
       WHERE rp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Runner not found' });
    }

    // Get recent reviews
    const reviewsResult = await pool.query(
      `SELECT r.rating, r.comment, r.created_at, u.id as reviewer_id
       FROM reviews r
       JOIN jobs j ON r.job_id = j.id
       JOIN users u ON r.reviewer_id = u.id
       WHERE j.runner_id = (SELECT user_id FROM runner_profiles WHERE id = $1)
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [id]
    );

    const runner = result.rows[0];
    runner.recent_reviews = reviewsResult.rows;

    res.json(runner);
  } catch (error) {
    console.error('Get runner error:', error);
    res.status(500).json({ error: 'Failed to fetch runner', message: error.message });
  }
});

/**
 * POST /runners
 * Create runner profile (requires authentication)
 */
router.post('/', authenticate, authorize('runner'), createRunnerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pool = getPool();
    if (!pool) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Check if user already has a runner profile
    const existing = await pool.query(
      'SELECT id FROM runner_profiles WHERE user_id = $1',
      [req.userId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Runner profile already exists' });
    }

    const {
      display_name,
      bio,
      lightning_address,
      hourly_rate_cents,
      tags,
      location,
      avatar_url,
    } = req.body;

    // Build location point if provided
    let locationValue = null;
    if (location && location.lat && location.lng) {
      locationValue = `SRID=4326;POINT(${location.lng} ${location.lat})`;
    }

    const result = await pool.query(
      `INSERT INTO runner_profiles (
        user_id, display_name, bio, lightning_address, hourly_rate_cents,
        tags, location, avatar_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, display_name, bio, lightning_address, hourly_rate_cents,
                tags, completion_rate, avg_rating, total_jobs, avatar_url, created_at`,
      [
        req.userId,
        display_name,
        bio || null,
        lightning_address || null,
        hourly_rate_cents || null,
        tags || [],
        locationValue,
        avatar_url || null,
      ]
    );

    res.status(201).json({
      message: 'Runner profile created successfully',
      runner: result.rows[0],
    });
  } catch (error) {
    console.error('Create runner error:', error);
    res.status(500).json({ error: 'Failed to create runner profile', message: error.message });
  }
});

/**
 * PATCH /runners/:id
 * Update runner profile (requires authentication and ownership)
 */
router.patch('/:id', authenticate, authorize('runner'), updateRunnerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pool = getPool();
    if (!pool) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT user_id FROM runner_profiles WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Runner profile not found' });
    }

    if (ownerCheck.rows[0].user_id !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    const allowedFields = [
      'display_name',
      'bio',
      'lightning_address',
      'hourly_rate_cents',
      'tags',
      'avatar_url',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        paramCount++;
        updates.push(`${field} = $${paramCount}`);
        values.push(req.body[field]);
      }
    });

    // Handle location separately
    if (req.body.location && req.body.location.lat && req.body.location.lng) {
      paramCount++;
      updates.push(`location = ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount + 1}), 4326)::geography`);
      values.push(req.body.location.lng, req.body.location.lat);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated_at
    updates.push('updated_at = NOW()');

    paramCount++;
    values.push(id);

    const query = `
      UPDATE runner_profiles
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, user_id, display_name, bio, lightning_address, hourly_rate_cents,
                tags, completion_rate, avg_rating, total_jobs, avatar_url, updated_at
    `;

    const result = await pool.query(query, values);

    res.json({
      message: 'Runner profile updated successfully',
      runner: result.rows[0],
    });
  } catch (error) {
    console.error('Update runner error:', error);
    res.status(500).json({ error: 'Failed to update runner profile', message: error.message });
  }
});

export default router;
