/**
 * Profile Routes
 * API endpoints for user profile management
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { ProfileService } from '../services/ProfileService.js';
import { PasswordService } from '../services/auth/PasswordService.js';
import { getPool } from '../db.js';
import {
  updateProfileExtendedSchema,
  changePasswordSchema,
  updatePreferencesSchema,
  uploadAvatarSchema,
} from '../validators/schemas.js';
import logger from '../utils/logger.js';
import { ValidationError } from '../core/errors/AppError.js';

const router = Router();

// Initialize services
const passwordService = new PasswordService();
const pool = getPool();
if (!pool) {
  throw new Error('Database pool not available');
}
const profileService = new ProfileService(pool, passwordService);

/**
 * @route   PUT /api/profile
 * @desc    Update user profile (display name, email, Lightning address, theme, avatar)
 * @access  Private
 */
router.put(
  '/',
  authenticate,
  validateBody(updateProfileExtendedSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = typeof req.userId === 'string' ? parseInt(req.userId, 10) : req.userId!;
      const data = req.body;

      // Log Lightning address changes to security audit
      if (data.lightningAddress) {
        await profileService.logSecurityEvent(
          userId,
          'lightning_address_updated',
          true,
          { new_address: data.lightningAddress },
          req.ip || 'unknown',
          req.get('user-agent') || 'unknown'
        );
      }

      const updatedUser = await profileService.updateProfile(userId, data);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Update profile error:', err);
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: err.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update profile',
        });
      }
    }
  }
);

/**
 * @route   POST /api/profile/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = typeof req.userId === 'string' ? parseInt(req.userId, 10) : req.userId!;
      const { currentPassword, newPassword } = req.body;

      await profileService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Change password error:', err);
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: err.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to change password',
        });
      }
    }
  }
);

/**
 * @route   GET /api/profile/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get(
  '/preferences',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = typeof req.userId === 'string' ? parseInt(req.userId, 10) : req.userId!;
      const preferences = await profileService.getPreferences(userId);

      res.json({
        success: true,
        preferences,
      });
    } catch (error) {
      logger.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch preferences',
      });
    }
  }
);

/**
 * @route   PUT /api/profile/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  '/preferences',
  authenticate,
  validateBody(updatePreferencesSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = typeof req.userId === 'string' ? parseInt(req.userId, 10) : req.userId!;
      const preferences = req.body;

      const updated = await profileService.updatePreferences(userId, preferences);

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        preferences: updated,
      });
    } catch (error) {
      logger.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences',
      });
    }
  }
);

/**
 * @route   POST /api/profile/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post(
  '/avatar',
  authenticate,
  validateBody(uploadAvatarSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = typeof req.userId === 'string' ? parseInt(req.userId, 10) : req.userId!;
      const { fileName, fileSize, mimeType, storagePath } = req.body;

      const avatar = await profileService.uploadAvatar(userId, {
        fileName,
        fileSize,
        mimeType,
        storagePath,
      });

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        avatar,
      });
    } catch (error) {
      logger.error('Upload avatar error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload avatar',
      });
    }
  }
);

/**
 * @route   GET /api/profile/security-log
 * @desc    Get security audit log
 * @access  Private
 */
router.get(
  '/security-log',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = typeof req.userId === 'string' ? parseInt(req.userId, 10) : req.userId!;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;

      const logs = await profileService.getSecurityLog(userId, limit);

      res.json({
        success: true,
        logs,
      });
    } catch (error) {
      logger.error('Get security log error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch security log',
      });
    }
  }
);

export default router;
