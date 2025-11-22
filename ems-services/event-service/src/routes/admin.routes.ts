import {Router, Request, Response} from 'express';
import {eventService} from '../services/event.service';
import {venueService} from '../services/venue.service';
import {logger} from '../utils/logger';
import {requireAdmin} from '../middleware/auth.middleware';
import {asyncHandler} from '../middleware/error.middleware';
import {
    validateRequest,
    validateQuery,
    validatePagination,
    validateDateRange
} from '../middleware/validation.middleware';
import {
    CreateEventRequest,
    CreateSessionRequest,
    CreateVenueRequest,
    UpdateVenueRequest,
    RejectEventRequest,
    EventFilters,
    UpdateEventRequest,
    UpdateSessionRequest,
    SessionSpeakerAssignRequest,
    SessionSpeakerUpdateRequest,
    EventStatus
} from '../types';
import type {ValidationError} from '../middleware/validation.middleware';
import {sessionService} from '../services/session.service';

const router = Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

const validateCreateSessionRequest = (body: CreateSessionRequest): ValidationError[] | null => {
    const errors: ValidationError[] = [];

    if (!body.title || body.title.trim().length === 0) {
        errors.push({field: 'title', message: 'Session title is required'});
    }

    if (!body.startsAt || isNaN(Date.parse(body.startsAt))) {
        errors.push({field: 'startsAt', message: 'Valid session start time is required'});
    }

    if (!body.endsAt || isNaN(Date.parse(body.endsAt))) {
        errors.push({field: 'endsAt', message: 'Valid session end time is required'});
    }

    if (body.startsAt && body.endsAt && new Date(body.startsAt) >= new Date(body.endsAt)) {
        errors.push({field: 'schedule', message: 'Session start time must be before end time'});
    }

    return errors.length > 0 ? errors : null;
};

const validateUpdateSessionRequest = (body: UpdateSessionRequest): ValidationError[] | null => {
    const errors: ValidationError[] = [];

    if (body.startsAt && isNaN(Date.parse(body.startsAt))) {
        errors.push({field: 'startsAt', message: 'Valid session start time is required'});
    }

    if (body.endsAt && isNaN(Date.parse(body.endsAt))) {
        errors.push({field: 'endsAt', message: 'Valid session end time is required'});
    }

    if (body.startsAt && body.endsAt && new Date(body.startsAt) >= new Date(body.endsAt)) {
        errors.push({field: 'schedule', message: 'Session start time must be before end time'});
    }

    return errors.length > 0 ? errors : null;
};

const validateAssignSpeakerRequest = (body: SessionSpeakerAssignRequest): ValidationError[] | null => {
    const errors: ValidationError[] = [];

    if (!body.speakerId || body.speakerId.trim().length === 0) {
        errors.push({field: 'speakerId', message: 'Speaker ID is required'});
    }

    return errors.length > 0 ? errors : null;
};

/**
 * GET /admin/events - Get a list of all events, with the ability to filter by any status
 */
router.get('/admin/events',
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

        logger.info('Fetching all events (admin)', {filters});

        const result = await eventService.getEvents(filters, true);

        res.json({
            success: true,
            data: result
        });
    })
);

/**
 * POST /admin/events - Create a new event (admin)
 */
router.post('/admin/events',
    validateRequest((body: Partial<CreateEventRequest>) => {
        const errors = [];

        if (!body.name || body.name.trim().length === 0) {
            errors.push({field: 'name', message: 'Event name is required'});
        }

        if (!body.description || body.description.trim().length === 0) {
            errors.push({field: 'description', message: 'Event description is required'});
        }

        if (!body.category || body.category.trim().length === 0) {
            errors.push({field: 'category', message: 'Event category is required'});
        }

        if (!body.venueId || isNaN(Number(body.venueId))) {
            errors.push({field: 'venueId', message: 'Valid venue ID is required'});
        }

        if (!body.bookingStartDate || isNaN(Date.parse(body.bookingStartDate))) {
            errors.push({field: 'bookingStartDate', message: 'Valid booking start date is required'});
        }

        if (!body.bookingEndDate || isNaN(Date.parse(body.bookingEndDate))) {
            errors.push({field: 'bookingEndDate', message: 'Valid booking end date is required'});
        }

        if (body.bookingStartDate && body.bookingEndDate && new Date(body.bookingStartDate) >= new Date(body.bookingEndDate)) {
            errors.push({field: 'bookingDates', message: 'Booking start date must be before end date'});
        }

        return errors.length > 0 ? errors : null;
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const adminId = req.user!.userId;
        const {userId: _ignoredUserId, ...rest} = req.body as Partial<CreateEventRequest>;
        const eventPayload: CreateEventRequest = {
            ...rest,
            userId: adminId,
        } as CreateEventRequest;

        logger.info('Creating new event (admin)', {adminId, eventName: eventPayload.name});

        const event = await eventService.createEvent(eventPayload, adminId);

        res.status(201).json({
            success: true,
            data: event,
        });
    })
);

/**
 * GET /admin/events/:id - Get full details of any event, regardless of status
 */
router.get('/admin/events/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const {id} = req.params;

        logger.info('Fetching event by ID (admin)', {eventId: id});

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
router.patch('/admin/events/:id/approve',
    asyncHandler(async (req: Request, res: Response) => {
        const {id} = req.params;

        logger.info('Approving event', {eventId: id});

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
router.patch('/admin/events/:id/reject',
    validateRequest((body: RejectEventRequest) => {
        const errors = [];

        if (!body.rejectionReason || body.rejectionReason.trim().length === 0) {
            errors.push({field: 'rejectionReason', message: 'Rejection reason is required'});
        }

        if (body.rejectionReason && body.rejectionReason.trim().length < 10) {
            errors.push({field: 'rejectionReason', message: 'Rejection reason must be at least 10 characters long'});
        }

        return errors.length > 0 ? errors : null;
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const {id} = req.params;
        const {rejectionReason} = req.body;

        logger.info('Rejecting event', {eventId: id, rejectionReason});

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
router.patch('/admin/events/:id/cancel',
    asyncHandler(async (req: Request, res: Response) => {
        const {id} = req.params;

        logger.info('Cancelling event', {eventId: id});

        const event = await eventService.cancelEvent(id);

        res.json({
            success: true,
            data: event
        });
    })
);

/**
 * DELETE /admin/events/:id - Delete any event
 */
router.delete('/admin/events/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const {id} = req.params;
        const adminId = req.user!.userId;

        logger.info('Deleting event (admin)', {eventId: id, adminId});

        await eventService.deleteEvent(id, adminId, {isAdmin: true});

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    })
);

/**
 * POST /admin/events/:eventId/sessions - Create a new session for an event
 */
router.post('/admin/events/:eventId/sessions',
    validateRequest(validateCreateSessionRequest),
    asyncHandler(async (req: Request, res: Response) => {
        const {eventId} = req.params;
        const sessionData: CreateSessionRequest = req.body;

        logger.info('Creating session (admin)', {eventId, title: sessionData.title});

        const session = await sessionService.createSession(eventId, sessionData);

        res.status(201).json({
            success: true,
            data: session,
        });
    })
);

/**
 * GET /admin/events/:eventId/sessions - List sessions for an event
 */
router.get('/admin/events/:eventId/sessions',
    asyncHandler(async (req: Request, res: Response) => {
        const {eventId} = req.params;

        logger.info('Listing sessions (admin)', {eventId});

        const sessions = await sessionService.listSessions(eventId);

        res.json({
            success: true,
            data: sessions,
        });
    })
);

/**
 * PUT /admin/events/:eventId/sessions/:sessionId - Update a session
 */
router.put('/admin/events/:eventId/sessions/:sessionId',
    validateRequest(validateUpdateSessionRequest),
    asyncHandler(async (req: Request, res: Response) => {
        const {eventId, sessionId} = req.params;
        const updateData: UpdateSessionRequest = req.body;

        logger.info('Updating session (admin)', {eventId, sessionId});

        const session = await sessionService.updateSession(eventId, sessionId, updateData);

        res.json({
            success: true,
            data: session,
        });
    })
);

/**
 * DELETE /admin/events/:eventId/sessions/:sessionId - Delete a session
 */
router.delete('/admin/events/:eventId/sessions/:sessionId',
    asyncHandler(async (req: Request, res: Response) => {
        const {eventId, sessionId} = req.params;

        logger.info('Deleting session (admin)', {eventId, sessionId});

        await sessionService.deleteSession(eventId, sessionId);

        res.json({
            success: true,
            message: 'Session deleted successfully',
        });
    })
);

/**
 * POST /admin/events/:eventId/sessions/:sessionId/speakers - Assign a speaker to a session
 */
router.post('/admin/events/:eventId/sessions/:sessionId/speakers',
    validateRequest(validateAssignSpeakerRequest),
    asyncHandler(async (req: Request, res: Response) => {
        const {eventId, sessionId} = req.params;
        const assignData: SessionSpeakerAssignRequest = req.body;

        logger.info('Assigning speaker to session (admin)', {eventId, sessionId, speakerId: assignData.speakerId});

        const assignment = await sessionService.assignSpeaker(eventId, sessionId, assignData);

        res.status(201).json({
            success: true,
            data: assignment,
        });
    })
);

/**
 * PATCH /admin/events/:eventId/sessions/:sessionId/speakers/:speakerId - Update speaker assignment
 */
router.patch('/admin/events/:eventId/sessions/:sessionId/speakers/:speakerId',
    asyncHandler(async (req: Request, res: Response) => {
        const {eventId, sessionId, speakerId} = req.params;
        const updateData: SessionSpeakerUpdateRequest = req.body;

        logger.info('Updating session speaker assignment (admin)', {eventId, sessionId, speakerId});

        const assignment = await sessionService.updateSpeakerAssignment(eventId, sessionId, speakerId, updateData);

        res.json({
            success: true,
            data: assignment,
        });
    })
);

/**
 * DELETE /admin/events/:eventId/sessions/:sessionId/speakers/:speakerId - Remove speaker from session
 */
router.delete('/admin/events/:eventId/sessions/:sessionId/speakers/:speakerId',
    asyncHandler(async (req: Request, res: Response) => {
        const {eventId, sessionId, speakerId} = req.params;

        logger.info('Removing speaker from session (admin)', {eventId, sessionId, speakerId});

        await sessionService.removeSpeaker(eventId, sessionId, speakerId);

        res.json({
            success: true,
            message: 'Speaker removed from session',
        });
    })
);

/**
 * PUT /admin/events/:id - Update an event (admin can update any status)
 */
router.put('/admin/events/:id',
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
        const updateData = req.body;

        logger.info('Updating event (admin)', {eventId: id});

        const event = await eventService.updateEventAsAdmin(id, updateData);

        res.json({
            success: true,
            data: event
        });
    })
);

/**
 * POST /admin/venues - Create a new venue
 */
router.post('/admin/venues',
    validateRequest((body: CreateVenueRequest) => {
        const errors = [];

        if (!body.name || body.name.trim().length === 0) {
            errors.push({field: 'name', message: 'Venue name is required'});
        }

        if (!body.address || body.address.trim().length === 0) {
            errors.push({field: 'address', message: 'Venue address is required'});
        }

        if (!body.capacity || isNaN(Number(body.capacity)) || Number(body.capacity) <= 0) {
            errors.push({field: 'capacity', message: 'Valid capacity greater than 0 is required'});
        }

        if (!body.openingTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.openingTime)) {
            errors.push({field: 'openingTime', message: 'Opening time must be in HH:mm format (24-hour)'});
        }

        if (!body.closingTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.closingTime)) {
            errors.push({field: 'closingTime', message: 'Closing time must be in HH:mm format (24-hour)'});
        }

        return errors.length > 0 ? errors : null;
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const venueData: CreateVenueRequest = req.body;

        logger.info('Creating new venue', {venueName: venueData.name});

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
router.put('/admin/venues/:id',
    validateRequest((body: UpdateVenueRequest) => {
        const errors = [];

        if (body.name !== undefined && (!body.name || body.name.trim().length === 0)) {
            errors.push({field: 'name', message: 'Venue name cannot be empty'});
        }

        if (body.address !== undefined && (!body.address || body.address.trim().length === 0)) {
            errors.push({field: 'address', message: 'Venue address cannot be empty'});
        }

        if (body.capacity !== undefined && (isNaN(Number(body.capacity)) || Number(body.capacity) <= 0)) {
            errors.push({field: 'capacity', message: 'Valid capacity greater than 0 is required'});
        }

        if (body.openingTime !== undefined && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.openingTime)) {
            errors.push({field: 'openingTime', message: 'Opening time must be in HH:mm format (24-hour)'});
        }

        if (body.closingTime !== undefined && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.closingTime)) {
            errors.push({field: 'closingTime', message: 'Closing time must be in HH:mm format (24-hour)'});
        }

        return errors.length > 0 ? errors : null;
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const {id} = req.params;
        const updateData: UpdateVenueRequest = req.body;

        logger.info('Updating venue', {venueId: id});

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
router.delete('/admin/venues/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const {id} = req.params;

        logger.info('Deleting venue', {venueId: id});

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
router.get('/admin/venues',
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

        logger.info('Fetching venues (admin)', {filters});

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
router.get('/admin/venues/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const {id} = req.params;

        logger.info('Fetching venue by ID (admin)', {venueId: id});

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
 * GET /admin/stats - Get event statistics for admin dashboard
 */
router.get('/stats',
    asyncHandler(async (req: Request, res: Response) => {
        logger.info('Fetching event statistics (admin)');

        const {prisma} = await import('../database');
        const {EventStatus} = await import('../types');

        const [totalEvents, activeEvents] = await Promise.all([
            prisma.event.count(),
            prisma.event.count({
                where: {status: EventStatus.PUBLISHED}
            })
        ]);

        res.json({
            success: true,
            data: {
                totalEvents,
                activeEvents
            }
        });
    })
);

/**
 * GET /admin/reports/event-status - Get event status distribution
 */
router.get('/reports/event-status',
    asyncHandler(async (req: Request, res: Response) => {
        logger.info('Fetching event status distribution (admin)');

        const {prisma} = await import('../database');
        const {EventStatus} = await import('../types');

        const totalEvents = await prisma.event.count();

        const statusCounts = await Promise.all([
            prisma.event.count({where: {status: EventStatus.PUBLISHED}}),
            prisma.event.count({where: {status: EventStatus.DRAFT}}),
            prisma.event.count({where: {status: EventStatus.PENDING_APPROVAL}}),
            prisma.event.count({where: {status: EventStatus.REJECTED}}),
            prisma.event.count({where: {status: EventStatus.CANCELLED}}),
            prisma.event.count({where: {status: EventStatus.COMPLETED}})
        ]);

        const eventStats = [
            {
                status: 'Published',
                count: statusCounts[0],
                percentage: totalEvents > 0 ? (statusCounts[0] / totalEvents) * 100 : 0
            },
            {
                status: 'Draft',
                count: statusCounts[1],
                percentage: totalEvents > 0 ? (statusCounts[1] / totalEvents) * 100 : 0
            },
            {
                status: 'Pending Approval',
                count: statusCounts[2],
                percentage: totalEvents > 0 ? (statusCounts[2] / totalEvents) * 100 : 0
            },
            {
                status: 'Rejected',
                count: statusCounts[3],
                percentage: totalEvents > 0 ? (statusCounts[3] / totalEvents) * 100 : 0
            },
            {
                status: 'Cancelled',
                count: statusCounts[4],
                percentage: totalEvents > 0 ? (statusCounts[4] / totalEvents) * 100 : 0
            },
            {
                status: 'Completed',
                count: statusCounts[5],
                percentage: totalEvents > 0 ? (statusCounts[5] / totalEvents) * 100 : 0
            }
        ].filter(stat => stat.count > 0); // Only return statuses that have events

        res.json({
            success: true,
            data: eventStats
        });
    })
);

export default router;
