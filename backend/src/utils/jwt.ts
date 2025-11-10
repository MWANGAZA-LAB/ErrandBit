/**
 * JWT Utilities - TypeScript
 * Strict type-safe JWT token management for authentication
 */

import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../types/index.js';

// Enforce JWT_SECRET is set - fail fast if missing
// This prevents the application from starting with weak or missing secrets
const JWT_SECRET: string = process.env.JWT_SECRET || '';

if (!JWT_SECRET) {
  throw new Error(
    'SECURITY ERROR: JWT_SECRET environment variable must be set.\n' +
    'Generate a secure secret with: openssl rand -base64 64\n' +
    'Never use default or weak secrets in production.'
  );
}

// Validate secret strength
if (JWT_SECRET.length < 32) {
  throw new Error(
    'SECURITY ERROR: JWT_SECRET must be at least 32 characters long.\n' +
    'Current length: ' + JWT_SECRET.length + '\n' +
    'Generate a secure secret with: openssl rand -base64 64'
  );
}

const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT token for a user
 * @param payload - User data to encode in token
 * @returns Signed JWT token string
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string to verify
 * @returns Decoded payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Extract JWT token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null if not found
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1] as string;
  }
  if (parts.length === 1) {
    return parts[0] as string;
  }
  
  return null;
}
