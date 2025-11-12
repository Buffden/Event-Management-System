/**
 * Test Setup for Notification Service
 *
 * This file contains common test setup, mocks, and utilities
 * that are shared across all Notification Service tests.
 */

import { beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { setupAllMocks, resetAllMocks } from './mocks-simple';

// Setup all common mocks before any tests run
setupAllMocks();

// Global test setup
beforeAll(async () => {
  console.log('🚀 Notification Service test suite starting...');
  // Note: For unit tests, we don't need real email connections
  // The mocks will handle all email interactions
});

afterAll(async () => {
  console.log('✅ Notification Service test suite completed');
  // Global cleanup
  resetAllMocks();
});

// Reduce noise from console.error/warn in test output; override per-test if needed
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

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEmail(): R;
      toContainHTML(expectedHTML: string): R;
    }
  }
}

// Custom Jest matchers for Notification Service
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toContainHTML(received: string, expectedHTML: string) {
    const pass = received.includes(expectedHTML);
    if (pass) {
      return {
        message: () => `expected ${received} not to contain HTML: ${expectedHTML}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to contain HTML: ${expectedHTML}`,
        pass: false,
      };
    }
  },
});
