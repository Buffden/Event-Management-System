/**
 * Speaker Routes Integration Tests
 *
 * Tests for speaker routes using Supertest
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { mockPrisma, createMockEvent, mockLogger } from '../../test/mocks-simple';

// Mock auth middleware
const mockRequireAdminOrSpeaker = jest.fn((req: any, res: any, next: any) => {
  req.user = { userId: 'speaker-123', email: 'speaker@example.com', role: 'SPEAKER' };
  next();
});

jest.mock('../../middleware/auth.middleware', () => ({
  requireAdminOrSpeaker: (req: any, res: any, next: any) => {
    req.user = { userId: 'speaker-123', email: 'speaker@example.com', role: 'SPEAKER' };
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
    getEventsBySpeaker: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
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
import speakerRoutes from '../speaker.routes';
import { eventService } from '../../services/event.service';

describe('Speaker Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', speakerRoutes);
  });

  describe('GET /api/events/my-events', () => {
    it('should return speaker events', async () => {
      const mockEvents = {
        events: [createMockEvent({ speakerId: 'speaker-123' })],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      (eventService.getEventsBySpeaker as jest.MockedFunction<any>).mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/events/my-events')
        .query({ speakerId: 'speaker-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.events).toBeDefined();
      expect(eventService.getEventsBySpeaker).toHaveBeenCalledWith('speaker-123', {});
    });

    it('should return 400 when speakerId is missing', async () => {
      const response = await request(app)
        .get('/api/events/my-events');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Speaker ID is required as a query parameter');
    });

    it('should return 400 when speakerId is not a string', async () => {
      // Query parameters are always strings in Express, so we need to test with undefined or empty
      const response = await request(app)
        .get('/api/events/my-events')
        .query({ speakerId: '' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/events', () => {
    it('should create new event', async () => {
      const mockEvent = createMockEvent({ id: 'event-123', status: 'DRAFT' });
      (eventService.createEvent as jest.MockedFunction<any>).mockResolvedValue(mockEvent);

      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 1,
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
        userId: 'speaker-123',
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('event-123');
      expect(eventService.createEvent).toHaveBeenCalledWith(eventData, 'speaker-123');
    });

    it('should return 400 when name is missing', async () => {
      const eventData = {
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 1,
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
        userId: 'speaker-123',
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData);

      expect(response.status).toBe(400);
    });

    it('should return 400 when venueId is invalid', async () => {
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 'invalid',
        bookingStartDate: '2025-12-01T00:00:00Z',
        bookingEndDate: '2025-12-31T23:59:59Z',
        userId: 'speaker-123',
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData);

      expect(response.status).toBe(400);
    });

    it('should return 400 when booking dates are invalid', async () => {
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        category: 'CONFERENCE',
        venueId: 1,
        bookingStartDate: '2025-12-31T23:59:59Z',
        bookingEndDate: '2025-12-01T00:00:00Z', // End before start
        userId: 'speaker-123',
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/events/:id', () => {
    it('should update event', async () => {
      const mockEvent = createMockEvent({ id: 'event-123', name: 'Updated Event' });
      (eventService.updateEvent as jest.MockedFunction<any>).mockResolvedValue(mockEvent);

      const response = await request(app)
        .put('/api/events/event-123')
        .send({ name: 'Updated Event' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(eventService.updateEvent).toHaveBeenCalledWith('event-123', { name: 'Updated Event' }, 'speaker-123');
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should delete event', async () => {
      (eventService.deleteEvent as jest.MockedFunction<any>).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/events/event-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(eventService.deleteEvent).toHaveBeenCalledWith('event-123', 'speaker-123');
    });
  });
});

