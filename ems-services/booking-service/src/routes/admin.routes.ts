import { Router, Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { ticketService } from '../services/ticket.service';
import { logger } from '../utils/logger';
import { requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateQuery, validatePagination, validateBookingStatus, validateUUID } from '../middleware/validation.middleware';
import { BookingFilters, AuthRequest } from '../types';
import { BookingStatus, TicketStatus } from '../../generated/prisma';
import { prisma } from '../database';
import axios from 'axios';

const router = Router();

// Apply authentication and admin role to all routes
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

// ==================== TICKET MANAGEMENT ROUTES ====================

/**
 * Get attendance report for an event
 * AC7: Admin can view attendance reports for events
 */
router.get('/events/:eventId/attendance', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const attendance = await ticketService.getEventAttendance(eventId);

    return res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    logger.error('Get event attendance failed', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get all tickets for an event
 */
router.get('/events/:eventId/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { page = '1', limit = '10', status } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: {
      booking: {
        eventId: string;
      };
      status?: TicketStatus;
    } = {
      booking: {
        eventId: eventId
      }
    };

    if (status) {
      where.status = status as TicketStatus;
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          qrCode: true,
          booking: {
            include: {
              event: true
            }
          },
          attendanceRecords: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.ticket.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return res.json({
      success: true,
      data: {
        tickets: tickets.map(ticket => ({
          id: ticket.id,
          bookingId: ticket.bookingId,
          userId: ticket.booking.userId,
          status: ticket.status,
          issuedAt: ticket.issuedAt.toISOString(),
          expiresAt: ticket.expiresAt.toISOString(),
          scannedAt: ticket.scannedAt?.toISOString(),
          qrCode: ticket.qrCode ? {
            id: ticket.qrCode.id,
            data: ticket.qrCode.data,
            format: ticket.qrCode.format,
            scanCount: ticket.qrCode.scanCount
          } : null,
          attendanceRecords: ticket.attendanceRecords.map(record => ({
            id: record.id,
            scanTime: record.scanTime.toISOString(),
            scanLocation: record.scanLocation,
            scannedBy: record.scannedBy,
            scanMethod: record.scanMethod
          }))
        })),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Get event tickets failed', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get ticket statistics for an event
 */
router.get('/events/:eventId/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const [
      totalTickets,
      issuedTickets,
      scannedTickets,
      revokedTickets,
      expiredTickets
    ] = await Promise.all([
      prisma.ticket.count({
        where: {
          booking: {
            eventId: eventId
          }
        }
      }),
      prisma.ticket.count({
        where: {
          booking: {
            eventId: eventId
          },
          status: 'ISSUED'
        }
      }),
      prisma.ticket.count({
        where: {
          booking: {
            eventId: eventId
          },
          status: 'SCANNED'
        }
      }),
      prisma.ticket.count({
        where: {
          booking: {
            eventId: eventId
          },
          status: 'REVOKED'
        }
      }),
      prisma.ticket.count({
        where: {
          booking: {
            eventId: eventId
          },
          status: 'EXPIRED'
        }
      })
    ]);

    return res.json({
      success: true,
      data: {
        totalTickets,
        issuedTickets,
        scannedTickets,
        revokedTickets,
        expiredTickets,
        attendanceRate: totalTickets > 0 ? (scannedTickets / totalTickets) * 100 : 0
      }
    });
  } catch (error) {
    logger.error('Get ticket stats failed', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /admin/dashboard/stats - Get aggregated dashboard statistics for admin
 * NOTE: Must be before /:ticketId/revoke to avoid route conflicts
 */
router.get('/dashboard/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const gatewayUrl = process.env.GATEWAY_URL || 'http://ems-gateway';
    const authServiceUrl = `${gatewayUrl}/api/auth`;
    const eventServiceUrl = `${gatewayUrl}/api/event`;

    logger.info('Fetching admin dashboard stats', { 
      adminId: req.user?.userId,
      authServiceUrl,
      eventServiceUrl,
      hasAuthHeader: !!req.headers.authorization
    });

    // Fetch data from multiple services in parallel
    const [
      totalUsersResponse,
      eventStatsResponse,
      totalRegistrations
    ] = await Promise.all([
      // Get total users from auth-service
      axios.get(`${authServiceUrl}/internal/users/count`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service': 'booking-service'
        }
      }).catch((error: any) => {
        logger.error('Failed to fetch user count from auth-service', error as Error, { 
          message: error?.message || String(error),
          url: `${authServiceUrl}/internal/users/count`,
          status: error?.response?.status,
          data: error?.response?.data
        });
        return { data: { count: 0 } };
      }),

      // Get event stats from event-service
      axios.get(`${eventServiceUrl}/admin/admin/events`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        params: {
          page: 1,
          limit: 1 // We only need total count
        }
      }).catch((error: any) => {
        logger.error('Failed to fetch events from event-service', error as Error, { 
          message: error?.message || String(error),
          url: `${eventServiceUrl}/admin/admin/events`,
          status: error?.response?.status,
          data: error?.response?.data
        });
        return { data: { data: { total: 0, events: [] } } };
      }),

      // Get total registrations from booking-service (current DB)
      prisma.booking.count({
        where: {
          status: BookingStatus.CONFIRMED
        }
      })
    ]);

    // Log responses for debugging
    logger.info('Dashboard stats API responses received', {
      totalUsersResponse: {
        status: 'status' in totalUsersResponse ? totalUsersResponse.status : 'N/A',
        hasData: !!totalUsersResponse.data,
        data: totalUsersResponse.data,
        count: totalUsersResponse.data?.count
      },
      eventStatsResponse: {
        status: 'status' in eventStatsResponse ? eventStatsResponse.status : 'N/A',
        hasData: !!eventStatsResponse.data,
        hasDataData: !!eventStatsResponse.data?.data,
        fullResponse: JSON.stringify(eventStatsResponse.data).substring(0, 200),
        total: eventStatsResponse.data?.data?.total
      },
      totalRegistrations
    });

    // Parse responses - handle both successful responses and error fallbacks
    // axios.get returns { status, data, headers, ... } on success
    // Our catch returns { data: {...} } on error
    let totalUsers = 0;
    const usersData = totalUsersResponse.data;
    if (usersData && typeof usersData === 'object' && 'count' in usersData) {
      totalUsers = Number(usersData.count) || 0;
      logger.info('Parsed total users', { totalUsers, rawCount: usersData.count, isAxiosResponse: 'status' in totalUsersResponse });
    } else {
      logger.warn('Failed to parse total users', { usersData, hasData: !!usersData, responseType: 'status' in totalUsersResponse ? 'axios' : 'fallback' });
    }
    
    let totalEvents = 0;
    const eventsData = eventStatsResponse.data;
    if (eventsData?.data?.total !== undefined) {
      totalEvents = Number(eventsData.data.total) || 0;
      logger.info('Parsed total events', { totalEvents, rawTotal: eventsData.data.total, isAxiosResponse: 'status' in eventStatsResponse });
    } else {
      logger.warn('Failed to parse total events', { eventsData, hasDataData: !!eventsData?.data, responseType: 'status' in eventStatsResponse ? 'axios' : 'fallback' });
    }

    // Fetch published events separately to get accurate active/upcoming counts
    let actualActiveEvents = 0;
    let actualUpcomingEvents = 0;
    
    try {
      const publishedEventsResponse = await axios.get(`${eventServiceUrl}/admin/admin/events`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        params: {
          status: 'PUBLISHED',
          page: 1,
          limit: 100 // Max allowed limit for event-service
        }
      });

      logger.debug('Published events response', {
        status: publishedEventsResponse.status,
        data: publishedEventsResponse.data,
        eventsCount: publishedEventsResponse.data?.data?.events?.length
      });

      const publishedEvents = publishedEventsResponse.data?.data?.events || [];
      actualActiveEvents = publishedEvents.length;
      
      const now = new Date();
      actualUpcomingEvents = publishedEvents.filter((e: any) => {
        if (!e.bookingStartDate) return false;
        const bookingStart = new Date(e.bookingStartDate);
        return bookingStart > now;
      }).length;

      logger.info('Published events calculated', {
        actualActiveEvents,
        actualUpcomingEvents,
        totalPublished: publishedEvents.length,
        sampleEvent: publishedEvents[0] ? {
          id: publishedEvents[0].id,
          name: publishedEvents[0].name,
          status: publishedEvents[0].status,
          bookingStartDate: publishedEvents[0].bookingStartDate,
          isUpcoming: new Date(publishedEvents[0].bookingStartDate) > now
        } : null
      });
    } catch (error: any) {
      logger.error('Failed to fetch published events details', error as Error, { 
        message: error?.message || String(error),
        url: `${eventServiceUrl}/admin/admin/events`,
        status: error?.response?.status,
        data: error?.response?.data
      });
      // If fetch fails, we'll just use 0 for active/upcoming
    }

    const stats = {
      totalUsers,
      totalEvents,
      activeEvents: actualActiveEvents,
      totalRegistrations,
      upcomingEvents: actualUpcomingEvents
    };

    logger.info('Admin dashboard stats retrieved successfully', stats);

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get admin dashboard stats failed', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}));

/**
 * Revoke a ticket (Admin only)
 */
router.put('/:ticketId/revoke', async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        booking: {
          include: {
            event: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    if (ticket.status === 'REVOKED') {
      return res.status(400).json({
        success: false,
        error: 'Ticket is already revoked'
      });
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'REVOKED'
      }
    });

    logger.info('Ticket revoked by admin', { ticketId, adminId: req.user?.userId });

    return res.json({
      success: true,
      message: 'Ticket revoked successfully'
    });
  } catch (error) {
    logger.error('Revoke ticket failed', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
