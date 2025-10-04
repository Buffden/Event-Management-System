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
    EventCancelledMessage
} from '../types';
import {EventStatus} from '../../generated/prisma';
import {eventPublisherService} from './event-publisher.service';

class EventService {
    /**
     * Create a new event (DRAFT status)
     */
    async createEvent(data: CreateEventRequest, speakerId: string): Promise<EventResponse> {
        try {
            logger.info('Creating new event', {speakerId, eventName: data.name});

            // Validate venue exists
            const venue = await prisma.venue.findUnique({
                where: {id: data.venueId}
            });

            if (!venue) {
                throw new Error('Venue not found');
            }

            // Validate booking dates
            const bookingStart = new Date(data.bookingStartDate);
            const bookingEnd = new Date(data.bookingEndDate);

            if (bookingStart >= bookingEnd) {
                throw new Error('Booking start date must be before end date');
            }

            if (bookingStart < new Date()) {
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
                    status: EventStatus.DRAFT
                },
                include: {
                    venue: true
                }
            });

            logger.info('Event created successfully', {eventId: event.id, speakerId});

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('Failed to create event', error as Error, {speakerId, eventData: data});
            throw error;
        }
    }

    /**
     * Update an event (only if DRAFT or REJECTED)
     */
    async updateEvent(eventId: string, data: UpdateEventRequest, speakerId: string): Promise<EventResponse> {
        try {
            logger.info('Updating event', {eventId, speakerId});

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!existingEvent) {
                throw new Error('Event not found');
            }

            if (existingEvent.speakerId !== speakerId) {
                throw new Error('Unauthorized: You can only update your own events');
            }

            if (existingEvent.status !== EventStatus.DRAFT && existingEvent.status !== EventStatus.REJECTED) {
                throw new Error('Event can only be updated when in DRAFT or REJECTED status');
            }

            // Validate venue if provided
            if (data.venueId) {
                const venue = await prisma.venue.findUnique({
                    where: {id: data.venueId}
                });

                if (!venue) {
                    throw new Error('Venue not found');
                }
            }

            // Validate booking dates if provided
            if (data.bookingStartDate || data.bookingEndDate) {
                const bookingStart = data.bookingStartDate ? new Date(data.bookingStartDate) : existingEvent.bookingStartDate;
                const bookingEnd = data.bookingEndDate ? new Date(data.bookingEndDate) : existingEvent.bookingEndDate;

                if (bookingStart >= bookingEnd) {
                    throw new Error('Booking start date must be before end date');
                }

                if (bookingStart < new Date()) {
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

                if (overlappingEvents.length > 0) {
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

            logger.info('Event updated successfully', {eventId, speakerId});

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('Failed to update event', error as Error, {eventId, speakerId, updateData: data});
            throw error;
        }
    }

    /**
     * Submit event for approval (DRAFT/REJECTED -> PENDING_APPROVAL)
     */
    async submitEvent(eventId: string, speakerId: string): Promise<EventResponse> {
        try {
            logger.info('Submitting event for approval', {eventId, speakerId});

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!existingEvent) {
                throw new Error('Event not found');
            }

            if (existingEvent.speakerId !== speakerId) {
                throw new Error('Unauthorized: You can only submit your own events');
            }

            if (existingEvent.status !== EventStatus.DRAFT && existingEvent.status !== EventStatus.REJECTED) {
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

            logger.info('Event submitted for approval', {eventId, speakerId});

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('Failed to submit event', error as Error, {eventId, speakerId});
            throw error;
        }
    }

    /**
     * Approve event (PENDING_APPROVAL -> PUBLISHED)
     */
    async approveEvent(eventId: string): Promise<EventResponse> {
        try {
            logger.info('Approving event', {eventId});

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!existingEvent) {
                throw new Error('Event not found');
            }

            if (existingEvent.status !== EventStatus.PENDING_APPROVAL) {
                throw new Error('Event must be in PENDING_APPROVAL status to be approved');
            }

            const event = await prisma.event.update({
                where: {id: eventId},
                data: {status: EventStatus.PUBLISHED},
                include: {venue: true}
            });

            // Publish event.published message
            const publishedMessage: EventPublishedMessage = {
                eventId: event.id,
                speakerId: event.speakerId,
                name: event.name,
                capacity: event.venue.capacity,
                bookingStartDate: event.bookingStartDate.toISOString(),
                bookingEndDate: event.bookingEndDate.toISOString()
            };

            await eventPublisherService.publishEventPublished(publishedMessage);

            logger.info('Event approved and published', {eventId});

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('Failed to approve event', error as Error, {eventId});
            throw error;
        }
    }

    /**
     * Reject event (PENDING_APPROVAL -> REJECTED)
     */
    async rejectEvent(eventId: string, rejectionReason: string): Promise<EventResponse> {
        try {
            logger.info('Rejecting event', {eventId, rejectionReason});

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!existingEvent) {
                throw new Error('Event not found');
            }

            if (existingEvent.status !== EventStatus.PENDING_APPROVAL) {
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

            logger.info('Event rejected', {eventId, rejectionReason});

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('Failed to reject event', error as Error, {eventId, rejectionReason});
            throw error;
        }
    }

    /**
     * Cancel event (PUBLISHED -> CANCELLED)
     */
    async cancelEvent(eventId: string): Promise<EventResponse> {
        try {
            logger.info('Cancelling event', {eventId});

            const existingEvent = await prisma.event.findUnique({
                where: {id: eventId},
                include: {venue: true}
            });

            if (!existingEvent) {
                throw new Error('Event not found');
            }

            if (existingEvent.status !== EventStatus.PUBLISHED) {
                throw new Error('Event must be in PUBLISHED status to be cancelled');
            }

            const event = await prisma.event.update({
                where: {id: eventId},
                data: {status: EventStatus.CANCELLED},
                include: {venue: true}
            });

            // Publish event.cancelled message
            const cancelledMessage: EventCancelledMessage = {
                eventId: event.id
            };

            await eventPublisherService.publishEventCancelled(cancelledMessage);

            logger.info('Event cancelled', {eventId});

            return this.mapEventToResponse(event);
        } catch (error) {
            logger.error('Failed to cancel event', error as Error, {eventId});
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
        try {
            const {
                status,
                category,
                venueId,
                speakerId,
                bookingStartDate,
                bookingEndDate,
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

            const totalPages = Math.ceil(total / limit);

            return {
                events: events.map(event => this.mapEventToResponse(event)),
                total,
                page,
                limit,
                totalPages
            };
        } catch (error) {
            logger.error('Failed to get events', error as Error, {filters});
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

export const eventService = new EventService();
