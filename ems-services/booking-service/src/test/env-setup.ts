/**
 * Environment Setup for Booking Service Tests
 * 
 * This file loads and validates the test environment variables
 * required for Booking Service tests to run properly.
 */

import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '../../.env.test') });

// Ensure test environment
process.env.NODE_ENV = 'test';

// Required environment variables for Booking Service tests
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

console.log('✅ Booking Service test environment configured');
