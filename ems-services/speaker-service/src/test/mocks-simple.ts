/**
 * Simplified Mock Definitions for Speaker Service Tests
 */

import { jest } from '@jest/globals';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

export const createMockMessage = (overrides: any = {}) => ({
  id: 'msg-123',
  fromUserId: 'user-123',
  toUserId: 'user-456',
  subject: 'Test Message',
  content: 'Test message content',
  threadId: 'thread-123',
  eventId: 'event-123',
  status: 'SENT',
  sentAt: new Date('2024-01-01T00:00:00Z'),
  deliveredAt: null,
  readAt: null,
  attachmentUrl: null,
  attachmentName: null,
  attachmentType: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const createMockUser = (overrides: any = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'SPEAKER',
  isActive: true,
  ...overrides,
});

// ============================================================================
// PRISMA MOCKS
// ============================================================================

export const mockPrisma = {
  message: {
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

export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn(() => mockLogger),
};

export const mockJWT = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
};

// ============================================================================
// SOCKET.IO MOCKS
// ============================================================================

export const createMockSocket = (overrides: any = {}) => ({
  id: 'socket-123',
  userId: 'user-123',
  userRole: 'SPEAKER',
  handshake: {
    auth: { token: 'mock-token' },
    headers: {},
  },
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  to: jest.fn(() => ({
    emit: jest.fn(),
  })),
  ...overrides,
});

export const createMockHttpServer = () => ({
  listen: jest.fn(),
  close: jest.fn(),
});

export const createMockSocketIOServer = () => ({
  use: jest.fn(),
  on: jest.fn(),
  to: jest.fn(() => ({
    emit: jest.fn(),
  })),
  close: jest.fn(),
});

// ============================================================================
// MOCK SETUP AND RESET FUNCTIONS
// ============================================================================

export const setupAllMocks = () => {
  jest.clearAllMocks();
  mockPrisma.$connect.mockResolvedValue(undefined);
  mockPrisma.$disconnect.mockResolvedValue(undefined);
  mockLogger.info.mockImplementation(() => {});
  mockLogger.warn.mockImplementation(() => {});
  mockLogger.error.mockImplementation(() => {});
  mockLogger.debug.mockImplementation(() => {});
};

export const resetAllMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
};

// ============================================================================
// MOCK MODULE IMPORTS
// ============================================================================

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('jsonwebtoken', () => mockJWT);

jest.mock('socket.io', () => ({
  Server: jest.fn(() => createMockSocketIOServer()),
}));

export const prisma = mockPrisma;

