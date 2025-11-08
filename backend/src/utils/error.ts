/**
 * Error Utilities - TypeScript
 * Type-safe error handling for Express
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * 404 Not Found handler
 */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  next(error);
}

/**
 * Generic error handler (deprecated - use sanitizeError from middleware)
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
}
