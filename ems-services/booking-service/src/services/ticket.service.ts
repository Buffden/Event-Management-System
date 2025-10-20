import { prisma } from '../database';
import { logger } from '../utils/logger';
import { TicketStatus } from '../../generated/prisma';
import { eventPublisherService } from './event-publisher.service';
import { TicketGenerationRequest, TicketResponse } from '../types/ticket.types';
import axios from 'axios';

class TicketService {
  private readonly eventServiceUrl: string;

  constructor() {
    this.eventServiceUrl = process.env.GATEWAY_URL ? 
      `${process.env.GATEWAY_URL}/api/event` : 'http://ems-gateway/api/event';
  }

  /**
   * Get event details from event service
   */
  private async getEventDetails(eventId: string): Promise<any | null> {
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
   * Generate a ticket for a confirmed booking
   * AC1: When a user registers for an event, a digital ticket is automatically generated
   */
  async generateTicket(request: TicketGenerationRequest): Promise<TicketResponse> {
    try {
      logger.info('Generating ticket for booking', { 
        bookingId: request.bookingId, 
        userId: request.userId, 
        eventId: request.eventId 
      });

      // Verify booking exists and is confirmed
      const booking = await prisma.booking.findUnique({
        where: { id: request.bookingId },
        include: { event: true }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'CONFIRMED') {
        throw new Error('Booking must be confirmed to generate ticket');
      }

      // Check if ticket already exists
      const existingTicket = await prisma.ticket.findUnique({
        where: { bookingId: request.bookingId },
        include: {
          booking: true
        }
      });

      if (existingTicket) {
        logger.info('Ticket already exists for booking', { bookingId: request.bookingId });
        // Fetch event details for existing ticket
        let eventDetails = null;
        if (existingTicket.booking?.eventId) {
          try {
            eventDetails = await this.getEventDetails(existingTicket.booking.eventId);
          } catch (error) {
            logger.warn('Failed to fetch event details for existing ticket', { 
              ticketId: existingTicket.id, 
              eventId: existingTicket.booking.eventId 
            });
          }
        }
        return this.mapTicketToResponse(existingTicket, null, eventDetails);
      }

      // Calculate expiration time (2 hours after event ends) - AC5
      let expiresAt: Date;
      try {
        const eventDetails = await this.getEventDetails(request.eventId);
        if (eventDetails && eventDetails.bookingEndDate) {
          // Set expiration to 2 hours after event ends
          const eventEndDate = new Date(eventDetails.bookingEndDate);
          expiresAt = new Date(eventEndDate.getTime() + (2 * 60 * 60 * 1000)); // 2 hours in milliseconds
          logger.info('Ticket expiration set based on event end time', { 
            eventEndDate: eventDetails.bookingEndDate, 
            expiresAt: expiresAt.toISOString() 
          });
        } else {
          // Fallback: 24 hours from now if event service is unavailable
          expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          logger.warn('Using fallback expiration time (24h) - event service unavailable', { eventId: request.eventId });
        }
      } catch (error) {
        // Fallback: 24 hours from now if there's an error
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        logger.error('Error getting event details, using fallback expiration', error as Error, { eventId: request.eventId });
      }

      // Create ticket
      const ticket = await prisma.ticket.create({
        data: {
          bookingId: request.bookingId,
          status: TicketStatus.ISSUED,
          expiresAt: expiresAt
        }
      });

      logger.info('Ticket created successfully', { ticketId: ticket.id });

      // Generate QR code for the ticket
      const qrCode = await this.generateQRCode(ticket.id);

      // Publish ticket generated event for email notification
      await eventPublisherService.publishTicketGenerated({
        ticketId: ticket.id,
        userId: request.userId,
        eventId: request.eventId,
        bookingId: request.bookingId,
        qrCodeData: qrCode.data,
        expiresAt: ticket.expiresAt.toISOString(),
        createdAt: ticket.createdAt.toISOString()
      });

      // Fetch event details for the new ticket
      let eventDetails = null;
      try {
        eventDetails = await this.getEventDetails(request.eventId);
      } catch (error) {
        logger.warn('Failed to fetch event details for new ticket', { 
          ticketId: ticket.id, 
          eventId: request.eventId 
        });
      }
      
      return this.mapTicketToResponse(ticket, qrCode, eventDetails);
    } catch (error) {
      logger.error('Failed to generate ticket', error as Error, request);
      throw error;
    }
  }

  /**
   * Generate a unique QR code for a ticket
   * AC2: Each ticket contains a unique QR code that cannot be duplicated
   */
  private async generateQRCode(ticketId: string): Promise<{ id: string; data: string; format: string }> {
    try {
      // Generate unique QR code data
      const qrCodeData = `ticket:${ticketId}:${Date.now()}:${Math.random().toString(36).substring(2)}`;

      // Check for uniqueness (very unlikely collision, but good practice)
      const existingQR = await prisma.qRCode.findUnique({
        where: { data: qrCodeData }
      });

      if (existingQR) {
        // Regenerate if collision (extremely unlikely)
        return this.generateQRCode(ticketId);
      }

      // Create QR code record
      const qrCode = await prisma.qRCode.create({
        data: {
          ticketId: ticketId,
          data: qrCodeData,
          format: 'PNG'
        }
      });

      logger.info('QR code generated successfully', { qrCodeId: qrCode.id, ticketId });
      return qrCode;
    } catch (error) {
      logger.error('Failed to generate QR code', error as Error, { ticketId });
      throw error;
    }
  }

  /**
   * Get ticket details by ID
   */
  async getTicketById(ticketId: string): Promise<TicketResponse | null> {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          qrCode: true,
          booking: {
            include: {
              event: true
            }
          }
        }
      });

      if (!ticket) {
        return null;
      }

      // Fetch event details from event service
      let eventDetails = null;
      if (ticket.booking?.eventId) {
        try {
          eventDetails = await this.getEventDetails(ticket.booking.eventId);
        } catch (error) {
          logger.warn('Failed to fetch event details for ticket', { ticketId, eventId: ticket.booking.eventId });
        }
      }

      return this.mapTicketToResponse(ticket, ticket.qrCode, eventDetails);
    } catch (error) {
      logger.error('Failed to get ticket by ID', error as Error, { ticketId });
      throw error;
    }
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(userId: string): Promise<TicketResponse[]> {
    try {
      const tickets = await prisma.ticket.findMany({
        where: {
          booking: {
            userId: userId
          }
        },
        include: {
          qrCode: true,
          booking: {
            include: {
              event: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Deduplicate eventIds to avoid N+1 queries
      const eventIds = Array.from(
        new Set(
          tickets
            .map(ticket => ticket.booking?.eventId)
            .filter((id): id is string => !!id)
        )
      );

      // Fetch event details for each unique eventId
      const eventDetailsMap = new Map<string, any>();
      await Promise.all(
        eventIds.map(async (eventId) => {
          try {
            const eventDetails = await this.getEventDetails(eventId);
            eventDetailsMap.set(eventId, eventDetails);
          } catch (error) {
            logger.warn('Failed to fetch event details for event', { eventId });
            eventDetailsMap.set(eventId, null);
          }
        })
      );

      // Map tickets to responses using cached event details
      const ticketsWithEvents = tickets.map((ticket) => {
        const eventId = ticket.booking?.eventId;
        const eventDetails = eventId ? eventDetailsMap.get(eventId) : null;
        return this.mapTicketToResponse(ticket, ticket.qrCode, eventDetails);
      });

      return ticketsWithEvents;
    } catch (error) {
      logger.error('Failed to get user tickets', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Revoke a ticket
   */
  async revokeTicket(ticketId: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Revoking ticket', { ticketId });

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        return {
          success: false,
          message: 'Ticket not found'
        };
      }

      if (ticket.status === TicketStatus.REVOKED) {
        return {
          success: false,
          message: 'Ticket is already revoked'
        };
      }

      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.REVOKED
        }
      });

      logger.info('Ticket revoked successfully', { ticketId });

      return {
        success: true,
        message: 'Ticket revoked successfully'
      };
    } catch (error) {
      logger.error('Failed to revoke ticket', error as Error, { ticketId });
      return {
        success: false,
        message: 'Failed to revoke ticket'
      };
    }
  }


  /**
   * Get event attendance statistics
   */
  async getEventAttendance(eventId: string): Promise<{
    totalTickets: number;
    scannedTickets: number;
    attendanceRate: number;
    attendanceRecords: Array<{
      id: string;
      ticketId: string;
      scanTime: string;
      scanLocation?: string;
      scannedBy?: string;
      scanMethod: string;
    }>;
  }> {
    try {
      const [totalTickets, scannedTickets, attendanceRecords] = await Promise.all([
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
            status: TicketStatus.SCANNED
          }
        }),
        prisma.attendanceRecord.findMany({
          where: {
            ticket: {
              booking: {
                eventId: eventId
              }
            }
          },
          orderBy: {
            scanTime: 'desc'
          }
        })
      ]);

      const attendanceRate = totalTickets > 0 ? (scannedTickets / totalTickets) * 100 : 0;

      return {
        totalTickets,
        scannedTickets,
        attendanceRate,
        attendanceRecords: attendanceRecords.map(record => ({
          id: record.id,
          ticketId: record.ticketId,
          scanTime: record.scanTime.toISOString(),
          scanLocation: record.scanLocation || undefined,
          scannedBy: record.scannedBy || undefined,
          scanMethod: record.scanMethod
        }))
      };
    } catch (error) {
      logger.error('Failed to get event attendance', error as Error, { eventId });
      throw error;
    }
  }

  /**
   * Helper method to map ticket to response format
   */
  private mapTicketToResponse(
    ticket: {
      id: string;
      bookingId: string;
      status: TicketStatus;
      issuedAt: Date;
      expiresAt: Date;
      scannedAt?: Date | null;
      booking?: { eventId: string } | null;
    },
    qrCode?: {
      id: string;
      data: string;
      format: string;
    } | null,
    eventDetails?: any | null
  ): TicketResponse {
    if (!ticket.booking || !ticket.booking.eventId) {
      throw new Error('Cannot map ticket to response: missing booking or eventId');
    }
    
    return {
      id: ticket.id,
      bookingId: ticket.bookingId,
      eventId: ticket.booking.eventId,
      status: ticket.status,
      issuedAt: ticket.issuedAt.toISOString(),
      expiresAt: ticket.expiresAt.toISOString(),
      scannedAt: ticket.scannedAt?.toISOString(),
      qrCode: qrCode ? {
        id: qrCode.id,
        data: qrCode.data,
        format: qrCode.format
      } : {
        id: '',
        data: '',
        format: 'PNG'
      },
      event: eventDetails ? {
        id: eventDetails.id,
        name: eventDetails.name,
        description: eventDetails.description,
        category: eventDetails.category,
        venue: {
          name: eventDetails.venue?.name || 'Unknown Venue',
          address: eventDetails.venue?.address || 'Unknown Address'
        },
        bookingStartDate: eventDetails.bookingStartDate,
        bookingEndDate: eventDetails.bookingEndDate
      } : undefined
    };
  }
}

export const ticketService = new TicketService();