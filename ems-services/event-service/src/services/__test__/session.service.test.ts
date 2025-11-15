import { describe, it, expect, beforeEach } from '@jest/globals';
import { sessionService } from '../session.service';
import {
  mockPrisma,
  createMockSession,
  createMockSessionSpeaker,
  createMockEvent,
  resetAllMocks,
  mockAxios,
  mockLogger,
} from '../../test/mocks-simple';
import { SessionSpeakerMaterialsStatus } from '../../../generated/prisma';

describe('SessionService', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('createSession', () => {
    it('creates a session when event exists and schedule is valid', async () => {
      const eventId = 'event-123';
      const payload = {
        title: 'Morning Session',
        description: 'Introduction',
        startsAt: '2025-01-01T09:00:00Z',
        endsAt: '2025-01-01T10:00:00Z',
        stage: 'Stage A',
      };

      mockPrisma.event.findUnique.mockResolvedValue({
        id: eventId,
        bookingStartDate: new Date('2025-01-01T08:00:00Z'),
        bookingEndDate: new Date('2025-01-01T18:00:00Z'),
      });

      const mockSession = createMockSession({
        ...payload,
        id: 'session-123',
        eventId,
        startsAt: new Date(payload.startsAt),
        endsAt: new Date(payload.endsAt),
      });

      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await sessionService.createSession(eventId, payload);

      expect(result.title).toBe(payload.title);
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });

    it('throws when session schedule is outside event window', async () => {
      const eventId = 'event-123';

      mockPrisma.event.findUnique.mockResolvedValue({
        id: eventId,
        bookingStartDate: new Date('2025-01-01T08:00:00Z'),
        bookingEndDate: new Date('2025-01-01T18:00:00Z'),
      });

      await expect(
        sessionService.createSession(eventId, {
          title: 'Invalid Session',
          startsAt: '2025-01-01T07:00:00Z',
          endsAt: '2025-01-01T09:00:00Z',
        })
      ).rejects.toThrow('Session schedule must fall within the event booking window');
    });
  });

  describe('updateSession', () => {
    it('updates session fields', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';

      mockPrisma.session.findFirst.mockResolvedValue({
        ...createMockSession({ id: sessionId, eventId }),
        event: createMockEvent({ id: eventId, bookingStartDate: new Date('2025-01-01T08:00:00Z'), bookingEndDate: new Date('2025-01-01T18:00:00Z') }),
      });

      mockPrisma.session.update.mockResolvedValue(
        createMockSession({ id: sessionId, eventId, title: 'Updated Title' })
      );

      const result = await sessionService.updateSession(eventId, sessionId, { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
      expect(mockPrisma.session.update).toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('deletes an existing session', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';

      mockPrisma.session.findFirst.mockResolvedValue(createMockSession({ id: sessionId, eventId }));
      mockPrisma.session.delete.mockResolvedValue(undefined);

      await expect(sessionService.deleteSession(eventId, sessionId)).resolves.toBeUndefined();
      expect(mockPrisma.session.delete).toHaveBeenCalled();
    });
  });

  describe('assignSpeaker', () => {
    it('creates a session speaker assignment', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      mockPrisma.session.findFirst.mockResolvedValue(createMockSession({ id: sessionId, eventId }));

      mockPrisma.sessionSpeaker.create.mockResolvedValue(
        createMockSessionSpeaker({ sessionId, speakerId })
      );

      const result = await sessionService.assignSpeaker(eventId, sessionId, { speakerId });

      expect(result.speakerId).toBe(speakerId);
      expect(mockPrisma.sessionSpeaker.create).toHaveBeenCalled();
    });

    it('handles successful invitation creation', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      const mockSession = createMockSession({ id: sessionId, eventId, title: 'Test Session' });
      mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      mockPrisma.sessionSpeaker.create.mockResolvedValue(
        createMockSessionSpeaker({ sessionId, speakerId })
      );

      mockAxios.post.mockResolvedValue({
        status: 201,
        data: {
          success: true,
          data: {
            id: 'invitation-123',
          },
        },
      });

      await sessionService.assignSpeaker(eventId, sessionId, { speakerId });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Invitation created for session assignment'),
        expect.objectContaining({
          invitationId: 'invitation-123',
          speakerId,
          sessionId,
          eventId,
        })
      );
    });

    it('handles invitation creation error with response', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      const mockSession = createMockSession({ id: sessionId, eventId });
      mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      mockPrisma.sessionSpeaker.create.mockResolvedValue(
        createMockSessionSpeaker({ sessionId, speakerId })
      );

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: 'Invalid request' },
        },
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.post.mockRejectedValue(axiosError);

      const result = await sessionService.assignSpeaker(eventId, sessionId, { speakerId });

      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create invitation'),
        expect.objectContaining({
          speakerId,
          sessionId,
          status: 400,
          message: 'Invalid request',
        })
      );
    });

    it('handles invitation creation error with request but no response', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      const mockSession = createMockSession({ id: sessionId, eventId });
      mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      mockPrisma.sessionSpeaker.create.mockResolvedValue(
        createMockSessionSpeaker({ sessionId, speakerId })
      );

      const axiosError = {
        isAxiosError: true,
        request: {},
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.post.mockRejectedValue(axiosError);

      const result = await sessionService.assignSpeaker(eventId, sessionId, { speakerId });

      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Speaker service unavailable'),
        expect.objectContaining({
          speakerId,
          sessionId,
        })
      );
    });

    it('handles non-axios error during invitation creation', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      const mockSession = createMockSession({ id: sessionId, eventId });
      mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      mockPrisma.sessionSpeaker.create.mockResolvedValue(
        createMockSessionSpeaker({ sessionId, speakerId })
      );

      const error = new Error('Unexpected error');
      mockAxios.isAxiosError.mockReturnValue(false);
      mockAxios.post.mockRejectedValue(error);

      const result = await sessionService.assignSpeaker(eventId, sessionId, { speakerId });

      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error creating invitation'),
        expect.objectContaining({
          speakerId,
          sessionId,
          error: 'Unexpected error',
        })
      );
    });
  });

  describe('updateSpeakerAssignment', () => {
    it('updates speaker assignment details', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      mockPrisma.session.findFirst.mockResolvedValue(createMockSession({ id: sessionId, eventId }));

      mockPrisma.sessionSpeaker.update.mockResolvedValue(
        createMockSessionSpeaker({
          sessionId,
          speakerId,
          materialsStatus: SessionSpeakerMaterialsStatus.ACKNOWLEDGED,
        })
      );

      const result = await sessionService.updateSpeakerAssignment(eventId, sessionId, speakerId, {
        materialsStatus: SessionSpeakerMaterialsStatus.ACKNOWLEDGED,
      });

      expect(result.materialsStatus).toBe(SessionSpeakerMaterialsStatus.ACKNOWLEDGED);
      expect(mockPrisma.sessionSpeaker.update).toHaveBeenCalled();
    });

    it('throws error when session not found', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      mockPrisma.session.findFirst.mockResolvedValue(null);

      await expect(
        sessionService.updateSpeakerAssignment(eventId, sessionId, speakerId, {
          materialsStatus: SessionSpeakerMaterialsStatus.ACKNOWLEDGED,
        })
      ).rejects.toThrow('Session not found');
    });
  });

  describe('removeSpeaker', () => {
    it('removes speaker assignment', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      mockPrisma.session.findFirst.mockResolvedValue(createMockSession({ id: sessionId, eventId }));
      mockPrisma.sessionSpeaker.delete.mockResolvedValue(undefined);
      mockAxios.delete.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      await expect(sessionService.removeSpeaker(eventId, sessionId, speakerId)).resolves.toBeUndefined();
      expect(mockPrisma.sessionSpeaker.delete).toHaveBeenCalled();
      expect(mockAxios.delete).toHaveBeenCalled();
    });

    it('throws error when session not found', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      mockPrisma.session.findFirst.mockResolvedValue(null);

      await expect(sessionService.removeSpeaker(eventId, sessionId, speakerId)).rejects.toThrow(
        'Session not found'
      );
    });

    it('handles successful invitation deletion', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      mockPrisma.session.findFirst.mockResolvedValue(createMockSession({ id: sessionId, eventId }));
      mockPrisma.sessionSpeaker.delete.mockResolvedValue(undefined);
      mockAxios.delete.mockResolvedValue({
        status: 200,
        data: { success: true },
      });

      await sessionService.removeSpeaker(eventId, sessionId, speakerId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Invitation deleted successfully'),
        expect.objectContaining({
          sessionId,
          speakerId,
        })
      );
    });

    it('handles invitation deletion error with response', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      mockPrisma.session.findFirst.mockResolvedValue(createMockSession({ id: sessionId, eventId }));
      mockPrisma.sessionSpeaker.delete.mockResolvedValue(undefined);

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { error: 'Invitation not found' },
        },
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.delete.mockRejectedValue(axiosError);

      await expect(sessionService.removeSpeaker(eventId, sessionId, speakerId)).resolves.toBeUndefined();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete invitation'),
        expect.objectContaining({
          sessionId,
          speakerId,
          status: 404,
          message: 'Invitation not found',
        })
      );
    });

    it('handles invitation deletion error with request but no response', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      mockPrisma.session.findFirst.mockResolvedValue(createMockSession({ id: sessionId, eventId }));
      mockPrisma.sessionSpeaker.delete.mockResolvedValue(undefined);

      const axiosError = {
        isAxiosError: true,
        request: {},
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.delete.mockRejectedValue(axiosError);

      await expect(sessionService.removeSpeaker(eventId, sessionId, speakerId)).resolves.toBeUndefined();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Speaker service unavailable'),
        expect.objectContaining({
          sessionId,
          speakerId,
        })
      );
    });

    it('handles invitation deletion error with message', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      mockPrisma.session.findFirst.mockResolvedValue(createMockSession({ id: sessionId, eventId }));
      mockPrisma.sessionSpeaker.delete.mockResolvedValue(undefined);

      const axiosError = {
        isAxiosError: true,
        message: 'Network timeout',
      };
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.delete.mockRejectedValue(axiosError);

      await expect(sessionService.removeSpeaker(eventId, sessionId, speakerId)).resolves.toBeUndefined();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error deleting invitation'),
        expect.objectContaining({
          sessionId,
          speakerId,
          message: 'Network timeout',
        })
      );
    });

    it('handles non-axios error during invitation deletion', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      mockPrisma.session.findFirst.mockResolvedValue(createMockSession({ id: sessionId, eventId }));
      mockPrisma.sessionSpeaker.delete.mockResolvedValue(undefined);

      const error = new Error('Unexpected error');
      mockAxios.isAxiosError.mockReturnValue(false);
      mockAxios.delete.mockRejectedValue(error);

      await expect(sessionService.removeSpeaker(eventId, sessionId, speakerId)).resolves.toBeUndefined();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error deleting invitation'),
        expect.objectContaining({
          sessionId,
          speakerId,
          error: 'Unexpected error',
        })
      );
    });
  });
});

