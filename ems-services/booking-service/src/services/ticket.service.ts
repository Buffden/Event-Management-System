import { prisma } from '../database';
import { logger } from '../utils/logger';
import { TicketStatus } from '../../generated/prisma';
import { eventPublisherService } from './event-publisher.service';
import { TicketGenerationRequest, TicketResponse } from '../types/ticket.types';

class TicketService {
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
        where: { bookingId: request.bookingId }
      });

      if (existingTicket) {
        logger.info('Ticket already exists for booking', { bookingId: request.bookingId });
        return this.mapTicketToResponse(existingTicket);
      }

      // Calculate expiration time (2 hours after event ends)
      // For now, we'll set it to 24 hours from now since we don't have event end time
      // TODO: Get actual event end time from event service
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Temporary: 24 hours from now

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

      return this.mapTicketToResponse(ticket, qrCode);
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

      return this.mapTicketToResponse(ticket, ticket.qrCode);
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

      return tickets.map(ticket => this.mapTicketToResponse(ticket, ticket.qrCode));
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
  private mapTicketToResponse(ticket: any, qrCode?: any): TicketResponse {
    return {
      id: ticket.id,
      bookingId: ticket.bookingId,
      eventId: ticket.booking?.eventId || '',
      status: ticket.status,
      issuedAt: ticket.issuedAt.toISOString(),
      expiresAt: ticket.expiresAt.toISOString(),
      qrCode: qrCode ? {
        id: qrCode.id,
        data: qrCode.data,
        format: qrCode.format
      } : {
        id: '',
        data: '',
        format: 'PNG'
      }
    };
  }
}

export const ticketService = new TicketService();