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

// Set test-specific environment variables with defaults
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.DISABLE_LOGGING = 'true'; // Disable logging in tests unless needed

// Set default values for all required environment variables
process.env.PORT = process.env.PORT || '3004';
process.env.RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
process.env.GMAIL_HOST = process.env.GMAIL_HOST || 'smtp.gmail.com';
process.env.GMAIL_PORT = process.env.GMAIL_PORT || '465';
process.env.GMAIL_USER = process.env.GMAIL_USER || 'test@example.com';
process.env.GMAIL_PASS = process.env.GMAIL_PASS || 'test-password';
process.env.APP_NAME = process.env.APP_NAME || 'Event Management System';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

console.log('✅ Notification Service test environment configured');
