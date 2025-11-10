/**
 * RabbitMQ Service Tests
 *
 * Tests for RabbitMQ service including:
 * - Connection management
 * - Message sending
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { mockLogger } from '../../test/mocks-simple';

// Unmock rabbitmq.service to test the actual implementation
jest.unmock('../rabbitmq.service');

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
const mockConnectFn = jest.fn().mockResolvedValue(mockConnection);

jest.mock('amqplib', () => ({
  connect: (...args: any[]) => mockConnectFn(...args),
}));

// Mock logger before importing rabbitMQService
jest.mock('../../utils/logger', () => ({
  logger: mockLogger,
}));

// Set environment variable before importing
process.env.RABBITMQ_URL = 'amqp://localhost:5672';

// Import after mocking
import { rabbitMQService } from '../rabbitmq.service';

describe('RabbitMQ Service', () => {
  const originalEnv = process.env.RABBITMQ_URL;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.RABBITMQ_URL = 'amqp://localhost:5672';

    // Reset mocks
    mockConnectFn.mockResolvedValue(mockConnection);
    mockConnection.createChannel.mockResolvedValue(mockChannel);
    mockChannel.assertQueue.mockResolvedValue(undefined);
    mockChannel.sendToQueue.mockImplementation(() => {});
    mockChannel.close.mockResolvedValue(undefined);
    mockConnection.close.mockResolvedValue(undefined);

    // Reset service state
    try {
      if ((rabbitMQService as any).channel || (rabbitMQService as any).connection) {
        await rabbitMQService.close();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    (rabbitMQService as any).connection = undefined;
    (rabbitMQService as any).channel = undefined;
  });

  afterEach(async () => {
    jest.clearAllMocks();
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
      expect(rabbitMQService.getConnection()).toBe(mockConnection);
      expect(rabbitMQService.getChannel()).toBe(mockChannel);
    });

    it('should throw error when connection fails', async () => {
      const connectionError = new Error('Connection failed');
      mockConnectFn.mockRejectedValue(connectionError);

      await expect(rabbitMQService.connect()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw error when channel creation fails', async () => {
      const channelError = new Error('Channel creation failed');
      mockConnection.createChannel.mockRejectedValue(channelError);

      await expect(rabbitMQService.connect()).rejects.toThrow('Channel creation failed');
    });
  });

  describe('sendMessage()', () => {
    beforeEach(async () => {
      await rabbitMQService.connect();
    });

    it('should send message to queue successfully', async () => {
      const queueName = 'test.queue';
      const message = { type: 'test', data: { id: '123' } };

      await rabbitMQService.sendMessage(queueName, message);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(queueName, { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        queueName,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
    });

    it('should throw error when channel is not available', async () => {
      // Clear channel
      (rabbitMQService as any).channel = undefined;

      await expect(
        rabbitMQService.sendMessage('test.queue', {})
      ).rejects.toThrow('RabbitMQ channel is not available. Please connect first.');
    });

    it('should throw error when assertQueue fails', async () => {
      const assertError = new Error('Queue assertion failed');
      mockChannel.assertQueue.mockRejectedValue(assertError);

      await expect(
        rabbitMQService.sendMessage('test.queue', {})
      ).rejects.toThrow('Queue assertion failed');
    });

    it('should throw error when sendToQueue fails', async () => {
      mockChannel.sendToQueue.mockImplementation(() => {
        throw new Error('Send failed');
      });

      await expect(
        rabbitMQService.sendMessage('test.queue', {})
      ).rejects.toThrow('Send failed');
    });
  });

  describe('close()', () => {
    it('should close channel and connection when both are open', async () => {
      await rabbitMQService.connect();
      await rabbitMQService.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle closing when only channel is open', async () => {
      await rabbitMQService.connect();
      (rabbitMQService as any).connection = undefined;

      await rabbitMQService.close();

      expect(mockChannel.close).toHaveBeenCalled();
    });

    it('should handle closing when only connection is open', async () => {
      await rabbitMQService.connect();
      (rabbitMQService as any).channel = undefined;

      await rabbitMQService.close();

      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle closing when nothing is open', async () => {
      await rabbitMQService.close();

      expect(mockChannel.close).not.toHaveBeenCalled();
      expect(mockConnection.close).not.toHaveBeenCalled();
    });
  });
});

