/**
 * Test Setup for Booking Service
 *
 * This file contains common test setup, mocks, and utilities
 * that are shared across all Booking Service tests.
 */

import '@jest/globals';
// Note: jest-mocks.ts is loaded via setupFiles in jest.config.ts
// so it runs before this file. We don't need to import it here.
import { setupAllMocks, resetAllMocks } from './mocks-simple';

// Setup all common mocks before any tests run
setupAllMocks();

// Global test setup
beforeAll(async () => {
  console.log('🚀 Booking Service test suite starting...');
  // Note: For unit tests, we don't need real database connections
  // The mocks will handle all database interactions
});

afterAll(async () => {
  console.log('✅ Booking Service test suite completed');
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

// Custom Jest matchers (example)
expect.extend({
  toBeValidBooking(received: any) {
    const hasRequiredFields = received &&
      typeof received.id === 'string' &&
      typeof received.userId === 'string' &&
      typeof received.eventId === 'string' &&
      typeof received.status === 'string' &&
      typeof received.createdAt === 'string';

    if (hasRequiredFields) {
      return {
        message: () => `expected ${received} not to be a valid booking`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid booking`,
        pass: false,
      };
    }
  },

  toBeValidTicket(received: any) {
    const hasRequiredFields = received &&
      typeof received.id === 'string' &&
      typeof received.bookingId === 'string' &&
      typeof received.eventId === 'string' &&
      typeof received.status === 'string' &&
      typeof received.issuedAt === 'string';

    if (hasRequiredFields) {
      return {
        message: () => `expected ${received} not to be a valid ticket`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ticket`,
        pass: false,
      };
    }
  },

  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
});
