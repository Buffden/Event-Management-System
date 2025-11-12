import { prisma } from '../database';
import { logger } from '../utils/logger';
import {
  SpeakerInvitation,
  CreateInvitationRequest,
  RespondToInvitationRequest
} from '../types';
import { InvitationStatus } from '../../generated/prisma';

export class InvitationService {
  /**
   * Create a new speaker invitation
   */
  async createInvitation(data: CreateInvitationRequest): Promise<SpeakerInvitation> {
    try {
      logger.info('Creating speaker invitation', {
        speakerId: data.speakerId,
        eventId: data.eventId,
        sessionId: data.sessionId
      });

      // Check if speaker exists
      const speaker = await prisma.speakerProfile.findUnique({
        where: { id: data.speakerId }
      });

      if (!speaker) {
        throw new Error('Speaker not found');
      }

      // If sessionId is provided, check for session-specific invitation
      if (data.sessionId) {
        try {
          const existingSessionInvitation = await prisma.speakerInvitation.findUnique({
            where: {
              sessionId_speakerId: {
                sessionId: data.sessionId,
                speakerId: data.speakerId,
              }
            }
          });

          if (existingSessionInvitation) {
            // If an invitation already exists, delete it first (this handles the case where
            // a previous deletion failed, leaving a stale invitation)
            logger.info('Found existing invitation for session and speaker, deleting it', {
              invitationId: existingSessionInvitation.id,
              sessionId: data.sessionId,
              speakerId: data.speakerId,
            });

            await prisma.speakerInvitation.delete({
              where: { id: existingSessionInvitation.id }
            });

            logger.info('Deleted existing invitation, will create a new one', {
              sessionId: data.sessionId,
              speakerId: data.speakerId,
            });
          }
        } catch (error) {
          // If the unique constraint doesn't exist or there's an error, log and continue
          // This handles cases where the migration hasn't been applied yet
          logger.warn('Error checking for existing session invitation (may be due to missing migration)', {
            sessionId: data.sessionId,
            speakerId: data.speakerId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } else {
        // For event-level invitations (backward compatibility), check event-level duplicates
        // If an invitation exists, we'll update it instead of creating a new one
        const existingInvitation = await prisma.speakerInvitation.findFirst({
          where: {
            speakerId: data.speakerId,
            eventId: data.eventId,
            sessionId: null, // Only check event-level invitations
          }
        });

        if (existingInvitation) {
          // Update the existing invitation to reset it to PENDING and update the message
          logger.info('Found existing event-level invitation, updating it', {
            invitationId: existingInvitation.id,
            speakerId: data.speakerId,
            eventId: data.eventId,
          });

          const updatedInvitation = await prisma.speakerInvitation.update({
            where: { id: existingInvitation.id },
            data: {
              message: data.message || null,
              status: InvitationStatus.PENDING,
              sentAt: new Date(),
              respondedAt: null,
              updatedAt: new Date(),
            }
          });

          logger.info('Updated existing event-level invitation', {
            invitationId: updatedInvitation.id,
            speakerId: data.speakerId,
            eventId: data.eventId,
          });

          return updatedInvitation;
        }
      }

      // Try to create the invitation
      // If it fails due to unique constraint violation, try to delete and recreate
      let invitation;
      try {
        invitation = await prisma.speakerInvitation.create({
        data: {
          speakerId: data.speakerId,
          eventId: data.eventId,
            sessionId: data.sessionId || null,
          message: data.message || null,
          status: InvitationStatus.PENDING
        }
      });
      } catch (createError: any) {
        // If creation fails due to unique constraint (P2002), try to handle it
        if (createError?.code === 'P2002' && data.sessionId) {
          logger.info('Invitation creation failed due to unique constraint, attempting to update existing invitation', {
            sessionId: data.sessionId,
            speakerId: data.speakerId,
          });

          // Try to find and update the existing invitation
          const existingInvitation = await prisma.speakerInvitation.findFirst({
            where: {
              sessionId: data.sessionId,
              speakerId: data.speakerId,
            }
          });

          if (existingInvitation) {
            // Update the existing invitation to reset it to PENDING
            invitation = await prisma.speakerInvitation.update({
              where: { id: existingInvitation.id },
              data: {
                message: data.message || null,
                status: InvitationStatus.PENDING,
                sentAt: new Date(),
                respondedAt: null,
                updatedAt: new Date(),
              }
            });

            logger.info('Updated existing invitation', {
              invitationId: invitation.id,
              sessionId: data.sessionId,
              speakerId: data.speakerId,
            });
          } else {
            // If we can't find it, re-throw the original error
            throw createError;
          }
        } else {
          // For other errors, re-throw
          throw createError;
        }
      }

      logger.info('Speaker invitation created/updated successfully', {
        invitationId: invitation.id,
        speakerId: data.speakerId,
        eventId: data.eventId,
        sessionId: data.sessionId
      });

      return invitation;
    } catch (error) {
      logger.error('Error creating speaker invitation', error as Error);
      throw error;
    }
  }

  /**
   * Get invitation by ID
   */
  async getInvitationById(id: string): Promise<SpeakerInvitation | null> {
    try {
      logger.debug('Retrieving invitation', { invitationId: id });

      const invitation = await prisma.speakerInvitation.findUnique({
        where: { id }
      });

      return invitation;
    } catch (error) {
      logger.error('Error retrieving invitation', error as Error);
      throw error;
    }
  }

  /**
   * Get invitations for a speaker with search, filters, and pagination
   */
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
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      logger.debug('Retrieving speaker invitations', { speakerId, filters });

      const { search, status, page = 1, limit = 20 } = filters || {};
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { speakerId };

      // Status filter
      if (status && status !== 'ALL') {
        where.status = status.toUpperCase();
      }

      // Fetch all invitations matching the status filter
      // Note: Event search is not available in backend since Event is in a different service/database
      // Search filtering by event name/description will be handled client-side
      let allInvitations = await prisma.speakerInvitation.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        }
      });

      // If search is provided, we need to filter by event details
      // Since Event is in a different service, we'll need to fetch event details
      // For now, we'll apply search on eventId if it matches (simplified)
      // Client-side can do more sophisticated search on event details
      if (search) {
        const searchLower = search.toLowerCase();
        // Simple search on eventId - client will handle full event name search
        allInvitations = allInvitations.filter((inv: SpeakerInvitation) =>
          inv.eventId.toLowerCase().includes(searchLower)
        );
      }

      const total = allInvitations.length;
      const totalPages = Math.ceil(total / limit);

      // Apply pagination
      const paginatedInvitations = allInvitations.slice(skip, skip + limit);

      // Return invitations without event data (event details are fetched separately by frontend)
      const invitations = paginatedInvitations;

      return {
        invitations,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error('Error retrieving speaker invitations', error as Error);
      throw error;
    }
  }

  /**
   * Get invitations for an event
   */
  async getEventInvitations(eventId: string): Promise<SpeakerInvitation[]> {
    try {
      logger.debug('Retrieving event invitations', { eventId });

      const invitations = await prisma.speakerInvitation.findMany({
        where: { eventId },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return invitations;
    } catch (error) {
      logger.error('Error retrieving event invitations', error as Error);
      throw error;
    }
  }

  /**
   * Respond to an invitation
   */
  async respondToInvitation(
    invitationId: string,
    data: RespondToInvitationRequest
  ): Promise<SpeakerInvitation> {
    try {
      logger.info('Responding to invitation', {
        invitationId,
        status: data.status
      });

      // Check if invitation exists and is pending
      const invitation = await prisma.speakerInvitation.findUnique({
        where: { id: invitationId }
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new Error('Invitation has already been responded to');
      }

      const updatedInvitation = await prisma.speakerInvitation.update({
        where: { id: invitationId },
        data: {
          status: data.status,
          respondedAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('Invitation response recorded successfully', {
        invitationId,
        status: data.status
      });

      return updatedInvitation;
    } catch (error) {
      logger.error('Error responding to invitation', error as Error);
      throw error;
    }
  }

  /**
   * Get pending invitations for a speaker
   */
  async getPendingInvitations(speakerId: string): Promise<SpeakerInvitation[]> {
    try {
      logger.debug('Retrieving pending invitations', { speakerId });

      const invitations = await prisma.speakerInvitation.findMany({
        where: {
          speakerId,
          status: InvitationStatus.PENDING
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return invitations;
    } catch (error) {
      logger.error('Error retrieving pending invitations', error as Error);
      throw error;
    }
  }

  /**
   * Get accepted invitations for a speaker
   */
  async getAcceptedInvitations(speakerId: string): Promise<SpeakerInvitation[]> {
    try {
      logger.debug('Retrieving accepted invitations', { speakerId });

      const invitations = await prisma.speakerInvitation.findMany({
        where: {
          speakerId,
          status: InvitationStatus.ACCEPTED
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return invitations;
    } catch (error) {
      logger.error('Error retrieving accepted invitations', error as Error);
      throw error;
    }
  }

  /**
   * Delete an invitation
   */
  async deleteInvitation(id: string): Promise<void> {
    try {
      logger.info('Deleting invitation', { invitationId: id });

      await prisma.speakerInvitation.delete({
        where: { id }
      });

      logger.info('Invitation deleted successfully', { invitationId: id });
    } catch (error) {
      logger.error('Error deleting invitation', error as Error);
      throw error;
    }
  }

  /**
   * Delete an invitation by sessionId and speakerId
   */
  async deleteInvitationBySessionAndSpeaker(sessionId: string, speakerId: string): Promise<void> {
    try {
      logger.info('Deleting invitation by session and speaker', { sessionId, speakerId });

      const invitation = await prisma.speakerInvitation.findUnique({
        where: {
          sessionId_speakerId: {
            sessionId,
            speakerId,
          }
        }
      });

      if (!invitation) {
        logger.warn('Invitation not found for session and speaker', { sessionId, speakerId });
        return; // No invitation found, nothing to delete
      }

      await prisma.speakerInvitation.delete({
        where: { id: invitation.id }
      });

      logger.info('Invitation deleted successfully by session and speaker', {
        invitationId: invitation.id,
        sessionId,
        speakerId
      });
    } catch (error) {
      logger.error('Error deleting invitation by session and speaker', error as Error);
      throw error;
    }
  }

  /**
   * Delete an invitation by eventId and speakerId (for backward compatibility)
   */
  async deleteInvitationByEventAndSpeaker(eventId: string, speakerId: string): Promise<void> {
    try {
      logger.info('Deleting invitation by event and speaker', { eventId, speakerId });

      const invitation = await prisma.speakerInvitation.findFirst({
        where: {
          eventId,
          speakerId,
          sessionId: null // Only event-level invitations
        }
      });

      if (!invitation) {
        logger.warn('Invitation not found for event and speaker', { eventId, speakerId });
        return; // No invitation found, nothing to delete
      }

      await prisma.speakerInvitation.delete({
        where: { id: invitation.id }
      });

      logger.info('Invitation deleted successfully by event and speaker', {
        invitationId: invitation.id,
        eventId,
        speakerId
      });
    } catch (error) {
      logger.error('Error deleting invitation by event and speaker', error as Error);
      throw error;
    }
  }

  /**
   * Get accepted invitations for a speaker with sessionIds (for overlap checking)
   */
  async getAcceptedInvitationsWithSessions(speakerId: string): Promise<SpeakerInvitation[]> {
    try {
      logger.debug('Retrieving accepted invitations with sessions', { speakerId });

      const invitations = await prisma.speakerInvitation.findMany({
        where: {
          speakerId,
          status: InvitationStatus.ACCEPTED,
          sessionId: {
            not: null // Only invitations with sessionIds
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return invitations;
    } catch (error) {
      logger.error('Error retrieving accepted invitations with sessions', error as Error);
      throw error;
    }
  }

  /**
   * Delete all invitations for an event (both session-specific and event-level)
   */
  async deleteAllInvitationsByEvent(eventId: string): Promise<number> {
    try {
      logger.info('Deleting all invitations for event', { eventId });

      const result = await prisma.speakerInvitation.deleteMany({
        where: {
          eventId
        }
      });

      logger.info('Deleted all invitations for event', {
        eventId,
        deletedCount: result.count
      });

      return result.count;
    } catch (error) {
      logger.error('Error deleting all invitations for event', error as Error, { eventId });
      throw error;
    }
  }

  /**
   * Get invitation statistics for a speaker
   */
  async getSpeakerInvitationStats(speakerId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
  }> {
    try {
      logger.debug('Retrieving speaker invitation stats', { speakerId });

      const [total, pending, accepted, declined, expired] = await Promise.all([
        prisma.speakerInvitation.count({ where: { speakerId } }),
        prisma.speakerInvitation.count({
          where: { speakerId, status: InvitationStatus.PENDING }
        }),
        prisma.speakerInvitation.count({
          where: { speakerId, status: InvitationStatus.ACCEPTED }
        }),
        prisma.speakerInvitation.count({
          where: { speakerId, status: InvitationStatus.DECLINED }
        }),
        prisma.speakerInvitation.count({
          where: { speakerId, status: InvitationStatus.EXPIRED }
        })
      ]);

      return {
        total,
        pending,
        accepted,
        declined,
        expired
      };
    } catch (error) {
      logger.error('Error retrieving speaker invitation stats', error as Error);
      throw error;
    }
  }
}
