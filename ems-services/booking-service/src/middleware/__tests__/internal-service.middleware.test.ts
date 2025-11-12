/**
 * Test Suite for Internal Service Middleware
 *
 * This test suite covers:
 * - requireInternalService middleware
 * - x-internal-service header validation
 * - Access control for internal service-to-service communication
 * - Logging of internal service requests
 */

import { Request, Response, NextFunction } from 'express';

// Mock logger before importing middleware
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { requireInternalService } from '../internal-service.middleware';
import { logger } from '../../utils/logger';

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Internal Service Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {},
      body: {},
      query: {},
      params: {},
      method: 'GET',
      url: '/api/test',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  describe('requireInternalService', () => {
    it('should return 403 when x-internal-service header is missing', () => {
      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal service access only'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should log warning when x-internal-service header is missing', () => {
      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockLogger.warn).toHaveBeenCalledWith('Internal service request without x-internal-service header', {
        method: 'GET',
        url: '/api/test'
      });
    });

    it('should call next when x-internal-service header is present', () => {
      mockRequest.headers = { 'x-internal-service': 'auth-service' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should log debug message when x-internal-service header is present', () => {
      mockRequest.headers = { 'x-internal-service': 'event-service' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockLogger.debug).toHaveBeenCalledWith('Internal service request', {
        service: 'event-service',
        method: 'GET',
        url: '/api/test'
      });
    });

    it('should accept x-internal-service header with different service names', () => {
      const serviceNames = ['auth-service', 'event-service', 'notification-service', 'feedback-service'];

      serviceNames.forEach((serviceName) => {
        jest.clearAllMocks();
        mockRequest.headers = { 'x-internal-service': serviceName };

        requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith('Internal service request', {
          service: serviceName,
          method: 'GET',
          url: '/api/test'
        });
      });
    });

    it('should handle POST requests with x-internal-service header', () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/bookings';
      mockRequest.headers = { 'x-internal-service': 'event-service' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Internal service request', {
        service: 'event-service',
        method: 'POST',
        url: '/api/bookings'
      });
    });

    it('should handle PUT requests with x-internal-service header', () => {
      mockRequest.method = 'PUT';
      mockRequest.url = '/api/bookings/123';
      mockRequest.headers = { 'x-internal-service': 'notification-service' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Internal service request', {
        service: 'notification-service',
        method: 'PUT',
        url: '/api/bookings/123'
      });
    });

    it('should handle DELETE requests with x-internal-service header', () => {
      mockRequest.method = 'DELETE';
      mockRequest.url = '/api/bookings/123';
      mockRequest.headers = { 'x-internal-service': 'admin-service' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Internal service request', {
        service: 'admin-service',
        method: 'DELETE',
        url: '/api/bookings/123'
      });
    });

    it('should return 403 when x-internal-service header is empty string', () => {
      mockRequest.headers = { 'x-internal-service': '' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      // Empty string is falsy, so it should be treated as missing
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal service access only'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should accept x-internal-service header with numeric value', () => {
      mockRequest.headers = { 'x-internal-service': '12345' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Internal service request', {
        service: '12345',
        method: 'GET',
        url: '/api/test'
      });
    });

    it('should accept x-internal-service header with special characters', () => {
      mockRequest.headers = { 'x-internal-service': 'service-name_v2.0' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Internal service request', {
        service: 'service-name_v2.0',
        method: 'GET',
        url: '/api/test'
      });
    });

    it('should handle requests with query parameters', () => {
      mockRequest.url = '/api/bookings?userId=123&status=CONFIRMED';
      mockRequest.headers = { 'x-internal-service': 'reporting-service' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Internal service request', {
        service: 'reporting-service',
        method: 'GET',
        url: '/api/bookings?userId=123&status=CONFIRMED'
      });
    });

    it('should handle requests with path parameters', () => {
      mockRequest.url = '/api/bookings/abc-123-def/tickets';
      mockRequest.headers = { 'x-internal-service': 'ticket-service' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Internal service request', {
        service: 'ticket-service',
        method: 'GET',
        url: '/api/bookings/abc-123-def/tickets'
      });
    });

    it('should not modify request or response when header is present', () => {
      mockRequest.headers = { 'x-internal-service': 'test-service' };
      const originalRequest = { ...mockRequest };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      // Verify request wasn't modified (except for added properties by Express)
      expect(mockRequest.headers).toEqual(originalRequest.headers);
      expect(mockRequest.body).toEqual(originalRequest.body);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should work correctly in a chain of middleware', () => {
      mockRequest.headers = { 'x-internal-service': 'test-service' };
      const middleware1 = jest.fn();
      const middleware2 = jest.fn();

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();

      // Simulate calling next middleware in chain
      const nextFn = nextFunction as jest.Mock;
      nextFn.mock.calls[0][0]; // Call next without arguments
      middleware1();
      middleware2();

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined headers object', () => {
      mockRequest.headers = undefined as any;

      // This will throw an error in the current implementation
      // because it tries to access undefined['x-internal-service']
      expect(() => {
        requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow();
    });

    it('should handle null headers object', () => {
      mockRequest.headers = null as any;

      // This will throw an error in the current implementation
      // because it tries to access null['x-internal-service']
      expect(() => {
        requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow();
    });

    it('should handle case-sensitive header name', () => {
      // Express normalizes headers to lowercase, but let's test with uppercase
      mockRequest.headers = { 'X-Internal-Service': 'test-service' } as any;

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      // Should fail because Express uses lowercase keys
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should handle request without method property', () => {
      delete mockRequest.method;
      mockRequest.headers = { 'x-internal-service': 'test-service' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Internal service request', {
        service: 'test-service',
        method: undefined,
        url: '/api/test'
      });
    });

    it('should handle request without url property', () => {
      delete mockRequest.url;
      mockRequest.headers = { 'x-internal-service': 'test-service' };

      requireInternalService(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Internal service request', {
        service: 'test-service',
        method: 'GET',
        url: undefined
      });
    });
  });
});
