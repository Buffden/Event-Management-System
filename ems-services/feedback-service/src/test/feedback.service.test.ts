/**
 * Comprehensive Test Suite for Feedback Service
 *
 * Tests all feedback service features including:
 * - Feedback form management (create, update, delete, close)
 * - Feedback form retrieval (by ID, by event ID, listing)
 * - Feedback submission (submit, update)
 * - Feedback submission retrieval (by ID, user submissions, event submissions)
 * - Feedback analytics
 * - Validation and error handling
 */

import { describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import {
  mockPrisma,
  mockLogger,
  mockGetUserInfo,
  createMockFeedbackForm,
  createMockFeedbackResponse,
  setupSuccessfulFormCreation,
  setupExistingForm,
  setupSuccessfulFeedbackSubmission,
  setupDuplicateFeedbackSubmission,
  setupSuccessfulFeedbackUpdate,
  setupDatabaseError,
  resetAllMocks,
} from './mocks-simple';

import { FeedbackService } from '../services/feedback.service';
import {
  FeedbackFormNotFoundError,
  FeedbackSubmissionNotFoundError,
  DuplicateFeedbackSubmissionError,
  InvalidRatingError,
  FeedbackFormClosedError,
  FeedbackFormNotPublishedError,
} from '../types/feedback.types';

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;

  beforeEach(() => {
    resetAllMocks();
    // Mock $transaction to execute the callback immediately
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        feedbackForm: mockPrisma.feedbackForm,
        feedbackResponse: mockPrisma.feedbackResponse,
      };
      return await callback(mockTx);
    });
    feedbackService = new FeedbackService();
  });

  afterEach(() => {
    resetAllMocks();
  });

  // ============================================================================
  // FEEDBACK FORM MANAGEMENT TESTS
  // ============================================================================

  describe('createFeedbackForm()', () => {
    it('should create a new feedback form successfully', async () => {
      const { mockForm } = setupSuccessfulFormCreation();

      const result = await feedbackService.createFeedbackForm({
        eventId: 'event-123',
        title: 'Test Feedback Form',
        description: 'Test description',
      });

      expect(mockPrisma.feedbackForm.findUnique).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
      });
      expect(mockPrisma.feedbackForm.create).toHaveBeenCalledWith({
        data: {
          eventId: 'event-123',
          title: 'Test Feedback Form',
          description: 'Test description',
          status: 'DRAFT',
        },
      });
      expect(result.id).toBe(mockForm.id);
      expect(result.eventId).toBe('event-123');
      expect(result.status).toBe('DRAFT');
    });

    it('should reject creation if form already exists for event', async () => {
      setupExistingForm();

      await expect(
        feedbackService.createFeedbackForm({
          eventId: 'event-123',
          title: 'Test Feedback Form',
        })
      ).rejects.toThrow('Feedback form already exists for event event-123');
    });

    it('should handle database errors during creation', async () => {
      setupDatabaseError();

      await expect(
        feedbackService.createFeedbackForm({
          eventId: 'event-123',
          title: 'Test Feedback Form',
        })
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('updateFeedbackForm()', () => {
    it('should update feedback form successfully', async () => {
      const mockForm = createMockFeedbackForm();
      const updatedForm = { ...mockForm, title: 'Updated Title', status: 'PUBLISHED' };

      mockPrisma.feedbackForm.update.mockResolvedValue(updatedForm);

      const result = await feedbackService.updateFeedbackForm('form-123', {
        title: 'Updated Title',
        status: 'PUBLISHED',
      });

      expect(mockPrisma.feedbackForm.update).toHaveBeenCalledWith({
        where: { id: 'form-123' },
        data: {
          title: 'Updated Title',
          status: 'PUBLISHED',
        },
      });
      expect(result.title).toBe('Updated Title');
      expect(result.status).toBe('PUBLISHED');
    });

    it('should throw FeedbackFormNotFoundError if form does not exist', async () => {
      const error: any = new Error('Record not found');
      error.code = 'P2025';
      mockPrisma.feedbackForm.update.mockRejectedValue(error);

      await expect(
        feedbackService.updateFeedbackForm('non-existent', {
          title: 'Updated Title',
        })
      ).rejects.toThrow(FeedbackFormNotFoundError);
    });

    it('should handle non-P2025 database errors in updateFeedbackForm', async () => {
      // This covers lines 85-87 - error handling for non-P2025 errors
      const error: any = new Error('Database connection error');
      error.code = 'P2000'; // Different Prisma error code
      mockPrisma.feedbackForm.update.mockRejectedValue(error);

      await expect(
        feedbackService.updateFeedbackForm('form-123', {
          title: 'Updated Title',
        })
      ).rejects.toThrow('Database connection error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update feedback form',
        expect.any(Error)
      );
    });

    it('should handle partial updates', async () => {
      const mockForm = createMockFeedbackForm();
      const updatedForm = { ...mockForm, description: 'Updated description' };

      mockPrisma.feedbackForm.update.mockResolvedValue(updatedForm);

      const result = await feedbackService.updateFeedbackForm('form-123', {
        description: 'Updated description',
      });

      expect(result.description).toBe('Updated description');
    });
  });

  describe('closeFeedbackForm()', () => {
    it('should close feedback form successfully', async () => {
      const mockForm = createMockFeedbackForm({ status: 'PUBLISHED' });
      const closedForm = { ...mockForm, status: 'CLOSED' };

      mockPrisma.feedbackForm.update.mockResolvedValue(closedForm);

      const result = await feedbackService.closeFeedbackForm('form-123');

      expect(mockPrisma.feedbackForm.update).toHaveBeenCalledWith({
        where: { id: 'form-123' },
        data: { status: 'CLOSED' },
      });
      expect(result.status).toBe('CLOSED');
    });

    it('should throw FeedbackFormNotFoundError if form does not exist', async () => {
      const error: any = new Error('Record not found');
      error.code = 'P2025';
      mockPrisma.feedbackForm.update.mockRejectedValue(error);

      await expect(feedbackService.closeFeedbackForm('non-existent')).rejects.toThrow(
        FeedbackFormNotFoundError
      );
    });

    it('should handle non-P2025 database errors in closeFeedbackForm', async () => {
      // This covers lines 108-110 - error handling for non-P2025 errors
      const error: any = new Error('Database timeout');
      error.code = 'P2001'; // Different Prisma error code
      mockPrisma.feedbackForm.update.mockRejectedValue(error);

      await expect(feedbackService.closeFeedbackForm('form-123')).rejects.toThrow(
        'Database timeout'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to close feedback form',
        expect.any(Error)
      );
    });
  });

  describe('deleteFeedbackForm()', () => {
    it('should delete feedback form successfully', async () => {
      mockPrisma.feedbackForm.delete.mockResolvedValue(createMockFeedbackForm());

      await feedbackService.deleteFeedbackForm('form-123');

      expect(mockPrisma.feedbackForm.delete).toHaveBeenCalledWith({
        where: { id: 'form-123' },
      });
    });

    it('should throw FeedbackFormNotFoundError if form does not exist', async () => {
      const error: any = new Error('Record not found');
      error.code = 'P2025';
      mockPrisma.feedbackForm.delete.mockRejectedValue(error);

      await expect(feedbackService.deleteFeedbackForm('non-existent')).rejects.toThrow(
        FeedbackFormNotFoundError
      );
    });

    it('should handle non-P2025 database errors in deleteFeedbackForm', async () => {
      // This covers lines 126-128 - error handling for non-P2025 errors
      const error: any = new Error('Database constraint violation');
      error.code = 'P2002'; // Different Prisma error code
      mockPrisma.feedbackForm.delete.mockRejectedValue(error);

      await expect(feedbackService.deleteFeedbackForm('form-123')).rejects.toThrow(
        'Database constraint violation'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete feedback form',
        expect.any(Error)
      );
    });
  });

  describe('getFeedbackForm()', () => {
    it('should retrieve feedback form with analytics', async () => {
      const mockForm = createMockFeedbackForm({ status: 'PUBLISHED' });
      const mockResponses = [
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
      ];

      mockPrisma.feedbackForm.findUnique.mockResolvedValue({
        ...mockForm,
        responses: mockResponses,
      });

      const result = await feedbackService.getFeedbackForm('form-123');

      expect(mockPrisma.feedbackForm.findUnique).toHaveBeenCalledWith({
        where: { id: 'form-123' },
        include: {
          responses: {
            select: {
              rating: true,
            },
          },
        },
      });
      expect(result).not.toBeNull();
      expect(result?.responseCount).toBe(3);
      expect(result?.averageRating).toBeCloseTo(4.67, 2);
    });

    it('should return null if form does not exist', async () => {
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(null);

      const result = await feedbackService.getFeedbackForm('non-existent');

      expect(result).toBeNull();
    });

    it('should calculate average rating correctly', async () => {
      const mockForm = createMockFeedbackForm();
      const mockResponses = [
        { rating: 1 },
        { rating: 2 },
        { rating: 3 },
        { rating: 4 },
        { rating: 5 },
      ];

      mockPrisma.feedbackForm.findUnique.mockResolvedValue({
        ...mockForm,
        responses: mockResponses,
      });

      const result = await feedbackService.getFeedbackForm('form-123');

      expect(result?.averageRating).toBe(3);
    });
  });

  describe('getFeedbackFormByEventId()', () => {
    it('should retrieve published feedback form by event ID', async () => {
      const mockForm = createMockFeedbackForm({ status: 'PUBLISHED' });
      const mockResponses = [{ rating: 5 }];

      mockPrisma.feedbackForm.findUnique.mockResolvedValue({
        ...mockForm,
        responses: mockResponses,
      });

      const result = await feedbackService.getFeedbackFormByEventId('event-123');

      expect(mockPrisma.feedbackForm.findUnique).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
        include: {
          responses: {
            select: {
              rating: true,
            },
          },
        },
      });
      expect(result).not.toBeNull();
      expect(result?.status).toBe('PUBLISHED');
    });

    it('should return null for closed forms', async () => {
      const mockForm = createMockFeedbackForm({ status: 'CLOSED' });
      mockPrisma.feedbackForm.findUnique.mockResolvedValue({
        ...mockForm,
        responses: [],
      });

      const result = await feedbackService.getFeedbackFormByEventId('event-123');

      expect(result).toBeNull();
    });

    it('should return null if form does not exist', async () => {
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(null);

      const result = await feedbackService.getFeedbackFormByEventId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('listFeedbackForms()', () => {
    it('should list feedback forms with pagination', async () => {
      const mockForms = [
        createMockFeedbackForm({ id: 'form-1', responses: [{ rating: 5 }] }),
        createMockFeedbackForm({ id: 'form-2', responses: [{ rating: 4 }, { rating: 5 }] }),
      ];

      mockPrisma.feedbackForm.findMany.mockResolvedValue(mockForms);
      mockPrisma.feedbackForm.count.mockResolvedValue(2);

      const result = await feedbackService.listFeedbackForms(1, 10);

      expect(mockPrisma.feedbackForm.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        include: {
          responses: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.forms).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle pagination correctly', async () => {
      const mockForms = [
        createMockFeedbackForm({ id: 'form-2', responses: [{ rating: 4 }] }),
      ];

      mockPrisma.feedbackForm.findMany.mockResolvedValue(mockForms);
      mockPrisma.feedbackForm.count.mockResolvedValue(15);

      const result = await feedbackService.listFeedbackForms(2, 10);

      expect(mockPrisma.feedbackForm.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        include: {
          responses: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.page).toBe(2);
    });
  });

  // ============================================================================
  // FEEDBACK SUBMISSION TESTS
  // ============================================================================

  describe('submitFeedback()', () => {
    it('should submit feedback successfully', async () => {
      const { mockForm, mockResponse } = setupSuccessfulFeedbackSubmission();

      const result = await feedbackService.submitFeedback('user-123', {
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 5,
        comment: 'Great event!',
      });

      expect(mockPrisma.feedbackForm.findUnique).toHaveBeenCalledWith({
        where: { id: 'form-123' },
      });
      expect(mockPrisma.feedbackResponse.findUnique).toHaveBeenCalledWith({
        where: { bookingId: 'booking-123' },
      });
      expect(mockPrisma.feedbackResponse.create).toHaveBeenCalledWith({
        data: {
          formId: 'form-123',
          userId: 'user-123',
          eventId: mockForm.eventId,
          bookingId: 'booking-123',
          rating: 5,
          comment: 'Great event!',
        },
      });
      expect(result.id).toBe(mockResponse.id);
      expect(result.rating).toBe(5);
    });

    it('should reject submission for non-existent form', async () => {
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(null);

      await expect(
        feedbackService.submitFeedback('user-123', {
          formId: 'non-existent',
          bookingId: 'booking-123',
          rating: 5,
        })
      ).rejects.toThrow(FeedbackFormNotFoundError);
    });

    it('should reject submission for closed form', async () => {
      const mockForm = createMockFeedbackForm({ status: 'CLOSED' });
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(mockForm);

      await expect(
        feedbackService.submitFeedback('user-123', {
          formId: 'form-123',
          bookingId: 'booking-123',
          rating: 5,
        })
      ).rejects.toThrow(FeedbackFormClosedError);
    });

    it('should reject submission for draft form', async () => {
      const mockForm = createMockFeedbackForm({ status: 'DRAFT' });
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(mockForm);

      await expect(
        feedbackService.submitFeedback('user-123', {
          formId: 'form-123',
          bookingId: 'booking-123',
          rating: 5,
        })
      ).rejects.toThrow(FeedbackFormNotPublishedError);
    });

    it('should reject duplicate submission', async () => {
      setupDuplicateFeedbackSubmission();

      await expect(
        feedbackService.submitFeedback('user-123', {
          formId: 'form-123',
          bookingId: 'booking-123',
          rating: 5,
        })
      ).rejects.toThrow(DuplicateFeedbackSubmissionError);
    });

    it('should reject invalid rating (too low)', async () => {
      const { mockForm } = setupSuccessfulFeedbackSubmission();

      await expect(
        feedbackService.submitFeedback('user-123', {
          formId: 'form-123',
          bookingId: 'booking-123',
          rating: 0,
        })
      ).rejects.toThrow(InvalidRatingError);
    });

    it('should reject invalid rating (too high)', async () => {
      const { mockForm } = setupSuccessfulFeedbackSubmission();

      await expect(
        feedbackService.submitFeedback('user-123', {
          formId: 'form-123',
          bookingId: 'booking-123',
          rating: 6,
        })
      ).rejects.toThrow(InvalidRatingError);
    });

    it('should reject non-integer rating', async () => {
      const { mockForm } = setupSuccessfulFeedbackSubmission();

      await expect(
        feedbackService.submitFeedback('user-123', {
          formId: 'form-123',
          bookingId: 'booking-123',
          rating: 3.5,
        })
      ).rejects.toThrow(InvalidRatingError);
    });
  });

  describe('updateFeedbackSubmission()', () => {
    it('should update feedback submission successfully', async () => {
      const { updatedResponse } = setupSuccessfulFeedbackUpdate();

      const result = await feedbackService.updateFeedbackSubmission(
        'user-123',
        'response-123',
        {
          rating: 4,
          comment: 'Updated comment',
        }
      );

      expect(mockPrisma.feedbackResponse.update).toHaveBeenCalledWith({
        where: { id: 'response-123' },
        data: {
          rating: 4,
          comment: 'Updated comment',
        },
      });
      expect(result.rating).toBe(4);
      expect(result.comment).toBe('Updated comment');
    });

    it('should reject update if submission does not exist', async () => {
      mockPrisma.feedbackResponse.findUnique.mockResolvedValue(null);

      await expect(
        feedbackService.updateFeedbackSubmission('user-123', 'non-existent', {
          rating: 4,
        })
      ).rejects.toThrow(FeedbackSubmissionNotFoundError);
    });

    it('should reject update if user does not own submission', async () => {
      const existingResponse = createMockFeedbackResponse({ userId: 'other-user' });
      mockPrisma.feedbackResponse.findUnique.mockResolvedValue(existingResponse);

      await expect(
        feedbackService.updateFeedbackSubmission('user-123', 'response-123', {
          rating: 4,
        })
      ).rejects.toThrow('You can only update your own feedback submissions');
    });

    it('should reject update for closed form', async () => {
      const existingResponse = createMockFeedbackResponse({ userId: 'user-123' });
      const closedForm = createMockFeedbackForm({ status: 'CLOSED' });

      mockPrisma.feedbackResponse.findUnique.mockResolvedValue(existingResponse);
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(closedForm);

      await expect(
        feedbackService.updateFeedbackSubmission('user-123', 'response-123', {
          rating: 4,
        })
      ).rejects.toThrow(FeedbackFormClosedError);
    });

    it('should validate rating during update', async () => {
      const existingResponse = createMockFeedbackResponse({ userId: 'user-123' });
      const mockForm = createMockFeedbackForm({ status: 'PUBLISHED' });

      mockPrisma.feedbackResponse.findUnique.mockResolvedValue(existingResponse);
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(mockForm);

      await expect(
        feedbackService.updateFeedbackSubmission('user-123', 'response-123', {
          rating: 10,
        })
      ).rejects.toThrow(InvalidRatingError);
    });
  });

  describe('getFeedbackSubmission()', () => {
    it('should retrieve feedback submission successfully', async () => {
      const mockResponse = createMockFeedbackResponse();
      mockPrisma.feedbackResponse.findUnique.mockResolvedValue(mockResponse);

      const result = await feedbackService.getFeedbackSubmission('response-123');

      expect(mockPrisma.feedbackResponse.findUnique).toHaveBeenCalledWith({
        where: { id: 'response-123' },
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('response-123');
    });

    it('should return null if submission does not exist', async () => {
      mockPrisma.feedbackResponse.findUnique.mockResolvedValue(null);

      const result = await feedbackService.getFeedbackSubmission('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserFeedbackSubmissions()', () => {
    it('should retrieve user feedback submissions with pagination', async () => {
      const mockSubmissions = [
        createMockFeedbackResponse({ id: 'response-1' }),
        createMockFeedbackResponse({ id: 'response-2' }),
      ];

      mockPrisma.feedbackResponse.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.feedbackResponse.count.mockResolvedValue(2);

      const result = await feedbackService.getUserFeedbackSubmissions('user-123', 1, 10);

      expect(mockPrisma.feedbackResponse.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.submissions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should handle database errors in getUserFeedbackSubmissions', async () => {
      // This covers lines 423-425 - error handling in getUserFeedbackSubmissions
      const error = new Error('Database connection failed');
      mockPrisma.feedbackResponse.findMany.mockRejectedValue(error);

      await expect(
        feedbackService.getUserFeedbackSubmissions('user-123', 1, 10)
      ).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get user feedback submissions',
        expect.any(Error)
      );
    });
  });

  describe('getEventFeedbackSubmissions()', () => {
    it('should retrieve event feedback submissions with pagination', async () => {
      const mockSubmissions = [
        createMockFeedbackResponse({ id: 'response-1', userId: 'user-1' }),
        createMockFeedbackResponse({ id: 'response-2', userId: 'user-2' }),
      ];

      mockPrisma.feedbackResponse.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.feedbackResponse.count.mockResolvedValue(2);

      // Mock getUserInfo
      mockGetUserInfo.mockResolvedValue({ name: 'Test User', email: 'test@example.com', role: 'USER' });

      const result = await feedbackService.getEventFeedbackSubmissions('event-123', 1, 10);

      expect(mockPrisma.feedbackResponse.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.submissions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should handle errors when fetching user info gracefully', async () => {
      // This covers lines 462-464 - error handling when getUserInfo fails
      const mockSubmissions = [
        createMockFeedbackResponse({ id: 'response-1', userId: 'user-1' }),
        createMockFeedbackResponse({ id: 'response-2', userId: 'user-2' }),
      ];

      mockPrisma.feedbackResponse.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.feedbackResponse.count.mockResolvedValue(2);

      // Mock getUserInfo to fail for one user
      mockGetUserInfo
        .mockResolvedValueOnce({ name: 'Test User 1', email: 'test1@example.com', role: 'USER' })
        .mockRejectedValueOnce(new Error('User service unavailable'));

      const result = await feedbackService.getEventFeedbackSubmissions('event-123', 1, 10);

      expect(result.submissions).toHaveLength(2);
      // One submission should have username, the other should not
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch user info',
        expect.objectContaining({
          userId: 'user-2',
          error: 'User service unavailable',
        })
      );
    });

    it('should handle database errors in getEventFeedbackSubmissions', async () => {
      // This covers lines 496-498 - error handling in getEventFeedbackSubmissions
      const error = new Error('Database query failed');
      mockPrisma.feedbackResponse.findMany.mockRejectedValue(error);

      await expect(
        feedbackService.getEventFeedbackSubmissions('event-123', 1, 10)
      ).rejects.toThrow('Database query failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get event feedback submissions',
        expect.any(Error)
      );
    });
  });

  // ============================================================================
  // ANALYTICS TESTS
  // ============================================================================

  describe('getFeedbackAnalytics()', () => {
    it('should calculate analytics correctly', async () => {
      const mockForm = createMockFeedbackForm();
      const mockResponses = [
        createMockFeedbackResponse({ rating: 5 }),
        createMockFeedbackResponse({ rating: 4 }),
        createMockFeedbackResponse({ rating: 5 }),
        createMockFeedbackResponse({ rating: 3 }),
        createMockFeedbackResponse({ rating: 5 }),
      ];

      mockPrisma.feedbackForm.findUnique.mockResolvedValue({
        ...mockForm,
        responses: mockResponses,
      });

      const result = await feedbackService.getFeedbackAnalytics('form-123');

      expect(result.totalResponses).toBe(5);
      expect(result.averageRating).toBeCloseTo(4.4, 1);
      expect(result.ratingDistribution[5]).toBe(3);
      expect(result.ratingDistribution[4]).toBe(1);
      expect(result.ratingDistribution[3]).toBe(1);
    });

    it('should handle empty responses', async () => {
      const mockForm = createMockFeedbackForm();
      mockPrisma.feedbackForm.findUnique.mockResolvedValue({
        ...mockForm,
        responses: [],
      });

      const result = await feedbackService.getFeedbackAnalytics('form-123');

      expect(result.totalResponses).toBe(0);
      expect(result.averageRating).toBe(0);
      expect(Object.keys(result.ratingDistribution)).toHaveLength(0);
    });

    it('should throw FeedbackFormNotFoundError if form does not exist', async () => {
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(null);

      await expect(feedbackService.getFeedbackAnalytics('non-existent')).rejects.toThrow(
        FeedbackFormNotFoundError
      );
    });
  });

  describe('getEventFeedbackAnalytics()', () => {
    it('should get analytics by event ID', async () => {
      const mockForm = createMockFeedbackForm({ id: 'form-123' });
      const mockResponses = [
        createMockFeedbackResponse({ rating: 5 }),
        createMockFeedbackResponse({ rating: 4 }),
      ];

      mockPrisma.feedbackForm.findUnique.mockResolvedValue({
        ...mockForm,
        responses: mockResponses,
      });

      const result = await feedbackService.getEventFeedbackAnalytics('event-123');

      expect(result.totalResponses).toBe(2);
      expect(result.averageRating).toBeCloseTo(4.5, 1);
    });

    it('should throw error if form does not exist for event', async () => {
      mockPrisma.feedbackForm.findUnique.mockResolvedValue(null);

      await expect(feedbackService.getEventFeedbackAnalytics('non-existent')).rejects.toThrow(
        FeedbackFormNotFoundError
      );
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('validateFeedbackSubmission()', () => {
    it('should validate correct submission data', () => {
      const result = feedbackService.validateFeedbackSubmission({
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 5,
        comment: 'Great!',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing form ID', () => {
      const result = feedbackService.validateFeedbackSubmission({
        formId: '',
        bookingId: 'booking-123',
        rating: 5,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Form ID is required');
    });

    it('should reject missing booking ID', () => {
      const result = feedbackService.validateFeedbackSubmission({
        formId: 'form-123',
        bookingId: '',
        rating: 5,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Booking ID is required');
    });

    it('should reject invalid rating', () => {
      const result = feedbackService.validateFeedbackSubmission({
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 10,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rating must be an integer between 1 and 5');
    });

    it('should reject comment that is too long', () => {
      const longComment = 'a'.repeat(1001);
      const result = feedbackService.validateFeedbackSubmission({
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 5,
        comment: longComment,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Comment must be 1000 characters or less');
    });
  });
});

