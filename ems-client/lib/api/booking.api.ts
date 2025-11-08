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

  // Dashboard methods
  async getDashboardStats(): Promise<{
    registeredEvents: number;
    upcomingEvents: number;
    attendedEvents: number;
    ticketsPurchased: number;
    activeTickets: number;
    usedTickets: number;
    upcomingThisWeek: number;
    nextWeekEvents: number;
  }> {
    const response = await this.request<{ success: boolean; data: any }>('/bookings/dashboard/stats');
    return response.data;
  }

  async getUpcomingEvents(limit: number = 5): Promise<any[]> {
    const response = await this.request<{ success: boolean; data: any[] }>(`/bookings/dashboard/upcoming-events?limit=${limit}`);
    return response.data;
  }

  async getRecentRegistrations(limit: number = 5): Promise<any[]> {
    const response = await this.request<{ success: boolean; data: any[] }>(`/bookings/dashboard/recent-registrations?limit=${limit}`);
    return response.data;
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

<<<<<<< HEAD
    const endpoint = `/admin/events/${eventId}/tickets?${params.toString()}`;
=======
    const endpoint = `/admin/tickets/events/${eventId}/tickets?${params.toString()}`;
>>>>>>> EMS-159-Implement-Speaker-Admin-Messaging-System
    return this.request(endpoint);
  }

  async getEventTicketStats(eventId: string): Promise<any> {
    return this.request(`/admin/events/${eventId}/stats`);
  }

  async revokeTicket(ticketId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/admin/${ticketId}/revoke`, {
      method: 'PUT'
    });
  }

  // Speaker methods
  async getEventRegistrationCount(eventId: string): Promise<{
    eventId: string;
    totalUsers: number;
    confirmedBookings: number;
    cancelledBookings: number;
  }> {
    return this.request(`/speaker/${eventId}/num-registered`);
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
  cancelBooking: (bookingId: string) => bookingApiClient.cancelBooking(bookingId)
};

export const attendeeDashboardAPI = {
  /**
   * Get dashboard statistics for the authenticated user
   */
  getDashboardStats: () => bookingApiClient.getDashboardStats(),

  /**
   * Get upcoming events for the authenticated user
   */
  getUpcomingEvents: (limit?: number) => bookingApiClient.getUpcomingEvents(limit),

  /**
   * Get recent registrations for the authenticated user
   */
  getRecentRegistrations: (limit?: number) => bookingApiClient.getRecentRegistrations(limit)
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

export const adminTicketAPI = {
  /**
   * Get attendance report for an event
   */
  getEventAttendance: (eventId: string) => bookingApiClient.getEventAttendance(eventId),

  /**
   * Get all tickets for an event
   */
  getEventTickets: (eventId: string, filters?: { page?: number; limit?: number; status?: string }) =>
    bookingApiClient.getEventTickets(eventId, filters),

  /**
   * Get ticket statistics for an event
   */
  getEventTicketStats: (eventId: string) => bookingApiClient.getEventTicketStats(eventId),

  /**
   * Revoke a ticket
   */
  revokeTicket: (ticketId: string) => bookingApiClient.revokeTicket(ticketId)
};

export const speakerBookingAPI = {
  /**
   * Get number of registered users (confirmed bookings) for an event
   * Speaker-only endpoint
   */
  getEventRegistrationCount: (eventId: string) => bookingApiClient.getEventRegistrationCount(eventId)
};
