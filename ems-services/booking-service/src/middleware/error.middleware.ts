import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error', error, {
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not found';
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    message = 'Conflict';
  } else if (error.message.includes('not found')) {
    statusCode = 404;
    message = error.message;
  } else if (error.message.includes('already exists') || error.message.includes('already has')) {
    statusCode = 409;
    message = error.message;
  } else if (error.message.includes('Access denied') || error.message.includes('can only')) {
    statusCode = 403;
    message = error.message;
  } else if (error.message.includes('fully booked') || error.message.includes('capacity')) {
    statusCode = 409;
    message = error.message;
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
};
