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

  // Override getToken to return string instead of string | null
  public getToken(): string {
    const token = super.getToken();
    return token || '';
  }
}

export const adminApiClient = new AdminApiClient();
