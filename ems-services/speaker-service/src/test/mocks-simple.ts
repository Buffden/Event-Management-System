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
// MOCK DATA FACTORIES
// ============================================================================

export const createMockSpeakerProfile = (overrides: any = {}) => ({
  id: 'speaker-123',
  userId: 'user-123',
  name: 'Test Speaker',
  email: 'speaker@example.com',
  bio: 'Test bio',
  expertise: ['Technology', 'AI'],
  isAvailable: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const createMockInvitation = (overrides: any = {}) => ({
  id: 'invitation-123',
  speakerId: 'speaker-123',
  eventId: 'event-123',
  sessionId: null,
  message: 'Test invitation message',
  status: 'PENDING',
  sentAt: new Date('2024-01-01T00:00:00Z'),
  respondedAt: null,
  joinedAt: null,
  leftAt: null,
  isAttended: false,
  materialsSelected: [],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const createMockMaterial = (overrides: any = {}) => ({
  id: 'material-123',
  speakerId: 'speaker-123',
  eventId: 'event-123',
  fileName: 'test-presentation.pdf',
  filePath: '/tmp/test-presentation.pdf',
  fileSize: 1024000,
  mimeType: 'application/pdf',
  uploadDate: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

// ============================================================================
// PRISMA MOCKS
// ============================================================================

export const mockPrisma = {
  speakerProfile: {
    findMany: jest.fn() as jest.MockedFunction<any>,
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    updateMany: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    deleteMany: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
  },
  speakerInvitation: {
    findMany: jest.fn() as jest.MockedFunction<any>,
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    deleteMany: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
  },
  presentationMaterial: {
    findMany: jest.fn() as jest.MockedFunction<any>,
    findUnique: jest.fn() as jest.MockedFunction<any>,
    findFirst: jest.fn() as jest.MockedFunction<any>,
    create: jest.fn() as jest.MockedFunction<any>,
    update: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
  },
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

// ============================================================================
// EXTERNAL SERVICE MOCKS
// ============================================================================

export const mockAxios = {
  get: jest.fn() as jest.MockedFunction<any>,
  post: jest.fn() as jest.MockedFunction<any>,
  put: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
  patch: jest.fn() as jest.MockedFunction<any>,
  isAxiosError: jest.fn() as jest.MockedFunction<any>,
};

export const mockRabbitMQService = {
  connect: jest.fn() as jest.MockedFunction<any>,
  disconnect: jest.fn() as jest.MockedFunction<any>,
  sendMessage: jest.fn() as jest.MockedFunction<any>,
  consumeMessage: jest.fn() as jest.MockedFunction<any>,
};

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
  mockAxios.isAxiosError.mockReturnValue(false);
};

export const resetAllMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  setupAllMocks();
};

// ============================================================================
// MOCK MODULE IMPORTS
// ============================================================================

// ============================================================================
// MODULE MOCKS
// ============================================================================

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('jsonwebtoken', () => mockJWT);

jest.mock('axios', () => ({
  default: mockAxios,
  isAxiosError: (...args: any[]) => mockAxios.isAxiosError(...args),
}));

jest.mock('socket.io', () => ({
  Server: jest.fn(() => createMockSocketIOServer()),
}));

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    access: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

export const prisma = mockPrisma;

