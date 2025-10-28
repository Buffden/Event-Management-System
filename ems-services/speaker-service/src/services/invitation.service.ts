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
        eventId: data.eventId 
      });

      // Check if speaker exists
      const speaker = await prisma.speakerProfile.findUnique({
        where: { id: data.speakerId }
      });

      if (!speaker) {
        throw new Error('Speaker not found');
      }

      // Check if invitation already exists for this speaker-event combination
      const existingInvitation = await prisma.speakerInvitation.findFirst({
        where: {
          speakerId: data.speakerId,
          eventId: data.eventId,
          status: {
            in: [InvitationStatus.PENDING, InvitationStatus.ACCEPTED]
          }
        }
      });

      if (existingInvitation) {
        throw new Error('Invitation already exists for this speaker and event');
      }

      const invitation = await prisma.speakerInvitation.create({
        data: {
          speakerId: data.speakerId,
          eventId: data.eventId,
          message: data.message || null,
          status: InvitationStatus.PENDING
        }
      });

      logger.info('Speaker invitation created successfully', { 
        invitationId: invitation.id,
        speakerId: data.speakerId,
        eventId: data.eventId
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
   * Get invitations for a speaker
   */
  async getSpeakerInvitations(speakerId: string): Promise<SpeakerInvitation[]> {
    try {
      logger.debug('Retrieving speaker invitations', { speakerId });

      const invitations = await prisma.speakerInvitation.findMany({
        where: { speakerId },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return invitations;
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
