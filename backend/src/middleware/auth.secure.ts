/**
 * Secure Authentication Middleware
 * 
 * This file contains the secure implementation of authentication middleware
 * that should replace the current open-access implementation in auth.ts
 * 
 * Key Security Features:
 * - Requires valid JWT token for all protected routes
 * - Validates user exists and is active
 * - Checks for banned accounts
 * - Implements token blacklist for logout
 * - Provides detailed security logging
 */

import type { Response, NextFunction } from 'express';
import { verifyToken, extractToken } from '../utils/jwt.js';
import { getPool } from '../db.js';
import type { AuthenticatedRequest, User, UserRole } from '../types/index.js';

// Token blacklist for logout functionality
// In production, use Redis for distributed systems
const tokenBlacklist = new Set<string>();

/**
 * Add token to blacklist (called during logout)
 */
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
  
  // Clean up expired tokens periodically
  // In production, implement TTL in Redis
}

/**
 * Check if token is blacklisted
 */
function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Secure Authentication Middleware
 * 
 * Validates JWT token and loads user data from database.
 * Rejects requests without valid authentication.
 * 
 * Usage:
 *   app.get('/api/protected', authenticate, (req, res) => {
 *     // req.user is guaranteed to exist here
 *     res.json({ userId: req.user.id });
 *   });
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Step 1: Extract token from Authorization header
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid authentication token in the Authorization header'
      });
      return;
    }
    
    // Step 2: Check if token is blacklisted (logged out)
    if (isTokenBlacklisted(token)) {
      res.status(401).json({
        error: 'Token invalidated',
        message: 'This token has been logged out. Please log in again.'
      });
      return;
    }
    
    // Step 3: Verify token signature and expiration
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token verification failed';
      res.status(401).json({
        error: 'Invalid token',
        message
      });
      return;
    }
    
    // Step 4: Load user from database
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    
    const result = await pool.query<User>(
      `SELECT 
        id, role, phone, email, nostr_pubkey, created_at,
        is_active, is_banned, last_login_at
       FROM users 
       WHERE id = $1`,
      [decoded.userId]
    );
    
    const user = result.rows[0];
    
    // Step 5: Verify user exists
    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'The authenticated user no longer exists'
      });
      return;
    }
    
    // Step 6: Check if user account is banned
    if (user.is_banned) {
      res.status(403).json({
        error: 'Account banned',
        message: 'Your account has been suspended. Contact support for assistance.'
      });
      return;
    }
    
    // Step 7: Check if user account is active
    if (!user.is_active) {
      res.status(403).json({
        error: 'Account inactive',
        message: 'Please activate your account to continue'
      });
      return;
    }
    
    // Step 8: Update last activity timestamp
    // This helps track active users and detect suspicious patterns
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Step 9: Attach user to request object
    req.user = user;
    req.userId = decoded.userId;
    
    // Continue to next middleware
    next();
  } catch (error) {
    console.error('Authentication error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication. Please try again.'
    });
  }
}

/**
 * Optional Authentication Middleware
 * 
 * Adds user information if token is present, but doesn't require it.
 * Useful for endpoints that work for both authenticated and anonymous users.
 * 
 * Usage:
 *   app.get('/api/public-data', optionalAuth, (req, res) => {
 *     // req.user may or may not exist
 *     if (req.user) {
 *       // Provide personalized response
 *     } else {
 *       // Provide generic response
 *     }
 *   });
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);
    
    // No token provided - continue without authentication
    if (!token) {
      next();
      return;
    }
    
    // Token is blacklisted - continue without authentication
    if (isTokenBlacklisted(token)) {
      next();
      return;
    }
    
    // Verify token
    const decoded = verifyToken(token);
    const pool = getPool();
    
    if (pool) {
      const result = await pool.query<User>(
        `SELECT id, role, phone, email, nostr_pubkey, created_at
         FROM users 
         WHERE id = $1 AND is_active = true AND is_banned = false`,
        [decoded.userId]
      );
      
      const user = result.rows[0];
      if (user) {
        req.user = user;
        req.userId = decoded.userId;
      }
    }
    
    next();
  } catch {
    // Ignore authentication errors for optional auth
    // Continue without user information
    next();
  }
}

/**
 * Role-Based Authorization Middleware
 * 
 * Restricts access to routes based on user roles.
 * Must be used after authenticate() middleware.
 * 
 * Usage:
 *   app.delete('/api/admin/users/:id', 
 *     authenticate, 
 *     authorize('admin'), 
 *     (req, res) => {
 *       // Only admin users can access this
 *     }
 *   );
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // User must be authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
      return;
    }
    
    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      // Log authorization failure for security monitoring
      console.warn('Authorization failure:', {
        userId: req.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
      return;
    }
    
    next();
  };
}

/**
 * Resource Ownership Verification Middleware
 * 
 * Ensures users can only access their own resources.
 * Admins can access any resource.
 * 
 * Usage:
 *   app.get('/api/jobs/:id', 
 *     authenticate, 
 *     requireOwnership('id', 'jobs', 'client_id'),
 *     (req, res) => {
 *       // User can only access their own jobs
 *     }
 *   );
 */
export function requireOwnership(
  resourceIdParam: string = 'id',
  tableName: string,
  ownerColumn: string = 'user_id'
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User must be authenticated
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required'
        });
        return;
      }
      
      // Admins can access any resource
      if (req.user.role === 'admin') {
        next();
        return;
      }
      
      // Get resource ID from request params
      const resourceId = parseInt(req.params[resourceIdParam] as string, 10);
      
      if (isNaN(resourceId)) {
        res.status(400).json({
          error: 'Invalid resource ID'
        });
        return;
      }
      
      // Check ownership in database
      const pool = getPool();
      if (!pool) {
        throw new Error('Database connection not available');
      }
      
      const result = await pool.query(
        `SELECT ${ownerColumn} FROM ${tableName} WHERE id = $1`,
        [resourceId]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({
          error: 'Resource not found'
        });
        return;
      }
      
      const ownerId = result.rows[0][ownerColumn];
      
      // Verify user owns the resource
      if (ownerId !== req.userId) {
        // Log unauthorized access attempt
        console.warn('Unauthorized resource access attempt:', {
          userId: req.userId,
          resourceId,
          ownerId,
          tableName,
          path: req.path,
          ip: req.ip
        });
        
        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Ownership verification error:', error);
      res.status(500).json({
        error: 'Authorization failed',
        message: 'An error occurred while verifying resource ownership'
      });
    }
  };
}

/**
 * Rate Limiting Middleware
 * 
 * Prevents brute force attacks and API abuse.
 * Should be applied to authentication endpoints.
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = (req as any).ip || 'unknown';
    const now = Date.now();
    
    // Get or create request tracking
    let tracking = requests.get(identifier);
    
    // Reset if window expired
    if (!tracking || now > tracking.resetTime) {
      tracking = {
        count: 0,
        resetTime: now + options.windowMs
      };
      requests.set(identifier, tracking);
    }
    
    // Increment request count
    tracking.count++;
    
    // Check if limit exceeded
    if (tracking.count > options.maxRequests) {
      const retryAfter = Math.ceil((tracking.resetTime - now) / 1000);
      
      res.status(429).json({
        error: 'Too many requests',
        message: options.message || 'Please try again later',
        retryAfter
      });
      return;
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', options.maxRequests - tracking.count);
    res.setHeader('X-RateLimit-Reset', new Date(tracking.resetTime).toISOString());
    
    next();
  };
}
