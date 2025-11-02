import { BaseApiClient } from './base-api.client';
import {
  CreateBookingRequest,
  BookingResponse,
  BookingListResponse,
  TicketResponse,
  TicketListResponse
} from './types/booking.types';

class BookingApiClient extends BaseApiClient {
  protected readonly LOGGER_COMPONENT_NAME = 'BookingApiClient';

  constructor() {
    super(process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || 'http://localhost/api/booking');
  }

  // Public methods for booking operations
  async createBooking(data: CreateBookingRequest): Promise<BookingResponse> {
    return this.request<BookingResponse>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getUserBookings(userId?: string): Promise<BookingListResponse> {
    const endpoint = userId ? `/bookings?userId=${userId}` : '/bookings/my-bookings';
    return this.request<BookingListResponse>(endpoint);
  }

  async getBooking(bookingId: string): Promise<BookingResponse> {
    return this.request<BookingResponse>(`/bookings/${bookingId}`);
  }

  async cancelBooking(bookingId: string): Promise<BookingResponse> {
    return this.request<BookingResponse>(`/bookings/${bookingId}/cancel`, {
      method: 'PUT'
    });
  }

  // Public methods for ticket operations

  async getTicket(ticketId: string): Promise<TicketResponse> {
    return this.request<TicketResponse>(`/tickets/${ticketId}`);
  }

  async getUserTickets(): Promise<TicketListResponse> {
    return this.request<TicketListResponse>('/tickets/user/my-tickets');
  }


  // Public methods for admin operations
  async getEventAttendance(eventId: string): Promise<any> {
    return this.request(`/admin/events/${eventId}/attendance`);
  }

  async getEventTickets(eventId: string, filters?: { page?: number; limit?: number; status?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.status) params.append('status', filters.status);

    const endpoint = `/admin/events/${eventId}/tickets?${params.toString()}`;
    return this.request(endpoint);
  }

  async getEventTicketStats(eventId: string): Promise<any> {
    return this.request(`/admin/events/${eventId}/stats`);
  }

  async getTotalRegistrations(): Promise<{ success: boolean; data: { totalRegistrations: number } }> {
    return this.request('/admin/bookings/stats');
  }

  async getAverageAttendance(): Promise<{ success: boolean; data: { averageAttendance: number } }> {
    return this.request('/admin/analytics/average-attendance');
  }

  async getTopEvents(limit?: number): Promise<{ success: boolean; data: Array<{ eventId: string; name: string; registrations: number; attendance: number }> }> {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/admin/analytics/top-events${params}`);
  }

  async revokeTicket(ticketId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/admin/${ticketId}/revoke`, {
      method: 'PUT'
    });
  }
}

const bookingApiClient = new BookingApiClient();

export const bookingAPI = {
  /**
   * Create a new booking (triggers automatic ticket generation)
   */
  createBooking: (data: CreateBookingRequest) => bookingApiClient.createBooking(data),

  /**
   * Get user's bookings
   */
  getUserBookings: (userId?: string) => bookingApiClient.getUserBookings(userId),

  /**
   * Get booking by ID
   */
  getBooking: (bookingId: string) => bookingApiClient.getBooking(bookingId),

  /**
   * Cancel a booking
   */
  cancelBooking: (bookingId: string) => bookingApiClient.cancelBooking(bookingId),

  /**
   * Get attendance report for an event (Admin)
   */
  getEventAttendance: (eventId: string) => bookingApiClient.getEventAttendance(eventId),

  /**
   * Get all tickets for an event (Admin)
   */
  getEventTickets: (eventId: string, filters?: { page?: number; limit?: number; status?: string }) =>
    bookingApiClient.getEventTickets(eventId, filters),

  /**
   * Get ticket statistics for an event (Admin)
   */
  getEventTicketStats: (eventId: string) => bookingApiClient.getEventTicketStats(eventId),

  /**
   * Get total registrations across all events (Admin)
   */
  getTotalRegistrations: () => bookingApiClient.getTotalRegistrations(),

  /**
   * Get average attendance rate (Admin)
   */
  getAverageAttendance: () => bookingApiClient.getAverageAttendance(),

  /**
   * Get top performing events (Admin)
   */
  getTopEvents: (limit?: number) => bookingApiClient.getTopEvents(limit),

  /**
   * Revoke a ticket (Admin)
   */
  revokeTicket: (ticketId: string) => bookingApiClient.revokeTicket(ticketId)
};

export const ticketAPI = {

  /**
   * Get ticket details by ID
   */
  getTicket: (ticketId: string) => bookingApiClient.getTicket(ticketId),

  /**
   * Get user's tickets
   */
  getUserTickets: () => bookingApiClient.getUserTickets()
};
