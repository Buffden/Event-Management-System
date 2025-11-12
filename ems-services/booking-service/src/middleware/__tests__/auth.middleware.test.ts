/**
 * Test Suite for Auth Middleware
 *
 * This test suite covers:
 * - authMiddleware with various options (required, roles)
 * - Authorization header validation
 * - Token validation with auth service
 * - Role-based access control
 * - Convenience middleware functions (requireAuth, requireAdmin, etc.)
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';

// Mock logger and auth service before importing middleware
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../services/auth-validation.service', () => ({
  authValidationService: {
    validateTokenWithRole: jest.fn(),
  },
}));

import { authMiddleware, requireAuth, requireAdmin, requireUser, requireSpeaker, requireAdminOrSpeaker, optionalAuth } from '../auth.middleware';
import { logger } from '../../utils/logger';
import { authValidationService } from '../../services/auth-validation.service';

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockAuthValidationService = authValidationService as jest.Mocked<typeof authValidationService>;

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {},
      body: {},
      query: {},
      params: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  describe('authMiddleware with required: true', () => {
    it('should return 401 when authorization header is missing', async () => {
      const middleware = authMiddleware({ required: true });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authorization header is required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is missing after Bearer prefix', async () => {
      mockRequest.headers = { authorization: 'Bearer ' };
      const middleware = authMiddleware({ required: true });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token is required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token validation fails', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(null);
      const middleware = authMiddleware({ required: true });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('invalid-token', []);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should attach user to request and call next when token is valid', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockUser);
      const middleware = authMiddleware({ required: true });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('valid-token', []);
      expect(mockRequest.user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle token without Bearer prefix', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const
      };
      mockRequest.headers = { authorization: 'valid-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockUser);
      const middleware = authMiddleware({ required: true });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('valid-token', []);
      expect(mockRequest.user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 when exception occurs during validation', async () => {
      mockRequest.headers = { authorization: 'Bearer error-token' };
      mockAuthValidationService.validateTokenWithRole.mockRejectedValue(new Error('Service error'));
      const middleware = authMiddleware({ required: true });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authMiddleware with required: false (optional)', () => {
    it('should call next when authorization header is missing', async () => {
      const middleware = authMiddleware({ required: false });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next when token is missing', async () => {
      mockRequest.headers = { authorization: 'Bearer ' };
      const middleware = authMiddleware({ required: false });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next when token validation fails', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(null);
      const middleware = authMiddleware({ required: false });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should attach user to request when token is valid', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockUser);
      const middleware = authMiddleware({ required: false });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should call next when exception occurs during validation', async () => {
      mockRequest.headers = { authorization: 'Bearer error-token' };
      mockAuthValidationService.validateTokenWithRole.mockRejectedValue(new Error('Service error'));
      const middleware = authMiddleware({ required: false });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('authMiddleware with role restrictions', () => {
    it('should allow user with required role', async () => {
      const mockUser = {
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN' as const
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockUser);
      const middleware = authMiddleware({ required: true, roles: ['ADMIN'] });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('valid-token', ['ADMIN']);
      expect(mockRequest.user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject user without required role', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(null);
      const middleware = authMiddleware({ required: true, roles: ['ADMIN'] });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow user with any of the required roles', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'USER' as const
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockUser);
      const middleware = authMiddleware({ required: true, roles: ['USER', 'ADMIN'] });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('valid-token', ['USER', 'ADMIN']);
      expect(mockRequest.user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Convenience middleware functions', () => {
    it('requireAuth should require authentication', async () => {
      mockRequest.headers = {};

      await requireAuth(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authorization header is required'
      });
    });

    it('requireAdmin should require ADMIN role', async () => {
      const mockAdmin = {
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN' as const
      };
      mockRequest.headers = { authorization: 'Bearer admin-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockAdmin);

      await requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('admin-token', ['ADMIN']);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('requireUser should require USER or ADMIN role', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'USER' as const
      };
      mockRequest.headers = { authorization: 'Bearer user-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockUser);

      await requireUser(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('user-token', ['USER', 'ADMIN']);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('requireSpeaker should require SPEAKER role', async () => {
      const mockSpeaker = {
        userId: 'speaker-123',
        email: 'speaker@example.com',
        role: 'SPEAKER' as const
      };
      mockRequest.headers = { authorization: 'Bearer speaker-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockSpeaker);

      await requireSpeaker(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('speaker-token', ['SPEAKER']);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('requireAdminOrSpeaker should require ADMIN or SPEAKER role', async () => {
      const mockAdmin = {
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN' as const
      };
      mockRequest.headers = { authorization: 'Bearer admin-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockAdmin);

      await requireAdminOrSpeaker(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('admin-token', ['ADMIN', 'SPEAKER']);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('optionalAuth should not require authentication', async () => {
      mockRequest.headers = {};

      await optionalAuth(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('optionalAuth should attach user when token is provided', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'USER' as const
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockUser);

      await optionalAuth(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string token', async () => {
      mockRequest.headers = { authorization: '' };
      const middleware = authMiddleware({ required: true });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authorization header is required'
      });
    });

    it('should handle whitespace-only token', async () => {
      mockRequest.headers = { authorization: '   ' };
      const middleware = authMiddleware({ required: true });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('   ', []);
    });

    it('should handle Bearer with multiple spaces', async () => {
      mockRequest.headers = { authorization: 'Bearer    token-with-spaces' };
      const middleware = authMiddleware({ required: true });
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const
      });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockAuthValidationService.validateTokenWithRole).toHaveBeenCalledWith('   token-with-spaces', []);
    });

    it('should log debug message on successful authentication', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(mockUser);
      const middleware = authMiddleware({ required: true });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockLogger.debug).toHaveBeenCalledWith('User authenticated successfully', {
        userId: 'user-123',
        role: 'USER'
      });
    });

    it('should log warning on token validation failure', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      mockAuthValidationService.validateTokenWithRole.mockResolvedValue(null);
      const middleware = authMiddleware({ required: true, roles: ['ADMIN'] });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockLogger.warn).toHaveBeenCalledWith('Token validation failed', {
        hasToken: true,
        requiredRoles: ['ADMIN']
      });
    });

    it('should log error on authentication exception', async () => {
      mockRequest.headers = { authorization: 'Bearer error-token' };
      const error = new Error('Service error');
      mockAuthValidationService.validateTokenWithRole.mockRejectedValue(error);
      const middleware = authMiddleware({ required: true });

      await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockLogger.error).toHaveBeenCalledWith('Authentication failed', error);
    });
  });
});
