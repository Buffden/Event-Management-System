/**
 * Environment Setup for Speaker Service Tests
 */

import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../.env.test') });

process.env.NODE_ENV = 'test';

const requiredEnvs = [
  'DATABASE_URL',
  'RABBITMQ_URL',
  'JWT_SECRET',
  'PORT',
];

for (const key of requiredEnvs) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable for tests: ${key}. ` +
      `Ensure it is set in .env.test file.`
    );
  }
}

process.env.LOG_LEVEL = 'error';
process.env.DISABLE_LOGGING = 'true';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

console.log('✅ Speaker Service test environment configured');

