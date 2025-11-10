/**
 * Public Routes Integration Tests
 *
 * Tests for public routes using Supertest
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { mockPrisma, createMockEvent, createMockVenue, mockLogger } from '../../test/mocks-simple';

// Mock middleware
jest.mock('../../middleware/error.middleware', () => ({
  asyncHandler: (fn: any) => async (req: any, res: any, next: any) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  },
}));

jest.mock('../../middleware/validation.middleware', () => {
  const actual = jest.requireActual('../../middleware/validation.middleware');
  return {
    ...actual,
    validateQuery: (fn: any) => (req: any, res: any, next: any) => {
      const errors = fn(req.query);
      if (errors && errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }
      next();
    },
  };
});

// Mock services
jest.mock('../../services/event.service', () => ({
  eventService: {
    getEvents: jest.fn(),
    getEventById: jest.fn(),
  },
}));

jest.mock('../../services/venue.service', () => ({
  venueService: {
    getVenues: jest.fn(),
    getAllVenues: jest.fn(),
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
import publicRoutes from '../public.routes';
import { eventService } from '../../services/event.service';
import { venueService } from '../../services/venue.service';

describe('Public Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', publicRoutes);
  });

  describe('GET /api/events', () => {
    it('should return list of published events', async () => {
      const mockEvents = {
        events: [createMockEvent({ status: 'PUBLISHED' })],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      (eventService.getEvents as jest.MockedFunction<any>).mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/events')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.events).toBeDefined();
      expect(eventService.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PUBLISHED',
          page: 1,
          limit: 10,
        }),
        false
      );
    });

    it('should handle pagination parameters', async () => {
      const mockEvents = {
        events: [],
        total: 0,
        page: 2,
        limit: 20,
        totalPages: 0,
      };

      (eventService.getEvents as jest.MockedFunction<any>).mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/events')
        .query({ page: 2, limit: 20 });

      expect(response.status).toBe(200);
      expect(eventService.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 20,
        }),
        false
      );
    });

    it('should handle filters', async () => {
      const mockEvents = {
        events: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      (eventService.getEvents as jest.MockedFunction<any>).mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/events')
        .query({
          category: 'CONFERENCE',
          venueId: '1',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
        });

      expect(response.status).toBe(200);
      expect(eventService.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'CONFERENCE',
          venueId: 1,
          bookingStartDate: '2024-01-01T00:00:00Z',
          bookingEndDate: '2024-12-31T23:59:59Z',
        }),
        false
      );
    });

    it('should return 400 for invalid pagination', async () => {
      const response = await request(app)
        .get('/api/events')
        .query({ page: -1, limit: 200 });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid date range', async () => {
      const response = await request(app)
        .get('/api/events')
        .query({
          startDate: 'invalid-date',
          endDate: '2024-12-31T23:59:59Z',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/events/:id', () => {
    it('should return published event by ID', async () => {
      const mockEvent = createMockEvent({ id: 'event-123', status: 'PUBLISHED' });
      (eventService.getEventById as jest.MockedFunction<any>).mockResolvedValue(mockEvent);

      const response = await request(app)
        .get('/api/events/event-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('event-123');
      expect(eventService.getEventById).toHaveBeenCalledWith('event-123', false);
    });

    it('should return 404 when event not found', async () => {
      (eventService.getEventById as jest.MockedFunction<any>).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/events/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found or not published');
    });
  });

  describe('GET /api/venues', () => {
    it('should return list of venues', async () => {
      const mockVenues = {
        venues: [createMockVenue()],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      (venueService.getVenues as jest.MockedFunction<any>).mockResolvedValue(mockVenues);

      const response = await request(app)
        .get('/api/venues')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.venues).toBeDefined();
    });

    it('should handle venue filters', async () => {
      const mockVenues = {
        venues: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      (venueService.getVenues as jest.MockedFunction<any>).mockResolvedValue(mockVenues);

      const response = await request(app)
        .get('/api/venues')
        .query({ name: 'Test', capacity: 100 });

      expect(response.status).toBe(200);
      expect(venueService.getVenues).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test',
          capacity: 100,
        })
      );
    });
  });

  describe('GET /api/venues/all', () => {
    it('should return all venues', async () => {
      const mockVenues = [createMockVenue(), createMockVenue({ id: 2, name: 'Venue 2' })];
      (venueService.getAllVenues as jest.MockedFunction<any>).mockResolvedValue(mockVenues);

      const response = await request(app)
        .get('/api/venues/all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(venueService.getAllVenues).toHaveBeenCalled();
    });
  });
});

