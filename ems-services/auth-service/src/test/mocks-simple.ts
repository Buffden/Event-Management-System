/**
 * Simplified Mock Definitions for Auth Service Tests
 *
 * This file contains simplified mocks that work better with TypeScript.
 */

import { jest } from '@jest/globals';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Factory for creating mock user objects
 */
export const createMockUser = (overrides: any = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed_password_123',
  role: 'USER',
  isActive: false,
  emailVerified: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Factory for creating mock account objects
 */
export const createMockAccount = (overrides: any = {}) => ({
  id: 'account-123',
  userId: 'user-123',
  type: 'credentials',
  provider: 'email',
  providerAccountId: 'test@example.com',
  ...overrides,
});

/**
 * Factory for creating mock JWT tokens
 */
export const createMockJWT = (overrides: any = {}) => ({
  userId: 'user-123',
  email: 'test@example.com',
  role: 'USER',
  type: 'access',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});

// ============================================================================
// PRISMA MOCKS
// ============================================================================

export const mockPrisma = {
  user: {
    findMany: jest.fn() as jest.MockedFunction<any>,
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    updateMany: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
    upsert: jest.fn() as jest.MockedFunction<any>,
  },
  account: {
    findMany: jest.fn() as jest.MockedFunction<any>,
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
  },
  $transaction: jest.fn() as jest.MockedFunction<any>,
  $connect: jest.fn() as jest.MockedFunction<any>,
  $disconnect: jest.fn() as jest.MockedFunction<any>,
};

// ============================================================================
// EXTERNAL SERVICE MOCKS
// ============================================================================

export const mockRabbitMQService = {
  connect: jest.fn() as jest.MockedFunction<any>,
  disconnect: jest.fn() as jest.MockedFunction<any>,
  sendMessage: jest.fn() as jest.MockedFunction<any>,
  consumeMessage: jest.fn() as jest.MockedFunction<any>,
};

// ============================================================================
// JWT MOCKS
// ============================================================================

// Import actual JWT for error classes
const actualJWT = jest.requireActual<typeof import('jsonwebtoken')>('jsonwebtoken');

export const mockJWT = {
  sign: jest.fn() as jest.MockedFunction<any>,
  verify: jest.fn() as jest.MockedFunction<any>,
  decode: jest.fn() as jest.MockedFunction<any>,
  // Include error classes from actual JWT module
  JsonWebTokenError: actualJWT.JsonWebTokenError,
  TokenExpiredError: actualJWT.TokenExpiredError,
  NotBeforeError: actualJWT.NotBeforeError,
};

// ============================================================================
// BCRYPT MOCKS
// ============================================================================

export const mockBcrypt = {
  hash: jest.fn() as jest.MockedFunction<any>,
  compare: jest.fn() as jest.MockedFunction<any>,
  genSalt: jest.fn() as jest.MockedFunction<any>,
};

// ============================================================================
// LOGGER MOCKS
// ============================================================================

export const mockLogger = {
  info: jest.fn() as jest.MockedFunction<any>,
  warn: jest.fn() as jest.MockedFunction<any>,
  error: jest.fn() as jest.MockedFunction<any>,
  debug: jest.fn() as jest.MockedFunction<any>,
  child: jest.fn(() => mockLogger) as jest.MockedFunction<any>,
};

// ============================================================================
// TEST SCENARIO SETUP FUNCTIONS
// ============================================================================

/**
 * Setup successful user registration scenario
 */
export const setupSuccessfulRegistration = () => {
  const mockUser = createMockUser({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    isActive: false,
    emailVerified: null,
    image: null
  });
  const mockAccount = createMockAccount();
  const mockToken = 'mock.jwt.token';

  mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
  mockPrisma.user.create.mockResolvedValue(mockUser);
  mockPrisma.account.create.mockResolvedValue(mockAccount);
  mockBcrypt.hash.mockResolvedValue('hashed_password_123');
  mockJWT.sign.mockReturnValue(mockToken);
  mockRabbitMQService.sendMessage.mockResolvedValue(undefined);

  return { mockUser, mockAccount, mockToken };
};

/**
 * Setup existing user scenario
 */
export const setupExistingUser = (isActive: boolean = true) => {
  const mockUser = createMockUser({
    isActive,
    emailVerified: isActive ? new Date('2024-01-02T00:00:00Z') : null
  });

  mockPrisma.user.findUnique.mockResolvedValue(mockUser);
  return { mockUser };
};

/**
 * Setup successful login scenario
 */
export const setupSuccessfulLogin = () => {
  const mockUser = createMockUser({
    isActive: true,
    emailVerified: new Date('2024-01-02T00:00:00Z')
  });
  const mockAccount = createMockAccount();
  const mockToken = 'mock.jwt.token';

  const userWithPassword = {
    ...mockUser,
    accounts: [mockAccount],
  };

  mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);
  mockBcrypt.compare.mockResolvedValue(true);
  mockJWT.sign.mockReturnValue(mockToken);

  return { mockUser, mockAccount, mockToken };
};

/**
 * Setup email verification scenario
 */
export const setupEmailVerification = () => {
  const mockUser = createMockUser();
  const mockToken = 'mock.verification.token';
  const mockJWTData = createMockJWT({
    userId: mockUser.id,
    type: 'email-verification'
  });

  mockJWT.verify.mockReturnValue(mockJWTData);
  mockPrisma.user.findUnique.mockResolvedValue(mockUser);

  const verifiedUser = {
    ...mockUser,
    isActive: true,
    emailVerified: new Date('2024-01-02T00:00:00Z'),
  };

  mockPrisma.user.update.mockResolvedValue(verifiedUser);
  mockJWT.sign.mockReturnValue('mock.access.token');

  return { mockUser, verifiedUser, mockToken };
};

/**
 * Setup authentication failure scenario
 */
export const setupAuthFailure = () => {
  mockJWT.verify.mockImplementation(() => {
    throw new Error('Invalid token');
  });
};

/**
 * Setup database error scenario
 */
export const setupDatabaseError = () => {
  const dbError = new Error('Database connection failed');
  mockPrisma.user.findUnique.mockRejectedValue(dbError);
  mockPrisma.user.create.mockRejectedValue(dbError);
  mockPrisma.user.update.mockRejectedValue(dbError);
  mockPrisma.account.create.mockRejectedValue(dbError);
};

/**
 * Setup RabbitMQ error scenario
 */
export const setupRabbitMQError = () => {
  const mqError = new Error('RabbitMQ connection failed');
  mockRabbitMQService.sendMessage.mockRejectedValue(mqError);
};

// ============================================================================
// MOCK SETUP AND RESET FUNCTIONS
// ============================================================================

/**
 * Setup all mocks with default implementations
 */
export const setupAllMocks = () => {
  // Reset all mocks
  jest.clearAllMocks();

  // Setup default successful responses
  mockPrisma.$connect.mockResolvedValue(undefined);
  mockPrisma.$disconnect.mockResolvedValue(undefined);

  // Setup transaction mock to return the result of the callback
  mockPrisma.$transaction.mockImplementation(async (callback: any) => {
    const mockTx = {
      user: {
        create: mockPrisma.user.create,
        findUnique: mockPrisma.user.findUnique,
        update: mockPrisma.user.update,
        findFirst: mockPrisma.user.findFirst,
        findMany: mockPrisma.user.findMany,
        delete: mockPrisma.user.delete,
        count: mockPrisma.user.count,
        upsert: mockPrisma.user.upsert,
      },
      account: {
        create: mockPrisma.account.create,
        findUnique: mockPrisma.account.findUnique,
        findFirst: mockPrisma.account.findFirst,
        findMany: mockPrisma.account.findMany,
        update: mockPrisma.account.update,
        delete: mockPrisma.account.delete,
        count: mockPrisma.account.count,
      }
    };
    return await callback(mockTx);
  });

  mockRabbitMQService.connect.mockResolvedValue(undefined);
  mockRabbitMQService.disconnect.mockResolvedValue(undefined);

  // Setup default logger behavior
  mockLogger.info.mockImplementation(() => {});
  mockLogger.warn.mockImplementation(() => {});
  mockLogger.error.mockImplementation(() => {});
  mockLogger.debug.mockImplementation(() => {});
};

/**
 * Reset all mocks to their initial state
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
};

// ============================================================================
// MOCK MODULE IMPORTS
// ============================================================================

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Mock database module
export const prisma = mockPrisma;

// Mock external services
jest.mock('../services/rabbitmq.service', () => ({
  rabbitMQService: mockRabbitMQService,
  EmailNotification: {},
}));

// Mock JWT - include error classes
jest.mock('jsonwebtoken', () => {
  const actualJWT = jest.requireActual<typeof import('jsonwebtoken')>('jsonwebtoken');
  return {
    ...mockJWT,
    // Include error classes from actual JWT module so instanceof checks work
    JsonWebTokenError: actualJWT.JsonWebTokenError,
    TokenExpiredError: actualJWT.TokenExpiredError,
    NotBeforeError: actualJWT.NotBeforeError,
    default: {
      ...mockJWT,
      JsonWebTokenError: actualJWT.JsonWebTokenError,
      TokenExpiredError: actualJWT.TokenExpiredError,
      NotBeforeError: actualJWT.NotBeforeError,
    },
  };
});

// Mock bcrypt
jest.mock('bcryptjs', () => mockBcrypt);

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: mockLogger,
}));
