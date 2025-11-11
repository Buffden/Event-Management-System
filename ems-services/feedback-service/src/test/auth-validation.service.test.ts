/**
 * Comprehensive Test Suite for Auth Validation Service
 *
 * Tests all authentication validation functionality including:
 * - Token validation with auth-service
 * - Role-based validation
 * - Error handling
 * - Network error handling
 */

import { describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import {
  mockAxios,
  mockLogger,
  setupSuccessfulAuthValidation,
  setupAuthServiceError,
  resetAllMocks,
} from './mocks-simple';

import { AuthValidationService } from '../services/auth-validation.service';

describe('AuthValidationService', () => {
  let authValidationService: AuthValidationService;

  beforeEach(() => {
    resetAllMocks();
    authValidationService = new AuthValidationService();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('validateToken()', () => {
    it('should validate token successfully', async () => {
      const { mockAuthResponse } = setupSuccessfulAuthValidation();

      const result = await authValidationService.validateToken('valid.token');

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/validate-user'),
        { token: 'valid.token' },
        expect.objectContaining({
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-123');
      expect(result?.email).toBe('test@example.com');
      expect(result?.role).toBe('USER');
    });

    it('should return null for invalid token', async () => {
      const invalidResponse = {
        status: 200,
        data: {
          valid: false,
          error: 'Invalid token',
        },
      };

      mockAxios.post.mockResolvedValue(invalidResponse);

      const result = await authValidationService.validateToken('invalid.token');

      expect(result).toBeNull();
    });

    it('should return null when auth service returns error', async () => {
      const errorResponse = {
        status: 401,
        data: {
          valid: false,
          error: 'Token expired',
        },
      };

      mockAxios.post.mockResolvedValue(errorResponse);

      const result = await authValidationService.validateToken('expired.token');

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      setupAuthServiceError();

      const result = await authValidationService.validateToken('some.token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle axios errors with response', async () => {
      const axiosError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Service unavailable' },
        },
        isAxiosError: true,
      };

      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.post.mockRejectedValue(axiosError);

      const result = await authValidationService.validateToken('some.token');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle axios errors without response (network error)', async () => {
      const axiosError = {
        request: {},
        isAxiosError: true,
      };

      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.post.mockRejectedValue(axiosError);

      const result = await authValidationService.validateToken('some.token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockAxios.post.mockRejectedValue(unexpectedError);
      mockAxios.isAxiosError.mockReturnValue(false);

      const result = await authValidationService.validateToken('some.token');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('validateTokenWithRole()', () => {
    it('should validate token with matching role', async () => {
      setupSuccessfulAuthValidation();

      const result = await authValidationService.validateTokenWithRole('valid.token', ['USER', 'ADMIN']);

      expect(result).not.toBeNull();
      expect(result?.role).toBe('USER');
    });

    it('should return null for non-matching role', async () => {
      setupSuccessfulAuthValidation();

      const result = await authValidationService.validateTokenWithRole('valid.token', ['ADMIN']);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('User does not have required role'),
        expect.any(Object)
      );
    });

    it('should accept empty roles array (any role allowed)', async () => {
      setupSuccessfulAuthValidation();

      const result = await authValidationService.validateTokenWithRole('valid.token', []);

      expect(result).not.toBeNull();
      expect(result?.role).toBe('USER');
    });

    it('should return null if token validation fails', async () => {
      const invalidResponse = {
        status: 200,
        data: {
          valid: false,
        },
      };

      mockAxios.post.mockResolvedValue(invalidResponse);

      const result = await authValidationService.validateTokenWithRole('invalid.token', ['USER']);

      expect(result).toBeNull();
    });
  });
});

