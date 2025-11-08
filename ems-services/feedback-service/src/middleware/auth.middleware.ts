import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      code: 'MISSING_TOKEN'
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({
        error: 'Server configuration error',
        code: 'CONFIG_ERROR'
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = {
      id: decoded.userId, // Auth-service uses 'userId' in token payload, not 'id'
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.warn('Invalid token provided', { error: (error as Error).message });
    return res.status(403).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles
      });
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(['ADMIN']);
export const requireSpeaker = requireRole(['SPEAKER', 'ADMIN']);
export const requireAttendee = requireRole(['ATTENDEE', 'SPEAKER', 'ADMIN']);
