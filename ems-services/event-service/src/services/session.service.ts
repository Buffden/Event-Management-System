import { prisma } from '../database';
import { logger } from '../utils/logger';
import { httpError } from '../utils/http-error';
import {
  CreateSessionRequest,
  SessionResponse,
  SessionSpeakerAssignRequest,
  SessionSpeakerResponse,
  SessionSpeakerUpdateRequest,
  UpdateSessionRequest,
} from '../types';
import { SessionSpeakerMaterialsStatus } from '../../generated/prisma';
import axios from 'axios';

class SessionService {
  private readonly LOGGER_COMPONENT_NAME = 'SessionService';
  private readonly speakerServiceUrl: string;

  constructor() {
    this.speakerServiceUrl = process.env.GATEWAY_URL
      ? `${process.env.GATEWAY_URL}/api/speaker`
      : 'http://ems-gateway/api/speaker';
  }

  private mapSession(session: any): SessionResponse {
    return {
      id: session.id,
      eventId: session.eventId,
      title: session.title,
      description: session.description ?? null,
      startsAt: session.startsAt instanceof Date ? session.startsAt.toISOString() : session.startsAt,
      endsAt: session.endsAt instanceof Date ? session.endsAt.toISOString() : session.endsAt,
      stage: session.stage ?? null,
      createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
      updatedAt: session.updatedAt instanceof Date ? session.updatedAt.toISOString() : session.updatedAt,
      speakers: Array.isArray(session.speakers)
        ? session.speakers.map((speaker: any) => this.mapSessionSpeaker(speaker))
        : [],
    };
  }

  private mapSessionSpeaker(speaker: any): SessionSpeakerResponse {
    return {
      id: speaker.id,
      sessionId: speaker.sessionId,
      speakerId: speaker.speakerId,
      materialsAssetId: speaker.materialsAssetId ?? null,
      materialsStatus: speaker.materialsStatus,
      speakerCheckinConfirmed: speaker.speakerCheckinConfirmed,
      specialNotes: speaker.specialNotes ?? null,
      createdAt: speaker.createdAt instanceof Date ? speaker.createdAt.toISOString() : speaker.createdAt,
      updatedAt: speaker.updatedAt instanceof Date ? speaker.updatedAt.toISOString() : speaker.updatedAt,
    };
  }

  private validateSchedule(start: Date, end: Date) {
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid session schedule');
    }

    if (start >= end) {
      throw new Error('Session start time must be before end time');
    }
  }

  async listSessions(eventId: string): Promise<SessionResponse[]> {
    logger.info(`${this.LOGGER_COMPONENT_NAME}: Fetching sessions for event`, { eventId });

    const sessions = await prisma.session.findMany({
      where: { eventId },
      include: {
        speakers: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    return sessions.map((session) => this.mapSession(session));
  }

  async createSession(eventId: string, payload: CreateSessionRequest): Promise<SessionResponse> {
    logger.info(`${this.LOGGER_COMPONENT_NAME}: Creating session`, { eventId, payload });

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        bookingStartDate: true,
        bookingEndDate: true,
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const startsAt = new Date(payload.startsAt);
    const endsAt = new Date(payload.endsAt);
    this.validateSchedule(startsAt, endsAt);

    if (startsAt < event.bookingStartDate || endsAt > event.bookingEndDate) {
      throw new Error('Session schedule must fall within the event booking window');
    }

    const session = await prisma.session.create({
      data: {
        eventId,
        title: payload.title,
        description: payload.description ?? null,
        startsAt,
        endsAt,
        stage: payload.stage ?? null,
      },
      include: {
        speakers: true,
      },
    });

    return this.mapSession(session);
  }

  async updateSession(eventId: string, sessionId: string, payload: UpdateSessionRequest): Promise<SessionResponse> {
    logger.info(`${this.LOGGER_COMPONENT_NAME}: Updating session`, { eventId, sessionId, payload });

    const session = await prisma.session.findFirst({
      where: { id: sessionId, eventId },
      include: { event: true },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const updateData: any = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.description !== undefined) updateData.description = payload.description ?? null;
    if (payload.stage !== undefined) updateData.stage = payload.stage ?? null;

    if (payload.startsAt !== undefined || payload.endsAt !== undefined) {
      const startsAt = payload.startsAt ? new Date(payload.startsAt) : session.startsAt;
      const endsAt = payload.endsAt ? new Date(payload.endsAt) : session.endsAt;
      this.validateSchedule(startsAt, endsAt);

      if (startsAt < session.event.bookingStartDate || endsAt > session.event.bookingEndDate) {
        throw new Error('Session schedule must fall within the event booking window');
      }

      updateData.startsAt = startsAt;
      updateData.endsAt = endsAt;
    }

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        speakers: true,
      },
    });

    return this.mapSession(updatedSession);
  }

  async deleteSession(eventId: string, sessionId: string): Promise<void> {
    logger.info(`${this.LOGGER_COMPONENT_NAME}: Deleting session`, { eventId, sessionId });

    const session = await prisma.session.findFirst({
      where: { id: sessionId, eventId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    await prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async assignSpeaker(
    eventId: string,
    sessionId: string,
    payload: SessionSpeakerAssignRequest
  ): Promise<SessionSpeakerResponse> {
    logger.info(`${this.LOGGER_COMPONENT_NAME}: Assigning speaker to session`, { eventId, sessionId, payload });

    const session = await prisma.session.findFirst({
      where: { id: sessionId, eventId },
    });

    if (!session) {
      throw httpError(404, 'Session not found');
    }

    const existingAssignment = await prisma.sessionSpeaker.findFirst({
      where: {
        sessionId,
        speakerId: payload.speakerId,
      },
    });

    if (existingAssignment) {
      throw httpError(409, 'Speaker already assigned to this session');
    }

    // Check for overlapping accepted invitations
    try {
      const acceptedInvitationsResponse = await axios.get(
        `${this.speakerServiceUrl}/internal/invitations/speaker/${payload.speakerId}/accepted-sessions`,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'x-internal-service': 'event-service',
          },
        }
      );

      if (acceptedInvitationsResponse.status === 200 && acceptedInvitationsResponse.data.success) {
        const acceptedInvitations = acceptedInvitationsResponse.data.data || [];
        
        // Get sessions for accepted invitations to check for overlaps
        if (acceptedInvitations.length > 0) {
          const acceptedSessionIds = acceptedInvitations
            .map((inv: any) => inv.sessionId)
            .filter((id: string | null) => id !== null);

          if (acceptedSessionIds.length > 0) {
            const acceptedSessions = await prisma.session.findMany({
              where: {
                id: {
                  in: acceptedSessionIds,
                },
              },
            });

            // Check for time overlap
            const newSessionStart = new Date(session.startsAt);
            const newSessionEnd = new Date(session.endsAt);

            for (const acceptedSession of acceptedSessions) {
              const acceptedStart = new Date(acceptedSession.startsAt);
              const acceptedEnd = new Date(acceptedSession.endsAt);

              // Check if sessions overlap: sessions overlap if one starts before the other ends
              // and one ends after the other starts
              if (newSessionStart < acceptedEnd && newSessionEnd > acceptedStart) {
                throw httpError(
                  409,
                  `Speaker has an accepted invitation for an overlapping session (${acceptedSession.title})`
                );
              }
            }
          }
        }
      }
    } catch (error) {
      // If it's an httpError, re-throw it
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }
      // Log warning but continue if speaker-service is unavailable
      // We don't want to block assignments if the service is down
      if (axios.isAxiosError(error)) {
        logger.warn(`${this.LOGGER_COMPONENT_NAME}: Could not check for overlapping invitations`, {
          speakerId: payload.speakerId,
          sessionId,
          error: error.message,
        });
      } else {
        logger.warn(`${this.LOGGER_COMPONENT_NAME}: Error checking for overlapping invitations`, {
          speakerId: payload.speakerId,
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Create the session speaker assignment
    const assignment = await prisma.sessionSpeaker.create({
      data: {
        sessionId,
        speakerId: payload.speakerId,
        materialsAssetId: payload.materialsAssetId ?? null,
        materialsStatus: payload.materialsStatus ?? SessionSpeakerMaterialsStatus.REQUESTED,
        speakerCheckinConfirmed: payload.speakerCheckinConfirmed ?? false,
        specialNotes: payload.specialNotes ?? null,
      },
    });

    // Create invitation for this session assignment
    try {
      const invitationResponse = await axios.post(
        `${this.speakerServiceUrl}/internal/invitations`,
        {
          speakerId: payload.speakerId,
          eventId,
          sessionId,
          message: payload.specialNotes || `You have been invited to speak at session: ${session.title}`,
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'x-internal-service': 'event-service',
          },
        }
      );

      if (invitationResponse.status === 201 && invitationResponse.data.success) {
        logger.info(`${this.LOGGER_COMPONENT_NAME}: Invitation created for session assignment`, {
          invitationId: invitationResponse.data.data.id,
          speakerId: payload.speakerId,
          sessionId,
          eventId,
        });
      }
    } catch (error) {
      // Log error but don't fail the assignment if invitation creation fails
      if (axios.isAxiosError(error)) {
        if (error.response) {
          logger.warn(`${this.LOGGER_COMPONENT_NAME}: Failed to create invitation`, {
            speakerId: payload.speakerId,
            sessionId,
            status: error.response.status,
            message: error.response.data?.error || 'Unknown error',
          });
        } else {
          logger.warn(`${this.LOGGER_COMPONENT_NAME}: Speaker service unavailable when creating invitation`, {
            speakerId: payload.speakerId,
            sessionId,
            url: this.speakerServiceUrl,
          });
        }
      } else {
        logger.warn(`${this.LOGGER_COMPONENT_NAME}: Error creating invitation`, {
          speakerId: payload.speakerId,
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return this.mapSessionSpeaker(assignment);
  }

  async updateSpeakerAssignment(
    eventId: string,
    sessionId: string,
    speakerId: string,
    payload: SessionSpeakerUpdateRequest
  ): Promise<SessionSpeakerResponse> {
    logger.info(`${this.LOGGER_COMPONENT_NAME}: Updating session speaker assignment`, {
      eventId,
      sessionId,
      speakerId,
      payload,
    });

    const session = await prisma.session.findFirst({
      where: { id: sessionId, eventId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const assignment = await prisma.sessionSpeaker.update({
      where: {
        sessionId_speakerId: {
          sessionId,
          speakerId,
        },
      },
      data: {
        materialsAssetId: payload.materialsAssetId ?? undefined,
        materialsStatus: payload.materialsStatus ?? undefined,
        speakerCheckinConfirmed: payload.speakerCheckinConfirmed ?? undefined,
        specialNotes: payload.specialNotes ?? undefined,
      },
    });

    return this.mapSessionSpeaker(assignment);
  }

  async removeSpeaker(eventId: string, sessionId: string, speakerId: string): Promise<void> {
    logger.info(`${this.LOGGER_COMPONENT_NAME}: Removing speaker from session`, { eventId, sessionId, speakerId });

    const session = await prisma.session.findFirst({
      where: { id: sessionId, eventId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Delete the session speaker assignment
    await prisma.sessionSpeaker.delete({
      where: {
        sessionId_speakerId: {
          sessionId,
          speakerId,
        },
      },
    });

    // Delete the invitation for this specific session
    try {
      logger.info(`${this.LOGGER_COMPONENT_NAME}: Deleting invitation for session`, {
        sessionId,
        speakerId,
      });

      const response = await axios.delete(
        `${this.speakerServiceUrl}/internal/invitations/session/${sessionId}/speaker/${speakerId}`,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'x-internal-service': 'event-service',
          },
        }
      );

      if (response.status === 200 && response.data.success) {
        logger.info(`${this.LOGGER_COMPONENT_NAME}: Invitation deleted successfully`, {
          sessionId,
          speakerId,
        });
      }
    } catch (error) {
      // Log error but don't fail the removal if invitation deletion fails
      // The invitation might not exist or the service might be unavailable
      if (axios.isAxiosError(error)) {
        if (error.response) {
          logger.warn(`${this.LOGGER_COMPONENT_NAME}: Failed to delete invitation`, {
            sessionId,
            speakerId,
            status: error.response.status,
            message: error.response.data?.error || 'Unknown error',
          });
        } else if (error.request) {
          logger.warn(`${this.LOGGER_COMPONENT_NAME}: Speaker service unavailable when deleting invitation`, {
            sessionId,
            speakerId,
            url: this.speakerServiceUrl,
          });
        } else {
          logger.warn(`${this.LOGGER_COMPONENT_NAME}: Error deleting invitation`, {
            sessionId,
            speakerId,
            message: error.message,
          });
        }
      } else {
        logger.warn(`${this.LOGGER_COMPONENT_NAME}: Unexpected error deleting invitation`, {
          sessionId,
          speakerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}

export const sessionService = new SessionService();

