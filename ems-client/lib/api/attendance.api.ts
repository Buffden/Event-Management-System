import { BaseApiClient } from './base-api.client';

export interface JoinEventRequest {
  eventId: string;
}

export interface JoinEventResponse {
  success: boolean;
  message: string;
  joinedAt?: string;
  isFirstJoin: boolean;
}

export interface LiveAttendanceResponse {
  eventId: string;
  totalRegistered: number;
  totalAttended: number;
  attendancePercentage: number;
  attendees: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    joinedAt: string;
    isAttended: boolean;
  }>;
}

export interface AttendanceMetricsResponse {
  eventId: string;
  totalAttended: number;
  totalRegistered: number;
  attendancePercentage: number;
}

export interface SpeakerJoinEventRequest {
  eventId: string;
}

export interface SpeakerJoinEventResponse {
  success: boolean;
  message: string;
  joinedAt?: string;
  isFirstJoin: boolean;
}

export interface UpdateMaterialsRequest {
  materialIds: string[];
}

export interface UpdateMaterialsResponse {
  success: boolean;
  message: string;
}

export interface SpeakerAttendanceResponse {
  eventId: string;
  totalSpeakersInvited: number;
  totalSpeakersJoined: number;
  speakers: Array<{
    speakerId: string;
    speakerName: string;
    speakerEmail: string;
    joinedAt: string;
    isAttended: boolean;
    materialsSelected: string[];
  }>;
}

export interface AvailableMaterialsResponse {
  invitationId: string;
  eventId: string;
  speakerId: string;
  availableMaterials: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadDate: string;
  }>;
  selectedMaterials: string[];
}

export class AttendanceApiClient extends BaseApiClient {
  protected readonly LOGGER_COMPONENT_NAME = 'AttendanceApiClient';
  private readonly baseUrl: string;

  constructor() {
    const baseUrl = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || 'http://localhost/api/booking';
    super(baseUrl);
    this.baseUrl = baseUrl;
  }

  // ==================== ATTENDEE ATTENDANCE ====================

  /**
   * Join an event as an attendee
   */
  async joinEvent(eventId: string): Promise<JoinEventResponse> {
    const response = await this.request<JoinEventResponse>('/attendance/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: JSON.stringify({ eventId })
    });

    return response;
  }

  /**
   * Get live attendance data for an event (admin/speaker only)
   */
  async getLiveAttendance(eventId: string): Promise<LiveAttendanceResponse> {
    const response = await this.request<LiveAttendanceResponse>(`/attendance/live/${eventId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });

    return response;
  }

  /**
   * Get basic attendance metrics (all users)
   */
  async getAttendanceMetrics(eventId: string): Promise<AttendanceMetricsResponse> {
    const response = await this.request<AttendanceMetricsResponse>(`/attendance/metrics/${eventId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });

    return response;
  }

  /**
   * Get attendance summary for reporting (admin/speaker only)
   */
  async getAttendanceSummary(eventId: string): Promise<{
    eventId: string;
    totalRegistered: number;
    totalAttended: number;
    attendancePercentage: number;
    joinTimes: Array<{ time: string; count: number }>;
  }> {
    const response = await this.request<{ eventId: string; totalRegistered: number; totalAttended: number; attendancePercentage: number; joinTimes: { time: string; count: number; }[]; }>(`/attendance/summary/${eventId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });

    return response;
  }

  // ==================== SPEAKER ATTENDANCE ====================

  /**
   * Join an event as an admin (no booking required)
   */
  async adminJoinEvent(eventId: string): Promise<JoinEventResponse> {
    const response = await this.request<JoinEventResponse>('/attendance/admin/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: JSON.stringify({ eventId })
    });

    return response;
  }

  /**
   * Join an event as a speaker
   */
  async speakerJoinEvent(eventId: string): Promise<SpeakerJoinEventResponse> {
    const speakerServiceUrl = process.env.NEXT_PUBLIC_SPEAKER_SERVICE_URL || 'http://localhost/api/speaker-attendance';
    
    const response = await this.request<SpeakerJoinEventResponse>(`${speakerServiceUrl}/api/speaker-attendance/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: JSON.stringify({ eventId })
    });

    return response;
  }

  /**
   * Update materials selected for an event
   */
  async updateMaterialsForEvent(invitationId: string, materialIds: string[]): Promise<UpdateMaterialsResponse> {
    const speakerServiceUrl = process.env.NEXT_PUBLIC_SPEAKER_SERVICE_URL || 'http://localhost/api/speaker-attendance';
    
    const response = await this.request<UpdateMaterialsResponse>(`${speakerServiceUrl}/api/speaker-attendance/materials/${invitationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: JSON.stringify({ materialIds })
    });

    return response;
  }

  /**
   * Get speaker attendance data for an event (admin/speaker only)
   */
  async getSpeakerAttendance(eventId: string): Promise<SpeakerAttendanceResponse> {
    const speakerServiceUrl = process.env.NEXT_PUBLIC_SPEAKER_SERVICE_URL || 'http://localhost/api/speaker-attendance';
    
    const response = await this.request<SpeakerAttendanceResponse>(`${speakerServiceUrl}/api/speaker-attendance/${eventId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });

    return response;
  }

  /**
   * Get available materials for selection
   */
  async getAvailableMaterials(invitationId: string): Promise<AvailableMaterialsResponse> {
    const speakerServiceUrl = process.env.NEXT_PUBLIC_SPEAKER_SERVICE_URL || 'http://localhost/api/speaker-attendance';
    
    const response = await this.request<AvailableMaterialsResponse>(`${speakerServiceUrl}/api/speaker-attendance/materials/${invitationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });

    return response;
  }
}

export const attendanceApiClient = new AttendanceApiClient();
