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

const LOGGER_COMPONENT_NAME = 'EventAPI';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost/api';

// Event API client class
class EventApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    const token = this.getToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    // Log API call
    logger.apiCall(method, url, options.body ? JSON.parse(options.body as string) : undefined);

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Log API error response
        logger.apiResponse(LOGGER_COMPONENT_NAME, method, url, response.status, errorData);

        // Handle specific error cases
        if (response.status === 403) {
          throw new Error(errorData.error || 'Access denied');
        } else if (response.status === 401) {
          throw new Error(errorData.error || 'Authentication required');
        } else {
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
      }

      // Log successful API response
      logger.apiResponse(LOGGER_COMPONENT_NAME, method, url, response.status);

      return await response.json();
    } catch (error) {
      logger.errorWithContext(LOGGER_COMPONENT_NAME, 'Event API Request Failed', error as Error, {
        method,
        url,
        endpoint
      });

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  // Token management (for authenticated requests)
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('auth_token');
    logger.debug(LOGGER_COMPONENT_NAME, 'Token retrieved from storage', { hasToken: !!token });
    return token;
  }

  // Public Event Endpoints
  async getPublishedEvents(filters?: EventFilters): Promise<{ success: boolean; data: EventListResponse }> {
    const queryParams = new URLSearchParams();

    if (filters) {
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.venueId) queryParams.append('venueId', filters.venueId.toString());
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
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
    const queryParams = new URLSearchParams();

    // Note: Filters are not sent to server, they will be applied on client side
    // The server returns all events for the speaker, client handles filtering

    const queryString = queryParams.toString();
    const endpoint = `/events/my-events/${speakerId}?${queryString}`;

    return this.request<{ success: boolean; data: EventListResponse }>(endpoint);
  }

  async createEvent(eventData: CreateEventRequest): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(eventId: string, updateData: UpdateEventRequest): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async submitEvent(eventId: string): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/events/${eventId}/submit`, {
      method: 'PATCH',
    });
  }

  async deleteEvent(eventId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  async getMyEventById(eventId: string): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/events/${eventId}`);
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
    const endpoint = `/admin/events${queryString ? `?${queryString}` : ''}`;

    return this.request<{ success: boolean; data: EventListResponse }>(endpoint);
  }

  async getEventById(eventId: string): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/admin/events/${eventId}`);
  }

  async approveEvent(eventId: string): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/admin/events/${eventId}/approve`, {
      method: 'PATCH',
    });
  }

  async rejectEvent(eventId: string, rejectionData: RejectEventRequest): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/admin/events/${eventId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify(rejectionData),
    });
  }

  async cancelEvent(eventId: string): Promise<{ success: boolean; data: EventResponse }> {
    return this.request<{ success: boolean; data: EventResponse }>(`/admin/events/${eventId}/cancel`, {
      method: 'PATCH',
    });
  }

  // Admin Venue Endpoints
  async createVenue(venueData: CreateVenueRequest): Promise<{ success: boolean; data: VenueResponse }> {
    return this.request<{ success: boolean; data: VenueResponse }>('/admin/venues', {
      method: 'POST',
      body: JSON.stringify(venueData),
    });
  }

  async updateVenue(venueId: number, updateData: UpdateVenueRequest): Promise<{ success: boolean; data: VenueResponse }> {
    return this.request<{ success: boolean; data: VenueResponse }>(`/admin/venues/${venueId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteVenue(venueId: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/admin/venues/${venueId}`, {
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
    const endpoint = `/admin/venues${queryString ? `?${queryString}` : ''}`;

    return this.request<{ success: boolean; data: VenueListResponse }>(endpoint);
  }

  async getVenueById(venueId: number): Promise<{ success: boolean; data: VenueResponse }> {
    return this.request<{ success: boolean; data: VenueResponse }>(`/admin/venues/${venueId}`);
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
