/**
 * Comprehensive Test Suite for Context Middleware
 *
 * Tests all context middleware functionality including:
 * - Request context creation
 * - Token parsing and validation
 * - Context service integration
 * - requireAuth middleware
 * - Error handling
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { contextMiddleware, requireAuth } from '../middleware/context.middleware';
import {
  mockJWT,
  resetAllMocks,
  createMockJWT,
} from './mocks-simple';
import type { RequestContext } from '../services/context.service';

// Mock uuid
jest.mock('uuid', () => {
  const mockV4 = jest.fn(() => 'test-request-id-5678');
  return {
    v4: mockV4,
  };
});

// Mock context service
jest.mock('../services/context.service', () => {
  const actual = jest.requireActual<typeof import('../services/context.service')>('../services/context.service');
  const mockRun = jest.fn(<T,>(context: RequestContext, callback: () => T): T => callback());
  const mockGetCurrentUserId = jest.fn(() => '');
  return {
    ...actual,
    contextService: {
      ...actual.contextService,
      run: mockRun,
      getCurrentUserId: mockGetCurrentUserId,
    },
  };
});

const contextServiceModule = jest.requireMock('../services/context.service') as typeof import('../services/context.service');
const mockContextServiceRunRef = contextServiceModule.contextService.run as jest.MockedFunction<
  typeof contextServiceModule.contextService.run
>;
const mockGetCurrentUserIdRef = contextServiceModule.contextService.getCurrentUserId as jest.MockedFunction<
  typeof contextServiceModule.contextService.getCurrentUserId
>;
const uuidModule = jest.requireMock('uuid') as { v4: jest.Mock };

describe('Context Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Response;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    resetAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    // Reset mocks
    mockContextServiceRunRef.mockClear();
    mockGetCurrentUserIdRef.mockClear();
    uuidModule.v4.mockReturnValue('test-request-id-5678');

    // Setup request mock
    mockRequest = {
      headers: {},
    };

    // Setup response mock
    const response = {} as Response;
    response.status = jest.fn<Response['status']>().mockImplementation(function (this: Response) {
      return this;
    });
    response.json = jest.fn<Response['json']>().mockImplementation(function (this: Response) {
      return this;
    });
    mockResponse = response;

    // Setup next function mock
    mockNext = jest.fn((err?: unknown) => undefined) as jest.MockedFunction<NextFunction>;

    // Ensure context service mock executes callback
    mockContextServiceRunRef.mockImplementation(<T,>(context: RequestContext, callback: () => T) => callback());
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('contextMiddleware - With Valid Bearer Token', () => {
    it('should create context with user information from valid token', async () => {
      const mockJWTData = createMockJWT({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });

      mockRequest.headers = {
        authorization: 'Bearer valid.token.here',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockJWT.verify).toHaveBeenCalledWith('valid.token.here', 'test-secret-key');
      expect(mockContextServiceRunRef).toHaveBeenCalled();
      const contextCall = mockContextServiceRunRef.mock.calls[0];
      expect(contextCall[0]).toMatchObject({
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
      });
      expect(typeof contextCall[0].requestId).toBe('string');
      expect(typeof contextCall[0].timestamp).toBe('number');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract token correctly from Bearer header', () => {
      const mockJWTData = createMockJWT({
        userId: 'user-456',
        email: 'admin@example.com',
        role: 'ADMIN',
      });

      mockRequest.headers = {
        authorization: 'Bearer extracted.token.here',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockJWT.verify).toHaveBeenCalledWith('extracted.token.here', 'test-secret-key');
    });

    it('should set all user context fields correctly', () => {
      const mockJWTData = createMockJWT({
        userId: 'user-789',
        email: 'speaker@example.com',
        role: 'SPEAKER',
      });

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const contextCall = mockContextServiceRunRef.mock.calls[0];
      expect(contextCall[0]).toEqual({
        userId: 'user-789',
        userEmail: 'speaker@example.com',
        userRole: 'SPEAKER',
        requestId: 'test-request-id-5678',
        timestamp: expect.any(Number),
      });
    });

    it('should execute next() within context service run', () => {
      const mockJWTData = createMockJWT({ userId: 'user-123' });

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);

      // Override contextService.run to verify callback is called
      mockContextServiceRunRef.mockImplementation(<T,>(context: RequestContext, callback: () => T) => callback());

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockContextServiceRunRef).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('contextMiddleware - With Invalid Token', () => {
    it('should continue with empty user context when token is invalid', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token',
      };

      const jwtError = Object.create(jwt.JsonWebTokenError.prototype);
      jwtError.message = 'Invalid token';
      jwtError.name = 'JsonWebTokenError';
      mockJWT.verify.mockImplementation(() => {
        throw jwtError;
      });

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockContextServiceRunRef).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '',
          userEmail: '',
          userRole: '',
          requestId: expect.any(String),
          timestamp: expect.any(Number),
        }),
        expect.any(Function)
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue with empty user context when token is expired', () => {
      mockRequest.headers = {
        authorization: 'Bearer expired.token',
      };

      const expiredError = Object.create(jwt.TokenExpiredError.prototype);
      expiredError.message = 'Token expired';
      expiredError.name = 'TokenExpiredError';
      expiredError.expiredAt = new Date();
      mockJWT.verify.mockImplementation(() => {
        throw expiredError;
      });

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockContextServiceRunRef).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '',
          userEmail: '',
          userRole: '',
        }),
        expect.any(Function)
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle any JWT verification error gracefully', () => {
      mockRequest.headers = {
        authorization: 'Bearer bad.token',
      };

      const error = new Error('JWT verification failed');
      mockJWT.verify.mockImplementation(() => {
        throw error;
      });

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockContextServiceRunRef).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('contextMiddleware - Without Authorization Header', () => {
    it('should create minimal context when no authorization header is present', () => {
      mockRequest.headers = {};

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockContextServiceRunRef).toHaveBeenCalledWith(
        {
          requestId: expect.any(String),
          timestamp: expect.any(Number),
          userId: '',
          userEmail: '',
          userRole: '',
        },
        expect.any(Function)
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockJWT.verify).not.toHaveBeenCalled();
    });

    it('should create minimal context when authorization header is undefined', () => {
      mockRequest.headers = {
        authorization: undefined,
      };

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockContextServiceRunRef).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '',
          userEmail: '',
          userRole: '',
        }),
        expect.any(Function)
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('contextMiddleware - Edge Cases', () => {
    it('should handle authorization header that does not start with Bearer', () => {
      mockRequest.headers = {
        authorization: 'Invalid token format',
      };

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockContextServiceRunRef).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '',
          userEmail: '',
          userRole: '',
        }),
        expect.any(Function)
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockJWT.verify).not.toHaveBeenCalled();
    });

    it('should handle empty Bearer token', () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      const jwtError = Object.create(jwt.JsonWebTokenError.prototype);
      jwtError.message = 'Invalid token';
      jwtError.name = 'JsonWebTokenError';
      mockJWT.verify.mockImplementation(() => {
        throw jwtError;
      });

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockJWT.verify).toHaveBeenCalledWith('', 'test-secret-key');
      expect(mockContextServiceRunRef).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate unique request ID for each request', () => {
      mockRequest.headers = {};

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const firstCall = mockContextServiceRunRef.mock.calls[0][0];

      // Reset and call again
      mockContextServiceRunRef.mockClear();
      uuidModule.v4.mockReturnValueOnce('different-request-id');

      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const secondCall = mockContextServiceRunRef.mock.calls[0][0];
      expect(typeof firstCall.requestId).toBe('string');
      expect(typeof secondCall.requestId).toBe('string');
      expect(firstCall.requestId).not.toBe(secondCall.requestId);
    });

    it('should set timestamp for each request', () => {
      mockRequest.headers = {};

      const beforeTime = Date.now();
      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      const afterTime = Date.now();

      const contextCall = mockContextServiceRunRef.mock.calls[0];
      expect(contextCall[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(contextCall[0].timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('requireAuth Middleware', () => {
    it('should allow request when user context exists', () => {
      mockGetCurrentUserIdRef.mockReturnValue('user-123');

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetCurrentUserIdRef).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user context does not exist', () => {
      mockGetCurrentUserIdRef.mockReturnValue('');

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetCurrentUserIdRef).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when getCurrentUserId throws error', () => {
      mockGetCurrentUserIdRef.mockImplementation(() => {
        throw new Error('No user context available');
      });

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle any error in getCurrentUserId', () => {
      mockGetCurrentUserIdRef.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetCurrentUserIdRef).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when userId is null', () => {
      mockGetCurrentUserIdRef.mockReturnValue(null as any);

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should return 401 when userId is undefined', () => {
      mockGetCurrentUserIdRef.mockReturnValue(undefined as any);

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('Integration - contextMiddleware and requireAuth', () => {
    it('should work together when valid token is provided', () => {
      const mockJWTData = createMockJWT({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockGetCurrentUserIdRef.mockReturnValue('user-123');

      // First apply contextMiddleware
      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        () => {
          // Then apply requireAuth
          requireAuth(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
          );
        }
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail requireAuth when no token is provided', () => {
      mockRequest.headers = {};

      // First apply contextMiddleware
      contextMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        () => {
          // Then apply requireAuth
          mockGetCurrentUserIdRef.mockReturnValue('');
          requireAuth(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
          );
        }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

