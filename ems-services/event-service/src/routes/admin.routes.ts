import { Router, Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { venueService } from '../services/venue.service';
import { logger } from '../utils/logger';
import { requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateRequest, validateQuery, validatePagination, validateDateRange } from '../middleware/validation.middleware';
import { CreateVenueRequest, UpdateVenueRequest, RejectEventRequest, EventFilters } from '../types';
import { EventStatus } from '../../generated/prisma';

const router = Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

/**
 * GET /admin/events - Get a list of all events, with the ability to filter by any status
 */
router.get('/events',
  validateQuery(validatePagination),
  validateQuery(validateDateRange),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      status,
      category,
      venueId,
      speakerId,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const filters: EventFilters = {
      status: status as EventStatus,
      category: category as string,
      venueId: venueId ? Number(venueId) : undefined,
      speakerId: speakerId as string,
      bookingStartDate: startDate as string,
      bookingEndDate: endDate as string,
      page: Number(page),
      limit: Number(limit)
    };

    logger.info('Fetching all events (admin)', { filters });

    const result = await eventService.getEvents(filters, true);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * GET /admin/events/:id - Get full details of any event, regardless of status
 */
router.get('/events/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info('Fetching event by ID (admin)', { eventId: id });

    const event = await eventService.getEventById(id, true);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  })
);

/**
 * PATCH /admin/events/:id/approve - Approve a PENDING_APPROVAL event, changing its status to PUBLISHED
 */
router.patch('/events/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info('Approving event', { eventId: id });

    const event = await eventService.approveEvent(id);

    res.json({
      success: true,
      data: event
    });
  })
);

/**
 * PATCH /admin/events/:id/reject - Reject a PENDING_APPROVAL event, changing its status to REJECTED
 */
router.patch('/events/:id/reject',
  validateRequest((body: RejectEventRequest) => {
    const errors = [];

    if (!body.rejectionReason || body.rejectionReason.trim().length === 0) {
      errors.push({ field: 'rejectionReason', message: 'Rejection reason is required' });
    }

    if (body.rejectionReason && body.rejectionReason.trim().length < 10) {
      errors.push({ field: 'rejectionReason', message: 'Rejection reason must be at least 10 characters long' });
    }

    return errors.length > 0 ? errors : null;
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    logger.info('Rejecting event', { eventId: id, rejectionReason });

    const event = await eventService.rejectEvent(id, rejectionReason);

    res.json({
      success: true,
      data: event
    });
  })
);

/**
 * PATCH /admin/events/:id/cancel - Cancel a PUBLISHED event
 */
router.patch('/events/:id/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info('Cancelling event', { eventId: id });

    const event = await eventService.cancelEvent(id);

    res.json({
      success: true,
      data: event
    });
  })
);

/**
 * POST /admin/venues - Create a new venue
 */
router.post('/venues',
  validateRequest((body: CreateVenueRequest) => {
    const errors = [];

    if (!body.name || body.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Venue name is required' });
    }

    if (!body.address || body.address.trim().length === 0) {
      errors.push({ field: 'address', message: 'Venue address is required' });
    }

    if (!body.capacity || isNaN(Number(body.capacity)) || Number(body.capacity) <= 0) {
      errors.push({ field: 'capacity', message: 'Valid capacity greater than 0 is required' });
    }

    if (!body.openingTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.openingTime)) {
      errors.push({ field: 'openingTime', message: 'Opening time must be in HH:mm format (24-hour)' });
    }

    if (!body.closingTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.closingTime)) {
      errors.push({ field: 'closingTime', message: 'Closing time must be in HH:mm format (24-hour)' });
    }

    return errors.length > 0 ? errors : null;
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const venueData: CreateVenueRequest = req.body;

    logger.info('Creating new venue', { venueName: venueData.name });

    const venue = await venueService.createVenue(venueData);

    res.status(201).json({
      success: true,
      data: venue
    });
  })
);

/**
 * PUT /admin/venues/:id - Update an existing venue
 */
router.put('/venues/:id',
  validateRequest((body: UpdateVenueRequest) => {
    const errors = [];

    if (body.name !== undefined && (!body.name || body.name.trim().length === 0)) {
      errors.push({ field: 'name', message: 'Venue name cannot be empty' });
    }

    if (body.address !== undefined && (!body.address || body.address.trim().length === 0)) {
      errors.push({ field: 'address', message: 'Venue address cannot be empty' });
    }

    if (body.capacity !== undefined && (isNaN(Number(body.capacity)) || Number(body.capacity) <= 0)) {
      errors.push({ field: 'capacity', message: 'Valid capacity greater than 0 is required' });
    }

    if (body.openingTime !== undefined && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.openingTime)) {
      errors.push({ field: 'openingTime', message: 'Opening time must be in HH:mm format (24-hour)' });
    }

    if (body.closingTime !== undefined && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.closingTime)) {
      errors.push({ field: 'closingTime', message: 'Closing time must be in HH:mm format (24-hour)' });
    }

    return errors.length > 0 ? errors : null;
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateVenueRequest = req.body;

    logger.info('Updating venue', { venueId: id });

    const venue = await venueService.updateVenue(Number(id), updateData);

    res.json({
      success: true,
      data: venue
    });
  })
);

/**
 * DELETE /admin/venues/:id - Delete a venue
 */
router.delete('/venues/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info('Deleting venue', { venueId: id });

    await venueService.deleteVenue(Number(id));

    res.json({
      success: true,
      message: 'Venue deleted successfully'
    });
  })
);

/**
 * GET /admin/venues - Get all venues with admin filtering
 */
router.get('/venues',
  validateQuery(validatePagination),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      name,
      capacity,
      page = 1,
      limit = 10
    } = req.query;

    const filters = {
      name: name as string,
      capacity: capacity ? Number(capacity) : undefined,
      page: Number(page),
      limit: Number(limit)
    };

    logger.info('Fetching venues (admin)', { filters });

    const result = await venueService.getVenues(filters);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * GET /admin/venues/:id - Get venue by ID
 */
router.get('/venues/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info('Fetching venue by ID (admin)', { venueId: id });

    const venue = await venueService.getVenueById(Number(id));

    if (!venue) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found'
      });
    }

    res.json({
      success: true,
      data: venue
    });
  })
);

/**
 * GET /admin/analytics/stats - Get event statistics by status
 */
router.get('/analytics/stats',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Fetching event statistics by status (admin)');

    try {
      const stats = await eventService.getEventStatsByStatus();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get event statistics', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch event statistics'
      });
    }
  })
);

/**
 * GET /admin/analytics/total-events - Get total events count
 */
router.get('/analytics/total-events',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Fetching total events count (admin)');

    try {
      const total = await eventService.getTotalEvents();

      res.json({
        success: true,
        data: { totalEvents: total }
      });
    } catch (error) {
      logger.error('Failed to get total events', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch total events'
      });
    }
  })
);

export default router;
