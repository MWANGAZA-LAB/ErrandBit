/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors and pass to error middleware
 */

import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wraps async functions to automatically catch errors
 * @param fn Async function to wrap
 * @returns Wrapped function that catches errors
 */
export const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
