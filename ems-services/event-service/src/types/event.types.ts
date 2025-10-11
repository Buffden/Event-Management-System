import { EventStatus } from '../../generated/prisma';

// Event-related types
export interface CreateEventRequest {
  name: string;
  description: string;
  category: string;
  bannerImageUrl?: string;
  venueId: number;
  bookingStartDate: string; // ISO string
  bookingEndDate: string; // ISO string
  userId: string; // Speaker/User ID
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  category?: string;
  bannerImageUrl?: string;
  venueId?: number;
  bookingStartDate?: string; // ISO string
  bookingEndDate?: string; // ISO string
}

export interface EventResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  bannerImageUrl?: string;
  status: EventStatus;
  rejectionReason?: string;
  speakerId: string;
  venueId: number;
  venue: {
    id: number;
    name: string;
    address: string;
    capacity: number;
    openingTime: string;
    closingTime: string;
  };
  bookingStartDate: string;
  bookingEndDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventListResponse {
  events: EventResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EventFilters {
  status?: EventStatus;
  category?: string;
  venueId?: number;
  speakerId?: string;
  bookingStartDate?: string;
  bookingEndDate?: string;
  page?: number;
  limit?: number;
}

export interface RejectEventRequest {
  rejectionReason: string;
}

// Event publishing types
export interface EventPublishedMessage {
  eventId: string;
  speakerId: string;
  name: string;
  capacity: number;
  bookingStartDate: string;
  bookingEndDate: string;
}

export interface EventUpdatedMessage {
  eventId: string;
  updatedFields: Partial<UpdateEventRequest>;
}

export interface EventCancelledMessage {
  eventId: string;
}

export interface EventApprovedMessage {
  eventId: string;
  speakerId: string;
  speakerName: string;
  speakerEmail: string;
  eventName: string;
  eventDescription: string;
  venueName: string;
  bookingStartDate: string;
  bookingEndDate: string;
}
