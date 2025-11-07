import { prisma } from '../database';
import { logger } from '../utils/logger';
import axios from 'axios';

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

export interface SpeakerLeaveEventRequest {
  speakerId: string;
  eventId: string;
}

export interface SpeakerLeaveEventResponse {
  success: boolean;
  message: string;
  leftAt?: string;
  isAttended: boolean;
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
  private readonly eventServiceUrl: string;

  constructor() {
    this.eventServiceUrl = process.env['GATEWAY_URL'] ?
      `${process.env['GATEWAY_URL']}/api/event` : 'http://ems-gateway/api/event';
  }

  /**
   * Get event details from event service to check expiry and timing
   */
  private async getEventDetails(eventId: string): Promise<{ bookingStartDate: string; bookingEndDate: string } | null> {
    try {
      const response = await axios.get(`${this.eventServiceUrl}/events/${eventId}`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.success) {
        return {
          bookingStartDate: response.data.data.bookingStartDate,
          bookingEndDate: response.data.data.bookingEndDate
        };
      }
      return null;
    } catch (error) {
      logger.error('Failed to fetch event details from event service', error as Error, { eventId });
      return null;
    }
  }

  /**
   * Speaker joins an event
   * Rules:
   * 1. Speaker can join 10 minutes before event start
   * 2. If speaker joins before event start and leaves within 30 min of event start:
   *    - isAttended = false, joinedAt is not updated/cleared
   * 3. If speaker rejoins before event ends:
   *    - isAttended = true, joinedAt is updated
   */
  async speakerJoinEvent(data: SpeakerJoinEventRequest): Promise<SpeakerJoinEventResponse> {
    try {
      logger.info('Processing speaker event join request', {
        speakerId: data.speakerId,
        eventId: data.eventId
      });

      const now = new Date();

      // Get event details to check timing
      const eventDetails = await this.getEventDetails(data.eventId);
      if (!eventDetails) {
        return {
          success: false,
          message: 'Event details not available',
          isFirstJoin: false
        };
      }

      const eventStartDate = new Date(eventDetails.bookingStartDate);
      const eventEndDate = new Date(eventDetails.bookingEndDate);
      const tenMinutesBeforeStart = new Date(eventStartDate.getTime() - 10 * 60 * 1000);

      // Check if event has ended
      if (now > eventEndDate) {
        logger.warn('Speaker attempted to join expired event', {
          speakerId: data.speakerId,
          eventId: data.eventId,
          eventEndDate: eventDetails.bookingEndDate,
          currentTime: now.toISOString()
        });
        return {
          success: false,
          message: 'Cannot join event: Event has already ended',
          isFirstJoin: false
        };
      }

      // Check if speaker is trying to join too early (more than 10 minutes before start)
      if (now < tenMinutesBeforeStart) {
        const minutesUntilAllowed = Math.ceil((tenMinutesBeforeStart.getTime() - now.getTime()) / (60 * 1000));
        logger.warn('Speaker attempted to join too early', {
          speakerId: data.speakerId,
          eventId: data.eventId,
          currentTime: now.toISOString(),
          allowedFrom: tenMinutesBeforeStart.toISOString()
        });
        return {
          success: false,
          message: `Cannot join yet. You can join ${minutesUntilAllowed} minute(s) before the event starts.`,
          isFirstJoin: false
        };
      }

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

      // Determine if this is a first join (never joined before)
      const isFirstJoin = !invitation.joinedAt;

      // If speaker previously left within 30 minutes of event start, they can rejoin
      // Update joinedAt to the new join time and set isAttended to true
      const updateData: {
        joinedAt: Date;
        isAttended: boolean;
        leftAt: null;
      } = {
        joinedAt: now,
        isAttended: true,
        leftAt: null // Clear leftAt when rejoining
      };

      // Update invitation with join information
      const updatedInvitation = await prisma.speakerInvitation.update({
        where: { id: invitation.id },
        data: updateData
      });

      logger.info('Speaker successfully joined event', {
        invitationId: invitation.id,
        speakerId: data.speakerId,
        eventId: data.eventId,
        isFirstJoin,
        joinedAt: now.toISOString()
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
   * Speaker leaves an event
   * If speaker leaves within 30 minutes of event start, set isAttended to false
   */
  async speakerLeaveEvent(data: SpeakerLeaveEventRequest): Promise<SpeakerLeaveEventResponse> {
    try {
      logger.info('Processing speaker event leave request', {
        speakerId: data.speakerId,
        eventId: data.eventId
      });

      const now = new Date();

      // Get event details to check timing
      const eventDetails = await this.getEventDetails(data.eventId);
      if (!eventDetails) {
        return {
          success: false,
          message: 'Event details not available',
          isAttended: false
        };
      }

      const eventStartDate = new Date(eventDetails.bookingStartDate);
      const thirtyMinutesAfterStart = new Date(eventStartDate.getTime() + 30 * 60 * 1000);

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
          isAttended: false
        };
      }

      if (!invitation.joinedAt) {
        return {
          success: false,
          message: 'Cannot leave: Speaker has not joined the event',
          isAttended: false
        };
      }

      // Check if speaker is leaving within 30 minutes of event start
      const leftWithin30Min = now <= thirtyMinutesAfterStart && now >= eventStartDate;

      // If leaving within 30 minutes of event start, set isAttended to false
      // Otherwise, keep isAttended as true (they attended for a significant duration)
      // IMPORTANT: Do not update joinedAt when leaving - keep the original join time
      const updateData: {
        leftAt: Date;
        isAttended: boolean;
      } = {
        leftAt: now,
        isAttended: leftWithin30Min ? false : invitation.isAttended // Only update if leaving within 30 min
      };

      // Update invitation with leave information
      const updatedInvitation = await prisma.speakerInvitation.update({
        where: { id: invitation.id },
        data: updateData
      });

      logger.info('Speaker left event', {
        invitationId: invitation.id,
        speakerId: data.speakerId,
        eventId: data.eventId,
        leftAt: now.toISOString(),
        leftWithin30Min,
        isAttended: updatedInvitation.isAttended
      });

      return {
        success: true,
        message: leftWithin30Min
          ? 'You left the event. Your attendance will be marked as not attended if you do not rejoin before the event ends.'
          : 'You have left the event.',
        leftAt: updatedInvitation.leftAt?.toISOString(),
        isAttended: updatedInvitation.isAttended
      };

    } catch (error) {
      logger.error('Error speaker leaving event', error as Error, {
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
