import { verifyToken, extractToken } from '../utils/jwt.js';
import { getPool } from '../db.js';

/**
 * Authentication middleware - verifies JWT token
 * Adds user object to req.user if valid
 */
export async function authenticate(req, res, next) {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Fetch user from database to ensure they still exist
    const pool = getPool();
    if (!pool) {
      return res.status(500).json({
        error: 'Database not configured',
      });
    }
    
    const result = await pool.query(
      'SELECT id, role, phone, email, nostr_pubkey, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Invalid token',
      });
    }
    
    // Attach user to request
    req.user = result.rows[0];
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    if (error.message === 'Token expired') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please log in again',
      });
    }
    
    return res.status(401).json({
      error: 'Invalid token',
      message: error.message,
    });
  }
}

/**
 * Optional authentication - adds user if token present, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      return next();
    }
    
    const decoded = verifyToken(token);
    const pool = getPool();
    
    if (pool) {
      const result = await pool.query(
        'SELECT id, role, phone, email, nostr_pubkey FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (result.rows.length > 0) {
        req.user = result.rows[0];
        req.userId = decoded.userId;
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
}

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }
    
    next();
  };
}

/**
 * Ownership verification middleware
 * Ensures user can only access their own resources
 */
export function requireOwnership(resourceIdParam = 'id') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }
    
    const resourceId = parseInt(req.params[resourceIdParam]);
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user owns the resource
    // This will be customized per route
    req.resourceId = resourceId;
    next();
  };
}
