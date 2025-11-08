/**
 * Rate Limiting Middleware - TypeScript
 * Type-safe rate limiting configuration
 */

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests',
    message: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again in 15 minutes',
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Payment endpoint rate limiter
 * 20 requests per hour per IP
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    error: 'Too many payment requests',
    message: 'Please try again later',
  },
});

/**
 * Create endpoint rate limiter
 * 30 requests per hour per IP for resource creation
 */
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    error: 'Too many creation requests',
    message: 'Please slow down',
  },
});
