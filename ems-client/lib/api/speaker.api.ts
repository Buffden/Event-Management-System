import { BaseApiClient } from './base-api.client';

const LOGGER_COMPONENT_NAME = 'SpeakerApiClient';

// Speaker-related types
export interface SpeakerProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  bio: string | null;
  expertise: string[];
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SpeakerSearchRequest {
  query?: string;
  expertise?: string[];
  isAvailable?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateSpeakerProfileRequest {
  userId: string;
  name: string;
  email: string;
  bio?: string;
  expertise?: string[];
  isAvailable?: boolean;
}

export interface UpdateSpeakerProfileRequest {
  name?: string;
  bio?: string;
  expertise?: string[];
  isAvailable?: boolean;
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

export interface CreateInvitationRequest {
  speakerId: string;
  eventId: string;
  message?: string;
}

export interface RespondToInvitationRequest {
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  message?: string;
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  subject: string;
  content: string;
  threadId?: string | null;
  sentAt: string;
  readAt?: string | null;
  createdAt: string;
}

export interface CreateMessageRequest {
  fromUserId: string;
  toUserId: string;
  subject: string;
  content: string;
  threadId?: string;
}

export interface MessageThread {
  threadId: string;
  participants: string[];
  messages: Message[];
  lastMessageAt: string;
}

export interface PresentationMaterial {
  id: string;
  speakerId: string;
  eventId?: string | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadDate: string;
}

export interface UploadMaterialRequest {
  speakerId: string;
  eventId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Speaker API client class
class SpeakerApiClient extends BaseApiClient {
  protected readonly LOGGER_COMPONENT_NAME = LOGGER_COMPONENT_NAME;

  constructor() {
    super('/api/speakers');
  }

  // Speaker Profile Management
  async getSpeakerProfile(userId: string): Promise<SpeakerProfile> {
    const result = await this.request<{ success: boolean; data: SpeakerProfile; timestamp: string }>(`/profile/me?userId=${userId}`);
    return result.data;
  }

  async getSpeakerById(speakerId: string): Promise<SpeakerProfile> {
    const result = await this.request<{ success: boolean; data: SpeakerProfile; timestamp: string }>(`/${speakerId}`);
    return result.data;
  }

  async createSpeakerProfile(data: CreateSpeakerProfileRequest): Promise<SpeakerProfile> {
    const result = await this.request<{ success: boolean; data: SpeakerProfile; message: string; timestamp: string }>('/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.data;
  }

  async updateSpeakerProfile(speakerId: string, data: UpdateSpeakerProfileRequest): Promise<SpeakerProfile> {
    const result = await this.request<{ success: boolean; data: SpeakerProfile; message: string; timestamp: string }>(`/${speakerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.data;
  }

  async searchSpeakers(filters: SpeakerSearchRequest): Promise<SpeakerProfile[]> {
    const params = new URLSearchParams();
    if (filters.query) params.append('query', filters.query);
    if (filters.expertise?.length) params.append('expertise', filters.expertise.join(','));
    if (filters.isAvailable !== undefined) params.append('isAvailable', filters.isAvailable.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    return this.request<SpeakerProfile[]>(`/?${params.toString()}`);
  }

  // Invitation Management - use direct API calls to /api/invitations
  async getSpeakerInvitations(
    speakerId: string, 
    filters?: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    invitations: SpeakerInvitation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());

    const url = `/api/invitations/speaker/${speakerId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
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
    return {
      invitations: result.data || [],
      pagination: result.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      }
    };
  }

  async getPendingInvitations(speakerId: string): Promise<SpeakerInvitation[]> {
    const response = await fetch(`/api/invitations/speaker/${speakerId}?status=pending`, {
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
    return result.data || [];
  }

  async respondToInvitation(invitationId: string, response: RespondToInvitationRequest): Promise<SpeakerInvitation> {
    const fetchResponse = await fetch(`/api/invitations/${invitationId}/respond`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    });
    
    if (!fetchResponse.ok) {
      throw new Error(`HTTP error! status: ${fetchResponse.status}`);
    }
    
    const result = await fetchResponse.json();
    return result.data;
  }

  async getInvitationStats(speakerId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
  }> {
    const response = await fetch(`/api/invitations/speaker/${speakerId}/stats`, {
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
    return result.data || { total: 0, pending: 0, accepted: 0, declined: 0, expired: 0 };
  }

  // Messaging - use direct API calls to /api/messages
  async getUserMessages(userId: string, limit = 50, offset = 0): Promise<Message[]> {
    const response = await fetch(`${this.baseURL.replace('/api/speakers', '/api/messages')}/inbox/${userId}?limit=${limit}&offset=${offset}`, {
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
    return result.data || [];
  }

  async getSentMessages(userId: string, limit = 50, offset = 0): Promise<Message[]> {
    const response = await fetch(`${this.baseURL.replace('/api/speakers', '/api/messages')}/sent/${userId}?limit=${limit}&offset=${offset}`, {
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
    return result.data || [];
  }

  async getUserThreads(userId: string, limit = 20, offset = 0): Promise<MessageThread[]> {
    const response = await fetch(`${this.baseURL.replace('/api/speakers', '/api/messages')}/threads/${userId}?limit=${limit}&offset=${offset}`, {
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
    return result.data || [];
  }

  async getConversation(userId1: string, userId2: string): Promise<MessageThread | null> {
    const response = await fetch(`${this.baseURL.replace('/api/speakers', '/api/messages')}/conversation/${userId1}/${userId2}`, {
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
    return result.data || null;
  }

  async sendMessage(message: CreateMessageRequest): Promise<Message> {
    const response = await fetch(`${this.baseURL.replace('/api/speakers', '/api/messages')}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
  }

  async markMessageAsRead(messageId: string): Promise<Message> {
    const response = await fetch(`${this.baseURL.replace('/api/speakers', '/api/messages')}/${messageId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
  }

  async getUnreadMessageCount(userId: string): Promise<{ count: number }> {
    const response = await fetch(`${this.baseURL.replace('/api/speakers', '/api/messages')}/unread/${userId}/count`, {
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
    return result.data || { count: 0 };
  }

  // Material Management - use direct API calls to /api/materials
  async getSpeakerMaterials(speakerId: string): Promise<PresentationMaterial[]> {
    const response = await fetch(`/api/materials/speaker/${speakerId}`, {
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
    return result.data || [];
  }

  async uploadMaterial(file: File, speakerId: string, eventId?: string): Promise<PresentationMaterial> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('speakerId', speakerId);
    if (eventId) formData.append('eventId', eventId);

    const response = await fetch('/api/materials/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async downloadMaterial(materialId: string): Promise<Blob> {
    const response = await fetch(`/api/materials/${materialId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download material: ${response.statusText}`);
    }

    return response.blob();
  }

  async deleteMaterial(materialId: string): Promise<void> {
    const response = await fetch(`/api/materials/${materialId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async getMaterialStats(speakerId: string): Promise<{
    totalMaterials: number;
    totalSize: number;
    materialsByType: { [mimeType: string]: number };
  }> {
    const response = await fetch(`/api/materials/speaker/${speakerId}/stats`, {
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
    return result.data || { totalMaterials: 0, totalSize: 0, materialsByType: {} };
  }

  // Override getToken to return string instead of string | null
  public getToken(): string {
    const token = super.getToken();
    return token || '';
  }
}

export const speakerApiClient = new SpeakerApiClient();
