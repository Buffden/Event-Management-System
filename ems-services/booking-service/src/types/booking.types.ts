import { BookingStatus } from '../../generated/prisma/enums';

// Booking-related types
export interface CreateBookingRequest {
  eventId: string;
  userId: string; // Will be extracted from JWT token
}

export interface BookingResponse {
  id: string;
  userId: string;
  eventId: string;
  status: BookingStatus;
  event: {
    id: string;
    capacity: number;
    isActive: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BookingListResponse {
  bookings: BookingResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BookingFilters {
  status?: BookingStatus;
  eventId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

// Event cache types (for local event data)
export interface EventCacheData {
  id: string;
  capacity: number;
  isActive: boolean;
}

// RabbitMQ message types
export interface EventPublishedMessage {
  eventId: string;
  capacity: number;
}

export interface EventCancelledMessage {
  eventId: string;
}

export interface BookingConfirmedMessage {
  bookingId: string;
  userId: string;
  eventId: string;
  createdAt: string;
}

export interface BookingCancelledMessage {
  bookingId: string;
  userId: string;
  eventId: string;
  cancelledAt: string;
}

// Error types
export interface BookingError {
  code: string;
  message: string;
  details?: any;
}

// Capacity check result
export interface CapacityCheckResult {
  isAvailable: boolean;
  currentBookings: number;
  capacity: number;
  remainingSlots: number;
}
