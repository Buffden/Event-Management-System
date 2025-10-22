/**
 * Environment Setup for Event Service Tests
 * 
 * This file sets up the test environment before any tests run.
 * It loads test-specific environment variables and ensures proper
 * test isolation.
 */

import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '../../.env.test') });

// Ensure test environment
process.env.NODE_ENV = 'test';

// Required environment variables for Event Service tests
const requiredEnvs = [
  'DATABASE_URL',
  'RABBITMQ_URL',
  'JWT_SECRET',
  'PORT',
];

// Validate required environment variables
for (const key of requiredEnvs) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable for tests: ${key}. ` +
      `Ensure it is set in .env.test file.`
    );
  }
}

// Set test-specific environment variables
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.DISABLE_LOGGING = 'true'; // Disable logging in tests unless needed

// Mock external service URLs for unit tests
process.env.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
process.env.BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3003';

console.log('✅ Event Service test environment configured');
