// Booking Types
export interface CreateBookingRequest {
  userId: string;
  eventId: string;
}

export interface BookingResponse {
  id: string;
  userId: string;
  eventId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  isAttended?: boolean;
  ticketType?: string | null;
  event?: {
    id: string;
    name: string;
    description?: string;
    bookingStartDate: string;
    bookingEndDate: string;
    venue?: {
      id: number;
      name: string;
      address: string;
    };
  };
}

export interface BookingListResponse {
  success: boolean;
  data: {
    bookings: BookingResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Ticket Types
export interface TicketResponse {
  id: string;
  bookingId: string;
  userId: string;
  eventId: string;
  status: 'ISSUED' | 'SCANNED' | 'REVOKED' | 'EXPIRED';
  issuedAt: string;
  scannedAt?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  qrCode?: {
    id: string;
    data: string;
    createdAt: string;
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

export interface TicketListResponse {
  success: boolean;
  data: TicketResponse[];
}



// Admin Types
export interface AttendanceReportResponse {
  eventId: string;
  totalTickets: number;
  scannedTickets: number;
  attendanceRate: number;
  attendanceRecords: AttendanceRecord[];
}

export interface AttendanceRecord {
  id: string;
  ticketId: string;
  userId: string;
  scannedAt: string;
  scannedBy: string;
  scanMethod: 'QR_CODE' | 'MANUAL';
  scanLocation?: string;
}

export interface TicketStatsResponse {
  eventId: string;
  totalTickets: number;
  issuedTickets: number;
  scannedTickets: number;
  expiredTickets: number;
  revokedTickets: number;
  attendanceRate: number;
}
