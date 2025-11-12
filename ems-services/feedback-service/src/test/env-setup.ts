// src/test/env-setup.ts
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables as early as possible for all tests
// Try to load .env.test, but don't fail if it doesn't exist
try {
    config({ path: path.resolve(__dirname, '../../.env.test') });
} catch (error) {
    // .env.test file doesn't exist, we'll use defaults
}

// Ensure test environment
process.env.NODE_ENV = 'test';

// Set default test values if not already set
// These defaults are safe for unit tests since we mock all external dependencies
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/feedback_test_db';
}

if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-feedback-service-tests-only';
}

if (!process.env.GATEWAY_URL) {
    process.env.GATEWAY_URL = 'http://localhost';
}

if (!process.env.PORT) {
    process.env.PORT = '3000';
}

if (!process.env.RABBITMQ_URL) {
    process.env.RABBITMQ_URL = 'amqp://localhost:5672';
}

