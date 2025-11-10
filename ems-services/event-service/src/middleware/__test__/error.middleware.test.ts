/**
 * Error Middleware Tests
 *
 * Tests for error handling middleware including:
 * - Error handler
 * - Not found handler
 * - Async handler wrapper
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
import { errorHandler, notFoundHandler, asyncHandler, AppError } from '../error.middleware';

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'GET',
      url: '/test',
      get: jest.fn(() => 'test-agent'),
      ip: '127.0.0.1',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('errorHandler', () => {
    it('should handle generic errors with status 500', () => {
      const error = new Error('Generic error');
      errorHandler(error as AppError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Generic error',
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use custom statusCode from error', () => {
      const error: AppError = new Error('Custom error');
      error.statusCode = 400;
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Custom error',
      });
    });

    it('should handle ValidationError', () => {
      const error: AppError = new Error('Validation error');
      error.name = 'ValidationError';
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation Error',
      });
    });

    it('should handle CastError', () => {
      const error: AppError = new Error('Cast error');
      error.name = 'CastError';
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid ID format',
      });
    });

    it('should handle JsonWebTokenError', () => {
      const error: AppError = new Error('JWT error');
      error.name = 'JsonWebTokenError';
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
    });

    it('should handle TokenExpiredError', () => {
      const error: AppError = new Error('Token expired');
      error.name = 'TokenExpiredError';
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token expired',
      });
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error: AppError = new Error('Development error');
      error.stack = 'Error stack trace';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Development error',
        stack: 'Error stack trace',
        details: error,
      });
    });

    it('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error: AppError = new Error('Production error');
      error.stack = 'Error stack trace';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Production error',
      });
      expect(mockResponse.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.anything(),
        })
      );
    });

    it('should use default message when error message is empty', () => {
      const error: AppError = new Error('');
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
      });
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with route not found message', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Route not found',
        path: '/test',
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('asyncHandler', () => {
    it('should call the handler function', async () => {
      const handler = jest.fn(async (req: Request, res: Response, next: NextFunction) => {
        res.status(200).json({ success: true });
      });

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(handler).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and pass errors to next', async () => {
      const error = new Error('Handler error');
      const handler = jest.fn(async () => {
        throw error;
      });

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors', async () => {
      const error = new Error('Sync error');
      const handler = jest.fn((req, res, next) => {
        throw error;
      });

      const wrappedHandler = asyncHandler(handler);
      wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      // Wait for promise to resolve/reject
      await new Promise(resolve => setImmediate(resolve));

      // The error should be passed to next via Promise.resolve().catch()
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle promise rejections', async () => {
      const error = new Error('Promise rejection');
      const handler = jest.fn(async (req, res, next) => {
        throw error; // Use throw instead of Promise.reject for consistency
      });

      const wrappedHandler = asyncHandler(handler);
      wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      // Wait for promise to resolve/reject
      await new Promise(resolve => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});

