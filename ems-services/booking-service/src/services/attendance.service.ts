import { prisma } from '../database';
import { logger } from '../utils/logger';
import axios from 'axios';
import { EventDetails } from '../types/ticket.types';

export interface JoinEventRequest {
  userId: string;
  eventId: string;
}

export interface JoinEventResponse {
  success: boolean;
  message: string;
  joinedAt?: string;
  isFirstJoin: boolean;
}

export interface LiveAttendanceResponse {
  eventId: string;
  totalRegistered: number;
  totalAttended: number;
  attendancePercentage: number;
  attendees: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    joinedAt: string;
    isAttended: boolean;
  }>;
}

export class AttendanceService {
  private readonly eventServiceUrl: string;

  constructor() {
    this.eventServiceUrl = process.env.GATEWAY_URL ? 
      `${process.env.GATEWAY_URL}/api/event` : 'http://ems-gateway/api/event';
  }

  /**
   * Get event details from event service
   */
  private async getEventDetails(eventId: string): Promise<EventDetails | null> {
    try {
      const response = await axios.get(`${this.eventServiceUrl}/events/${eventId}`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      logger.warn('Failed to get event details from event service', { eventId, error: (error as Error).message });
      return null;
    }
  }
  /**
   * Join an event - marks user as attended
   */
  async joinEvent(data: JoinEventRequest): Promise<JoinEventResponse> {
    try {
      logger.info('Processing event join request', { 
        userId: data.userId, 
        eventId: data.eventId 
      });

      // Find the booking for this user and event
      const booking = await prisma.booking.findFirst({
        where: {
          userId: data.userId,
          eventId: data.eventId,
          status: 'CONFIRMED'
        },
        include: {
          event: true
        }
      });

      if (!booking) {
        return {
          success: false,
          message: 'No valid booking found for this event',
          isFirstJoin: false
        };
      }

      // Check if event has started by fetching event details from event service
      const now = new Date();
      let eventStartTime: Date;
      
      try {
        const eventDetails = await this.getEventDetails(data.eventId);
        if (!eventDetails || !eventDetails.bookingStartDate) {
          return {
            success: false,
            message: 'Event details not available',
            isFirstJoin: false
          };
        }
        eventStartTime = new Date(eventDetails.bookingStartDate);
        
        if (now < eventStartTime) {
          return {
            success: false,
            message: 'Event has not started yet',
            isFirstJoin: false
          };
        }
      } catch (error) {
        logger.error('Error fetching event details', error as Error, { eventId: data.eventId });
        return {
          success: false,
          message: 'Unable to verify event timing',
          isFirstJoin: false
        };
      }

      // Check if this is the first time joining
      const isFirstJoin = !booking.isAttended;

      // Update booking with join information
      const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          joinedAt: now,
          isAttended: true
        }
      });

      logger.info('User successfully joined event', { 
        bookingId: booking.id,
        userId: data.userId,
        eventId: data.eventId,
        isFirstJoin
      });

      return {
        success: true,
        message: isFirstJoin ? 'Successfully joined the event!' : 'Rejoined the event',
        joinedAt: updatedBooking.joinedAt?.toISOString(),
        isFirstJoin
      };

    } catch (error) {
      logger.error('Error joining event', error as Error, { 
        userId: data.userId, 
        eventId: data.eventId 
      });
      throw error;
    }
  }

  /**
   * Join an event as admin (no booking required)
   */
  async adminJoinEvent(data: JoinEventRequest): Promise<JoinEventResponse> {
    try {
      logger.info('Processing admin event join request', { 
        userId: data.userId, 
        eventId: data.eventId 
      });

      // Check if event has started by fetching event details from event service
      const now = new Date();
      let eventStartTime: Date;
      
      try {
        const eventDetails = await this.getEventDetails(data.eventId);
        if (!eventDetails || !eventDetails.bookingStartDate) {
          return {
            success: false,
            message: 'Event details not available',
            isFirstJoin: false
          };
        }
        eventStartTime = new Date(eventDetails.bookingStartDate);
        
        if (now < eventStartTime) {
          return {
            success: false,
            message: 'Event has not started yet',
            isFirstJoin: false
          };
        }
      } catch (error) {
        logger.error('Failed to fetch event details', error as Error);
        return {
          success: false,
          message: 'Unable to verify event timing',
          isFirstJoin: false
        };
      }

      // For admins, we don't need a booking - just track their attendance
      // Check if admin has already joined this event
      const existingAttendance = await prisma.booking.findFirst({
        where: {
          userId: data.userId,
          eventId: data.eventId,
          isAttended: true
        }
      });

      const isFirstJoin = !existingAttendance;

      if (isFirstJoin) {
        // Create a special admin attendance record
        await prisma.booking.create({
          data: {
            userId: data.userId,
            eventId: data.eventId,
            status: 'CONFIRMED', // Admin status
            joinedAt: now,
            isAttended: true
          }
        });

        logger.info('Admin successfully joined event', { 
          userId: data.userId, 
          eventId: data.eventId,
          isFirstJoin: true
        });

        return {
          success: true,
          message: 'Successfully joined event as admin!',
          joinedAt: now.toISOString(),
          isFirstJoin: true
        };
      } else {
        // Admin has already joined
        logger.info('Admin already joined event', { 
          userId: data.userId, 
          eventId: data.eventId,
          isFirstJoin: false
        });

        return {
          success: true,
          message: 'Already joined this event as admin',
          joinedAt: existingAttendance.joinedAt?.toISOString(),
          isFirstJoin: false
        };
      }
    } catch (error) {
      logger.error('Error in admin join event', error as Error);
      return {
        success: false,
        message: 'Failed to join event',
        isFirstJoin: false
      };
    }
  }

  /**
   * Get live attendance data for an event
   */
  async getLiveAttendance(eventId: string): Promise<LiveAttendanceResponse> {
    try {
      logger.info('Fetching live attendance data', { eventId });

      // Get all bookings for this event
      const bookings = await prisma.booking.findMany({
        where: {
          eventId: eventId,
          status: 'CONFIRMED'
        },
        include: {
          event: true
        }
      });

      const totalRegistered = bookings.length;
      const totalAttended = bookings.filter(booking => booking.isAttended).length;
      const attendancePercentage = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

      // Get attendee details (we'll need to fetch user info from auth service)
      const attendees = bookings
        .filter(booking => booking.isAttended)
        .map(booking => ({
          userId: booking.userId,
          userName: 'User', // Will be populated from auth service
          userEmail: 'user@example.com', // Will be populated from auth service
          joinedAt: booking.joinedAt?.toISOString() || '',
          isAttended: booking.isAttended
        }));

      logger.info('Live attendance data retrieved', { 
        eventId,
        totalRegistered,
        totalAttended,
        attendancePercentage
      });

      return {
        eventId,
        totalRegistered,
        totalAttended,
        attendancePercentage,
        attendees
      };

    } catch (error) {
      logger.error('Error fetching live attendance', error as Error, { eventId });
      throw error;
    }
  }

  /**
   * Get attendance summary for reporting
   */
  async getAttendanceSummary(eventId: string): Promise<{
    eventId: string;
    totalRegistered: number;
    totalAttended: number;
    attendancePercentage: number;
    joinTimes: Array<{ time: string; count: number }>;
  }> {
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          eventId: eventId,
          status: 'CONFIRMED'
        }
      });

      const totalRegistered = bookings.length;
      const totalAttended = bookings.filter(booking => booking.isAttended).length;
      const attendancePercentage = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

      // Group join times by hour for reporting
      const joinTimes = bookings
        .filter(booking => booking.joinedAt)
        .reduce((acc, booking) => {
          const hour = new Date(booking.joinedAt!).getHours();
          const key = `${hour}:00`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const joinTimesArray = Object.entries(joinTimes).map(([time, count]) => ({
        time,
        count
      }));

      return {
        eventId,
        totalRegistered,
        totalAttended,
        attendancePercentage,
        joinTimes: joinTimesArray
      };

    } catch (error) {
      logger.error('Error fetching attendance summary', error as Error, { eventId });
      throw error;
    }
  }
}

export const attendanceService = new AttendanceService();
