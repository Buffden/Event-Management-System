/**
 * Admin Routes Integration Tests
 *
 * Tests for admin routes using Supertest
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { mockPrisma, createMockEvent, createMockVenue, mockLogger, mockAuthValidationService } from '../../test/mocks-simple';

// Mock auth middleware
jest.mock('../../middleware/auth.middleware', () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    req.user = { userId: 'admin-123', email: 'admin@example.com', role: 'ADMIN' };
    next();
  },
}));

jest.mock('../../middleware/error.middleware', () => ({
  asyncHandler: (fn: any) => async (req: any, res: any, next: any) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  },
}));

// Mock services
jest.mock('../../services/event.service', () => ({
  eventService: {
    getEvents: jest.fn(),
    getEventById: jest.fn(),
    approveEvent: jest.fn(),
    rejectEvent: jest.fn(),
    updateEventAsAdmin: jest.fn(),
    cancelEvent: jest.fn(),
    deleteEvent: jest.fn(),
  },
}));

jest.mock('../../services/venue.service', () => ({
  venueService: {
    createVenue: jest.fn(),
    updateVenue: jest.fn(),
    deleteVenue: jest.fn(),
    getVenueById: jest.fn(),
    getVenues: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: mockLogger,
}));

// Mock database
jest.mock('../../database', () => ({
  prisma: mockPrisma,
}));

// Import routes after mocks
import adminRoutes from '../admin.routes';
import { eventService } from '../../services/event.service';
import { venueService } from '../../services/venue.service';

describe('Admin Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', adminRoutes);
  });

  describe('GET /api/admin/events', () => {
    it('should return list of all events', async () => {
      const mockEvents = {
        events: [createMockEvent()],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      (eventService.getEvents as jest.MockedFunction<any>).mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/admin/events')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.events).toBeDefined();
      expect(eventService.getEvents).toHaveBeenCalledWith(
        expect.any(Object),
        true
      );
    });

    it('should handle status filter', async () => {
      const mockEvents = {
        events: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      (eventService.getEvents as jest.MockedFunction<any>).mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/admin/events')
        .query({ status: 'DRAFT' });

      expect(response.status).toBe(200);
      expect(eventService.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DRAFT' }),
        true
      );
    });

    it('should handle query without venueId', async () => {
      const mockEvents = {
        events: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      (eventService.getEvents as jest.MockedFunction<any>).mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/admin/events')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(eventService.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({ venueId: undefined }),
        true
      );
    });
  });

  describe('GET /api/admin/events/:id', () => {
    it('should return event by ID', async () => {
      const mockEvent = createMockEvent({ id: 'event-123' });
      (eventService.getEventById as jest.MockedFunction<any>).mockResolvedValue(mockEvent);

      const response = await request(app)
        .get('/api/admin/events/event-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('event-123');
      expect(eventService.getEventById).toHaveBeenCalledWith('event-123', true);
    });

    it('should return 404 when event not found', async () => {
      (eventService.getEventById as jest.MockedFunction<any>).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/admin/events/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/admin/events/:id/approve', () => {
    it('should approve event', async () => {
      const mockEvent = createMockEvent({ id: 'event-123', status: 'PUBLISHED' });
      (eventService.approveEvent as jest.MockedFunction<any>).mockResolvedValue(mockEvent);

      const response = await request(app)
        .patch('/api/admin/events/event-123/approve');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('event-123');
      expect(eventService.approveEvent).toHaveBeenCalledWith('event-123');
    });
  });

  describe('PATCH /api/admin/events/:id/reject', () => {
    it('should reject event', async () => {
      const mockEvent = createMockEvent({ id: 'event-123', status: 'REJECTED' });
      (eventService.rejectEvent as jest.MockedFunction<any>).mockResolvedValue(mockEvent);

      const response = await request(app)
        .patch('/api/admin/events/event-123/reject')
        .send({ rejectionReason: 'Not suitable' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(eventService.rejectEvent).toHaveBeenCalledWith('event-123', 'Not suitable');
    });

    it('should return 400 when rejection reason is missing', async () => {
      const response = await request(app)
        .patch('/api/admin/events/event-123/reject')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 when rejection reason is empty', async () => {
      const response = await request(app)
        .patch('/api/admin/events/event-123/reject')
        .send({ rejectionReason: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when rejection reason is too short', async () => {
      const response = await request(app)
        .patch('/api/admin/events/event-123/reject')
        .send({ rejectionReason: 'Short' });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/admin/events/:id', () => {
    it('should update event as admin', async () => {
      const mockEvent = createMockEvent({ id: 'event-123', name: 'Updated Event' });
      (eventService.updateEventAsAdmin as jest.MockedFunction<any>).mockResolvedValue(mockEvent);

      const response = await request(app)
        .put('/api/admin/events/event-123')
        .send({ name: 'Updated Event' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(eventService.updateEventAsAdmin).toHaveBeenCalledWith('event-123', { name: 'Updated Event' });
    });

    it('should return 400 when name is empty', async () => {
      const response = await request(app)
        .put('/api/admin/events/event-123')
        .send({ name: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when description is empty', async () => {
      const response = await request(app)
        .put('/api/admin/events/event-123')
        .send({ description: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when category is empty', async () => {
      const response = await request(app)
        .put('/api/admin/events/event-123')
        .send({ category: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when venueId is invalid', async () => {
      const response = await request(app)
        .put('/api/admin/events/event-123')
        .send({ venueId: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when bookingStartDate is invalid', async () => {
      const response = await request(app)
        .put('/api/admin/events/event-123')
        .send({ bookingStartDate: 'invalid-date' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when bookingEndDate is invalid', async () => {
      const response = await request(app)
        .put('/api/admin/events/event-123')
        .send({ bookingEndDate: 'invalid-date' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when booking start date is after end date', async () => {
      const response = await request(app)
        .put('/api/admin/events/event-123')
        .send({
          bookingStartDate: '2025-12-31T23:59:59Z',
          bookingEndDate: '2025-12-01T00:00:00Z',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/admin/venues', () => {
    it('should create venue', async () => {
      const mockVenue = createMockVenue({ id: 1, name: 'New Venue' });
      (venueService.createVenue as jest.MockedFunction<any>).mockResolvedValue(mockVenue);

      const response = await request(app)
        .post('/api/admin/venues')
        .send({
          name: 'New Venue',
          address: '123 Test St',
          capacity: 100,
          openingTime: '09:00',
          closingTime: '18:00',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(venueService.createVenue).toHaveBeenCalled();
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/admin/venues')
        .send({
          address: '123 Test St',
          capacity: 100,
          openingTime: '09:00',
          closingTime: '18:00',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when name is empty', async () => {
      const response = await request(app)
        .post('/api/admin/venues')
        .send({
          name: '   ',
          address: '123 Test St',
          capacity: 100,
          openingTime: '09:00',
          closingTime: '18:00',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when address is missing', async () => {
      const response = await request(app)
        .post('/api/admin/venues')
        .send({
          name: 'New Venue',
          capacity: 100,
          openingTime: '09:00',
          closingTime: '18:00',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when address is empty', async () => {
      const response = await request(app)
        .post('/api/admin/venues')
        .send({
          name: 'New Venue',
          address: '   ',
          capacity: 100,
          openingTime: '09:00',
          closingTime: '18:00',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when capacity is invalid', async () => {
      const response = await request(app)
        .post('/api/admin/venues')
        .send({
          name: 'New Venue',
          address: '123 Test St',
          capacity: 'invalid',
          openingTime: '09:00',
          closingTime: '18:00',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when capacity is zero or negative', async () => {
      const response = await request(app)
        .post('/api/admin/venues')
        .send({
          name: 'New Venue',
          address: '123 Test St',
          capacity: 0,
          openingTime: '09:00',
          closingTime: '18:00',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when openingTime format is invalid', async () => {
      const response = await request(app)
        .post('/api/admin/venues')
        .send({
          name: 'New Venue',
          address: '123 Test St',
          capacity: 100,
          openingTime: '25:00',
          closingTime: '18:00',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when closingTime format is invalid', async () => {
      const response = await request(app)
        .post('/api/admin/venues')
        .send({
          name: 'New Venue',
          address: '123 Test St',
          capacity: 100,
          openingTime: '09:00',
          closingTime: '25:00',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/admin/venues/:id', () => {
    it('should update venue', async () => {
      const mockVenue = createMockVenue({ id: 1, name: 'Updated Venue' });
      (venueService.updateVenue as jest.MockedFunction<any>).mockResolvedValue(mockVenue);

      const response = await request(app)
        .put('/api/admin/venues/1')
        .send({ name: 'Updated Venue' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(venueService.updateVenue).toHaveBeenCalledWith(1, { name: 'Updated Venue' });
    });

    it('should return 400 when name is empty', async () => {
      const response = await request(app)
        .put('/api/admin/venues/1')
        .send({ name: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when address is empty', async () => {
      const response = await request(app)
        .put('/api/admin/venues/1')
        .send({ address: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when capacity is invalid', async () => {
      const response = await request(app)
        .put('/api/admin/venues/1')
        .send({ capacity: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when capacity is zero or negative', async () => {
      const response = await request(app)
        .put('/api/admin/venues/1')
        .send({ capacity: -1 });

      expect(response.status).toBe(400);
    });

    it('should return 400 when openingTime format is invalid', async () => {
      const response = await request(app)
        .put('/api/admin/venues/1')
        .send({ openingTime: '25:00' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when closingTime format is invalid', async () => {
      const response = await request(app)
        .put('/api/admin/venues/1')
        .send({ closingTime: '25:00' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/venues/:id', () => {
    it('should delete venue', async () => {
      (venueService.deleteVenue as jest.MockedFunction<any>).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/admin/venues/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(venueService.deleteVenue).toHaveBeenCalledWith(1);
    });
  });

  describe('PATCH /api/admin/events/:id/cancel', () => {
    it('should cancel event', async () => {
      const mockEvent = createMockEvent({ id: 'event-123', status: 'CANCELLED' });
      (eventService.cancelEvent as jest.MockedFunction<any>).mockResolvedValue(mockEvent);

      const response = await request(app)
        .patch('/api/admin/events/event-123/cancel');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(eventService.cancelEvent).toHaveBeenCalledWith('event-123');
    });
  });

  describe('GET /api/admin/venues', () => {
    it('should return list of venues with filters', async () => {
      const mockVenues = {
        venues: [createMockVenue()],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      (venueService.getVenues as jest.MockedFunction<any>).mockResolvedValue(mockVenues);

      const response = await request(app)
        .get('/api/admin/venues')
        .query({ page: 1, limit: 10, name: 'Test Venue' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(venueService.getVenues).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          name: 'Test Venue',
        })
      );
    });

    it('should handle query without capacity filter', async () => {
      const mockVenues = {
        venues: [createMockVenue()],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      (venueService.getVenues as jest.MockedFunction<any>).mockResolvedValue(mockVenues);

      const response = await request(app)
        .get('/api/admin/venues')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(venueService.getVenues).toHaveBeenCalledWith(
        expect.objectContaining({
          capacity: undefined,
        })
      );
    });
  });

  describe('GET /api/admin/venues/:id', () => {
    it('should return venue by ID', async () => {
      const mockVenue = createMockVenue({ id: 1 });
      (venueService.getVenueById as jest.MockedFunction<any>).mockResolvedValue(mockVenue);

      const response = await request(app)
        .get('/api/admin/venues/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(1);
      expect(venueService.getVenueById).toHaveBeenCalledWith(1);
    });

    it('should return 404 when venue not found', async () => {
      (venueService.getVenueById as jest.MockedFunction<any>).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/admin/venues/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Venue not found');
    });
  });

  describe('GET /api/stats', () => {
    it('should return event statistics', async () => {
      mockPrisma.event.count
        .mockResolvedValueOnce(100) // totalEvents
        .mockResolvedValueOnce(50);  // activeEvents

      const response = await request(app)
        .get('/api/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalEvents).toBe(100);
      expect(response.body.data.activeEvents).toBe(50);
    });
  });

  describe('GET /api/reports/event-status', () => {
    it('should return event status distribution', async () => {
      mockPrisma.event.count
        .mockResolvedValueOnce(100) // totalEvents
        .mockResolvedValueOnce(50)  // PUBLISHED
        .mockResolvedValueOnce(20)  // DRAFT
        .mockResolvedValueOnce(15)  // PENDING_APPROVAL
        .mockResolvedValueOnce(10)  // REJECTED
        .mockResolvedValueOnce(5)   // CANCELLED
        .mockResolvedValueOnce(0);  // COMPLETED

      const response = await request(app)
        .get('/api/reports/event-status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle case when totalEvents is 0', async () => {
      mockPrisma.event.count
        .mockResolvedValueOnce(0)   // totalEvents
        .mockResolvedValueOnce(0)   // PUBLISHED
        .mockResolvedValueOnce(0)   // DRAFT
        .mockResolvedValueOnce(0)   // PENDING_APPROVAL
        .mockResolvedValueOnce(0)   // REJECTED
        .mockResolvedValueOnce(0)   // CANCELLED
        .mockResolvedValueOnce(0);  // COMPLETED

      const response = await request(app)
        .get('/api/reports/event-status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0); // All filtered out since count is 0
    });
  });
});

