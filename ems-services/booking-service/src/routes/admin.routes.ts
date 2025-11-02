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
import { getUserInfo } from '../utils/auth-helpers';

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
/**
 * Get registration counts for multiple users (events attended)
 * POST /admin/users/registration-counts
 */
router.post('/users/registration-counts', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userIds must be a non-empty array'
      });
    }

    // Get registration counts for each user
    const registrationCounts = await Promise.all(
      userIds.map(async (userId: string) => {
        const count = await prisma.booking.count({
          where: {
            userId: userId,
            status: BookingStatus.CONFIRMED
          }
        });
        return { userId, count };
      })
    );

    // Convert to map for easy lookup
    const countsMap: Record<string, number> = {};
    registrationCounts.forEach(({ userId, count }) => {
      countsMap[userId] = count;
    });

    logger.info('User registration counts retrieved', { 
      adminId: req.user?.userId,
      count: userIds.length 
    });

    return res.json({
      success: true,
      data: countsMap
    });
  } catch (error) {
    logger.error('Get user registration counts failed', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}));

/**
 * GET /admin/reports/analytics - Get comprehensive reports and analytics data
 */
router.get('/reports/analytics', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const gatewayUrl = process.env.GATEWAY_URL || 'http://ems-gateway';
    const authServiceUrl = `${gatewayUrl}/api/auth`;
    const eventServiceUrl = `${gatewayUrl}/api/event`;

    logger.info('Fetching reports analytics', { 
      adminId: req.user?.userId,
      authServiceUrl,
      eventServiceUrl
    });

    // Fetch basic metrics in parallel (without bookings filtering first)
    const [
      totalUsersResponse,
      eventStatsResponse,
      totalRegistrationsResponse,
      allEventsResponse,
      allBookingsRaw
    ] = await Promise.all([
      // Total users
      axios.get(`${authServiceUrl}/internal/users/count`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service': 'booking-service'
        }
      }).catch(() => ({ data: { count: 0 } })),

      // Event stats (total count)
      axios.get(`${eventServiceUrl}/admin/admin/events`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        params: { page: 1, limit: 1 }
      }).catch(() => ({ data: { data: { total: 0, events: [] } } })),

      // Total registrations
      prisma.booking.count({
        where: { status: BookingStatus.CONFIRMED }
      }),

      // All events for top events and status distribution (max limit is 100)
      axios.get(`${eventServiceUrl}/admin/admin/events`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        params: { page: 1, limit: 100 }
      }).catch(() => ({ data: { data: { total: 0, events: [] } } })),

      // All bookings for attendance calculations
      prisma.booking.findMany({
        where: { status: BookingStatus.CONFIRMED },
        include: { event: true }
      })
    ]);

    const totalUsers = totalUsersResponse.data?.count || 0;
    const totalEvents = eventStatsResponse.data?.data?.total || 0;
    const totalRegistrations = totalRegistrationsResponse || 0;
    const allEvents = allEventsResponse.data?.data?.events || [];

    // Filter bookings to exclude admin users
    const bookingsWithUserInfo = await Promise.all(
      allBookingsRaw.map(async (booking) => {
        try {
          const userInfo = await getUserInfo(booking.userId);
          return { booking, userInfo };
        } catch {
          return { booking, userInfo: null };
        }
      })
    );
    const nonAdminBookings = bookingsWithUserInfo
      .filter(({ userInfo }) => userInfo && userInfo.role !== 'ADMIN')
      .map(({ booking }) => booking);

    // Calculate average attendance
    const eventsWithAttendance = await Promise.all(
      allEvents.map(async (event: any) => {
        const eventBookings = nonAdminBookings.filter(b => b.eventId === event.id);
        const attendedCount = eventBookings.filter(b => b.isAttended === true).length;
        const attendanceRate = eventBookings.length > 0 
          ? Math.round((attendedCount / eventBookings.length) * 100) 
          : 0;
        return {
          eventId: event.id,
          name: event.name,
          registrations: eventBookings.length,
          attendance: attendanceRate,
          attendedCount,
          hasRegistrations: eventBookings.length > 0
        };
      })
    );

    // Calculate average attendance only from events that have registrations
    const eventsWithRegistrations = eventsWithAttendance.filter(e => e.hasRegistrations);
    
    // Log for debugging
    logger.info('Average attendance calculation', {
      totalEvents: allEvents.length,
      eventsWithRegistrations: eventsWithRegistrations.length,
      totalBookings: nonAdminBookings.length,
      totalAttended: nonAdminBookings.filter(b => b.isAttended === true).length,
      sampleEvents: eventsWithRegistrations.slice(0, 3).map(e => ({
        name: e.name,
        registrations: e.registrations,
        attended: e.attendedCount,
        rate: e.attendance
      }))
    });

    const totalAttendanceSum = eventsWithRegistrations.reduce((sum, e) => sum + e.attendance, 0);
    const averageAttendance = eventsWithRegistrations.length > 0
      ? Math.round(totalAttendanceSum / eventsWithRegistrations.length)
      : 0;

    // Top performing events (by registrations, limit to top 10)
    const topEvents = eventsWithAttendance
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 10)
      .map(e => ({
        name: e.name,
        registrations: e.registrations,
        attendance: e.attendance
      }));

    // Event status distribution
    const statusCounts: Record<string, number> = {};
    allEvents.forEach((event: any) => {
      const status = event.status || 'DRAFT';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const eventStats = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' '),
      count,
      percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100 * 10) / 10 : 0
    }));

    // User growth by month
    const userGrowthResponse = await axios.get(`${authServiceUrl}/admin/users`, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      params: { limit: 10000 }
    }).catch(() => ({ data: { success: true, data: { users: [] } } }));

    const allUsers = userGrowthResponse.data?.data?.users || [];
    
    // Group users by month and calculate cumulative growth
    const monthlyUsers: Array<{ month: string; count: number; date: Date }> = [];
    allUsers.forEach((user: any) => {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        const existing = monthlyUsers.find(m => m.month === monthKey);
        if (existing) {
          existing.count += 1;
        } else {
          monthlyUsers.push({ month: monthKey, count: 1, date });
        }
      }
    });

    // Sort by date and calculate cumulative counts
    monthlyUsers.sort((a, b) => a.date.getTime() - b.date.getTime());
    let cumulative = 0;
    const userGrowth = monthlyUsers.map(({ month, count }) => {
      cumulative += count;
      return { month, users: cumulative };
    });

    logger.info('Reports analytics retrieved successfully', {
      totalEvents,
      totalUsers,
      totalRegistrations,
      averageAttendance,
      topEventsCount: topEvents.length,
      eventStatsCount: eventStats.length,
      userGrowthMonths: userGrowth.length
    });

    return res.json({
      success: true,
      data: {
        totalEvents,
        totalUsers,
        totalRegistrations,
        averageAttendance,
        topEvents,
        eventStats,
        userGrowth
      }
    });
  } catch (error) {
    logger.error('Get reports analytics failed', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}));

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
