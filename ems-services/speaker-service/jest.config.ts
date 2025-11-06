/**
 * Jest Configuration for Speaker Service
 *
 * This configuration follows the standardized testing pattern for EMS microservices.
 */

import type { Config } from 'jest';
import path from 'path';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  moduleDirectories: ['node_modules', 'src'],

  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/__test__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.spec.ts',
  ],

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

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/services/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

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
    '/middleware/error.middleware.ts',
  ],

  setupFiles: ['<rootDir>/src/test/env-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/src/test/$1',
    '^../database$': '<rootDir>/src/test/mocks-simple.ts',
  },

  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,

  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: false,
      isolatedModules: true,
    }],
  },

  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: path.resolve(__dirname),
  testResultsProcessor: 'jest-sonar-reporter',

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/__tests__/**/*',
    '!src/**/__test__/**/*',
    '!src/server.ts',
    '!src/database.ts',
  ],

  errorOnDeprecated: true,
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
};

export default config;

