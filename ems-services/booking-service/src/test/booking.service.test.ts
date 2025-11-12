/**
 * Comprehensive Test Suite for Booking Service
 *
 * Tests all booking features including:
 * - Booking creation
 * - User bookings retrieval
 * - Booking cancellation
 * - Event bookings (admin)
 * - Capacity checking
 * - Dashboard statistics
 * - Upcoming events
 * - Recent registrations
 */

import '@jest/globals';

// Mock ticket service BEFORE importing BookingService
jest.mock('../services/ticket.service', () => ({
  ticketService: {
    generateTicket: jest.fn(),
  },
}));

// Import mocks - use requireActual to bypass Jest's mock if it exists
// This ensures we get the actual exports even if jest.mock() interferes
const mocks = jest.requireActual('./mocks-simple');
const mockPrisma = mocks.mockPrisma;
const mockEventPublisherService = mocks.mockEventPublisherService;
const mockAxios = mocks.mockAxios;
const mockLogger = mocks.mockLogger;

import { BookingService } from '../services/booking.service';
import { BookingStatus } from '../../generated/prisma';
import { ticketService } from '../services/ticket.service';

describe('BookingService', () => {
  let bookingService: BookingService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure mockPrisma.$transaction exists and set it up
    if (mockPrisma && mockPrisma.$transaction) {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          user: mockPrisma.user,
          booking: mockPrisma.booking,
          event: mockPrisma.event,
          account: mockPrisma.account || {},
        };
        return await callback(mockTx);
      });
    }
    bookingService = new BookingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // BOOKING CREATION TESTS
  // ============================================================================

  describe('createBooking()', () => {
    it('should create a new booking successfully', async () => {
      const { mockBooking, mockEvent } = mocks.setupSuccessfulBookingCreation();
      mockPrisma.booking.findUnique.mockResolvedValue(null); // No existing booking
      mockPrisma.booking.count.mockResolvedValue(50); // Available capacity
      (ticketService.generateTicket as jest.Mock).mockResolvedValue(undefined);

      const result = await bookingService.createBooking({
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-123' },
      });
      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: {
          userId_eventId: {
            userId: 'user-123',
            eventId: 'event-123',
          },
        },
      });
      expect(mockPrisma.booking.create).toHaveBeenCalled();
      expect(mockEventPublisherService.publishBookingConfirmed).toHaveBeenCalled();
      expect(ticketService.generateTicket).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.status).toBe('CONFIRMED');
    });

    it('should reject booking for non-existent event', async () => {
      mocks.setupEventNotFound();

      await expect(
        bookingService.createBooking({
          userId: 'user-123',
          eventId: 'non-existent',
        })
      ).rejects.toThrow('Event not found');
    });

    it('should reject booking for inactive event', async () => {
      const mockEvent = mocks.createMockEvent({ isActive: false });
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);

      await expect(
        bookingService.createBooking({
          userId: 'user-123',
          eventId: 'event-123',
        })
      ).rejects.toThrow('Event is not active');
    });

    it('should reject duplicate booking', async () => {
      const mockEvent = mocks.createMockEvent({ isActive: true });
      const existingBooking = mocks.createMockBooking({ status: 'CONFIRMED' });

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.booking.findUnique.mockResolvedValue(existingBooking);

      await expect(
        bookingService.createBooking({
          userId: 'user-123',
          eventId: 'event-123',
        })
      ).rejects.toThrow('User already has a booking for this event');
    });

    it('should reject booking when event is at full capacity', async () => {
      mocks.setupEventFullCapacity();
      mockPrisma.booking.findUnique.mockResolvedValue(null); // No existing booking

      await expect(
        bookingService.createBooking({
          userId: 'user-123',
          eventId: 'event-123',
        })
      ).rejects.toThrow('Event is fully booked');
    });

    it('should handle database errors during booking creation', async () => {
      mocks.setupDatabaseError();
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        bookingService.createBooking({
          userId: 'user-123',
          eventId: 'event-123',
        })
      ).rejects.toThrow();
    });

    it('should not fail booking if ticket generation fails', async () => {
      const { mockBooking } = mocks.setupSuccessfulBookingCreation();
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      mockPrisma.booking.count.mockResolvedValue(50);
      (ticketService.generateTicket as jest.Mock).mockRejectedValue(new Error('Ticket generation failed'));

      const result = await bookingService.createBooking({
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('CONFIRMED');
    });
  });

  // ============================================================================
  // USER BOOKINGS TESTS
  // ============================================================================

  describe('getUserBookings()', () => {
    it('should get user bookings successfully', async () => {
      const mockBookings = [
        mocks.createMockBooking({ id: 'booking-1', status: 'CONFIRMED' }),
        mocks.createMockBooking({ id: 'booking-2', status: 'CONFIRMED' }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mockPrisma.booking.count.mockResolvedValue(2);

      const result = await bookingService.getUserBookings('user-123');

      expect(mockPrisma.booking.findMany).toHaveBeenCalled();
      expect(result.bookings).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should filter bookings by status', async () => {
      const mockBookings = [mocks.createMockBooking({ status: 'CANCELLED' })];
      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mockPrisma.booking.count.mockResolvedValue(1);

      const result = await bookingService.getUserBookings('user-123', {
        status: BookingStatus.CANCELLED,
      });

      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'CANCELLED',
          }),
        })
      );
      expect(result.bookings).toHaveLength(1);
    });

    it('should filter bookings by eventId', async () => {
      const mockBookings = [mocks.createMockBooking({ eventId: 'event-123' })];
      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mockPrisma.booking.count.mockResolvedValue(1);

      const result = await bookingService.getUserBookings('user-123', {
        eventId: 'event-123',
      });

      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventId: 'event-123',
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      const mockBookings = [mocks.createMockBooking()];
      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mockPrisma.booking.count.mockResolvedValue(25);

      const result = await bookingService.getUserBookings('user-123', {
        page: 2,
        limit: 10,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
    });
  });

  // ============================================================================
  // BOOKING CANCELLATION TESTS
  // ============================================================================

  describe('cancelBooking()', () => {
    it('should cancel booking successfully', async () => {
      const { mockBooking, cancelledBooking } = mocks.setupSuccessfulBookingCancellation();

      const result = await bookingService.cancelBooking('booking-123', 'user-123');

      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 'booking-123' },
        include: { event: true },
      });
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-123' },
        data: { status: BookingStatus.CANCELLED },
        include: { event: true },
      });
      expect(mockEventPublisherService.publishBookingCancelled).toHaveBeenCalled();
      expect(result.status).toBe('CANCELLED');
    });

    it('should reject cancellation for non-existent booking', async () => {
      mocks.setupBookingNotFound();

      await expect(
        bookingService.cancelBooking('non-existent', 'user-123')
      ).rejects.toThrow('Booking not found');
    });

    it('should reject cancellation by different user', async () => {
      const mockBooking = mocks.createMockBooking({ userId: 'user-123' });
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        bookingService.cancelBooking('booking-123', 'different-user')
      ).rejects.toThrow('Access denied');
    });

    it('should reject cancellation of already cancelled booking', async () => {
      const mockBooking = mocks.createMockBooking({
        userId: 'user-123',
        status: 'CANCELLED',
      });
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        bookingService.cancelBooking('booking-123', 'user-123')
      ).rejects.toThrow('Booking is already cancelled');
    });
  });

  // ============================================================================
  // EVENT BOOKINGS TESTS (ADMIN)
  // ============================================================================

  describe('getEventBookings()', () => {
    it('should get event bookings successfully', async () => {
      const mockBookings = [
        mocks.createMockBooking({ eventId: 'event-123' }),
        mocks.createMockBooking({ eventId: 'event-123' }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mockPrisma.booking.count.mockResolvedValue(2);

      const result = await bookingService.getEventBookings('event-123');

      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventId: 'event-123',
          }),
        })
      );
      expect(result.bookings).toHaveLength(2);
    });

    it('should filter event bookings by status', async () => {
      const mockBookings = [mocks.createMockBooking({ status: 'CONFIRMED' })];
      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mockPrisma.booking.count.mockResolvedValue(1);

      const result = await bookingService.getEventBookings('event-123', {
        status: BookingStatus.CONFIRMED,
      });

      expect(result.bookings).toHaveLength(1);
    });
  });

  // ============================================================================
  // CAPACITY CHECKING TESTS
  // ============================================================================

  describe('checkEventCapacity()', () => {
    it('should check event capacity successfully', async () => {
      mocks.setupEventAvailableCapacity();

      const result = await bookingService.checkEventCapacity('event-123');

      expect(result.isAvailable).toBe(true);
      expect(result.capacity).toBe(100);
      expect(result.currentBookings).toBe(50);
      expect(result.remainingSlots).toBe(50);
    });

    it('should return false for full capacity', async () => {
      mocks.setupEventFullCapacity();

      const result = await bookingService.checkEventCapacity('event-123');

      expect(result.isAvailable).toBe(false);
      expect(result.remainingSlots).toBe(0);
    });

    it('should reject capacity check for non-existent event', async () => {
      mocks.setupEventNotFound();

      await expect(
        bookingService.checkEventCapacity('non-existent')
      ).rejects.toThrow('Event not found');
    });
  });

  // ============================================================================
  // BOOKING BY ID TESTS
  // ============================================================================

  describe('getBookingById()', () => {
    it('should get booking by ID successfully', async () => {
      const mockBooking = mocks.createMockBooking();
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      const result = await bookingService.getBookingById('booking-123');

      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 'booking-123' },
        include: { event: true },
      });
      expect(result).toBeDefined();
      expect(result?.id).toBe('booking-123');
    });

    it('should return null for non-existent booking', async () => {
      mocks.setupBookingNotFound();

      const result = await bookingService.getBookingById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // CANCEL ALL EVENT BOOKINGS TESTS
  // ============================================================================

  describe('cancelAllEventBookings()', () => {
    it('should cancel all event bookings successfully', async () => {
      mockPrisma.booking.updateMany.mockResolvedValue({ count: 5 });

      const result = await bookingService.cancelAllEventBookings('event-123');

      expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
        where: {
          eventId: 'event-123',
          status: BookingStatus.CONFIRMED,
        },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });
      expect(result).toBe(5);
    });
  });

  // ============================================================================
  // DASHBOARD STATISTICS TESTS
  // ============================================================================

  describe('getDashboardStats()', () => {
    it('should get dashboard statistics successfully', async () => {
      const mockBookings = [
        mocks.createMockBooking({
          status: 'CONFIRMED',
          isAttended: true,
          ticket: { id: 'ticket-1', status: 'ISSUED' },
        }),
        mocks.createMockBooking({
          status: 'CONFIRMED',
          isAttended: false,
          ticket: { id: 'ticket-2', status: 'SCANNED' },
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mocks.setupEventServiceResponse();

      const result = await bookingService.getDashboardStats('user-123');

      expect(result.registeredEvents).toBe(2);
      expect(result.attendedEvents).toBe(1);
      expect(result.ticketsPurchased).toBe(2);
      expect(result.activeTickets).toBe(2);
      expect(result.usedTickets).toBe(1);
    });
  });

  // ============================================================================
  // UPCOMING EVENTS TESTS
  // ============================================================================

  describe('getUpcomingEvents()', () => {
    it('should get upcoming events successfully', async () => {
      const mockBookings = [
        mocks.createMockBooking({
          status: 'CONFIRMED',
          ticket: { id: 'ticket-1', status: 'ISSUED' },
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mocks.setupEventServiceResponse({
        bookingStartDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const result = await bookingService.getUpcomingEvents('user-123', 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // RECENT REGISTRATIONS TESTS
  // ============================================================================

  describe('getRecentRegistrations()', () => {
    it('should get recent registrations successfully', async () => {
      const mockBookings = [
        mocks.createMockBooking({
          status: 'CONFIRMED',
          ticket: { id: 'ticket-1', status: 'ISSUED' },
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mocks.setupEventServiceResponse();

      const result = await bookingService.getRecentRegistrations('user-123', 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // NUMBER OF USERS FOR EVENT TESTS
  // ============================================================================

  describe('getNumberOfUsersForEvent()', () => {
    it('should get number of users for event successfully', async () => {
      const mockEvent = mocks.createMockEvent();
      const mockBookings = [
        mocks.createMockBooking({ status: 'CONFIRMED' }),
        mocks.createMockBooking({ status: 'CONFIRMED' }),
      ];

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mockPrisma.booking.count.mockResolvedValue(1); // Cancelled bookings

      // Mock getUserInfo
      jest.doMock('../utils/auth-helpers', () => ({
        getUserInfo: jest.fn().mockResolvedValue(mocks.createMockUser({ role: 'USER' })),
      }));

      const result = await bookingService.getNumberOfUsersForEvent('event-123');

      expect(result.totalUsers).toBeDefined();
      expect(result.confirmedBookings).toBeDefined();
      expect(result.cancelledBookings).toBeDefined();
    });

    it('should reject for non-existent event', async () => {
      mocks.setupEventNotFound();

      await expect(
        bookingService.getNumberOfUsersForEvent('non-existent')
      ).rejects.toThrow('Event not found');
    });
  });
});

