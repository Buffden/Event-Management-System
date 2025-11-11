/**
 * Comprehensive Test Suite for Auth Middleware
 *
 * Tests all authentication middleware functionality including:
 * - Token validation
 * - Role-based access control
 * - Error handling
 * - Missing token handling
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireSpeaker,
  requireAttendee,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import {
  mockJWT,
  mockLogger,
  createMockJWT,
  resetAllMocks,
} from './mocks-simple';

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    resetAllMocks();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('authenticateToken()', () => {
    it('should authenticate valid token successfully', () => {
      const mockToken = createMockJWT();
      mockRequest.headers = {
        authorization: `Bearer valid.token`,
      };

      // Mock JWT verify to return decoded token
      jest.spyOn(jwt, 'verify').mockReturnValue(mockToken as any);

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('user-123');
      expect(mockRequest.user?.email).toBe('test@example.com');
      expect(mockRequest.user?.role).toBe('USER');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without authorization header', () => {
      mockRequest.headers = {};

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'MISSING_TOKEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      // Mock jwt.verify to throw error for invalid token
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // When token format is invalid but token exists, jwt.verify will fail and return 403
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token',
      };

      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new JsonWebTokenError('Invalid token');
      });

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      mockRequest.headers = {
        authorization: 'Bearer expired.token',
      };

      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new TokenExpiredError('Token expired', new Date());
      });

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing JWT_SECRET', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Server configuration error',
        code: 'CONFIG_ERROR',
      });

      // Restore JWT_SECRET
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('requireRole()', () => {
    beforeEach(() => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      };
    });

    it('should allow access for matching role', () => {
      const middleware = requireRole(['USER', 'ADMIN']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject access for non-matching role', () => {
      const middleware = requireRole(['ADMIN']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject access when user is not authenticated', () => {
      delete mockRequest.user;
      const middleware = requireRole(['USER']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin()', () => {
    it('should allow ADMIN role', () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject non-ADMIN roles', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'USER',
      };

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireSpeaker()', () => {
    it('should allow SPEAKER role', () => {
      mockRequest.user = {
        id: 'speaker-123',
        email: 'speaker@example.com',
        role: 'SPEAKER',
      };

      requireSpeaker(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow ADMIN role', () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      requireSpeaker(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject USER role', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'USER',
      };

      requireSpeaker(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAttendee()', () => {
    it('should allow USER role', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'USER',
      };

      requireAttendee(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow SPEAKER role', () => {
      mockRequest.user = {
        id: 'speaker-123',
        email: 'speaker@example.com',
        role: 'SPEAKER',
      };

      requireAttendee(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow ADMIN role', () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      requireAttendee(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

