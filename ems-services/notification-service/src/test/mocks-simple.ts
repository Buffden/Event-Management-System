import { jest } from '@jest/globals';
import { MESSAGE_TYPE } from '../types/types';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

export const createMockEmailPayload = (overrides: Partial<any> = {}) => ({
  to: 'test@example.com',
  subject: 'Test Email',
  body: '<h1>Test Email Body</h1>',
  ...overrides,
});

export const createMockEmailNotification = (overrides: Partial<any> = {}) => ({
  type: MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL,
  message: {
    userName: 'Test User',
    subject: 'Verify Your Email',
    link: 'https://example.com/verify?token=123',
    expiryTime: '2024-12-31T23:59:59Z',
  },
  ...overrides,
});

export const createMockEventApprovedNotification = (overrides: Partial<any> = {}) => ({
  type: MESSAGE_TYPE.EVENT_APPROVED_NOTIFICATION,
  message: {
    speakerName: 'Test Speaker',
    eventName: 'Test Conference',
    eventDescription: 'A test conference event',
    venueName: 'Test Venue',
    bookingStartDate: '2024-12-01T00:00:00Z',
    bookingEndDate: '2024-12-31T23:59:59Z',
  },
  ...overrides,
});

export const createMockBookingConfirmedNotification = (overrides: Partial<any> = {}) => ({
  type: MESSAGE_TYPE.BOOKING_CONFIRMED_NOTIFICATION,
  message: {
    attendeeName: 'Test Attendee',
    eventName: 'Test Conference',
    eventDate: '2024-12-15T10:00:00Z',
    venueName: 'Test Venue',
    bookingId: 'booking-123',
  },
  ...overrides,
});

export const createMockWelcomeEmail = (overrides: Partial<any> = {}) => ({
  type: MESSAGE_TYPE.WELCOME_EMAIL,
  message: {
    userName: 'Test User',
    userRole: 'USER',
    dashboardLink: 'https://example.com/dashboard',
  },
  ...overrides,
});

// ============================================================================
// MOCK OBJECTS FOR EXTERNAL DEPENDENCIES
// ============================================================================

// nodemailer is now mocked at module level

export const mockTransporter = {
  sendMail: jest.fn() as jest.MockedFunction<any>,
  verify: jest.fn() as jest.MockedFunction<any>,
  close: jest.fn() as jest.MockedFunction<any>,
};

export const mockRabbitMQService = {
  connect: jest.fn() as jest.MockedFunction<any>,
  disconnect: jest.fn() as jest.MockedFunction<any>,
  sendMessage: jest.fn() as jest.MockedFunction<any>,
  consumeMessage: jest.fn() as jest.MockedFunction<any>,
  publishEvent: jest.fn() as jest.MockedFunction<any>,
};

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

export const setupSuccessfulEmailSending = () => {
  mockTransporter.sendMail.mockResolvedValue({
    messageId: 'test-message-id-123',
    response: 'Email sent successfully',
  });
};

export const setupEmailSendingFailure = () => {
  const emailError = new Error('SMTP connection failed');
  mockTransporter.sendMail.mockRejectedValue(emailError);
};

export const setupSuccessfulTemplateGeneration = () => {
  // Mock successful template generation - no external dependencies needed
  return true;
};

export const setupTemplateGenerationFailure = () => {
  // Mock template generation failure
  return false;
};

export const setupRabbitMQError = () => {
  const mqError = new Error('RabbitMQ connection failed');
  mockRabbitMQService.sendMessage.mockRejectedValue(mqError);
  mockRabbitMQService.consumeMessage.mockRejectedValue(mqError);
};

// ============================================================================
// GLOBAL MOCK SETUP AND RESET
// ============================================================================

export const setupAllMocks = () => {
  jest.clearAllMocks();
  mockRabbitMQService.connect.mockResolvedValue(undefined);
  mockRabbitMQService.disconnect.mockResolvedValue(undefined);
  mockLogger.info.mockImplementation(() => {});
  mockLogger.warn.mockImplementation(() => {});
  mockLogger.error.mockImplementation(() => {});
  mockLogger.debug.mockImplementation(() => {});
  mockTransporter.verify.mockResolvedValue(true);
  mockTransporter.close.mockResolvedValue(undefined);
};

export const resetAllMocks = () => {
  jest.resetAllMocks();
  setupAllMocks(); // Re-apply default mocks after reset
};

// ============================================================================
// MODULE MOCKS
// ============================================================================

// Mock nodemailer module
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => mockTransporter),
}));

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

export const mockConsole = () => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
};

export const restoreConsole = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};
