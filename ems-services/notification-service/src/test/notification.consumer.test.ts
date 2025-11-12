/**
 * Comprehensive Test Suite for Notification Consumer
 *
 * Tests all RabbitMQ message consumption functionality including:
 * - Message consumption
 * - Email generation and sending
 * - Error handling
 * - Connection management
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import {
  createMockEmailNotification,
  createMockEventApprovedNotification,
  createMockBookingConfirmedNotification,
  setupSuccessfulEmailSending,
  setupEmailSendingFailure,
  resetAllMocks,
} from './mocks-simple';
import { NotificationConsumer } from '../consumers/notification.consumer';
import { MESSAGE_TYPE } from '../types/types';

// Mock amqplib - create mocks inside factory to avoid hoisting issues
jest.mock('amqplib', () => {
  const mockChannel: any = {
    assertQueue: jest.fn(),
    prefetch: jest.fn(),
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
    close: jest.fn(),
  };

  const mockConnectFn = jest.fn() as jest.MockedFunction<(...args: any[]) => Promise<any>>;
  const mockConn: any = {
    createChannel: jest.fn(),
    close: jest.fn(),
  };
  mockConn.createChannel.mockResolvedValue(mockChannel);
  mockConnectFn.mockResolvedValue(mockConn);

  return {
    connect: mockConnectFn,
  };
});

// Get mockChannel reference for use in tests
// We'll access it through the mock connection in beforeEach

// Mock email services
jest.mock('../services/email.service', () => ({
  emailService: {
    sendEmail: jest.fn(),
  },
}));

jest.mock('../services/email-template.service', () => ({
  emailTemplateService: {
    generateEmailContent: jest.fn(),
  },
}));

describe('NotificationConsumer', () => {
  let consumer: NotificationConsumer;
  const testRabbitmqUrl = 'amqp://localhost:5672';

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    consumer = new NotificationConsumer(testRabbitmqUrl);

    // Get the mocked connect function and set up mocks
    const amqplib = jest.requireMock('amqplib') as any;
    const mockConnect = amqplib.connect;

    // Create a fresh mock channel for each test
    const mockChannel: any = {
      assertQueue: jest.fn(),
      prefetch: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      close: jest.fn(),
    };

    const mockConn: any = {
      createChannel: jest.fn(),
      close: jest.fn(),
    };
    mockConn.createChannel.mockResolvedValue(mockChannel);
    mockConnect.mockResolvedValue(mockConn);

    // Reset mocks
    mockChannel.assertQueue.mockResolvedValue(undefined);
    mockChannel.prefetch.mockImplementation(() => {});
    mockChannel.consume.mockImplementation(() => {});

    // Store mockChannel for use in tests
    (global as any).__mockChannel = mockChannel;
  });

  afterEach(() => {
    // Clean up
    if (consumer) {
      consumer.stop().catch(() => {
        // Ignore cleanup errors
      });
    }
  });

  describe('constructor()', () => {
    it('should create NotificationConsumer with provided URL', () => {
      const newConsumer = new NotificationConsumer('amqp://test:5672');
      expect(newConsumer).toBeDefined();
    });
  });

  describe('start()', () => {
    it('should start consumer and connect to RabbitMQ', async () => {
      const amqplib = jest.requireMock('amqplib') as any;
      const mockConnect = amqplib.connect;
      const mockChannel = (global as any).__mockChannel;

      await consumer.start();

      expect(mockConnect).toHaveBeenCalledWith(testRabbitmqUrl);
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('notification.email', { durable: true });
      expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
      expect(mockChannel.consume).toHaveBeenCalled();
    });

    it('should handle connection errors and retry', async () => {
      const amqplib = jest.requireMock('amqplib') as any;
      const mockConnect = amqplib.connect;
      const connectionError = new Error('Connection failed');
      mockConnect.mockRejectedValueOnce(connectionError);

      // Mock setTimeout to avoid actual delays in tests
      jest.useFakeTimers();
      const startPromise = consumer.start();

      // Fast-forward time to trigger retry
      jest.advanceTimersByTime(5000);
      await startPromise;

      expect(mockConnect).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should handle channel creation errors', async () => {
      const amqplib = jest.requireMock('amqplib') as any;
      const mockConnect = amqplib.connect;
      const mockConn: any = {
        createChannel: jest.fn(),
        close: jest.fn(),
      };
      const channelError = new Error('Channel creation failed');
      mockConn.createChannel.mockRejectedValueOnce(channelError);
      mockConnect.mockResolvedValueOnce(mockConn);

      jest.useFakeTimers();
      const startPromise = consumer.start();

      jest.advanceTimersByTime(5000);
      await startPromise;

      expect(mockConn.createChannel).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('handleMessage()', () => {
    let mockMessage: any;
    let emailService: any;
    let emailTemplateService: any;

    beforeEach(async () => {
      await consumer.start();
      emailService = (jest.requireMock('../services/email.service') as any).emailService;
      emailTemplateService = (jest.requireMock('../services/email-template.service') as any).emailTemplateService;

      mockMessage = {
        content: Buffer.from(JSON.stringify(createMockEmailNotification())),
      };

      setupSuccessfulEmailSending();
      emailTemplateService.generateEmailContent.mockReturnValue({
        subject: 'Test Subject',
        body: '<h1>Test Body</h1>',
      });
    });

    it('should process valid notification message', async () => {
      const mockChannel = (global as any).__mockChannel;
      const notification = createMockEmailNotification();
      mockMessage.content = Buffer.from(JSON.stringify(notification));

      // Get the consume callback
      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(mockMessage);

      expect(emailTemplateService.generateEmailContent).toHaveBeenCalledWith(notification);
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: notification.message.to,
        subject: 'Test Subject',
        body: '<h1>Test Body</h1>',
      });
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle invalid message format', async () => {
      const mockChannel = (global as any).__mockChannel;
      mockMessage.content = Buffer.from(JSON.stringify({ invalid: 'message' }));

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(mockMessage);

      expect(emailTemplateService.generateEmailContent).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle null message', async () => {
      const mockChannel = (global as any).__mockChannel;
      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(null);

      expect(emailTemplateService.generateEmailContent).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      const mockChannel = (global as any).__mockChannel;
      const notification = createMockEmailNotification();
      mockMessage.content = Buffer.from(JSON.stringify(notification));

      // Mock email service to throw an error
      emailService.sendEmail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(mockMessage);

      expect(emailTemplateService.generateEmailContent).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should process different notification types', async () => {
      const mockChannel = (global as any).__mockChannel;
      const notificationTypes = [
        createMockEmailNotification(),
        createMockEventApprovedNotification(),
        createMockBookingConfirmedNotification(),
      ];

      for (const notification of notificationTypes) {
        mockMessage.content = Buffer.from(JSON.stringify(notification));
        const consumeCallback = mockChannel.consume.mock.calls[0][1];

        emailTemplateService.generateEmailContent.mockReturnValue({
          subject: 'Test Subject',
          body: '<h1>Test Body</h1>',
        });

        await consumeCallback(mockMessage);

        expect(emailTemplateService.generateEmailContent).toHaveBeenCalledWith(notification);
        expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      }
    });

    it('should handle JSON parse errors', async () => {
      const mockChannel = (global as any).__mockChannel;
      mockMessage.content = Buffer.from('invalid json');

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(mockMessage);

      expect(emailTemplateService.generateEmailContent).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle template generation errors', async () => {
      const mockChannel = (global as any).__mockChannel;
      const notification = createMockEmailNotification();
      mockMessage.content = Buffer.from(JSON.stringify(notification));

      emailTemplateService.generateEmailContent.mockImplementation(() => {
        throw new Error('Template generation failed');
      });

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(mockMessage);

      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });
  });

  describe('stop()', () => {
    it('should stop consumer and close connections', async () => {
      const mockChannel = (global as any).__mockChannel;
      await consumer.start();
      mockChannel.close.mockResolvedValue(undefined);
      const amqplib = jest.requireMock('amqplib') as any;
      const mockConnect = amqplib.connect;
      const mockConn = await mockConnect('test');
      mockConn.close.mockResolvedValue(undefined);

      await consumer.stop();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConn.close).toHaveBeenCalled();
    });

    it('should handle stop when not started', async () => {
      await expect(consumer.stop()).resolves.not.toThrow();
    });

    it('should handle errors during shutdown gracefully', async () => {
      const mockChannel = (global as any).__mockChannel;
      await consumer.start();
      const closeError = new Error('Close failed');
      mockChannel.close.mockRejectedValueOnce(closeError);

      await expect(consumer.stop()).resolves.not.toThrow();
    });
  });
});

