/**
 * Comprehensive Integration Test Suite for Feedback Routes
 *
 * Tests all feedback API routes including:
 * - Feedback form management routes (admin)
 * - Feedback submission routes (attendees)
 * - Feedback retrieval routes
 * - Analytics routes
 * - Authentication and authorization
 * - Error handling
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import feedbackRoutes from '../routes/feedback.routes';
import {
  mockPrisma,
  mockAxios,
  mockLogger,
  mockGetUserInfo,
  createMockFeedbackForm,
  createMockFeedbackResponse,
  setupSuccessfulAuthValidation,
  setupSuccessfulFormCreation,
  setupSuccessfulFeedbackSubmission,
  resetAllMocks,
} from './mocks-simple';
import jwt from 'jsonwebtoken';

describe('Feedback Routes Integration', () => {
  let app: Express;

  const createAuthToken = (userId: string = 'user-123', role: string = 'USER') => {
    const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-feedback-service-tests-only';
    return jwt.sign(
      { userId, email: 'test@example.com', role },
      secret
    );
  };

  beforeEach(() => {
    resetAllMocks();
    // Ensure JWT_SECRET is set (should be set in env-setup.ts, but ensure it here too)
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-feedback-service-tests-only';
    }
    app = express();
    app.use(express.json());
    app.use('/feedback', feedbackRoutes);
  });

  afterEach(() => {
    resetAllMocks();
  });

  // ============================================================================
  // FEEDBACK FORM MANAGEMENT ROUTES (Admin)
  // ============================================================================

  describe('POST /feedback/forms', () => {
    it('should create feedback form as admin', async () => {
      const { mockForm } = setupSuccessfulFormCreation();
      const token = createAuthToken('admin-123', 'ADMIN');

      const response = await request(app)
        .post('/feedback/forms')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: 'event-123',
          title: 'Test Feedback Form',
          description: 'Test description',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockForm.id);
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/feedback/forms')
        .send({
          eventId: 'event-123',
          title: 'Test Feedback Form',
        });

      expect(response.status).toBe(401);
    });

    it('should reject creation by non-admin user', async () => {
      const token = createAuthToken('user-123', 'USER');

      const response = await request(app)
        .post('/feedback/forms')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: 'event-123',
          title: 'Test Feedback Form',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /feedback/forms/:id', () => {
    it('should update feedback form as admin', async () => {
      const mockForm = createMockFeedbackForm();
      const updatedForm = { ...mockForm, title: 'Updated Title' };

      mockPrisma.feedbackForm.update.mockResolvedValue(updatedForm);
      const token = createAuthToken('admin-123', 'ADMIN');

      const response = await request(app)
        .put('/feedback/forms/form-123')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
    });
  });

  describe('PATCH /feedback/forms/:id/close', () => {
    it('should close feedback form as admin', async () => {
      const mockForm = createMockFeedbackForm({ status: 'PUBLISHED' });
      const closedForm = { ...mockForm, status: 'CLOSED' };

      mockPrisma.feedbackForm.update.mockResolvedValue(closedForm);
      const token = createAuthToken('admin-123', 'ADMIN');

      const response = await request(app)
        .patch('/feedback/forms/form-123/close')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CLOSED');
    });
  });

  describe('DELETE /feedback/forms/:id', () => {
    it('should delete feedback form as admin', async () => {
      mockPrisma.feedbackForm.delete.mockResolvedValue(createMockFeedbackForm());
      const token = createAuthToken('admin-123', 'ADMIN');

      const response = await request(app)
        .delete('/feedback/forms/form-123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /feedback/forms', () => {
    it('should list feedback forms as admin', async () => {
      const mockForms = [
        createMockFeedbackForm({ id: 'form-1', responses: [{ rating: 5 }] }),
        createMockFeedbackForm({ id: 'form-2', responses: [{ rating: 4 }] }),
      ];

      mockPrisma.feedbackForm.findMany.mockResolvedValue(mockForms);
      mockPrisma.feedbackForm.count.mockResolvedValue(2);
      const token = createAuthToken('admin-123', 'ADMIN');

      const response = await request(app)
        .get('/feedback/forms?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.forms).toHaveLength(2);
    });
  });

  describe('GET /feedback/forms/:id', () => {
    it('should get feedback form by ID as admin', async () => {
      const mockForm = createMockFeedbackForm();
      const mockResponses = [{ rating: 5 }];

      mockPrisma.feedbackForm.findUnique.mockResolvedValue({
        ...mockForm,
        responses: mockResponses,
      });
      const token = createAuthToken('admin-123', 'ADMIN');

      const response = await request(app)
        .get('/feedback/forms/form-123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('form-123');
    });

    it('should return 404 for non-existent form', async () => {
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(null);
      const token = createAuthToken('admin-123', 'ADMIN');

      const response = await request(app)
        .get('/feedback/forms/non-existent')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // PUBLIC FEEDBACK FORM ROUTES
  // ============================================================================

  describe('GET /feedback/events/:eventId/form', () => {
    it('should get feedback form by event ID (public)', async () => {
      const mockForm = createMockFeedbackForm({ status: 'PUBLISHED' });
      const mockResponses = [{ rating: 5 }];

      mockPrisma.feedbackForm.findUnique.mockResolvedValue({
        ...mockForm,
        responses: mockResponses,
      });

      const response = await request(app)
        .get('/feedback/events/event-123/form');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBe('event-123');
    });

    it('should return 404 for non-existent form', async () => {
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/feedback/events/non-existent/form');

      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // FEEDBACK SUBMISSION ROUTES (Attendees)
  // ============================================================================

  describe('POST /feedback/submit', () => {
    it('should submit feedback as attendee', async () => {
      const { mockResponse } = setupSuccessfulFeedbackSubmission();
      const token = createAuthToken('user-123', 'USER');

      const response = await request(app)
        .post('/feedback/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          formId: 'form-123',
          bookingId: 'booking-123',
          rating: 5,
          comment: 'Great event!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockResponse.id);
    });

    it('should reject submission without authentication', async () => {
      const response = await request(app)
        .post('/feedback/submit')
        .send({
          formId: 'form-123',
          bookingId: 'booking-123',
          rating: 5,
        });

      expect(response.status).toBe(401);
    });

    it('should reject submission with invalid rating', async () => {
      const { mockForm } = setupSuccessfulFeedbackSubmission();
      const token = createAuthToken('user-123', 'USER');

      const response = await request(app)
        .post('/feedback/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          formId: 'form-123',
          bookingId: 'booking-123',
          rating: 10, // Invalid rating
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /feedback/submissions/:id', () => {
    it('should update feedback submission as owner', async () => {
      const existingResponse = createMockFeedbackResponse({ userId: 'user-123' });
      const mockForm = createMockFeedbackForm({ status: 'PUBLISHED' });
      const updatedResponse = { ...existingResponse, rating: 4, comment: 'Updated' };

      mockPrisma.feedbackResponse.findUnique.mockResolvedValue(existingResponse);
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.feedbackResponse.update.mockResolvedValue(updatedResponse);
      const token = createAuthToken('user-123', 'USER');

      const response = await request(app)
        .put('/feedback/submissions/response-123')
        .set('Authorization', `Bearer ${token}`)
        .send({
          rating: 4,
          comment: 'Updated',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(4);
    });

    it('should reject update by non-owner', async () => {
      const existingResponse = createMockFeedbackResponse({ userId: 'other-user' });
      const mockForm = createMockFeedbackForm({ status: 'PUBLISHED' });

      mockPrisma.feedbackResponse.findUnique.mockResolvedValue(existingResponse);
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(mockForm);
      const token = createAuthToken('user-123', 'USER');

      const response = await request(app)
        .put('/feedback/submissions/response-123')
        .set('Authorization', `Bearer ${token}`)
        .send({
          rating: 4,
        });

      expect(response.status).toBe(500); // Will throw error in service
    });
  });

  describe('GET /feedback/submissions/:id', () => {
    it('should get own submission', async () => {
      const mockResponse = createMockFeedbackResponse({ userId: 'user-123' });
      mockPrisma.feedbackResponse.findUnique.mockResolvedValue(mockResponse);
      const token = createAuthToken('user-123', 'USER');

      const response = await request(app)
        .get('/feedback/submissions/response-123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('response-123');
    });

    it('should allow admin to view any submission', async () => {
      const mockResponse = createMockFeedbackResponse({ userId: 'other-user' });
      mockPrisma.feedbackResponse.findUnique.mockResolvedValue(mockResponse);
      const token = createAuthToken('admin-123', 'ADMIN');

      const response = await request(app)
        .get('/feedback/submissions/response-123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should reject viewing other user\'s submission', async () => {
      const mockResponse = createMockFeedbackResponse({ userId: 'other-user' });
      mockPrisma.feedbackResponse.findUnique.mockResolvedValue(mockResponse);
      const token = createAuthToken('user-123', 'USER');

      const response = await request(app)
        .get('/feedback/submissions/response-123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /feedback/my-submissions', () => {
    it('should get user feedback submissions', async () => {
      const mockSubmissions = [
        createMockFeedbackResponse({ id: 'response-1' }),
        createMockFeedbackResponse({ id: 'response-2' }),
      ];

      mockPrisma.feedbackResponse.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.feedbackResponse.count.mockResolvedValue(2);
      setupSuccessfulAuthValidation();
      const token = createAuthToken('user-123', 'USER');

      const response = await request(app)
        .get('/feedback/my-submissions?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.submissions).toHaveLength(2);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/feedback/my-submissions');

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // ADMIN EVENT SUBMISSIONS ROUTES
  // ============================================================================

  describe('GET /feedback/events/:eventId/submissions', () => {
    it('should get event submissions as admin', async () => {
      const mockSubmissions = [
        createMockFeedbackResponse({ id: 'response-1' }),
        createMockFeedbackResponse({ id: 'response-2' }),
      ];

      mockPrisma.feedbackResponse.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.feedbackResponse.count.mockResolvedValue(2);

      mockGetUserInfo.mockResolvedValue({ name: 'Test User', email: 'test@example.com', role: 'USER' });

      const token = createAuthToken('admin-123', 'ADMIN');

      const response = await request(app)
        .get('/feedback/events/event-123/submissions?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.submissions).toHaveLength(2);
    });
  });

  // ============================================================================
  // ANALYTICS ROUTES
  // ============================================================================

  describe('GET /feedback/forms/:id/analytics', () => {
    it('should get feedback analytics as admin', async () => {
      const mockForm = createMockFeedbackForm();
      const mockResponses = [
        createMockFeedbackResponse({ rating: 5 }),
        createMockFeedbackResponse({ rating: 4 }),
      ];

      mockPrisma.feedbackForm.findUnique.mockResolvedValue({
        ...mockForm,
        responses: mockResponses,
      });
      const token = createAuthToken('admin-123', 'ADMIN');

      const response = await request(app)
        .get('/feedback/forms/form-123/analytics')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalResponses).toBe(2);
      expect(response.body.data.averageRating).toBeCloseTo(4.5, 1);
    });
  });

  describe('GET /feedback/events/:eventId/analytics', () => {
    it('should get event feedback analytics as admin', async () => {
      const mockForm = createMockFeedbackForm({ id: 'form-123' });
      const mockResponses = [
        createMockFeedbackResponse({ rating: 5 }),
      ];

      mockPrisma.feedbackForm.findUnique.mockResolvedValue({
        ...mockForm,
        responses: mockResponses,
      });
      const token = createAuthToken('admin-123', 'ADMIN');

      const response = await request(app)
        .get('/feedback/events/event-123/analytics')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalResponses).toBe(1);
    });
  });
});

