/**
 * Simple Authentication Routes (No OTP)
 * Username/Password authentication for easier testing and development
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { getPool } from '../db.js';
import { generateToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/index.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /auth/register
 * Register new user with username and password
 */
router.post('/register',
  [
    body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('display_name').optional().isLength({ max: 100 }).withMessage('Display name max 100 characters'),
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

      const { username, password, display_name } = req.body;
      const pool = getPool();
      if (!pool) {
        res.status(500).json({ success: false, error: 'Database not available' });
        return;
      }

      // Check if username already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length > 0) {
        res.status(409).json({ 
          success: false,
          error: 'Username already exists' 
        });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const result = await pool.query(
        `INSERT INTO users (username, password_hash, display_name, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, username, display_name, created_at`,
        [username, passwordHash, display_name || username]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        role: 'client',
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
        }
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Register error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to register user',
        message: err.message 
      });
    }
  }
);

/**
 * POST /auth/login
 * Login with username and password
 */
router.post('/login',
  [
    body('username').notEmpty().withMessage('Username required'),
    body('password').notEmpty().withMessage('Password required'),
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

      const { username, password } = req.body;
      const pool = getPool();
      if (!pool) {
        res.status(500).json({ success: false, error: 'Database not available' });
        return;
      }

      // Find user
      const result = await pool.query(
        'SELECT id, username, password_hash, display_name FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ 
          success: false,
          error: 'Invalid username or password' 
        });
        return;
      }

      const user = result.rows[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        res.status(401).json({ 
          success: false,
          error: 'Invalid username or password' 
        });
        return;
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        role: 'client',
      });

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
        }
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Login error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to login',
        message: err.message 
      });
    }
  }
);

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    if (!pool) {
      res.status(500).json({ success: false, error: 'Database not available' });
      return;
    }
    const result = await pool.query(
      'SELECT id, username, display_name, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
      return;
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Get user error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user',
      message: err.message 
    });
  }
});

/**
 * PUT /auth/me
 * Update user profile
 */
router.put('/me', authenticate,
  [
    body('display_name').optional().isLength({ max: 100 }).withMessage('Display name max 100 characters'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
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

      const { display_name, password } = req.body;
      const pool = getPool();
      if (!pool) {
        res.status(500).json({ success: false, error: 'Database not available' });
        return;
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (display_name) {
        updates.push(`display_name = $${paramCount++}`);
        values.push(display_name);
      }

      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        updates.push(`password_hash = $${paramCount++}`);
        values.push(passwordHash);
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
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING id, username, display_name`,
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
