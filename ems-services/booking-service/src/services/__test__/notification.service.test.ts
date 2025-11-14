/**
 * Test Suite for Notification Service
 *
 * Tests notification sending functionality including email notifications.
 */

import '@jest/globals';
import axios from 'axios';
import { notificationService } from '../notification.service';
import { logger } from '../../utils/logger';
import * as amqplib from 'amqplib';

// Mock dependencies
jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('amqplib');

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockAmqplib = amqplib as jest.Mocked<typeof amqplib>;

describe('NotificationService', () => {
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChannel = {
      assertQueue: jest.fn().mockResolvedValue(undefined),
      sendToQueue: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockAmqplib.connect = jest.fn().mockResolvedValue(mockConnection);
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      await notificationService.initialize();
      expect(mockLogger.info).toHaveBeenCalledWith('Notification service initialized');
    });
  });

  describe('close()', () => {
    it('should close successfully', async () => {
      await notificationService.close();
      expect(mockLogger.info).toHaveBeenCalledWith('Notification service closed');
    });
  });

  describe('sendBookingConfirmationEmail()', () => {
    it('should send booking confirmation email successfully', async () => {
      const bookingMessage = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      const mockUserInfo = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockEventInfo = {
        id: 'event-123',
        name: 'Test Event',
        description: 'Test Description',
        bookingStartDate: '2024-01-01T00:00:00.000Z',
        bookingEndDate: '2024-01-02T00:00:00.000Z',
        venue: {
          name: 'Test Venue',
          address: '123 Test St',
        },
      };

      mockAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: {
            valid: true,
            user: mockUserInfo,
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: mockEventInfo,
          },
        });

      await notificationService.sendBookingConfirmationEmail(bookingMessage);

      expect(mockAxios.get).toHaveBeenCalledTimes(2);
      expect(mockAmqplib.connect).toHaveBeenCalled();
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('notification.email', {
        durable: true,
      });
      expect(mockChannel.sendToQueue).toHaveBeenCalled();
      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Booking confirmation email sent successfully',
        expect.objectContaining({
          bookingId: 'booking-123',
          userEmail: 'test@example.com',
          eventName: 'Test Event',
        })
      );
    });

    it('should handle missing user info', async () => {
      const bookingMessage = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      mockAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          valid: false,
        },
      });

      await notificationService.sendBookingConfirmationEmail(bookingMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch user or event info for booking confirmation email',
        expect.any(Error),
        expect.objectContaining({
          bookingId: 'booking-123',
          hasUserInfo: false,
        })
      );
      expect(mockAmqplib.connect).not.toHaveBeenCalled();
    });

    it('should handle missing event info', async () => {
      const bookingMessage = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      const mockUserInfo = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: {
            valid: true,
            user: mockUserInfo,
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            success: false,
          },
        });

      await notificationService.sendBookingConfirmationEmail(bookingMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch user or event info for booking confirmation email',
        expect.any(Error),
        expect.objectContaining({
          hasUserInfo: true,
          hasEventInfo: false,
        })
      );
    });

    it('should handle errors when fetching user info', async () => {
      const bookingMessage = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      mockAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await notificationService.sendBookingConfirmationEmail(bookingMessage);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch user info',
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });

    it('should handle errors when fetching event info', async () => {
      const bookingMessage = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      const mockUserInfo = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: {
            valid: true,
            user: mockUserInfo,
          },
        })
        .mockRejectedValueOnce(new Error('Network error'));

      await notificationService.sendBookingConfirmationEmail(bookingMessage);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch event info',
        expect.objectContaining({
          eventId: 'event-123',
        })
      );
    });

    it('should handle errors when sending to notification service', async () => {
      const bookingMessage = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      const mockUserInfo = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockEventInfo = {
        id: 'event-123',
        name: 'Test Event',
        description: 'Test Description',
        bookingStartDate: '2024-01-01T00:00:00.000Z',
        bookingEndDate: '2024-01-02T00:00:00.000Z',
        venue: {
          name: 'Test Venue',
          address: '123 Test St',
        },
      };

      mockAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: {
            valid: true,
            user: mockUserInfo,
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: mockEventInfo,
          },
        });

      const error = new Error('RabbitMQ error');
      mockAmqplib.connect.mockRejectedValue(error);

      // Should not throw - email failure shouldn't break the booking process
      await notificationService.sendBookingConfirmationEmail(bookingMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send booking confirmation email',
        error,
        expect.objectContaining({
          bookingId: 'booking-123',
        })
      );
    });

    it('should handle event info with missing venue', async () => {
      const bookingMessage = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      const mockUserInfo = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockEventInfo = {
        id: 'event-123',
        name: 'Test Event',
        description: 'Test Description',
        bookingStartDate: '2024-01-01T00:00:00.000Z',
        bookingEndDate: '2024-01-02T00:00:00.000Z',
      };

      mockAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: {
            valid: true,
            user: mockUserInfo,
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: mockEventInfo,
          },
        });

      await notificationService.sendBookingConfirmationEmail(bookingMessage);

      expect(mockChannel.sendToQueue).toHaveBeenCalled();
      const sentMessage = JSON.parse(
        mockChannel.sendToQueue.mock.calls[0][1].toString()
      );
      expect(sentMessage.message.venueName).toBe('Unknown Venue');
      expect(sentMessage.message.venueName).toBe('Unknown Venue');
    });

    it('should use GATEWAY_URL from environment', async () => {
      const originalUrl = process.env.GATEWAY_URL;
      process.env.GATEWAY_URL = 'http://custom-gateway';

      const bookingMessage = {
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
        createdAt: new Date().toISOString(),
      };

      const mockUserInfo = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockEventInfo = {
        id: 'event-123',
        name: 'Test Event',
        description: 'Test Description',
        bookingStartDate: '2024-01-01T00:00:00.000Z',
        bookingEndDate: '2024-01-02T00:00:00.000Z',
        venue: {
          name: 'Test Venue',
          address: '123 Test St',
        },
      };

      mockAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: {
            valid: true,
            user: mockUserInfo,
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: mockEventInfo,
          },
        });

      const { NotificationService } = require('../notification.service');
      const service = new NotificationService();

      await service.sendBookingConfirmationEmail(bookingMessage);

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('http://custom-gateway/api/auth'),
        expect.any(Object)
      );
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('http://custom-gateway/api/event'),
        expect.any(Object)
      );

      process.env.GATEWAY_URL = originalUrl;
    });
  });

  describe('getUserInfo()', () => {
    it('should fetch user info successfully', async () => {
      const mockUserInfo = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          valid: true,
          user: mockUserInfo,
        },
      });

      // Access private method through service instance
      const service = notificationService as any;
      const result = await service.getUserInfo('user-123');

      expect(result).toEqual(mockUserInfo);
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/internal/users/user-123'),
        expect.objectContaining({
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'x-internal-service': 'event-service',
          },
        })
      );
    });

    it('should return null when user is not found', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          valid: false,
        },
      });

      const service = notificationService as any;
      const result = await service.getUserInfo('user-123');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      const service = notificationService as any;
      const result = await service.getUserInfo('user-123');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('getEventInfo()', () => {
    it('should fetch event info successfully', async () => {
      const mockEventInfo = {
        id: 'event-123',
        name: 'Test Event',
        description: 'Test Description',
        bookingStartDate: '2024-01-01T00:00:00.000Z',
        bookingEndDate: '2024-01-02T00:00:00.000Z',
        venue: {
          name: 'Test Venue',
          address: '123 Test St',
        },
      };

      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          success: true,
          data: mockEventInfo,
        },
      });

      const service = notificationService as any;
      const result = await service.getEventInfo('event-123');

      expect(result).toEqual({
        id: 'event-123',
        name: 'Test Event',
        description: 'Test Description',
        bookingStartDate: '2024-01-01T00:00:00.000Z',
        bookingEndDate: '2024-01-02T00:00:00.000Z',
        venue: {
          name: 'Test Venue',
          address: '123 Test St',
        },
      });
    });

    it('should return null when event is not found', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          success: false,
        },
      });

      const service = notificationService as any;
      const result = await service.getEventInfo('event-123');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      const service = notificationService as any;
      const result = await service.getEventInfo('event-123');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});

