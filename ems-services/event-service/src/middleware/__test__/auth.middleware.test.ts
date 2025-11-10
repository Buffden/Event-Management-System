/**
 * Auth Middleware Tests
 *
 * Tests for authentication middleware including:
 * - Token validation
 * - Role-based access control
 * - Optional vs required authentication
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { mockAuthValidationService, mockLogger } from '../../test/mocks-simple';

// Mock auth-validation service
jest.mock('../../services/auth-validation.service', () => ({
  authValidationService: mockAuthValidationService,
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: mockLogger,
}));

// Import after mocks
import { authMiddleware, requireAuth, requireAdmin, requireUser, requireSpeaker, requireAdminOrSpeaker, optionalAuth } from '../auth.middleware';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('authMiddleware - Required Authentication', () => {
    it('should return 401 when authorization header is missing', async () => {
      const middleware = authMiddleware({ required: true });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization header is required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is missing', async () => {
      mockRequest.headers = { authorization: 'Bearer ' };
      const middleware = authMiddleware({ required: true });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token is required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should extract token from Bearer header', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      const mockAuthContext = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const,
      };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockAuthContext);

      const middleware = authMiddleware({ required: true });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('test-token', []);
      expect(mockRequest.user).toEqual(mockAuthContext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract token without Bearer prefix', async () => {
      mockRequest.headers = { authorization: 'test-token' };
      const mockAuthContext = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const,
      };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockAuthContext);

      const middleware = authMiddleware({ required: true });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('test-token', []);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when token validation fails', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      (mockAuthValidationService.validateTokenWithRole as jest.MockedFunction<any>).mockResolvedValue(null);

      const middleware = authMiddleware({ required: true });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should check required roles', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      const mockAuthContext = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN' as const,
      };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockAuthContext);

      const middleware = authMiddleware({ required: true, roles: ['ADMIN'] });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('test-token', ['ADMIN']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when user does not have required role', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      (mockAuthValidationService.validateTokenWithRole as jest.MockedFunction<any>).mockResolvedValue(null);

      const middleware = authMiddleware({ required: true, roles: ['ADMIN'] });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      (mockAuthValidationService.validateTokenWithRole as jest.MockedFunction<any>).mockRejectedValue(new Error('Network error'));

      const middleware = authMiddleware({ required: true });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication failed'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authMiddleware - Optional Authentication', () => {
    it('should continue when authorization header is missing', async () => {
      const middleware = authMiddleware({ required: false });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue when token validation fails', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      (mockAuthValidationService.validateTokenWithRole as jest.MockedFunction<any>).mockResolvedValue(null);

      const middleware = authMiddleware({ required: false });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should attach user when token is valid', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      const mockAuthContext = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const,
      };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockAuthContext);

      const middleware = authMiddleware({ required: false });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockAuthContext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue on error when authentication is optional', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      (mockAuthValidationService.validateTokenWithRole as jest.MockedFunction<any>).mockRejectedValue(new Error('Network error'));

      const middleware = authMiddleware({ required: false });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('Convenience Middleware Functions', () => {
    it('requireAuth should require authentication', async () => {
      await requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('requireAdmin should require ADMIN role', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      const mockAuthContext = {
        userId: 'user-123',
        email: 'admin@example.com',
        role: 'ADMIN' as const,
      };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockAuthContext);

      await requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('test-token', ['ADMIN']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('requireUser should require USER or ADMIN role', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      const mockAuthContext = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'USER' as const,
      };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockAuthContext);

      await requireUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('test-token', ['USER', 'ADMIN']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('requireSpeaker should require SPEAKER role', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      const mockAuthContext = {
        userId: 'user-123',
        email: 'speaker@example.com',
        role: 'SPEAKER' as const,
      };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockAuthContext);

      await requireSpeaker(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('test-token', ['SPEAKER']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('requireAdminOrSpeaker should require ADMIN or SPEAKER role', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      const mockAuthContext = {
        userId: 'user-123',
        email: 'speaker@example.com',
        role: 'SPEAKER' as const,
      };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockAuthContext);

      await requireAdminOrSpeaker(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('test-token', ['ADMIN', 'SPEAKER']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('optionalAuth should allow requests without authentication', async () => {
      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});

