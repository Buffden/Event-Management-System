import { Router, Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { logger } from '../utils/logger';
import { requireInternalService } from '../middleware/internal-service.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateUUID } from '../middleware/validation.middleware';
import { BookingFilters } from '../types';
import { BookingStatus } from '../../generated/prisma';

const router = Router();

// Apply internal service middleware to all routes
router.use(requireInternalService);

/**
 * GET /internal/events/:eventId/bookings - Get all bookings for a specific event (internal service only)
 */
router.get('/internal/events/:eventId/bookings',
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId } = req.params;
    const {
      status,
      page = 1,
      limit = 100
    } = req.query;

    // Validate event ID format
    const uuidErrors = validateUUID(eventId, 'eventId');
    if (uuidErrors) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
        details: uuidErrors
      });
    }

    const filters: BookingFilters = {
      status: (status as BookingStatus) || BookingStatus.CONFIRMED,
      page: Number(page),
      limit: Math.min(Number(limit), 100) // Max 100 per page
    };

    logger.info('Internal service fetching event bookings', {
      eventId,
      service: req.headers['x-internal-service'],
      filters
    });

    const result = await bookingService.getEventBookings(eventId, filters);

    res.json({
      success: true,
      data: result
    });
  })
);

export default router;

