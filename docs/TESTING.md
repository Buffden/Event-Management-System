# Testing Guide

## Overview

Tests are **NOT** run during Docker container builds or deployments. The build process only compiles TypeScript code using `tsc`. Tests must be run manually using npm scripts.

## Build Process

The Docker build process:
1. Installs dependencies (`npm ci`)
2. Generates Prisma client (`npx prisma generate`)
3. Compiles TypeScript (`npm run build` which runs `tsc`)
4. **Does NOT run tests**

## Running Tests Manually

### Available Test Scripts

All services support the following npm test scripts:

- `npm test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests in CI mode (no watch, with coverage)
- `npm run test:debug` - Run tests with debug output
- `npm run test:verbose` - Run tests with verbose output
- `npm run test:update-snapshots` - Update test snapshots

### Running Tests for a Specific Service

Navigate to the service directory and run the test command:

```bash
# Example: Run tests for event-service
cd ems-services/event-service
npm test

# Example: Run tests with coverage
npm run test:coverage

# Example: Run tests in watch mode
npm run test:watch
```

### Running Tests for All Services

You can run tests for all services from the root directory:

```bash
# Run tests for all services
cd ems-services/event-service && npm test && cd ../..
cd ems-services/speaker-service && npm test && cd ../..
cd ems-services/booking-service && npm test && cd ../..
cd ems-services/auth-service && npm test && cd ../..
cd ems-services/notification-service && npm test && cd ../..
cd ems-services/feedback-service && npm test && cd ../..
```

Or use a script to run all tests:

```bash
# Create a script to run all tests
./scripts/run-all-tests.sh
```

## Test Configuration

### Jest Configuration

Each service has its own `jest.config.ts` file that configures:
- Test file patterns
- Coverage thresholds
- TypeScript support
- Test environment setup

### Test Environment

Tests use a separate environment configuration:
- Test environment variables are loaded from `.env.test` files
- Test setup files are in `src/test/` directories
- Mocks are defined in `src/test/mocks-simple.ts`

## Test Structure

Tests are organized as follows:

```
ems-services/{service}/
├── src/
│   ├── services/
│   │   └── __test__/
│   │       └── *.test.ts
│   ├── routes/
│   │   └── __test__/
│   │       └── *.test.ts
│   └── test/
│       ├── setup.ts
│       ├── env-setup.ts
│       └── mocks-simple.ts
└── jest.config.ts
```

## Important Notes

1. **Tests are NOT run during Docker builds** - The build process only compiles TypeScript
2. **Tests require dev dependencies** - Make sure to install dependencies with `npm install` (not `npm ci --omit=dev`)
3. **Test environment variables** - Ensure `.env.test` files are configured for each service
4. **Database setup** - Some tests may require a test database connection

## CI/CD Integration

If you want to run tests in CI/CD pipelines, you can:

1. Add a separate test stage in your CI/CD pipeline
2. Run tests before building Docker images
3. Use `npm run test:ci` for CI environments

Example CI/CD step:

```yaml
# Example GitHub Actions step
- name: Run tests
  run: |
    cd ems-services/event-service
    npm install
    npm run test:ci
```

## Troubleshooting

### Tests fail to run

1. Ensure dev dependencies are installed: `npm install`
2. Check that `.env.test` files exist and are configured
3. Verify Jest is installed: `npm list jest`

### TypeScript compilation errors in tests

- Tests are compiled during `npm test` execution
- Ensure all test files have proper imports and types
- Check `tsconfig.json` includes test files

### Coverage reports

Coverage reports are generated in the `coverage/` directory after running `npm run test:coverage`.

