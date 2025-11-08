import { Router } from 'express';
import { Response } from 'express';
import { MessageService } from '../services/message.service';
import { logger } from '../utils/logger';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const messageService = new MessageService();

// Apply authentication to all routes
router.use(authMiddleware);

// Create message
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { toUserId, subject, content, threadId, eventId, attachmentUrl, attachmentName, attachmentType } = req.body;

    // Speakers can only send to admins, admins can send to anyone
    if (req.user!.role === 'SPEAKER') {
      // Verify that toUserId is an admin (this would ideally check against auth-service)
      // For now, we'll allow it and let the business logic handle it
    }

    if (!toUserId || !subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'To User ID, Subject, and Content are required',
        timestamp: new Date().toISOString()
      });
    }

    const message = await messageService.createMessage({
      fromUserId: userId,
      toUserId,
      subject,
      content,
      threadId,
      eventId,
      attachmentUrl,
      attachmentName,
      attachmentType
    });

    logger.info('Message created', {
      messageId: message.id,
      fromUserId: userId,
      toUserId,
      threadId: message.threadId
    });

    return res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error creating message', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send message',
      timestamp: new Date().toISOString()
    });
  }
});

// Get message by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const message = await messageService.getMessageById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Message retrieved', { messageId: id });

    return res.json({
      success: true,
      data: message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving message', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve message',
      timestamp: new Date().toISOString()
    });
  }
});

// Get user's inbox messages
router.get('/inbox/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;

    // Users can only access their own inbox unless they're admin
    if (currentUserId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only access your own inbox',
        timestamp: new Date().toISOString()
      });
    }
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const messages = await messageService.getUserMessages(
      userId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    logger.info('User inbox messages retrieved', {
      userId,
      count: messages.length
    });

    return res.json({
      success: true,
      data: messages,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving user inbox messages', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve inbox messages',
      timestamp: new Date().toISOString()
    });
  }
});

// Get user's sent messages
router.get('/sent/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;

    // Users can only access their own sent messages unless they're admin
    if (currentUserId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only access your own sent messages',
        timestamp: new Date().toISOString()
      });
    }
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const messages = await messageService.getSentMessages(
      userId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    logger.info('User sent messages retrieved', {
      userId,
      count: messages.length
    });

    return res.json({
      success: true,
      data: messages,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving user sent messages', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve sent messages',
      timestamp: new Date().toISOString()
    });
  }
});

// Get message thread
router.get('/thread/:threadId', async (req: AuthRequest, res: Response) => {
  try {
    const { threadId } = req.params;

    if (!threadId) {
      return res.status(400).json({
        success: false,
        error: 'Thread ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const thread = await messageService.getMessageThread(threadId);

    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Message thread retrieved', { threadId });

    return res.json({
      success: true,
      data: thread,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving message thread', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve message thread',
      timestamp: new Date().toISOString()
    });
  }
});

// Get user's message threads
router.get('/threads/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const threads = await messageService.getUserThreads(
      userId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    logger.info('User message threads retrieved', {
      userId,
      count: threads.length
    });

    return res.json({
      success: true,
      data: threads,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving user message threads', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve message threads',
      timestamp: new Date().toISOString()
    });
  }
});

// Get conversation between two users
router.get('/conversation/:userId1/:userId2', async (req: AuthRequest, res: Response) => {
  try {
    const { userId1, userId2 } = req.params;

    if (!userId1 || !userId2) {
      return res.status(400).json({
        success: false,
        error: 'Both User IDs are required',
        timestamp: new Date().toISOString()
      });
    }

    const conversation = await messageService.getConversation(userId1, userId2);

    logger.info('Conversation retrieved', { userId1, userId2 });

    return res.json({
      success: true,
      data: conversation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving conversation', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation',
      timestamp: new Date().toISOString()
    });
  }
});

// Mark message as read
router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const message = await messageService.markMessageAsRead(id);

    logger.info('Message marked as read', { messageId: id });

    return res.json({
      success: true,
      data: message,
      message: 'Message marked as read',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error marking message as read', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark message as read',
      timestamp: new Date().toISOString()
    });
  }
});

// Get unread message count
router.get('/unread/:userId/count', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const count = await messageService.getUnreadMessageCount(userId);

    logger.info('Unread message count retrieved', { userId, count });

    return res.json({
      success: true,
      data: { count },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving unread message count', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve unread message count',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete message
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user owns the message (sent or received) or is admin
    const message = await messageService.getMessageById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
        timestamp: new Date().toISOString()
      });
    }

    if (message.fromUserId !== currentUserId && message.toUserId !== currentUserId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only delete your own messages',
        timestamp: new Date().toISOString()
      });
    }

    await messageService.deleteMessage(id);

    logger.info('Message deleted', { messageId: id });

    return res.json({
      success: true,
      message: 'Message deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error deleting message', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete message',
      timestamp: new Date().toISOString()
    });
  }
});

// ========== ADMIN-ONLY ROUTES ==========

// Get all messages from speakers (admin only)
router.get('/admin/all-speaker-messages', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const messages = await messageService.getAllSpeakerMessages(
      parseInt(limit as string),
      parseInt(offset as string)
    );

    logger.info('All speaker messages retrieved', { count: messages.length });

    return res.json({
      success: true,
      data: messages,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving all speaker messages', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve speaker messages',
      timestamp: new Date().toISOString()
    });
  }
});

// Get messages by event (admin only)
router.get('/admin/event/:eventId', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const messages = await messageService.getMessagesByEvent(
      eventId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    logger.info('Messages by event retrieved', { eventId, count: messages.length });

    return res.json({
      success: true,
      data: messages,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving messages by event', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve messages by event',
      timestamp: new Date().toISOString()
    });
  }
});

// Get messages by speaker (admin only)
router.get('/admin/speaker/:speakerUserId', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { speakerUserId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!speakerUserId) {
      return res.status(400).json({
        success: false,
        error: 'Speaker User ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const messages = await messageService.getMessagesBySpeaker(
      speakerUserId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    logger.info('Messages by speaker retrieved', { speakerUserId, count: messages.length });

    return res.json({
      success: true,
      data: messages,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving messages by speaker', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve messages by speaker',
      timestamp: new Date().toISOString()
    });
  }
});

// Get threads by speaker (admin only)
router.get('/admin/speaker/:speakerUserId/threads', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { speakerUserId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!speakerUserId) {
      return res.status(400).json({
        success: false,
        error: 'Speaker User ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const threads = await messageService.getThreadsBySpeaker(
      speakerUserId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    logger.info('Threads by speaker retrieved', { speakerUserId, count: threads.length });

    return res.json({
      success: true,
      data: threads,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving threads by speaker', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve threads by speaker',
      timestamp: new Date().toISOString()
    });
  }
});

// Get unread speaker message count (admin only)
router.get('/admin/unread-count', adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const count = await messageService.getUnreadSpeakerMessageCount();

    logger.info('Unread speaker message count retrieved', { count });

    return res.json({
      success: true,
      data: { count },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving unread speaker message count', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve unread message count',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;