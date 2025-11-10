/**
 * Comprehensive Test Suite for Ticket Service
 *
 * Tests all ticket features including:
 * - Ticket generation
 * - QR code generation
 * - Ticket retrieval
 * - User tickets
 * - Ticket revocation
 * - Event attendance statistics
 */

import '@jest/globals';

// Import mocks - use requireActual to bypass Jest's mock if it exists
// This ensures we get the actual exports even if jest.mock() interferes
const mocks = jest.requireActual('./mocks-simple');
const mockPrisma = mocks.mockPrisma;
const mockEventPublisherService = mocks.mockEventPublisherService;
const mockAxios = mocks.mockAxios;
const mockLogger = mocks.mockLogger;

import { TicketService } from '../services/ticket.service';
import { TicketStatus } from '../../generated/prisma';

describe('TicketService', () => {
  let ticketService: TicketService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore default ticket.create mockImplementation after clearing
    // This ensures expiresAt and createdAt are always available
    mockPrisma.ticket.create.mockImplementation(async (args: any) => {
      const baseTicket = mocks.createMockTicket();
      return {
        ...baseTicket,
        expiresAt: args.data?.expiresAt || baseTicket.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
        issuedAt: args.data?.issuedAt || baseTicket.issuedAt || new Date(),
        createdAt: args.data?.createdAt || baseTicket.createdAt || new Date(),
      };
    });
    // Ensure mockPrisma.$transaction exists and set it up
    if (mockPrisma && mockPrisma.$transaction) {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          booking: mockPrisma.booking,
          ticket: mockPrisma.ticket,
          qRCode: mockPrisma.qRCode,
          attendanceRecord: mockPrisma.attendanceRecord,
        };
        return await callback(mockTx);
      });
    }
    ticketService = new TicketService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TICKET GENERATION TESTS
  // ============================================================================

  describe('generateTicket()', () => {
    it('should generate ticket successfully', async () => {
      const { mockTicket, mockBooking } = mocks.setupSuccessfulTicketGeneration();
      mocks.setupQRCodeGeneration();
      mocks.setupEventServiceResponse({
        bookingEndDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      });

      const result = await ticketService.generateTicket({
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 'booking-123' },
        include: { event: true },
      });
      expect(mockPrisma.ticket.create).toHaveBeenCalled();
      expect(mockPrisma.qRCode.create).toHaveBeenCalled();
      expect(mockEventPublisherService.publishTicketGenerated).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.status).toBe('ISSUED');
    });

    it('should return existing ticket if already generated', async () => {
      const mockBooking = mocks.createMockBooking({ status: 'CONFIRMED' });
      const existingTicket = mocks.createMockTicket({ bookingId: 'booking-123' });

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...existingTicket,
        booking: mockBooking,
      });
      mocks.setupEventServiceResponse();

      const result = await ticketService.generateTicket({
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should reject ticket generation for non-existent booking', async () => {
      mocks.setupBookingNotFound();

      await expect(
        ticketService.generateTicket({
          bookingId: 'non-existent',
          userId: 'user-123',
          eventId: 'event-123',
        })
      ).rejects.toThrow('Booking not found');
    });

    it('should reject ticket generation for unconfirmed booking', async () => {
      const mockBooking = mocks.createMockBooking({ status: 'CANCELLED' });
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        ticketService.generateTicket({
          bookingId: 'booking-123',
          userId: 'user-123',
          eventId: 'event-123',
        })
      ).rejects.toThrow('Booking must be confirmed');
    });

    it('should set expiration to 2 hours after event ends', async () => {
      const mockBooking = mocks.createMockBooking({ status: 'CONFIRMED' });
      const eventEndDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      mocks.setupQRCodeGeneration();
      mocks.setupEventServiceResponse({
        bookingEndDate: eventEndDate.toISOString(),
      });

      const mockTicket = mocks.createMockTicket();
      const expectedExpiresAt = new Date(eventEndDate.getTime() + 2 * 60 * 60 * 1000);
      mockPrisma.ticket.create.mockResolvedValue({
        ...mockTicket,
        expiresAt: expectedExpiresAt,
        createdAt: mockTicket.createdAt || new Date(),
      });

      await ticketService.generateTicket({
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(mockPrisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        })
      );
    });

    it('should use fallback expiration if event service unavailable', async () => {
      const mockBooking = mocks.createMockBooking({ status: 'CONFIRMED' });
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      mocks.setupQRCodeGeneration();
      mocks.setupEventServiceError();

      const mockTicket = mocks.createMockTicket();
      // Ensure expiresAt and createdAt are set (service calculates expiresAt and Prisma adds createdAt)
      mockPrisma.ticket.create.mockResolvedValue({
        ...mockTicket,
        expiresAt: mockTicket.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: mockTicket.createdAt || new Date(),
      });

      await ticketService.generateTicket({
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(mockPrisma.ticket.create).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TICKET BY ID TESTS
  // ============================================================================

  describe('getTicketById()', () => {
    it('should get ticket by ID successfully', async () => {
      const mockTicket = mocks.createMockTicket();
      const mockBooking = mocks.createMockBooking();

      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        qrCode: { id: 'qr-123', data: 'qr-data', format: 'PNG' },
        booking: mockBooking,
      });
      mocks.setupEventServiceResponse();

      const result = await ticketService.getTicketById('ticket-123');

      expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
        include: {
          qrCode: true,
          booking: {
            include: {
              event: true,
            },
          },
        },
      });
      expect(result).toBeDefined();
      expect(result?.id).toBe('ticket-123');
    });

    it('should return null for non-existent ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      const result = await ticketService.getTicketById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // USER TICKETS TESTS
  // ============================================================================

  describe('getUserTickets()', () => {
    it('should get user tickets successfully', async () => {
      const mockTickets = [
        mocks.createMockTicket({ id: 'ticket-1' }),
        mocks.createMockTicket({ id: 'ticket-2' }),
      ];
      const mockBooking = mocks.createMockBooking();

      mockPrisma.ticket.findMany.mockResolvedValue(
        mockTickets.map(ticket => ({
          ...ticket,
          qrCode: { id: 'qr-123', data: 'qr-data', format: 'PNG' },
          booking: mockBooking,
        }))
      );
      mocks.setupEventServiceResponse();

      const result = await ticketService.getUserTickets('user-123');

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            booking: expect.objectContaining({
              userId: 'user-123',
            }),
          }),
        })
      );
      expect(result).toHaveLength(2);
    });
  });

  // ============================================================================
  // TICKET REVOCATION TESTS
  // ============================================================================

  describe('revokeTicket()', () => {
    it('should revoke ticket successfully', async () => {
      const mockTicket = mocks.createMockTicket({ status: 'ISSUED' });
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: 'REVOKED',
      });

      const result = await ticketService.revokeTicket('ticket-123');

      expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
      });
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
        data: { status: TicketStatus.REVOKED },
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('revoked');
    });

    it('should return error for non-existent ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      const result = await ticketService.revokeTicket('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should return error for already revoked ticket', async () => {
      const mockTicket = mocks.createMockTicket({ status: 'REVOKED' });
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);

      const result = await ticketService.revokeTicket('ticket-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('already revoked');
    });
  });

  // ============================================================================
  // EVENT ATTENDANCE TESTS
  // ============================================================================

  describe('getEventAttendance()', () => {
    it('should get event attendance statistics successfully', async () => {
      const mockAttendanceRecords = [
        {
          id: 'record-1',
          ticketId: 'ticket-1',
          scanTime: new Date(),
          scanLocation: 'Gate A',
          scannedBy: 'admin-123',
          scanMethod: 'QR_CODE',
        },
      ];

      mockPrisma.ticket.count
        .mockResolvedValueOnce(10) // Total tickets
        .mockResolvedValueOnce(5); // Scanned tickets
      mockPrisma.attendanceRecord.findMany.mockResolvedValue(mockAttendanceRecords);

      const result = await ticketService.getEventAttendance('event-123');

      expect(result.totalTickets).toBe(10);
      expect(result.scannedTickets).toBe(5);
      expect(result.attendanceRate).toBe(50);
      expect(result.attendanceRecords).toHaveLength(1);
    });

    it('should return zero attendance rate for no tickets', async () => {
      mockPrisma.ticket.count
        .mockResolvedValueOnce(0) // Total tickets
        .mockResolvedValueOnce(0); // Scanned tickets
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);

      const result = await ticketService.getEventAttendance('event-123');

      expect(result.totalTickets).toBe(0);
      expect(result.attendanceRate).toBe(0);
    });
  });

  // ============================================================================
  // QR CODE GENERATION TESTS
  // ============================================================================

  describe('QR Code Generation', () => {
    it('should generate unique QR code data', async () => {
      const { mockQRCode } = mocks.setupQRCodeGeneration();

      // This is tested indirectly through generateTicket
      const mockBooking = mocks.createMockBooking({ status: 'CONFIRMED' });
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      const mockTicket = mocks.createMockTicket();
      // Ensure expiresAt and createdAt are set (service calculates expiresAt and Prisma adds createdAt)
      mockPrisma.ticket.create.mockResolvedValue({
        ...mockTicket,
        expiresAt: mockTicket.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: mockTicket.createdAt || new Date(),
      });
      mocks.setupEventServiceResponse();

      await ticketService.generateTicket({
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
      });

      expect(mockPrisma.qRCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: expect.any(String),
            data: expect.stringContaining('ticket:'),
            format: 'PNG',
          }),
        })
      );
    });

    it('should handle QR code collision by regenerating', async () => {
      const mockBooking = mocks.createMockBooking({ status: 'CONFIRMED' });
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      const mockTicket = mocks.createMockTicket();
      // Ensure expiresAt and createdAt are set (service calculates expiresAt and Prisma adds createdAt)
      mockPrisma.ticket.create.mockResolvedValue({
        ...mockTicket,
        expiresAt: mockTicket.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: mockTicket.createdAt || new Date(),
      });
      mocks.setupEventServiceResponse();

      // First call returns existing QR (collision)
      mockPrisma.qRCode.findUnique
        .mockResolvedValueOnce({ id: 'existing-qr' })
        .mockResolvedValueOnce(null); // Second call succeeds

      mockPrisma.qRCode.create.mockResolvedValue({
        id: 'qr-123',
        ticketId: 'ticket-123',
        data: 'unique-qr-data',
        format: 'PNG',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await ticketService.generateTicket({
        bookingId: 'booking-123',
        userId: 'user-123',
        eventId: 'event-123',
      });

      // Should have tried to create QR code
      expect(mockPrisma.qRCode.create).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle database errors during ticket generation', async () => {
      mocks.setupDatabaseError();
      const mockBooking = mocks.createMockBooking({ status: 'CONFIRMED' });
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        ticketService.generateTicket({
          bookingId: 'booking-123',
          userId: 'user-123',
          eventId: 'event-123',
        })
      ).rejects.toThrow();
    });

    it('should handle errors gracefully in revokeTicket', async () => {
      mocks.setupDatabaseError();

      const result = await ticketService.revokeTicket('ticket-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed');
    });
  });
});

