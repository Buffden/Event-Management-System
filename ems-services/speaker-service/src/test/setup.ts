/**
 * Test Setup for Speaker Service
 */

import '@jest/globals';
import { setupAllMocks, resetAllMocks } from './mocks-simple';

setupAllMocks();

beforeAll(async () => {
  console.log('🚀 Speaker Service test suite starting...');
});

afterAll(async () => {
  resetAllMocks();
  console.log('✅ Speaker Service test suite completed');
});

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  resetAllMocks();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

