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

  /**
   * Get list of users with pagination and filtering
   */
  async getUsers(options: {
    page?: number;
    limit?: number;
    role?: 'ADMIN' | 'USER' | 'SPEAKER';
    isActive?: boolean;
    search?: string;
  } = {}): Promise<{
    users: Array<{
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: 'ADMIN' | 'USER' | 'SPEAKER';
      isActive: boolean;
      emailVerified: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Fetching users list', options);
      
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.role) params.append('role', options.role);
      if (options.isActive !== undefined) params.append('isActive', options.isActive.toString());
      if (options.search) params.append('search', options.search);

      const response = await fetch(`/api/auth/admin/users?${params.toString()}`, {
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
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }
      
      logger.info(LOGGER_COMPONENT_NAME, 'Users list retrieved successfully', { 
        count: result.data.users.length,
        total: result.data.total 
      });
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch users', error as Error);
      throw error;
    }
  }

  /**
   * Get user statistics (total counts by role and status)
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    admins: number;
    users: number;
    speakers: number;
  }> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Fetching user statistics');
      
      const response = await fetch('/api/auth/admin/users/stats', {
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
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user statistics');
      }
      
      logger.info(LOGGER_COMPONENT_NAME, 'User statistics retrieved successfully', result.data);
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch user statistics', error as Error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics for admin
   */
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalEvents: number;
    activeEvents: number;
    totalRegistrations: number;
    upcomingEvents: number;
  }> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Fetching admin dashboard stats');
      
      const response = await fetch('/api/booking/admin/dashboard/stats', {
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
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard stats');
      }
      
      logger.info(LOGGER_COMPONENT_NAME, 'Dashboard stats retrieved successfully', result.data);
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch dashboard stats', error as Error);
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
