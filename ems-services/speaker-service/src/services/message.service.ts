import { prisma } from '../database';
import { logger } from '../utils/logger';
import {
  Message,
  CreateMessageRequest,
  MessageThread
} from '../types';

export class MessageService {
  /**
   * Create a new message
   */
  async createMessage(data: CreateMessageRequest): Promise<Message> {
    try {
      logger.info('Creating message', { 
        fromUserId: data.fromUserId, 
        toUserId: data.toUserId,
        subject: data.subject
      });

      // Generate threadId if not provided
      const threadId = data.threadId || this.generateThreadId(data.fromUserId, data.toUserId);

      const message = await prisma.message.create({
        data: {
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          subject: data.subject,
          content: data.content,
          threadId: threadId
        }
      });

      logger.info('Message created successfully', { 
        messageId: message.id,
        threadId: threadId
      });

      return message;
    } catch (error) {
      logger.error('Error creating message', error as Error);
      throw error;
    }
  }

  /**
   * Get message by ID
   */
  async getMessageById(id: string): Promise<Message | null> {
    try {
      logger.debug('Retrieving message', { messageId: id });

      const message = await prisma.message.findUnique({
        where: { id }
      });

      return message;
    } catch (error) {
      logger.error('Error retrieving message', error as Error);
      throw error;
    }
  }

  /**
   * Get messages for a user (inbox)
   */
  async getUserMessages(userId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      logger.debug('Retrieving user messages', { userId, limit, offset });

      const messages = await prisma.message.findMany({
        where: { toUserId: userId },
        orderBy: {
          sentAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return messages;
    } catch (error) {
      logger.error('Error retrieving user messages', error as Error);
      throw error;
    }
  }

  /**
   * Get messages sent by a user (sent messages)
   */
  async getSentMessages(userId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      logger.debug('Retrieving sent messages', { userId, limit, offset });

      const messages = await prisma.message.findMany({
        where: { fromUserId: userId },
        orderBy: {
          sentAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return messages;
    } catch (error) {
      logger.error('Error retrieving sent messages', error as Error);
      throw error;
    }
  }

  /**
   * Get message thread by threadId
   */
  async getMessageThread(threadId: string): Promise<MessageThread | null> {
    try {
      logger.debug('Retrieving message thread', { threadId });

      const messages = await prisma.message.findMany({
        where: { threadId },
        orderBy: {
          sentAt: 'asc'
        }
      });

      if (messages.length === 0) {
        return null;
      }

      // Extract unique participants
      const participants = Array.from(new Set([
        ...messages.map(m => m.fromUserId),
        ...messages.map(m => m.toUserId)
      ]));

      const lastMessageAt = messages[messages.length - 1]?.sentAt || new Date();

      return {
        threadId,
        participants,
        messages,
        lastMessageAt
      };
    } catch (error) {
      logger.error('Error retrieving message thread', error as Error);
      throw error;
    }
  }

  /**
   * Get message threads for a user
   */
  async getUserThreads(userId: string, limit: number = 20, offset: number = 0): Promise<MessageThread[]> {
    try {
      logger.debug('Retrieving user threads', { userId, limit, offset });

      // Get all messages involving this user
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { fromUserId: userId },
            { toUserId: userId }
          ]
        },
        orderBy: {
          sentAt: 'desc'
        }
      });

      // Group messages by threadId
      const threadMap = new Map<string, Message[]>();
      messages.forEach(message => {
        if (message.threadId) {
          if (!threadMap.has(message.threadId)) {
            threadMap.set(message.threadId, []);
          }
          threadMap.get(message.threadId)!.push(message);
        }
      });

      // Convert to MessageThread objects
      const threads: MessageThread[] = Array.from(threadMap.entries()).map(([threadId, threadMessages]) => {
        const sortedMessages = threadMessages.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
        const participants = Array.from(new Set([
          ...sortedMessages.map(m => m.fromUserId),
          ...sortedMessages.map(m => m.toUserId)
        ]));

        return {
          threadId,
          participants,
          messages: sortedMessages,
          lastMessageAt: sortedMessages[sortedMessages.length - 1]?.sentAt || new Date()
        };
      });

      // Sort threads by last message time and apply pagination
      threads.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
      
      return threads.slice(offset, offset + limit);
    } catch (error) {
      logger.error('Error retrieving user threads', error as Error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<Message> {
    try {
      logger.info('Marking message as read', { messageId });

      const message = await prisma.message.update({
        where: { id: messageId },
        data: {
          readAt: new Date()
        }
      });

      logger.info('Message marked as read successfully', { messageId });
      return message;
    } catch (error) {
      logger.error('Error marking message as read', error as Error);
      throw error;
    }
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      logger.debug('Retrieving unread message count', { userId });

      const count = await prisma.message.count({
        where: {
          toUserId: userId,
          readAt: null
        }
      });

      return count;
    } catch (error) {
      logger.error('Error retrieving unread message count', error as Error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(id: string): Promise<void> {
    try {
      logger.info('Deleting message', { messageId: id });

      await prisma.message.delete({
        where: { id }
      });

      logger.info('Message deleted successfully', { messageId: id });
    } catch (error) {
      logger.error('Error deleting message', error as Error);
      throw error;
    }
  }

  /**
   * Generate a thread ID for two users
   */
  private generateThreadId(userId1: string, userId2: string): string {
    // Sort user IDs to ensure consistent thread ID regardless of order
    const sortedIds = [userId1, userId2].sort();
    return `thread_${sortedIds[0]}_${sortedIds[1]}`;
  }

  /**
   * Get conversation between two users
   */
  async getConversation(userId1: string, userId2: string): Promise<MessageThread | null> {
    try {
      logger.debug('Retrieving conversation', { userId1, userId2 });

      const threadId = this.generateThreadId(userId1, userId2);
      return await this.getMessageThread(threadId);
    } catch (error) {
      logger.error('Error retrieving conversation', error as Error);
      throw error;
    }
  }
}
