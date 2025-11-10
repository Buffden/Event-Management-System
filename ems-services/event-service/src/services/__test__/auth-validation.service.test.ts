/**
 * Auth Validation Service Tests
 *
 * Tests for auth validation service including:
 * - Token validation
 * - Role-based validation
 * - Error handling
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mockAxios, mockLogger } from '../../test/mocks-simple';

// Set environment variable before importing service
process.env.GATEWAY_URL = 'http://test-gateway';

// Mock axios
jest.mock('axios', () => mockAxios);

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: mockLogger,
}));

// Unmock auth-validation.service to test the actual implementation
jest.unmock('../auth-validation.service');

// Import after mocks
import { authValidationService } from '../auth-validation.service';

describe('AuthValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios.isAxiosError.mockReturnValue(true);
  });

  describe('validateToken()', () => {
    it('should return AuthContext when token is valid', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'USER',
            isActive: true,
            emailVerified: '2024-01-01T00:00:00Z',
          },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await authValidationService.validateToken('valid-token');

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://test-gateway/api/auth/validate-user',
        { token: 'valid-token' },
        expect.objectContaining({
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should return null when token is invalid', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: false,
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await authValidationService.validateToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null when response status is not 200', async () => {
      const mockResponse = {
        status: 401,
        data: {
          valid: false,
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await authValidationService.validateToken('token');

      expect(result).toBeNull();
    });

    it('should return null when user data is missing', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await authValidationService.validateToken('token');

      expect(result).toBeNull();
    });

    it('should handle ADMIN role', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'ADMIN',
            isActive: true,
            emailVerified: '2024-01-01T00:00:00Z',
          },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await authValidationService.validateToken('admin-token');

      expect(result?.role).toBe('ADMIN');
    });

    it('should handle SPEAKER role', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'speaker-123',
            email: 'speaker@example.com',
            name: 'Speaker User',
            role: 'SPEAKER',
            isActive: true,
            emailVerified: '2024-01-01T00:00:00Z',
          },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await authValidationService.validateToken('speaker-token');

      expect(result?.role).toBe('SPEAKER');
    });

    it('should return null when auth service returns error response', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { error: 'Invalid token' },
        },
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.post.mockRejectedValue(mockError);

      const result = await authValidationService.validateToken('token');

      expect(result).toBeNull();
    });

    it('should return null when network error occurs', async () => {
      const mockError = {
        request: {},
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.post.mockRejectedValue(mockError);

      const result = await authValidationService.validateToken('token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return null when unexpected error occurs', async () => {
      const mockError = new Error('Unexpected error');
      mockAxios.isAxiosError.mockReturnValue(false);
      mockAxios.post.mockRejectedValue(mockError);

      const result = await authValidationService.validateToken('token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('validateTokenWithRole()', () => {
    it('should return AuthContext when token is valid and has required role', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'ADMIN',
            isActive: true,
            emailVerified: '2024-01-01T00:00:00Z',
          },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await authValidationService.validateTokenWithRole('token', ['ADMIN']);

      expect(result).toEqual({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
      });
    });

    it('should return null when user does not have required role', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'User',
            role: 'USER',
            isActive: true,
            emailVerified: '2024-01-01T00:00:00Z',
          },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await authValidationService.validateTokenWithRole('token', ['ADMIN']);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return AuthContext when no roles are required', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'User',
            role: 'USER',
            isActive: true,
            emailVerified: '2024-01-01T00:00:00Z',
          },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await authValidationService.validateTokenWithRole('token', []);

      expect(result).not.toBeNull();
    });

    it('should return null when token validation fails', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { valid: false },
      });

      const result = await authValidationService.validateTokenWithRole('token', ['ADMIN']);

      expect(result).toBeNull();
    });

    it('should allow user with one of multiple required roles', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'speaker-123',
            email: 'speaker@example.com',
            name: 'Speaker',
            role: 'SPEAKER',
            isActive: true,
            emailVerified: '2024-01-01T00:00:00Z',
          },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await authValidationService.validateTokenWithRole('token', ['ADMIN', 'SPEAKER']);

      expect(result).not.toBeNull();
      expect(result?.role).toBe('SPEAKER');
    });
  });
});

