# Event Service Testing Setup

This document explains how to set up and run tests for the Event Service.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v14 or higher)
3. **RabbitMQ** (v3.8 or higher)

## Environment Setup

Create a `.env.test` file in the event-service root directory with the following content:

```bash
# Test Environment Configuration for Event Service

# Database Configuration
DATABASE_URL="postgresql://admin:password@localhost:5433/test_db"

# RabbitMQ Configuration
RABBITMQ_URL="amqp://localhost:5672"

# JWT Configuration
JWT_SECRET="test-jwt-secret-key-for-event-service"
JWT_EXPIRES_IN="1h"

# Service Configuration
EVENT_SERVICE_PORT=3002
NODE_ENV=test

# External Service URLs (mocked in tests)
AUTH_SERVICE_URL="http://localhost:3001"
BOOKING_SERVICE_URL="http://localhost:3003"
NOTIFICATION_SERVICE_URL="http://localhost:3004"

# Logging Configuration
LOG_LEVEL=error
DISABLE_LOGGING=true

# Test-specific settings
TEST_TIMEOUT=10000
ENABLE_TEST_LOGGING=false
```

## Test Database Setup

1. **Start the test database:**
   ```bash
   docker-compose -f ../../docker-compose.test-db.yaml up -d
   ```

2. **Run database migrations:**
   ```bash
   npm run prisma:migrate
   ```

3. **Generate Prisma client:**
   ```bash
   npm run prisma:generate
   ```

## Running Tests

### Install Dependencies
```bash
npm install
```

### Available Test Commands

- **Run all tests:**
  ```bash
  npm test
  ```

- **Run tests in watch mode:**
  ```bash
  npm run test:watch
  ```

- **Run tests with coverage:**
  ```bash
  npm run test:coverage
  ```

- **Run tests for CI/CD:**
  ```bash
  npm run test:ci
  ```

- **Run tests with debug info:**
  ```bash
  npm run test:debug
  ```

- **Run tests with verbose output:**
  ```bash
  npm run test:verbose
  ```

- **Update test snapshots:**
  ```bash
  npm run test:update-snapshots
  ```

## Test Structure

The test suite follows this structure:

```
src/
├── test/
│   ├── env-setup.ts      # Environment configuration
│   ├── setup.ts          # Test setup and utilities
│   └── mocks.ts          # Mock definitions
├── services/
│   └── __test__/
│       └── *.test.ts     # Service unit tests
└── routes/
    └── __test__/
        └── *.test.ts     # Route integration tests
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- **HTML Report:** `coverage/lcov-report/index.html`
- **LCOV Report:** `coverage/lcov.info`
- **JSON Report:** `coverage/coverage-final.json`

## Coverage Thresholds

The following coverage thresholds are enforced:

- **Global:** 70% for branches, functions, lines, and statements
- **Services:** 80% for branches, functions, lines, and statements

## Writing Tests

### Test File Naming
- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

### Test Structure
```typescript
describe('ServiceName (unit)', () => {
  let service: ServiceName;

  beforeEach(() => {
    service = new ServiceName();
  });

  describe('methodName', () => {
    it('should do something when condition is met', async () => {
      // Arrange
      setupSuccessfulScenario();
      
      // Act
      const result = await service.methodName(input);
      
      // Assert
      expect(result).toBeValidEvent();
      expect(mockPrisma.service.method).toHaveBeenCalledWith(expectedArgs);
    });
  });
});
```

### Using Mocks
```typescript
import {
  mockPrisma,
  setupSuccessfulScenario,
  createMockEvent,
} from '../../test/mocks';

// Use factory functions for consistent test data
const mockEvent = createMockEvent({ title: 'Custom Title' });

// Use setup functions for common scenarios
setupSuccessfulEventCreation();
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env.test
   - Verify test database exists

2. **RabbitMQ Connection Failed**
   - Ensure RabbitMQ is running
   - Check RABBITMQ_URL in .env.test

3. **Test Timeouts**
   - Increase TEST_TIMEOUT in .env.test
   - Check for hanging async operations

4. **Coverage Threshold Failures**
   - Review uncovered code
   - Add tests for missing scenarios
   - Adjust thresholds if appropriate

### Debug Mode
Run tests with debug information:
```bash
npm run test:debug
```

This will show:
- Open handles that prevent Jest from exiting
- Detailed error information
- Test execution timing

## Best Practices

1. **Use descriptive test names** that explain the scenario
2. **Follow AAA pattern:** Arrange, Act, Assert
3. **Mock external dependencies** to isolate units under test
4. **Use factory functions** for consistent test data
5. **Test both success and failure scenarios**
6. **Keep tests focused** on single behaviors
7. **Use setup functions** for common test scenarios
8. **Clean up after tests** using beforeEach/afterEach
