/**
 * Auth Routes (Refactored)
 * Clean architecture with service layer and proper error handling
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/AuthController.js';
import { AuthService } from '../services/auth/AuthService.js';
import { PasswordService } from '../services/auth/PasswordService.js';
import { TokenService } from '../services/auth/TokenService.js';
import { UserRepository } from '../database/repositories/UserRepository.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error/asyncHandler.js';
import { validateRequest } from '../middleware/validation/validateRequest.js';
import { AUTH_CONSTANTS } from '../config/constants.js';

const router = Router();

// Initialize dependencies
const userRepository = new UserRepository();
const passwordService = new PasswordService();
const tokenService = new TokenService();
const authService = new AuthService(userRepository, passwordService, tokenService);
const authController = new AuthController(authService);

/**
 * @route   POST /auth-simple/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: AUTH_CONSTANTS.USERNAME.MIN_LENGTH, max: AUTH_CONSTANTS.USERNAME.MAX_LENGTH })
      .withMessage(`Username must be between ${AUTH_CONSTANTS.USERNAME.MIN_LENGTH} and ${AUTH_CONSTANTS.USERNAME.MAX_LENGTH} characters`)
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('password')
      .isLength({ min: AUTH_CONSTANTS.PASSWORD.MIN_LENGTH, max: AUTH_CONSTANTS.PASSWORD.MAX_LENGTH })
      .withMessage(`Password must be between ${AUTH_CONSTANTS.PASSWORD.MIN_LENGTH} and ${AUTH_CONSTANTS.PASSWORD.MAX_LENGTH} characters`),
    body('display_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Display name must be between 1 and 100 characters'),
  ],
  validateRequest,
  asyncHandler(authController.register)
);

/**
 * @route   POST /auth-simple/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validateRequest,
  asyncHandler(authController.login)
);

/**
 * @route   GET /auth-simple/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(authController.getProfile)
);

/**
 * @route   PUT /auth-simple/me
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/me',
  authenticate,
  [
    body('display_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Display name must be between 1 and 100 characters'),
    body('password')
      .optional()
      .isLength({ min: AUTH_CONSTANTS.PASSWORD.MIN_LENGTH, max: AUTH_CONSTANTS.PASSWORD.MAX_LENGTH })
      .withMessage(`Password must be between ${AUTH_CONSTANTS.PASSWORD.MIN_LENGTH} and ${AUTH_CONSTANTS.PASSWORD.MAX_LENGTH} characters`),
  ],
  validateRequest,
  asyncHandler(authController.updateProfile)
);

export default router;
