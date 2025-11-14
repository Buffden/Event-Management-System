/**
 * Test Suite for Seeder Routes
 *
 * Tests seeder-specific routes for updating booking dates.
 */

import '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';

// Create shared mock function using var so it's hoisted (following auth-service pattern)
var mockUpdateManyShared: jest.Mock;
mockUpdateManyShared = jest.fn();

// Use jest.doMock for dynamic imports - this must be called before the import
jest.doMock('../../database', () => {
  return {
    prisma: {
      booking: {
        updateMany: mockUpdateManyShared,
      },
    },
  };
});

// Also use jest.mock for static imports
jest.mock('../../database', () => {
  return {
    prisma: {
      booking: {
        updateMany: mockUpdateManyShared,
      },
    },
  };
});

jest.mock('../../utils/logger', () => {
  const mockLoggerInfoFn = jest.fn();
  const mockLoggerDebugFn = jest.fn();
  const mockLoggerErrorFn = jest.fn();
  return {
    logger: {
      info: mockLoggerInfoFn,
      debug: mockLoggerDebugFn,
      error: mockLoggerErrorFn,
    },
    __mockLoggerInfo: mockLoggerInfoFn, // Export for test access
    __mockLoggerDebug: mockLoggerDebugFn, // Export for test access
    __mockLoggerError: mockLoggerErrorFn, // Export for test access
  };
});

jest.mock('../../middleware/auth.middleware', () => ({
  requireAdmin: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'admin-123',
      email: 'admin@example.com',
      role: 'ADMIN'
    };
    next();
  }),
}));

jest.mock('../../middleware/error.middleware', () => ({
  asyncHandler: (fn: any) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  },
}));

// Get logger mocks from the mocked modules
const mockLoggerModule = jest.requireMock('../../utils/logger') as any;
const mockLoggerInfoFn = mockLoggerModule.__mockLoggerInfo;
const mockLoggerDebugFn = mockLoggerModule.__mockLoggerDebug;
const mockLoggerErrorFn = mockLoggerModule.__mockLoggerError;

// Import the route AFTER mocks are set up
import seederRoutes from '../seeder.routes';

// Helper function to get the mock - use the shared mock function
const getMockUpdateMany = () => {
  return mockUpdateManyShared;
};

describe('Seeder Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the database mock FIRST, before routes are registered
    mockUpdateManyShared.mockClear();
    // Set default return value
    mockUpdateManyShared.mockResolvedValue({ count: 1 });

    // Reset logger mocks
    mockLoggerInfoFn.mockClear();
    mockLoggerDebugFn.mockClear();
    mockLoggerErrorFn.mockClear();

    app = express();
    app.use(express.json());
    app.use('/api/admin', seederRoutes);
  });

  describe('POST /admin/seed/update-booking-date', () => {
    it('should update booking date successfully', async () => {
      const bookingId = 'booking-123';
      const createdAt = '2024-01-01T00:00:00.000Z';
      const createdAtDate = new Date(createdAt);

      // Ensure mock is set up before making the request
      const mockUpdateMany = getMockUpdateMany();
      // Verify it's a mock function
      if (!mockUpdateMany || typeof mockUpdateMany.mockResolvedValue !== 'function') {
        throw new Error('Mock is not properly set up. Got: ' + typeof mockUpdateMany);
      }
      mockUpdateMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .post('/api/admin/seed/update-booking-date')
        .send({ bookingId, createdAt });

      // Debug: log the response if it's not 200
      if (response.status !== 200) {
        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(response.body, null, 2));
        console.log('Mock was called:', mockUpdateMany.mock.calls.length, 'times');
      }

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated successfully');
      expect(getMockUpdateMany()).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: { createdAt: createdAtDate },
      });
      expect(mockLoggerInfoFn).toHaveBeenCalled();
      expect(mockLoggerDebugFn).toHaveBeenCalled();
    });

    it('should return 400 when bookingId is missing', async () => {
      const response = await request(app)
        .post('/api/admin/seed/update-booking-date')
        .send({ createdAt: '2024-01-01T00:00:00.000Z' })
        .expect(400);

      expect(response.body.error).toBe('bookingId is required and must be a string');
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 400 when createdAt is missing', async () => {
      const response = await request(app)
        .post('/api/admin/seed/update-booking-date')
        .send({ bookingId: 'booking-123' })
        .expect(400);

      expect(response.body.error).toBe('createdAt is required and must be an ISO date string');
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 400 when bookingId is not a string', async () => {
      const response = await request(app)
        .post('/api/admin/seed/update-booking-date')
        .send({ bookingId: 123, createdAt: '2024-01-01T00:00:00.000Z' })
        .expect(400);

      expect(response.body.error).toBe('bookingId is required and must be a string');
    });

    it('should return 400 when createdAt is not a string', async () => {
      const response = await request(app)
        .post('/api/admin/seed/update-booking-date')
        .send({ bookingId: 'booking-123', createdAt: 123 })
        .expect(400);

      expect(response.body.error).toBe('createdAt is required and must be an ISO date string');
    });

    it('should return 400 when createdAt is not a valid date', async () => {
      const response = await request(app)
        .post('/api/admin/seed/update-booking-date')
        .send({ bookingId: 'booking-123', createdAt: 'invalid-date' })
        .expect(400);

      expect(response.body.error).toBe('createdAt must be a valid ISO date string');
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 404 when booking is not found', async () => {
      const bookingId = 'non-existent-booking';
      const createdAt = '2024-01-01T00:00:00.000Z';

      getMockUpdateMany().mockResolvedValue({ count: 0 });

      const response = await request(app)
        .post('/api/admin/seed/update-booking-date')
        .send({ bookingId, createdAt })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 500 on database error', async () => {
      const bookingId = 'booking-123';
      const createdAt = '2024-01-01T00:00:00.000Z';

      getMockUpdateMany().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/admin/seed/update-booking-date')
        .send({ bookingId, createdAt })
        .expect(500);

      expect(response.body.error).toBe('Failed to update booking date');
      expect(mockLoggerErrorFn).toHaveBeenCalled();
    });

    it('should log admin information', async () => {
      const bookingId = 'booking-123';
      const createdAt = '2024-01-01T00:00:00.000Z';

      getMockUpdateMany().mockResolvedValue({ count: 1 });

      await request(app)
        .post('/api/admin/seed/update-booking-date')
        .send({ bookingId, createdAt })
        .expect(200);

      expect(mockLoggerInfoFn).toHaveBeenCalledWith(
        'Updating booking creation date (seeding)',
        expect.objectContaining({
          bookingId,
          adminId: 'admin-123',
          createdAt: expect.any(String),
        })
      );
    });
  });
});

