import { prisma } from '../database';
import { logger } from '../utils/logger';
import {
  CreateBookingRequest,
  BookingResponse,
  BookingListResponse,
  BookingFilters,
  CapacityCheckResult,
  BookingError
} from '../types';
import { BookingStatus } from '../../generated/prisma';
import { eventPublisherService } from './event-publisher.service';
import { ticketService } from './ticket.service';

class BookingService {
  /**
   * Create a new booking for an event
   */
  async createBooking(data: CreateBookingRequest): Promise<BookingResponse> {
    try {
      logger.info('Creating new booking', { userId: data.userId, eventId: data.eventId });

      // Check if event exists and is active
      const event = await prisma.event.findUnique({
        where: { id: data.eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (!event.isActive) {
        throw new Error('Event is not active');
      }

      // Check if user already has a booking for this event
      const existingBooking = await prisma.booking.findUnique({
        where: {
          userId_eventId: {
            userId: data.userId,
            eventId: data.eventId
          }
        }
      });

      if (existingBooking) {
        throw new Error('User already has a booking for this event');
      }

      // Check capacity
      const capacityCheck = await this.checkEventCapacity(data.eventId);
      if (!capacityCheck.isAvailable) {
        throw new Error(`Event is fully booked. Capacity: ${capacityCheck.capacity}, Current bookings: ${capacityCheck.currentBookings}`);
      }

      // Create the booking
      const booking = await prisma.booking.create({
        data: {
          userId: data.userId,
          eventId: data.eventId,
          status: BookingStatus.CONFIRMED
        },
        include: {
          event: true
        }
      });

      logger.info('Booking created successfully', { bookingId: booking.id, userId: data.userId, eventId: data.eventId });

      // Publish booking confirmed event
      const bookingMessage = {
        bookingId: booking.id,
        userId: booking.userId,
        eventId: booking.eventId,
        createdAt: booking.createdAt.toISOString()
      };

      await eventPublisherService.publishBookingConfirmed(bookingMessage);

      // Booking confirmation email will be sent via notification-service pipeline triggered by booking.confirmed event

      // AC1: Automatically generate ticket when user registers for event
      try {
        await ticketService.generateTicket({
          bookingId: booking.id,
          userId: booking.userId,
          eventId: booking.eventId
        });
        logger.info('Ticket generated successfully for booking', { bookingId: booking.id });
      } catch (ticketError) {
        logger.error('Failed to generate ticket for booking', ticketError as Error, { bookingId: booking.id });
        // Don't fail the booking if ticket generation fails - ticket can be generated later
      }

      return this.mapBookingToResponse(booking);
    } catch (error) {
      logger.error('Failed to create booking', error as Error, { userId: data.userId, eventId: data.eventId });
      throw error;
    }
  }

  /**
   * Get bookings for a specific user
   */
  async getUserBookings(userId: string, filters: BookingFilters = {}): Promise<BookingListResponse> {
    try {
      logger.info('Fetching user bookings', { userId, filters });

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {
        userId: userId
      };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.eventId) {
        where.eventId = filters.eventId;
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: {
            event: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.booking.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        bookings: bookings.map(booking => this.mapBookingToResponse(booking)),
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error('Failed to fetch user bookings', error as Error, { userId, filters });
      throw error;
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, userId: string): Promise<BookingResponse> {
    try {
      logger.info('Cancelling booking', { bookingId, userId });

      // Find the booking
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { event: true }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check if user owns the booking
      if (booking.userId !== userId) {
        throw new Error('Access denied: You can only cancel your own bookings');
      }

      // Check if booking is already cancelled
      if (booking.status === BookingStatus.CANCELLED) {
        throw new Error('Booking is already cancelled');
      }

      // Update booking status
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED
        },
        include: {
          event: true
        }
      });

      logger.info('Booking cancelled successfully', { bookingId, userId });

      // Publish booking cancelled event
      await eventPublisherService.publishBookingCancelled({
        bookingId: updatedBooking.id,
        userId: updatedBooking.userId,
        eventId: updatedBooking.eventId,
        cancelledAt: updatedBooking.updatedAt.toISOString()
      });

      return this.mapBookingToResponse(updatedBooking);
    } catch (error) {
      logger.error('Failed to cancel booking', error as Error, { bookingId, userId });
      throw error;
    }
  }

  /**
   * Get all bookings for a specific event (admin only)
   */
  async getEventBookings(eventId: string, filters: BookingFilters = {}): Promise<BookingListResponse> {
    try {
      logger.info('Fetching event bookings', { eventId, filters });

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {
        eventId: eventId
      };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: {
            event: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.booking.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        bookings: bookings.map(booking => this.mapBookingToResponse(booking)),
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error('Failed to fetch event bookings', error as Error, { eventId, filters });
      throw error;
    }
  }

  /**
   * Check event capacity
   */
  async checkEventCapacity(eventId: string): Promise<CapacityCheckResult> {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      const currentBookings = await prisma.booking.count({
        where: {
          eventId: eventId,
          status: BookingStatus.CONFIRMED
        }
      });

      const remainingSlots = event.capacity - currentBookings;
      const isAvailable = remainingSlots > 0;

      return {
        isAvailable,
        currentBookings,
        capacity: event.capacity,
        remainingSlots: Math.max(0, remainingSlots)
      };
    } catch (error) {
      logger.error('Failed to check event capacity', error as Error, { eventId });
      throw error;
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string): Promise<BookingResponse | null> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          event: true
        }
      });

      if (!booking) {
        return null;
      }

      return this.mapBookingToResponse(booking);
    } catch (error) {
      logger.error('Failed to fetch booking by ID', error as Error, { bookingId });
      throw error;
    }
  }

  /**
   * Cancel all bookings for a cancelled event
   */
  async cancelAllEventBookings(eventId: string): Promise<number> {
    try {
      logger.info('Cancelling all bookings for event', { eventId });

      const result = await prisma.booking.updateMany({
        where: {
          eventId: eventId,
          status: BookingStatus.CONFIRMED
        },
        data: {
          status: BookingStatus.CANCELLED
        }
      });

      logger.info('Cancelled all bookings for event', { eventId, cancelledCount: result.count });

      return result.count;
    } catch (error) {
      logger.error('Failed to cancel all event bookings', error as Error, { eventId });
      throw error;
    }
  }

  /**
   * Get number of users (confirmed bookings) for an event
   */
  async getNumberOfUsersForEvent(eventId: string): Promise<{ totalUsers: number; confirmedBookings: number; cancelledBookings: number }> {
    try {
      logger.info('Getting number of users for event', { eventId });

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Count confirmed bookings (active users)
      const confirmedBookings = await prisma.booking.count({
        where: {
          eventId: eventId,
          status: BookingStatus.CONFIRMED
        }
      });

      // Count cancelled bookings
      const cancelledBookings = await prisma.booking.count({
        where: {
          eventId: eventId,
          status: BookingStatus.CANCELLED
        }
      });

      const totalUsers = confirmedBookings; // Only confirmed bookings count as active users

      logger.info('Retrieved user count for event', {
        eventId,
        totalUsers,
        confirmedBookings,
        cancelledBookings
      });

      return {
        totalUsers,
        confirmedBookings,
        cancelledBookings
      };
    } catch (error) {
      logger.error('Failed to get number of users for event', error as Error, { eventId });
      throw error;
    }
  }

  /**
   * Get total registrations (confirmed bookings) across all events
   */
  async getTotalRegistrations(): Promise<number> {
    try {
      logger.info('Getting total registrations across all events');

      const totalRegistrations = await prisma.booking.count({
        where: {
          status: BookingStatus.CONFIRMED
        }
      });

      logger.info('Retrieved total registrations', { totalRegistrations });

      return totalRegistrations;
    } catch (error) {
      logger.error('Failed to get total registrations', error as Error);
      throw error;
    }
  }

  /**
   * Get average attendance rate across all events
   */
  async getAverageAttendance(): Promise<number> {
    try {
      logger.info('Getting average attendance rate');

      // Get all confirmed bookings with their tickets
      const bookings = await prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED
        },
        include: {
          ticket: true
        }
      });

      if (bookings.length === 0) {
        return 0;
      }

      let totalTickets = 0;
      let scannedTickets = 0;

      for (const booking of bookings) {
        if (booking.ticket) {
          totalTickets += 1;
          if (booking.ticket.status === 'SCANNED') {
            scannedTickets += 1;
          }
        }
      }

      const averageAttendance = totalTickets > 0 ? (scannedTickets / totalTickets) * 100 : 0;

      logger.info('Retrieved average attendance', { averageAttendance, totalTickets, scannedTickets });
      return Math.round(averageAttendance * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      logger.error('Failed to get average attendance', error as Error);
      throw error;
    }
  }

  /**
   * Get top performing events by registration and attendance
   */
  async getTopEvents(limit: number = 10): Promise<Array<{
    eventId: string;
    name: string;
    registrations: number;
    attendance: number
  }>> {
    try {
      logger.info('Getting top performing events', { limit });

      // Get bookings grouped by event with ticket counts
      const eventStats = await prisma.booking.groupBy({
        by: ['eventId'],
        where: {
          status: BookingStatus.CONFIRMED
        },
        _count: {
          id: true
        }
      });

      // Fetch event details and calculate attendance
      const topEvents = await Promise.all(
        eventStats.map(async (stat) => {
          // Get bookings for this event to calculate attendance
          const bookings = await prisma.booking.findMany({
            where: {
              eventId: stat.eventId,
              status: BookingStatus.CONFIRMED
            },
            include: {
              ticket: true
            }
          });

          let totalTickets = 0;
          let scannedTickets = 0;

          for (const booking of bookings) {
            if (booking.ticket) {
              totalTickets += 1;
              if (booking.ticket.status === 'SCANNED') {
                scannedTickets += 1;
              }
            }
          }

          const attendance = totalTickets > 0 ? Math.round((scannedTickets / totalTickets) * 100 * 100) / 100 : 0;

          // Get event name from event service
          // For now, we'll return eventId and fetch name in the route handler
          return {
            eventId: stat.eventId,
            name: '', // Will be populated from event service
            registrations: stat._count.id,
            attendance
          };
        })
      );

      // Sort by registrations descending and limit
      const sorted = topEvents.sort((a, b) => b.registrations - a.registrations).slice(0, limit);

      logger.info('Retrieved top events', { count: sorted.length });
      return sorted;
    } catch (error) {
      logger.error('Failed to get top events', error as Error);
      throw error;
    }
  }

  /**
   * Map Prisma booking to response format
   */
  private mapBookingToResponse(booking: any): BookingResponse {
    return {
      id: booking.id,
      userId: booking.userId,
      eventId: booking.eventId,
      status: booking.status,
      event: {
        id: booking.event.id,
        capacity: booking.event.capacity,
        isActive: booking.event.isActive
      },
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString()
    };
  }
}

export { BookingService };
export const bookingService = new BookingService();
