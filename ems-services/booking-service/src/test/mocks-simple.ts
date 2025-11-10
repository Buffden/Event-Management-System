/**
 * Simplified Mock Definitions for Booking Service Tests
 *
 * This file contains simplified mocks that work better with TypeScript.
 */

import { jest } from '@jest/globals';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Factory for creating mock booking objects
 */
export const createMockBooking = (overrides: any = {}) => ({
  id: 'booking-123',
  userId: 'user-123',
  eventId: 'event-123',
  status: 'CONFIRMED',
  event: {
    id: 'event-123',
    capacity: 100,
    isActive: true,
  },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

/**
 * Factory for creating mock ticket objects
 */
export const createMockTicket = (overrides: any = {}) => ({
  id: 'ticket-123',
  bookingId: 'booking-123',
  eventId: 'event-123',
  status: 'ISSUED',
  issuedAt: new Date('2024-01-01T00:00:00.000Z'),
  expiresAt: new Date('2024-12-31T23:59:59.000Z'),
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  qrCode: { id: 'qr-123', data: 'QR_CODE_DATA', format: 'PNG' },
  scannedAt: undefined,
  ...overrides,
});

/**
 * Factory for creating mock event objects
 */
export const createMockEvent = (overrides: any = {}) => ({
  id: 'event-123',
  name: 'Test Conference',
  description: 'A test conference event',
  category: 'CONFERENCE',
  capacity: 100,
  currentBookings: 0,
  isActive: true,
  bookingStartDate: new Date('2024-11-01T00:00:00Z'),
  bookingEndDate: new Date('2024-11-30T23:59:59Z'),
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
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  ...overrides,
});

// ============================================================================
// PRISMA MOCKS
// ============================================================================

export const mockPrisma = {
  booking: {
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
  ticket: {
    findMany: jest.fn() as jest.MockedFunction<any>,
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
  },
  event: {
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
  qRCode: {
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findMany: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
  },
  attendanceRecord: {
    findMany: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
  },
  account: {
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findMany: jest.fn() as jest.MockedFunction<any>,
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
  publishEvent: jest.fn() as jest.MockedFunction<any>,
};

export const mockAuthValidationService = {
  validateToken: jest.fn() as jest.MockedFunction<any>,
  validateUserRole: jest.fn() as jest.MockedFunction<any>,
  getUserFromToken: jest.fn() as jest.MockedFunction<any>,
};

export const mockEventPublisherService = {
  publishBookingCreated: jest.fn() as jest.MockedFunction<any>,
  publishBookingConfirmed: jest.fn() as jest.MockedFunction<any>,
  publishBookingUpdated: jest.fn() as jest.MockedFunction<any>,
  publishBookingCancelled: jest.fn() as jest.MockedFunction<any>,
  publishTicketGenerated: jest.fn() as jest.MockedFunction<any>,
};

export const mockNotificationService = {
  sendBookingConfirmation: jest.fn() as jest.MockedFunction<any>,
  sendTicketNotification: jest.fn() as jest.MockedFunction<any>,
  sendBookingCancellation: jest.fn() as jest.MockedFunction<any>,
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
  sign: jest.fn() as jest.MockedFunction<any>,
  verify: jest.fn() as jest.MockedFunction<any>,
  decode: jest.fn() as jest.MockedFunction<any>,
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
 * Setup successful booking creation scenario
 */
export const setupSuccessfulBookingCreation = () => {
  const mockBooking = createMockBooking();
  const mockEvent = createMockEvent();

  mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
  mockPrisma.booking.create.mockResolvedValue(mockBooking);
  mockEventPublisherService.publishBookingCreated.mockResolvedValue(undefined);
  mockNotificationService.sendBookingConfirmation.mockResolvedValue(undefined);

  return { mockBooking, mockEvent };
};

/**
 * Setup successful ticket generation scenario
 */
export const setupSuccessfulTicketGeneration = () => {
  const mockTicket = createMockTicket();
  const mockBooking = createMockBooking();

  mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
  mockAxios.get.mockResolvedValue({
    status: 200,
    data: { success: true, data: { id: 'event-123', name: 'Test Event' } }
  });
  // Ensure the mock ticket has expiresAt set (service calculates it and passes it in data)
  // Use mockImplementation to return expiresAt from input data
  mockPrisma.ticket.create.mockImplementation(async (args: any) => {
    const baseTicket = createMockTicket();
    return {
      ...baseTicket,
      expiresAt: args.data?.expiresAt || baseTicket.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      issuedAt: args.data?.issuedAt || baseTicket.issuedAt || new Date(),
    };
  });
  mockEventPublisherService.publishTicketGenerated.mockResolvedValue(undefined);
  mockNotificationService.sendTicketNotification.mockResolvedValue(undefined);

  return { mockTicket: mockTicket, mockBooking };
};

/**
 * Setup booking not found scenario
 */
export const setupBookingNotFound = () => {
  mockPrisma.booking.findUnique.mockResolvedValue(null);
};

/**
 * Setup event not found scenario
 */
export const setupEventNotFound = () => {
  mockPrisma.event.findUnique.mockResolvedValue(null);
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
  mockPrisma.booking.findUnique.mockRejectedValue(dbError);
  mockPrisma.booking.findFirst.mockRejectedValue(dbError);
  mockPrisma.booking.findMany.mockRejectedValue(dbError);
  mockPrisma.event.findUnique.mockRejectedValue(dbError);
  mockPrisma.booking.create.mockRejectedValue(dbError);
  mockPrisma.booking.update.mockRejectedValue(dbError);
  mockPrisma.booking.delete.mockRejectedValue(dbError);
  mockPrisma.ticket.create.mockRejectedValue(dbError);
};

/**
 * Setup RabbitMQ error scenario
 */
export const setupRabbitMQError = () => {
  const mqError = new Error('RabbitMQ connection failed');
  mockRabbitMQService.sendMessage.mockRejectedValue(mqError);
  mockEventPublisherService.publishBookingCreated.mockRejectedValue(mqError);
};

/**
 * Setup existing booking scenario
 */
export const setupExistingBooking = () => {
  const mockBooking = createMockBooking({ status: 'CONFIRMED' });
  mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
  return { mockBooking };
};

/**
 * Setup event at full capacity scenario
 */
export const setupEventFullCapacity = () => {
  const mockEvent = createMockEvent({ capacity: 100, currentBookings: 100 });
  mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
  mockPrisma.booking.count.mockResolvedValue(100);
  return { mockEvent };
};

/**
 * Setup event with available capacity scenario
 */
export const setupEventAvailableCapacity = () => {
  const mockEvent = createMockEvent({ capacity: 100, currentBookings: 50 });
  mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
  mockPrisma.booking.count.mockResolvedValue(50);
  return { mockEvent };
};

/**
 * Setup successful booking cancellation scenario
 */
export const setupSuccessfulBookingCancellation = () => {
  const mockBooking = createMockBooking({ status: 'CONFIRMED' });
  const cancelledBooking = createMockBooking({ status: 'CANCELLED' });

  mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
  mockPrisma.booking.update.mockResolvedValue(cancelledBooking);
  mockEventPublisherService.publishBookingCancelled.mockResolvedValue(undefined);

  return { mockBooking, cancelledBooking };
};

/**
 * Setup QR code generation scenario
 */
export const setupQRCodeGeneration = () => {
  const mockQRCode = {
    id: 'qr-123',
    ticketId: 'ticket-123',
    data: 'ticket:ticket-123:1234567890:abc123',
    format: 'PNG',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockPrisma.qRCode.findUnique.mockResolvedValue(null); // No existing QR
  mockPrisma.qRCode.create.mockResolvedValue(mockQRCode);

  return { mockQRCode };
};

/**
 * Setup event service response scenario
 */
export const setupEventServiceResponse = (eventDetails: any = null) => {
  const defaultEventDetails = {
    id: 'event-123',
    name: 'Test Event',
    description: 'Test Description',
    category: 'CONFERENCE',
    bookingStartDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    bookingEndDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
    venue: {
      name: 'Test Venue',
      address: '123 Test St',
    },
  };

  mockAxios.get.mockResolvedValue({
    status: 200,
    data: {
      success: true,
      data: eventDetails || defaultEventDetails,
    },
  });

  return eventDetails || defaultEventDetails;
};

/**
 * Setup event service error scenario
 */
export const setupEventServiceError = () => {
  mockAxios.get.mockRejectedValue(new Error('Event service unavailable'));
};

/**
 * Setup attendance join scenario
 */
export const setupSuccessfulAttendanceJoin = () => {
  const mockBooking = createMockBooking({
    status: 'CONFIRMED',
    isAttended: false,
    joinedAt: null,
  });
  const updatedBooking = createMockBooking({
    status: 'CONFIRMED',
    isAttended: true,
    joinedAt: new Date(),
  });

  mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
  mockPrisma.booking.update.mockResolvedValue(updatedBooking);
  // Setup event service to return event that has started
  setupEventServiceResponse({
    bookingStartDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    bookingEndDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
  });

  return { mockBooking, updatedBooking };
};

/**
 * Setup admin join event scenario
 */
export const setupAdminJoinEvent = () => {
  const mockBooking = createMockBooking({
    userId: 'admin-123',
    status: 'CONFIRMED',
    isAttended: true,
    joinedAt: new Date(),
  });

  mockPrisma.booking.findFirst.mockResolvedValue(null); // No existing attendance
  mockPrisma.booking.create.mockResolvedValue(mockBooking);
  setupEventServiceResponse();

  return { mockBooking };
};

// ============================================================================
// MOCK SETUP AND RESET FUNCTIONS
// ============================================================================

/**
 * Setup all common mocks before any tests run
 */
export const setupAllMocks = () => {
  // Reset all mocks
  jest.clearAllMocks();

  // Setup default successful responses
  mockPrisma.$connect.mockResolvedValue(undefined);
  mockPrisma.$disconnect.mockResolvedValue(undefined);
  mockRabbitMQService.connect.mockResolvedValue(undefined);
  mockRabbitMQService.disconnect.mockResolvedValue(undefined);

  // Setup default ticket.create mock to always return expiresAt from input data
  // This ensures expiresAt is always available even if tests override the mock
  mockPrisma.ticket.create.mockImplementation(async (args: any) => {
    const baseTicket = createMockTicket();
    return {
      ...baseTicket,
      expiresAt: args.data?.expiresAt || baseTicket.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      issuedAt: args.data?.issuedAt || baseTicket.issuedAt || new Date(),
      createdAt: args.data?.createdAt || baseTicket.createdAt || new Date(),
    };
  });

  // Setup transaction mock to return the result of the callback
  mockPrisma.$transaction.mockImplementation(async (callback: any) => {
    const mockTx = {
      user: mockPrisma.user,
      booking: mockPrisma.booking,
      event: mockPrisma.event,
      ticket: mockPrisma.ticket,
      account: mockPrisma.account || {},
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
 * Note: This clears call history but preserves mock structure
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();
  // Don't use jest.resetAllMocks() as it destroys the mock object structure
  // Instead, manually reset each mock's implementation if needed
};

// ============================================================================
// MOCK MODULE IMPORTS
// ============================================================================
// Note: jest.mock() calls are at the end of the file after all exports.
// The factory functions execute at runtime, not during hoisting,
// so they can safely reference the mocks defined above.

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Mock database module
jest.mock('../database', () => ({
  prisma: mockPrisma,
}));

// Export prisma for direct access (helps preserve exports)
// This export between jest.mock() calls helps Jest preserve other exports
export const prisma = mockPrisma;

// Mock external services
jest.mock('../services/event-consumer.service', () => ({
  rabbitMQService: mockRabbitMQService,
}));

jest.mock('../services/auth-validation.service', () => ({
  authValidationService: mockAuthValidationService,
}));

jest.mock('../services/event-publisher.service', () => ({
  eventPublisherService: mockEventPublisherService,
}));

jest.mock('../services/notification.service', () => ({
  notificationService: mockNotificationService,
}));

// Mock HTTP client
jest.mock('axios', () => ({
  __esModule: true,
  default: mockAxios,
  isAxiosError: mockAxios.isAxiosError,
}));

// Mock JWT
jest.mock('jsonwebtoken', () => mockJWT);

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: mockLogger,
}));

// Note: All functions and mocks are already exported above.
// Re-exporting them here would cause TypeScript errors.
// The exports should be accessible despite jest.mock() calls.