/**
 * Authentication Routes - TypeScript (MVP)
 * Phone-based OTP authentication only
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getPool } from '../db.js';
import { generateToken } from '../utils/jwt.js';
import { otpService } from '../services/otp.service.js';
import { authenticate } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/index.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /api/v1/auth/request-otp
 * Request OTP code via SMS
 */
router.post('/request-otp',
  [
    body('phone_number')
      .isMobilePhone('any')
      .withMessage('Invalid phone number format (use E.164: +1234567890)')
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
        return;
      }

      const { phone_number } = req.body;

      // Request OTP
      const { sessionId } = await otpService.requestOTP(phone_number);

      res.json({
        success: true,
        message: 'OTP sent successfully',
        session_id: sessionId,
        expires_in: 600 // 10 minutes
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Request OTP error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to send OTP',
        message: err.message 
      });
    }
  }
);

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP and login/register user
 */
router.post('/verify-otp',
  [
    body('session_id').notEmpty().withMessage('Session ID required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
        return;
      }

      const { session_id, code } = req.body;

      // Verify OTP
      const phoneNumber = await otpService.verifyOTP(session_id, code);

      const pool = getPool();
      if (!pool) {
        res.status(500).json({ 
          success: false,
          error: 'Database not configured' 
        });
        return;
      }

      // Check if user exists
      let result = await pool.query(
        'SELECT id, phone_number, display_name, phone_verified FROM users WHERE phone_number = $1',
        [phoneNumber]
      );

      let user;
      let isNewUser = false;

      if (result.rows.length === 0) {
        // Create new user
        result = await pool.query(
          `INSERT INTO users (phone_number, phone_verified)
           VALUES ($1, true)
           RETURNING id, phone_number, display_name, phone_verified, created_at`,
          [phoneNumber]
        );
        user = result.rows[0];
        isNewUser = true;
      } else {
        // Update verification status
        result = await pool.query(
          `UPDATE users 
           SET phone_verified = true, last_login_at = NOW()
           WHERE phone_number = $1
           RETURNING id, phone_number, display_name, phone_verified, created_at`,
          [phoneNumber]
        );
        user = result.rows[0];
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        role: 'client'
      });

      res.json({
        success: true,
        message: isNewUser ? 'Account created successfully' : 'Login successful',
        is_new_user: isNewUser,
        token,
        user: {
          id: user.id,
          phone_number: user.phone_number,
          display_name: user.display_name,
          phone_verified: user.phone_verified
        }
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Verify OTP error:', err);
      
      // Handle specific OTP errors
      if (err.message.includes('expired') || err.message.includes('Invalid')) {
        res.status(401).json({ 
          success: false,
          error: err.message 
        });
        return;
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Verification failed',
        message: err.message 
      });
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    if (!pool) {
      res.status(500).json({ 
        success: false,
        error: 'Database not configured' 
      });
      return;
    }

    const result = await pool.query(
      `SELECT u.id, u.phone_number, u.display_name, u.avatar_url, u.bio, 
              u.phone_verified, u.created_at,
              rp.id as runner_profile_id, rp.hourly_rate_usd, 
              rp.lightning_address, rp.is_available,
              rp.total_jobs_completed, rp.average_rating
       FROM users u
       LEFT JOIN runner_profiles rp ON u.id = rp.user_id
       WHERE u.id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
      return;
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        phone_verified: user.phone_verified,
        created_at: user.created_at,
        runner_profile: user.runner_profile_id ? {
          id: user.runner_profile_id,
          hourly_rate_usd: parseFloat(user.hourly_rate_usd),
          lightning_address: user.lightning_address,
          is_available: user.is_available,
          total_jobs_completed: user.total_jobs_completed,
          average_rating: parseFloat(user.average_rating)
        } : null
      }
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get user error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user',
      message: err.message 
    });
  }
});

/**
 * PATCH /api/v1/auth/me
 * Update current user profile
 */
router.patch('/me', authenticate,
  [
    body('display_name').optional().isLength({ min: 2, max: 100 }).withMessage('Display name must be 2-100 characters'),
    body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
    body('avatar_url').optional().isURL().withMessage('Invalid avatar URL')
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
        return;
      }

      const { display_name, bio, avatar_url } = req.body;

      const pool = getPool();
      if (!pool) {
        res.status(500).json({ 
          success: false,
          error: 'Database not configured' 
        });
        return;
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (display_name !== undefined) {
        updates.push(`display_name = $${paramCount++}`);
        values.push(display_name);
      }
      if (bio !== undefined) {
        updates.push(`bio = $${paramCount++}`);
        values.push(bio);
      }
      if (avatar_url !== undefined) {
        updates.push(`avatar_url = $${paramCount++}`);
        values.push(avatar_url);
      }

      if (updates.length === 0) {
        res.status(400).json({ 
          success: false,
          error: 'No fields to update' 
        });
        return;
      }

      values.push(req.userId);

      const result = await pool.query(
        `UPDATE users 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount}
         RETURNING id, phone_number, display_name, avatar_url, bio, updated_at`,
        values
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: result.rows[0]
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Update user error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update profile',
        message: err.message 
      });
    }
  }
);

export default router;
