import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuthContext } from '../types';
import { authValidationService } from '../services/auth-validation.service';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
    }
  }
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
}

export const authMiddleware = (options: AuthMiddlewareOptions = {}) => {
  const { required = true, roles = [] } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        if (required) {
          return res.status(401).json({
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
            error: 'Token is required'
          });
        }
        return next();
      }

      // Validate token with auth-service
      const authContext = await authValidationService.validateTokenWithRole(token, roles);

      if (!authContext) {
        if (required) {
          logger.warn('Token validation failed', {
            hasToken: !!token,
            requiredRoles: roles
          });
          return res.status(401).json({
            error: 'Invalid or expired token'
          });
        }
        return next();
      }

      // Attach user to request
      req.user = authContext;

      logger.debug('User authenticated successfully', {
        userId: authContext.userId,
        role: authContext.role
      });

      next();
    } catch (error) {
      logger.error('Authentication failed', error as Error);

      if (required) {
        return res.status(401).json({
          error: 'Authentication failed'
        });
      }

      next();
    }
  };
};

// Convenience middleware functions
export const requireAuth = authMiddleware({ required: true });
export const requireAdmin = authMiddleware({ required: true, roles: ['ADMIN'] });
export const requireUser = authMiddleware({ required: true, roles: ['USER', 'ADMIN'] });
export const requireSpeaker = authMiddleware({ required: true, roles: ['SPEAKER'] });
export const requireAdminOrSpeaker = authMiddleware({ required: true, roles: ['ADMIN', 'SPEAKER'] });
export const optionalAuth = authMiddleware({ required: false });
