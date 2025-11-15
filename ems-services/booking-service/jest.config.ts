/**
 * Jest Configuration for Booking Service
 *
 * This configuration follows the standardized testing pattern for EMS microservices.
 * It includes comprehensive coverage reporting, proper TypeScript support, and
 * optimized test environment setup.
 *
 * Key Features:
 * - TypeScript support with ts-jest
 * - Comprehensive coverage reporting with thresholds
 * - Proper test environment setup
 * - Mock and setup file integration
 * - Coverage path exclusions for generated files
 */

import type { Config } from 'jest';
import path from 'path';

const config: Config = {
  // Test environment and preset
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Module resolution
  moduleDirectories: ['node_modules', 'src'],

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/__test__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.spec.ts',
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover',
    'json',
  ],

  // Coverage thresholds (adjust based on your requirements)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Service-specific thresholds
    './src/services/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Files to exclude from coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/src/test/',
    '/src/__tests__/',
    '/src/__test__/',
    '/generated/',
    '/generated/prisma/',
    '/prisma/',
    '/*.d.ts',
    '/types/',
    '/middleware/error.middleware.ts', // Error middleware is hard to test
  ],

  // Setup files
  setupFiles: ['<rootDir>/src/test/env-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  // Mock modules
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/src/test/$1',
    '^../database$': '<rootDir>/src/test/mocks-simple.ts',
  },

  // Test timeout (adjust based on your needs)
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output for better debugging
  verbose: true,

  // TypeScript configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: false,
    }],
  },

  // Transform ignore patterns - allow ESM modules to be transformed
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Root directory
  rootDir: path.resolve(__dirname),

  // Test results processor for additional reporting
  testResultsProcessor: 'jest-sonar-reporter',

  // Collect coverage from specific files only
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/__tests__/**/*',
    '!src/**/__test__/**/*',
    '!src/server.ts', // Entry point, usually not unit tested
    '!src/database.ts', // Database connection, tested in integration
    '!src/routes/seeder.routes.ts', // Seeder routes excluded from coverage
    '!src/utils/logger.ts', // Logger utility excluded from coverage
    '!src/services/event-consumer.service.ts', // Event consumer service excluded from coverage
    '!src/services/event-publisher.service.ts', // Event publisher service excluded from coverage
  ],

  // Error handling
  errorOnDeprecated: true,

  // Performance optimizations
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
};

export default config;
