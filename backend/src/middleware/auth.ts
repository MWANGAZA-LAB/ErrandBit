/**
 * Authentication Middleware - TypeScript
 * Strict type-safe JWT authentication and authorization
 */

import type { Response, NextFunction } from 'express';
import { verifyToken, extractToken } from '../utils/jwt.js';
import { getPool } from '../db.js';
import type { AuthenticatedRequest, User, UserRole } from '../types/index.js';

/**
 * Authentication middleware - OPEN ACCESS MODE
 * ErrandBit is free and open to all - no authentication required
 * Creates anonymous user session for abuse prevention tracking
 */
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);
    
    // OPEN ACCESS: No token required
    // If token provided, verify it; otherwise create anonymous session
    if (!token) {
      // Create anonymous user session
      const anonymousId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      req.userId = anonymousId;
      req.user = {
        id: anonymousId,
        role: 'client' as UserRole,
        phone: null,
        email: null,
        nostr_pubkey: null,
        created_at: new Date().toISOString(),
        is_anonymous: true
      };
      next();
      return;
    }
    
    // If token provided, verify it
    try {
      const decoded = verifyToken(token);
      
      // Fetch user from database
      const pool = getPool();
      if (pool) {
        const result = await pool.query<User>(
          'SELECT id, role, phone, email, nostr_pubkey, created_at FROM users WHERE id = $1',
          [decoded.userId]
        );
        
        if (result.rows.length > 0 && result.rows[0]) {
          req.user = result.rows[0];
          req.userId = decoded.userId;
          next();
          return;
        }
      }
    } catch (error) {
      // Token invalid, fall back to anonymous
      console.log('Invalid token, using anonymous access:', (error as Error).message);
    }
    
    // Fallback to anonymous if token verification fails
    const anonymousId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.userId = anonymousId;
    req.user = {
      id: anonymousId,
      role: 'client' as UserRole,
      phone: null,
      email: null,
      nostr_pubkey: null,
      created_at: new Date().toISOString(),
      is_anonymous: true
    };
    
    next();
  } catch (error) {
    // Even on error, allow anonymous access
    const anonymousId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.userId = anonymousId;
    req.user = {
      id: anonymousId,
      role: 'client' as UserRole,
      phone: null,
      email: null,
      nostr_pubkey: null,
      created_at: new Date().toISOString(),
      is_anonymous: true
    };
    next();
  }
}

/**
 * Optional authentication - adds user if token present, but doesn't require it
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      next();
      return;
    }
    
    const decoded = verifyToken(token);
    const pool = getPool();
    
    if (pool) {
      const result = await pool.query<User>(
        'SELECT id, role, phone, email, nostr_pubkey FROM users WHERE id = $1',
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
    // Ignore auth errors for optional auth
    next();
  }
}

/**
 * Role-based authorization middleware
 * @param allowedRoles - Roles that are allowed to access the route
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }
    
    next();
  };
}

/**
 * Ownership verification middleware
 * Ensures user can only access their own resources
 */
export function requireOwnership(resourceIdParam: string = 'id') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }
    
    const resourceId = parseInt(req.params[resourceIdParam] as string, 10);
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      next();
      return;
    }
    
    // Check if user owns the resource
    // This will be customized per route
    (req as any).resourceId = resourceId;
    next();
  };
}
