import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { AuthUser, AuthRequest } from '../types';

/**
 * Middleware to verify JWT token and extract user information
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable not set');
      res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
      return;
    }

    jwt.verify(token, jwtSecret, (err: any, decoded: any) => {
      if (err) {
        logger.warn('Invalid token provided', { error: err.message });
        res.status(403).json({
          success: false,
          error: 'Invalid or expired token'
        });
        return;
      }

      // Extract user information from token
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      } as AuthUser;

      next();
    });
  } catch (error) {
    logger.error('Authentication middleware error', error as Error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'admin') {
    logger.warn('Admin access denied', { userId: req.user.userId, role: req.user.role });
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
    return;
  }

  next();
};

/**
 * Middleware to require user role (attendee or admin)
 */
export const requireUser = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  if (!['attendee', 'admin'].includes(req.user.role)) {
    logger.warn('User access denied', { userId: req.user.userId, role: req.user.role });
    res.status(403).json({
      success: false,
      error: 'User access required'
    });
    return;
  }

  next();
};

/**
 * Middleware to require speaker role
 */
export const requireSpeaker = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'speaker') {
    logger.warn('Speaker access denied', { userId: req.user.userId, role: req.user.role });
    res.status(403).json({
      success: false,
      error: 'Speaker access required'
    });
    return;
  }

  next();
};
