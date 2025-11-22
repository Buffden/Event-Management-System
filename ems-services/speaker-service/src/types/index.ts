// Speaker-related types
export interface SpeakerProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  bio: string | null;
  expertise: string[];
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export interface SpeakerSearchRequest {
  query?: string;
  expertise?: string[];
  isAvailable?: boolean;
  limit?: number;
  offset?: number;
}

// Import Prisma-generated enum
import { InvitationStatus } from '../../generated/prisma/enums';

// Re-export for convenience
export { InvitationStatus };

// Invitation-related types
export interface SpeakerInvitation {
  id: string;
  speakerId: string;
  eventId: string;
  sessionId?: string | null;
  message?: string | null;
  status: InvitationStatus;
  sentAt: Date;
  respondedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvitationRequest {
  speakerId: string;
  eventId: string;
  sessionId?: string; // Optional: for session-specific invitations
  message?: string;
}

export interface RespondToInvitationRequest {
  status: InvitationStatus;
  message?: string;
}

// Message-related types
export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  subject: string;
  content: string;
  threadId?: string | null;
  eventId?: string | null;
  status: 'SENT' | 'DELIVERED' | 'READ';
  sentAt: Date;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMessageRequest {
  fromUserId: string;
  toUserId: string;
  subject: string;
  content: string;
  threadId?: string;
  eventId?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
}

export interface MessageThread {
  threadId: string;
  participants: string[];
  messages: Message[];
  lastMessageAt: Date;
}

// Material-related types
export interface PresentationMaterial {
  id: string;
  speakerId: string;
  eventId?: string | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadDate: Date;
}

export interface UploadMaterialRequest {
  speakerId: string;
  eventId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// API Response types
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

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

// Error types
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
