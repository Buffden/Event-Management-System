import { Router, Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { logger } from '../utils/logger';
import { requireUser } from '../middleware/auth.middleware';
import { asyncHandler, errorHandler } from '../middleware/error.middleware';
import { validateRequest, validateQuery, validatePagination, validateBookingStatus, validateUUID } from '../middleware/validation.middleware';
import { CreateBookingRequest, BookingFilters, AuthRequest } from '../types';
import { BookingStatus } from '../../generated/prisma';

const router = Router();

// Apply authentication to all routes
router.use(requireUser);

/**
 * POST /bookings - Create a new booking
 */
router.post('/bookings',
  validateRequest((body: CreateBookingRequest) => {
    const errors: string[] = [];

    if (!body.eventId || body.eventId.trim().length === 0) {
      errors.push('Event ID is required');
    } else {
      const uuidErrors = validateUUID(body.eventId, 'eventId');
      if (uuidErrors) {
        errors.push(...uuidErrors);
      }
    }

    return errors.length > 0 ? errors : null;
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const bookingData: CreateBookingRequest = {
      eventId: req.body.eventId,
      userId: req.user!.userId
    };

    logger.info('Creating new booking', { userId: bookingData.userId, eventId: bookingData.eventId });

    const booking = await bookingService.createBooking(bookingData);

    res.status(201).json({
      success: true,
      data: booking
    });
  })
);

/**
 * GET /bookings/my-bookings - Get user's bookings
 */
router.get('/bookings/my-bookings',
  validateQuery(validatePagination),
  validateQuery(validateBookingStatus),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      status,
      eventId,
      page = 1,
      limit = 10
    } = req.query;

    const filters: BookingFilters = {
      status: status as BookingStatus,
      eventId: eventId as string,
      page: Number(page),
      limit: Number(limit)
    };

    logger.info('Fetching user bookings', {
      userId: req.user!.userId,
      filters
    });

    const result = await bookingService.getUserBookings(req.user!.userId, filters);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * DELETE /bookings/:id - Cancel a booking
 */
router.delete('/bookings/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Validate booking ID format
    const uuidErrors = validateUUID(id, 'bookingId');
    if (uuidErrors) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking ID format',
        details: uuidErrors
      });
    }

    logger.info('Cancelling booking', { bookingId: id, userId });

    const booking = await bookingService.cancelBooking(id, userId);

    res.json({
      success: true,
      data: booking,
      message: 'Booking cancelled successfully'
    });
  })
);

/**
 * GET /bookings/:id - Get specific booking details
 */
router.get('/bookings/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Validate booking ID format
    const uuidErrors = validateUUID(id, 'bookingId');
    if (uuidErrors) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking ID format',
        details: uuidErrors
      });
    }

    logger.info('Fetching booking details', { bookingId: id, userId });

    const booking = await bookingService.getBookingById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user owns the booking or is admin
    if (booking.userId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only view your own bookings'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  })
);

/**
 * GET /bookings/event/:eventId/capacity - Check event capacity
 */
router.get('/bookings/event/:eventId/capacity',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId } = req.params;

    // Validate event ID format
    const uuidErrors = validateUUID(eventId, 'eventId');
    if (uuidErrors) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
        details: uuidErrors
      });
    }

    logger.info('Checking event capacity', { eventId, userId: req.user!.userId });

    const capacityInfo = await bookingService.checkEventCapacity(eventId);

    res.json({
      success: true,
      data: capacityInfo
    });
  })
);

export default router;
