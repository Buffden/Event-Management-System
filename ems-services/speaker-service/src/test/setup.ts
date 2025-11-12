/**
 * Test Setup for Speaker Service
 */

import { beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { setupAllMocks, resetAllMocks } from './mocks-simple';

// Setup all common mocks before any tests run
setupAllMocks();

// Common Jest setup hooks shared across tests
beforeAll(async () => {
  console.log('🚀 Speaker Service test suite starting...');
  // Note: For unit tests, we don't need real database connections
  // The mocks will handle all database interactions
});

afterAll(async () => {
  console.log('✅ Speaker Service test suite completed');
  // Global cleanup
  resetAllMocks();
});

// Reduce noise from console.error in test output; override per-test if needed
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  // Reset all mocks before each test
  resetAllMocks();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

