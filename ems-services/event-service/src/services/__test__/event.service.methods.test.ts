/**
 * EventService Methods Coverage Tests
 *
 * This file contains tests for previously uncovered methods:
 * - submitEvent
 * - approveEvent
 * - rejectEvent
 * - cancelEvent
 * - deleteEvent
 * - updateEvent
 * - getSpeakerInfo (via createEvent and approveEvent)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EventService } from '../event.service';
import {
  mockPrisma,
  mockAxios,
  createMockEvent,
  createMockVenue,
  mockEventPublisherService,
  mockRabbitMQService,
  mockLogger,
  resetAllMocks,
} from '../../test/mocks-simple';
import { EventStatus } from '../../../generated/prisma';

describe('EventService Methods Coverage', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService();
    resetAllMocks();
    mockAxios.isAxiosError.mockReturnValue(false);
  });

  describe('submitEvent', () => {
    it('should submit event for approval when in DRAFT status', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.DRAFT,
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const updatedEvent = createMockEvent({
        ...existingEvent,
        status: EventStatus.PENDING_APPROVAL,
        rejectionReason: null,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.event.update.mockResolvedValue({
        ...updatedEvent,
        venue: createMockVenue(),
      });

      const result = await eventService.submitEvent(eventId, speakerId);

      expect(result).toBeDefined();
      expect(result.status).toBe(EventStatus.PENDING_APPROVAL);
      expect(mockPrisma.event.update).toHaveBeenCalledWith({
        where: { id: eventId },
        data: {
          status: EventStatus.PENDING_APPROVAL,
          rejectionReason: null,
        },
        include: {
          venue: true,
          sessions: {
            include: {
              speakers: true,
            },
          },
        },
      });
    });

    it('should submit event for approval when in REJECTED status', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.REJECTED,
        rejectionReason: 'Previous rejection',
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const updatedEvent = createMockEvent({
        ...existingEvent,
        status: EventStatus.PENDING_APPROVAL,
        rejectionReason: null,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.event.update.mockResolvedValue({
        ...updatedEvent,
        venue: createMockVenue(),
      });

      const result = await eventService.submitEvent(eventId, speakerId);

      expect(result).toBeDefined();
      expect(result.status).toBe(EventStatus.PENDING_APPROVAL);
    });

    it('should throw error if event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(
        eventService.submitEvent('non-existent', 'speaker-123')
      ).rejects.toThrow('Event not found');
    });

    it('should throw error if speakerId does not match', async () => {
      const existingEvent = createMockEvent({
        id: 'event-123',
        speakerId: 'different-speaker',
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });

      await expect(
        eventService.submitEvent('event-123', 'speaker-123')
      ).rejects.toThrow('Unauthorized: You can only submit your own events');
    });

    it('should throw error if event is not in DRAFT or REJECTED status', async () => {
      const existingEvent = createMockEvent({
        id: 'event-123',
        speakerId: 'speaker-123',
        status: EventStatus.PUBLISHED,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });

      await expect(
        eventService.submitEvent('event-123', 'speaker-123')
      ).rejects.toThrow('Event can only be submitted when in DRAFT or REJECTED status');
    });
  });

  describe('approveEvent', () => {
    it('should approve event and publish it', async () => {
      const eventId = 'event-123';
      const existingEvent = createMockEvent({
        id: eventId,
        speakerId: 'speaker-123',
        status: EventStatus.PENDING_APPROVAL,
        name: 'Test Event',
        description: 'Test Description',
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const updatedEvent = createMockEvent({
        ...existingEvent,
        status: EventStatus.PUBLISHED,
      });

      const mockVenue = createMockVenue({ capacity: 100 });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: mockVenue,
      });
      mockPrisma.event.update.mockResolvedValue({
        ...updatedEvent,
        venue: mockVenue,
      });
      mockEventPublisherService.publishEventPublished.mockResolvedValue(undefined);
      mockRabbitMQService.sendMessage.mockResolvedValue(undefined);
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          user: {
            id: 'speaker-123',
            name: 'Test Speaker',
            email: 'speaker@test.com',
            role: 'SPEAKER',
          },
        },
      });

      const result = await eventService.approveEvent(eventId);

      expect(result).toBeDefined();
      expect(result.status).toBe(EventStatus.PUBLISHED);
      expect(mockEventPublisherService.publishEventPublished).toHaveBeenCalled();
      expect(mockRabbitMQService.sendMessage).toHaveBeenCalled();
    });

    it('should throw error if event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(eventService.approveEvent('non-existent')).rejects.toThrow(
        'Event not found'
      );
    });

    it('should throw error if event is not in PENDING_APPROVAL status', async () => {
      const existingEvent = createMockEvent({
        id: 'event-123',
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });

      await expect(eventService.approveEvent('event-123')).rejects.toThrow(
        'Event must be in PENDING_APPROVAL status to be approved'
      );
    });

    it('should handle case when speaker info cannot be retrieved', async () => {
      const eventId = 'event-123';
      const existingEvent = createMockEvent({
        id: eventId,
        speakerId: 'speaker-123',
        status: EventStatus.PENDING_APPROVAL,
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const updatedEvent = createMockEvent({
        ...existingEvent,
        status: EventStatus.PUBLISHED,
      });

      const mockVenue = createMockVenue({ capacity: 100 });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: mockVenue,
      });
      mockPrisma.event.update.mockResolvedValue({
        ...updatedEvent,
        venue: mockVenue,
      });
      mockEventPublisherService.publishEventPublished.mockResolvedValue(undefined);
      mockAxios.get.mockResolvedValue({
        status: 404,
        data: {},
      });

      const result = await eventService.approveEvent(eventId);

      expect(result).toBeDefined();
      expect(result.status).toBe(EventStatus.PUBLISHED);
    });
  });

  describe('rejectEvent', () => {
    it('should reject event with rejection reason', async () => {
      const eventId = 'event-123';
      const rejectionReason = 'Event does not meet requirements';
      const existingEvent = createMockEvent({
        id: eventId,
        status: EventStatus.PENDING_APPROVAL,
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const updatedEvent = createMockEvent({
        ...existingEvent,
        status: EventStatus.REJECTED,
        rejectionReason,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.event.update.mockResolvedValue({
        ...updatedEvent,
        venue: createMockVenue(),
      });

      const result = await eventService.rejectEvent(eventId, rejectionReason);

      expect(result).toBeDefined();
      expect(result.status).toBe(EventStatus.REJECTED);
      expect(result.rejectionReason).toBe(rejectionReason);
      expect(mockPrisma.event.update).toHaveBeenCalledWith({
        where: { id: eventId },
        data: {
          status: EventStatus.REJECTED,
          rejectionReason,
        },
        include: {
          venue: true,
          sessions: {
            include: {
              speakers: true,
            },
          },
        },
      });
    });

    it('should throw error if event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(
        eventService.rejectEvent('non-existent', 'reason')
      ).rejects.toThrow('Event not found');
    });

    it('should throw error if event is not in PENDING_APPROVAL status', async () => {
      const existingEvent = createMockEvent({
        id: 'event-123',
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });

      await expect(
        eventService.rejectEvent('event-123', 'reason')
      ).rejects.toThrow('Event must be in PENDING_APPROVAL status to be rejected');
    });
  });

  describe('cancelEvent', () => {
    it('should cancel a published event', async () => {
      const eventId = 'event-123';
      const existingEvent = createMockEvent({
        id: eventId,
        status: EventStatus.PUBLISHED,
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const updatedEvent = createMockEvent({
        ...existingEvent,
        status: EventStatus.CANCELLED,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.event.update.mockResolvedValue({
        ...updatedEvent,
        venue: createMockVenue(),
      });
      mockEventPublisherService.publishEventCancelled.mockResolvedValue(undefined);

      const result = await eventService.cancelEvent(eventId);

      expect(result).toBeDefined();
      expect(result.status).toBe(EventStatus.CANCELLED);
      expect(mockEventPublisherService.publishEventCancelled).toHaveBeenCalledWith({
        eventId,
      });
    });

    it('should throw error if event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(eventService.cancelEvent('non-existent')).rejects.toThrow(
        'Event not found'
      );
    });

    it('should throw error if event is not in PUBLISHED status', async () => {
      const existingEvent = createMockEvent({
        id: 'event-123',
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });

      await expect(eventService.cancelEvent('event-123')).rejects.toThrow(
        'Event must be in PUBLISHED status to be cancelled'
      );
    });
  });

  describe('deleteEvent', () => {
    it('should delete event when in DRAFT status', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue(existingEvent);
      mockPrisma.event.delete.mockResolvedValue(existingEvent);

      await eventService.deleteEvent(eventId, speakerId);

      expect(mockPrisma.event.delete).toHaveBeenCalledWith({
        where: { id: eventId },
      });
    });

    it('should throw error if event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(
        eventService.deleteEvent('non-existent', 'speaker-123')
      ).rejects.toThrow('Event not found');
    });

    it('should throw error if speakerId does not match', async () => {
      const existingEvent = createMockEvent({
        id: 'event-123',
        speakerId: 'different-speaker',
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue(existingEvent);

      await expect(
        eventService.deleteEvent('event-123', 'speaker-123')
      ).rejects.toThrow('Unauthorized: You can only delete your own events');
    });

    it('should throw error if event is not in DRAFT status', async () => {
      const existingEvent = createMockEvent({
        id: 'event-123',
        speakerId: 'speaker-123',
        status: EventStatus.PUBLISHED,
      });

      mockPrisma.event.findUnique.mockResolvedValue(existingEvent);

      await expect(
        eventService.deleteEvent('event-123', 'speaker-123')
      ).rejects.toThrow('Event can only be deleted when in DRAFT status');
    });

    it('should handle successful invitation deletion', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue(existingEvent);
      mockPrisma.event.delete.mockResolvedValue(existingEvent);
      mockAxios.delete.mockResolvedValue({
        status: 200,
        data: { success: true, deletedCount: 5 },
      });

      await eventService.deleteEvent(eventId, speakerId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'All invitations deleted successfully for event',
        expect.objectContaining({
          eventId,
          deletedCount: 5,
        })
      );
    });

    it('should handle invitation deletion error with response', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue(existingEvent);
      mockPrisma.event.delete.mockResolvedValue(existingEvent);

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { error: 'Invitations not found' },
        },
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.delete.mockRejectedValue(axiosError);

      await eventService.deleteEvent(eventId, speakerId);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to delete invitations for event',
        expect.objectContaining({
          eventId,
          status: 404,
          message: 'Invitations not found',
        })
      );
    });

    it('should handle invitation deletion error with request but no response', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue(existingEvent);
      mockPrisma.event.delete.mockResolvedValue(existingEvent);

      const axiosError = {
        isAxiosError: true,
        request: {},
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.delete.mockRejectedValue(axiosError);

      await eventService.deleteEvent(eventId, speakerId);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Speaker service unavailable when deleting invitations',
        expect.objectContaining({
          eventId,
        })
      );
    });

    it('should handle invitation deletion error with message', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue(existingEvent);
      mockPrisma.event.delete.mockResolvedValue(existingEvent);

      const axiosError = {
        isAxiosError: true,
        message: 'Network timeout',
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.delete.mockRejectedValue(axiosError);

      await eventService.deleteEvent(eventId, speakerId);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error deleting invitations for event',
        expect.objectContaining({
          eventId,
          message: 'Network timeout',
        })
      );
    });

    it('should handle non-axios error during invitation deletion', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue(existingEvent);
      mockPrisma.event.delete.mockResolvedValue(existingEvent);

      const error = new Error('Unexpected error');
      mockAxios.isAxiosError.mockReturnValue(false);
      mockAxios.delete.mockRejectedValue(error);

      await eventService.deleteEvent(eventId, speakerId);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unexpected error deleting invitations for event',
        expect.objectContaining({
          eventId,
          error: 'Unexpected error',
        })
      );
    });

    it('should allow admin to delete any event', async () => {
      const eventId = 'event-123';
      const adminId = 'admin-123';
      const existingEvent = createMockEvent({
        id: eventId,
        speakerId: 'different-speaker',
        status: EventStatus.PUBLISHED,
      });

      mockPrisma.event.findUnique.mockResolvedValue(existingEvent);
      mockPrisma.event.delete.mockResolvedValue(existingEvent);
      mockAxios.delete.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      await eventService.deleteEvent(eventId, adminId, { isAdmin: true });

      expect(mockPrisma.event.delete).toHaveBeenCalled();
    });
  });

  describe('updateEvent', () => {
    it('should update event when in DRAFT status', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const updateData = {
        name: 'Updated Event Name',
        description: 'Updated description',
      };

      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.DRAFT,
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const updatedEvent = createMockEvent({
        ...existingEvent,
        ...updateData,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.event.update.mockResolvedValue({
        ...updatedEvent,
        venue: createMockVenue(),
      });

      const result = await eventService.updateEvent(eventId, updateData, speakerId);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateData.name);
      expect(result.description).toBe(updateData.description);
    });

    it('should update event when in REJECTED status', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const updateData = { name: 'Updated Name' };

      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.REJECTED,
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const updatedEvent = createMockEvent({
        ...existingEvent,
        ...updateData,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.event.update.mockResolvedValue({
        ...updatedEvent,
        venue: createMockVenue(),
      });

      const result = await eventService.updateEvent(eventId, updateData, speakerId);

      expect(result).toBeDefined();
    });

    it('should throw error if event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(
        eventService.updateEvent('non-existent', { name: 'New Name' }, 'speaker-123')
      ).rejects.toThrow('Event not found');
    });

    it('should throw error if speakerId does not match', async () => {
      const existingEvent = createMockEvent({
        id: 'event-123',
        speakerId: 'different-speaker',
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });

      await expect(
        eventService.updateEvent('event-123', { name: 'New Name' }, 'speaker-123')
      ).rejects.toThrow('Unauthorized: You can only update your own events');
    });

    it('should throw error if event is not in DRAFT or REJECTED status', async () => {
      const existingEvent = createMockEvent({
        id: 'event-123',
        speakerId: 'speaker-123',
        status: EventStatus.PUBLISHED,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });

      await expect(
        eventService.updateEvent('event-123', { name: 'New Name' }, 'speaker-123')
      ).rejects.toThrow('Event can only be updated when in DRAFT or REJECTED status');
    });

    it('should validate venue if provided', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const updateData = { venueId: 999 };

      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.DRAFT,
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.venue.findUnique.mockResolvedValue(null);

      await expect(
        eventService.updateEvent(eventId, updateData, speakerId)
      ).rejects.toThrow('Venue not found');
    });

    it('should validate booking dates if provided', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const updateData = {
        bookingStartDate: '2025-12-31T23:59:59Z',
        bookingEndDate: '2025-12-01T00:00:00Z', // End before start
      };

      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.DRAFT,
        bookingStartDate: new Date('2025-11-01T00:00:00Z'),
        bookingEndDate: new Date('2025-11-30T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });

      await expect(
        eventService.updateEvent(eventId, updateData, speakerId)
      ).rejects.toThrow('Booking start date must be before end date');
    });

    it('should check venue availability when updating dates', async () => {
      const eventId = 'event-123';
      const speakerId = 'speaker-123';
      const updateData = {
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
      };

      const existingEvent = createMockEvent({
        id: eventId,
        speakerId,
        status: EventStatus.DRAFT,
        venueId: 1,
        bookingStartDate: new Date('2025-11-01T00:00:00Z'),
        bookingEndDate: new Date('2025-11-30T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const overlappingEvent = createMockEvent({
        id: 'event-456',
        status: EventStatus.PUBLISHED,
        venueId: 1,
        bookingStartDate: new Date('2025-12-15T00:00:00Z'),
        bookingEndDate: new Date('2026-01-15T23:59:59Z'),
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue({ id: 1 }),
      });
      mockPrisma.event.findMany.mockResolvedValue([overlappingEvent]);

      await expect(
        eventService.updateEvent(eventId, updateData, speakerId)
      ).rejects.toThrow('Venue is not available for the selected booking period');
    });
  });

  describe('createEvent - getSpeakerInfo coverage', () => {
    it('should create event as ADMIN and auto-publish', async () => {
      const eventData = {
        name: 'Admin Event',
        description: 'Event created by admin',
        category: 'CONFERENCE',
        venueId: 1,
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
        userId: 'admin-123',
      };

      const mockVenue = createMockVenue({ id: 1, capacity: 100 });
      const mockEvent = createMockEvent({
        name: eventData.name,
        description: eventData.description,
        category: eventData.category,
        speakerId: 'admin-123',
        venueId: eventData.venueId,
        status: EventStatus.PUBLISHED,
        bookingStartDate: new Date(eventData.bookingStartDate),
        bookingEndDate: new Date(eventData.bookingEndDate),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.create.mockResolvedValue({
        ...mockEvent,
        venue: mockVenue,
      });
      mockEventPublisherService.publishEventPublished.mockResolvedValue(undefined);
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          user: {
            id: 'admin-123',
            name: 'Admin User',
            email: 'admin@test.com',
            role: 'ADMIN',
          },
        },
      });
      mockAxios.isAxiosError.mockReturnValue(false);

      const result = await eventService.createEvent(eventData, 'admin-123');

      expect(result).toBeDefined();
      expect(result.status).toBe(EventStatus.PUBLISHED);
      expect(mockEventPublisherService.publishEventPublished).toHaveBeenCalled();
    });

    it('should handle getSpeakerInfo error cases', async () => {
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 1,
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
        userId: 'speaker-123',
      };

      const mockVenue = createMockVenue({ id: 1 });
      const mockEvent = createMockEvent({
        name: eventData.name,
        speakerId: 'speaker-123',
        status: EventStatus.DRAFT,
        bookingStartDate: new Date(eventData.bookingStartDate),
        bookingEndDate: new Date(eventData.bookingEndDate),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.create.mockResolvedValue({
        ...mockEvent,
        venue: mockVenue,
      });

      // Test axios error with response
      const axiosError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
        isAxiosError: true,
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.get.mockRejectedValue(axiosError);

      const result = await eventService.createEvent(eventData, 'speaker-123');

      expect(result).toBeDefined();
      expect(result.status).toBe(EventStatus.DRAFT);
    });

    it('should handle getSpeakerInfo request error', async () => {
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 1,
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
        userId: 'speaker-123',
      };

      const mockVenue = createMockVenue({ id: 1 });
      const mockEvent = createMockEvent({
        name: eventData.name,
        speakerId: 'speaker-123',
        status: EventStatus.DRAFT,
        bookingStartDate: new Date(eventData.bookingStartDate),
        bookingEndDate: new Date(eventData.bookingEndDate),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.create.mockResolvedValue({
        ...mockEvent,
        venue: mockVenue,
      });

      // Test axios error with request but no response
      const axiosError = {
        request: {},
        isAxiosError: true,
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.get.mockRejectedValue(axiosError);

      const result = await eventService.createEvent(eventData, 'speaker-123');

      expect(result).toBeDefined();
    });

    it('should handle getSpeakerInfo unexpected error', async () => {
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 1,
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
        userId: 'speaker-123',
      };

      const mockVenue = createMockVenue({ id: 1 });
      const mockEvent = createMockEvent({
        name: eventData.name,
        speakerId: 'speaker-123',
        status: EventStatus.DRAFT,
        bookingStartDate: new Date(eventData.bookingStartDate),
        bookingEndDate: new Date(eventData.bookingEndDate),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.create.mockResolvedValue({
        ...mockEvent,
        venue: mockVenue,
      });

      // Test non-axios error
      mockAxios.isAxiosError.mockReturnValue(false);
      mockAxios.get.mockRejectedValue(new Error('Unexpected error'));

      const result = await eventService.createEvent(eventData, 'speaker-123');

      expect(result).toBeDefined();
    });

    it('should handle getSpeakerInfo when response status is not 200', async () => {
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 1,
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
        userId: 'speaker-123',
      };

      const mockVenue = createMockVenue({ id: 1 });
      const mockEvent = createMockEvent({
        name: eventData.name,
        speakerId: 'speaker-123',
        status: EventStatus.DRAFT,
        bookingStartDate: new Date(eventData.bookingStartDate),
        bookingEndDate: new Date(eventData.bookingEndDate),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.create.mockResolvedValue({
        ...mockEvent,
        venue: mockVenue,
      });

      mockAxios.get.mockResolvedValue({
        status: 404,
        data: {},
      });

      const result = await eventService.createEvent(eventData, 'speaker-123');

      expect(result).toBeDefined();
    });
  });

  describe('createEvent - validation error paths', () => {
    it('should throw error if venue not found', async () => {
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 999,
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
        userId: 'speaker-123',
      };

      mockPrisma.venue.findUnique.mockResolvedValue(null);
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          user: {
            id: 'speaker-123',
            name: 'Test Speaker',
            email: 'speaker@test.com',
            role: 'SPEAKER',
          },
        },
      });

      await expect(
        eventService.createEvent(eventData, 'speaker-123')
      ).rejects.toThrow('Venue not found');
    });

    it('should throw error if booking start date is after end date', async () => {
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 1,
        bookingStartDate: '2025-12-31T23:59:59Z',
        bookingEndDate: '2025-12-01T00:00:00Z', // End before start
        userId: 'speaker-123',
      };

      const mockVenue = createMockVenue({ id: 1 });
      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          user: {
            id: 'speaker-123',
            name: 'Test Speaker',
            email: 'speaker@test.com',
            role: 'SPEAKER',
          },
        },
      });

      await expect(
        eventService.createEvent(eventData, 'speaker-123')
      ).rejects.toThrow('Booking start date must be before end date');
    });

    it('should throw error if booking start date is in the past', async () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const futureDate = new Date('2025-12-31T23:59:59Z');
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 1,
        bookingStartDate: pastDate.toISOString(),
        bookingEndDate: futureDate.toISOString(),
        userId: 'speaker-123',
      };

      const mockVenue = createMockVenue({ id: 1 });
      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          user: {
            id: 'speaker-123',
            name: 'Test Speaker',
            email: 'speaker@test.com',
            role: 'SPEAKER',
          },
        },
      });

      await expect(
        eventService.createEvent(eventData, 'speaker-123')
      ).rejects.toThrow('Booking start date cannot be in the past');
    });

    it('should throw error if venue is not available (overlapping events)', async () => {
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 1,
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
        userId: 'speaker-123',
      };

      const mockVenue = createMockVenue({ id: 1 });
      const overlappingEvent = createMockEvent({
        id: 'event-456',
        venueId: 1,
        status: EventStatus.PUBLISHED,
        bookingStartDate: new Date('2025-12-15T00:00:00Z'),
        bookingEndDate: new Date('2026-01-15T23:59:59Z'),
      });

      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockPrisma.event.findMany.mockResolvedValue([overlappingEvent]);
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          user: {
            id: 'speaker-123',
            name: 'Test Speaker',
            email: 'speaker@test.com',
            role: 'SPEAKER',
          },
        },
      });

      await expect(
        eventService.createEvent(eventData, 'speaker-123')
      ).rejects.toThrow('Venue is not available for the selected booking period');
    });
  });
});

