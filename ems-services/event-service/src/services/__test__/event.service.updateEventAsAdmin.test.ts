/**
 * EventService.updateEventAsAdmin Unit Tests
 *
 * Tests for the updateEventAsAdmin method including:
 * - Successful updates by admin
 * - Publishing messages for PUBLISHED events
 * - Venue availability validation for PUBLISHED events
 * - Booking date validation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EventService } from '../event.service';
import {
  mockPrisma,
  createMockEvent,
  createMockVenue,
  mockEventPublisherService,
  setupAllMocks,
  resetAllMocks,
} from '../../test/mocks-simple';
import { EventStatus } from '../../../generated/prisma';

describe('EventService.updateEventAsAdmin', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService();
    resetAllMocks();
  });

  describe('Successful Update', () => {
    it('should successfully update an event when called by an admin', async () => {
      const eventId = 'event-123';
      const updateData = {
        name: 'Updated Event Name',
        description: 'Updated description',
      };

      const existingEvent = createMockEvent({
        id: eventId,
        status: EventStatus.DRAFT,
        name: 'Original Event',
        description: 'Original description',
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

      const result = await eventService.updateEventAsAdmin(eventId, updateData);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateData.name);
      expect(result.description).toBe(updateData.description);
      expect(mockPrisma.event.update).toHaveBeenCalled();
    });

    it('should publish event.updated message if event is PUBLISHED', async () => {
      const eventId = 'event-123';
      const updateData = {
        name: 'Updated Event Name',
      };

      const existingEvent = createMockEvent({
        id: eventId,
        status: EventStatus.PUBLISHED,
      });

      const updatedEvent = createMockEvent({
        ...existingEvent,
        ...updateData,
        status: EventStatus.PUBLISHED,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.event.update.mockResolvedValue({
        ...updatedEvent,
        venue: createMockVenue(),
      });
      mockEventPublisherService.publishEventUpdated.mockResolvedValue(undefined);

      const result = await eventService.updateEventAsAdmin(eventId, updateData);

      expect(result).toBeDefined();
      expect(mockEventPublisherService.publishEventUpdated).toHaveBeenCalledWith({
        eventId: eventId,
        updatedFields: updateData,
      });
    });

    it('should not publish event.updated message if event is not PUBLISHED', async () => {
      const eventId = 'event-123';
      const updateData = {
        name: 'Updated Event Name',
      };

      const existingEvent = createMockEvent({
        id: eventId,
        status: EventStatus.DRAFT,
      });

      const updatedEvent = createMockEvent({
        ...existingEvent,
        ...updateData,
        status: EventStatus.DRAFT,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.event.update.mockResolvedValue({
        ...updatedEvent,
        venue: createMockVenue(),
      });

      await eventService.updateEventAsAdmin(eventId, updateData);

      expect(mockEventPublisherService.publishEventUpdated).not.toHaveBeenCalled();
    });
  });

  describe('Venue Availability Validation', () => {
    it('should validate venue availability for PUBLISHED events and throw error if overlapping', async () => {
      const eventId = 'event-123';
      const venueId = 1;
      const updateData = {
        venueId: venueId,
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
      };

      const existingEvent = createMockEvent({
        id: eventId,
        status: EventStatus.PUBLISHED,
        venueId: venueId,
        bookingStartDate: new Date('2025-11-01T00:00:00Z'),
        bookingEndDate: new Date('2025-11-30T23:59:59Z'),
      });

      const overlappingEvent = createMockEvent({
        id: 'event-456',
        status: EventStatus.PUBLISHED,
        venueId: venueId,
        bookingStartDate: new Date('2025-12-15T00:00:00Z'),
        bookingEndDate: new Date('2026-01-15T23:59:59Z'),
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue({ id: venueId }),
      });
      mockPrisma.venue.findUnique.mockResolvedValue(createMockVenue({ id: venueId }));
      mockPrisma.event.findMany.mockResolvedValue([overlappingEvent]);

      await expect(
        eventService.updateEventAsAdmin(eventId, updateData)
      ).rejects.toThrow('Venue is not available for the selected booking period');

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
        where: {
          id: { not: eventId },
          venueId: venueId,
          status: { in: [EventStatus.PUBLISHED, EventStatus.PENDING_APPROVAL] },
          OR: [
            {
              bookingStartDate: {
                lt: new Date(updateData.bookingEndDate),
              },
              bookingEndDate: {
                gt: new Date(updateData.bookingStartDate),
              },
            },
          ],
        },
      });
    });

    it('should allow venue update if no overlapping events exist', async () => {
      const eventId = 'event-123';
      const venueId = 1;
      const updateData = {
        venueId: venueId,
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
      };

      const existingEvent = createMockEvent({
        id: eventId,
        status: EventStatus.PUBLISHED,
        venueId: venueId,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue({ id: venueId }),
      });
      mockPrisma.venue.findUnique.mockResolvedValue(createMockVenue({ id: venueId }));
      mockPrisma.event.findMany.mockResolvedValue([]); // No overlapping events
      mockPrisma.event.update.mockResolvedValue({
        ...existingEvent,
        ...updateData,
        venue: createMockVenue({ id: venueId }),
      });

      const result = await eventService.updateEventAsAdmin(eventId, updateData);

      expect(result).toBeDefined();
      expect(mockPrisma.event.update).toHaveBeenCalled();
    });

    it('should not validate venue availability for non-PUBLISHED events', async () => {
      const eventId = 'event-123';
      const venueId = 1;
      const updateData = {
        venueId: venueId,
      };

      const existingEvent = createMockEvent({
        id: eventId,
        status: EventStatus.DRAFT,
        venueId: venueId,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue({ id: venueId }),
      });
      mockPrisma.venue.findUnique.mockResolvedValue(createMockVenue({ id: venueId }));
      mockPrisma.event.update.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue({ id: venueId }),
      });

      await eventService.updateEventAsAdmin(eventId, updateData);

      // Should not check for overlapping events
      expect(mockPrisma.event.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Booking Date Validation', () => {
    it('should ensure booking start date is before end date', async () => {
      const eventId = 'event-123';
      const updateData = {
        bookingStartDate: '2025-12-31T23:59:59Z',
        bookingEndDate: '2025-12-01T00:00:00Z', // End before start
      };

      const existingEvent = createMockEvent({
        id: eventId,
        bookingStartDate: new Date('2025-11-01T00:00:00Z'),
        bookingEndDate: new Date('2025-11-30T23:59:59Z'),
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });

      await expect(
        eventService.updateEventAsAdmin(eventId, updateData)
      ).rejects.toThrow('Booking start date must be before end date');
    });

    it('should allow valid booking dates (start before end)', async () => {
      const eventId = 'event-123';
      const updateData = {
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
      };

      const existingEvent = createMockEvent({
        id: eventId,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.event.update.mockResolvedValue({
        ...existingEvent,
        ...updateData,
        venue: createMockVenue(),
      });

      const result = await eventService.updateEventAsAdmin(eventId, updateData);

      expect(result).toBeDefined();
      expect(mockPrisma.event.update).toHaveBeenCalled();
    });

    it('should use existing dates if only one date is provided', async () => {
      const eventId = 'event-123';
      const existingStartDate = new Date('2025-12-01T00:00:00Z');
      const existingEndDate = new Date('2025-12-31T23:59:59Z');
      const updateData = {
        bookingEndDate: '2025-12-15T23:59:59Z', // Only end date provided
      };

      const existingEvent = createMockEvent({
        id: eventId,
        bookingStartDate: existingStartDate,
        bookingEndDate: existingEndDate,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.event.update.mockResolvedValue({
        ...existingEvent,
        bookingEndDate: new Date(updateData.bookingEndDate),
        venue: createMockVenue(),
      });

      const result = await eventService.updateEventAsAdmin(eventId, updateData);

      expect(result).toBeDefined();
      // Should use existing start date with new end date
      expect(new Date(updateData.bookingEndDate).getTime()).toBeGreaterThan(
        existingStartDate.getTime()
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error if event not found', async () => {
      const eventId = 'non-existent-event';
      const updateData = { name: 'Updated Name' };

      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(
        eventService.updateEventAsAdmin(eventId, updateData)
      ).rejects.toThrow('Event not found');
    });

    it('should throw error if venue not found', async () => {
      const eventId = 'event-123';
      const updateData = {
        venueId: 999,
      };

      const existingEvent = createMockEvent({
        id: eventId,
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...existingEvent,
        venue: createMockVenue(),
      });
      mockPrisma.venue.findUnique.mockResolvedValue(null);

      await expect(
        eventService.updateEventAsAdmin(eventId, updateData)
      ).rejects.toThrow('Venue not found');
    });
  });
});

