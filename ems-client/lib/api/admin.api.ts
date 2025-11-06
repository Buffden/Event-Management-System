import { BaseApiClient } from './base-api.client';
import { eventAPI } from './event.api';
import { speakerApiClient, SpeakerProfile, SpeakerSearchRequest, CreateInvitationRequest } from './speaker.api';
import { logger } from '../logger';

const LOGGER_COMPONENT_NAME = 'AdminApiClient';

export interface AdminSpeakerSearchFilters {
  query?: string;
  expertise?: string[];
  isAvailable?: boolean;
  limit?: number;
  offset?: number;
}

export interface SpeakerInvitation {
  id: string;
  speakerId: string;
  eventId: string;
  message?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  sentAt: string;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  activeEvents: number;
  totalRegistrations: number;
}

export class AdminApiClient extends BaseApiClient {
  protected readonly LOGGER_COMPONENT_NAME: string = LOGGER_COMPONENT_NAME;

  constructor() {
    super('/api/admin'); // Base URL for admin-specific endpoints
  }

  // Event Management (delegate to existing eventAPI)
  async getAllEvents(filters?: any) {
    return eventAPI.getAllEvents(filters);
  }

  async getEventById(eventId: string) {
    return eventAPI.getEventById(eventId);
  }

  async createEvent(eventData: any) {
    return eventAPI.createEvent(eventData);
  }

  async updateEvent(eventId: string, eventData: any) {
    return eventAPI.updateEvent(eventId, eventData);
  }

  async deleteEvent(eventId: string) {
    return eventAPI.deleteEvent(eventId);
  }

  // Speaker Search and Management
  async searchSpeakers(filters: AdminSpeakerSearchFilters): Promise<SpeakerProfile[]> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Searching speakers', filters);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.query) params.append('query', filters.query);
      if (filters.expertise && filters.expertise.length > 0) {
        params.append('expertise', filters.expertise.join(','));
      }
      if (filters.isAvailable !== undefined) {
        params.append('isAvailable', filters.isAvailable.toString());
      }
      params.append('limit', (filters.limit || 20).toString());
      params.append('offset', (filters.offset || 0).toString());

      const response = await fetch(`/api/speakers/?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      logger.info(LOGGER_COMPONENT_NAME, 'Speakers found', { count: result.data.length });
      return result.data || [];
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to search speakers', error as Error);
      throw error;
    }
  }

  async getSpeakerProfile(speakerId: string): Promise<SpeakerProfile> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Getting speaker profile by speaker ID', { speakerId });
      
      const profile = await speakerApiClient.getSpeakerById(speakerId);
      
      logger.info(LOGGER_COMPONENT_NAME, 'Speaker profile retrieved', { speakerId });
      return profile;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to get speaker profile', error as Error);
      throw error;
    }
  }

  // Invitation Management
  async createInvitation(invitationData: CreateInvitationRequest): Promise<SpeakerInvitation> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Creating invitation', invitationData);
      
      const response = await fetch('/api/invitations/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitationData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      logger.info(LOGGER_COMPONENT_NAME, 'Invitation created successfully', { 
        invitationId: result.data.id,
        speakerId: invitationData.speakerId,
        eventId: invitationData.eventId
      });
      
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to create invitation', error as Error);
      throw error;
    }
  }

  async getEventInvitations(eventId: string): Promise<SpeakerInvitation[]> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Getting event invitations', { eventId });
      
      const response = await fetch(`/api/invitations/event/${eventId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      logger.info(LOGGER_COMPONENT_NAME, 'Event invitations retrieved', { 
        eventId,
        count: result.data.length
      });
      
      return result.data || [];
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to get event invitations', error as Error);
      throw error;
    }
  }

  async getInvitationById(invitationId: string): Promise<SpeakerInvitation> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Getting invitation', { invitationId });
      
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      logger.info(LOGGER_COMPONENT_NAME, 'Invitation retrieved', { invitationId });
      
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to get invitation', error as Error);
      throw error;
    }
  }

  // Dashboard Statistics
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Fetching dashboard statistics');
      
      const token = this.getToken();
      
      // Fetch stats from all services in parallel
      const [userStats, eventStats, bookingStats] = await Promise.all([
        fetch('/api/auth/admin/stats', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).then(res => {
          if (!res.ok) throw new Error(`Auth service error: ${res.status}`);
          return res.json();
        }),
        fetch('/api/event/admin/stats', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).then(res => {
          if (!res.ok) throw new Error(`Event service error: ${res.status}`);
          return res.json();
        }),
        fetch('/api/booking/admin/stats', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).then(res => {
          if (!res.ok) throw new Error(`Booking service error: ${res.status}`);
          return res.json();
        })
      ]);

      const stats: DashboardStats = {
        totalUsers: userStats.data?.totalUsers || 0,
        totalEvents: eventStats.data?.totalEvents || 0,
        activeEvents: eventStats.data?.activeEvents || 0,
        totalRegistrations: bookingStats.data?.totalRegistrations || 0
      };

      logger.info(LOGGER_COMPONENT_NAME, 'Dashboard statistics retrieved', stats);
      return stats;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch dashboard statistics', error as Error);
      throw error;
    }
  }

  // User Management
  async getAllUsers(filters?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Array<{
      id: string;
      name: string | null;
      email: string;
      role: string;
      isActive: boolean;
      emailVerified: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Fetching users', filters);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.role && filters.role !== 'ALL') params.append('role', filters.role);
      if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const queryString = params.toString();
      const url = `/api/auth/admin/users${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      logger.info(LOGGER_COMPONENT_NAME, 'Users retrieved', { 
        count: result.data.length,
        pagination: result.pagination
      });
      
      return {
        data: result.data || [],
        pagination: result.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch users', error as Error);
      throw error;
    }
  }

  async getUserEventCounts(): Promise<Record<string, number>> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Fetching user event counts');
      
      const response = await fetch('/api/booking/admin/users/event-counts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      logger.info(LOGGER_COMPONENT_NAME, 'User event counts retrieved');
      return result.data || {};
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch user event counts', error as Error);
      throw error;
    }
  }

  async getAttendanceStats(): Promise<{
    totalRegistrations: number;
    totalAttended: number;
    attendancePercentage: number;
  }> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Fetching attendance statistics');
      
      const response = await fetch('/api/booking/admin/attendance-stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      logger.info(LOGGER_COMPONENT_NAME, 'Attendance statistics retrieved', result.data);
      
      return result.data || {
        totalRegistrations: 0,
        totalAttended: 0,
        attendancePercentage: 0
      };
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch attendance statistics', error as Error);
      throw error;
    }
  }

  // Reports
  async getReportsData(): Promise<{
    totalEvents: number;
    totalUsers: number;
    totalRegistrations: number;
    averageAttendance: number;
    topEvents: Array<{
      eventId: string;
      name?: string;
      registrations: number;
      attendance: number;
    }>;
    eventStats: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    userGrowth: Array<{
      month: string;
      users: number;
      newUsers: number;
    }>;
  }> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Fetching reports data');
      
      const [dashboardStats, attendanceStats, topEventsResponse, eventStatusResponse, userGrowthResponse] = await Promise.all([
        this.getDashboardStats(),
        this.getAttendanceStats(),
        fetch('/api/booking/admin/reports/top-events', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getToken()}`,
            'Content-Type': 'application/json',
          },
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        }),
        fetch('/api/event/admin/reports/event-status', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getToken()}`,
            'Content-Type': 'application/json',
          },
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        }),
        fetch('/api/auth/admin/reports/user-growth', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getToken()}`,
            'Content-Type': 'application/json',
          },
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
      ]);

      // Fetch event names for top events
      const topEventsWithNames = await Promise.all(
        (topEventsResponse.data || []).map(async (event: { eventId: string; registrations: number; attended: number; attendancePercentage: number }) => {
          try {
            const eventResponse = await fetch(`/api/event/events/${event.eventId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${this.getToken()}`,
                'Content-Type': 'application/json',
              },
            });
            if (eventResponse.ok) {
              const eventData = await eventResponse.json();
              return {
                eventId: event.eventId,
                name: eventData.data?.name || `Event ${event.eventId.substring(0, 8)}`,
                registrations: event.registrations,
                attendance: event.attendancePercentage
              };
            }
          } catch (err) {
            logger.warn(LOGGER_COMPONENT_NAME, 'Failed to fetch event name', { eventId: event.eventId });
          }
          return {
            eventId: event.eventId,
            name: `Event ${event.eventId.substring(0, 8)}`,
            registrations: event.registrations,
            attendance: event.attendancePercentage
          };
        })
      );

      logger.info(LOGGER_COMPONENT_NAME, 'Reports data retrieved successfully');
      
      return {
        totalEvents: dashboardStats.totalEvents,
        totalUsers: dashboardStats.totalUsers,
        totalRegistrations: dashboardStats.totalRegistrations,
        averageAttendance: attendanceStats.attendancePercentage,
        topEvents: topEventsWithNames,
        eventStats: eventStatusResponse.data || [],
        userGrowth: userGrowthResponse.data || []
      };
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch reports data', error as Error);
      throw error;
    }
  }

  // Override getToken to return string instead of string | null
  public getToken(): string {
    const token = super.getToken();
    return token || '';
  }
}

export const adminApiClient = new AdminApiClient();
