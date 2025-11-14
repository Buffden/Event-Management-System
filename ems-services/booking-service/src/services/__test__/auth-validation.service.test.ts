/**
 * Test Suite for Auth Validation Service
 *
 * Tests token validation and role checking functionality.
 */

import '@jest/globals';
import axios from 'axios';
import { authValidationService } from '../auth-validation.service';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('AuthValidationService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateToken()', () => {
    it('should validate token successfully', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'USER',
          },
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse as any);

      const result = await authValidationService.validateToken('valid-token');

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/validate-user'),
        { token: 'valid-token' },
        expect.objectContaining({
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should return null for invalid token', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: false,
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse as any);

      const result = await authValidationService.validateToken('invalid-token');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return null when response status is not 200', async () => {
      const mockResponse = {
        status: 401,
        data: {
          valid: false,
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse as any);

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

      mockAxios.post.mockResolvedValue(mockResponse as any);

      const result = await authValidationService.validateToken('token');

      expect(result).toBeNull();
    });

    it('should handle axios error with response', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            error: 'Invalid token',
          },
        },
        isAxiosError: true,
      };

      mockAxios.post.mockRejectedValue(mockError);
      (mockAxios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true) as any;

      const result = await authValidationService.validateToken('token');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Auth service validation error',
        expect.objectContaining({
          status: 401,
          message: 'Invalid token',
        })
      );
    });

    it('should handle axios error with request but no response (network error)', async () => {
      const mockError = {
        request: {},
        isAxiosError: true,
      };

      mockAxios.post.mockRejectedValue(mockError);
      (mockAxios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true) as any;

      const result = await authValidationService.validateToken('token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auth service unavailable',
        expect.any(Error),
        expect.objectContaining({
          url: expect.any(String),
        })
      );
    });

    it('should handle axios error without request or response', async () => {
      const mockError = new Error('Request setup error');
      mockAxios.post.mockRejectedValue(mockError);
      (mockAxios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true) as any;

      const result = await authValidationService.validateToken('token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auth validation request error',
        expect.any(Error)
      );
    });

    it('should handle non-axios errors', async () => {
      const mockError = new Error('Unexpected error');
      mockAxios.post.mockRejectedValue(mockError);
      (mockAxios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(false) as any;

      const result = await authValidationService.validateToken('token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected auth validation error',
        expect.any(Error)
      );
    });

    it('should use GATEWAY_URL from environment', async () => {
      process.env.GATEWAY_URL = 'http://custom-gateway';
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'ADMIN',
          },
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse as any);

      // Create new instance to pick up env var
      const { AuthValidationService } = require('../auth-validation.service');
      const service = new (AuthValidationService as any)();

      await service.validateToken('token');

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('http://custom-gateway/api/auth/validate-user'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should use default URL when GATEWAY_URL is not set', async () => {
      delete process.env.GATEWAY_URL;
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'SPEAKER',
          },
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse as any);

      const { AuthValidationService } = require('../auth-validation.service');
      const service = new (AuthValidationService as any)();

      await service.validateToken('token');

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('http://ems-gateway/api/auth/validate-user'),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('validateTokenWithRole()', () => {
    it('should validate token with matching role', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'ADMIN',
          },
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse as any);

      const result = await authValidationService.validateTokenWithRole('token', ['ADMIN', 'USER']);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN',
      });
    });

    it('should return null when user role does not match required roles', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'USER',
          },
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse as any);

      const result = await authValidationService.validateTokenWithRole('token', ['ADMIN']);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User does not have required role',
        expect.objectContaining({
          userId: 'user-123',
          userRole: 'USER',
          requiredRoles: ['ADMIN'],
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

      mockAxios.post.mockResolvedValue(mockResponse as any);

      const result = await authValidationService.validateTokenWithRole('token', ['ADMIN']);

      expect(result).toBeNull();
    });

    it('should allow any role when requiredRoles is empty', async () => {
      const mockResponse = {
        status: 200,
        data: {
          valid: true,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'USER',
          },
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse as any);

      const result = await authValidationService.validateTokenWithRole('token', []);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });
    });
  });
});

