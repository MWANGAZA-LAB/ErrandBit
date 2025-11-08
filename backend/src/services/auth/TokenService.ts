/**
 * Token Service
 * Handles JWT token generation and verification
 */

import { generateToken, verifyToken } from '../../utils/jwt.js';
import { JWTPayload } from '../../types/index.js';
import { AuthenticationError } from '../../core/errors/AppError.js';

export class TokenService {
  /**
   * Generate a JWT token
   */
  generate(payload: JWTPayload): string {
    return generateToken(payload);
  }

  /**
   * Verify and decode a JWT token
   */
  verify(token: string): JWTPayload {
    try {
      return verifyToken(token);
    } catch (error) {
      throw new AuthenticationError(
        'Invalid or expired token',
        'TOKEN_INVALID'
      );
    }
  }
}
