/**
 * Test Setup for Event Service
 * 
 * This file contains common test setup, mocks, and utilities
 * that are shared across all Event Service tests.
 */

import '@jest/globals';
import { setupAllMocks, resetAllMocks } from './mocks-simple';

// Setup all common mocks before any tests run
setupAllMocks();

// Global test setup
beforeAll(async () => {
  // Note: For unit tests, we don't need real database connections
  // The mocks will handle all database interactions
  console.log('🚀 Event Service test suite starting...');
});

afterAll(async () => {
  // Global cleanup
  resetAllMocks();
  console.log('✅ Event Service test suite completed');
});

// Reduce noise from console.error in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Suppress console errors and warnings during tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
  
  // Reset all mocks before each test
  resetAllMocks();
});

afterEach(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEvent(): R;
      toBeValidVenue(): R;
    }
  }
}

// Custom Jest matchers for Event Service
expect.extend({
  toBeValidEvent(received: any) {
    const requiredFields = ['id', 'title', 'description', 'startDate', 'endDate', 'venueId'];
    const missingFields = requiredFields.filter(field => !(field in received));
    
    if (missingFields.length > 0) {
      return {
        message: () => `Expected object to be a valid event, but missing fields: ${missingFields.join(', ')}`,
        pass: false,
      };
    }
    
    return {
      message: () => 'Expected object to be a valid event',
      pass: true,
    };
  },
  
  toBeValidVenue(received: any) {
    const requiredFields = ['id', 'name', 'address', 'capacity'];
    const missingFields = requiredFields.filter(field => !(field in received));
    
    if (missingFields.length > 0) {
      return {
        message: () => `Expected object to be a valid venue, but missing fields: ${missingFields.join(', ')}`,
        pass: false,
      };
    }
    
    return {
      message: () => 'Expected object to be a valid venue',
      pass: true,
    };
  },
});
