/**
 * Test Suite for Auth Middleware
 */

import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, adminOnly, speakerOnly, AuthRequest } from '../middleware/auth.middleware';

// Mock jsonwebtoken
var mockJwtVerify: jest.Mock;
var mockJwtDecode: jest.Mock;
var mockLogger: any;

jest.mock('jsonwebtoken', () => {
  const verifyFn = jest.fn();
  const decodeFn = jest.fn();
  mockJwtVerify = verifyFn;
  mockJwtDecode = decodeFn;
  return {
    default: {
      verify: verifyFn,
      decode: decodeFn,
    },
    verify: verifyFn,
    decode: decodeFn,
  };
});

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

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('authMiddleware', () => {
    it('should reject request without authorization header', () => {
      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without Bearer prefix', () => {
      mockRequest.headers = { authorization: 'InvalidToken' };
      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;
      mockRequest.headers = { authorization: 'Bearer token123' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Server Error',
        message: 'Authentication not configured',
      });
      expect(mockNext).not.toHaveBeenCalled();

      process.env.JWT_SECRET = 'test-secret';
    });

    it('should authenticate valid token and call next', () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockJwtVerify.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'SPEAKER',
      });

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockRequest.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'SPEAKER',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('adminOnly', () => {
    it('should allow ADMIN user', () => {
      mockRequest.user = { id: 'user-123', email: 'admin@example.com', role: 'ADMIN' };

      adminOnly(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-ADMIN user', () => {
      mockRequest.user = { id: 'user-123', email: 'user@example.com', role: 'SPEAKER' };

      adminOnly(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Admin access required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      adminOnly(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('speakerOnly', () => {
    it('should allow SPEAKER user', () => {
      mockRequest.user = { id: 'user-123', email: 'speaker@example.com', role: 'SPEAKER' };

      speakerOnly(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject non-SPEAKER user', () => {
      mockRequest.user = { id: 'user-123', email: 'user@example.com', role: 'USER' };

      speakerOnly(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Speaker access required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      speakerOnly(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

