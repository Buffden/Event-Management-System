/**
 * Test Suite for Internal Service Middleware
 */

import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { requireInternalService } from '../middleware/internal-service.middleware';

var mockLogger: any;

jest.mock('../utils/logger', () => {
  mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => mockLogger),
  };
  return {
    logger: mockLogger,
  };
});

describe('Internal Service Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should allow request with x-internal-service header', () => {
    mockRequest.headers = { 'x-internal-service': 'notification-service' };

    requireInternalService(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should reject request without x-internal-service header', () => {
    requireInternalService(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal service access only',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should log internal service access', () => {
    mockRequest.headers = { 'x-internal-service': 'event-service' };

    requireInternalService(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockLogger.debug).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should log warning for request without header', () => {
    requireInternalService(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
  });
});

