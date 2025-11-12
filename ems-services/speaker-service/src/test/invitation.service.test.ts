/**
 * Comprehensive Test Suite for Invitation Service
 *
 * Tests all invitation management functionality including:
 * - Invitation creation
 * - Invitation retrieval
 * - Responding to invitations
 * - Invitation deletion
 * - Statistics and filtering
 */

import { describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import {
  mockPrisma,
  mockLogger,
  createMockSpeakerProfile,
  createMockInvitation,
  resetAllMocks,
} from './mocks-simple';
import { InvitationService } from '../services/invitation.service';
import { InvitationStatus } from '../../generated/prisma';

describe('InvitationService', () => {
  let invitationService: InvitationService;

  beforeEach(() => {
    resetAllMocks();
    invitationService = new InvitationService();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('createInvitation()', () => {
    it('should create a new invitation successfully', async () => {
      const mockSpeaker = createMockSpeakerProfile();
      const mockInvitation = createMockInvitation();
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockSpeaker);
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(null);
      mockPrisma.speakerInvitation.create.mockResolvedValue(mockInvitation);

      const result = await invitationService.createInvitation({
        speakerId: 'speaker-123',
        eventId: 'event-123',
        message: 'Test invitation',
      });

      expect(mockPrisma.speakerProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'speaker-123' },
      });
      expect(mockPrisma.speakerInvitation.create).toHaveBeenCalledWith({
        data: {
          speakerId: 'speaker-123',
          eventId: 'event-123',
          sessionId: null,
          message: 'Test invitation',
          status: InvitationStatus.PENDING,
        },
      });
      expect(result).toEqual(mockInvitation);
    });

    it('should throw error if speaker not found', async () => {
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(null);

      await expect(
        invitationService.createInvitation({
          speakerId: 'non-existent',
          eventId: 'event-123',
        })
      ).rejects.toThrow('Speaker not found');
    });

    it('should create session-specific invitation', async () => {
      const mockSpeaker = createMockSpeakerProfile();
      const mockInvitation = createMockInvitation({ sessionId: 'session-123' });
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockSpeaker);
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(null);
      mockPrisma.speakerInvitation.create.mockResolvedValue(mockInvitation);

      const result = await invitationService.createInvitation({
        speakerId: 'speaker-123',
        eventId: 'event-123',
        sessionId: 'session-123',
      });

      expect(mockPrisma.speakerInvitation.create).toHaveBeenCalledWith({
        data: {
          speakerId: 'speaker-123',
          eventId: 'event-123',
          sessionId: 'session-123',
          message: null,
          status: InvitationStatus.PENDING,
        },
      });
      expect(result).toEqual(mockInvitation);
    });

    it('should update existing event-level invitation', async () => {
      const mockSpeaker = createMockSpeakerProfile();
      const existingInvitation = createMockInvitation({ sessionId: null });
      const updatedInvitation = createMockInvitation({
        sessionId: null,
        message: 'Updated message',
      });
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockSpeaker);
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(null);
      mockPrisma.speakerInvitation.findFirst.mockResolvedValue(existingInvitation);
      mockPrisma.speakerInvitation.update.mockResolvedValue(updatedInvitation);

      const result = await invitationService.createInvitation({
        speakerId: 'speaker-123',
        eventId: 'event-123',
        message: 'Updated message',
      });

      expect(mockPrisma.speakerInvitation.update).toHaveBeenCalledWith({
        where: { id: existingInvitation.id },
        data: {
          message: 'Updated message',
          status: InvitationStatus.PENDING,
          sentAt: expect.any(Date),
          respondedAt: null,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedInvitation);
    });

    it('should delete and recreate session-specific invitation if exists', async () => {
      const mockSpeaker = createMockSpeakerProfile();
      const existingInvitation = createMockInvitation({ sessionId: 'session-123' });
      const newInvitation = createMockInvitation({ sessionId: 'session-123' });
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockSpeaker);
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(existingInvitation);
      mockPrisma.speakerInvitation.delete.mockResolvedValue(existingInvitation);
      mockPrisma.speakerInvitation.create.mockResolvedValue(newInvitation);

      const result = await invitationService.createInvitation({
        speakerId: 'speaker-123',
        eventId: 'event-123',
        sessionId: 'session-123',
      });

      expect(mockPrisma.speakerInvitation.delete).toHaveBeenCalledWith({
        where: { id: existingInvitation.id },
      });
      expect(result).toEqual(newInvitation);
    });

    it('should handle unique constraint violation for session invitations', async () => {
      const mockSpeaker = createMockSpeakerProfile();
      const existingInvitation = createMockInvitation({ sessionId: 'session-123' });
      const updatedInvitation = createMockInvitation({ sessionId: 'session-123' });
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockSpeaker);
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(null);

      const p2002Error: any = new Error('Unique constraint violation');
      p2002Error.code = 'P2002';
      mockPrisma.speakerInvitation.create.mockRejectedValue(p2002Error);
      mockPrisma.speakerInvitation.findFirst.mockResolvedValue(existingInvitation);
      mockPrisma.speakerInvitation.update.mockResolvedValue(updatedInvitation);

      const result = await invitationService.createInvitation({
        speakerId: 'speaker-123',
        eventId: 'event-123',
        sessionId: 'session-123',
      });

      expect(mockPrisma.speakerInvitation.update).toHaveBeenCalled();
      expect(result).toEqual(updatedInvitation);
    });

    it('should handle database errors', async () => {
      const mockSpeaker = createMockSpeakerProfile();
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockSpeaker);
      const dbError = new Error('Database error');
      mockPrisma.speakerInvitation.create.mockRejectedValue(dbError);

      await expect(
        invitationService.createInvitation({
          speakerId: 'speaker-123',
          eventId: 'event-123',
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('getInvitationById()', () => {
    it('should retrieve invitation by ID', async () => {
      const mockInvitation = createMockInvitation();
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await invitationService.getInvitationById('invitation-123');

      expect(mockPrisma.speakerInvitation.findUnique).toHaveBeenCalledWith({
        where: { id: 'invitation-123' },
      });
      expect(result).toEqual(mockInvitation);
    });

    it('should return null if invitation not found', async () => {
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(null);

      const result = await invitationService.getInvitationById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getSpeakerInvitations()', () => {
    it('should retrieve speaker invitations with pagination', async () => {
      const mockInvitations = [createMockInvitation()];
      mockPrisma.speakerInvitation.findMany.mockResolvedValue(mockInvitations);

      const result = await invitationService.getSpeakerInvitations('speaker-123', {
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.speakerInvitation.findMany).toHaveBeenCalledWith({
        where: { speakerId: 'speaker-123' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.invitations).toEqual(mockInvitations);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by status', async () => {
      const mockInvitations = [createMockInvitation({ status: InvitationStatus.PENDING })];
      mockPrisma.speakerInvitation.findMany.mockResolvedValue(mockInvitations);

      const result = await invitationService.getSpeakerInvitations('speaker-123', {
        status: 'PENDING',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.speakerInvitation.findMany).toHaveBeenCalledWith({
        where: { speakerId: 'speaker-123', status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.invitations).toEqual(mockInvitations);
    });

    it('should filter by search query', async () => {
      const mockInvitations = [
        createMockInvitation({ eventId: 'event-123' }),
        createMockInvitation({ eventId: 'event-456' }),
      ];
      mockPrisma.speakerInvitation.findMany.mockResolvedValue(mockInvitations);

      const result = await invitationService.getSpeakerInvitations('speaker-123', {
        search: 'event-123',
        page: 1,
        limit: 20,
      });

      expect(result.invitations).toHaveLength(1);
      expect(result.invitations[0].eventId).toBe('event-123');
    });

    it('should calculate pagination correctly', async () => {
      const mockInvitations = Array(25).fill(null).map(() => createMockInvitation());
      mockPrisma.speakerInvitation.findMany.mockResolvedValue(mockInvitations);

      const result = await invitationService.getSpeakerInvitations('speaker-123', {
        page: 2,
        limit: 10,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.invitations).toHaveLength(10);
    });
  });

  describe('getEventInvitations()', () => {
    it('should retrieve all invitations for an event', async () => {
      const mockInvitations = [createMockInvitation()];
      mockPrisma.speakerInvitation.findMany.mockResolvedValue(mockInvitations);

      const result = await invitationService.getEventInvitations('event-123');

      expect(mockPrisma.speakerInvitation.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockInvitations);
    });
  });

  describe('respondToInvitation()', () => {
    it('should accept an invitation successfully', async () => {
      const pendingInvitation = createMockInvitation({ status: InvitationStatus.PENDING });
      const acceptedInvitation = createMockInvitation({
        status: InvitationStatus.ACCEPTED,
        respondedAt: new Date(),
      });
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(pendingInvitation);
      mockPrisma.speakerInvitation.update.mockResolvedValue(acceptedInvitation);

      const result = await invitationService.respondToInvitation('invitation-123', {
        status: InvitationStatus.ACCEPTED,
      });

      expect(mockPrisma.speakerInvitation.update).toHaveBeenCalledWith({
        where: { id: 'invitation-123' },
        data: {
          status: InvitationStatus.ACCEPTED,
          respondedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(acceptedInvitation);
    });

    it('should decline an invitation successfully', async () => {
      const pendingInvitation = createMockInvitation({ status: InvitationStatus.PENDING });
      const declinedInvitation = createMockInvitation({
        status: InvitationStatus.DECLINED,
        respondedAt: new Date(),
      });
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(pendingInvitation);
      mockPrisma.speakerInvitation.update.mockResolvedValue(declinedInvitation);

      const result = await invitationService.respondToInvitation('invitation-123', {
        status: InvitationStatus.DECLINED,
      });

      expect(result.status).toBe(InvitationStatus.DECLINED);
    });

    it('should throw error if invitation not found', async () => {
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(null);

      await expect(
        invitationService.respondToInvitation('non-existent', {
          status: InvitationStatus.ACCEPTED,
        })
      ).rejects.toThrow('Invitation not found');
    });

    it('should throw error if invitation already responded', async () => {
      const acceptedInvitation = createMockInvitation({
        status: InvitationStatus.ACCEPTED,
        respondedAt: new Date(),
      });
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(acceptedInvitation);

      await expect(
        invitationService.respondToInvitation('invitation-123', {
          status: InvitationStatus.ACCEPTED,
        })
      ).rejects.toThrow('Invitation has already been responded to');
    });
  });

  describe('getPendingInvitations()', () => {
    it('should retrieve pending invitations for a speaker', async () => {
      const mockInvitations = [createMockInvitation({ status: InvitationStatus.PENDING })];
      mockPrisma.speakerInvitation.findMany.mockResolvedValue(mockInvitations);

      const result = await invitationService.getPendingInvitations('speaker-123');

      expect(mockPrisma.speakerInvitation.findMany).toHaveBeenCalledWith({
        where: {
          speakerId: 'speaker-123',
          status: InvitationStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockInvitations);
    });
  });

  describe('getAcceptedInvitations()', () => {
    it('should retrieve accepted invitations for a speaker', async () => {
      const mockInvitations = [createMockInvitation({ status: InvitationStatus.ACCEPTED })];
      mockPrisma.speakerInvitation.findMany.mockResolvedValue(mockInvitations);

      const result = await invitationService.getAcceptedInvitations('speaker-123');

      expect(mockPrisma.speakerInvitation.findMany).toHaveBeenCalledWith({
        where: {
          speakerId: 'speaker-123',
          status: InvitationStatus.ACCEPTED,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockInvitations);
    });
  });

  describe('deleteInvitation()', () => {
    it('should delete invitation successfully', async () => {
      mockPrisma.speakerInvitation.delete.mockResolvedValue(createMockInvitation());

      await invitationService.deleteInvitation('invitation-123');

      expect(mockPrisma.speakerInvitation.delete).toHaveBeenCalledWith({
        where: { id: 'invitation-123' },
      });
    });
  });

  describe('deleteInvitationBySessionAndSpeaker()', () => {
    it('should delete invitation by session and speaker', async () => {
      const mockInvitation = createMockInvitation({ sessionId: 'session-123' });
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrisma.speakerInvitation.delete.mockResolvedValue(mockInvitation);

      await invitationService.deleteInvitationBySessionAndSpeaker('session-123', 'speaker-123');

      expect(mockPrisma.speakerInvitation.findUnique).toHaveBeenCalledWith({
        where: {
          sessionId_speakerId: {
            sessionId: 'session-123',
            speakerId: 'speaker-123',
          },
        },
      });
      expect(mockPrisma.speakerInvitation.delete).toHaveBeenCalledWith({
        where: { id: mockInvitation.id },
      });
    });

    it('should handle case when invitation not found gracefully', async () => {
      mockPrisma.speakerInvitation.findUnique.mockResolvedValue(null);

      await expect(
        invitationService.deleteInvitationBySessionAndSpeaker('session-123', 'speaker-123')
      ).resolves.not.toThrow();

      expect(mockPrisma.speakerInvitation.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteInvitationByEventAndSpeaker()', () => {
    it('should delete event-level invitation', async () => {
      const mockInvitation = createMockInvitation({ sessionId: null });
      mockPrisma.speakerInvitation.findFirst.mockResolvedValue(mockInvitation);
      mockPrisma.speakerInvitation.delete.mockResolvedValue(mockInvitation);

      await invitationService.deleteInvitationByEventAndSpeaker('event-123', 'speaker-123');

      expect(mockPrisma.speakerInvitation.findFirst).toHaveBeenCalledWith({
        where: {
          eventId: 'event-123',
          speakerId: 'speaker-123',
          sessionId: null,
        },
      });
      expect(mockPrisma.speakerInvitation.delete).toHaveBeenCalledWith({
        where: { id: mockInvitation.id },
      });
    });

    it('should handle case when invitation not found gracefully', async () => {
      mockPrisma.speakerInvitation.findFirst.mockResolvedValue(null);

      await expect(
        invitationService.deleteInvitationByEventAndSpeaker('event-123', 'speaker-123')
      ).resolves.not.toThrow();
    });
  });

  describe('getAcceptedInvitationsWithSessions()', () => {
    it('should retrieve accepted invitations with sessions', async () => {
      const mockInvitations = [
        createMockInvitation({
          status: InvitationStatus.ACCEPTED,
          sessionId: 'session-123',
        }),
      ];
      mockPrisma.speakerInvitation.findMany.mockResolvedValue(mockInvitations);

      const result = await invitationService.getAcceptedInvitationsWithSessions('speaker-123');

      expect(mockPrisma.speakerInvitation.findMany).toHaveBeenCalledWith({
        where: {
          speakerId: 'speaker-123',
          status: InvitationStatus.ACCEPTED,
          sessionId: {
            not: null,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockInvitations);
    });
  });

  describe('deleteAllInvitationsByEvent()', () => {
    it('should delete all invitations for an event', async () => {
      mockPrisma.speakerInvitation.deleteMany.mockResolvedValue({ count: 5 });

      const result = await invitationService.deleteAllInvitationsByEvent('event-123');

      expect(mockPrisma.speakerInvitation.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
      });
      expect(result).toBe(5);
    });
  });

  describe('getSpeakerInvitationStats()', () => {
    it('should retrieve invitation statistics', async () => {
      mockPrisma.speakerInvitation.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // pending
        .mockResolvedValueOnce(5)  // accepted
        .mockResolvedValueOnce(1)  // declined
        .mockResolvedValueOnce(1); // expired

      const result = await invitationService.getSpeakerInvitationStats('speaker-123');

      expect(result).toEqual({
        total: 10,
        pending: 3,
        accepted: 5,
        declined: 1,
        expired: 1,
      });
      expect(mockPrisma.speakerInvitation.count).toHaveBeenCalledTimes(5);
    });
  });
});

