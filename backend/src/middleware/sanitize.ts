/**
 * Input Sanitization Middleware - TypeScript
 * Strict type-safe XSS prevention and error sanitization
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Sanitize error messages for production
 * Prevents leaking sensitive information in error responses
 */
export function sanitizeError(
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log full error for debugging
  console.error('Error:', {
    message: err.message,
    stack: isDevelopment ? err.stack : undefined,
    url: req.url,
    method: req.method,
    userId: (req as any).userId,
  });
  
  const status = err.status || err.statusCode || 500;
  
  // In production, sanitize error messages
  let message = err.message || 'Internal server error';
  
  if (!isDevelopment && status === 500) {
    message = 'An unexpected error occurred';
  }
  
  res.status(status).json({
    error: message,
    status,
    // Only include stack trace in development
    ...(isDevelopment && { stack: err.stack }),
  });
}

/**
 * Sanitize user input to prevent XSS
 * @param input - User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Middleware to sanitize request body
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Don't sanitize certain fields that need special characters
        const skipFields = ['password', 'bolt11', 'preimage', 'payment_hash', 'nostr_signature'];
        if (!skipFields.includes(key)) {
          req.body[key] = sanitizeInput(req.body[key]);
        }
      }
    });
  }
  next();
}
