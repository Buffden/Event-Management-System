/**
 * Comprehensive Test Suite for Validation Middleware
 *
 * Tests all validation middleware functionality including:
 * - Feedback form creation validation
 * - Feedback form update validation
 * - Feedback submission validation
 * - Feedback update validation
 * - Pagination validation
 * - ID parameter validation
 */

import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import {
  validateCreateFeedbackForm,
  validateUpdateFeedbackForm,
  validateSubmitFeedback,
  validateUpdateFeedback,
  validatePagination,
  validateIdParam,
} from '../middleware/validation.middleware';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };
    mockNext = jest.fn();
  });

  // ============================================================================
  // VALIDATE CREATE FEEDBACK FORM
  // ============================================================================

  describe('validateCreateFeedbackForm()', () => {
    it('should pass validation with valid data', () => {
      mockRequest.body = {
        eventId: 'event-123',
        title: 'Test Form',
        description: 'Test description',
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject missing eventId', () => {
      mockRequest.body = {
        title: 'Test Form',
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: ['Event ID is required and must be a non-empty string'],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject empty eventId string', () => {
      mockRequest.body = {
        eventId: '   ',
        title: 'Test Form',
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Event ID is required and must be a non-empty string']),
        })
      );
    });

    it('should reject non-string eventId', () => {
      mockRequest.body = {
        eventId: 123,
        title: 'Test Form',
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing title', () => {
      mockRequest.body = {
        eventId: 'event-123',
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Title is required and must be a non-empty string']),
        })
      );
    });

    it('should reject empty title string', () => {
      mockRequest.body = {
        eventId: 'event-123',
        title: '   ',
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject title longer than 255 characters', () => {
      mockRequest.body = {
        eventId: 'event-123',
        title: 'a'.repeat(256),
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Title must be 255 characters or less']),
        })
      );
    });

    it('should accept title exactly 255 characters', () => {
      mockRequest.body = {
        eventId: 'event-123',
        title: 'a'.repeat(255),
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject non-string description', () => {
      mockRequest.body = {
        eventId: 'event-123',
        title: 'Test Form',
        description: 123,
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Description must be a string']),
        })
      );
    });

    it('should reject description longer than 1000 characters', () => {
      mockRequest.body = {
        eventId: 'event-123',
        title: 'Test Form',
        description: 'a'.repeat(1001),
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Description must be 1000 characters or less']),
        })
      );
    });

    it('should accept description exactly 1000 characters', () => {
      mockRequest.body = {
        eventId: 'event-123',
        title: 'Test Form',
        description: 'a'.repeat(1000),
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept undefined description', () => {
      mockRequest.body = {
        eventId: 'event-123',
        title: 'Test Form',
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should collect multiple validation errors', () => {
      mockRequest.body = {
        eventId: '',
        title: '',
      };

      validateCreateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0] as any;
      expect(jsonCall.details.length).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // VALIDATE UPDATE FEEDBACK FORM
  // ============================================================================

  describe('validateUpdateFeedbackForm()', () => {
    it('should pass validation with valid data', () => {
      mockRequest.body = {
        title: 'Updated Title',
        status: 'PUBLISHED',
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass validation with empty body (all optional)', () => {
      mockRequest.body = {};

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject empty title string', () => {
      mockRequest.body = {
        title: '   ',
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Title must be a non-empty string']),
        })
      );
    });

    it('should reject non-string title', () => {
      mockRequest.body = {
        title: 123,
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject title longer than 255 characters', () => {
      mockRequest.body = {
        title: 'a'.repeat(256),
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Title must be 255 characters or less']),
        })
      );
    });

    it('should accept valid title', () => {
      mockRequest.body = {
        title: 'Valid Title',
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject non-string description', () => {
      mockRequest.body = {
        description: 123,
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Description must be a string']),
        })
      );
    });

    it('should reject description longer than 1000 characters', () => {
      mockRequest.body = {
        description: 'a'.repeat(1001),
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Description must be 1000 characters or less']),
        })
      );
    });

    it('should accept valid description', () => {
      mockRequest.body = {
        description: 'Valid description',
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject non-string status', () => {
      mockRequest.body = {
        status: 123,
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Status must be a string']),
        })
      );
    });

    it('should reject invalid status value', () => {
      mockRequest.body = {
        status: 'INVALID',
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Status must be one of: DRAFT, PUBLISHED, CLOSED']),
        })
      );
    });

    it('should accept DRAFT status', () => {
      mockRequest.body = {
        status: 'DRAFT',
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept PUBLISHED status', () => {
      mockRequest.body = {
        status: 'PUBLISHED',
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept CLOSED status', () => {
      mockRequest.body = {
        status: 'CLOSED',
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should collect multiple validation errors', () => {
      mockRequest.body = {
        title: '',
        description: 123,
        status: 'INVALID',
      };

      validateUpdateFeedbackForm(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0] as any;
      expect(jsonCall.details.length).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // VALIDATE SUBMIT FEEDBACK
  // ============================================================================

  describe('validateSubmitFeedback()', () => {
    it('should pass validation with valid data', () => {
      mockRequest.body = {
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 5,
        comment: 'Great event!',
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject missing formId', () => {
      mockRequest.body = {
        bookingId: 'booking-123',
        rating: 5,
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Form ID is required and must be a non-empty string']),
        })
      );
    });

    it('should reject empty formId string', () => {
      mockRequest.body = {
        formId: '   ',
        bookingId: 'booking-123',
        rating: 5,
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject non-string formId', () => {
      mockRequest.body = {
        formId: 123,
        bookingId: 'booking-123',
        rating: 5,
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing bookingId', () => {
      mockRequest.body = {
        formId: 'form-123',
        rating: 5,
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Booking ID is required and must be a non-empty string']),
        })
      );
    });

    it('should reject empty bookingId string', () => {
      mockRequest.body = {
        formId: 'form-123',
        bookingId: '   ',
        rating: 5,
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing rating', () => {
      mockRequest.body = {
        formId: 'form-123',
        bookingId: 'booking-123',
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Rating is required']),
        })
      );
    });

    it('should reject null rating', () => {
      mockRequest.body = {
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: null,
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject rating less than 1', () => {
      mockRequest.body = {
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 0,
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Rating must be an integer between 1 and 5']),
        })
      );
    });

    it('should reject rating greater than 5', () => {
      mockRequest.body = {
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 6,
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject non-integer rating', () => {
      mockRequest.body = {
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 3.5,
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should accept valid ratings (1-5)', () => {
      for (let rating = 1; rating <= 5; rating++) {
        mockRequest.body = {
          formId: 'form-123',
          bookingId: 'booking-123',
          rating,
        };

        validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        (mockNext as jest.Mock).mockClear();
      }
    });

    it('should reject non-string comment', () => {
      mockRequest.body = {
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 5,
        comment: 123,
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Comment must be a string']),
        })
      );
    });

    it('should reject comment longer than 1000 characters', () => {
      mockRequest.body = {
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 5,
        comment: 'a'.repeat(1001),
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Comment must be 1000 characters or less']),
        })
      );
    });

    it('should accept comment exactly 1000 characters', () => {
      mockRequest.body = {
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 5,
        comment: 'a'.repeat(1000),
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept undefined comment', () => {
      mockRequest.body = {
        formId: 'form-123',
        bookingId: 'booking-123',
        rating: 5,
      };

      validateSubmitFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // VALIDATE UPDATE FEEDBACK
  // ============================================================================

  describe('validateUpdateFeedback()', () => {
    it('should pass validation with valid data', () => {
      mockRequest.body = {
        rating: 4,
        comment: 'Updated comment',
      };

      validateUpdateFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject missing rating', () => {
      mockRequest.body = {
        comment: 'Updated comment',
      };

      validateUpdateFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Rating is required']),
        })
      );
    });

    it('should reject null rating', () => {
      mockRequest.body = {
        rating: null,
      };

      validateUpdateFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject rating less than 1', () => {
      mockRequest.body = {
        rating: 0,
      };

      validateUpdateFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject rating greater than 5', () => {
      mockRequest.body = {
        rating: 6,
      };

      validateUpdateFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject non-integer rating', () => {
      mockRequest.body = {
        rating: 3.5,
      };

      validateUpdateFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should accept valid ratings (1-5)', () => {
      for (let rating = 1; rating <= 5; rating++) {
        mockRequest.body = { rating };

        validateUpdateFeedback(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        (mockNext as jest.Mock).mockClear();
      }
    });

    it('should reject non-string comment', () => {
      mockRequest.body = {
        rating: 5,
        comment: 123,
      };

      validateUpdateFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Comment must be a string']),
        })
      );
    });

    it('should reject comment longer than 1000 characters', () => {
      mockRequest.body = {
        rating: 5,
        comment: 'a'.repeat(1001),
      };

      validateUpdateFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Comment must be 1000 characters or less']),
        })
      );
    });

    it('should accept comment exactly 1000 characters', () => {
      mockRequest.body = {
        rating: 5,
        comment: 'a'.repeat(1000),
      };

      validateUpdateFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept undefined comment', () => {
      mockRequest.body = {
        rating: 5,
      };

      validateUpdateFeedback(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // VALIDATE PAGINATION
  // ============================================================================

  describe('validatePagination()', () => {
    it('should pass validation with valid pagination', () => {
      mockRequest.query = {
        page: '1',
        limit: '10',
      };

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass validation with no pagination params', () => {
      mockRequest.query = {};

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject page less than 1', () => {
      mockRequest.query = {
        page: '0',
      };

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Page must be a positive integer']),
        })
      );
    });

    it('should reject negative page', () => {
      mockRequest.query = {
        page: '-1',
      };

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject non-numeric page', () => {
      mockRequest.query = {
        page: 'abc',
      };

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should accept valid page number', () => {
      mockRequest.query = {
        page: '5',
      };

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject limit less than 1', () => {
      mockRequest.query = {
        limit: '0',
      };

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Limit must be a positive integer between 1 and 100']),
        })
      );
    });

    it('should reject limit greater than 100', () => {
      mockRequest.query = {
        limit: '101',
      };

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining(['Limit must be a positive integer between 1 and 100']),
        })
      );
    });

    it('should accept limit exactly 100', () => {
      mockRequest.query = {
        limit: '100',
      };

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept limit exactly 1', () => {
      mockRequest.query = {
        limit: '1',
      };

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject non-numeric limit', () => {
      mockRequest.query = {
        limit: 'abc',
      };

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should collect multiple validation errors', () => {
      mockRequest.query = {
        page: '0',
        limit: '101',
      };

      validatePagination(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0] as any;
      expect(jsonCall.details.length).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // VALIDATE ID PARAM
  // ============================================================================

  describe('validateIdParam()', () => {
    it('should pass validation with valid id parameter', () => {
      mockRequest.params = {
        id: 'form-123',
      };

      const middleware = validateIdParam('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject missing id parameter', () => {
      mockRequest.params = {};

      const middleware = validateIdParam('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'id parameter is required and must be a non-empty string',
        code: 'INVALID_PARAMETER',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject empty id string', () => {
      mockRequest.params = {
        id: '   ',
      };

      const middleware = validateIdParam('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'id parameter is required and must be a non-empty string',
        code: 'INVALID_PARAMETER',
      });
    });

    it('should reject non-string id', () => {
      mockRequest.params = {
        id: 123 as any,
      };

      const middleware = validateIdParam('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should work with custom parameter name', () => {
      mockRequest.params = {
        eventId: 'event-123',
      };

      const middleware = validateIdParam('eventId');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject missing custom parameter', () => {
      mockRequest.params = {};

      const middleware = validateIdParam('eventId');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'eventId parameter is required and must be a non-empty string',
        code: 'INVALID_PARAMETER',
      });
    });
  });
});

