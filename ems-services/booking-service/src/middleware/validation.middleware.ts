import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Generic request validation middleware
 */
export const validateRequest = (validator: (body: any) => string[] | null) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors = validator(req.body);

      if (errors && errors.length > 0) {
        logger.warn('Request validation failed', { errors, body: req.body });
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error', error as Error);
      res.status(500).json({
        success: false,
        error: 'Validation error'
      });
    }
  };
};

/**
 * Generic query validation middleware
 */
export const validateQuery = (validator: (query: any) => string[] | null) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors = validator(req.query);

      if (errors && errors.length > 0) {
        logger.warn('Query validation failed', { errors, query: req.query });
        res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: errors
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Query validation middleware error', error as Error);
      res.status(500).json({
        success: false,
        error: 'Query validation error'
      });
    }
  };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (query: any): string[] | null => {
  const errors: string[] = [];

  if (query.page !== undefined) {
    const page = Number(query.page);
    if (isNaN(page) || page < 1) {
      errors.push('Page must be a positive integer');
    }
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('Limit must be a positive integer between 1 and 100');
    }
  }

  return errors.length > 0 ? errors : null;
};

/**
 * Validate booking status filter
 */
export const validateBookingStatus = (query: any): string[] | null => {
  const errors: string[] = [];

  if (query.status !== undefined) {
    const validStatuses = ['CONFIRMED', 'CANCELLED'];
    if (!validStatuses.includes(query.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  return errors.length > 0 ? errors : null;
};

/**
 * Validate UUID format
 */
export const validateUUID = (value: string, fieldName: string): string[] | null => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const cuidRegex = /^c[0-9a-z]{24}$/i;

  if (!uuidRegex.test(value) && !cuidRegex.test(value)) {
    return [`${fieldName} must be a valid UUID or CUID`];
  }

  return null;
};
