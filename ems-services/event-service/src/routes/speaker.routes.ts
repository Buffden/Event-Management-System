import { Router, Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { logger } from '../utils/logger';
import { requireSpeaker } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateRequest, validateQuery, validatePagination, validateDateRange } from '../middleware/validation.middleware';
import { CreateEventRequest, UpdateEventRequest, EventFilters } from '../types';
import { EventStatus } from '../../generated/prisma';

const router = Router();

// Apply speaker authentication to all routes
router.use(requireSpeaker);

/**
 * GET /events/my-events - Get a list of all events created by the authenticated speaker
 */
router.get('/events/my-events',
  validateQuery(validatePagination),
  validateQuery(validateDateRange),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      status,
      category,
      venueId,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const filters: EventFilters = {
      status: status as EventStatus,
      category: category as string,
      venueId: venueId ? Number(venueId) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
      page: Number(page),
      limit: Number(limit)
    };

    logger.info('Fetching speaker events', {
      speakerId: req.user!.userId,
      filters
    });

    const result = await eventService.getEventsBySpeaker(req.user!.userId, filters);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * POST /events - Create a new event (saved as DRAFT)
 */
router.post('/events',
  validateRequest((body: CreateEventRequest) => {
    const errors = [];

    if (!body.name || body.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Event name is required' });
    }

    if (!body.description || body.description.trim().length === 0) {
      errors.push({ field: 'description', message: 'Event description is required' });
    }

    if (!body.category || body.category.trim().length === 0) {
      errors.push({ field: 'category', message: 'Event category is required' });
    }

    if (!body.venueId || isNaN(Number(body.venueId))) {
      errors.push({ field: 'venueId', message: 'Valid venue ID is required' });
    }

    if (!body.bookingStartDate || isNaN(Date.parse(body.bookingStartDate))) {
      errors.push({ field: 'bookingStartDate', message: 'Valid booking start date is required' });
    }

    if (!body.bookingEndDate || isNaN(Date.parse(body.bookingEndDate))) {
      errors.push({ field: 'bookingEndDate', message: 'Valid booking end date is required' });
    }

    if (body.bookingStartDate && body.bookingEndDate && new Date(body.bookingStartDate) >= new Date(body.bookingEndDate)) {
      errors.push({ field: 'bookingDates', message: 'Booking start date must be before end date' });
    }

    return errors.length > 0 ? errors : null;
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const eventData: CreateEventRequest = req.body;
    const speakerId = req.user!.userId;

    logger.info('Creating new event', { speakerId, eventName: eventData.name });

    const event = await eventService.createEvent(eventData, speakerId);

    res.status(201).json({
      success: true,
      data: event
    });
  })
);

/**
 * PUT /events/:id - Update an event that is in DRAFT or REJECTED status
 */
router.put('/events/:id',
  validateRequest((body: UpdateEventRequest) => {
    const errors = [];

    if (body.name !== undefined && (!body.name || body.name.trim().length === 0)) {
      errors.push({ field: 'name', message: 'Event name cannot be empty' });
    }

    if (body.description !== undefined && (!body.description || body.description.trim().length === 0)) {
      errors.push({ field: 'description', message: 'Event description cannot be empty' });
    }

    if (body.category !== undefined && (!body.category || body.category.trim().length === 0)) {
      errors.push({ field: 'category', message: 'Event category cannot be empty' });
    }

    if (body.venueId !== undefined && isNaN(Number(body.venueId))) {
      errors.push({ field: 'venueId', message: 'Valid venue ID is required' });
    }

    if (body.bookingStartDate !== undefined && isNaN(Date.parse(body.bookingStartDate))) {
      errors.push({ field: 'bookingStartDate', message: 'Valid booking start date is required' });
    }

    if (body.bookingEndDate !== undefined && isNaN(Date.parse(body.bookingEndDate))) {
      errors.push({ field: 'bookingEndDate', message: 'Valid booking end date is required' });
    }

    if (body.bookingStartDate && body.bookingEndDate && new Date(body.bookingStartDate) >= new Date(body.bookingEndDate)) {
      errors.push({ field: 'bookingDates', message: 'Booking start date must be before end date' });
    }

    return errors.length > 0 ? errors : null;
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateEventRequest = req.body;
    const speakerId = req.user!.userId;

    logger.info('Updating event', { eventId: id, speakerId });

    const event = await eventService.updateEvent(id, updateData, speakerId);

    res.json({
      success: true,
      data: event
    });
  })
);

/**
 * PATCH /events/:id/submit - Change the event status from DRAFT or REJECTED to PENDING_APPROVAL
 */
router.patch('/events/:id/submit',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const speakerId = req.user!.userId;

    logger.info('Submitting event for approval', { eventId: id, speakerId });

    const event = await eventService.submitEvent(id, speakerId);

    res.json({
      success: true,
      data: event
    });
  })
);

/**
 * DELETE /events/:id - Delete an event that is in DRAFT status
 */
router.delete('/events/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const speakerId = req.user!.userId;

    logger.info('Deleting event', { eventId: id, speakerId });

    await eventService.deleteEvent(id, speakerId);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  })
);

/**
 * GET /events/:id - Get full details of speaker's own event
 */
router.get('/events/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const speakerId = req.user!.userId;

    logger.info('Fetching speaker event by ID', { eventId: id, speakerId });

    const event = await eventService.getEventById(id, true);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if the event belongs to the speaker
    if (event.speakerId !== speakerId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only view your own events'
      });
    }

    res.json({
      success: true,
      data: event
    });
  })
);

export default router;
