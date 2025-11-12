/**
 * Simplified Mock Definitions for Feedback Service Tests
 *
 * This file contains simplified mocks that work better with TypeScript.
 */

import { jest } from '@jest/globals';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Factory for creating mock feedback form objects
 */
export const createMockFeedbackForm = (overrides: any = {}) => ({
  id: 'form-123',
  eventId: 'event-123',
  title: 'Test Feedback Form',
  description: 'Test description',
  status: 'DRAFT',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Factory for creating mock feedback response objects
 */
export const createMockFeedbackResponse = (overrides: any = {}) => ({
  id: 'response-123',
  formId: 'form-123',
  userId: 'user-123',
  eventId: 'event-123',
  bookingId: 'booking-123',
  rating: 5,
  comment: 'Great event!',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Factory for creating mock user objects
 */
export const createMockUser = (overrides: any = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  ...overrides,
});

/**
 * Factory for creating mock JWT tokens
 */
export const createMockJWT = (overrides: any = {}) => ({
  userId: 'user-123',
  email: 'test@example.com',
  role: 'USER',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});

// ============================================================================
// PRISMA MOCKS
// ============================================================================

export const mockPrisma = {
  feedbackForm: {
    findMany: jest.fn() as jest.MockedFunction<any>,
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
  },
  feedbackResponse: {
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

export const mockAxios = {
  post: jest.fn() as jest.MockedFunction<any>,
  get: jest.fn() as jest.MockedFunction<any>,
  put: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
  isAxiosError: jest.fn() as jest.MockedFunction<any>,
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
 * Setup successful feedback form creation scenario
 */
export const setupSuccessfulFormCreation = () => {
  const mockForm = createMockFeedbackForm({
    id: 'form-123',
    eventId: 'event-123',
    title: 'Test Feedback Form',
    status: 'DRAFT',
  });

  mockPrisma.feedbackForm.findUnique.mockResolvedValue(null); // No existing form
  mockPrisma.feedbackForm.create.mockResolvedValue(mockForm);

  return { mockForm };
};

/**
 * Setup existing feedback form scenario
 */
export const setupExistingForm = (status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' = 'PUBLISHED') => {
  const mockForm = createMockFeedbackForm({
    status,
  });

  mockPrisma.feedbackForm.findUnique.mockResolvedValue(mockForm);
  return { mockForm };
};

/**
 * Setup successful feedback submission scenario
 */
export const setupSuccessfulFeedbackSubmission = () => {
  const mockForm = createMockFeedbackForm({
    status: 'PUBLISHED',
  });
  const mockResponse = createMockFeedbackResponse();

  mockPrisma.feedbackForm.findUnique.mockResolvedValue(mockForm);
  mockPrisma.feedbackResponse.findUnique.mockResolvedValue(null); // No duplicate
  mockPrisma.feedbackResponse.create.mockResolvedValue(mockResponse);

  return { mockForm, mockResponse };
};

/**
 * Setup duplicate feedback submission scenario
 */
export const setupDuplicateFeedbackSubmission = () => {
  const mockForm = createMockFeedbackForm({
    status: 'PUBLISHED',
  });
  const existingResponse = createMockFeedbackResponse();

  mockPrisma.feedbackForm.findUnique.mockResolvedValue(mockForm);
  mockPrisma.feedbackResponse.findUnique.mockResolvedValue(existingResponse);

  return { mockForm, existingResponse };
};

/**
 * Setup successful feedback update scenario
 */
export const setupSuccessfulFeedbackUpdate = () => {
  const mockForm = createMockFeedbackForm({
    status: 'PUBLISHED',
  });
  const existingResponse = createMockFeedbackResponse({
    userId: 'user-123',
  });
  const updatedResponse = {
    ...existingResponse,
    rating: 4,
    comment: 'Updated comment',
  };

  mockPrisma.feedbackResponse.findUnique.mockResolvedValue(existingResponse);
  mockPrisma.feedbackForm.findUnique.mockResolvedValue(mockForm);
  mockPrisma.feedbackResponse.update.mockResolvedValue(updatedResponse);

  return { mockForm, existingResponse, updatedResponse };
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
  mockPrisma.feedbackForm.findUnique.mockRejectedValue(dbError);
  mockPrisma.feedbackForm.create.mockRejectedValue(dbError);
  mockPrisma.feedbackForm.update.mockRejectedValue(dbError);
  mockPrisma.feedbackForm.delete.mockRejectedValue(dbError);
  mockPrisma.feedbackResponse.findUnique.mockRejectedValue(dbError);
  mockPrisma.feedbackResponse.create.mockRejectedValue(dbError);
  mockPrisma.feedbackResponse.update.mockRejectedValue(dbError);
};

/**
 * Setup auth service error scenario
 */
export const setupAuthServiceError = () => {
  const authError = new Error('Auth service unavailable');
  mockAxios.post.mockRejectedValue(authError);
  mockAxios.get.mockRejectedValue(authError);
};

/**
 * Setup successful auth validation scenario
 */
export const setupSuccessfulAuthValidation = () => {
  const mockAuthResponse = {
    status: 200,
    data: {
      valid: true,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        name: 'Test User',
      },
    },
  };

  mockAxios.post.mockResolvedValue(mockAuthResponse);
  return { mockAuthResponse };
};

/**
 * Setup successful user info fetch scenario
 */
export const setupSuccessfulUserInfoFetch = () => {
  const mockUserInfoResponse = {
    status: 200,
    data: {
      valid: true,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        name: 'Test User',
      },
    },
  };

  mockAxios.get.mockResolvedValue(mockUserInfoResponse);
  return { mockUserInfoResponse };
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
      feedbackForm: {
        create: mockPrisma.feedbackForm.create,
        findUnique: mockPrisma.feedbackForm.findUnique,
        update: mockPrisma.feedbackForm.update,
        findFirst: mockPrisma.feedbackForm.findFirst,
        findMany: mockPrisma.feedbackForm.findMany,
        delete: mockPrisma.feedbackForm.delete,
        count: mockPrisma.feedbackForm.count,
      },
      feedbackResponse: {
        create: mockPrisma.feedbackResponse.create,
        findUnique: mockPrisma.feedbackResponse.findUnique,
        update: mockPrisma.feedbackResponse.update,
        findFirst: mockPrisma.feedbackResponse.findFirst,
        findMany: mockPrisma.feedbackResponse.findMany,
        delete: mockPrisma.feedbackResponse.delete,
        count: mockPrisma.feedbackResponse.count,
      },
    };
    return await callback(mockTx);
  });

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

// Mock axios
jest.mock('axios', () => ({
  default: mockAxios,
  ...mockAxios,
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

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: mockLogger,
}));

// Mock auth-helpers
export const mockGetUserInfo = jest.fn() as jest.MockedFunction<any>;
jest.mock('../utils/auth-helpers', () => ({
  getUserInfo: (...args: any[]) => mockGetUserInfo(...args),
}));

