/**
 * Jest Test Setup
 * Global setup for all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-key-for-testing-only';
process.env.DATABASE_URL = process.env['TEST_DATABASE_URL'] || 'postgresql://localhost:5432/errandbit_test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for database operations
jest.setTimeout(10000);
