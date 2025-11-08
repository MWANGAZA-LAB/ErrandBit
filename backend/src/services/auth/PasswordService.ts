/**
 * Password Service
 * Handles password hashing and verification
 */

import bcrypt from 'bcrypt';
import { AUTH_CONSTANTS } from '../../config/constants.js';

export class PasswordService {
  /**
   * Hash a password
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, AUTH_CONSTANTS.PASSWORD.SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < AUTH_CONSTANTS.PASSWORD.MIN_LENGTH) {
      errors.push(`Password must be at least ${AUTH_CONSTANTS.PASSWORD.MIN_LENGTH} characters`);
    }

    if (password.length > AUTH_CONSTANTS.PASSWORD.MAX_LENGTH) {
      errors.push(`Password must be at most ${AUTH_CONSTANTS.PASSWORD.MAX_LENGTH} characters`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
