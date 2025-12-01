import {Router, Request, Response} from 'express';
import {eventService} from '../services/event.service';
import {sessionService} from '../services/session.service';
import {logger} from '../utils/logger';
import {requireAdminOrSpeaker} from '../middleware/auth.middleware';
import {asyncHandler} from '../middleware/error.middleware';
import {
    validateRequest,
    validateQuery,
    validatePagination,
    validateDateRange
} from '../middleware/validation.middleware';
import {UpdateEventRequest, EventFilters, EventStatus} from '../types';

const router = Router();

// Apply speaker authentication to all routes (allows both SPEAKER and ADMIN roles)
router.use(requireAdminOrSpeaker);

/**
 * GET /events/my-events - Get a list of all events created by the specified speaker
 */
router.get('/events/my-events',
    asyncHandler(async (req: Request, res: Response) => {
        const {speakerId} = req.query;

        // Validate speakerId parameter
        if (!speakerId || typeof speakerId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Speaker ID is required as a query parameter'
            });
        }

        logger.info('Fetching speaker events', {
            speakerId: speakerId
        });

        // Get all events for the speaker without any filters
        const result = await eventService.getEventsBySpeaker(speakerId, {});

        res.json({
            success: true,
            data: result
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
            errors.push({field: 'name', message: 'Event name cannot be empty'});
        }

        if (body.description !== undefined && (!body.description || body.description.trim().length === 0)) {
            errors.push({field: 'description', message: 'Event description cannot be empty'});
        }

        if (body.category !== undefined && (!body.category || body.category.trim().length === 0)) {
            errors.push({field: 'category', message: 'Event category cannot be empty'});
        }

        if (body.venueId !== undefined && isNaN(Number(body.venueId))) {
            errors.push({field: 'venueId', message: 'Valid venue ID is required'});
        }

        if (body.bookingStartDate !== undefined && isNaN(Date.parse(body.bookingStartDate))) {
            errors.push({field: 'bookingStartDate', message: 'Valid booking start date is required'});
        }

        if (body.bookingEndDate !== undefined && isNaN(Date.parse(body.bookingEndDate))) {
            errors.push({field: 'bookingEndDate', message: 'Valid booking end date is required'});
        }

        if (body.bookingStartDate && body.bookingEndDate && new Date(body.bookingStartDate) >= new Date(body.bookingEndDate)) {
            errors.push({field: 'bookingDates', message: 'Booking start date must be before end date'});
        }

        return errors.length > 0 ? errors : null;
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const {id} = req.params;
        const updateData: UpdateEventRequest = req.body;
        const speakerId = req.user!.userId;

        logger.info('Updating event', {eventId: id, speakerId});

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
        const {id} = req.params;
        const speakerId = req.user!.userId;

        logger.info('Submitting event for approval', {eventId: id, speakerId});

        const event = await eventService.submitEvent(id, speakerId);

        res.json({
            success: true,
            data: event
        });
    })
);

/**
 * GET /events/:id - Get full details of speaker's own event
 */
router.get('/events/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const {id} = req.params;
        const speakerId = req.user!.userId;

        logger.info('Fetching speaker event by ID', {eventId: id, speakerId});

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

/**
 * GET /events/:eventId/sessions - List sessions for an event
 * Accessible to authenticated speakers and admins (same as admin endpoint)
 */
router.get('/events/:eventId/sessions',
    asyncHandler(async (req: Request, res: Response) => {
        const {eventId} = req.params;

        logger.info('Listing sessions for event (speaker route)', {eventId});

        const sessions = await sessionService.listSessions(eventId);

        res.json({
            success: true,
            data: sessions,
        });
    })
);

export default router;
