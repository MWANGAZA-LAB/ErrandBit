/**
 * Centralized Error Handler Middleware
 * 
 * This middleware catches all errors thrown in the application and
 * formats them into consistent, safe responses for the client.
 * 
 * Key features:
 * - Distinguishes between operational and programming errors
 * - Logs full error details internally
 * - Sends sanitized error messages to clients
 * - Prevents information leakage in production
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import type { AuthenticatedRequest } from '../types/index.js';

/**
 * Error Handler Middleware
 * 
 * This should be the last middleware in the application.
 * It catches all errors and formats appropriate responses.
 * 
 * Usage in server.ts:
 *   app.use(errorHandler);
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log full error details for debugging and monitoring
  // In production, this should go to a logging service (e.g., Winston, Sentry)
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: sanitizeBody(req.body),
      userId: (req as AuthenticatedRequest).userId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
  };
  
  // Log based on error severity
  if (err instanceof AppError && err.isOperational) {
    // Operational errors are expected (validation, not found, etc.)
    console.warn('Operational error:', errorLog);
  } else {
    // Programming errors are unexpected bugs
    console.error('Programming error:', errorLog);
  }
  
  // Determine if error is operational (expected) or programming error (bug)
  const isOperational = err instanceof AppError && err.isOperational;
  
  // Send appropriate response to client
  if (isOperational) {
    // For operational errors, send the error message
    // These are safe to expose to the client
    const appError = err as AppError;
    
    res.status(appError.statusCode).json({
      error: appError.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: appError.stack,
        details: (appError as any).details
      })
    });
  } else {
    // For programming errors, send generic message
    // Never expose internal error details to clients in production
    if (process.env.NODE_ENV === 'development') {
      // In development, show full error for debugging
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        stack: err.stack
      });
    } else {
      // In production, hide all error details
      res.status(500).json({
        error: 'An unexpected error occurred',
        message: 'Please try again later or contact support if the problem persists'
      });
    }
  }
}

/**
 * Async Error Wrapper
 * 
 * Wraps async route handlers to catch promise rejections.
 * Without this, unhandled promise rejections won't be caught by error middleware.
 * 
 * Usage:
 *   app.get('/api/jobs', asyncHandler(async (req, res) => {
 *     const jobs = await jobService.getJobs();
 *     res.json(jobs);
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not Found Handler
 * 
 * Catches requests to undefined routes.
 * Should be placed after all route definitions but before error handler.
 * 
 * Usage in server.ts:
 *   app.use(notFoundHandler);
 *   app.use(errorHandler);
 */
export function notFoundHandler(
  req: Request,
  res: Response
): void {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path
  });
}

/**
 * Sanitize Request Body
 * 
 * Removes sensitive fields from request body before logging.
 * Prevents passwords, tokens, etc. from appearing in logs.
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'refreshToken',
    'creditCard',
    'cvv',
    'ssn'
  ];
  
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Unhandled Rejection Handler
 * 
 * Catches unhandled promise rejections that escape the application.
 * This is a safety net - ideally all promises should be properly handled.
 */
export function setupUnhandledRejectionHandler(): void {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Promise Rejection:', {
      timestamp: new Date().toISOString(),
      reason: reason instanceof Error ? {
        message: reason.message,
        stack: reason.stack
      } : reason,
      promise
    });
    
    // In production, you might want to:
    // 1. Log to monitoring service (Sentry, DataDog, etc.)
    // 2. Send alert to on-call engineer
    // 3. Gracefully shutdown if critical
  });
}

/**
 * Uncaught Exception Handler
 * 
 * Catches uncaught exceptions that escape the application.
 * These are serious errors that indicate bugs.
 * The application should be restarted after logging.
 */
export function setupUncaughtExceptionHandler(): void {
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    
    // Log to monitoring service
    // Send critical alert
    
    // Exit process - uncaught exceptions leave app in undefined state
    // Process manager (PM2, Docker, Kubernetes) should restart the app
    console.error('Application will exit due to uncaught exception');
    process.exit(1);
  });
}
