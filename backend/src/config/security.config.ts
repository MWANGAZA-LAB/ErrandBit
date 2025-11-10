/**
 * Security Configuration
 * 
 * Centralized security settings for the application.
 * Configures helmet, CORS, rate limiting, and other security features.
 */

import type { CorsOptions } from 'cors';
import type { Options as RateLimitOptions } from 'express-rate-limit';

/**
 * Helmet Configuration
 * 
 * Security headers configuration using Helmet.js
 * Protects against common web vulnerabilities.
 */
export const helmetConfig = {
  // Content Security Policy - prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  
  // HTTP Strict Transport Security - forces HTTPS
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },
  
  // Prevent MIME-type sniffing
  noSniff: true,
  
  // XSS Protection (legacy browsers)
  xssFilter: true,
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
};

/**
 * CORS Configuration
 * 
 * Cross-Origin Resource Sharing settings.
 * Controls which domains can access the API.
 */
export const corsConfig: CorsOptions = {
  // Allow requests from frontend origin
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env['FRONTEND_URL'] || 'http://localhost:5173',
      'http://localhost:3000', // Alternative dev port
      'http://localhost:5173', // Vite default
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token'
  ],
  
  // Headers exposed to the client
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  
  // Preflight cache duration (10 minutes)
  maxAge: 600
};

/**
 * Rate Limiting Configuration
 * 
 * Prevents abuse and brute force attacks.
 */

// Global API rate limit
export const globalRateLimitConfig: Partial<RateLimitOptions> = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

// Strict rate limit for authentication endpoints
export const authRateLimitConfig: Partial<RateLimitOptions> = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false
};

// Rate limit for creating resources
export const createRateLimitConfig: Partial<RateLimitOptions> = {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 creates per hour
  message: 'Too many resources created, please try again later',
  standardHeaders: true,
  legacyHeaders: false
};

/**
 * Request Size Limits
 * 
 * Prevents DoS attacks through large payloads.
 */
export const requestLimits = {
  // JSON body size limit
  jsonLimit: '10kb',
  
  // URL-encoded body size limit
  urlencodedLimit: '10kb',
  
  // Maximum URL-encoded parameters
  parameterLimit: 100,
  
  // File upload size limit
  fileUploadLimit: 5 * 1024 * 1024, // 5MB
  
  // Maximum number of files
  maxFiles: 5
};

/**
 * Session Configuration
 * 
 * Settings for session management (if using sessions).
 */
export const sessionConfig = {
  secret: process.env['SESSION_SECRET'] || 'change-this-secret-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent JavaScript access
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' as const // CSRF protection
  }
};

/**
 * JWT Configuration
 * 
 * Settings for JSON Web Tokens.
 */
export const jwtConfig = {
  // Access token expiration
  accessTokenExpiry: process.env['JWT_EXPIRES_IN'] || '15m',
  
  // Refresh token expiration
  refreshTokenExpiry: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
  
  // Token issuer
  issuer: 'errandbit-api',
  
  // Token audience
  audience: 'errandbit-client'
};

/**
 * Password Policy
 * 
 * Requirements for user passwords.
 */
export const passwordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  preventCommon: true, // Prevent common passwords
  preventUserInfo: true // Prevent using username, email in password
};

/**
 * Account Lockout Policy
 * 
 * Protection against brute force attacks.
 */
export const accountLockoutPolicy = {
  maxFailedAttempts: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
  resetOnSuccess: true
};

/**
 * Security Headers
 * 
 * Additional custom security headers.
 */
export const customSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'geolocation=(self), microphone=(), camera=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

/**
 * Trusted Proxies
 * 
 * Configure trusted proxy servers (for rate limiting, IP detection).
 */
export const trustedProxies = process.env['TRUSTED_PROXIES']
  ? process.env['TRUSTED_PROXIES'].split(',')
  : ['loopback', 'linklocal', 'uniquelocal'];

/**
 * Security Validation
 * 
 * Validates that all required security configurations are set.
 */
export function validateSecurityConfig(): void {
  const errors: string[] = [];
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be set and at least 32 characters long');
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env['FRONTEND_URL']) {
      errors.push('FRONTEND_URL must be set in production');
    }
    
    if (sessionConfig.secret === 'change-this-secret-in-production') {
      errors.push('SESSION_SECRET must be changed in production');
    }
  }
  
  if (errors.length > 0) {
    console.error('Security configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid security configuration');
  }
}
