import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import {
  FeedbackError,
  FeedbackFormNotFoundError,
  FeedbackSubmissionNotFoundError,
  DuplicateFeedbackSubmissionError,
  InvalidRatingError,
  FeedbackFormNotPublishedError
} from '../types/feedback.types';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred', error, {
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Handle known feedback errors
  if (error instanceof FeedbackError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code
    });
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;

    switch (prismaError.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'A record with this information already exists',
          code: 'DUPLICATE_RECORD'
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Record not found',
          code: 'RECORD_NOT_FOUND'
        });
      case 'P2003':
        return res.status(400).json({
          error: 'Invalid reference to related record',
          code: 'INVALID_REFERENCE'
        });
      default:
        return res.status(500).json({
          error: 'Database error occurred',
          code: 'DATABASE_ERROR'
        });
    }
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.message
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Handle syntax errors
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON'
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND'
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
