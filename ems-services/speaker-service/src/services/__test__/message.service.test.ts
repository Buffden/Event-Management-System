/**
 * MessageService Unit Tests
 *
 * Tests for MessageService methods including createMessage with new fields
 * and admin-specific methods.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MessageService } from '../message.service';
import {
  mockPrisma,
  createMockMessage,
  setupAllMocks,
  resetAllMocks,
} from '../../test/mocks-simple';
import { MessageStatus } from '../../../generated/prisma';

describe('MessageService', () => {
  let messageService: MessageService;

  beforeEach(() => {
    messageService = new MessageService();
    resetAllMocks();
  });

  describe('createMessage', () => {
    it('should correctly store message with all new fields including eventId, status, and attachment details', async () => {
      const messageData = {
        fromUserId: 'user-123',
        toUserId: 'user-456',
        subject: 'Test Message',
        content: 'Test content',
        threadId: 'thread-123',
        eventId: 'event-789',
        attachmentUrl: 'https://example.com/file.pdf',
        attachmentName: 'document.pdf',
        attachmentType: 'application/pdf',
      };

      const mockMessage = createMockMessage({
        ...messageData,
        status: 'SENT',
        sentAt: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const result = await messageService.createMessage(messageData);

      expect(result).toBeDefined();
      expect(result.eventId).toBe('event-789');
      expect(result.status).toBe('SENT');
      expect(result.attachmentUrl).toBe('https://example.com/file.pdf');
      expect(result.attachmentName).toBe('document.pdf');
      expect(result.attachmentType).toBe('application/pdf');
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          fromUserId: messageData.fromUserId,
          toUserId: messageData.toUserId,
          subject: messageData.subject,
          content: messageData.content,
          threadId: messageData.threadId,
          eventId: messageData.eventId,
          attachmentUrl: messageData.attachmentUrl,
          attachmentName: messageData.attachmentName,
          attachmentType: messageData.attachmentType,
          status: 'SENT',
        },
      });
    });

    it('should generate threadId if not provided', async () => {
      const messageData = {
        fromUserId: 'user-123',
        toUserId: 'user-456',
        subject: 'Test Message',
        content: 'Test content',
      };

      const mockMessage = createMockMessage({
        ...messageData,
        threadId: 'thread_user-123_user-456',
      });

      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const result = await messageService.createMessage(messageData);

      expect(result).toBeDefined();
      expect(result.threadId).toBeDefined();
      expect(mockPrisma.message.create).toHaveBeenCalled();
      const createCall = mockPrisma.message.create.mock.calls[0][0];
      expect(createCall.data.threadId).toBeDefined();
    });

    it('should handle optional fields as null when not provided', async () => {
      const messageData = {
        fromUserId: 'user-123',
        toUserId: 'user-456',
        subject: 'Test Message',
        content: 'Test content',
      };

      const mockMessage = createMockMessage({
        ...messageData,
        eventId: null,
        attachmentUrl: null,
        attachmentName: null,
        attachmentType: null,
      });

      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const result = await messageService.createMessage(messageData);

      expect(result.eventId).toBeNull();
      expect(result.attachmentUrl).toBeNull();
      expect(result.attachmentName).toBeNull();
      expect(result.attachmentType).toBeNull();
    });

    it('should throw error on database failure', async () => {
      const messageData = {
        fromUserId: 'user-123',
        toUserId: 'user-456',
        subject: 'Test Message',
        content: 'Test content',
      };

      const dbError = new Error('Database connection failed');
      mockPrisma.message.create.mockRejectedValue(dbError);

      await expect(messageService.createMessage(messageData)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getAllSpeakerMessages', () => {
    it('should retrieve and filter messages accurately with pagination', async () => {
      const mockMessages = [
        createMockMessage({ id: 'msg-1', fromUserId: 'speaker-1' }),
        createMockMessage({ id: 'msg-2', fromUserId: 'speaker-2' }),
        createMockMessage({ id: 'msg-3', fromUserId: 'speaker-1' }),
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await messageService.getAllSpeakerMessages(50, 0);

      expect(result).toHaveLength(3);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        orderBy: { sentAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockMessages = [createMockMessage({ id: 'msg-1' })];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await messageService.getAllSpeakerMessages(10, 20);

      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        orderBy: { sentAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });
  });

  describe('getMessagesByEvent', () => {
    it('should retrieve messages filtered by eventId accurately', async () => {
      const eventId = 'event-123';
      const mockMessages = [
        createMockMessage({ id: 'msg-1', eventId }),
        createMockMessage({ id: 'msg-2', eventId }),
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await messageService.getMessagesByEvent(eventId, 50, 0);

      expect(result).toHaveLength(2);
      expect(result.every(msg => msg.eventId === eventId)).toBe(true);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { eventId },
        orderBy: { sentAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should return empty array when no messages found for event', async () => {
      const eventId = 'event-999';
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await messageService.getMessagesByEvent(eventId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getMessagesBySpeaker', () => {
    it('should retrieve messages filtered by speaker userId accurately', async () => {
      const speakerUserId = 'speaker-123';
      const mockMessages = [
        createMockMessage({ id: 'msg-1', fromUserId: speakerUserId }),
        createMockMessage({ id: 'msg-2', fromUserId: speakerUserId }),
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await messageService.getMessagesBySpeaker(speakerUserId, 50, 0);

      expect(result).toHaveLength(2);
      expect(result.every(msg => msg.fromUserId === speakerUserId)).toBe(true);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { fromUserId: speakerUserId },
        orderBy: { sentAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('getThreadsBySpeaker', () => {
    it('should retrieve message threads organized by speaker accurately', async () => {
      const speakerUserId = 'speaker-123';
      const threadId = 'thread-123';
      const mockMessages = [
        createMockMessage({ id: 'msg-1', fromUserId: speakerUserId, threadId }),
        createMockMessage({ id: 'msg-2', fromUserId: speakerUserId, threadId }),
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await messageService.getThreadsBySpeaker(speakerUserId, 20, 0);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { fromUserId: speakerUserId },
        orderBy: { sentAt: 'desc' },
      });
    });

    it('should group messages by threadId correctly', async () => {
      const speakerUserId = 'speaker-123';
      const mockMessages = [
        createMockMessage({ id: 'msg-1', fromUserId: speakerUserId, threadId: 'thread-1' }),
        createMockMessage({ id: 'msg-2', fromUserId: speakerUserId, threadId: 'thread-1' }),
        createMockMessage({ id: 'msg-3', fromUserId: speakerUserId, threadId: 'thread-2' }),
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await messageService.getThreadsBySpeaker(speakerUserId);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getUnreadSpeakerMessageCount', () => {
    it('should retrieve unread message count for speakers accurately', async () => {
      const mockCount = 5;
      mockPrisma.message.count.mockResolvedValue(mockCount);

      const result = await messageService.getUnreadSpeakerMessageCount();

      expect(result).toBe(mockCount);
      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: {
          readAt: null,
          status: { in: ['SENT', 'DELIVERED'] },
        },
      });
    });

    it('should return 0 when no unread messages', async () => {
      mockPrisma.message.count.mockResolvedValue(0);

      const result = await messageService.getUnreadSpeakerMessageCount();

      expect(result).toBe(0);
    });
  });

  describe('markMessageAsDelivered', () => {
    it('should mark message as delivered and set deliveredAt timestamp', async () => {
      const messageId = 'msg-123';
      const mockMessage = createMockMessage({
        id: messageId,
        status: 'DELIVERED',
        deliveredAt: new Date(),
      });

      mockPrisma.message.update.mockResolvedValue(mockMessage);

      const result = await messageService.markMessageAsDelivered(messageId);

      expect(result.status).toBe('DELIVERED');
      expect(result.deliveredAt).toBeDefined();
      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: {
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
        },
      });
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark message as read and set readAt timestamp', async () => {
      const messageId = 'msg-123';
      const mockMessage = createMockMessage({
        id: messageId,
        status: 'READ',
        readAt: new Date(),
      });

      mockPrisma.message.update.mockResolvedValue(mockMessage);

      const result = await messageService.markMessageAsRead(messageId);

      expect(result.status).toBe('READ');
      expect(result.readAt).toBeDefined();
      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: {
          status: 'READ',
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('getMessageById', () => {
    it('should retrieve message by ID', async () => {
      const messageId = 'msg-123';
      const mockMessage = createMockMessage({ id: messageId });

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);

      const result = await messageService.getMessageById(messageId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(messageId);
      expect(mockPrisma.message.findUnique).toHaveBeenCalledWith({
        where: { id: messageId },
      });
    });

    it('should return null when message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const result = await messageService.getMessageById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserMessages', () => {
    it('should retrieve user inbox messages', async () => {
      const userId = 'user-123';
      const mockMessages = [createMockMessage({ toUserId: userId })];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await messageService.getUserMessages(userId, 50, 0);

      expect(result).toHaveLength(1);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { toUserId: userId },
        orderBy: { sentAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('getSentMessages', () => {
    it('should retrieve sent messages', async () => {
      const userId = 'user-123';
      const mockMessages = [createMockMessage({ fromUserId: userId })];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await messageService.getSentMessages(userId, 50, 0);

      expect(result).toHaveLength(1);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { fromUserId: userId },
        orderBy: { sentAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('getMessageThread', () => {
    it('should retrieve message thread', async () => {
      const threadId = 'thread-123';
      const mockMessages = [
        createMockMessage({ threadId, fromUserId: 'user-1', toUserId: 'user-2' }),
        createMockMessage({ threadId, fromUserId: 'user-2', toUserId: 'user-1' }),
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await messageService.getMessageThread(threadId);

      expect(result).toBeDefined();
      expect(result?.threadId).toBe(threadId);
      expect(result?.messages).toHaveLength(2);
    });

    it('should return null when thread not found', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await messageService.getMessageThread('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserThreads', () => {
    it('should retrieve user threads', async () => {
      const userId = 'user-123';
      const mockMessages = [
        createMockMessage({ threadId: 'thread-1', fromUserId: userId }),
        createMockMessage({ threadId: 'thread-1', toUserId: userId }),
        createMockMessage({ threadId: 'thread-2', fromUserId: userId }),
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await messageService.getUserThreads(userId, 20, 0);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getConversation', () => {
    it('should retrieve conversation between two users', async () => {
      const userId1 = 'user-123';
      const userId2 = 'user-456';
      const threadId = 'thread_user-123_user-456';
      const mockMessages = [
        createMockMessage({ threadId, fromUserId: userId1, toUserId: userId2 }),
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      // Mock getMessageThread since getConversation calls it
      jest.spyOn(messageService, 'getMessageThread').mockResolvedValue({
        threadId,
        participants: [userId1, userId2],
        messages: mockMessages,
        lastMessageAt: new Date(),
      });

      const result = await messageService.getConversation(userId1, userId2);

      expect(result).toBeDefined();
      expect(result?.threadId).toBe(threadId);
    });
  });

  describe('getUnreadMessageCount', () => {
    it('should retrieve unread message count', async () => {
      const userId = 'user-123';
      mockPrisma.message.count.mockResolvedValue(5);

      const result = await messageService.getUnreadMessageCount(userId);

      expect(result).toBe(5);
      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: {
          toUserId: userId,
          readAt: null,
        },
      });
    });
  });

  describe('deleteMessage', () => {
    it('should delete message', async () => {
      const messageId = 'msg-123';
      mockPrisma.message.delete.mockResolvedValue(createMockMessage({ id: messageId }));

      await messageService.deleteMessage(messageId);

      expect(mockPrisma.message.delete).toHaveBeenCalledWith({
        where: { id: messageId },
      });
    });
  });
});

