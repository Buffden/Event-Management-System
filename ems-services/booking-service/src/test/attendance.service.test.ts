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

// Import mocks - use direct imports
import {
  mockPrisma,
  mockAxios,
  mockLogger,
  createMockBooking,
  createMockUser,
  setupSuccessfulAttendanceJoin,
  setupAdminJoinEvent,
  setupEventServiceResponse,
  setupEventServiceError,
  setupDatabaseError,
} from './mocks-simple';

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
    (getUserInfo as jest.Mock).mockResolvedValue(createMockUser({ role: 'USER' }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // JOIN EVENT TESTS
  // ============================================================================

  describe('joinEvent()', () => {
    it('should join event successfully for first time', async () => {
      const { mockBooking, updatedBooking } = setupSuccessfulAttendanceJoin();

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
      const mockBooking = createMockBooking({
        status: 'CONFIRMED',
        isAttended: true,
        joinedAt: new Date(),
      });
      const updatedBooking = createMockBooking({
        status: 'CONFIRMED',
        isAttended: true,
        joinedAt: new Date(),
      });

      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrisma.booking.update.mockResolvedValue(updatedBooking);
      setupEventServiceResponse();

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
      const mockBooking = createMockBooking({ status: 'CONFIRMED' });
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);

      // Event starts in the future
      setupEventServiceResponse({
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
      const mockBooking = createMockBooking({ status: 'CONFIRMED' });
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      setupEventServiceError();

      const result = await attendanceService.joinEvent({
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unable to verify');
    });

    it('should handle missing event details', async () => {
      const mockBooking = createMockBooking({ status: 'CONFIRMED' });
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
      const { mockBooking } = setupAdminJoinEvent();

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
      const existingBooking = createMockBooking({
        userId: 'admin-123',
        status: 'CONFIRMED',
        isAttended: true,
        joinedAt: new Date(),
      });

      mockPrisma.booking.findFirst.mockResolvedValue(existingBooking);
      setupEventServiceResponse();

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
      setupEventServiceResponse({
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
        createMockBooking({
          userId: 'user-1',
          isAttended: true,
          joinedAt: new Date(),
        }),
        createMockBooking({
          userId: 'user-2',
          isAttended: false,
          joinedAt: null,
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      (getUserInfo as jest.Mock)
        .mockResolvedValueOnce(createMockUser({ id: 'user-1', role: 'USER' }))
        .mockResolvedValueOnce(createMockUser({ id: 'user-2', role: 'USER' }));

      const result = await attendanceService.getLiveAttendance('event-123');

      expect(result.eventId).toBe('event-123');
      expect(result.totalRegistered).toBe(2);
      expect(result.totalAttended).toBe(1);
      expect(result.attendancePercentage).toBe(50);
      expect(result.attendees).toHaveLength(2);
    });

    it('should exclude admin users from attendance counts', async () => {
      const mockBookings = [
        createMockBooking({
          userId: 'user-1',
          isAttended: true,
        }),
        createMockBooking({
          userId: 'admin-1',
          isAttended: true,
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      (getUserInfo as jest.Mock)
        .mockResolvedValueOnce(createMockUser({ id: 'user-1', role: 'USER' }))
        .mockResolvedValueOnce(createMockUser({ id: 'admin-1', role: 'ADMIN' }));

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
        createMockBooking({
          userId: 'user-1',
          isAttended: true,
          joinedAt: new Date('2024-01-01T10:00:00Z'),
        }),
        createMockBooking({
          userId: 'user-2',
          isAttended: true,
          joinedAt: new Date('2024-01-01T11:00:00Z'),
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      (getUserInfo as jest.Mock)
        .mockResolvedValueOnce(createMockUser({ id: 'user-1', role: 'USER' }))
        .mockResolvedValueOnce(createMockUser({ id: 'user-2', role: 'USER' }));

      const result = await attendanceService.getAttendanceSummary('event-123');

      expect(result.eventId).toBe('event-123');
      expect(result.totalRegistered).toBe(2);
      expect(result.totalAttended).toBe(2);
      expect(result.attendancePercentage).toBe(100);
      expect(result.joinTimes).toBeDefined();
      expect(Array.isArray(result.joinTimes)).toBe(true);
    });

    it('should group join times by hour', async () => {
      const mockBookings = [
        createMockBooking({
          userId: 'user-1',
          isAttended: true,
          joinedAt: new Date('2024-01-01T10:30:00Z'),
        }),
        createMockBooking({
          userId: 'user-2',
          isAttended: true,
          joinedAt: new Date('2024-01-01T10:45:00Z'),
        }),
        createMockBooking({
          userId: 'user-3',
          isAttended: true,
          joinedAt: new Date('2024-01-01T11:15:00Z'),
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      (getUserInfo as jest.Mock)
        .mockResolvedValue(createMockUser({ role: 'USER' }));

      const result = await attendanceService.getAttendanceSummary('event-123');

      expect(result.joinTimes).toBeDefined();
      // Should have grouped by hour
      const hour10Count = result.joinTimes.find(t => t.time.includes('10:00'))?.count || 0;
      const hour11Count = result.joinTimes.find(t => t.time.includes('11:00'))?.count || 0;
      expect(hour10Count).toBeGreaterThan(0);
      expect(hour11Count).toBeGreaterThan(0);
    });

    it('should exclude admin users from summary', async () => {
      const mockBookings = [
        createMockBooking({
          userId: 'user-1',
          isAttended: true,
        }),
        createMockBooking({
          userId: 'admin-1',
          isAttended: true,
        }),
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      (getUserInfo as jest.Mock)
        .mockResolvedValueOnce(createMockUser({ id: 'user-1', role: 'USER' }))
        .mockResolvedValueOnce(createMockUser({ id: 'admin-1', role: 'ADMIN' }));

      const result = await attendanceService.getAttendanceSummary('event-123');

      expect(result.totalRegistered).toBe(1); // Only USER
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle database errors in joinEvent', async () => {
      setupDatabaseError();

      await expect(
        attendanceService.joinEvent({
          userId: 'user-123',
          eventId: 'event-123',
        })
      ).rejects.toThrow();
    });

    it('should handle database errors in getLiveAttendance', async () => {
      setupDatabaseError();

      await expect(
        attendanceService.getLiveAttendance('event-123')
      ).rejects.toThrow();
    });

    it('should handle database errors in getAttendanceSummary', async () => {
      setupDatabaseError();

      await expect(
        attendanceService.getAttendanceSummary('event-123')
      ).rejects.toThrow();
    });
  });
});

