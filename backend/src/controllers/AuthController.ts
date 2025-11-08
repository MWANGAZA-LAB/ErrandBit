/**
 * Auth Controller
 * HTTP layer for authentication endpoints
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/auth/AuthService.js';
import { HTTP_STATUS } from '../config/constants.js';
import { AuthenticatedRequest } from '../types/index.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register new user
   * POST /auth/register
   */
  register = async (req: Request, res: Response): Promise<void> => {
    const { username, password, display_name } = req.body;

    const result = await this.authService.register({
      username,
      password,
      displayName: display_name,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  };

  /**
   * Login user
   * POST /auth/login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;

    const result = await this.authService.login({
      username,
      password,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  };

  /**
   * Get current user profile
   * GET /auth/me
   */
  getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = typeof req.userId === 'number' ? req.userId : parseInt(String(req.userId), 10);
    const user = await this.authService.getProfile(userId);

    res.json({
      success: true,
      data: { user },
    });
  };

  /**
   * Update user profile
   * PUT /auth/me
   */
  updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { display_name, password } = req.body;
    const userId = typeof req.userId === 'number' ? req.userId : parseInt(String(req.userId), 10);

    const user = await this.authService.updateProfile(userId, {
      displayName: display_name,
      password,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  };
}
