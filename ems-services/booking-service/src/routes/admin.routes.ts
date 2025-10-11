import { Router, Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { logger } from '../utils/logger';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateQuery, validatePagination, validateBookingStatus, validateUUID } from '../middleware/validation.middleware';
import { BookingFilters, AuthRequest } from '../types';
import { BookingStatus } from '../../generated/prisma';

const router = Router();

// Apply authentication and admin role to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /admin/events/:eventId/bookings - Get all bookings for a specific event
 */
router.get('/admin/events/:eventId/bookings',
  validateQuery(validatePagination),
  validateQuery(validateBookingStatus),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId } = req.params;
    const {
      status,
      userId,
      page = 1,
      limit = 10
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
      status: status as BookingStatus,
      userId: userId as string,
      page: Number(page),
      limit: Number(limit)
    };

    logger.info('Admin fetching event bookings', {
      eventId,
      adminId: req.user!.userId,
      filters
    });

    const result = await bookingService.getEventBookings(eventId, filters);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * GET /admin/bookings - Get all bookings across all events
 */
router.get('/admin/bookings',
  validateQuery(validatePagination),
  validateQuery(validateBookingStatus),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      status,
      eventId,
      userId,
      page = 1,
      limit = 10
    } = req.query;

    const filters: BookingFilters = {
      status: status as BookingStatus,
      eventId: eventId as string,
      userId: userId as string,
      page: Number(page),
      limit: Number(limit)
    };

    logger.info('Admin fetching all bookings', {
      adminId: req.user!.userId,
      filters
    });

    // For now, we'll use a simple approach - get bookings for a specific event if provided
    // In a more complex system, you might want to create a separate service method
    if (filters.eventId) {
      const result = await bookingService.getEventBookings(filters.eventId, filters);
      res.json({
        success: true,
        data: result
      });
    } else {
      // If no eventId provided, return error as we need to specify an event
      res.status(400).json({
        success: false,
        error: 'Event ID is required for admin booking queries'
      });
    }
  })
);

/**
 * GET /admin/events/:eventId/capacity - Get detailed capacity information for an event
 */
router.get('/admin/events/:eventId/capacity',
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

    logger.info('Admin checking event capacity', {
      eventId,
      adminId: req.user!.userId
    });

    const capacityInfo = await bookingService.checkEventCapacity(eventId);

    res.json({
      success: true,
      data: capacityInfo
    });
  })
);

/**
 * GET /admin/bookings/:id - Get specific booking details (admin view)
 */
router.get('/admin/bookings/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Validate booking ID format
    const uuidErrors = validateUUID(id, 'bookingId');
    if (uuidErrors) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking ID format',
        details: uuidErrors
      });
    }

    logger.info('Admin fetching booking details', {
      bookingId: id,
      adminId: req.user!.userId
    });

    const booking = await bookingService.getBookingById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  })
);

/**
 * DELETE /admin/bookings/:id - Cancel a booking (admin override)
 */
router.delete('/admin/bookings/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.userId;

    // Validate booking ID format
    const uuidErrors = validateUUID(id, 'bookingId');
    if (uuidErrors) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking ID format',
        details: uuidErrors
      });
    }

    logger.info('Admin cancelling booking', { bookingId: id, adminId });

    // First get the booking to find the user ID
    const booking = await bookingService.getBookingById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Cancel the booking using the original user ID
    const cancelledBooking = await bookingService.cancelBooking(id, booking.userId);

    res.json({
      success: true,
      data: cancelledBooking,
      message: 'Booking cancelled successfully by admin'
    });
  })
);

export default router;
