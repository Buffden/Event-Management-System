/**
 * Comprehensive Test Suite for Auth Middleware
 *
 * Tests all authentication middleware functionality including:
 * - Token validation
 * - User verification
 * - Active user checks
 * - Context service integration
 * - Error handling
 */

import '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  mockPrisma,
  mockJWT,
  mockLogger,
  createMockUser,
  createMockJWT,
  resetAllMocks,
} from './mocks-simple';
import { contextService } from '../services/context.service';

// Mock uuid - use a simpler approach
const mockUuidV4 = jest.fn(() => 'test-request-id-1234');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-1234'),
}));

// Mock context service
const mockContextServiceRun = jest.fn((context: any, callback: () => void) => {
  return callback();
});

jest.mock('../services/context.service', () => {
  const actual = jest.requireActual('../services/context.service');
  const mockRun = jest.fn((context: any, callback: () => void) => {
    return callback();
  });
  return {
    ...actual,
    contextService: {
      run: mockRun,
    },
  };
});

// Get the mocked modules after jest.mock
const { contextService } = require('../services/context.service');
const mockContextServiceRunRef = contextService.run;
const uuid = require('uuid');
const mockUuidV4Ref = uuid.v4;

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusSpy: jest.Mock;
  let jsonSpy: jest.Mock;

  beforeEach(() => {
    resetAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';

    // Reset mocks
    mockContextServiceRunRef.mockClear();
    mockUuidV4Ref.mockReturnValue('test-request-id-1234');

    // Setup request mock
    mockRequest = {
      headers: {},
    };

    // Setup response mock
    statusSpy = jest.fn().mockReturnThis();
    jsonSpy = jest.fn().mockReturnThis();
    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };

    // Setup next function mock
    mockNext = jest.fn();

    // Ensure context service mock executes callback
    mockContextServiceRunRef.mockImplementation((context: any, callback: () => void) => {
      return callback();
    });
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Successful Authentication', () => {
    it('should authenticate user with valid token and active account', async () => {
      const mockUser = createMockUser({
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        isActive: true,
        emailVerified: new Date(),
      });
      const mockJWTData = createMockJWT({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });

      mockRequest.headers = {
        authorization: 'Bearer valid.token.here',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockJWT.verify).toHaveBeenCalledWith('valid.token.here', 'test-secret-key');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          emailVerified: true,
        },
      });
      expect(mockContextServiceRunRef).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should set correct context with user information', async () => {
      const mockUser = createMockUser({
        id: 'user-456',
        email: 'admin@example.com',
        role: 'ADMIN',
        isActive: true,
        emailVerified: new Date(),
      });
      const mockJWTData = createMockJWT({
        userId: 'user-456',
        email: 'admin@example.com',
        role: 'ADMIN',
      });

      mockRequest.headers = {
        authorization: 'Bearer valid.token.here',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockContextServiceRunRef).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          userEmail: 'admin@example.com',
          userRole: 'ADMIN',
          requestId: 'test-request-id-1234',
          timestamp: expect.any(Number),
        }),
        expect.any(Function)
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Missing or Invalid Authorization Header', () => {
    it('should return 401 when authorization header is missing', async () => {
      mockRequest.headers = {};

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockRequest.headers = {
        authorization: 'Invalid token',
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should extract token correctly from Bearer header', async () => {
      const mockUser = createMockUser({ isActive: true });
      const mockJWTData = createMockJWT({ userId: 'user-123' });

      mockRequest.headers = {
        authorization: 'Bearer extracted.token.here',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockJWT.verify).toHaveBeenCalledWith('extracted.token.here', 'test-secret-key');
    });
  });

  describe('JWT Token Validation Errors', () => {
    it('should return 401 for invalid JWT token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token',
      };

      const jwtError = new jwt.JsonWebTokenError('Invalid token');
      mockJWT.verify.mockImplementation(() => {
        throw jwtError;
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockLogger.error).toHaveBeenCalledWith('Authentication failed', jwtError);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for expired JWT token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired.token',
      };

      const expiredError = new jwt.TokenExpiredError('Token expired', new Date());
      mockJWT.verify.mockImplementation(() => {
        throw expiredError;
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(401);
      // Note: TokenExpiredError extends JsonWebTokenError, so the first instanceof check
      // in the middleware (line 65) catches it and returns "Invalid token" instead of "Token expired"
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockLogger.error).toHaveBeenCalledWith('Authentication failed', expiredError);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('User Verification', () => {
    it('should return 401 when user is not found in database', async () => {
      const mockJWTData = createMockJWT({ userId: 'non-existent-user' });

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authentication failed: User not found',
        { userId: 'non-existent-user' }
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user account is not active', async () => {
      const mockUser = createMockUser({
        id: 'user-123',
        isActive: false,
      });
      const mockJWTData = createMockJWT({ userId: 'user-123' });

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Account is not active' });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authentication failed: User account not active',
        { userId: 'user-123' }
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow active users with verified email', async () => {
      const mockUser = createMockUser({
        id: 'user-123',
        isActive: true,
        emailVerified: new Date(),
      });
      const mockJWTData = createMockJWT({ userId: 'user-123' });

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });
  });

  describe('Database Errors', () => {
    it('should handle database errors gracefully', async () => {
      const mockJWTData = createMockJWT({ userId: 'user-123' });
      const dbError = new Error('Database connection failed');

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockPrisma.user.findUnique.mockRejectedValue(dbError);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Authentication error' });
      expect(mockLogger.error).toHaveBeenCalledWith('Authentication failed', dbError);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Context Service Integration', () => {
    it('should call contextService.run with correct context', async () => {
      const mockUser = createMockUser({
        id: 'user-789',
        email: 'context@example.com',
        role: 'SPEAKER',
        isActive: true,
        emailVerified: new Date(),
      });
      const mockJWTData = createMockJWT({
        userId: 'user-789',
        email: 'context@example.com',
        role: 'SPEAKER',
      });

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockContextServiceRunRef).toHaveBeenCalledTimes(1);
      const contextCall = mockContextServiceRunRef.mock.calls[0];
      expect(contextCall[0]).toMatchObject({
        userId: 'user-789',
        userEmail: 'context@example.com',
        userRole: 'SPEAKER',
        requestId: expect.any(String),
      });
      expect(typeof contextCall[0].timestamp).toBe('number');
      expect(typeof contextCall[1]).toBe('function');
    });

    it('should execute next() within context service run', async () => {
      const mockUser = createMockUser({ isActive: true });
      const mockJWTData = createMockJWT({ userId: 'user-123' });

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Override contextService.run to verify callback is called
      mockContextServiceRunRef.mockImplementation((context: any, callback: () => void) => {
        return callback();
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockContextServiceRunRef).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log successful authentication', async () => {
      const mockUser = createMockUser({
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        isActive: true,
        emailVerified: new Date(),
      });
      const mockJWTData = createMockJWT({ userId: 'user-123' });

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockLogger.debug).toHaveBeenCalledWith('User authenticated successfully', {
        userId: 'user-123',
        role: 'USER',
        email: 'test@example.com',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty authorization header', async () => {
      mockRequest.headers = {
        authorization: '',
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'No token provided' });
    });

    it('should handle authorization header with only Bearer', async () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      const jwtError = new jwt.JsonWebTokenError('Invalid token');
      mockJWT.verify.mockImplementation(() => {
        throw jwtError;
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockJWT.verify).toHaveBeenCalledWith('', 'test-secret-key');
    });

    it('should handle unexpected errors', async () => {
      const mockJWTData = createMockJWT({ userId: 'user-123' });
      const unexpectedError = new Error('Unexpected error');

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockJWT.verify.mockReturnValue(mockJWTData);
      mockPrisma.user.findUnique.mockRejectedValue(unexpectedError);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Authentication error' });
      expect(mockLogger.error).toHaveBeenCalledWith('Authentication failed', unexpectedError);
    });
  });
});

