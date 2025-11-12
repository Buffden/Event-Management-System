/**
 * EventService Coverage Tests
 *
 * This file contains tests to cover previously uncovered statements:
 * - Line 4: CreateEventRequest import usage
 * - Lines 693-694: getEventById with includePrivate=false and non-PUBLISHED status
 * - Lines 707-816: getEvents method with all filtering options
 * - Lines 822-823: getEventsBySpeaker method
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EventService } from '../event.service';
import {
  mockPrisma,
  createMockEvent,
  createMockVenue,
  resetAllMocks,
} from '../../test/mocks-simple';
import { EventStatus } from '../../../generated/prisma';

describe('EventService Coverage Tests', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService();
    resetAllMocks();
  });

  describe('getEventById - includePrivate flag', () => {
    const createMockVenueWithTimes = () => ({
      ...createMockVenue(),
      openingTime: '09:00:00',
      closingTime: '18:00:00',
    });

    it('should return null when includePrivate is false and event status is not PUBLISHED', async () => {
      const mockEvent = createMockEvent({
        id: 'event-123',
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        status: EventStatus.DRAFT,
        speakerId: 'speaker-123',
        venueId: 1,
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        venue: createMockVenueWithTimes(),
      });

      const result = await eventService.getEventById('event-123', false);

      expect(result).toBeNull();
      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-123' },
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

    it('should return event when includePrivate is true and event status is DRAFT', async () => {
      const mockEvent = createMockEvent({
        id: 'event-123',
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        status: EventStatus.DRAFT,
        speakerId: 'speaker-123',
        venueId: 1,
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        venue: createMockVenueWithTimes(),
      });

      const result = await eventService.getEventById('event-123', true);

      expect(result).toBeDefined();
      expect(result?.id).toBe('event-123');
      expect(result?.status).toBe(EventStatus.DRAFT);
    });

    it('should return null when includePrivate is false and event status is PENDING_APPROVAL', async () => {
      const mockEvent = createMockEvent({
        id: 'event-123',
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        status: EventStatus.PENDING_APPROVAL,
        speakerId: 'speaker-123',
        venueId: 1,
        bookingStartDate: new Date('2025-12-01T00:00:00Z'),
        bookingEndDate: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        venue: createMockVenueWithTimes(),
      });

      const result = await eventService.getEventById('event-123', false);

      expect(result).toBeNull();
    });

    it('should handle database errors in getEventById', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.event.findUnique.mockRejectedValue(dbError);

      await expect(
        eventService.getEventById('event-123', false)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getEvents - comprehensive filtering', () => {
    const createMockEventWithVenue = (overrides: any = {}) => ({
      ...createMockEvent({
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        speakerId: 'speaker-123',
        venueId: 1,
        ...overrides,
      }),
      venue: {
        ...createMockVenue(),
        openingTime: '09:00:00',
        closingTime: '18:00:00',
      },
      bookingStartDate: overrides.bookingStartDate || new Date('2025-12-01T00:00:00Z'),
      bookingEndDate: overrides.bookingEndDate || new Date('2025-12-31T23:59:59Z'),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    });

    it('should get events with default filters (includePrivate=false)', async () => {
      const mockEvents = [
        createMockEventWithVenue({ id: 'event-1', status: EventStatus.PUBLISHED }),
        createMockEventWithVenue({ id: 'event-2', status: EventStatus.PUBLISHED }),
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(2);

      const result = await eventService.getEvents({});

      expect(result).toBeDefined();
      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: EventStatus.PUBLISHED },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10,
        })
      );
    });

    it('should get events with includePrivate=true and status filter', async () => {
      const mockEvents = [
        createMockEventWithVenue({ id: 'event-1', status: EventStatus.DRAFT }),
        createMockEventWithVenue({ id: 'event-2', status: EventStatus.DRAFT }),
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(2);

      const result = await eventService.getEvents(
        { status: EventStatus.DRAFT },
        true
      );

      expect(result).toBeDefined();
      expect(result.events).toHaveLength(2);
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: EventStatus.DRAFT },
        })
      );
    });

    it('should filter events by category', async () => {
      const mockEvents = [
        createMockEventWithVenue({ id: 'event-1', category: 'CONFERENCE' }),
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEvents({ category: 'CONFERENCE' });

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            category: 'CONFERENCE',
          }),
        })
      );
    });

    it('should filter events by venueId', async () => {
      const venueId = 123;
      const mockEvents = [
        createMockEventWithVenue({ id: 'event-1', venueId }),
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEvents({ venueId });

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            venueId,
          }),
        })
      );
    });

    it('should filter events by speakerId', async () => {
      const speakerId = 'speaker-123';
      const mockEvents = [
        createMockEventWithVenue({ id: 'event-1', speakerId }),
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEvents({ speakerId });

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            speakerId,
          }),
        })
      );
    });

    it('should filter events by bookingStartDate', async () => {
      const bookingStartDate = '2025-12-01T00:00:00Z';
      const mockEvents = [createMockEventWithVenue({ id: 'event-1' })];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEvents({ bookingStartDate });

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            bookingStartDate: {
              gte: new Date(bookingStartDate),
            },
          }),
        })
      );
    });

    it('should filter events by bookingEndDate', async () => {
      const bookingEndDate = '2025-12-31T23:59:59Z';
      const mockEvents = [createMockEventWithVenue({ id: 'event-1' })];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEvents({ bookingEndDate });

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            bookingStartDate: {
              lte: new Date(bookingEndDate),
            },
          }),
        })
      );
    });

    it('should filter events by both bookingStartDate and bookingEndDate', async () => {
      const bookingStartDate = '2025-12-01T00:00:00Z';
      const bookingEndDate = '2025-12-31T23:59:59Z';
      const mockEvents = [createMockEventWithVenue({ id: 'event-1' })];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEvents({ bookingStartDate, bookingEndDate });

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            bookingStartDate: {
              gte: new Date(bookingStartDate),
              lte: new Date(bookingEndDate),
            },
          }),
        })
      );
    });

    it('should filter events by search term (name)', async () => {
      const search = 'Conference';
      const mockEvents = [
        createMockEventWithVenue({ id: 'event-1', name: 'Tech Conference' }),
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEvents({ search });

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { venue: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }),
        })
      );
    });

    it('should filter events by timeframe UPCOMING', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 86400000); // Tomorrow
      const mockEvents = [
        createMockEventWithVenue({
          id: 'event-1',
          bookingStartDate: futureDate,
        }),
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEvents({ timeframe: 'UPCOMING' });

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            bookingStartDate: expect.objectContaining({
              gt: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should filter events by timeframe ONGOING', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // Yesterday
      const futureDate = new Date(now.getTime() + 86400000); // Tomorrow
      const mockEvents = [
        createMockEventWithVenue({
          id: 'event-1',
          bookingStartDate: pastDate,
          bookingEndDate: futureDate,
        }),
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEvents({ timeframe: 'ONGOING' });

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            bookingStartDate: expect.objectContaining({
              lte: expect.any(Date),
            }),
            bookingEndDate: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should filter events by timeframe PAST', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // Yesterday
      const mockEvents = [
        createMockEventWithVenue({
          id: 'event-1',
          bookingEndDate: pastDate,
        }),
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEvents({ timeframe: 'PAST' });

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            bookingEndDate: expect.objectContaining({
              lt: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should not apply timeframe filter when timeframe is ALL', async () => {
      const mockEvents = [createMockEventWithVenue({ id: 'event-1' })];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEvents({ timeframe: 'ALL' });

      expect(result).toBeDefined();
      const whereClause = (mockPrisma.event.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause.bookingStartDate?.gt).toBeUndefined();
      expect(whereClause.bookingEndDate?.lt).toBeUndefined();
    });

    it('should handle pagination correctly', async () => {
      const mockEvents = [
        createMockEventWithVenue({ id: 'event-1' }),
        createMockEventWithVenue({ id: 'event-2' }),
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(25);

      const result = await eventService.getEvents({ page: 2, limit: 10 });

      expect(result).toBeDefined();
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should handle combined filters', async () => {
      const mockEvents = [createMockEventWithVenue({ id: 'event-1' })];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const filters = {
        status: EventStatus.PUBLISHED,
        category: 'CONFERENCE',
        venueId: 123,
        speakerId: 'speaker-123',
        search: 'Tech',
        timeframe: 'UPCOMING',
        page: 1,
        limit: 20,
      };

      const result = await eventService.getEvents(filters, true);

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            category: 'CONFERENCE',
            venueId: 123,
            speakerId: 'speaker-123',
            OR: expect.any(Array),
            bookingStartDate: expect.objectContaining({
              gt: expect.any(Date),
            }),
          }),
          skip: 0,
          take: 20,
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.event.findMany.mockRejectedValue(dbError);

      await expect(
        eventService.getEvents({})
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getEventsBySpeaker', () => {
    it('should call getEvents with speakerId and includePrivate=true', async () => {
      const speakerId = 'speaker-123';
      const mockEvents = [
        {
          ...createMockEvent({
            id: 'event-1',
            name: 'Test Event',
            description: 'Test Description',
            category: 'CONFERENCE',
            speakerId,
            venueId: 1,
          }),
          venue: {
            ...createMockVenue(),
            openingTime: '09:00:00',
            closingTime: '18:00:00',
          },
          bookingStartDate: new Date('2025-12-01T00:00:00Z'),
          bookingEndDate: new Date('2025-12-31T23:59:59Z'),
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEventsBySpeaker(speakerId);

      expect(result).toBeDefined();
      expect(result.events).toHaveLength(1);
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            speakerId,
          }),
        })
      );
    });

    it('should pass additional filters to getEvents', async () => {
      const speakerId = 'speaker-123';
      const filters = {
        category: 'CONFERENCE',
        status: EventStatus.PUBLISHED,
        page: 2,
        limit: 5,
      };

      const mockEvents = [
        {
          ...createMockEvent({
            id: 'event-1',
            name: 'Test Event',
            description: 'Test Description',
            category: 'CONFERENCE',
            speakerId,
            venueId: 1,
          }),
          venue: {
            ...createMockVenue(),
            openingTime: '09:00:00',
            closingTime: '18:00:00',
          },
          bookingStartDate: new Date('2025-12-01T00:00:00Z'),
          bookingEndDate: new Date('2025-12-31T23:59:59Z'),
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEventsBySpeaker(speakerId, filters);

      expect(result).toBeDefined();
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            speakerId,
            category: 'CONFERENCE',
            status: EventStatus.PUBLISHED,
          }),
          skip: 5,
          take: 5,
        })
      );
    });
  });
});

