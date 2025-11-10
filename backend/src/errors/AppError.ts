/**
 * Application Error Classes
 * 
 * Defines custom error classes for different types of application errors.
 * These errors are "operational" errors - expected errors that can occur
 * during normal application operation (validation failures, not found, etc.)
 * as opposed to "programming" errors (bugs, null references, etc.)
 */

/**
 * Base Application Error
 * 
 * All custom application errors extend from this class.
 * The isOperational flag distinguishes between expected errors
 * and unexpected programming errors.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    
    // Maintains proper stack trace for where error was thrown
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (400 Bad Request)
 * 
 * Used when user input fails validation.
 * Example: Missing required fields, invalid format, out of range values
 */
export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

/**
 * Unauthorized Error (401 Unauthorized)
 * 
 * Used when authentication is required but not provided or invalid.
 * Example: Missing token, expired token, invalid credentials
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error (403 Forbidden)
 * 
 * Used when user is authenticated but doesn't have permission.
 * Example: Trying to access another user's resources, insufficient role
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to access this resource') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not Found Error (404 Not Found)
 * 
 * Used when a requested resource doesn't exist.
 * Example: Job ID not found, user not found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error (409 Conflict)
 * 
 * Used when request conflicts with current state.
 * Example: Duplicate entry, resource already exists
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

/**
 * Rate Limit Error (429 Too Many Requests)
 * 
 * Used when user exceeds rate limits.
 * Example: Too many login attempts, API abuse
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Too many requests',
    public retryAfter?: number
  ) {
    super(429, message);
    this.name = 'RateLimitError';
  }
}

/**
 * Internal Server Error (500 Internal Server Error)
 * 
 * Used for unexpected server errors.
 * This should be used sparingly - most errors should be more specific.
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'An unexpected error occurred') {
    super(500, message, false); // Not operational - indicates a bug
    this.name = 'InternalServerError';
  }
}
