import axios, { AxiosResponse } from 'axios';
import { logger } from '../utils/logger';
import { AuthUser } from '../types';

interface AuthServiceResponse {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  error?: string;
}

class AuthValidationService {
  private authServiceUrl: string;

  constructor() {
    this.authServiceUrl = process.env.GATEWAY_URL ? 
      `${process.env.GATEWAY_URL}/api/auth` : 'http://ems-gateway/api/auth';
  }

  /**
   * Validates a JWT token with the auth-service
   * @param token JWT token to validate
   * @returns AuthUser if valid, null if invalid
   */
  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      logger.debug('Validating token with auth-service', { authServiceUrl: this.authServiceUrl });

      const response: AxiosResponse<AuthServiceResponse> = await axios.post(
        `${this.authServiceUrl}/validate-user`,
        { token },
        {
          timeout: 5000, // 5 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200 && response.data.valid && response.data.user) {
        const user = response.data.user;

        // Map auth-service role to booking-service role
        const role = user.role === 'USER' ? 'USER' : user.role;

        const authUser: AuthUser = {
          userId: user.id,
          email: user.email,
          role: role as 'ADMIN' | 'USER' | 'SPEAKER'
        };

        logger.debug('Token validation successful', {
          userId: authUser.userId,
          role: authUser.role
        });

        return authUser;
      }

      logger.warn('Token validation failed', {
        status: response.status,
        valid: response.data.valid
      });
      return null;

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Auth service returned an error
          logger.warn('Auth service validation error', {
            status: error.response.status,
            message: error.response.data?.error || 'Unknown error'
          });
        } else if (error.request) {
          // Network error
          logger.error('Auth service unavailable', error as Error, {
            url: this.authServiceUrl
          });
        } else {
          // Other error
          logger.error('Auth validation request error', error as Error);
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
