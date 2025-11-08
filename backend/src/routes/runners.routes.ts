/**
 * Runners Routes - TypeScript (MVP)
 * Runner profile management and search
 */

import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { runnerService } from '../services/runner.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /api/v1/runners
 * Create runner profile (requires authentication)
 */
router.post('/', authenticate,
  [
    body('hourly_rate_usd').isFloat({ min: 1 }).withMessage('Hourly rate must be at least $1'),
    body('lightning_address').notEmpty().withMessage('Lightning address required'),
    body('current_lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('current_lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('service_radius_km').optional().isFloat({ min: 1, max: 100 }).withMessage('Service radius must be 1-100 km'),
    body('service_categories').optional().isArray().withMessage('Service categories must be an array')
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

      const {
        hourly_rate_usd,
        lightning_address,
        current_lat,
        current_lng,
        service_radius_km,
        service_categories
      } = req.body;

      const profileData: any = {
        user_id: req.userId!,
        hourly_rate_usd: parseFloat(hourly_rate_usd),
        lightning_address
      };

      if (current_lat) profileData.current_lat = parseFloat(current_lat);
      if (current_lng) profileData.current_lng = parseFloat(current_lng);
      if (service_radius_km) profileData.service_radius_km = parseFloat(service_radius_km);
      if (service_categories) profileData.service_categories = service_categories;

      const profile = await runnerService.createRunnerProfile(profileData);

      res.status(201).json({
        success: true,
        message: 'Runner profile created successfully',
        profile
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Create runner profile error:', err);
      
      if (err.message.includes('already has')) {
        res.status(409).json({ 
          success: false,
          error: err.message 
        });
        return;
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to create runner profile',
        message: err.message 
      });
    }
  }
);

/**
 * GET /api/v1/runners/search
 * Search nearby runners
 */
router.get('/search', authenticate,
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    query('radius_km').optional().isFloat({ min: 1, max: 100 }).withMessage('Radius must be 1-100 km'),
    query('category').optional().isString().withMessage('Category must be a string'),
    query('available_only').optional().isBoolean().withMessage('Available only must be boolean'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
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

      const { lat, lng, radius_km, category, available_only, limit } = req.query;

      const queryParams: any = {
        lat: parseFloat(lat as string),
        lng: parseFloat(lng as string),
        available_only: available_only === 'true'
      };
      
      if (radius_km) queryParams.radius_km = parseFloat(radius_km as string);
      if (category) queryParams.category = category as string;
      if (limit) queryParams.limit = parseInt(limit as string);

      const runners = await runnerService.searchNearbyRunners(queryParams);

      res.json({
        success: true,
        count: runners.length,
        runners
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Search runners error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to search runners',
        message: err.message 
      });
    }
  }
);

/**
 * GET /api/v1/runners/me
 * Get current user's runner profile
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const profile = await runnerService.getRunnerProfileByUserId(req.userId!);

    if (!profile) {
      res.status(404).json({ 
        success: false,
        error: 'Runner profile not found' 
      });
      return;
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get runner profile error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch runner profile',
      message: err.message 
    });
  }
});

/**
 * GET /api/v1/runners/:id
 * Get runner profile by ID
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const profile = await runnerService.getRunnerProfileById(id);

    if (!profile) {
      res.status(404).json({ 
        success: false,
        error: 'Runner profile not found' 
      });
      return;
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get runner profile error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch runner profile',
      message: err.message 
    });
  }
});

/**
 * PATCH /api/v1/runners/:id
 * Update runner profile
 */
router.patch('/:id', authenticate,
  [
    body('hourly_rate_usd').optional().isFloat({ min: 1 }).withMessage('Hourly rate must be at least $1'),
    body('lightning_address').optional().notEmpty().withMessage('Lightning address cannot be empty'),
    body('current_lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('current_lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('service_radius_km').optional().isFloat({ min: 1, max: 100 }).withMessage('Service radius must be 1-100 km'),
    body('service_categories').optional().isArray().withMessage('Service categories must be an array'),
    body('is_available').optional().isBoolean().withMessage('Is available must be boolean')
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

      const { id } = req.params;
      const {
        hourly_rate_usd,
        lightning_address,
        current_lat,
        current_lng,
        service_radius_km,
        service_categories,
        is_available
      } = req.body;

      // Verify runner belongs to current user
      const existingProfile = await runnerService.getRunnerProfileById(id);
      if (!existingProfile) {
        res.status(404).json({ 
          success: false,
          error: 'Runner profile not found' 
        });
        return;
      }

      if (existingProfile.user_id !== req.userId) {
        res.status(403).json({ 
          success: false,
          error: 'Not authorized to update this profile' 
        });
        return;
      }

      const updateData: any = {
        runner_id: id!
      };

      if (hourly_rate_usd) updateData.hourly_rate_usd = parseFloat(hourly_rate_usd);
      if (lightning_address) updateData.lightning_address = lightning_address;
      if (current_lat) updateData.current_lat = parseFloat(current_lat);
      if (current_lng) updateData.current_lng = parseFloat(current_lng);
      if (service_radius_km) updateData.service_radius_km = parseFloat(service_radius_km);
      if (service_categories) updateData.service_categories = service_categories;
      if (is_available !== undefined) updateData.is_available = is_available;

      const profile = await runnerService.updateRunnerProfile(updateData);

      res.json({
        success: true,
        message: 'Runner profile updated successfully',
        profile
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Update runner profile error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update runner profile',
        message: err.message 
      });
    }
  }
);

/**
 * PATCH /api/v1/runners/:id/location
 * Update runner location
 */
router.patch('/:id/location', authenticate,
  [
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
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

      const { id } = req.params;
      const { lat, lng } = req.body;

      // Verify runner belongs to current user
      const existingProfile = await runnerService.getRunnerProfileById(id);
      if (!existingProfile) {
        res.status(404).json({ 
          success: false,
          error: 'Runner profile not found' 
        });
        return;
      }

      if (existingProfile.user_id !== req.userId) {
        res.status(403).json({ 
          success: false,
          error: 'Not authorized to update this profile' 
        });
        return;
      }

      await runnerService.updateRunnerLocation(id, parseFloat(lat), parseFloat(lng));

      res.json({
        success: true,
        message: 'Location updated successfully'
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Update location error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update location',
        message: err.message 
      });
    }
  }
);

/**
 * PATCH /api/v1/runners/:id/availability
 * Toggle runner availability
 */
router.patch('/:id/availability', authenticate,
  [
    body('is_available').isBoolean().withMessage('Is available must be boolean')
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

      const { id } = req.params;
      const { is_available } = req.body;

      // Verify runner belongs to current user
      const existingProfile = await runnerService.getRunnerProfileById(id);
      if (!existingProfile) {
        res.status(404).json({ 
          success: false,
          error: 'Runner profile not found' 
        });
        return;
      }

      if (existingProfile.user_id !== req.userId) {
        res.status(403).json({ 
          success: false,
          error: 'Not authorized to update this profile' 
        });
        return;
      }

      const profile = await runnerService.toggleAvailability(id, is_available);

      res.json({
        success: true,
        message: `Availability set to ${is_available ? 'available' : 'unavailable'}`,
        profile
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Toggle availability error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Failed to toggle availability',
        message: err.message 
      });
    }
  }
);

export default router;
