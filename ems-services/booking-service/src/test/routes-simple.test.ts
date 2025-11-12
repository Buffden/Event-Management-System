/**
 * Simple Route Module Tests for Booking Service
 *
 * Verifies that routes can be imported and registered without errors.
 * Tests route configuration and module loading.
 */

import '@jest/globals';
import express, { Express } from 'express';

// Import mocks (resetAllMocks not needed, using jest.clearAllMocks directly)

// Mock uuid before importing routes
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-1234'),
}));

// Mock middleware
jest.mock('../middleware/auth.middleware', () => ({
  requireUser: jest.fn((req: any, res: any, next: any) => next()),
  requireAdmin: jest.fn((req: any, res: any, next: any) => next()),
  authenticateToken: jest.fn((req: any, res: any, next: any) => next()),
}));

jest.mock('../middleware/internal-service.middleware', () => ({
  requireInternalService: jest.fn((req: any, res: any, next: any) => next()),
}));

jest.mock('../middleware/error.middleware', () => ({
  asyncHandler: (fn: any) => fn,
  errorHandler: jest.fn((err: any, req: any, res: any, next: any) => next()),
}));

jest.mock('../middleware/validation.middleware', () => ({
  validateRequest: (validator: any) => (req: any, res: any, next: any) => next(),
  validateQuery: (validator: any) => (req: any, res: any, next: any) => next(),
  validatePagination: jest.fn(),
  validateBookingStatus: jest.fn(),
  validateUUID: jest.fn(),
}));

// Now import services and routes after mocks are set up
import { BookingService } from '../services/booking.service';
import { TicketService } from '../services/ticket.service';
import { AttendanceService } from '../services/attendance.service';
import bookingRoutes from '../routes/booking.routes';
import { ticketRoutes } from '../routes/ticket.routes';
import attendanceRoutes from '../routes/attendance.routes';
import adminRoutes from '../routes/admin.routes';
import internalRoutes from '../routes/internal.routes';

describe('Routes Module Tests', () => {
  let app: Express;
  let bookingService: BookingService;
  let ticketService: TicketService;
  let attendanceService: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    app = express();
    app.use(express.json());
    bookingService = new BookingService();
    ticketService = new TicketService();
    attendanceService = new AttendanceService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('Route Registration', () => {
    it('should register booking routes without errors', () => {
      expect(() => {
        app.use('/api', bookingRoutes);
      }).not.toThrow();
    });

    it('should register ticket routes without errors', () => {
      expect(() => {
        app.use('/api/tickets', ticketRoutes);
      }).not.toThrow();
    });

    it('should register attendance routes without errors', () => {
      expect(() => {
        app.use('/api', attendanceRoutes);
      }).not.toThrow();
    });

    it('should register admin routes without errors', () => {
      expect(() => {
        app.use('/api', adminRoutes);
      }).not.toThrow();
    });

    it('should register internal routes without errors', () => {
      expect(() => {
        app.use('/api', internalRoutes);
      }).not.toThrow();
    });
  });

  describe('Route Module Imports', () => {
    it('should import booking routes module successfully', async () => {
      const routesModule = await import('../routes/booking.routes');
      expect(routesModule.default).toBeDefined();
    });

    it('should import ticket routes module successfully', async () => {
      const routesModule = await import('../routes/ticket.routes');
      expect(routesModule.ticketRoutes).toBeDefined();
    });

    it('should import attendance routes module successfully', async () => {
      const routesModule = await import('../routes/attendance.routes');
      expect(routesModule.default).toBeDefined();
    });

    it('should import admin routes module successfully', async () => {
      const routesModule = await import('../routes/admin.routes');
      expect(routesModule.default).toBeDefined();
    });

    it('should import internal routes module successfully', async () => {
      const routesModule = await import('../routes/internal.routes');
      expect(routesModule.default).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('should work with BookingService instance', () => {
      expect(bookingService).toBeDefined();
      expect(bookingService).toBeInstanceOf(BookingService);
    });

    it('should work with TicketService instance', () => {
      expect(ticketService).toBeDefined();
      expect(ticketService).toBeInstanceOf(TicketService);
    });

    it('should work with AttendanceService instance', () => {
      expect(attendanceService).toBeDefined();
      expect(attendanceService).toBeInstanceOf(AttendanceService);
    });

    it('should register all routes together', () => {
      expect(() => {
        app.use('/api', bookingRoutes);
        app.use('/api/tickets', ticketRoutes);
        app.use('/api', attendanceRoutes);
        app.use('/api', adminRoutes);
        app.use('/api', internalRoutes);
      }).not.toThrow();
    });
  });
});

