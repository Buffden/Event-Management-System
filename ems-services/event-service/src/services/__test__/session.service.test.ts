import { describe, it, expect, beforeEach } from '@jest/globals';
import { sessionService } from '../session.service';
import {
  mockPrisma,
  createMockSession,
  createMockSessionSpeaker,
  createMockEvent,
  resetAllMocks,
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
  });

  describe('removeSpeaker', () => {
    it('removes speaker assignment', async () => {
      const eventId = 'event-123';
      const sessionId = 'session-123';
      const speakerId = 'speaker-123';

      mockPrisma.session.findFirst.mockResolvedValue(createMockSession({ id: sessionId, eventId }));
      mockPrisma.sessionSpeaker.delete.mockResolvedValue(undefined);

      await expect(sessionService.removeSpeaker(eventId, sessionId, speakerId)).resolves.toBeUndefined();
      expect(mockPrisma.sessionSpeaker.delete).toHaveBeenCalled();
    });
  });
});

