/**
 * Application Constants
 * Centralized configuration for magic numbers and hardcoded values
 */

export const AUTH_CONSTANTS = {
  PASSWORD: {
    SALT_ROUNDS: 10,
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  DISPLAY_NAME: {
    MAX_LENGTH: 100,
  },
  TOKEN: {
    EXPIRES_IN: '7d',
    REFRESH_EXPIRES_IN: '30d',
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export const DATABASE_CONSTANTS = {
  POOL: {
    MAX_CONNECTIONS: 20,
    IDLE_TIMEOUT_MS: 30000,
    CONNECTION_TIMEOUT_MS: 2000,
  },
  QUERY: {
    TIMEOUT_MS: 5000,
  },
} as const;

export const RATE_LIMIT = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 5,
  },
  PAYMENT: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 10,
  },
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const JOB_CONSTANTS = {
  TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200,
  },
  DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 2000,
  },
  BUDGET: {
    MIN_USD: 1,
    MAX_USD: 10000,
  },
  SEARCH: {
    DEFAULT_RADIUS_KM: 10,
    MAX_RADIUS_KM: 100,
  },
  DEADLINE: {
    MIN_HOURS_FUTURE: 1,
    MAX_DAYS_FUTURE: 365,
  },
} as const;

export const RUNNER_CONSTANTS = {
  DISPLAY_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  BIO: {
    MAX_LENGTH: 500,
  },
  HOURLY_RATE: {
    MIN_USD: 5,
    MAX_USD: 500,
  },
  SERVICE_RADIUS: {
    DEFAULT_KM: 10,
    MAX_KM: 100,
  },
} as const;

export const REVIEW_CONSTANTS = {
  RATING: {
    MIN: 1,
    MAX: 5,
  },
  COMMENT: {
    MAX_LENGTH: 1000,
  },
} as const;

export const VALIDATION_CONSTANTS = {
  RATING: {
    MIN: 1,
    MAX: 5,
  },
  TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200,
  },
  DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 2000,
  },
  BIO: {
    MAX_LENGTH: 500,
  },
  COMMENT: {
    MAX_LENGTH: 1000,
  },
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    DEFAULT_OFFSET: 0,
    MAX_LIMIT: 100,
  },
} as const;

export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;
