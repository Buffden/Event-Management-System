import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to allow internal service-to-service communication
 * Checks for x-internal-service header to bypass authentication
 */
export const requireInternalService = (req: Request, res: Response, next: NextFunction): void => {
  const internalServiceHeader = req.headers['x-internal-service'];

  if (!internalServiceHeader) {
    logger.warn('Internal service request without x-internal-service header', {
      method: req.method,
      url: req.url
    });
    res.status(403).json({
      success: false,
      error: 'Internal service access only'
    });
    return;
  }

  // Log internal service access
  logger.debug('Internal service request', {
    service: internalServiceHeader,
    method: req.method,
    url: req.url
  });

  next();
};

