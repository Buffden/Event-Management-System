import { prisma } from '../database';
import { logger } from '../utils/logger';
import { getUserInfo } from '../utils/auth-helpers';
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
import axios from 'axios';

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
   * Get dashboard statistics for a user
   */
  async getDashboardStats(userId: string): Promise<{
    registeredEvents: number;
    upcomingEvents: number;
    attendedEvents: number;
    ticketsPurchased: number;
    activeTickets: number;
    usedTickets: number;
    upcomingThisWeek: number;
    nextWeekEvents: number;
  }> {
    try {
      logger.info('Fetching dashboard stats', { userId });
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      // Get all confirmed bookings for the user
      const allBookings = await prisma.booking.findMany({
        where: {
          userId: userId,
          status: BookingStatus.CONFIRMED
        },
        include: {
          event: true,
          tickets: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });

      // Count registered events (all confirmed bookings)
      const registeredEvents = allBookings.length;

      // Count upcoming events (events with bookingStartDate in the future)
      const upcomingEvents = allBookings.filter(booking => {
        const eventStart = new Date(booking.event.bookingStartDate);
        return eventStart > now;
      }).length;

      // Count attended events (bookings where isAttended is true)
      const attendedEvents = allBookings.filter(booking => booking.isAttended === true).length;

      // Count tickets
      let ticketsPurchased = 0;
      let activeTickets = 0;
      let usedTickets = 0;

      allBookings.forEach(booking => {
        ticketsPurchased += booking.tickets.length;
        booking.tickets.forEach(ticket => {
          if (ticket.status === 'ISSUED' || ticket.status === 'SCANNED') {
            activeTickets++;
          }
          if (ticket.status === 'SCANNED') {
            usedTickets++;
          }
        });
      });

      // Count upcoming events this week
      const upcomingThisWeek = allBookings.filter(booking => {
        const eventStart = new Date(booking.event.bookingStartDate);
        return eventStart > now && eventStart <= oneWeekFromNow;
      }).length;

      // Count events next week
      const nextWeekEvents = allBookings.filter(booking => {
        const eventStart = new Date(booking.event.bookingStartDate);
        return eventStart > oneWeekFromNow && eventStart <= twoWeeksFromNow;
      }).length;

      return {
        registeredEvents,
        upcomingEvents,
        attendedEvents,
        ticketsPurchased,
        activeTickets,
        usedTickets,
        upcomingThisWeek,
        nextWeekEvents
      };
    } catch (error) {
      logger.error('Failed to fetch dashboard stats', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get upcoming events for a user (with event details from event-service)
   */
  async getUpcomingEvents(userId: string, limit: number = 5): Promise<any[]> {
    try {
      logger.info('Fetching upcoming events', { userId, limit });
      const now = new Date();

      const bookings = await prisma.booking.findMany({
        where: {
          userId: userId,
          status: BookingStatus.CONFIRMED
        },
        include: {
          event: true,
          tickets: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          event: {
            bookingStartDate: 'asc'
          }
        }
      });

      // Filter to only upcoming events and limit results
      const upcomingBookings = bookings
        .filter(booking => {
          const eventStart = new Date(booking.event.bookingStartDate);
          return eventStart > now;
        })
        .slice(0, limit);

      // Fetch event details from event-service for each booking
      const eventServiceUrl = process.env.EVENT_SERVICE_URL || 'http://event-service:3000';

      const eventsWithDetails = await Promise.all(
        upcomingBookings.map(async (booking) => {
          try {
            const eventResponse = await axios.get(`${eventServiceUrl}/events/${booking.eventId}`, {
              timeout: 5000
            });
            const eventDetails = eventResponse.data.data || eventResponse.data;

            return {
              id: booking.eventId,
              title: eventDetails.name || 'Unknown Event',
              date: new Date(booking.event.bookingStartDate).toISOString().split('T')[0],
              time: new Date(booking.event.bookingStartDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              location: eventDetails.venue?.name || 'TBD',
              attendees: eventDetails.venue?.capacity || 0,
              status: 'registered',
              ticketType: booking.tickets.length > 0 ? 'Standard' : null,
              bookingId: booking.id
            };
          } catch (error) {
            logger.warn('Failed to fetch event details', { eventId: booking.eventId });
            return {
              id: booking.eventId,
              title: 'Event',
              date: new Date(booking.event.bookingStartDate).toISOString().split('T')[0],
              time: new Date(booking.event.bookingStartDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              location: 'TBD',
              attendees: 0,
              status: 'registered',
              ticketType: booking.tickets.length > 0 ? 'Standard' : null,
              bookingId: booking.id
            };
          }
        })
      );

      return eventsWithDetails;
    } catch (error) {
      logger.error('Failed to fetch upcoming events', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get recent registrations for a user
   */
  async getRecentRegistrations(userId: string, limit: number = 5): Promise<any[]> {
    try {
      logger.info('Fetching recent registrations', { userId, limit });

      const bookings = await prisma.booking.findMany({
        where: {
          userId: userId,
          status: BookingStatus.CONFIRMED
        },
        include: {
          event: true,
          tickets: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      // Fetch event details from event-service
      const eventServiceUrl = process.env.EVENT_SERVICE_URL || 'http://event-service:3000';

      const registrationsWithDetails = await Promise.all(
        bookings.map(async (booking) => {
          try {
            const eventResponse = await axios.get(`${eventServiceUrl}/events/${booking.eventId}`, {
              timeout: 5000
            });
            const eventDetails = eventResponse.data.data || eventResponse.data;

            return {
              id: booking.id,
              event: eventDetails.name || 'Unknown Event',
              date: booking.createdAt.toISOString().split('T')[0],
              status: 'confirmed',
              ticketType: booking.tickets.length > 0 ? 'Standard' : null,
              bookingId: booking.id
            };
          } catch (error) {
            logger.warn('Failed to fetch event details', { eventId: booking.eventId });
            return {
              id: booking.id,
              event: 'Event',
              date: booking.createdAt.toISOString().split('T')[0],
              status: 'confirmed',
              ticketType: booking.tickets.length > 0 ? 'Standard' : null,
              bookingId: booking.id
            };
          }
        })
      );

      return registrationsWithDetails;
    } catch (error) {
      logger.error('Failed to fetch recent registrations', error as Error, { userId });
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

      // Get all confirmed bookings
      const confirmedBookingsList = await prisma.booking.findMany({
        where: {
          eventId: eventId,
          status: BookingStatus.CONFIRMED
        }
      });

      // Get user info for all bookings to filter out admins
      const bookingsWithUserInfo = await Promise.all(
        confirmedBookingsList.map(async (booking) => {
          const userInfo = await getUserInfo(booking.userId);
          return {
            booking,
            userInfo
          };
        })
      );

      // Filter out admin users from attendance counts
      const nonAdminBookings = bookingsWithUserInfo.filter(
        ({ userInfo }) => userInfo && userInfo.role !== 'ADMIN'
      );

      // Count confirmed bookings (active users, excluding admins)
      const confirmedBookings = nonAdminBookings.length;

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
