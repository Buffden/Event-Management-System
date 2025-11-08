import { Router, Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { venueService } from '../services/venue.service';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/error.middleware';
import { validateQuery, validatePagination, validateDateRange } from '../middleware/validation.middleware';
import { EventStatus } from '../../generated/prisma';

const router = Router();

/**
 * GET /events - Get a list of all PUBLISHED events
 * Supports filtering and pagination
 */
router.get('/events',
  validateQuery(validatePagination),
  validateQuery(validateDateRange),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      category,
      venueId,
      startDate,
      endDate,
      search,
      timeframe,
      page = 1,
      limit = 10
    } = req.query;

    const filters = {
      status: EventStatus.PUBLISHED,
      category: category as string,
      venueId: venueId ? Number(venueId) : undefined,
      bookingStartDate: startDate as string,
      bookingEndDate: endDate as string,
      search: search as string,
      timeframe: timeframe as string,
      page: Number(page),
      limit: Number(limit)
    };

    logger.info('Fetching published events', { filters });

    const result = await eventService.getEvents(filters, false);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * GET /events/:id - Get public details of a single PUBLISHED event
 */
router.get('/events/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info('Fetching published event by ID', { eventId: id });

    const event = await eventService.getEventById(id, false);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found or not published'
      });
    }

    res.json({
      success: true,
      data: event
    });
  })
);

/**
 * GET /venues - Get a list of all available venues
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

    logger.info('Fetching venues', { filters });

    const result = await venueService.getVenues(filters);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * GET /venues/all - Get all venues (for dropdowns, etc.)
 */
router.get('/venues/all',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Fetching all venues');

    const venues = await venueService.getAllVenues();

    res.json({
      success: true,
      data: venues
    });
  })
);

export default router;
