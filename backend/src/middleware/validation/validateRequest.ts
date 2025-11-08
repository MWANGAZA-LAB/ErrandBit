/**
 * Validation Middleware
 * Reusable middleware for express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ValidationError } from '../../core/errors/AppError.js';

/**
 * Validates request using express-validator rules
 * Throws ValidationError if validation fails
 */
export const validateRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    throw new ValidationError(
      'Validation failed',
      'VALIDATION_ERROR',
      errors.array()
    );
  }
  
  next();
};
