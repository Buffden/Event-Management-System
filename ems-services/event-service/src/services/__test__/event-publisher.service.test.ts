/**
 * Event Publisher Service Tests
 *
 * Tests for event publisher service including:
 * - Publishing event messages
 * - Error handling
 * - Queue setup
 *
 * NOTE: These tests have limitations due to Jest's module mocking behavior
 * with singleton services. The service captures rabbitMQService at module load time,
 * making it difficult to mock. For proper testability, the service should use
 * dependency injection.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Declare mocks outside jest.mock to avoid hoisting issues
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// CRITICAL: Unmock event-publisher.service to test the actual implementation
// The global mocks-simple.ts mocks this service, but we want to test the real service
jest.unmock('../event-publisher.service');

// Mock logger first
jest.mock('../../utils/logger', () => ({
  logger: mockLogger,
}));

// Create mock function that will be shared - must be declared before jest.mock
const mockGetChannelFn = jest.fn();

// Mock rabbitmq service - use factory to ensure same reference
jest.mock('../rabbitmq.service', () => {
  return {
    rabbitMQService: {
      getChannel: mockGetChannelFn,
      connect: jest.fn(),
      disconnect: jest.fn(),
      sendMessage: jest.fn(),
      consumeMessage: jest.fn(),
      publishEvent: jest.fn(),
    },
  };
});

// Import after mocks
import { eventPublisherService } from '../event-publisher.service';
import { rabbitMQService } from '../rabbitmq.service';

describe('EventPublisherService', () => {
  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a fresh mock channel for each test
    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockReturnValue(true),
      assertQueue: jest.fn().mockResolvedValue(undefined),
      bindQueue: jest.fn().mockResolvedValue(undefined),
    };

    // Set up the mock to return the channel
    mockGetChannelFn.mockReturnValue(mockChannel);

    // CRITICAL: Replace getChannel on the imported rabbitMQService using Object.defineProperty
    // This ensures the service uses our mock even if it captured the reference at module load
    Object.defineProperty(rabbitMQService, 'getChannel', {
      value: mockGetChannelFn,
      writable: true,
      configurable: true,
    });
  });

  describe('publishEventPublished', () => {
    it('should publish event.published message successfully', async () => {
      const message = {
        eventId: 'event-123',
        title: 'Test Event',
        status: 'PUBLISHED',
        timestamp: new Date().toISOString(),
      };

      // Verify the service and method exist
      expect(eventPublisherService).toBeDefined();
      expect(eventPublisherService.publishEventPublished).toBeDefined();
      expect(typeof eventPublisherService.publishEventPublished).toBe('function');

      // Verify rabbitMQService is mocked
      expect(rabbitMQService).toBeDefined();
      expect(rabbitMQService.getChannel).toBeDefined();
      expect(rabbitMQService.getChannel).toBe(mockGetChannelFn);

      // Call the service method
      await eventPublisherService.publishEventPublished(message);

      // Verify getChannel was called (if the mock is working)
      expect(mockGetChannelFn).toHaveBeenCalled();
      expect(mockGetChannelFn).toHaveBeenCalledTimes(1);

      // Verify channel methods were called
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('event.exchange', 'topic', { durable: true });
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'event.exchange',
        'event.published',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Event.published message published successfully',
        expect.objectContaining({
          eventId: 'event-123',
          routingKey: 'event.published',
        })
      );
    });

    it('should throw error when channel is not available', async () => {
      mockGetChannelFn.mockReturnValueOnce(null);
      const message = {
        eventId: 'event-123',
        title: 'Test Event',
        status: 'PUBLISHED',
        timestamp: new Date().toISOString(),
      };

      await expect(eventPublisherService.publishEventPublished(message)).rejects.toThrow(
        'RabbitMQ channel is not available'
      );
      expect(mockGetChannelFn).toHaveBeenCalled();
    });

    it('should throw error when publish returns false', async () => {
      // Create a new mock channel with publish returning false
      const mockChannelWithFalsePublish = {
        ...mockChannel,
        publish: jest.fn().mockReturnValue(false),
      };
      mockGetChannelFn.mockReturnValueOnce(mockChannelWithFalsePublish);

      const message = {
        eventId: 'event-123',
        title: 'Test Event',
        status: 'PUBLISHED',
        timestamp: new Date().toISOString(),
      };

      await expect(eventPublisherService.publishEventPublished(message)).rejects.toThrow(
        'Failed to publish event.published message'
      );
      expect(mockGetChannelFn).toHaveBeenCalled();
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Publish failed');
      // Create a new mock channel with publish throwing error
      const mockChannelWithError = {
        ...mockChannel,
        publish: jest.fn().mockImplementation(() => {
          throw error;
        }),
      };
      mockGetChannelFn.mockReturnValueOnce(mockChannelWithError);

      const message = {
        eventId: 'event-123',
        title: 'Test Event',
        status: 'PUBLISHED',
        timestamp: new Date().toISOString(),
      };

      await expect(eventPublisherService.publishEventPublished(message)).rejects.toThrow('Publish failed');
      expect(mockGetChannelFn).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event.published message',
        error,
        expect.objectContaining({ eventId: 'event-123' })
      );
    });
  });

  describe('publishEventUpdated', () => {
    it('should publish event.updated message successfully', async () => {
      const message = {
        eventId: 'event-123',
        title: 'Updated Event',
        changes: ['title'],
        timestamp: new Date().toISOString(),
      };

      await eventPublisherService.publishEventUpdated(message);

      expect(mockChannel.assertExchange).toHaveBeenCalledWith('event.exchange', 'topic', { durable: true });
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'event.exchange',
        'event.updated',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Event.updated message published successfully',
        expect.objectContaining({
          eventId: 'event-123',
          routingKey: 'event.updated',
        })
      );
    });

    it('should throw error when channel is not available', async () => {
      mockGetChannelFn.mockReturnValueOnce(null);
      const message = {
        eventId: 'event-123',
        title: 'Updated Event',
        changes: ['title'],
        timestamp: new Date().toISOString(),
      };

      await expect(eventPublisherService.publishEventUpdated(message)).rejects.toThrow(
        'RabbitMQ channel is not available'
      );
      expect(mockGetChannelFn).toHaveBeenCalled();
    });

    it('should throw error when publish returns false', async () => {
      // Create a new mock channel with publish returning false
      const mockChannelWithFalsePublish = {
        ...mockChannel,
        publish: jest.fn().mockReturnValue(false),
      };
      mockGetChannelFn.mockReturnValueOnce(mockChannelWithFalsePublish);
      const message = {
        eventId: 'event-123',
        title: 'Updated Event',
        changes: ['title'],
        timestamp: new Date().toISOString(),
      };

      await expect(eventPublisherService.publishEventUpdated(message)).rejects.toThrow(
        'Failed to publish event.updated message'
      );
      expect(mockGetChannelFn).toHaveBeenCalled();
    });
  });

  describe('publishEventCancelled', () => {
    it('should publish event.cancelled message successfully', async () => {
      const message = {
        eventId: 'event-123',
        title: 'Cancelled Event',
        timestamp: new Date().toISOString(),
      };

      expect(eventPublisherService.publishEventCancelled).toBeDefined();
      expect(typeof eventPublisherService.publishEventCancelled).toBe('function');

      await eventPublisherService.publishEventCancelled(message);

      expect(mockChannel.assertExchange).toHaveBeenCalledWith('event.exchange', 'topic', { durable: true });
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'event.exchange',
        'event.cancelled',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Event.cancelled message published successfully',
        expect.objectContaining({
          eventId: 'event-123',
          routingKey: 'event.cancelled',
        })
      );
    });

    it('should throw error when channel is not available', async () => {
      mockGetChannelFn.mockReturnValueOnce(null);
      const message = {
        eventId: 'event-123',
        title: 'Cancelled Event',
        timestamp: new Date().toISOString(),
      };

      await expect(eventPublisherService.publishEventCancelled(message)).rejects.toThrow(
        'RabbitMQ channel is not available'
      );
      expect(mockGetChannelFn).toHaveBeenCalled();
    });

    it('should throw error when publish returns false', async () => {
      // Create a new mock channel with publish returning false
      const mockChannelWithFalsePublish = {
        ...mockChannel,
        publish: jest.fn().mockReturnValue(false),
      };
      mockGetChannelFn.mockReturnValueOnce(mockChannelWithFalsePublish);
      const message = {
        eventId: 'event-123',
        title: 'Cancelled Event',
        timestamp: new Date().toISOString(),
      };

      await expect(eventPublisherService.publishEventCancelled(message)).rejects.toThrow(
        'Failed to publish event.cancelled message'
      );
      expect(mockGetChannelFn).toHaveBeenCalled();
    });
  });

  describe('publishEventDeleted', () => {
    it('should publish event.deleted message successfully', async () => {
      const message = {
        eventId: 'event-123',
        title: 'Deleted Event',
        timestamp: new Date().toISOString(),
      };

      await eventPublisherService.publishEventDeleted(message);

      expect(mockChannel.assertExchange).toHaveBeenCalledWith('event.exchange', 'topic', { durable: true });
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'event.exchange',
        'event.deleted',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Event.deleted message published successfully',
        expect.objectContaining({
          eventId: 'event-123',
          routingKey: 'event.deleted',
        })
      );
    });

    it('should throw error when channel is not available', async () => {
      mockGetChannelFn.mockReturnValueOnce(null);
      const message = {
        eventId: 'event-123',
        title: 'Deleted Event',
        timestamp: new Date().toISOString(),
      };

      await expect(eventPublisherService.publishEventDeleted(message)).rejects.toThrow(
        'RabbitMQ channel is not available'
      );
      expect(mockGetChannelFn).toHaveBeenCalled();
    });

    it('should throw error when publish returns false', async () => {
      // Create a new mock channel with publish returning false
      const mockChannelWithFalsePublish = {
        ...mockChannel,
        publish: jest.fn().mockReturnValue(false),
      };
      mockGetChannelFn.mockReturnValueOnce(mockChannelWithFalsePublish);
      const message = {
        eventId: 'event-123',
        title: 'Deleted Event',
        timestamp: new Date().toISOString(),
      };

      await expect(eventPublisherService.publishEventDeleted(message)).rejects.toThrow(
        'Failed to publish event.deleted message'
      );
      expect(mockGetChannelFn).toHaveBeenCalled();
    });
  });

  describe('setupQueues', () => {
    it('should setup queues and bindings successfully', async () => {
      expect(eventPublisherService.setupQueues).toBeDefined();
      expect(typeof eventPublisherService.setupQueues).toBe('function');

      await eventPublisherService.setupQueues();

      expect(mockChannel.assertExchange).toHaveBeenCalledWith('event.exchange', 'topic', { durable: true });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('booking-service.event.queue', { durable: true });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('notification-service.event.queue', { durable: true });
      expect(mockChannel.bindQueue).toHaveBeenCalledTimes(8); // 2 queues × 4 routing keys
      expect(mockLogger.info).toHaveBeenCalledWith('Event publisher queues and bindings setup completed');
    });

    it('should throw error when channel is not available', async () => {
      mockGetChannelFn.mockReturnValueOnce(null);

      await expect(eventPublisherService.setupQueues()).rejects.toThrow(
        'RabbitMQ channel is not available'
      );
      expect(mockGetChannelFn).toHaveBeenCalled();
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Setup failed');
      // Create a new mock channel with assertExchange throwing error
      const mockChannelWithError = {
        ...mockChannel,
        assertExchange: jest.fn().mockRejectedValue(error),
      };
      mockGetChannelFn.mockReturnValueOnce(mockChannelWithError);

      await expect(eventPublisherService.setupQueues()).rejects.toThrow('Setup failed');
      expect(mockGetChannelFn).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to setup event publisher queues',
        error
      );
    });
  });
});

