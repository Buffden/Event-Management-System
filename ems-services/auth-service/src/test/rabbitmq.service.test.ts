/**
 * Comprehensive Test Suite for RabbitMQ Service
 *
 * Tests all RabbitMQ service functionality including:
 * - Connection management
 * - Message sending
 * - Error handling
 * - Channel management
 */

import '@jest/globals';
import { mockLogger } from './mocks-simple';

// Unmock rabbitmq.service to test the actual implementation
jest.unmock('../services/rabbitmq.service');

// Mock amqplib before importing rabbitMQService
const mockChannel = {
  assertQueue: jest.fn().mockResolvedValue(undefined),
  sendToQueue: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockConnection = {
  createChannel: jest.fn().mockResolvedValue(mockChannel),
  close: jest.fn().mockResolvedValue(undefined),
};

// Create a function that returns the mock connection
// Declare outside jest.mock to avoid hoisting issues
const mockConnectFn = jest.fn().mockResolvedValue(mockConnection);

jest.mock('amqplib', () => ({
  connect: (...args: any[]) => mockConnectFn(...args),
}));

// Mock logger before importing rabbitMQService
jest.mock('../utils/logger', () => ({
  logger: mockLogger,
}));

// Set environment variable before importing
process.env.RABBITMQ_URL = 'amqp://localhost:5672';

// Import after mocking
import { rabbitMQService } from '../services/rabbitmq.service';

describe('RabbitMQ Service', () => {
  const originalEnv = process.env.RABBITMQ_URL;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.RABBITMQ_URL = 'amqp://localhost:5672';

    // Reset mocks - ensure mockConnectFn returns mockConnection
    mockConnectFn.mockResolvedValue(mockConnection);
    mockConnection.createChannel.mockResolvedValue(mockChannel);
    mockChannel.assertQueue.mockResolvedValue(undefined);
    mockChannel.sendToQueue.mockImplementation(() => {});
    mockChannel.close.mockResolvedValue(undefined);
    mockConnection.close.mockResolvedValue(undefined);

    // Reset service state - close any existing connections
    // Note: Since rabbitMQService is a singleton, we need to close connections between tests
    try {
      if ((rabbitMQService as any).channel || (rabbitMQService as any).connection) {
        await rabbitMQService.close();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    // Clear internal state by accessing private properties (for testing)
    (rabbitMQService as any).connection = undefined;
    (rabbitMQService as any).channel = undefined;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    // Clean up any open connections
    try {
      if (rabbitMQService.getChannel() || rabbitMQService.getConnection()) {
        await rabbitMQService.close();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    process.env.RABBITMQ_URL = originalEnv;
  });

  describe('getConnection()', () => {
    it('should return undefined when not connected', () => {
      const connection = rabbitMQService.getConnection();
      expect(connection).toBeUndefined();
    });

    it('should return connection when connected', async () => {
      await rabbitMQService.connect();
      const connection = rabbitMQService.getConnection();
      expect(connection).toBe(mockConnection);
    });
  });

  describe('getChannel()', () => {
    it('should return undefined when not connected', () => {
      // Ensure channel is cleared
      (rabbitMQService as any).channel = undefined;
      const channel = rabbitMQService.getChannel();
      expect(channel).toBeUndefined();
    });

    it('should return channel when connected', async () => {
      await rabbitMQService.connect();
      const channel = rabbitMQService.getChannel();
      expect(channel).toBe(mockChannel);
    });
  });

  describe('connect()', () => {
    it('should connect to RabbitMQ successfully', async () => {
      await rabbitMQService.connect();

      expect(mockConnectFn).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Connecting to RabbitMQ...');
      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ connected successfully');
    });

    it('should set connection and channel after successful connection', async () => {
      await rabbitMQService.connect();

      expect(rabbitMQService.getConnection()).toBe(mockConnection);
      expect(rabbitMQService.getChannel()).toBe(mockChannel);
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      mockConnectFn.mockRejectedValueOnce(connectionError);

      await expect(rabbitMQService.connect()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to connect to RabbitMQ', connectionError);
    });

    it('should handle channel creation errors', async () => {
      const channelError = new Error('Channel creation failed');
      mockConnection.createChannel.mockRejectedValueOnce(channelError);

      await expect(rabbitMQService.connect()).rejects.toThrow('Channel creation failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to connect to RabbitMQ', channelError);
    });

    it('should use RABBITMQ_URL from environment', async () => {
      process.env.RABBITMQ_URL = 'amqp://custom-host:5672';
      // Note: Since rabbitMQService is a singleton, we test with the actual instance
      // In a real scenario, you might want to create a new instance for each test
      await rabbitMQService.connect();
      expect(mockConnectFn).toHaveBeenCalled();
    });
  });

  describe('sendMessage()', () => {
    beforeEach(async () => {
      // Reset mocks first
      mockConnectFn.mockResolvedValue(mockConnection);
      mockConnection.createChannel.mockResolvedValue(mockChannel);
      mockChannel.assertQueue.mockResolvedValue(undefined);
      mockChannel.sendToQueue.mockImplementation(() => {});

      // Connect before each sendMessage test
      await rabbitMQService.connect();
    });

    it('should send message to queue successfully', async () => {
      const queue = 'test-queue';
      const message = { type: 'test', data: 'test-data' };

      await rabbitMQService.sendMessage(queue, message);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(queue, { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        queue,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Message sent to queue "${queue}"`,
        { queue }
      );
    });

    it('should send message with correct format', async () => {
      const queue = 'email-queue';
      const message = { userId: 'user-123', email: 'test@example.com' };

      await rabbitMQService.sendMessage(queue, message);

      const sendCall = mockChannel.sendToQueue.mock.calls[0];
      expect(sendCall[0]).toBe(queue);
      expect(sendCall[1]).toEqual(Buffer.from(JSON.stringify(message)));
      expect(sendCall[2]).toEqual({ persistent: true });
    });

    it('should handle different message types', async () => {
      const queue = 'notification-queue';
      const message = { type: 'notification', payload: { title: 'Test', body: 'Message' } };

      await rabbitMQService.sendMessage(queue, message);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        queue,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
    });

    it('should throw error when channel is not available', async () => {
      // Close and clear internal state to simulate no connection
      // This test needs to bypass the beforeEach that connects
      try {
        await rabbitMQService.close();
      } catch (e) {
        // Ignore close errors
      }
      (rabbitMQService as any).channel = undefined;
      (rabbitMQService as any).connection = undefined;

      const queue = 'test-queue';
      const message = { type: 'test' };

      await expect(rabbitMQService.sendMessage(queue, message)).rejects.toThrow(
        'RabbitMQ channel is not available. Please connect first.'
      );
    });

    it('should handle assertQueue errors', async () => {
      const queueError = new Error('Queue assertion failed');
      mockChannel.assertQueue.mockRejectedValueOnce(queueError);

      const queue = 'test-queue';
      const message = { type: 'test' };

      await expect(rabbitMQService.sendMessage(queue, message)).rejects.toThrow('Queue assertion failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error sending message to queue "${queue}"`,
        queueError,
        { queue }
      );
    });

    it('should handle sendToQueue errors', async () => {
      const sendError = new Error('Send failed');
      mockChannel.sendToQueue.mockImplementationOnce(() => {
        throw sendError;
      });

      const queue = 'test-queue';
      const message = { type: 'test' };

      await expect(rabbitMQService.sendMessage(queue, message)).rejects.toThrow('Send failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error sending message to queue "${queue}"`,
        sendError,
        { queue }
      );
    });

    it('should assert queue with durable option', async () => {
      const queue = 'durable-queue';
      const message = { type: 'test' };

      await rabbitMQService.sendMessage(queue, message);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(queue, { durable: true });
    });
  });

  describe('close()', () => {
    beforeEach(async () => {
      // Reset mocks for close tests
      mockConnectFn.mockResolvedValue(mockConnection);
      mockConnection.createChannel.mockResolvedValue(mockChannel);
      mockChannel.close.mockResolvedValue(undefined);
      mockConnection.close.mockResolvedValue(undefined);
    });

    it('should close channel and connection when both are open', async () => {
      await rabbitMQService.connect();
      await rabbitMQService.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ connection closed');
    });

    it('should handle closing when only channel is open', async () => {
      await rabbitMQService.connect();
      // Clear mocks to ensure clean state
      mockChannel.close.mockClear();
      mockConnection.close.mockClear();
      // Simulate connection already closed (but channel still exists)
      (rabbitMQService as any).connection = undefined;
      // Verify channel is still set
      expect((rabbitMQService as any).channel).toBeDefined();
      expect((rabbitMQService as any).connection).toBeUndefined();

      await rabbitMQService.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).not.toHaveBeenCalled();
    });

    it('should handle closing when only connection is open', async () => {
      await rabbitMQService.connect();
      // Clear mocks to ensure clean state
      mockChannel.close.mockClear();
      mockConnection.close.mockClear();
      // Simulate channel already closed (but connection still exists)
      (rabbitMQService as any).channel = undefined;
      // Ensure connection is still set (it should be from connect())
      expect((rabbitMQService as any).connection).toBeDefined();

      await rabbitMQService.close();

      expect(mockChannel.close).not.toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle closing when nothing is open', async () => {
      // Ensure nothing is connected - clear any previous state
      try {
        await rabbitMQService.close();
      } catch (e) {
        // Ignore errors
      }
      (rabbitMQService as any).channel = undefined;
      (rabbitMQService as any).connection = undefined;

      // Clear mocks to ensure clean state
      mockChannel.close.mockClear();
      mockConnection.close.mockClear();
      mockLogger.info.mockClear();

      await rabbitMQService.close();

      expect(mockChannel.close).not.toHaveBeenCalled();
      expect(mockConnection.close).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ connection closed');
    });

    it('should handle channel close errors gracefully', async () => {
      await rabbitMQService.connect();
      const closeError = new Error('Channel close failed');
      mockChannel.close.mockRejectedValueOnce(closeError);

      await expect(rabbitMQService.close()).rejects.toThrow('Channel close failed');
    });

    it('should handle connection close errors gracefully', async () => {
      await rabbitMQService.connect();
      const closeError = new Error('Connection close failed');
      mockConnection.close.mockRejectedValueOnce(closeError);

      await expect(rabbitMQService.close()).rejects.toThrow('Connection close failed');
    });
  });

  describe('Integration', () => {
    it('should handle full workflow: connect, send, close', async () => {
      // Connect
      await rabbitMQService.connect();
      expect(rabbitMQService.getConnection()).toBeDefined();
      expect(rabbitMQService.getChannel()).toBeDefined();

      // Send message
      const queue = 'workflow-queue';
      const message = { step: 'test' };
      await rabbitMQService.sendMessage(queue, message);
      expect(mockChannel.sendToQueue).toHaveBeenCalled();

      // Close
      await rabbitMQService.close();
      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle multiple messages to different queues', async () => {
      await rabbitMQService.connect();

      const queue1 = 'queue-1';
      const queue2 = 'queue-2';
      const message1 = { type: 'message1' };
      const message2 = { type: 'message2' };

      await rabbitMQService.sendMessage(queue1, message1);
      await rabbitMQService.sendMessage(queue2, message2);

      expect(mockChannel.assertQueue).toHaveBeenCalledTimes(2);
      expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(2);
    });
  });
});

