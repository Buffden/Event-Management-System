/**
 * Working Event Service Tests
 * 
 * This file contains tests for the EventService class
 * using the actual method names that exist in the service.
 */

import { EventService } from '../event.service';
import {
  mockPrisma,
  mockAxios,
  createMockEvent,
  createMockVenue,
  setupEventNotFound,
  setupVenueNotFound,
} from '../../test/mocks-simple';

describe('EventService (working)', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService();
    // Setup default axios mock behavior
    mockAxios.isAxiosError.mockReturnValue(false);
  });

  describe('getEventById', () => {
    it('should retrieve an event by ID', async () => {
      const mockEvent = createMockEvent();
      // Mock the database response with the expected structure
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        status: 'PUBLISHED', // This is required for the method to return the event
        venue: createMockVenue(),
        createdBy: 'user-123',
        updatedBy: 'user-123',
        bookingStartDate: new Date('2024-11-01T00:00:00Z'),
        bookingEndDate: new Date('2024-11-30T23:59:59Z'),
      });

      const result = await eventService.getEventById('event-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('event-123');
      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-123' },
        include: expect.any(Object)
      });
    });

    it('should return null if event not found', async () => {
      setupEventNotFound();

      const result = await eventService.getEventById('non-existent-event');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.event.findUnique.mockRejectedValue(dbError);

      await expect(eventService.getEventById('event-123')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('createEvent', () => {
    it('should create a new event successfully', async () => {
      const eventData = {
        name: 'Test Conference',
        description: 'A test conference event',
        category: 'CONFERENCE',
        bannerImageUrl: undefined,
        venueId: 123, // Should be number, not string
        bookingStartDate: '2025-12-01T00:00:00Z', // Future date (December 2025)
        bookingEndDate: '2025-12-31T23:59:59Z', // Future date
        userId: 'user-123',
      };

      const mockEvent = createMockEvent();
      const mockVenue = createMockVenue();
      
      // Mock the venue lookup
      mockPrisma.venue.findUnique.mockResolvedValue({
        ...mockVenue,
        id: eventData.venueId, // Use the same ID as in eventData
      });
      // Mock the overlapping events check (return empty array)
      mockPrisma.event.findMany.mockResolvedValue([]);
      // Mock the event creation with venue included
      mockPrisma.event.create.mockResolvedValue({
        ...mockEvent,
        name: eventData.name,
        description: eventData.description,
        category: eventData.category,
        bannerImageUrl: eventData.bannerImageUrl,
        status: 'DRAFT',
        rejectionReason: null,
        speakerId: 'user-123',
        venueId: eventData.venueId,
        venue: {
          ...mockVenue,
          id: eventData.venueId,
          openingTime: '09:00:00',
          closingTime: '18:00:00',
        },
        createdBy: 'user-123',
        updatedBy: 'user-123',
        bookingStartDate: new Date(eventData.bookingStartDate),
        bookingEndDate: new Date(eventData.bookingEndDate),
      });
      // Mock the speaker info call
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: { user: { id: 'user-123', name: 'Test Speaker', email: 'speaker@test.com', role: 'SPEAKER' } }
      });

      const result = await eventService.createEvent(eventData, 'user-123');

      expect(result).toBeDefined();
      expect(result.name).toBe(eventData.name);
      expect(result.description).toBe(eventData.description);

      // Verify Prisma was called correctly
      expect(mockPrisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: eventData.venueId }
      });

      expect(mockPrisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: eventData.name,
          description: eventData.description,
          category: eventData.category,
          bannerImageUrl: eventData.bannerImageUrl,
          venueId: eventData.venueId,
          speakerId: 'user-123',
        }),
        include: expect.any(Object)
      });
    });

    it('should throw error if venue does not exist', async () => {
      const eventData = {
        name: 'Test Conference',
        description: 'A test conference event',
        category: 'CONFERENCE',
        bannerImageUrl: undefined,
        venueId: 999, // Non-existent venue ID
        bookingStartDate: '2025-12-01T00:00:00Z', // Future date (December 2025)
        bookingEndDate: '2025-12-31T23:59:59Z', // Future date
        userId: 'user-123',
      };

      setupVenueNotFound();

      await expect(eventService.createEvent(eventData, 'user-123')).rejects.toThrow(
        'Venue not found'
      );

      // Verify event creation was not attempted
      expect(mockPrisma.event.create).not.toHaveBeenCalled();
    });
  });

  describe('basic functionality', () => {
    it('should be able to instantiate EventService', () => {
      expect(eventService).toBeInstanceOf(EventService);
    });

    it('should have required methods', () => {
      expect(typeof eventService.getEventById).toBe('function');
      expect(typeof eventService.createEvent).toBe('function');
      expect(typeof eventService.updateEvent).toBe('function');
      expect(typeof eventService.deleteEvent).toBe('function');
    });
  });
});
