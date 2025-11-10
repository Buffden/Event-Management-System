/**
 * Simplified Mock Definitions for Event Service Tests
 *
 * This file contains simplified mocks that work better with TypeScript.
 */

import { jest } from '@jest/globals';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Factory for creating mock event objects
 */
export const createMockEvent = (overrides: any = {}) => ({
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
export const createMockVenue = (overrides: any = {}) => ({
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
export const createMockUser = (overrides: any = {}) => ({
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

// ============================================================================
// PRISMA MOCKS
// ============================================================================

export const mockPrisma = {
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

export const mockRabbitMQService = {
  connect: jest.fn() as jest.MockedFunction<any>,
  disconnect: jest.fn() as jest.MockedFunction<any>,
  sendMessage: jest.fn() as jest.MockedFunction<any>,
  consumeMessage: jest.fn() as jest.MockedFunction<any>,
  publishEvent: jest.fn() as jest.MockedFunction<any>,
  getChannel: jest.fn() as jest.MockedFunction<any>,
};

export const mockAuthValidationService = {
  validateToken: jest.fn() as jest.MockedFunction<any>,
  validateTokenWithRole: jest.fn() as jest.MockedFunction<any>,
  validateUserRole: jest.fn() as jest.MockedFunction<any>,
  getUserFromToken: jest.fn() as jest.MockedFunction<any>,
};

export const mockEventPublisherService = {
  publishEventCreated: jest.fn() as jest.MockedFunction<any>,
  publishEventUpdated: jest.fn() as jest.MockedFunction<any>,
  publishEventDeleted: jest.fn() as jest.MockedFunction<any>,
  publishEventPublished: jest.fn() as jest.MockedFunction<any>,
};

// ============================================================================
// HTTP CLIENT MOCKS
// ============================================================================

export const mockAxios = {
  get: jest.fn() as jest.MockedFunction<any>,
  post: jest.fn() as jest.MockedFunction<any>,
  put: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
  patch: jest.fn() as jest.MockedFunction<any>,
  create: jest.fn(() => mockAxios) as jest.MockedFunction<any>,
  isAxiosError: jest.fn() as jest.MockedFunction<any>,
  defaults: {
    baseURL: '',
    headers: {},
  },
};

// ============================================================================
// JWT MOCKS
// ============================================================================

export const mockJWT = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
};

// ============================================================================
// LOGGER MOCKS
// ============================================================================

export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn(() => mockLogger),
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

  mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
  mockPrisma.event.findMany.mockResolvedValue([]); // Mock overlapping events check
  mockPrisma.event.create.mockResolvedValue(mockEvent);
  mockEventPublisherService.publishEventCreated.mockResolvedValue(undefined);

  return { mockEvent, mockVenue };
};

/**
 * Setup event not found scenario
 */
export const setupEventNotFound = () => {
  mockPrisma.event.findUnique.mockResolvedValue(null);
};

/**
 * Setup venue not found scenario
 */
export const setupVenueNotFound = () => {
  mockPrisma.venue.findUnique.mockResolvedValue(null);
};

/**
 * Setup successful authentication scenario
 */
export const setupSuccessfulAuth = (userRole: string = 'USER') => {
  const mockUser = createMockUser({ role: userRole });
  const mockToken = { userId: mockUser.id, role: userRole };

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

// Mock database module
export const prisma = mockPrisma;

// Mock external services
jest.mock('../services/rabbitmq.service', () => ({
  RabbitMQService: jest.fn(() => mockRabbitMQService),
}));

jest.mock('../services/auth-validation.service', () => ({
  AuthValidationService: jest.fn(() => mockAuthValidationService),
}));

jest.mock('../services/event-publisher.service', () => ({
  eventPublisherService: mockEventPublisherService,
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
