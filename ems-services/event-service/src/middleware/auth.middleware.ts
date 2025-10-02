import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { AuthContext, JWTPayload } from '../types';

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

      // Verify JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        logger.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({
          error: 'Server configuration error'
        });
      }

      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

      // Create auth context
      const authContext: AuthContext = {
        userId: decoded.userId,
        role: decoded.role as 'ADMIN' | 'SPEAKER' | 'ATTENDEE',
        email: decoded.email
      };

      // Check role requirements
      if (roles.length > 0 && !roles.includes(authContext.role)) {
        logger.warn('Access denied: insufficient role', {
          userId: authContext.userId,
          userRole: authContext.role,
          requiredRoles: roles
        });
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
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

      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          error: 'Invalid token'
        });
      }

      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'Token expired'
        });
      }

      return res.status(500).json({
        error: 'Authentication error'
      });
    }
  };
};

// Convenience middleware functions
export const requireAuth = authMiddleware({ required: true });
export const requireAdmin = authMiddleware({ required: true, roles: ['ADMIN'] });
export const requireSpeaker = authMiddleware({ required: true, roles: ['SPEAKER'] });
export const requireAdminOrSpeaker = authMiddleware({ required: true, roles: ['ADMIN', 'SPEAKER'] });
export const optionalAuth = authMiddleware({ required: false });
