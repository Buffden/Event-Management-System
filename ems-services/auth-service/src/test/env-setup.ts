// src/test/env-setup.ts
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables as early as possible for all tests
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Ensure test environment
process.env.NODE_ENV = 'test';

// Optionally assert required envs exist (fail fast with clear message)
const requiredEnvs = [
    'DATABASE_URL',
    'RABBITMQ_URL',
    'JWT_SECRET',
    'EMAIL_VERIFICATION_SECRET'
];

for (const key of requiredEnvs) {
    if (!process.env[key]) {
        // Throwing an error here will stop tests with a clear message
        throw new Error(`Missing required env var for tests: ${key}. Ensure it is set in .env.test`);
    }
}