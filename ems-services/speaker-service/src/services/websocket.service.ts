import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { MessageService } from './message.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private messageService: MessageService;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(httpServer: HttpServer, messageService: MessageService) {
    this.messageService = messageService;
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env['CLIENT_URL'] || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io'
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth['token'] || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const JWT_SECRET = process.env['JWT_SECRET'];
        if (!JWT_SECRET) {
          logger.error('JWT_SECRET not configured');
          return next(new Error('Server configuration error'));
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;

        logger.debug('WebSocket user authenticated', {
          userId: socket.userId,
          role: socket.userRole
        });

        next();
      } catch (error) {
        logger.error('WebSocket authentication failed', error as Error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.userId!;
      const userRole = socket.userRole!;

      logger.info('WebSocket client connected', { userId, userRole });

      // Store connected user
      this.connectedUsers.set(userId, socket);

      // Join user-specific room
      socket.join(`user:${userId}`);

      // Join role-specific room (for admins to receive all speaker messages)
      if (userRole === 'ADMIN') {
        socket.join('admins');
      }

      // Handle message sent event
      socket.on('message:sent', async (data: { messageId: string }) => {
        try {
          const message = await this.messageService.getMessageById(data.messageId);
          if (!message) {
            return;
          }

          // Mark as delivered if recipient is online
          if (this.connectedUsers.has(message.toUserId)) {
            await this.messageService.markMessageAsDelivered(data.messageId);
            message.status = 'DELIVERED';
            message.deliveredAt = new Date();
          }

          // Emit to recipient
          this.io.to(`user:${message.toUserId}`).emit('message:received', {
            message,
            type: 'new_message'
          });

          // If message is from a speaker, notify all admins
          if (userRole === 'SPEAKER') {
            this.io.to('admins').emit('message:new_speaker_message', {
              message,
              type: 'new_speaker_message'
            });
          }

          // Emit confirmation to sender
          socket.emit('message:delivered', {
            messageId: data.messageId,
            status: message.status
          });
        } catch (error) {
          logger.error('Error handling message:sent event', error as Error);
          socket.emit('error', { message: 'Failed to process message' });
        }
      });

      // Handle message read event
      socket.on('message:read', async (data: { messageId: string }) => {
        try {
          const message = await this.messageService.markMessageAsRead(data.messageId);

          // Notify sender that message was read
          this.io.to(`user:${message.fromUserId}`).emit('message:read_receipt', {
            messageId: data.messageId,
            readAt: message.readAt
          });
        } catch (error) {
          logger.error('Error handling message:read event', error as Error);
          socket.emit('error', { message: 'Failed to mark message as read' });
        }
      });

      // Handle typing indicator
      socket.on('message:typing', (data: { toUserId: string, isTyping: boolean }) => {
        this.io.to(`user:${data.toUserId}`).emit('message:typing', {
          fromUserId: userId,
          isTyping: data.isTyping
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', { userId });
        this.connectedUsers.delete(userId);
      });
    });
  }

  /**
   * Emit new message to specific user
   */
  public emitNewMessage(userId: string, message: any) {
    this.io.to(`user:${userId}`).emit('message:received', {
      message,
      type: 'new_message'
    });
  }

  /**
   * Emit message read receipt to sender
   */
  public emitReadReceipt(userId: string, messageId: string, readAt: Date) {
    this.io.to(`user:${userId}`).emit('message:read_receipt', {
      messageId,
      readAt
    });
  }

  /**
   * Emit new speaker message to all admins
   */
  public emitNewSpeakerMessage(message: any) {
    this.io.to('admins').emit('message:new_speaker_message', {
      message,
      type: 'new_speaker_message'
    });
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Close WebSocket server
   */
  public close() {
    this.io.close();
  }
}

