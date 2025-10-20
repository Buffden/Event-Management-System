import { TicketStatus, ScanMethod } from '../../generated/prisma';

// Ticket-related request/response types
export interface TicketGenerationRequest {
  bookingId: string;
  userId: string;
  eventId: string;
}

export interface TicketResponse {
  id: string;
  bookingId: string;
  eventId: string; // Add eventId to connect tickets with events
  status: TicketStatus;
  issuedAt: string;
  expiresAt: string;
  scannedAt?: string;
  qrCode: {
    id: string;
    data: string;
    format: string;
  };
  event?: {
    id: string;
    name: string;
    description: string;
    category: string;
    venue: {
      name: string;
      address: string;
    };
    bookingStartDate: string;
    bookingEndDate: string;
  };
}



export interface AttendanceReportRequest {
  eventId: string;
}

export interface AttendanceReportResponse {
  totalTickets: number;
  scannedTickets: number;
  attendanceRate: number;
  attendanceRecords: Array<{
    id: string;
    ticketId: string;
    scanTime: string;
    scanLocation?: string;
    scannedBy?: string;
    scanMethod: ScanMethod;
  }>;
}

// Event message types for RabbitMQ
export interface TicketGeneratedMessage {
  ticketId: string;
  userId: string;
  eventId: string;
  bookingId: string;
  qrCodeData: string;
  expiresAt: string;
  createdAt: string;
}


// Error types
export class TicketError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'TicketError';
  }
}

export class TicketNotFoundError extends TicketError {
  constructor(ticketId: string) {
    super(`Ticket not found: ${ticketId}`, 'TICKET_NOT_FOUND', 404);
  }
}

export class TicketExpiredError extends TicketError {
  constructor(ticketId: string) {
    super(`Ticket has expired: ${ticketId}`, 'TICKET_EXPIRED', 410);
  }
}

export class TicketAlreadyScannedError extends TicketError {
  constructor(ticketId: string) {
    super(`Ticket already scanned: ${ticketId}`, 'TICKET_ALREADY_SCANNED', 409);
  }
}

export class TicketRevokedError extends TicketError {
  constructor(ticketId: string) {
    super(`Ticket has been revoked: ${ticketId}`, 'TICKET_REVOKED', 403);
  }
}

export class QRCodeGenerationError extends TicketError {
  constructor(message: string) {
    super(`QR code generation failed: ${message}`, 'QR_CODE_GENERATION_FAILED', 500);
  }
}

