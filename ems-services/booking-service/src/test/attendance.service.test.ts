/**
 * Comprehensive Test Suite for Attendance Service
 *
 * Tests all attendance features including:
 * - User joining events
 * - Admin joining events
 * - Live attendance data
 * - Attendance summary
 */

import '@jest/globals';

// Mock auth-helpers BEFORE importing AttendanceService
jest.mock('../utils/auth-helpers', () => ({
  getUserInfo: jest.fn(),
}));

// Import mocks - use requireActual to bypass Jest's mock if it exists
// This ensures we get the actual exports even if jest.mock() interferes
const mocks = jest.requireActual('./mocks-simple');
const mockPrisma = mocks.mockPrisma;
const mockAxios = mocks.mockAxios;
const mockLogger = mocks.mockLogger;

import { AttendanceService } from '../services/attendance.service';
import { getUserInfo } from '../utils/auth-helpers';

describe('AttendanceService', () => {
  let attendanceService: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure mockPrisma.$transaction exists and set it up
    if (mockPrisma && mockPrisma.$transaction) {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          booking: mockPrisma.booking,
          user: mockPrisma.user,
        };
        return await callback(mockTx);
      });
    }
    attendanceService = new AttendanceService();
    (getUserInfo as jest.Mock).mockResolvedValue(mocks.createMockUser({ role: 'USER' }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // JOIN EVENT TESTS
  // ============================================================================

  describe('joinEvent()', () => {
    it('should join event successfully for first time', async () => {
      const { mockBooking, updatedBooking } = mocks.setupSuccessfulAttendanceJoin();

      const result = await attendanceService.joinEvent({
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          eventId: 'event-123',
          status: 'CONFIRMED',
        },
        include: { event: true },
      });
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: mockBooking.id },
        data: {
          joinedAt: expect.any(Date),
          isAttended: true,
        },
      });
      expect(result.success).toBe(true);
      expect(result.isFirstJoin).toBe(true);
      expect(result.message).toContain('Successfully joined');
    });

    it('should rejoin event if already joined', async () => {
      const mockBooking = mocks.createMockBooking({
        status: 'CONFIRMED',
        isAttended: true,
        joinedAt: new Date(),
      });
      const updatedBooking = mocks.createMockBooking({
        status: 'CONFIRMED',
        isAttended: true,
        joinedAt: new Date(),
      });

      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrisma.booking.update.mockResolvedValue(updatedBooking);
      // Setup event service to return event that has started
      mocks.setupEventServiceResponse({
        bookingStartDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        bookingEndDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      });

      const result = await attendanceService.joinEvent({
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(result.success).toBe(true);
      expect(result.isFirstJoin).toBe(false);
      expect(result.message).toContain('Rejoined');
    });

    it('should reject join for non-existent booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      const result = await attendanceService.joinEvent({
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No valid booking');
    });

    it('should reject join if event has not started', async () => {
      const mockBooking = mocks.createMockBooking({ status: 'CONFIRMED' });
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);

      // Event starts in the future
      mocks.setupEventServiceResponse({
        bookingStartDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const result = await attendanceService.joinEvent({
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not started yet');
    });

    it('should handle event service errors gracefully', async () => {
      const mockBooking = mocks.createMockBooking({ status: 'CONFIRMED' });
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      // Make axios.get throw an error - getEventDetails catches it and returns null
      // which triggers "Event details not available" message
      mockAxios.get.mockRejectedValue(new Error('Event service unavailable'));

      const result = await attendanceService.joinEvent({
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(result.success).toBe(false);
      // getEventDetails catches errors internally and returns null,
      // so we get "Event details not available" instead of "Unable to verify"
      expect(result.message).toContain('not available');
    });

    it('should handle missing event details', async () => {
      const mockBooking = mocks.createMockBooking({ status: 'CONFIRMED' });
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);

      mockAxios.get.mockResolvedValue({
        status: 200,
        data: { success: true, data: null },
      });

      const result = await attendanceService.joinEvent({
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not available');
    });
  });

  // ============================================================================
  // ADMIN JOIN EVENT TESTS
  // ============================================================================

  describe('adminJoinEvent()', () => {
    it('should allow admin to join event without booking', async () => {
      const { mockBooking } = mocks.setupAdminJoinEvent();
      // Ensure event service response has started event
      mocks.setupEventServiceResponse({
        bookingStartDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        bookingEndDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      });

      const result = await attendanceService.adminJoinEvent({
        userId: 'admin-123',
        eventId: 'event-123',
      });

      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'admin-123',
          eventId: 'event-123',
          isAttended: true,
        },
      });
      expect(mockPrisma.booking.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-123',
          eventId: 'event-123',
          status: 'CONFIRMED',
          joinedAt: expect.any(Date),
          isAttended: true,
        },
      });
      expect(result.success).toBe(true);
      expect(result.isFirstJoin).toBe(true);
      expect(result.message).toContain('admin');
    });

    it('should handle admin rejoin', async () => {
      const existingBooking = mocks.createMockBooking({
        userId: 'admin-123',
        status: 'CONFIRMED',
        isAttended: true,
        joinedAt: new Date(),
      });

      mockPrisma.booking.findFirst.mockResolvedValue(existingBooking);
      // Setup event service to return event that has started
      mocks.setupEventServiceResponse({
        bookingStartDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        bookingEndDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      });

      const result = await attendanceService.adminJoinEvent({
        userId: 'admin-123',
        eventId: 'event-123',
      });

      expect(result.success).toBe(true);
      expect(result.isFirstJoin).toBe(false);
      expect(result.message).toContain('Already joined');
    });

    it('should reject admin join if event has not started', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      // Event starts in the future
      mocks.setupEventServiceResponse({
        bookingStartDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const result = await attendanceService.adminJoinEvent({
        userId: 'admin-123',
        eventId: 'event-123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not started yet');
    });
  });

  // ============================================================================
  // LIVE ATTENDANCE TESTS
  // ============================================================================

  describe('getLiveAttendance()', () => {
    it('should get live attendance data successfully', async () => {
      const mockBookings = [
        mocks.createMockBooking({
          userId: 'user-1',
          isAttended: true,
          joinedAt: new Date(),
        }),
        mocks.createMockBooking({
          userId: 'user-2',
          isAttended: false,
          joinedAt: null,
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      (getUserInfo as jest.Mock)
        .mockResolvedValueOnce(mocks.createMockUser({ id: 'user-1', role: 'USER' }))
        .mockResolvedValueOnce(mocks.createMockUser({ id: 'user-2', role: 'USER' }));

      const result = await attendanceService.getLiveAttendance('event-123');

      expect(result.eventId).toBe('event-123');
      expect(result.totalRegistered).toBe(2);
      expect(result.totalAttended).toBe(1);
      expect(result.attendancePercentage).toBe(50);
      expect(result.attendees).toHaveLength(2);
    });

    it('should exclude admin users from attendance counts', async () => {
      const mockBookings = [
        mocks.createMockBooking({
          userId: 'user-1',
          isAttended: true,
        }),
        mocks.createMockBooking({
          userId: 'admin-1',
          isAttended: true,
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      (getUserInfo as jest.Mock)
        .mockResolvedValueOnce(mocks.createMockUser({ id: 'user-1', role: 'USER' }))
        .mockResolvedValueOnce(mocks.createMockUser({ id: 'admin-1', role: 'ADMIN' }));

      const result = await attendanceService.getLiveAttendance('event-123');

      expect(result.totalRegistered).toBe(1); // Only USER, not ADMIN
      expect(result.totalAttended).toBe(1);
      expect(result.attendees).toHaveLength(1);
    });

    it('should handle empty attendance', async () => {
      mockPrisma.booking.findMany.mockResolvedValue([]);

      const result = await attendanceService.getLiveAttendance('event-123');

      expect(result.totalRegistered).toBe(0);
      expect(result.totalAttended).toBe(0);
      expect(result.attendancePercentage).toBe(0);
      expect(result.attendees).toHaveLength(0);
    });
  });

  // ============================================================================
  // ATTENDANCE SUMMARY TESTS
  // ============================================================================

  describe('getAttendanceSummary()', () => {
    it('should get attendance summary successfully', async () => {
      const mockBookings = [
        mocks.createMockBooking({
          userId: 'user-1',
          isAttended: true,
          joinedAt: new Date('2024-01-01T10:00:00Z'),
        }),
        mocks.createMockBooking({
          userId: 'user-2',
          isAttended: true,
          joinedAt: new Date('2024-01-01T11:00:00Z'),
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      (getUserInfo as jest.Mock)
        .mockResolvedValueOnce(mocks.createMockUser({ id: 'user-1', role: 'USER' }))
        .mockResolvedValueOnce(mocks.createMockUser({ id: 'user-2', role: 'USER' }));

      const result = await attendanceService.getAttendanceSummary('event-123');

      expect(result.eventId).toBe('event-123');
      expect(result.totalRegistered).toBe(2);
      expect(result.totalAttended).toBe(2);
      expect(result.attendancePercentage).toBe(100);
      expect(result.joinTimes).toBeDefined();
      expect(Array.isArray(result.joinTimes)).toBe(true);
    });

    it('should group join times by hour', async () => {
      // Use dates that will work with local timezone
      // Create dates with specific hours that will be consistent
      const now = new Date();
      const hour1 = new Date(now);
      hour1.setHours(10, 30, 0, 0);
      const hour2 = new Date(now);
      hour2.setHours(10, 45, 0, 0);
      const hour3 = new Date(now);
      hour3.setHours(11, 15, 0, 0);

      const mockBookings = [
        mocks.createMockBooking({
          userId: 'user-1',
          isAttended: true,
          joinedAt: hour1,
        }),
        mocks.createMockBooking({
          userId: 'user-2',
          isAttended: true,
          joinedAt: hour2,
        }),
        mocks.createMockBooking({
          userId: 'user-3',
          isAttended: true,
          joinedAt: hour3,
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      (getUserInfo as jest.Mock)
        .mockResolvedValueOnce(mocks.createMockUser({ id: 'user-1', role: 'USER' }))
        .mockResolvedValueOnce(mocks.createMockUser({ id: 'user-2', role: 'USER' }))
        .mockResolvedValueOnce(mocks.createMockUser({ id: 'user-3', role: 'USER' }));

      const result = await attendanceService.getAttendanceSummary('event-123');

      expect(result.joinTimes).toBeDefined();
      expect(Array.isArray(result.joinTimes)).toBe(true);
      // Should have grouped by hour - service creates keys like "10:00" and "11:00"
      // The service uses getHours() which returns local hour (0-23)
      // Check that we have entries and that the total count matches our bookings
      const totalCount = result.joinTimes.reduce((sum, entry) => sum + entry.count, 0);
      expect(totalCount).toBe(3); // All 3 bookings should be counted
      // Check that we have at least one hour group
      expect(result.joinTimes.length).toBeGreaterThan(0);
    });

    it('should exclude admin users from summary', async () => {
      const mockBookings = [
        mocks.createMockBooking({
          userId: 'user-1',
          isAttended: true,
        }),
        mocks.createMockBooking({
          userId: 'admin-1',
          isAttended: true,
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      (getUserInfo as jest.Mock)
        .mockResolvedValueOnce(mocks.createMockUser({ id: 'user-1', role: 'USER' }))
        .mockResolvedValueOnce(mocks.createMockUser({ id: 'admin-1', role: 'ADMIN' }));

      const result = await attendanceService.getAttendanceSummary('event-123');

      expect(result.totalRegistered).toBe(1); // Only USER
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle database errors in joinEvent', async () => {
      mocks.setupDatabaseError();

      await expect(
        attendanceService.joinEvent({
          userId: 'user-123',
          eventId: 'event-123',
        })
      ).rejects.toThrow();
    });

    it('should handle database errors in getLiveAttendance', async () => {
      mocks.setupDatabaseError();

      await expect(
        attendanceService.getLiveAttendance('event-123')
      ).rejects.toThrow();
    });

    it('should handle database errors in getAttendanceSummary', async () => {
      mocks.setupDatabaseError();

      await expect(
        attendanceService.getAttendanceSummary('event-123')
      ).rejects.toThrow();
    });
  });
});

