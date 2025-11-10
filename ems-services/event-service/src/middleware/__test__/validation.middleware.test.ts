/**
 * Validation Middleware Tests
 *
 * Tests for request validation middleware including:
 * - Request body validation
 * - Query parameter validation
 * - Common validation functions
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Mock logger first
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../utils/logger', () => ({
  logger: mockLogger,
}));

// Import after mocks
import {
  validateRequest,
  validateQuery,
  validatePagination,
  validateDateRange,
  ValidationError,
} from '../validation.middleware';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as jest.MockedFunction<Response['status']>,
      json: jest.fn().mockReturnThis() as jest.MockedFunction<Response['json']>,
    };

    mockNext = jest.fn((err?: unknown) => undefined) as jest.MockedFunction<NextFunction>;
  });

  describe('validateRequest', () => {
    it('should call next when validation passes', () => {
      const validationFn = jest.fn(() => null);
      const middleware = validateRequest(validationFn);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(validationFn).toHaveBeenCalledWith(mockRequest.body);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 when validation fails', () => {
      const errors: ValidationError[] = [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Email is invalid' },
      ];
      const validationFn = jest.fn(() => errors);
      const middleware = validateRequest(validationFn);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: errors,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when validation function throws error', () => {
      const validationFn = jest.fn(() => {
        throw new Error('Validation error');
      });
      const middleware = validateRequest(validationFn);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation error',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    it('should call next when validation passes', () => {
      const validationFn = jest.fn(() => null);
      const middleware = validateQuery(validationFn);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(validationFn).toHaveBeenCalledWith(mockRequest.query);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 when query validation fails', () => {
      const errors: ValidationError[] = [
        { field: 'page', message: 'Page must be a positive integer' },
      ];
      const validationFn = jest.fn(() => errors);
      const middleware = validateQuery(validationFn);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Query validation failed',
        details: errors,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when validation function throws error', () => {
      const validationFn = jest.fn(() => {
        throw new Error('Query validation error');
      });
      const middleware = validateQuery(validationFn);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Query validation error',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validatePagination', () => {
    it('should return null for valid pagination', () => {
      const query = { page: '1', limit: '10' };
      const errors = validatePagination(query);

      expect(errors).toBeNull();
    });

    it('should return error for invalid page (not a number)', () => {
      const query = { page: 'abc' };
      const errors = validatePagination(query);

      expect(errors).toEqual([
        { field: 'page', message: 'Page must be a positive integer' },
      ]);
    });

    it('should return error for invalid page (less than 1)', () => {
      const query = { page: '0' };
      const errors = validatePagination(query);

      expect(errors).toEqual([
        { field: 'page', message: 'Page must be a positive integer' },
      ]);
    });

    it('should return error for invalid limit (less than 1)', () => {
      const query = { limit: '0' };
      const errors = validatePagination(query);

      expect(errors).toEqual([
        { field: 'limit', message: 'Limit must be between 1 and 100' },
      ]);
    });

    it('should return error for invalid limit (greater than 100)', () => {
      const query = { limit: '101' };
      const errors = validatePagination(query);

      expect(errors).toEqual([
        { field: 'limit', message: 'Limit must be between 1 and 100' },
      ]);
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const query = { page: '0', limit: '200' };
      const errors = validatePagination(query);

      expect(errors).toHaveLength(2);
      expect(errors).toEqual(
        expect.arrayContaining([
          { field: 'page', message: 'Page must be a positive integer' },
          { field: 'limit', message: 'Limit must be between 1 and 100' },
        ])
      );
    });

    it('should return null when page and limit are not provided', () => {
      const query = {};
      const errors = validatePagination(query);

      expect(errors).toBeNull();
    });
  });

  describe('validateDateRange', () => {
    it('should return null for valid date range', () => {
      const query = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      };
      const errors = validateDateRange(query);

      expect(errors).toBeNull();
    });

    it('should return error for invalid startDate', () => {
      const query = { startDate: 'invalid-date' };
      const errors = validateDateRange(query);

      expect(errors).toEqual([
        { field: 'startDate', message: 'Start date must be a valid ISO date string' },
      ]);
    });

    it('should return error for invalid endDate', () => {
      const query = { endDate: 'invalid-date' };
      const errors = validateDateRange(query);

      expect(errors).toEqual([
        { field: 'endDate', message: 'End date must be a valid ISO date string' },
      ]);
    });

    it('should return error when startDate is after endDate', () => {
      const query = {
        startDate: '2024-12-31T23:59:59Z',
        endDate: '2024-01-01T00:00:00Z',
      };
      const errors = validateDateRange(query);

      expect(errors).toEqual([
        { field: 'dateRange', message: 'Start date must be before end date' },
      ]);
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const query = {
        startDate: 'invalid-date',
        endDate: 'invalid-date',
      };
      const errors = validateDateRange(query);

      expect(errors).toHaveLength(2);
      expect(errors).toEqual(
        expect.arrayContaining([
          { field: 'startDate', message: 'Start date must be a valid ISO date string' },
          { field: 'endDate', message: 'End date must be a valid ISO date string' },
        ])
      );
    });

    it('should return null when dates are not provided', () => {
      const query = {};
      const errors = validateDateRange(query);

      expect(errors).toBeNull();
    });

    it('should return null when only startDate is provided', () => {
      const query = { startDate: '2024-01-01T00:00:00Z' };
      const errors = validateDateRange(query);

      expect(errors).toBeNull();
    });

    it('should return null when only endDate is provided', () => {
      const query = { endDate: '2024-12-31T23:59:59Z' };
      const errors = validateDateRange(query);

      expect(errors).toBeNull();
    });
  });
});

