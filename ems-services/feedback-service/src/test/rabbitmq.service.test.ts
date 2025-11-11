/**
 * Comprehensive Test Suite for RabbitMQ Service
 *
 * Tests all RabbitMQ service functionality including:
 * - Connection management
 * - Queue setup
 * - Message sending
 * - Error handling
 * - Connection closing
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { mockLogger, resetAllMocks } from './mocks-simple';

// Mock amqplib before importing the service
const mockChannel: any = {
  assertQueue: jest.fn(),
  sendToQueue: jest.fn(),
  close: jest.fn(),
};

const mockConnection: any = {
  createChannel: jest.fn(),
  close: jest.fn(),
};

// Setup mock implementations
mockConnection.createChannel.mockResolvedValue(mockChannel);

// Create the mock connect function
const mockConnectFn = jest.fn() as jest.MockedFunction<(...args: any[]) => Promise<any>>;
mockConnectFn.mockResolvedValue(mockConnection);

jest.mock('amqplib', () => ({
  connect: mockConnectFn,
}));

// Import after mocking
import { RabbitMQService } from '../services/rabbitmq.service';

describe('RabbitMQService', () => {
  let rabbitmqService: RabbitMQService;
  const testRabbitmqUrl = 'amqp://localhost:5672';

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    rabbitmqService = new RabbitMQService(testRabbitmqUrl);

    // Reset mocks and set default return values
    mockConnection.createChannel.mockResolvedValue(mockChannel);
    const amqplib = require('amqplib');
    (amqplib.connect as any).mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    // Clean up any connections
    if (rabbitmqService.getConnection()) {
      rabbitmqService.close().catch(() => {
        // Ignore cleanup errors
      });
    }
  });

  describe('constructor()', () => {
    it('should create service with provided URL', () => {
      const service = new RabbitMQService('amqp://test:5672');
      expect(service.getConnection()).toBeUndefined();
      expect(service.getChannel()).toBeUndefined();
    });
  });

  describe('getConnection()', () => {
    it('should return undefined when not connected', () => {
      expect(rabbitmqService.getConnection()).toBeUndefined();
    });

    it('should return connection after connecting', async () => {
      await rabbitmqService.connect();
      expect(rabbitmqService.getConnection()).toBeDefined();
    });
  });

  describe('getChannel()', () => {
    it('should return undefined when not connected', () => {
      expect(rabbitmqService.getChannel()).toBeUndefined();
    });

    it('should return channel after connecting', async () => {
      await rabbitmqService.connect();
      expect(rabbitmqService.getChannel()).toBeDefined();
    });
  });

  describe('connect()', () => {
    it('should connect to RabbitMQ successfully', async () => {
      await rabbitmqService.connect();

      const amqplib = require('amqplib');
      expect(amqplib.connect).toHaveBeenCalledWith(testRabbitmqUrl);
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(rabbitmqService.getConnection()).toBeDefined();
      expect(rabbitmqService.getChannel()).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Connecting to RabbitMQ...');
      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ connected successfully');
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      const amqplib = require('amqplib');
      (amqplib.connect as any).mockRejectedValueOnce(connectionError);

      await expect(rabbitmqService.connect()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        expect.any(Error)
      );
      expect(rabbitmqService.getConnection()).toBeUndefined();
      expect(rabbitmqService.getChannel()).toBeUndefined();
    });

    it('should handle channel creation errors', async () => {
      const channelError = new Error('Channel creation failed');
      mockConnection.createChannel.mockRejectedValueOnce(channelError);

      await expect(rabbitmqService.connect()).rejects.toThrow('Channel creation failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        expect.any(Error)
      );
    });
  });

  describe('setupQueues()', () => {
    it('should setup queues successfully', async () => {
      await rabbitmqService.connect();
      mockChannel.assertQueue.mockResolvedValue(undefined);

      await rabbitmqService.setupQueues();

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('feedback.notifications', { durable: true });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('feedback.analytics', { durable: true });
      expect(mockLogger.info).toHaveBeenCalledWith('Feedback service queues setup completed');
    });

    it('should throw error when channel is not available', async () => {
      await expect(rabbitmqService.setupQueues()).rejects.toThrow(
        'RabbitMQ channel is not available. Please connect first.'
      );
    });

    it('should handle queue setup errors', async () => {
      await rabbitmqService.connect();
      const queueError = new Error('Queue setup failed');
      mockChannel.assertQueue.mockRejectedValueOnce(queueError);

      await expect(rabbitmqService.setupQueues()).rejects.toThrow('Queue setup failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to setup queues', expect.any(Error));
    });
  });

  describe('sendMessage()', () => {
    it('should send message successfully', async () => {
      await rabbitmqService.connect();
      mockChannel.assertQueue.mockResolvedValue(undefined);
      mockChannel.sendToQueue.mockReturnValue(true);

      const message = { eventId: 'event-123', type: 'feedback_submitted' };
      await rabbitmqService.sendMessage('feedback.notifications', message);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('feedback.notifications', { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'feedback.notifications',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Message sent to queue "feedback.notifications"',
        { queue: 'feedback.notifications' }
      );
    });

    it('should throw error when channel is not available', async () => {
      const message = { eventId: 'event-123' };
      await expect(rabbitmqService.sendMessage('feedback.notifications', message)).rejects.toThrow(
        'RabbitMQ channel is not available. Please connect first.'
      );
    });

    it('should handle message sending errors', async () => {
      await rabbitmqService.connect();
      const sendError = new Error('Send failed');
      mockChannel.assertQueue.mockRejectedValueOnce(sendError);

      const message = { eventId: 'event-123' };
      await expect(rabbitmqService.sendMessage('feedback.notifications', message)).rejects.toThrow(
        'Send failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error sending message to queue "feedback.notifications"',
        expect.any(Error),
        { queue: 'feedback.notifications' }
      );
    });

    it('should handle sendToQueue errors', async () => {
      await rabbitmqService.connect();
      mockChannel.assertQueue.mockResolvedValue(undefined);
      const sendError = new Error('Send to queue failed');
      mockChannel.sendToQueue.mockImplementation(() => {
        throw sendError;
      });

      const message = { eventId: 'event-123' };
      await expect(rabbitmqService.sendMessage('feedback.notifications', message)).rejects.toThrow(
        'Send to queue failed'
      );
    });

    it('should send complex message objects', async () => {
      await rabbitmqService.connect();
      mockChannel.assertQueue.mockResolvedValue(undefined);
      mockChannel.sendToQueue.mockReturnValue(true);

      const complexMessage = {
        eventId: 'event-123',
        userId: 'user-123',
        data: {
          rating: 5,
          comment: 'Great event!',
        },
        timestamp: new Date().toISOString(),
      };

      await rabbitmqService.sendMessage('feedback.analytics', complexMessage);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'feedback.analytics',
        Buffer.from(JSON.stringify(complexMessage)),
        { persistent: true }
      );
    });
  });

  describe('close()', () => {
    it('should close channel and connection successfully', async () => {
      await rabbitmqService.connect();
      mockChannel.close.mockResolvedValue(undefined);
      mockConnection.close.mockResolvedValue(undefined);

      await rabbitmqService.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ connection closed');
    });

    it('should handle closing when only channel exists', async () => {
      await rabbitmqService.connect();
      // Simulate connection already closed
      (rabbitmqService as any).connection = undefined;
      mockChannel.close.mockResolvedValue(undefined);

      await rabbitmqService.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).not.toHaveBeenCalled();
    });

    it('should handle closing when nothing is connected', async () => {
      await rabbitmqService.close();

      expect(mockChannel.close).not.toHaveBeenCalled();
      expect(mockConnection.close).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ connection closed');
    });

    it('should handle channel close errors gracefully', async () => {
      await rabbitmqService.connect();
      const closeError = new Error('Channel close failed');
      mockChannel.close.mockRejectedValueOnce(closeError);
      mockConnection.close.mockResolvedValue(undefined);

      // Should not throw, but log the error
      await expect(rabbitmqService.close()).rejects.toThrow('Channel close failed');
    });

    it('should handle connection close errors gracefully', async () => {
      await rabbitmqService.connect();
      mockChannel.close.mockResolvedValue(undefined);
      const closeError = new Error('Connection close failed');
      mockConnection.close.mockRejectedValueOnce(closeError);

      await expect(rabbitmqService.close()).rejects.toThrow('Connection close failed');
    });
  });
});

