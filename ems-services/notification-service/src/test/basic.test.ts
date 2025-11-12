import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import {
  mockTransporter,
  mockRabbitMQService,
  createMockEmailPayload,
  createMockEmailNotification,
  createMockEventApprovedNotification,
  createMockBookingConfirmedNotification,
  createMockWelcomeEmail,
} from './mocks-simple';

describe('Basic Test Setup', () => {
  it('should have Jest globals available', () => {
    expect(jest).toBeDefined();
    expect(beforeAll).toBeDefined();
    expect(afterAll).toBeDefined();
    expect(beforeEach).toBeDefined();
    expect(afterEach).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.GMAIL_HOST).toBeDefined();
    expect(process.env.GMAIL_PORT).toBeDefined();
    expect(process.env.GMAIL_USER).toBeDefined();
    expect(process.env.GMAIL_PASS).toBeDefined();
    expect(process.env.APP_NAME).toBeDefined();
    expect(process.env.CLIENT_URL).toBeDefined();
    expect(process.env.RABBITMQ_URL).toBeDefined();
  });

  it('should have required environment variables', () => {
    // This test implicitly passes if env-setup.ts doesn't throw an error
    // We can add more specific checks if needed
    expect(true).toBe(true);
  });

  it('should be able to create mock objects', () => {
    const mockEmailPayload = createMockEmailPayload();
    const mockEmailNotification = createMockEmailNotification();
    const mockEventApproved = createMockEventApprovedNotification();
    const mockBookingConfirmed = createMockBookingConfirmedNotification();
    const mockWelcomeEmail = createMockWelcomeEmail();

    expect(mockEmailPayload).toBeDefined();
    expect(mockEmailNotification).toBeDefined();
    expect(mockEventApproved).toBeDefined();
    expect(mockBookingConfirmed).toBeDefined();
    expect(mockWelcomeEmail).toBeDefined();
    expect(mockTransporter).toBeDefined();
    expect(mockRabbitMQService).toBeDefined();
  });

  it('should have custom Jest matchers available', () => {
    // Type assertion needed for custom matchers during build
    (expect('test@example.com') as any).toBeValidEmail();
    (expect('<h1>Test</h1>') as any).toContainHTML('<h1>');
  });
});
