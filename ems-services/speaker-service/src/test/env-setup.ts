/**
 * Environment Setup for Speaker Service Tests
 */

import { config } from 'dotenv';
import path from 'path';

// Try to load test environment variables, but don't fail if file doesn't exist
try {
  config({ path: path.resolve(__dirname, '../../.env.test') });
} catch (error) {
  // .env.test file doesn't exist, that's okay for tests
  console.log('No .env.test file found, using default test values');
}

// Ensure test environment
process.env.NODE_ENV = 'test';

// Set default values for all required environment variables
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/speaker_test_db';
}

if (!process.env.RABBITMQ_URL) {
  process.env.RABBITMQ_URL = 'amqp://localhost:5672';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-speaker-service-tests-only';
}

if (!process.env.PORT) {
  process.env.PORT = '3005';
}

if (!process.env.GATEWAY_URL) {
  process.env.GATEWAY_URL = 'http://localhost';
}

if (!process.env.UPLOAD_DIR) {
  process.env.UPLOAD_DIR = '/tmp/speaker-service-test-uploads';
}

process.env.LOG_LEVEL = 'error';
process.env.DISABLE_LOGGING = 'true';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

console.log('✅ Speaker Service test environment configured');

