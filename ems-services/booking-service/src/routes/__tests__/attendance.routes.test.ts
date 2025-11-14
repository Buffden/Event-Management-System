/**
 * Test Suite for Attendance Routes
 *
 * Tests all attendance route endpoints including:
 * - Join event
 * - Admin join event
 * - Get live attendance
 * - Get attendance summary
 * - Get attendance metrics
 */

import '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';
import attendanceRoutes from '../attendance.routes';

// Mock dependencies - define mocks inside factory functions since jest.mock is hoisted
jest.mock('../../services/attendance.service', () => {
  const mockJoinEvent = jest.fn();
  const mockAdminJoinEvent = jest.fn();
  const mockGetLiveAttendance = jest.fn();
  const mockGetAttendanceSummary = jest.fn();
  return {
    attendanceService: {
      joinEvent: mockJoinEvent,
      adminJoinEvent: mockAdminJoinEvent,
      getLiveAttendance: mockGetLiveAttendance,
      getAttendanceSummary: mockGetAttendanceSummary,
    },
    __mockJoinEvent: mockJoinEvent,
    __mockAdminJoinEvent: mockAdminJoinEvent,
    __mockGetLiveAttendance: mockGetLiveAttendance,
    __mockGetAttendanceSummary: mockGetAttendanceSummary,
  };
});

jest.mock('../../middleware/auth.middleware', () => ({
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'USER'
    };
    next();
  }),
}));

jest.mock('../../middleware/error.middleware', () => ({
  asyncHandler: (fn: any) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  },
}));

// Get mocks from modules
const { attendanceService } = require('../../services/attendance.service');
const mockJoinEvent = (attendanceService as any).__mockJoinEvent || attendanceService.joinEvent;
const mockAdminJoinEvent = (attendanceService as any).__mockAdminJoinEvent || attendanceService.adminJoinEvent;
const mockGetLiveAttendance = (attendanceService as any).__mockGetLiveAttendance || attendanceService.getLiveAttendance;
const mockGetAttendanceSummary = (attendanceService as any).__mockGetAttendanceSummary || attendanceService.getAttendanceSummary;

describe('Attendance Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', attendanceRoutes);
  });

  describe('POST /attendance/join', () => {
    it('should join event successfully', async () => {
      (mockJoinEvent as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Successfully joined event',
        joinedAt: new Date().toISOString(),
        isFirstJoin: true,
      });

      const response = await request(app)
        .post('/api/attendance/join')
        .send({ eventId: 'event-123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockJoinEvent).toHaveBeenCalledWith({
        userId: 'user-123',
        eventId: 'event-123',
      });
    });

    it('should return 400 when eventId is missing', async () => {
      const response = await request(app)
        .post('/api/attendance/join')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Event ID is required');
      expect(mockJoinEvent).not.toHaveBeenCalled();
    });

    it('should return 400 when join fails', async () => {
      (mockJoinEvent as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Event is full',
        isFirstJoin: false,
      });

      const response = await request(app)
        .post('/api/attendance/join')
        .send({ eventId: 'event-123' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 500 on service error', async () => {
      (mockJoinEvent as jest.Mock).mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/attendance/join')
        .send({ eventId: 'event-123' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });

    it('should return 401 when user is not authenticated', async () => {
      // Mock middleware to not set user
      jest.doMock('../../middleware/auth.middleware', () => ({
        authenticateToken: jest.fn((req: any, res: any, next: any) => {
          req.user = undefined;
          next();
        }),
      }));

      // Need to recreate app with new mock
      const appWithoutUser = express();
      appWithoutUser.use(express.json());
      appWithoutUser.use((req: any, res: any, next: any) => {
        req.user = undefined;
        next();
      });
      appWithoutUser.use('/api', attendanceRoutes);

      const response = await request(appWithoutUser)
        .post('/api/attendance/join')
        .send({ eventId: 'event-123' })
        .expect(401);

      expect(response.body.error).toBe('User not authenticated');
    });
  });

  describe('POST /attendance/admin/join', () => {
    beforeEach(() => {
      // Mock admin user
      jest.doMock('../../middleware/auth.middleware', () => ({
        authenticateToken: jest.fn((req: any, res: any, next: any) => {
          req.user = {
            userId: 'admin-123',
            email: 'admin@example.com',
            role: 'ADMIN'
          };
          next();
        }),
      }));
    });

    it('should allow admin to join event', async () => {
      const appWithAdmin = express();
      appWithAdmin.use(express.json());
      appWithAdmin.use((req: any, res: any, next: any) => {
        req.user = {
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'ADMIN'
        };
        next();
      });
      appWithAdmin.use('/api', attendanceRoutes);

      (mockAdminJoinEvent as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Admin joined event',
        joinedAt: new Date().toISOString(),
        isFirstJoin: true,
      });

      const response = await request(appWithAdmin)
        .post('/api/attendance/admin/join')
        .send({ eventId: 'event-123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAdminJoinEvent).toHaveBeenCalledWith({
        userId: 'admin-123',
        eventId: 'event-123',
      });
    });

    it('should return 403 for non-admin users', async () => {
      const appWithUser = express();
      appWithUser.use(express.json());
      appWithUser.use((req: any, res: any, next: any) => {
        req.user = {
          userId: 'user-123',
          email: 'user@example.com',
          role: 'USER'
        };
        next();
      });
      appWithUser.use('/api', attendanceRoutes);

      const response = await request(appWithUser)
        .post('/api/attendance/admin/join')
        .send({ eventId: 'event-123' })
        .expect(403);

      expect(response.body.error).toBe('Only admins can use this endpoint');
    });

    it('should return 400 when eventId is missing', async () => {
      const appWithAdmin = express();
      appWithAdmin.use(express.json());
      appWithAdmin.use((req: any, res: any, next: any) => {
        req.user = {
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'ADMIN'
        };
        next();
      });
      appWithAdmin.use('/api', attendanceRoutes);

      const response = await request(appWithAdmin)
        .post('/api/attendance/admin/join')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Event ID is required');
    });

    it('should return 400 when admin join fails', async () => {
      const appWithAdmin = express();
      appWithAdmin.use(express.json());
      appWithAdmin.use((req: any, res: any, next: any) => {
        req.user = {
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'ADMIN'
        };
        next();
      });
      appWithAdmin.use('/api', attendanceRoutes);

      (mockAdminJoinEvent as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Failed to join',
        isFirstJoin: false,
      });

      const response = await request(appWithAdmin)
        .post('/api/attendance/admin/join')
        .send({ eventId: 'event-123' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 500 on service error', async () => {
      const appWithAdmin = express();
      appWithAdmin.use(express.json());
      appWithAdmin.use((req: any, res: any, next: any) => {
        req.user = {
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'ADMIN'
        };
        next();
      });
      appWithAdmin.use('/api', attendanceRoutes);

      (mockAdminJoinEvent as jest.Mock).mockRejectedValue(new Error('Service error'));

      const response = await request(appWithAdmin)
        .post('/api/attendance/admin/join')
        .send({ eventId: 'event-123' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('GET /attendance/live/:eventId', () => {
    it('should return live attendance for admin', async () => {
      const appWithAdmin = express();
      appWithAdmin.use(express.json());
      appWithAdmin.use((req: any, res: any, next: any) => {
        req.user = {
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'ADMIN'
        };
        next();
      });
      appWithAdmin.use('/api', attendanceRoutes);

      const mockAttendanceData = {
        eventId: 'event-123',
        totalRegistered: 10,
        totalAttended: 5,
        attendancePercentage: 50,
        attendees: [],
      };

      (mockGetLiveAttendance as jest.Mock).mockResolvedValue(mockAttendanceData);

      const response = await request(appWithAdmin)
        .get('/api/attendance/live/event-123')
        .expect(200);

      expect(response.body).toEqual(mockAttendanceData);
      expect(mockGetLiveAttendance).toHaveBeenCalledWith('event-123');
    });

    it('should return live attendance for speaker', async () => {
      const appWithSpeaker = express();
      appWithSpeaker.use(express.json());
      appWithSpeaker.use((req: any, res: any, next: any) => {
        req.user = {
          userId: 'speaker-123',
          email: 'speaker@example.com',
          role: 'SPEAKER'
        };
        next();
      });
      appWithSpeaker.use('/api', attendanceRoutes);

      const mockAttendanceData = {
        eventId: 'event-123',
        totalRegistered: 10,
        totalAttended: 5,
        attendancePercentage: 50,
        attendees: [],
      };

      (mockGetLiveAttendance as jest.Mock).mockResolvedValue(mockAttendanceData);

      const response = await request(appWithSpeaker)
        .get('/api/attendance/live/event-123')
        .expect(200);

      expect(response.body).toEqual(mockAttendanceData);
    });

    it('should return 403 for regular users', async () => {
      const response = await request(app)
        .get('/api/attendance/live/event-123')
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin or speaker role required.');
    });

    it('should return 500 on service error', async () => {
      const appWithAdmin = express();
      appWithAdmin.use(express.json());
      appWithAdmin.use((req: any, res: any, next: any) => {
        req.user = {
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'ADMIN'
        };
        next();
      });
      appWithAdmin.use('/api', attendanceRoutes);

      (mockGetLiveAttendance as jest.Mock).mockRejectedValue(new Error('Service error'));

      const response = await request(appWithAdmin)
        .get('/api/attendance/live/event-123')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /attendance/summary/:eventId', () => {
    it('should return attendance summary for admin', async () => {
      const appWithAdmin = express();
      appWithAdmin.use(express.json());
      appWithAdmin.use((req: any, res: any, next: any) => {
        req.user = {
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'ADMIN'
        };
        next();
      });
      appWithAdmin.use('/api', attendanceRoutes);

      const mockSummary = {
        eventId: 'event-123',
        totalRegistered: 10,
        totalAttended: 5,
        attendancePercentage: 50,
      };

      (mockGetAttendanceSummary as jest.Mock).mockResolvedValue(mockSummary);

      const response = await request(appWithAdmin)
        .get('/api/attendance/summary/event-123')
        .expect(200);

      expect(response.body).toEqual(mockSummary);
      expect(mockGetAttendanceSummary).toHaveBeenCalledWith('event-123');
    });

    it('should return 403 for regular users', async () => {
      const response = await request(app)
        .get('/api/attendance/summary/event-123')
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin or speaker role required.');
    });

    it('should return 500 on service error', async () => {
      const appWithAdmin = express();
      appWithAdmin.use(express.json());
      appWithAdmin.use((req: any, res: any, next: any) => {
        req.user = {
          userId: 'admin-123',
          email: 'admin@example.com',
          role: 'ADMIN'
        };
        next();
      });
      appWithAdmin.use('/api', attendanceRoutes);

      (mockGetAttendanceSummary as jest.Mock).mockRejectedValue(new Error('Service error'));

      const response = await request(appWithAdmin)
        .get('/api/attendance/summary/event-123')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /attendance/metrics/:eventId', () => {
    it('should return basic attendance metrics for any authenticated user', async () => {
      const mockAttendanceData = {
        eventId: 'event-123',
        totalRegistered: 10,
        totalAttended: 5,
        attendancePercentage: 50,
        attendees: [],
      };

      (mockGetLiveAttendance as jest.Mock).mockResolvedValue(mockAttendanceData);

      const response = await request(app)
        .get('/api/attendance/metrics/event-123')
        .expect(200);

      expect(response.body).toEqual({
        eventId: 'event-123',
        totalAttended: 5,
        totalRegistered: 10,
        attendancePercentage: 50,
      });
    });

    it('should return 500 on service error', async () => {
      (mockGetLiveAttendance as jest.Mock).mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/attendance/metrics/event-123')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });
});

