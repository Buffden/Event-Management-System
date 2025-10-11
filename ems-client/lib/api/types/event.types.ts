// Event-related types
export enum EventStatus {
    DRAFT = 'DRAFT',
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    PUBLISHED = 'PUBLISHED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED'
}

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
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface RejectEventRequest {
    rejectionReason: string;
}

// Venue-related types
export interface CreateVenueRequest {
    name: string;
    address: string;
    capacity: number;
    openingTime: string; // HH:mm format
    closingTime: string; // HH:mm format
}

export interface UpdateVenueRequest {
    name?: string;
    address?: string;
    capacity?: number;
    openingTime?: string; // HH:mm format
    closingTime?: string; // HH:mm format
}

export interface VenueResponse {
    id: number;
    name: string;
    address: string;
    capacity: number;
    openingTime: string;
    closingTime: string;
    createdAt: string;
    updatedAt: string;
}

export interface VenueListResponse {
    venues: VenueResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface VenueFilters {
    name?: string;
    capacity?: number;
    page?: number;
    limit?: number;
}