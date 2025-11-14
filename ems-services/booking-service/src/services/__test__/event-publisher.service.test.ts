/**
 * Test Suite for Event Publisher Service
 *
 * Tests RabbitMQ event publishing functionality.
 */

import '@jest/globals';
import { eventPublisherService } from '../event-publisher.service';
import { logger } from '../../utils/logger';
import * as amqplib from 'amqplib';

// Mock dependencies
const mockConnect = jest.fn();
jest.mock('amqplib', () => ({
  connect: mockConnect,
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockAmqplib = amqplib as jest.Mocked<typeof amqplib>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('EventPublisherService', () => {
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockReturnValue(true),
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
      await eventPublisherService.initialize();

      expect(mockConnect).toHaveBeenCalledWith(
        process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'
      );
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('booking_events', 'topic', {
        durable: true,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ connection established successfully');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Connection failed');
      mockAmqplib.connect.mockRejectedValue(error);

      await expect(eventPublisherService.initialize()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize RabbitMQ connection',
        error
      );
    });

    it('should use custom RABBITMQ_URL from environment', async () => {
      const originalUrl = process.env.RABBITMQ_URL;
      process.env.RABBITMQ_URL = 'amqp://custom:password@custom-host:5672';

      await eventPublisherService.initialize();

      expect(mockConnect).toHaveBeenCalledWith('amqp://custom:password@custom-host:5672');

      process.env.RABBITMQ_URL = originalUrl;
    });
  });

  describe('publishBookingConfirmed()', () => {
    beforeEach(async () => {
      await eventPublisherService.initialize();
    });

    it('should publish booking confirmed event successfully', async () => {
      const message = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      await eventPublisherService.publishBookingConfirmed(message);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'booking_events',
        'booking.confirmed',
        expect.any(Buffer),
        {
          persistent: true,
          timestamp: expect.any(Number),
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Published booking confirmed event', {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
      });
    });

    it('should handle channel buffer full', async () => {
      mockChannel.publish.mockReturnValue(false);

      const message = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      await eventPublisherService.publishBookingConfirmed(message);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to publish booking confirmed event - channel buffer full'
      );
    });

    it('should throw error when channel is not initialized', async () => {
      const { EventPublisherService } = require('../event-publisher.service');
      const service = new EventPublisherService();

      const message = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      await expect(service.publishBookingConfirmed(message)).rejects.toThrow(
        'RabbitMQ channel not initialized'
      );
    });

    it('should handle publish errors', async () => {
      const error = new Error('Publish error');
      mockChannel.publish.mockImplementation(() => {
        throw error;
      });

      const message = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      await expect(eventPublisherService.publishBookingConfirmed(message)).rejects.toThrow(
        'Publish error'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish booking confirmed event',
        error,
        message
      );
    });
  });

  describe('publishBookingCancelled()', () => {
    beforeEach(async () => {
      await eventPublisherService.initialize();
    });

    it('should publish booking cancelled event successfully', async () => {
      const message = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        cancelledAt: new Date().toISOString(),
      };

      await eventPublisherService.publishBookingCancelled(message);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'booking_events',
        'booking.cancelled',
        expect.any(Buffer),
        {
          persistent: true,
          timestamp: expect.any(Number),
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Published booking cancelled event', {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
      });
    });

    it('should handle channel buffer full', async () => {
      mockChannel.publish.mockReturnValue(false);

      const message = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        cancelledAt: new Date().toISOString(),
      };

      await eventPublisherService.publishBookingCancelled(message);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to publish booking cancelled event - channel buffer full'
      );
    });

    it('should throw error when channel is not initialized', async () => {
      const { EventPublisherService } = require('../event-publisher.service');
      const service = new EventPublisherService();

      const message = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        cancelledAt: new Date().toISOString(),
      };

      await expect(service.publishBookingCancelled(message)).rejects.toThrow(
        'RabbitMQ channel not initialized'
      );
    });

    it('should handle publish errors', async () => {
      const error = new Error('Publish error');
      mockChannel.publish.mockImplementation(() => {
        throw error;
      });

      const message = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        cancelledAt: new Date().toISOString(),
      };

      await expect(eventPublisherService.publishBookingCancelled(message)).rejects.toThrow(
        'Publish error'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish booking cancelled event',
        error,
        message
      );
    });
  });

  describe('publishTicketGenerated()', () => {
    beforeEach(async () => {
      await eventPublisherService.initialize();
    });

    it('should publish ticket generated event successfully', async () => {
      const message = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        eventId: 'event-123',
        bookingId: 'booking-123',
        qrCodeData: 'qr-data',
        expiresAt: '2024-12-31T23:59:59.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      await eventPublisherService.publishTicketGenerated(message);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'booking_events',
        'ticket.generated',
        expect.any(Buffer),
        {
          persistent: true,
          timestamp: expect.any(Number),
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Published ticket generated event', {
        ticketId: 'ticket-123',
        userId: 'user-123',
        eventId: 'event-123',
      });
    });

    it('should handle channel buffer full', async () => {
      mockChannel.publish.mockReturnValue(false);

      const message = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        eventId: 'event-123',
        bookingId: 'booking-123',
        qrCodeData: 'qr-data',
        expiresAt: '2024-12-31T23:59:59.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      await eventPublisherService.publishTicketGenerated(message);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to publish ticket generated event - channel buffer full'
      );
    });

    it('should throw error when channel is not initialized', async () => {
      const { EventPublisherService } = require('../event-publisher.service');
      const service = new EventPublisherService();

      const message = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        eventId: 'event-123',
        bookingId: 'booking-123',
        qrCodeData: 'qr-data',
        expiresAt: '2024-12-31T23:59:59.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      await expect(service.publishTicketGenerated(message)).rejects.toThrow(
        'RabbitMQ channel not initialized'
      );
    });

    it('should handle publish errors', async () => {
      const error = new Error('Publish error');
      mockChannel.publish.mockImplementation(() => {
        throw error;
      });

      const message = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        eventId: 'event-123',
        bookingId: 'booking-123',
        qrCodeData: 'qr-data',
        expiresAt: '2024-12-31T23:59:59.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      await expect(eventPublisherService.publishTicketGenerated(message)).rejects.toThrow(
        'Publish error'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish ticket generated event',
        error,
        message
      );
    });
  });

  describe('close()', () => {
    it('should close connection and channel successfully', async () => {
      await eventPublisherService.initialize();
      await eventPublisherService.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ connection closed');
    });

    it('should handle errors during close', async () => {
      await eventPublisherService.initialize();
      const error = new Error('Close error');
      mockChannel.close.mockRejectedValue(error);

      await expect(eventPublisherService.close()).rejects.toThrow('Close error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to close RabbitMQ connection',
        error
      );
    });

    it('should handle close when not initialized', async () => {
      const { EventPublisherService } = require('../event-publisher.service');
      const service = new EventPublisherService();

      await service.close();

      // Should not throw
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('isConnected()', () => {
    it('should return false when not initialized', () => {
      const { EventPublisherService } = require('../event-publisher.service');
      const service = new EventPublisherService();

      expect(service.isConnected()).toBe(false);
    });

    it('should return true when initialized', async () => {
      await eventPublisherService.initialize();
      expect(eventPublisherService.isConnected()).toBe(true);
    });

    it('should return false after close', async () => {
      await eventPublisherService.initialize();
      expect(eventPublisherService.isConnected()).toBe(true);

      await eventPublisherService.close();
      expect(eventPublisherService.isConnected()).toBe(false);
    });
  });
});

