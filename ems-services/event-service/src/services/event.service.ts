import {prisma} from '../database';
import {logger} from '../utils/logger';
import {
    CreateEventRequest,
    UpdateEventRequest,
    EventResponse,
    EventListResponse,
    EventFilters,
    EventPublishedMessage,
    EventUpdatedMessage,
    EventCancelledMessage,
    EventApprovedMessage
} from '../types';
import {EventStatus} from '../../generated/prisma';
import {eventPublisherService} from './event-publisher.service';
import {rabbitMQService} from './rabbitmq.service';
import axios from 'axios';

class EventService {
    private readonly authServiceUrl: string;

    constructor() {
        this.authServiceUrl = process.env.GATEWAY_URL ?
            `${process.env.GATEWAY_URL}/api/auth` :
            'http://ems-gateway/api/auth';
    }

    /**
     * Get speaker information from auth service
     */
    private async getSpeakerInfo(speakerId: string): Promise<{ name: string | null; email: string; role: string } | null> {
        try {
            logger.debug('Getting speaker information', { speakerId, authServiceUrl: this.authServiceUrl });

            const response = await axios.get(
                `${this.authServiceUrl}/internal/users/${speakerId}`,
                {
                    timeout: 5000,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-internal-service': 'event-service'
                    }
                }
            );

            if (response.status === 200 && response.data.user) {
                const user = response.data.user;
                logger.debug('Speaker information retrieved successfully', {
                    speakerId: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                });

                return {
                    name: user.name,
                    email: user.email,
                    role: user.role
                };
            }

            logger.warn('Speaker not found', { speakerId, status: response.status });
            return null;

        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    logger.warn('Auth service error when getting speaker', {
                        speakerId,
                        status: error.response.status,
                        message: error.response.data?.error || 'Unknown error'
                    });
                } else if (error.request) {
                    logger.error('Auth service unavailable when getting speaker', error as Error, {
                        speakerId,
                        url: this.authServiceUrl
                    });
                } else {
                    logger.error('Auth service request error when getting speaker', error as Error, { speakerId });
                }
            } else {
                logger.error('Unexpected error when getting speaker', error as Error, { speakerId });
            }

            return null;
        }
    }

    /**
     * Create a new event
     * - ADMIN creates events → Auto-published (PUBLISHED status)
     * - SPEAKER creates events → Needs approval (DRAFT status)
     */
    async createEvent(data: CreateEventRequest, speakerId: string): Promise<EventResponse> {
        try {
            logger.info('createEvent() - Creating new event', {speakerId, eventName: data.name});

            // Get creator information to determine if they're an admin
            const creatorInfo = await this.getSpeakerInfo(speakerId);
            const isAdmin = creatorInfo?.role === 'ADMIN';

            // Admin events are auto-published, speaker events start as DRAFT
            const initialStatus = isAdmin ? EventStatus.PUBLISHED : EventStatus.DRAFT;

            logger.info('createEvent() - Event will be created with status', {
                creatorRole: creatorInfo?.role,
                isAdmin,
                initialStatus
            });

            // Validate venue exists
            const venue = await prisma.venue.findUnique({
                where: {id: data.venueId}
            });

            if (!venue) {
                logger.error('createEvent() - venue not found');
                throw new Error('Venue not found');
            }

            // Validate booking dates
            const bookingStart = new Date(data.bookingStartDate);
            const bookingEnd = new Date(data.bookingEndDate);

            if (bookingStart >= bookingEnd) {
                logger.error('createEvent() - booking start date must be before end date');
                throw new Error('Booking start date must be before end date');
            }

            if (bookingStart < new Date()) {
                logger.error('createEvent() - booking start date cannot be in the past');
                throw new Error('Booking start date cannot be in the past');
            }

            // Check if venue is available for the booking period
            const overlappingEvents = await prisma.event.findMany({
                where: {
                    venueId: data.venueId,
                    status: {in: [EventStatus.PUBLISHED, EventStatus.PENDING_APPROVAL]},
                    OR: [
                        {
                            bookingStartDate: {
                                lt: bookingEnd
                            },
                            bookingEndDate: {
                                gt: bookingStart
                            }
                        }
                    ]
                }
            });

            if (overlappingEvents.length > 0) {
                logger.error('createEvent() - venue is not available for the selected booking period');
                throw new Error('Venue is not available for the selected booking period');
            }

            const event = await prisma.event.create({
                data: {
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    bannerImageUrl: data.bannerImageUrl,
                    speakerId,
                    venueId: data.venueId,
                    bookingStartDate: bookingStart,
                    bookingEndDate: bookingEnd,
                    status: initialStatus
                },
                include: {
                    venue: true
                }
            });

            logger.info('createEvent() - Event created successfully', {
                eventId: event.id,
                speakerId,
                status: event.status,
                autoPublished: isAdmin
            });

            // If admin created and auto-published, send event.published message
            if (isAdmin && event.status === EventStatus.PUBLISHED) {
                logger.info('createEvent() - Publishing event.published message for admin-created event', {eventId: event.id});
                await eventPublisherService.publishEventPublished({
                    eventId: event.id,
                    speakerId: event.speakerId,
                    name: event.name,
                    capacity: venue.capacity,
                    bookingStartDate: event.bookingStartDate.toISOString(),
                    bookingEndDate: event.bookingEndDate.toISOString()
                });
            }

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('createEvent() - Failed to create event', error as Error, {speakerId, eventData: data});
            throw error;
        }
    }

    /**
<<<<<<< HEAD
     * Update an event
     * - Speakers can only update their own events in DRAFT or REJECTED status
     * - Admins can update any event in any status
=======
     * Update an event (only if DRAFT or REJECTED) - Speaker only
>>>>>>> EMS-159-Implement-Speaker-Admin-Messaging-System
     */
    async updateEvent(eventId: string, data: UpdateEventRequest, speakerId: string, userRole?: string): Promise<EventResponse> {
        try {
            logger.info('updateEvent() - Updating event', {eventId, speakerId, userRole});

            // Get user information to determine if they're an admin
            const userInfo = await this.getSpeakerInfo(speakerId);
            const isAdmin = userInfo?.role === 'ADMIN' || userRole === 'ADMIN';

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!existingEvent) {
                logger.info("updateEvent() - Event not found", {eventId});
                throw new Error('Event not found');
            }

            // Check ownership - admins can update any event, speakers can only update their own
            if (!isAdmin && existingEvent.speakerId !== speakerId) {
                logger.info("updateEvent() - Unauthorized: You can only update your own events", {eventId, speakerId});
                throw new Error('Unauthorized: You can only update your own events');
            }

            // Status check - admins can update events in any status, speakers only DRAFT or REJECTED
            if (!isAdmin && existingEvent.status !== EventStatus.DRAFT && existingEvent.status !== EventStatus.REJECTED) {
                logger.info("updateEvent() - Event can only be updated when in DRAFT or REJECTED status", {eventId, status: existingEvent.status});
                throw new Error('Event can only be updated when in DRAFT or REJECTED status');
            }

            // Validate venue if provided
            if (data.venueId) {
                logger.info("updateEvent() - Validating provided venueId", {venueId: data.venueId});
                const venue = await prisma.venue.findUnique({
                    where: {id: data.venueId}
                });

                if (!venue) {
                    logger.info("updateEvent() - Venue not found", {venueId: data.venueId});
                    throw new Error('Venue not found');
                }
            }

            // Validate booking dates if provided
            if (data.bookingStartDate || data.bookingEndDate) {
                const bookingStart = data.bookingStartDate ? new Date(data.bookingStartDate) : existingEvent.bookingStartDate;
                const bookingEnd = data.bookingEndDate ? new Date(data.bookingEndDate) : existingEvent.bookingEndDate;
                logger.info("updateEvent() - Validating booking dates", {bookingStart, bookingEnd});

                if (bookingStart >= bookingEnd) {
                    logger.error("updateEvent() - booking start date must be before end date");
                    throw new Error('Booking start date must be before end date');
                }

                if (bookingStart < new Date()) {
                    logger.error("updateEvent() - booking start date cannot be in the past");
                    throw new Error('Booking start date cannot be in the past');
                }

                // Check if venue is available for the new booking period
                const venueIdToCheck = data.venueId || existingEvent.venueId;
                const overlappingEvents = await prisma.event.findMany({
                    where: {
                        id: {not: eventId},
                        venueId: venueIdToCheck,
                        status: {in: [EventStatus.PUBLISHED, EventStatus.PENDING_APPROVAL]},
                        OR: [
                            {
                                bookingStartDate: {
                                    lt: bookingEnd
                                },
                                bookingEndDate: {
                                    gt: bookingStart
                                }
                            }
                        ]
                    }
                });

                logger.info("updateEvent() - Found overlapping events", {count: overlappingEvents.length});

                if (overlappingEvents.length > 0) {
                    logger.error("updateEvent() - venue is not available for the selected booking period");
                    throw new Error('Venue is not available for the selected booking period');
                }
            }

            const updateData: any = {...data};
            if (data.bookingStartDate) updateData.bookingStartDate = new Date(data.bookingStartDate);
            if (data.bookingEndDate) updateData.bookingEndDate = new Date(data.bookingEndDate);

            const event = await prisma.event.update({
                where: {id: eventId},
                data: updateData,
                include: {venue: true}
            });

            logger.info('updateEvent() - Event updated successfully', {eventId, speakerId});

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('updateEvent() - Failed to update event', error as Error, {eventId, speakerId, updateData: data});
            throw error;
        }
    }

    /**
     * Update an event as admin (can update any status)
     */
    async updateEventAsAdmin(eventId: string, data: UpdateEventRequest): Promise<EventResponse> {
        try {
            logger.info('updateEventAsAdmin() - Admin updating event', {eventId});

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!existingEvent) {
                logger.info("updateEventAsAdmin() - Event not found", {eventId});
                throw new Error('Event not found');
            }

            // Validate venue if provided
            if (data.venueId) {
                logger.info("updateEventAsAdmin() - Validating provided venueId", {venueId: data.venueId});
                const venue = await prisma.venue.findUnique({
                    where: {id: data.venueId}
                });

                if (!venue) {
                    logger.info("updateEventAsAdmin() - Venue not found", {venueId: data.venueId});
                    throw new Error('Venue not found');
                }
            }

            // Validate booking dates if provided
            if (data.bookingStartDate || data.bookingEndDate) {
                const bookingStart = data.bookingStartDate ? new Date(data.bookingStartDate) : existingEvent.bookingStartDate;
                const bookingEnd = data.bookingEndDate ? new Date(data.bookingEndDate) : existingEvent.bookingEndDate;
                logger.info("updateEventAsAdmin() - Validating booking dates", {bookingStart, bookingEnd});

                if (bookingStart >= bookingEnd) {
                    logger.error("updateEventAsAdmin() - booking start date must be before end date");
                    throw new Error('Booking start date must be before end date');
                }

                // Check if venue is available for the new booking period (only for PUBLISHED events)
                if (existingEvent.status === EventStatus.PUBLISHED) {
                    const venueIdToCheck = data.venueId || existingEvent.venueId;
                    const overlappingEvents = await prisma.event.findMany({
                        where: {
                            id: {not: eventId},
                            venueId: venueIdToCheck,
                            status: {in: [EventStatus.PUBLISHED, EventStatus.PENDING_APPROVAL]},
                            OR: [
                                {
                                    bookingStartDate: {
                                        lt: bookingEnd
                                    },
                                    bookingEndDate: {
                                        gt: bookingStart
                                    }
                                }
                            ]
                        }
                    });

                    logger.info("updateEventAsAdmin() - Found overlapping events", {count: overlappingEvents.length});

                    if (overlappingEvents.length > 0) {
                        logger.error("updateEventAsAdmin() - venue is not available for the selected booking period");
                        throw new Error('Venue is not available for the selected booking period');
                    }
                }
            }

            const updateData: any = {...data};
            if (data.bookingStartDate) updateData.bookingStartDate = new Date(data.bookingStartDate);
            if (data.bookingEndDate) updateData.bookingEndDate = new Date(data.bookingEndDate);

            const event = await prisma.event.update({
                where: {id: eventId},
                data: updateData,
                include: {venue: true}
            });

            logger.info('updateEventAsAdmin() - Event updated successfully by admin', {eventId});

            // If event is PUBLISHED, publish event.updated message
            if (event.status === EventStatus.PUBLISHED) {
                try {
                    await eventPublisherService.publishEventUpdated({
                        eventId: event.id,
                        updatedFields: data
                    });
                    logger.info('updateEventAsAdmin() - Published event.updated message', {eventId});
                } catch (publishError) {
                    logger.error('updateEventAsAdmin() - Failed to publish event.updated message', publishError as Error, {eventId});
                    // Don't fail the update if publishing fails
                }
            }

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('updateEventAsAdmin() - Failed to update event', error as Error, {eventId, updateData: data});
            throw error;
        }
    }

    /**
     * Submit event for approval (DRAFT/REJECTED -> PENDING_APPROVAL)
     */
    async submitEvent(eventId: string, speakerId: string): Promise<EventResponse> {
        try {
            logger.info('submitEvent() - Submitting event for approval', {eventId, speakerId});

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!existingEvent) {
                logger.info("submitEvent() - Event not found", {eventId});
                throw new Error('Event not found');
            }

            if (existingEvent.speakerId !== speakerId) {
                logger.info("submitEvent() - Unauthorized: You can only submit your own events", {eventId, speakerId});
                throw new Error('Unauthorized: You can only submit your own events');
            }

            if (existingEvent.status !== EventStatus.DRAFT && existingEvent.status !== EventStatus.REJECTED) {
                logger.info("submitEvent() - Event can only be submitted when in DRAFT or REJECTED status", {eventId, status: existingEvent.status});
                throw new Error('Event can only be submitted when in DRAFT or REJECTED status');
            }

            const event = await prisma.event.update({
                where: {id: eventId},
                data: {
                    status: EventStatus.PENDING_APPROVAL,
                    rejectionReason: null // Clear any previous rejection reason
                },
                include: {venue: true}
            });

            logger.info('submitEvent() - Event submitted for approval', {eventId, speakerId});

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('submitEvent() - Failed to submit event', error as Error, {eventId, speakerId});
            throw error;
        }
    }

    /**
     * Approve/publish event (PENDING_APPROVAL or DRAFT -> PUBLISHED)
     * Admins can publish events directly from DRAFT status
     */
    async approveEvent(eventId: string): Promise<EventResponse> {
        try {
            logger.info('approveEvent() - Approving event', {eventId});

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!existingEvent) {
                logger.info("approveEvent() - Event not found", {eventId});
                throw new Error('Event not found');
            }

            // Allow approving events that are in PENDING_APPROVAL or DRAFT status
            if (existingEvent.status !== EventStatus.PENDING_APPROVAL && existingEvent.status !== EventStatus.DRAFT) {
                logger.info("approveEvent() - Event must be in PENDING_APPROVAL or DRAFT status to be approved/published", {eventId, status: existingEvent.status});
                throw new Error('Event must be in PENDING_APPROVAL or DRAFT status to be approved/published');
            }

            const event = await prisma.event.update({
                where: {id: eventId},
                data: {status: EventStatus.PUBLISHED},
                include: {venue: true}
            });

            logger.info("approveEvent() - Event status updated to PUBLISHED", {eventId});

            // Publish event.published message
            const publishedMessage: EventPublishedMessage = {
                eventId: event.id,
                speakerId: event.speakerId,
                name: event.name,
                capacity: event.venue.capacity,
                bookingStartDate: event.bookingStartDate.toISOString(),
                bookingEndDate: event.bookingEndDate.toISOString()
            };

            logger.info("approveEvent() - Published event", publishedMessage);

            await eventPublisherService.publishEventPublished(publishedMessage);

            // Get speaker information for approval notification
            const speakerInfo = await this.getSpeakerInfo(event.speakerId);

            if (speakerInfo) {
                // Send approval notification to speaker
                const approvalMessage: EventApprovedMessage = {
                    eventId: event.id,
                    speakerId: event.speakerId,
                    speakerName: speakerInfo.name || 'Speaker',
                    speakerEmail: speakerInfo.email,
                    eventName: event.name,
                    eventDescription: event.description,
                    venueName: event.venue.name,
                    bookingStartDate: event.bookingStartDate.toISOString(),
                    bookingEndDate: event.bookingEndDate.toISOString()
                };

                // Send approval notification using the new notification system
                const approvalNotification = {
                    type: 'EVENT_APPROVED_NOTIFICATION',
                    message: {
                        to: speakerInfo.email,
                        subject: '', // Will be generated by template service
                        body: '', // Will be generated by template service
                        speakerName: speakerInfo.name || 'Speaker',
                        eventName: event.name,
                        eventDescription: event.description,
                        venueName: event.venue.name,
                        bookingStartDate: event.bookingStartDate.toISOString(),
                        bookingEndDate: event.bookingEndDate.toISOString(),
                        eventId: event.id
                    }
                };

                await rabbitMQService.sendMessage('notification.email', approvalNotification);

                logger.info('approveEvent() - Approval notification sent to speaker', {
                    eventId,
                    speakerEmail: speakerInfo.email
                });
            } else {
                logger.warn('approveEvent() - Could not get speaker information for approval notification', {
                    eventId,
                    speakerId: event.speakerId
                });
            }

            logger.info('approveEvent() - Event approved and published', {eventId});

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('approveEvent() - Failed to approve event', error as Error, {eventId});
            throw error;
        }
    }

    /**
     * Reject event (PENDING_APPROVAL -> REJECTED)
     */
    async rejectEvent(eventId: string, rejectionReason: string): Promise<EventResponse> {
        try {
            logger.info('rejectEvent() - Rejecting event', {eventId, rejectionReason});

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!existingEvent) {
                logger.info("rejectEvent() - Rejecting event", {eventId, rejectionReason});
                throw new Error('Event not found');
            }

            if (existingEvent.status !== EventStatus.PENDING_APPROVAL) {
                logger.info("rejectEvent() - Event must be in PENDING_APPROVAL status to be rejected", {eventId, status: existingEvent.status});
                throw new Error('Event must be in PENDING_APPROVAL status to be rejected');
            }

            const event = await prisma.event.update({
                where: {id: eventId},
                data: {
                    status: EventStatus.REJECTED,
                    rejectionReason
                },
                include: {venue: true}
            });

            logger.info('rejectEvent() - Event rejected', {eventId, rejectionReason});

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('rejectEvent() - Failed to reject event', error as Error, {eventId, rejectionReason});
            throw error;
        }
    }

    /**
     * Cancel event (PUBLISHED -> CANCELLED)
     */
    async cancelEvent(eventId: string): Promise<EventResponse> {
        try {
            logger.info('cancelEvent() - Cancelling event', {eventId});

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!existingEvent) {
                logger.info("cancelEvent() - Event not found", {eventId});
                throw new Error('Event not found');
            }

            if (existingEvent.status !== EventStatus.PUBLISHED) {
                logger.info("cancelEvent() - Event must be in PUBLISHED status to be cancelled", {eventId, status: existingEvent.status});
                throw new Error('Event must be in PUBLISHED status to be cancelled');
            }

            const event = await prisma.event.update({
                where: {id: eventId},
                data: {status: EventStatus.CANCELLED},
                include: {venue: true}
            });

            logger.info("cancelEvent() - Event status updated to CANCELLED", {eventId});

            // Publish event.cancelled message
            const cancelledMessage: EventCancelledMessage = {
                eventId: event.id
            };

            logger.info("cancelEvent() - Publishing event cancelled message", cancelledMessage);

            await eventPublisherService.publishEventCancelled(cancelledMessage);

            logger.info('cancelEvent() - Event cancelled', {eventId});

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('cancelEvent() - Failed to cancel event', error as Error, {eventId});
            throw error;
        }
    }

    /**
     * Delete event (only if DRAFT)
     */
    async deleteEvent(eventId: string, speakerId: string): Promise<void> {
        try {
            logger.info('Deleting event', {eventId, speakerId});

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId}
            });

            if (!existingEvent) {
                throw new Error('Event not found');
            }

            if (existingEvent.speakerId !== speakerId) {
                throw new Error('Unauthorized: You can only delete your own events');
            }

            if (existingEvent.status !== EventStatus.DRAFT) {
                throw new Error('Event can only be deleted when in DRAFT status');
            }

            await prisma.event.delete({
                where: {id: eventId}
            });

            logger.info('Event deleted', {eventId, speakerId});
        } catch (error) {
            logger.error('Failed to delete event', error as Error, {eventId, speakerId});
            throw error;
        }
    }

    /**
     * Get event by ID
     */
    async getEventById(eventId: string, includePrivate = false): Promise<EventResponse | null> {
        logger.debug("getEventById() - Fetching event by ID", {eventId, includePrivate});
        try {
            const event = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!event) {
                return null;
            }

            // Only return PUBLISHED events for public access
            if (!includePrivate && event.status !== EventStatus.PUBLISHED) {
                return null;
            }

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('Failed to get event by ID', error as Error, {eventId});
            throw error;
        }
    }

    /**
     * Get events with filtering and pagination
     */
    async getEvents(filters: EventFilters, includePrivate = false): Promise<EventListResponse> {
        logger.info('getEvents() - Fetching events');
        try {
            const {
                status,
                category,
                venueId,
                speakerId,
                bookingStartDate,
                bookingEndDate,
                search,
                timeframe,
                page = 1,
                limit = 10
            } = filters;

            const skip = (page - 1) * limit;

            // Build where clause
            const where: any = {};

            // Only show PUBLISHED events for public access
            if (!includePrivate) {
                where.status = EventStatus.PUBLISHED;
            } else if (status) {
                where.status = status;
            }

            if (category) {
                where.category = category;
            }

            if (venueId) {
                where.venueId = venueId;
            }

            if (speakerId) {
                where.speakerId = speakerId;
            }

            if (bookingStartDate || bookingEndDate) {
                where.bookingStartDate = {};
                if (bookingStartDate) {
                    where.bookingStartDate.gte = new Date(bookingStartDate);
                }
                if (bookingEndDate) {
                    where.bookingStartDate.lte = new Date(bookingEndDate);
                }
            }

            // Search filter - search by name, description, or venue name
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { venue: { name: { contains: search, mode: 'insensitive' } } }
                ];
            }

            // Timeframe filter
            const now = new Date();
            if (timeframe && timeframe !== 'ALL') {
                if (timeframe === 'UPCOMING') {
                    where.bookingStartDate = {
                        ...where.bookingStartDate,
                        gt: now
                    };
                } else if (timeframe === 'ONGOING') {
                    where.bookingStartDate = {
                        ...where.bookingStartDate,
                        lte: now
                    };
                    where.bookingEndDate = {
                        gte: now
                    };
                } else if (timeframe === 'PAST') {
                    where.bookingEndDate = {
                        lt: now
                    };
                }
            }

            logger.info('getEvents() - Built query filters', {where, page, limit});

            const [events, total] = await Promise.all([
                prisma.event.findMany({
                    where,
                    include: {venue: true},
                    orderBy: {createdAt: 'desc'},
                    skip,
                    take: limit
                }),
                prisma.event.count({where})
            ]);

            logger.info('getEvents() - Built query filters', {fetched: events.length, total});

            const totalPages = Math.ceil(total / limit);

            return {
                events: events.map(event => this.mapEventToResponse(event)),
                total,
                page,
                limit,
                totalPages
            };
        } catch (error) {
            logger.error('getEvents() - Failed to get events', error as Error, {filters});
            throw error;
        }
    }

    /**
     * Get events by speaker
     */
    async getEventsBySpeaker(speakerId: string, filters: Omit<EventFilters, 'speakerId'> = {}): Promise<EventListResponse> {
        return this.getEvents({...filters, speakerId}, true);
    }

    /**
     * Map Prisma event to response format
     */
    private mapEventToResponse(event: any): EventResponse {
        return {
            id: event.id,
            name: event.name,
            description: event.description,
            category: event.category,
            bannerImageUrl: event.bannerImageUrl,
            status: event.status,
            rejectionReason: event.rejectionReason,
            speakerId: event.speakerId,
            venueId: event.venueId,
            venue: {
                id: event.venue.id,
                name: event.venue.name,
                address: event.venue.address,
                capacity: event.venue.capacity,
                openingTime: event.venue.openingTime,
                closingTime: event.venue.closingTime
            },
            bookingStartDate: event.bookingStartDate.toISOString(),
            bookingEndDate: event.bookingEndDate.toISOString(),
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString()
        };
    }
}

export { EventService };
export const eventService = new EventService();
