/**
 * Centralized Error Handler Middleware
 * Handles all errors thrown in the application
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../../core/errors/AppError.js';
import { HTTP_STATUS } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Main error handler middleware
 * Must be registered after all routes
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Operational errors (expected)
  if (err instanceof AppError && err.isOperational) {
    logger.warn('Operational error:', {
      code: err.code,
      message: err.message,
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
    });

    const response: any = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Add validation errors if present
    if (err instanceof ValidationError && err.errors) {
      response.error.details = err.errors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Programming errors (unexpected)
  logger.error('Unexpected error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  res.status(HTTP_STATUS.INTERNAL_ERROR).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
};

/**
 * 404 Not Found handler
 * Must be registered after all routes but before error handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response
): void => {
  logger.warn('Route not found:', {
    method: req.method,
    path: req.path,
  });

  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};
