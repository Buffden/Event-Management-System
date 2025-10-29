import { prisma } from '../database';
import { logger } from '../utils/logger';

export interface SpeakerJoinEventRequest {
  speakerId: string;
  eventId: string;
}

export interface SpeakerJoinEventResponse {
  success: boolean;
  message: string;
  joinedAt?: string;
  isFirstJoin: boolean;
}

export interface UpdateMaterialsRequest {
  invitationId: string;
  materialIds: string[];
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

export class SpeakerAttendanceService {
  /**
   * Speaker joins an event
   */
  async speakerJoinEvent(data: SpeakerJoinEventRequest): Promise<SpeakerJoinEventResponse> {
    try {
      logger.info('Processing speaker event join request', { 
        speakerId: data.speakerId, 
        eventId: data.eventId 
      });

      // Find the invitation for this speaker and event
      const invitation = await prisma.speakerInvitation.findFirst({
        where: {
          speakerId: data.speakerId,
          eventId: data.eventId,
          status: 'ACCEPTED'
        }
      });

      if (!invitation) {
        return {
          success: false,
          message: 'No accepted invitation found for this event',
          isFirstJoin: false
        };
      }

      // Check if this is the first time joining
      const isFirstJoin = !invitation.isAttended;

      // Update invitation with join information
      const updatedInvitation = await prisma.speakerInvitation.update({
        where: { id: invitation.id },
        data: {
          joinedAt: new Date(),
          isAttended: true
        }
      });

      logger.info('Speaker successfully joined event', { 
        invitationId: invitation.id,
        speakerId: data.speakerId,
        eventId: data.eventId,
        isFirstJoin
      });

      return {
        success: true,
        message: isFirstJoin ? 'Successfully joined the event!' : 'Rejoined the event',
        joinedAt: updatedInvitation.joinedAt?.toISOString(),
        isFirstJoin
      };

    } catch (error) {
      logger.error('Error speaker joining event', error as Error, { 
        speakerId: data.speakerId, 
        eventId: data.eventId 
      });
      throw error;
    }
  }

  /**
   * Update materials selected for an event
   */
  async updateMaterialsForEvent(data: UpdateMaterialsRequest): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Updating materials for event', { 
        invitationId: data.invitationId,
        materialCount: data.materialIds.length
      });

      // Find the invitation
      const invitation = await prisma.speakerInvitation.findUnique({
        where: { id: data.invitationId },
        include: {
          speaker: true
        }
      });

      if (!invitation) {
        return {
          success: false,
          message: 'Invitation not found'
        };
      }

      // Check if event has started (materials can't be changed after event starts)
      // We'll need to get event details from event service
      // For now, we'll allow updates until speaker joins
      if (invitation.joinedAt) {
        return {
          success: false,
          message: 'Cannot change materials after joining the event'
        };
      }

      // Validate that all material IDs belong to this speaker
      const speakerMaterials = await prisma.presentationMaterial.findMany({
        where: {
          speakerId: invitation.speakerId,
          id: { in: data.materialIds }
        }
      });

      if (speakerMaterials.length !== data.materialIds.length) {
        return {
          success: false,
          message: 'Some materials do not belong to this speaker'
        };
      }

      // Update the invitation with selected materials
      await prisma.speakerInvitation.update({
        where: { id: data.invitationId },
        data: {
          materialsSelected: data.materialIds
        }
      });

      logger.info('Materials updated successfully', { 
        invitationId: data.invitationId,
        materialCount: data.materialIds.length
      });

      return {
        success: true,
        message: 'Materials updated successfully'
      };

    } catch (error) {
      logger.error('Error updating materials', error as Error, { 
        invitationId: data.invitationId 
      });
      throw error;
    }
  }

  /**
   * Get speaker attendance data for an event
   */
  async getSpeakerAttendance(eventId: string): Promise<SpeakerAttendanceResponse> {
    try {
      logger.info('Fetching speaker attendance data', { eventId });

      // Get all invitations for this event
      const invitations = await prisma.speakerInvitation.findMany({
        where: {
          eventId: eventId,
          status: 'ACCEPTED'
        },
        include: {
          speaker: true
        }
      });

      const totalSpeakersInvited = invitations.length;
      const totalSpeakersJoined = invitations.filter(invitation => invitation.isAttended).length;

      const speakers = invitations.map(invitation => ({
        speakerId: invitation.speakerId,
        speakerName: invitation.speaker.name,
        speakerEmail: invitation.speaker.email,
        joinedAt: invitation.joinedAt?.toISOString() || '',
        isAttended: invitation.isAttended,
        materialsSelected: invitation.materialsSelected
      }));

      logger.info('Speaker attendance data retrieved', { 
        eventId,
        totalSpeakersInvited,
        totalSpeakersJoined
      });

      return {
        eventId,
        totalSpeakersInvited,
        totalSpeakersJoined,
        speakers
      };

    } catch (error) {
      logger.error('Error fetching speaker attendance', error as Error, { eventId });
      throw error;
    }
  }

  /**
   * Get materials available for selection for a specific invitation
   */
  async getAvailableMaterials(invitationId: string): Promise<{
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
  }> {
    try {
      const invitation = await prisma.speakerInvitation.findUnique({
        where: { id: invitationId },
        include: {
          speaker: {
            include: {
              materials: true
            }
          }
        }
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      const availableMaterials = invitation.speaker.materials.map(material => ({
        id: material.id,
        fileName: material.fileName,
        fileSize: material.fileSize,
        mimeType: material.mimeType,
        uploadDate: material.uploadDate.toISOString()
      }));

      return {
        invitationId: invitation.id,
        eventId: invitation.eventId,
        speakerId: invitation.speakerId,
        availableMaterials,
        selectedMaterials: invitation.materialsSelected
      };

    } catch (error) {
      logger.error('Error fetching available materials', error as Error, { invitationId });
      throw error;
    }
  }
}

export const speakerAttendanceService = new SpeakerAttendanceService();
