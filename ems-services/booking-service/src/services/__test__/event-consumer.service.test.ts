/**
 * Test Suite for Event Consumer Service
 *
 * Tests RabbitMQ event consumption functionality.
 */

import '@jest/globals';
import { eventConsumerService } from '../event-consumer.service';
import { prisma } from '../../database';
import { logger } from '../../utils/logger';
import { bookingService } from '../booking.service';
import * as amqplib from 'amqplib';

// Mock dependencies
const mockConnect = jest.fn();
jest.mock('amqplib', () => ({
  connect: mockConnect,
}));

jest.mock('../../database', () => {
  const mockEventUpsert = jest.fn();
  const mockEventUpdate = jest.fn();
  return {
    prisma: {
      event: {
        upsert: mockEventUpsert,
        update: mockEventUpdate,
      },
    },
    __mockEventUpsert: mockEventUpsert,
    __mockEventUpdate: mockEventUpdate,
  };
});

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../booking.service', () => ({
  bookingService: {
    cancelAllEventBookings: jest.fn(),
  },
}));

const mockAmqplib = amqplib as jest.Mocked<typeof amqplib>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockBookingService = bookingService as jest.Mocked<typeof bookingService>;

// Get mocks from database module
const { prisma: mockPrismaModule } = jest.requireMock('../../database');
const mockEventUpsert = (mockPrismaModule as any).__mockEventUpsert;
const mockEventUpdate = (mockPrismaModule as any).__mockEventUpdate;

describe('EventConsumerService', () => {
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue(undefined),
      bindQueue: jest.fn().mockResolvedValue(undefined),
      prefetch: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue(undefined),
      ack: jest.fn(),
      nack: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockConnect.mockResolvedValue(mockConnection);
  });

  describe('initialize()', () => {
    it('should initialize RabbitMQ connection successfully', async () => {
      await eventConsumerService.initialize();

      expect(mockConnect).toHaveBeenCalledWith(
        process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'
      );
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('event.exchange', 'topic', {
        durable: true,
      });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('booking_service_event_queue', {
        durable: true,
      });
      expect(mockChannel.bindQueue).toHaveBeenCalledTimes(2);
      expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
      expect(mockChannel.consume).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Event consumer service initialized successfully'
      );
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Connection failed');
      mockConnect.mockRejectedValue(error);

      await expect(eventConsumerService.initialize()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize event consumer service',
        error
      );
    });

    it('should use custom RABBITMQ_URL from environment', async () => {
      const originalUrl = process.env.RABBITMQ_URL;
      process.env.RABBITMQ_URL = 'amqp://custom:password@custom-host:5672';
      jest.clearAllMocks();

      await eventConsumerService.initialize();

      expect(mockConnect).toHaveBeenCalledWith('amqp://custom:password@custom-host:5672');

      process.env.RABBITMQ_URL = originalUrl;
    });
  });

  describe('handleMessage()', () => {
    beforeEach(async () => {
      await eventConsumerService.initialize();
    });

    it('should handle event published message', async () => {
      const message = {
        content: Buffer.from(
          JSON.stringify({
            eventId: 'event-123',
            capacity: 100,
          })
        ),
        fields: {
          routingKey: 'event.published',
        },
      };

      // Get the consume callback
      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      mockEventUpsert.mockResolvedValue({ id: 'event-123', capacity: 100, isActive: true });
      await consumeCallback(message);

      expect(mockEventUpsert).toHaveBeenCalledWith({
        where: { id: 'event-123' },
        update: {
          capacity: 100,
          isActive: true,
        },
        create: {
          id: 'event-123',
          capacity: 100,
          isActive: true,
        },
      });
      expect(mockChannel.ack).toHaveBeenCalledWith(message);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle event cancelled message', async () => {
      mockBookingService.cancelAllEventBookings.mockResolvedValue(5);
      mockEventUpdate.mockResolvedValue({ id: 'event-123', isActive: false });

      const message = {
        content: Buffer.from(
          JSON.stringify({
            eventId: 'event-123',
          })
        ),
        fields: {
          routingKey: 'event.cancelled',
        },
      };

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(message);

      expect(mockEventUpdate).toHaveBeenCalledWith({
        where: { id: 'event-123' },
        data: { isActive: false },
      });
      expect(mockBookingService.cancelAllEventBookings).toHaveBeenCalledWith('event-123');
      expect(mockChannel.ack).toHaveBeenCalledWith(message);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle unknown routing key', async () => {
      const message = {
        content: Buffer.from(JSON.stringify({})),
        fields: {
          routingKey: 'unknown.routing.key',
        },
      };

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(message);

      expect(mockLogger.warn).toHaveBeenCalledWith('Unknown routing key received', {
        routingKey: 'unknown.routing.key',
      });
      expect(mockChannel.ack).toHaveBeenCalledWith(message);
    });

    it('should handle null message', async () => {
      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(null);

      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should handle message processing errors', async () => {
      const error = new Error('Processing error');
      mockEventUpsert.mockRejectedValue(error);

      const message = {
        content: Buffer.from(
          JSON.stringify({
            eventId: 'event-123',
            capacity: 100,
          })
        ),
        fields: {
          routingKey: 'event.published',
        },
      };

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(message);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to handle message',
        error,
        expect.objectContaining({
          routingKey: 'event.published',
        })
      );
      expect(mockChannel.nack).toHaveBeenCalledWith(message, false, true);
    });

    it('should handle JSON parse errors', async () => {
      const message = {
        content: Buffer.from('invalid json'),
        fields: {
          routingKey: 'event.published',
        },
      };

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(message);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalled();
    });

    it('should handle errors when channel is not available', async () => {
      // Reset service state
      const service = require('../event-consumer.service').eventConsumerService;
      service.channel = undefined;

      const message = {
        content: Buffer.from(JSON.stringify({})),
        fields: {
          routingKey: 'event.published',
        },
      };

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(message);

      // Should not throw, just return early
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });
  });

  describe('close()', () => {
    it('should close connection and channel successfully', async () => {
      await eventConsumerService.initialize();
      await eventConsumerService.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Event consumer service connection closed');
    });

    it('should handle errors during close', async () => {
      await eventConsumerService.initialize();
      const error = new Error('Close error');
      mockChannel.close.mockRejectedValue(error);

      await expect(eventConsumerService.close()).rejects.toThrow('Close error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to close event consumer service connection',
        error
      );
    });

    it('should handle close when not initialized', async () => {
      // Create fresh service instance
      const { EventConsumerService } = require('../event-consumer.service');
      const service = new EventConsumerService();

      await service.close();

      // Should not throw
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('isConnected()', () => {
    it('should return false when not initialized', () => {
      const { EventConsumerService } = require('../event-consumer.service');
      const service = new EventConsumerService();

      expect(service.isConnected()).toBe(false);
    });

    it('should return true when initialized', async () => {
      await eventConsumerService.initialize();
      expect(eventConsumerService.isConnected()).toBe(true);
    });

    it('should return false after close', async () => {
      await eventConsumerService.initialize();
      expect(eventConsumerService.isConnected()).toBe(true);

      await eventConsumerService.close();
      expect(eventConsumerService.isConnected()).toBe(false);
    });
  });
});

