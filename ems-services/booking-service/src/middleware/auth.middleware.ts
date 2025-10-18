import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuthUser, AuthRequest } from '../types';
import { authValidationService } from '../services/auth-validation.service';

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
}

/**
 * Middleware to verify JWT token using auth-service
 */
export const authMiddleware = (options: AuthMiddlewareOptions = {}) => {
  const { required = true, roles = [] } = options;

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        if (required) {
          return res.status(401).json({
            success: false,
            error: 'Authorization header is required'
          });
        }
        return next();
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      if (!token) {
        if (required) {
          return res.status(401).json({
            success: false,
            error: 'Token is required'
          });
        }
        return next();
      }

      // Validate token with auth-service
      const authUser = await authValidationService.validateTokenWithRole(token, roles);

      if (!authUser) {
        if (required) {
          logger.warn('Token validation failed', {
            hasToken: !!token,
            requiredRoles: roles
          });
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
          });
        }
        return next();
      }

      // Attach user to request
      req.user = authUser;

      logger.debug('User authenticated successfully', {
        userId: authUser.userId,
        role: authUser.role
      });

      next();
    } catch (error) {
      logger.error('Authentication failed', error as Error);

      if (required) {
        return res.status(401).json({
          success: false,
          error: 'Authentication failed'
        });
      }

      next();
    }
  };
};

// Legacy alias for backward compatibility
export const authenticateToken = authMiddleware({ required: true });

// Convenience middleware functions
export const requireAuth = authMiddleware({ required: true });
export const requireAdmin = authMiddleware({ required: true, roles: ['ADMIN'] });
export const requireUser = authMiddleware({ required: true, roles: ['USER', 'ADMIN'] });
export const requireSpeaker = authMiddleware({ required: true, roles: ['SPEAKER'] });
export const requireAdminOrSpeaker = authMiddleware({ required: true, roles: ['ADMIN', 'SPEAKER'] });
export const optionalAuth = authMiddleware({ required: false });
