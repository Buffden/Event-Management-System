import { Router } from 'express';
import { Request, Response } from 'express';
import { MessageService } from '../services/message.service';
import { logger } from '../utils/logger';

const router = Router();
const messageService = new MessageService();

// Create message
router.post('/', async (req: Request, res: Response) => {
  try {
    const { fromUserId, toUserId, subject, content, threadId } = req.body;
    
    if (!fromUserId || !toUserId || !subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'From User ID, To User ID, Subject, and Content are required',
        timestamp: new Date().toISOString()
      });
    }

    const message = await messageService.createMessage({
      fromUserId,
      toUserId,
      subject,
      content,
      threadId
    });

    logger.info('Message created', { 
      messageId: message.id, 
      fromUserId, 
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
router.get('/:id', async (req: Request, res: Response) => {
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
router.get('/inbox/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
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
router.get('/sent/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
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
router.get('/thread/:threadId', async (req: Request, res: Response) => {
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
router.get('/threads/:userId', async (req: Request, res: Response) => {
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
router.get('/conversation/:userId1/:userId2', async (req: Request, res: Response) => {
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
router.put('/:id/read', async (req: Request, res: Response) => {
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
router.get('/unread/:userId/count', async (req: Request, res: Response) => {
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
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required',
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

export default router;