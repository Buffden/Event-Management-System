import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const JWT_SECRET = process.env['JWT_SECRET'];

    if (!JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({
        error: 'Server Error',
        message: 'Authentication not configured'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    logger.debug('User authenticated', {
      userId: req.user.id,
      role: req.user.role
    });

    return next();
  } catch (error) {
    logger.error('Authentication failed', error as Error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
  return next();
};

export const speakerOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'SPEAKER') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Speaker access required'
    });
  }
  return next();
};
