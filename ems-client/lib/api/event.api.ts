// Event API client for Event Management System
import { logger } from '../logger';
import {
    EventFilters,
    EventListResponse,
    EventResponse,
    CreateEventRequest,
    UpdateEventRequest,
    RejectEventRequest,
    VenueListResponse,
    VenueResponse,
    CreateVenueRequest,
    UpdateVenueRequest,
    VenueFilters,
} from './types/event.types';
import { ApiError } from './types/common.types';
import { BaseApiClient } from './base-api.client';

const LOGGER_COMPONENT_NAME = 'EventAPI';
import { apiEndpoints } from './config';

const API_BASE_URL = apiEndpoints.event;

// Event API client class
class EventApiClient extends BaseApiClient {
  protected readonly LOGGER_COMPONENT_NAME = LOGGER_COMPONENT_NAME;

  constructor(baseURL: string) {
    super(baseURL);
  }



  // Public Event Endpoints
  async getPublishedEvents(filters?: EventFilters): Promise<{ success: boolean; data: EventListResponse }> {
    const queryParams = new URLSearchParams();

    if (filters) {
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.venueId) queryParams.append('venueId', filters.venueId.toString());
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.timeframe) queryParams.append('timeframe', filters.timeframe);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = `/events${queryString ? `?${queryString}` : ''}`;

    return this.request<{ success: boolean; data: EventListResponse }>(endpoint);
  }

  async getPublishedEventById(eventId: string): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/events/${eventId}`);
  }

  // Public Venue Endpoints
  async getVenues(filters?: VenueFilters): Promise<{ success: boolean; data: VenueListResponse }> {
    const queryParams = new URLSearchParams();

    if (filters) {
      if (filters.name) queryParams.append('name', filters.name);
      if (filters.capacity) queryParams.append('capacity', filters.capacity.toString());
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = `/venues${queryString ? `?${queryString}` : ''}`;

    return this.request<{ success: boolean; data: VenueListResponse }>(endpoint);
  }

  async getAllVenues(): Promise<{ success: boolean; data: VenueResponse[] }> {
    return this.request<{ success: boolean; data: VenueResponse[] }>('/venues/all');
  }

  // Speaker Event Endpoints
  async getMyEvents(speakerId: string, filters?: EventFilters): Promise<{ success: boolean; data: EventListResponse }> {
    logger.debug(LOGGER_COMPONENT_NAME, 'GetMyEvents', { speakerId, filters });

    // Note: Filters are not sent to server, they will be applied on client side
    // The server returns all events for the speaker, client handles filtering
    const endpoint = `/speaker/events/my-events?speakerId=${speakerId}`;

    logger.debug(LOGGER_COMPONENT_NAME, `Sending request to ${endpoint}`);

    return this.request<{ success: boolean; data: EventListResponse }>(endpoint);
  }

  async createEvent(eventData: CreateEventRequest): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>('/speaker/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(eventId: string, updateData: UpdateEventRequest): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/speaker/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async submitEvent(eventId: string): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/speaker/events/${eventId}/submit`, {
      method: 'PATCH',
    });
  }

  async deleteEvent(eventId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/speaker/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  async getMyEventById(eventId: string): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/speaker/events/${eventId}`);
  }

  // Admin Event Endpoints
  async getAllEvents(filters?: EventFilters): Promise<{ success: boolean; data: EventListResponse }> {
    const queryParams = new URLSearchParams();

    if (filters) {
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.venueId) queryParams.append('venueId', filters.venueId.toString());
      if (filters.speakerId) queryParams.append('speakerId', filters.speakerId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
    }

    const queryString = queryParams.toString();
    // Note: Double /admin prefix due to backend route structure - will be refactored in future ticket
    const endpoint = `/admin/admin/events${queryString ? `?${queryString}` : ''}`;

    return this.request<{ success: boolean; data: EventListResponse }>(endpoint);
  }

  async getEventById(eventId: string): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/events/${eventId}`);
  }

  async approveEvent(eventId: string): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/admin/admin/events/${eventId}/approve`, {
      method: 'PATCH',
    });
  }

  async rejectEvent(eventId: string, rejectionData: RejectEventRequest): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/admin/admin/events/${eventId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify(rejectionData),
    });
  }

  async cancelEvent(eventId: string): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/admin/admin/events/${eventId}/cancel`, {
      method: 'PATCH',
    });
  }

  // Admin Venue Endpoints
  // Note: Double /admin prefix due to backend route structure - will be refactored in future ticket
  async createVenue(venueData: CreateVenueRequest): Promise<{ success: boolean; data: VenueResponse }> {
    return this.request<{ success: boolean; data: VenueResponse }>('/admin/admin/venues', {
      method: 'POST',
      body: JSON.stringify(venueData),
    });
  }

  async updateVenue(venueId: number, updateData: UpdateVenueRequest): Promise<{ success: boolean; data: VenueResponse }> {
    return this.request<{ success: boolean; data: VenueResponse }>(`/admin/admin/venues/${venueId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteVenue(venueId: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/admin/admin/venues/${venueId}`, {
      method: 'DELETE',
    });
  }

  async getAdminVenues(filters?: VenueFilters): Promise<{ success: boolean; data: VenueListResponse }> {
    const queryParams = new URLSearchParams();

    if (filters) {
      if (filters.name) queryParams.append('name', filters.name);
      if (filters.capacity) queryParams.append('capacity', filters.capacity.toString());
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = `/admin/admin/venues${queryString ? `?${queryString}` : ''}`;

    return this.request<{ success: boolean; data: VenueListResponse }>(endpoint);
  }

  async getVenueById(venueId: number): Promise<{ success: boolean; data: VenueResponse }> {
    return this.request<{ success: boolean; data: VenueResponse }>(`/admin/admin/venues/${venueId}`);
  }
}

// Create and export the Event API client instance
export const eventApiClient = new EventApiClient(API_BASE_URL);

// Convenience exports for event methods
export const eventAPI = {
  // Public endpoints
  getPublishedEvents: (filters?: EventFilters) => eventApiClient.getPublishedEvents(filters),
  getPublishedEventById: (eventId: string) => eventApiClient.getPublishedEventById(eventId),
  getVenues: (filters?: VenueFilters) => eventApiClient.getVenues(filters),
  getAllVenues: () => eventApiClient.getAllVenues(),

  // Speaker endpoints
  getMyEvents: (speakerId: string, filters?: EventFilters) => eventApiClient.getMyEvents(speakerId, filters),
  createEvent: (eventData: CreateEventRequest) => eventApiClient.createEvent(eventData),
  updateEvent: (eventId: string, updateData: UpdateEventRequest) => eventApiClient.updateEvent(eventId, updateData),
  submitEvent: (eventId: string) => eventApiClient.submitEvent(eventId),
  deleteEvent: (eventId: string) => eventApiClient.deleteEvent(eventId),
  getMyEventById: (eventId: string) => eventApiClient.getMyEventById(eventId),

  // Admin endpoints
  getAllEvents: (filters?: EventFilters) => eventApiClient.getAllEvents(filters),
  getEventById: (eventId: string) => eventApiClient.getEventById(eventId),
  approveEvent: (eventId: string) => eventApiClient.approveEvent(eventId),
  rejectEvent: (eventId: string, rejectionData: RejectEventRequest) => eventApiClient.rejectEvent(eventId, rejectionData),
  cancelEvent: (eventId: string) => eventApiClient.cancelEvent(eventId),
  createVenue: (venueData: CreateVenueRequest) => eventApiClient.createVenue(venueData),
  updateVenue: (venueId: number, updateData: UpdateVenueRequest) => eventApiClient.updateVenue(venueId, updateData),
  deleteVenue: (venueId: number) => eventApiClient.deleteVenue(venueId),
  getAdminVenues: (filters?: VenueFilters) => eventApiClient.getAdminVenues(filters),
  getVenueById: (venueId: number) => eventApiClient.getVenueById(venueId),
};
