import axios, { AxiosResponse } from 'axios';
import { logger } from '../utils/logger';

interface AuthServiceResponse {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
  error?: string;
}

interface AuthUser {
  userId: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'SPEAKER';
}

class AuthValidationService {
  private authServiceUrl: string;

  constructor() {
    this.authServiceUrl = process.env.GATEWAY_URL
      ? `${process.env.GATEWAY_URL}/api/auth`
      : 'http://ems-gateway/api/auth';
  }

  /**
   * Validates a JWT token with the auth-service
   * @param token JWT token to validate
   * @returns AuthUser if valid, null if invalid
   */
  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      logger.info('=== AUTH-VALIDATION: Starting token validation ===', {
        authServiceUrl: this.authServiceUrl,
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPrefix: token?.substring(0, 20) + '...' || 'none',
        timestamp: new Date().toISOString()
      });

      const validateUrl = `${this.authServiceUrl}/validate-user`;
      logger.info('Making request to auth-service', {
        url: validateUrl,
        method: 'POST'
      });

      const response: AxiosResponse<AuthServiceResponse> = await axios.post(
        validateUrl,
        { token },
        {
          timeout: 5000, // 5 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Auth-service response received', {
        status: response.status,
        statusText: response.statusText,
        valid: response.data.valid,
        hasUser: !!response.data.user,
        timestamp: new Date().toISOString()
      });

      if (response.status === 200 && response.data.valid && response.data.user) {
        const user = response.data.user;

        // Use auth-service roles directly (no mapping needed)
        const authUser: AuthUser = {
          userId: user.id,
          email: user.email,
          role: user.role as 'ADMIN' | 'USER' | 'SPEAKER'
        };

        logger.info('=== AUTH-VALIDATION: Token validation successful ===', {
          userId: authUser.userId,
          email: authUser.email,
          role: authUser.role,
          timestamp: new Date().toISOString()
        });

        return authUser;
      }

      logger.warn('=== AUTH-VALIDATION: Token validation failed ===', {
        status: response.status,
        valid: response.data.valid,
        hasUser: !!response.data.user,
        error: response.data.error
      });
      return null;

    } catch (error: any) {
      logger.error('=== AUTH-VALIDATION: Error during token validation ===', error as Error, {
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        timestamp: new Date().toISOString()
      });

      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Auth service returned an error
          logger.warn('Auth service returned error response', {
            status: error.response.status,
            statusText: error.response.statusText,
            message: error.response.data?.error || 'Unknown error',
            data: error.response.data
          });
        } else if (error.request) {
          // Network error
          logger.error('Auth service unavailable - network error', error as Error, {
            url: this.authServiceUrl,
            requestConfig: error.config
          });
        } else {
          // Other error
          logger.error('Auth validation request setup error', error as Error);
        }
      } else {
        logger.error('Unexpected auth validation error', error as Error);
      }

      return null;
    }
  }

  /**
   * Validates token and checks if user has required role
   * @param token JWT token to validate
   * @param requiredRoles Array of required roles
   * @returns AuthUser if valid and has required role, null otherwise
   */
  async validateTokenWithRole(token: string, requiredRoles: string[]): Promise<AuthUser | null> {
    const authUser = await this.validateToken(token);

    if (!authUser) {
      return null;
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(authUser.role)) {
      logger.warn('User does not have required role', {
        userId: authUser.userId,
        userRole: authUser.role,
        requiredRoles
      });
      return null;
    }

    return authUser;
  }
}

export const authValidationService = new AuthValidationService();

