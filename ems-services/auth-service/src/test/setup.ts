// src/test/setup.ts
import 'jest';
import { setupAllMocks, resetAllMocks } from './mocks';

// Setup all common mocks before any tests run
setupAllMocks();

// Common Jest setup hooks shared across tests
beforeAll(async () => {
    // Note: For unit tests, we don't need real database connections
    // The mocks will handle all database interactions
});

afterAll(async () => {
    // Global cleanup
    resetAllMocks();
});

// Reduce noise from console.error in test output; override per-test if needed
const originalConsoleError = console.error;
beforeEach(() => {
    console.error = jest.fn();
    // Reset all mocks before each test
    resetAllMocks();
});

afterEach(() => {
    console.error = originalConsoleError;
});