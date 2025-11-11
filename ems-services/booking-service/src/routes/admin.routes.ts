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

/**
 * GET /admin/stats - Get booking statistics for admin dashboard
 */
router.get('/stats',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    logger.info('Fetching booking statistics (admin)', { adminId: req.user?.userId });

    const totalRegistrations = await prisma.booking.count({
      where: { status: 'CONFIRMED' }
    });

    res.json({
      success: true,
      data: {
        totalRegistrations
      }
    });
  })
);

/**
 * GET /admin/attendance-stats - Get overall attendance statistics across all events
 * Only counts attendees (USER role), excludes admins and speakers
 */
router.get('/attendance-stats',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    logger.info('Fetching attendance statistics (admin)', { adminId: req.user?.userId });

    // Get all confirmed bookings
    const bookings = await prisma.booking.findMany({
      where: { status: 'CONFIRMED' },
      select: {
        id: true,
        userId: true,
        isAttended: true
      }
    });

    // Get user info for all bookings to filter out admins and speakers
    const { getUserInfo } = await import('../utils/auth-helpers');
    const bookingsWithUserInfo = await Promise.all(
      bookings.map(async (booking) => {
        const userInfo = await getUserInfo(booking.userId);
        return {
          booking,
          userInfo
        };
      })
    );

    // Filter to only include attendees (USER role), exclude ADMIN and SPEAKER
    const attendeeBookings = bookingsWithUserInfo.filter(
      ({ userInfo }) => userInfo && userInfo.role === 'USER'
    );

    const totalRegistrations = attendeeBookings.length;
    const totalAttended = attendeeBookings.filter(({ booking }) => booking.isAttended === true).length;
    const attendancePercentage = totalRegistrations > 0
      ? Number(((totalAttended / totalRegistrations) * 100).toFixed(2)) // Round to 2 decimal places
      : 0;

    logger.info('Attendance statistics calculated', {
      totalBookings: bookings.length,
      attendeeRegistrations: totalRegistrations,
      attendeeAttended: totalAttended,
      attendancePercentage
    });

    res.json({
      success: true,
      data: {
        totalRegistrations,
        totalAttended,
        attendancePercentage
      }
    });
  })
);

/**
 * GET /admin/users/event-counts - Get event registration counts per user
 */
router.get('/users/event-counts',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    logger.info('Fetching user event counts (admin)', { adminId: req.user?.userId });

    // Get all confirmed bookings grouped by userId
    const bookings = await prisma.booking.findMany({
      where: { status: 'CONFIRMED' },
      select: { userId: true }
    });

    // Count events per user
    const eventCounts: Record<string, number> = {};
    bookings.forEach(booking => {
      eventCounts[booking.userId] = (eventCounts[booking.userId] || 0) + 1;
    });

    res.json({
      success: true,
      data: eventCounts
    });
  })
);

/**
 * GET /admin/reports/top-events - Get top performing events with registrations and attendance
 * Only counts attendees (USER role), excludes admins and speakers
 */
router.get('/reports/top-events',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    logger.info('Fetching top performing events (admin)', { adminId: req.user?.userId });

    const { getUserInfo } = await import('../utils/auth-helpers');

    // Get all confirmed bookings with event info
    const bookings = await prisma.booking.findMany({
      where: { status: 'CONFIRMED' },
      select: {
        eventId: true,
        userId: true,
        isAttended: true
      }
    });

    // Get user info for all bookings to filter out admins and speakers
    const bookingsWithUserInfo = await Promise.all(
      bookings.map(async (booking) => {
        const userInfo = await getUserInfo(booking.userId);
        return {
          booking,
          userInfo
        };
      })
    );

    // Filter to only include attendees (USER role)
    const attendeeBookings = bookingsWithUserInfo.filter(
      ({ userInfo }) => userInfo && userInfo.role === 'USER'
    );

    // Group by eventId and calculate stats
    const eventStats: Record<string, {
      eventId: string;
      registrations: number;
      attended: number;
      attendancePercentage: number;
    }> = {};

    attendeeBookings.forEach(({ booking }) => {
      if (!eventStats[booking.eventId]) {
        eventStats[booking.eventId] = {
          eventId: booking.eventId,
          registrations: 0,
          attended: 0,
          attendancePercentage: 0
        };
      }
      eventStats[booking.eventId].registrations++;
      if (booking.isAttended) {
        eventStats[booking.eventId].attended++;
      }
    });

    // Calculate attendance percentage for each event
    Object.values(eventStats).forEach(stat => {
      stat.attendancePercentage = stat.registrations > 0
        ? Math.round((stat.attended / stat.registrations) * 100)
        : 0;
    });

    // Get event names from event service (we'll need to call it or store event names)
    // For now, we'll return event IDs and let frontend fetch names if needed
    // Sort by registrations descending and take top 10
    const topEvents = Object.values(eventStats)
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 10);

    res.json({
      success: true,
      data: topEvents
    });
  })
);

export default router;
