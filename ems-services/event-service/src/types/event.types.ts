import { EventStatus, SessionSpeakerMaterialsStatus } from './event.enums';

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

export interface CreateSessionRequest {
  title: string;
  description?: string;
  startsAt: string; // ISO string
  endsAt: string; // ISO string
  stage?: string;
}

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  startsAt?: string; // ISO string
  endsAt?: string; // ISO string
  stage?: string;
}

export interface SessionSpeakerAssignRequest {
  speakerId: string;
  materialsAssetId?: string;
  materialsStatus?: SessionSpeakerMaterialsStatus;
  speakerCheckinConfirmed?: boolean;
  specialNotes?: string;
}

export interface SessionSpeakerUpdateRequest {
  materialsAssetId?: string | null;
  materialsStatus?: SessionSpeakerMaterialsStatus;
  speakerCheckinConfirmed?: boolean;
  specialNotes?: string | null;
}

export interface SessionSpeakerResponse {
  id: string;
  sessionId: string;
  speakerId: string;
  materialsAssetId?: string | null;
  materialsStatus: SessionSpeakerMaterialsStatus;
  speakerCheckinConfirmed: boolean;
  specialNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
  id: string;
  eventId: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  stage?: string | null;
  createdAt: string;
  updatedAt: string;
  speakers: SessionSpeakerResponse[];
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
  sessions: SessionResponse[];
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
  search?: string; // Search by name, description, or venue name
  timeframe?: string; // UPCOMING, ONGOING, PAST, ALL
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

export interface EventDeletedMessage {
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
