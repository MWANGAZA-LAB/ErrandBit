/**
 * Abuse Prevention Middleware
 * Protects ErrandBit from spam and malicious activity
 * While keeping the platform free and open to all
 */

import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import NodeCache from 'node-cache';

// Rate limiting cache (TTL: 1 hour)
const rateLimitCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// Spam detection cache (TTL: 24 hours)
const spamCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message: string;
}

/**
 * IP-based rate limiting
 * Prevents abuse while allowing anonymous access
 */
export function ipRateLimit(config: RateLimitConfig) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `rate:${ip}`;
    
    const requests = rateLimitCache.get<number>(key) || 0;
    
    if (requests >= config.maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        message: config.message,
        retryAfter: Math.ceil(rateLimitCache.getTtl(key)! / 1000)
      });
      return;
    }
    
    rateLimitCache.set(key, requests + 1);
    next();
  };
}

/**
 * Content spam detection
 * Prevents duplicate/spam content
 */
export function contentSpamPrevention(field: string = 'description') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const content = req.body[field];
    
    if (!content) {
      next();
      return;
    }
    
    // Generate content hash
    const contentHash = hashContent(content);
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `spam:${ip}:${contentHash}`;
    
    const spamCount = spamCache.get<number>(key) || 0;
    
    // Allow up to 3 identical posts per IP per day
    if (spamCount >= 3) {
      res.status(429).json({
        error: 'Duplicate content detected',
        message: 'Please avoid posting identical content multiple times. Try again tomorrow.'
      });
      return;
    }
    
    spamCache.set(key, spamCount + 1);
    next();
  };
}

/**
 * Job creation limits
 * Prevents job spam while keeping platform open
 */
export function jobCreationLimit() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `jobs:${ip}`;
    
    const jobCount = rateLimitCache.get<number>(key) || 0;
    
    // Max 10 jobs per hour per IP
    if (jobCount >= 10) {
      res.status(429).json({
        error: 'Job creation limit reached',
        message: 'You can create up to 10 jobs per hour. Please try again later.',
        retryAfter: Math.ceil(rateLimitCache.getTtl(key)! / 1000)
      });
      return;
    }
    
    rateLimitCache.set(key, jobCount + 1);
    next();
  };
}

/**
 * Payment amount validation
 * Prevents unrealistic payment amounts
 */
export function validatePaymentAmount() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const amount = req.body.payment_amount_usd || req.body.amount;
    
    if (!amount) {
      next();
      return;
    }
    
    const numAmount = parseFloat(amount);
    
    // Minimum: $1, Maximum: $10,000
    if (numAmount < 1 || numAmount > 10000) {
      res.status(400).json({
        error: 'Invalid payment amount',
        message: 'Payment amount must be between $1 and $10,000',
        min: 1,
        max: 10000
      });
      return;
    }
    
    next();
  };
}

/**
 * Input sanitization
 * Prevents XSS and injection attacks
 */
export function sanitizeInput() {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    // Sanitize all string inputs
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          // Remove dangerous characters
          req.body[key] = req.body[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
        }
      });
    }
    
    next();
  };
}

/**
 * Geolocation validation
 * Ensures valid coordinates
 */
export function validateGeolocation() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const { latitude, longitude, pickup_lat, pickup_lng, delivery_lat, delivery_lng } = req.body;
    
    const coords = [
      { lat: latitude, lng: longitude },
      { lat: pickup_lat, lng: pickup_lng },
      { lat: delivery_lat, lng: delivery_lng }
    ].filter(c => c.lat !== undefined && c.lng !== undefined);
    
    for (const coord of coords) {
      if (coord.lat < -90 || coord.lat > 90) {
        res.status(400).json({
          error: 'Invalid latitude',
          message: 'Latitude must be between -90 and 90'
        });
        return;
      }
      
      if (coord.lng < -180 || coord.lng > 180) {
        res.status(400).json({
          error: 'Invalid longitude',
          message: 'Longitude must be between -180 and 180'
        });
        return;
      }
    }
    
    next();
  };
}

/**
 * Hash content for spam detection
 */
function hashContent(content: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Suspicious activity detection
 * Flags potential abuse patterns
 */
export function detectSuspiciousActivity() {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Flag suspicious patterns
    const suspicious = [
      !userAgent || userAgent === 'unknown',
      userAgent.includes('bot') && !userAgent.includes('googlebot'),
      ip === 'unknown'
    ];
    
    const suspiciousCount = suspicious.filter(Boolean).length;
    
    if (suspiciousCount >= 2) {
      console.warn(`⚠️  Suspicious activity detected from IP: ${ip}`);
      // Log but don't block - keep platform open
    }
    
    next();
  };
}

/**
 * Comprehensive abuse prevention suite
 * Apply to all routes
 */
export function abusePreventionSuite() {
  return [
    sanitizeInput(),
    detectSuspiciousActivity(),
    ipRateLimit({
      windowMs: 60000, // 1 minute
      maxRequests: 60, // 60 requests per minute
      message: 'Too many requests. Please slow down.'
    })
  ];
}

export default {
  ipRateLimit,
  contentSpamPrevention,
  jobCreationLimit,
  validatePaymentAmount,
  sanitizeInput,
  validateGeolocation,
  detectSuspiciousActivity,
  abusePreventionSuite
};
