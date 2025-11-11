import { Request, Response, NextFunction } from 'express';
import { feedbackService } from '../services/feedback.service';
import { logger } from '../utils/logger';

export const validateCreateFeedbackForm = (req: Request, res: Response, next: NextFunction) => {
  const { eventId, title } = req.body;
  const errors: string[] = [];

  if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
    errors.push('Event ID is required and must be a non-empty string');
  }

  if (!title || typeof title !== 'string' || title.trim() === '') {
    errors.push('Title is required and must be a non-empty string');
  }

  if (title && title.length > 255) {
    errors.push('Title must be 255 characters or less');
  }

  if (req.body.description && typeof req.body.description !== 'string') {
    errors.push('Description must be a string');
  }

  if (req.body.description && req.body.description.length > 1000) {
    errors.push('Description must be 1000 characters or less');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

export const validateUpdateFeedbackForm = (req: Request, res: Response, next: NextFunction) => {
  const { title, description, status } = req.body;
  const errors: string[] = [];

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      errors.push('Title must be a non-empty string');
    } else if (title.length > 255) {
      errors.push('Title must be 255 characters or less');
    }
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }
  }

  if (status !== undefined) {
    if (typeof status !== 'string') {
      errors.push('Status must be a string');
    } else if (!['DRAFT', 'PUBLISHED', 'CLOSED'].includes(status)) {
      errors.push('Status must be one of: DRAFT, PUBLISHED, CLOSED');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

export const validateSubmitFeedback = (req: Request, res: Response, next: NextFunction) => {
  const { formId, bookingId, rating, comment } = req.body;
  const errors: string[] = [];

  if (!formId || typeof formId !== 'string' || formId.trim() === '') {
    errors.push('Form ID is required and must be a non-empty string');
  }

  if (!bookingId || typeof bookingId !== 'string' || bookingId.trim() === '') {
    errors.push('Booking ID is required and must be a non-empty string');
  }

  if (rating === undefined || rating === null) {
    errors.push('Rating is required');
  } else if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push('Rating must be an integer between 1 and 5');
  }

  if (comment !== undefined) {
    if (typeof comment !== 'string') {
      errors.push('Comment must be a string');
    } else if (comment.length > 1000) {
      errors.push('Comment must be 1000 characters or less');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

export const validateUpdateFeedback = (req: Request, res: Response, next: NextFunction) => {
  const { rating, comment } = req.body;
  const errors: string[] = [];

  if (rating === undefined || rating === null) {
    errors.push('Rating is required');
  } else if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push('Rating must be an integer between 1 and 5');
  }

  if (comment !== undefined) {
    if (typeof comment !== 'string') {
      errors.push('Comment must be a string');
    } else if (comment.length > 1000) {
      errors.push('Comment must be 1000 characters or less');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { page, limit } = req.query;
  const errors: string[] = [];

  if (page !== undefined) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be a positive integer between 1 and 100');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

export const validateIdParam = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        error: `${paramName} parameter is required and must be a non-empty string`,
        code: 'INVALID_PARAMETER'
      });
    }

    next();
  };
};
