import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ValidationError {
  field: string;
  message: string;
}

export const validateRequest = (validationFn: (body: any) => ValidationError[] | null) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationFn(req.body);

      if (errors && errors.length > 0) {
        logger.warn('Validation failed', { errors, body: req.body });
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error', error as Error);
      return res.status(500).json({
        error: 'Validation error'
      });
    }
  };
};

export const validateQuery = (validationFn: (query: any) => ValidationError[] | null) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationFn(req.query);

      if (errors && errors.length > 0) {
        logger.warn('Query validation failed', { errors, query: req.query });
        return res.status(400).json({
          error: 'Query validation failed',
          details: errors
        });
      }

      next();
    } catch (error) {
      logger.error('Query validation middleware error', error as Error);
      return res.status(500).json({
        error: 'Query validation error'
      });
    }
  };
};

// Common validation functions
export const validatePagination = (query: any): ValidationError[] | null => {
  const errors: ValidationError[] = [];

  if (query.page && (isNaN(Number(query.page)) || Number(query.page) < 1)) {
    errors.push({ field: 'page', message: 'Page must be a positive integer' });
  }

  if (query.limit && (isNaN(Number(query.limit)) || Number(query.limit) < 1 || Number(query.limit) > 100)) {
    errors.push({ field: 'limit', message: 'Limit must be between 1 and 100' });
  }

  return errors.length > 0 ? errors : null;
};

export const validateDateRange = (query: any): ValidationError[] | null => {
  const errors: ValidationError[] = [];

  if (query.startDate && isNaN(Date.parse(query.startDate))) {
    errors.push({ field: 'startDate', message: 'Start date must be a valid ISO date string' });
  }

  if (query.endDate && isNaN(Date.parse(query.endDate))) {
    errors.push({ field: 'endDate', message: 'End date must be a valid ISO date string' });
  }

  if (query.startDate && query.endDate && new Date(query.startDate) > new Date(query.endDate)) {
    errors.push({ field: 'dateRange', message: 'Start date must be before end date' });
  }

  return errors.length > 0 ? errors : null;
};
