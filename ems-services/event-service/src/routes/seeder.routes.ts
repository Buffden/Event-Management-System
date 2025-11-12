import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { requireAdmin } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

/**
 * POST /admin/seed/create-event - Create event with custom createdAt date (seeding-specific)
 * This route accepts createdAt in the request body and creates the event with that date
 */
router.post('/admin/seed/create-event',
  asyncHandler(async (req: Request, res: Response) => {
    const { createdAt, ...eventData } = req.body;

    // Validate createdAt if provided
    let createdAtDate: Date | undefined;
    if (createdAt) {
      if (typeof createdAt !== 'string') {
        return res.status(400).json({ error: 'createdAt must be an ISO date string' });
      }
      createdAtDate = new Date(createdAt);
      if (isNaN(createdAtDate.getTime())) {
        return res.status(400).json({ error: 'createdAt must be a valid ISO date string' });
      }
    }

    logger.info('Creating event with custom date (seeding)', {
      eventName: eventData.name,
      createdAt: createdAtDate?.toISOString()
    });

    const { prisma } = await import('../database');
    const adminId = req.user!.userId;

    try {
      // Get creator information to determine if they're an admin
      const authServiceUrl = process.env.GATEWAY_URL
        ? `${process.env.GATEWAY_URL}/api/auth`
        : 'http://ems-gateway/api/auth';

      const axios = (await import('axios')).default;
      let creatorInfo: { role: string } | null = null;
      try {
        const userResponse = await axios.get(`${authServiceUrl}/internal/users/${adminId}`, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'x-internal-service': 'event-service'
          }
        });
        if (userResponse.status === 200 && userResponse.data.valid && userResponse.data.user) {
          creatorInfo = userResponse.data.user;
        }
      } catch (error) {
        logger.warn('Failed to fetch creator info, assuming admin', { adminId });
      }

      const isAdmin = creatorInfo?.role === 'ADMIN';
      const { EventStatus } = await import('../../generated/prisma');
      const initialStatus = isAdmin ? EventStatus.PUBLISHED : EventStatus.DRAFT;

      // Validate venue exists
      const venue = await prisma.venue.findUnique({
        where: { id: eventData.venueId }
      });

      if (!venue) {
        return res.status(400).json({ error: 'Venue not found' });
      }

      // Validate booking dates
      const bookingStart = new Date(eventData.bookingStartDate);
      const bookingEnd = new Date(eventData.bookingEndDate);

      if (bookingStart >= bookingEnd) {
        return res.status(400).json({ error: 'Booking start date must be before end date' });
      }

      // Check if venue is available for the booking period
      const overlappingEvents = await prisma.event.findMany({
        where: {
          venueId: eventData.venueId,
          status: { in: [EventStatus.PUBLISHED, EventStatus.PENDING_APPROVAL] },
          OR: [
            {
              bookingStartDate: { lt: bookingEnd },
              bookingEndDate: { gt: bookingStart }
            }
          ]
        }
      });

      if (overlappingEvents.length > 0) {
        return res.status(400).json({ error: 'Venue is not available for the selected booking period' });
      }

      // Create event with custom createdAt if provided
      const eventCreateData: any = {
        name: eventData.name,
        description: eventData.description,
        category: eventData.category,
        bannerImageUrl: eventData.bannerImageUrl,
        speakerId: adminId,
        venueId: eventData.venueId,
        bookingStartDate: bookingStart,
        bookingEndDate: bookingEnd,
        status: initialStatus
      };

      // Add createdAt if provided (override default)
      if (createdAtDate) {
        eventCreateData.createdAt = createdAtDate;
      }

      const event = await prisma.event.create({
        data: eventCreateData,
        include: {
          venue: true
        }
      });

      // If admin created and auto-published, send event.published message
      if (isAdmin && event.status === EventStatus.PUBLISHED) {
        try {
          const { eventPublisherService } = await import('../services/event-publisher.service');
          await eventPublisherService.publishEventPublished({
            eventId: event.id,
            speakerId: event.speakerId,
            name: event.name,
            capacity: venue.capacity,
            bookingStartDate: event.bookingStartDate.toISOString(),
            bookingEndDate: event.bookingEndDate.toISOString()
          });
        } catch (error) {
          logger.warn('Failed to publish event.published message', { eventId: event.id, error });
        }
      }

      // Map to response format (matching EventResponse type)
      const eventResponse = {
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
        updatedAt: event.updatedAt.toISOString(),
        sessions: []
      };

      logger.debug('Event created with custom date (seeding)', { eventId: event.id });

      res.status(201).json({
        success: true,
        data: eventResponse,
      });
    } catch (error: any) {
      logger.error('Error creating event with custom date (seeding)', error, { eventName: eventData.name });
      res.status(500).json({ error: error.message || 'Failed to create event' });
    }
  })
);

/**
 * POST /admin/seed/update-session-speaker-date - Update session speaker assignment createdAt date (seeding-specific)
 */
router.post('/admin/seed/update-session-speaker-date',
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId, speakerId, createdAt } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId is required and must be a string' });
    }
    if (!speakerId || typeof speakerId !== 'string') {
      return res.status(400).json({ error: 'speakerId is required and must be a string' });
    }
    if (!createdAt || typeof createdAt !== 'string') {
      return res.status(400).json({ error: 'createdAt is required and must be an ISO date string' });
    }

    const createdAtDate = new Date(createdAt);
    if (isNaN(createdAtDate.getTime())) {
      return res.status(400).json({ error: 'createdAt must be a valid ISO date string' });
    }

    logger.info('Updating session speaker assignment date (seeding)', {
      sessionId,
      speakerId,
      createdAt: createdAtDate.toISOString()
    });

    const { prisma } = await import('../database');

    try {
      const updateResult = await prisma.sessionSpeaker.updateMany({
        where: {
          sessionId,
          speakerId
        },
        data: { createdAt: createdAtDate }
      });

      if (updateResult.count > 0) {
        logger.debug('Session speaker date updated (seeding)', { sessionId, speakerId });
        res.json({
          success: true,
          message: `Session speaker assignment creation date updated successfully`
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Session speaker assignment not found`
        });
      }
    } catch (error: any) {
      logger.error('Error updating session speaker date (seeding)', error, { sessionId, speakerId });
      res.status(500).json({ error: 'Failed to update session speaker date' });
    }
  })
);

export default router;

