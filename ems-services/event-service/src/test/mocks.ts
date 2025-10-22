/**
 * Mock Definitions for Event Service Tests
 * 
 * This file contains all the mocks used in Event Service tests.
 * It follows the Factory pattern to create consistent mock objects
 * and provides utilities for setting up different test scenarios.
 */

import { jest } from '@jest/globals';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Factory for creating mock event objects
 */
export const createMockEvent = (overrides: Partial<any> = {}) => ({
  id: 'event-123',
  title: 'Test Event',
  description: 'A test event description',
  startDate: new Date('2024-12-01T10:00:00Z'),
  endDate: new Date('2024-12-01T18:00:00Z'),
  venueId: 'venue-123',
  maxAttendees: 100,
  currentAttendees: 0,
  isActive: true,
  isPublished: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Factory for creating mock venue objects
 */
export const createMockVenue = (overrides: Partial<any> = {}) => ({
  id: 'venue-123',
  name: 'Test Venue',
  address: '123 Test Street, Test City',
  capacity: 200,
  amenities: ['WiFi', 'Parking', 'Accessibility'],
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Factory for creating mock user objects
 */
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  isActive: true,
  emailVerified: new Date('2024-01-01T00:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Factory for creating mock JWT tokens
 */
export const createMockJWT = (overrides: Partial<any> = {}) => ({
  userId: 'user-123',
  email: 'test@example.com',
  role: 'USER',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  ...overrides,
});

// ============================================================================
// PRISMA MOCKS
// ============================================================================

const mockPrisma = {
  event: {
    findMany: jest.fn() as jest.MockedFunction<any>,
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
    upsert: jest.fn() as jest.MockedFunction<any>,
  },
  venue: {
    findMany: jest.fn() as jest.MockedFunction<any>,
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
  },
  user: {
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findMany: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
  },
  $transaction: jest.fn() as jest.MockedFunction<any>,
  $connect: jest.fn() as jest.MockedFunction<any>,
  $disconnect: jest.fn() as jest.MockedFunction<any>,
};

// ============================================================================
// EXTERNAL SERVICE MOCKS
// ============================================================================

const mockRabbitMQService = {
  connect: jest.fn() as jest.MockedFunction<any>,
  disconnect: jest.fn() as jest.MockedFunction<any>,
  sendMessage: jest.fn() as jest.MockedFunction<any>,
  consumeMessage: jest.fn() as jest.MockedFunction<any>,
  publishEvent: jest.fn() as jest.MockedFunction<any>,
};

const mockAuthValidationService = {
  validateToken: jest.fn() as jest.MockedFunction<any>,
  validateUserRole: jest.fn() as jest.MockedFunction<any>,
  getUserFromToken: jest.fn() as jest.MockedFunction<any>,
};

const mockEventPublisherService = {
  publishEventCreated: jest.fn() as jest.MockedFunction<any>,
  publishEventUpdated: jest.fn() as jest.MockedFunction<any>,
  publishEventDeleted: jest.fn() as jest.MockedFunction<any>,
  publishEventPublished: jest.fn() as jest.MockedFunction<any>,
};

// ============================================================================
// HTTP CLIENT MOCKS
// ============================================================================

const mockAxios = {
  get: jest.fn() as jest.MockedFunction<any>,
  post: jest.fn() as jest.MockedFunction<any>,
  put: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
  patch: jest.fn() as jest.MockedFunction<any>,
  create: jest.fn(() => mockAxios) as jest.MockedFunction<any>,
  defaults: {
    baseURL: '',
    headers: {},
  },
};

// ============================================================================
// JWT MOCKS
// ============================================================================

const mockJWT = {
  sign: jest.fn() as jest.MockedFunction<any>,
  verify: jest.fn() as jest.MockedFunction<any>,
  decode: jest.fn() as jest.MockedFunction<any>,
};

// ============================================================================
// LOGGER MOCKS
// ============================================================================

const mockLogger = {
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
 * Setup successful event creation scenario
 */
export const setupSuccessfulEventCreation = () => {
  const mockEvent = createMockEvent();
  const mockVenue = createMockVenue();
  
  (mockPrisma.venue.findUnique as any).mockResolvedValue(mockVenue);
  (mockPrisma.event.create as any).mockResolvedValue(mockEvent);
  (mockEventPublisherService.publishEventCreated as any).mockResolvedValue(undefined);
  
  return { mockEvent, mockVenue };
};

/**
 * Setup event not found scenario
 */
export const setupEventNotFound = () => {
  (mockPrisma.event.findUnique as any).mockResolvedValue(null);
};

/**
 * Setup venue not found scenario
 */
export const setupVenueNotFound = () => {
  (mockPrisma.venue.findUnique as any).mockResolvedValue(null);
};

/**
 * Setup successful authentication scenario
 */
export const setupSuccessfulAuth = (userRole: string = 'USER') => {
  const mockUser = createMockUser({ role: userRole });
  const mockToken = createMockJWT({ role: userRole });
  
  mockJWT.verify.mockReturnValue(mockToken);
  mockAuthValidationService.validateToken.mockResolvedValue({ valid: true, user: mockUser });
  mockAuthValidationService.getUserFromToken.mockResolvedValue(mockUser);
  
  return { mockUser, mockToken };
};

/**
 * Setup authentication failure scenario
 */
export const setupAuthFailure = () => {
  mockJWT.verify.mockImplementation(() => {
    throw new Error('Invalid token');
  });
  mockAuthValidationService.validateToken.mockResolvedValue({ valid: false, user: null });
};

/**
 * Setup database error scenario
 */
export const setupDatabaseError = () => {
  const dbError = new Error('Database connection failed');
  mockPrisma.event.findUnique.mockRejectedValue(dbError);
  mockPrisma.venue.findUnique.mockRejectedValue(dbError);
  mockPrisma.event.create.mockRejectedValue(dbError);
  mockPrisma.event.update.mockRejectedValue(dbError);
  mockPrisma.event.delete.mockRejectedValue(dbError);
};

/**
 * Setup RabbitMQ error scenario
 */
export const setupRabbitMQError = () => {
  const mqError = new Error('RabbitMQ connection failed');
  mockRabbitMQService.sendMessage.mockRejectedValue(mqError);
  mockEventPublisherService.publishEventCreated.mockRejectedValue(mqError);
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

// Mock external services
jest.mock('../services/rabbitmq.service', () => ({
  RabbitMQService: jest.fn(() => mockRabbitMQService),
}));

jest.mock('../services/auth-validation.service', () => ({
  AuthValidationService: jest.fn(() => mockAuthValidationService),
}));

jest.mock('../services/event-publisher.service', () => ({
  EventPublisherService: jest.fn(() => mockEventPublisherService),
}));

// Mock HTTP client
jest.mock('axios', () => mockAxios);

// Mock JWT
jest.mock('jsonwebtoken', () => mockJWT);

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: mockLogger,
}));

// Export all mocks for easy access in tests
export {
  mockPrisma,
  mockRabbitMQService,
  mockAuthValidationService,
  mockEventPublisherService,
  mockAxios,
  mockJWT,
  mockLogger,
};
