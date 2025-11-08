/**
 * Base Application Error
 * All custom errors should extend this class
 */

import { HTTP_STATUS, ERROR_CODES } from '../../config/constants.js';

export abstract class AppError extends Error {
  public readonly isOperational: boolean;

  constructor(
    public override readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Validation Error - 400
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    code: string = ERROR_CODES.VALIDATION_ERROR,
    public readonly errors?: any[]
  ) {
    super(message, HTTP_STATUS.BAD_REQUEST, code);
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

/**
 * Authentication Error - 401
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    code: string = ERROR_CODES.INVALID_CREDENTIALS
  ) {
    super(message, HTTP_STATUS.UNAUTHORIZED, code);
  }
}

/**
 * Authorization Error - 403
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access denied',
    code: string = ERROR_CODES.UNAUTHORIZED
  ) {
    super(message, HTTP_STATUS.FORBIDDEN, code);
  }
}

/**
 * Not Found Error - 404
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    code: string = ERROR_CODES.NOT_FOUND
  ) {
    super(message, HTTP_STATUS.NOT_FOUND, code);
  }
}

/**
 * Conflict Error - 409
 */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    code: string = ERROR_CODES.CONFLICT
  ) {
    super(message, HTTP_STATUS.CONFLICT, code);
  }
}

/**
 * Database Error - 500
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    code: string = ERROR_CODES.DATABASE_ERROR,
    public readonly originalError?: Error
  ) {
    super(message, HTTP_STATUS.INTERNAL_ERROR, code);
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Service Unavailable Error - 503
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = 'Service temporarily unavailable',
    code: string = ERROR_CODES.SERVICE_UNAVAILABLE
  ) {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, code);
  }
}
