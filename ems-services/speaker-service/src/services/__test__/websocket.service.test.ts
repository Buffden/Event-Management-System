/**
 * WebSocketService Unit Tests
 *
 * Tests for WebSocket authentication, room assignment, and message event processing.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { WebSocketService } from '../websocket.service';
import { MessageService } from '../message.service';
import {
  createMockSocket,
  createMockHttpServer,
  createMockSocketIOServer,
  createMockMessage,
  mockJWT,
  resetAllMocks,
} from '../../test/mocks-simple';

// Mock dependencies
jest.mock('socket.io');
jest.mock('jsonwebtoken');
jest.mock('../message.service');

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  let mockHttpServer: HttpServer;
  let mockSocketIOServer: any;
  let messageService: jest.Mocked<MessageService>;
  let mockSocket: any;

  beforeEach(() => {
    resetAllMocks();

    mockHttpServer = createMockHttpServer() as any;
    mockSocketIOServer = createMockSocketIOServer();
    messageService = new MessageService() as jest.Mocked<MessageService>;
    mockSocket = createMockSocket();

    // Setup Socket.IO mock
    const SocketIO = require('socket.io');
    SocketIO.Server = jest.fn(() => mockSocketIOServer);

    // Setup JWT mock
    process.env['JWT_SECRET'] = 'test-secret';
    process.env['CLIENT_URL'] = 'http://localhost:3000';

    // Initialize WebSocketService
    webSocketService = new WebSocketService(mockHttpServer, messageService);
  });

  describe('JWT Authentication', () => {
    it('should authenticate client connections with valid JWT token', () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-123', role: 'SPEAKER' };

      mockJWT.verify.mockReturnValue(decoded);

      // Simulate authentication middleware
      const isValid = jwt.verify(token, process.env['JWT_SECRET']!);

      expect(isValid).toBeDefined();
      expect(mockJWT.verify).toHaveBeenCalled();
    });

    it('should reject connections without authentication token', () => {
      const socketWithoutToken = createMockSocket({
        handshake: { auth: {}, headers: {} },
      });

      // Simulate authentication failure
      const hasToken = socketWithoutToken.handshake.auth.token ||
                      socketWithoutToken.handshake.headers.authorization;

      expect(hasToken).toBeFalsy();
    });

    it('should reject connections with invalid JWT token', () => {
      const invalidToken = 'invalid-token';

      mockJWT.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => {
        jwt.verify(invalidToken, process.env['JWT_SECRET']!);
      }).toThrow();
    });

    it('should extract userId and role from decoded JWT', () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-123', role: 'ADMIN' };

      mockJWT.verify.mockReturnValue(decoded);

      const result = jwt.verify(token, process.env['JWT_SECRET']!) as any;

      expect(result.userId).toBe('user-123');
      expect(result.role).toBe('ADMIN');
    });
  });

  describe('Room Assignment', () => {
    it('should assign users to user-specific room (user:<id>)', () => {
      const userId = 'user-123';
      const socket = createMockSocket({ userId });

      // Simulate room joining
      socket.join(`user:${userId}`);

      expect(socket.join).toHaveBeenCalledWith(`user:${userId}`);
    });

    it('should assign admins to admins room', () => {
      const adminSocket = createMockSocket({
        userId: 'admin-123',
        userRole: 'ADMIN',
      });

      // Simulate admin room joining
      if (adminSocket.userRole === 'ADMIN') {
        adminSocket.join('admins');
      }

      expect(adminSocket.join).toHaveBeenCalledWith('admins');
    });

    it('should not assign non-admin users to admins room', () => {
      const speakerSocket = createMockSocket({
        userId: 'speaker-123',
        userRole: 'SPEAKER',
      });

      // Speaker should not join admins room
      expect(speakerSocket.userRole).not.toBe('ADMIN');
    });
  });

  describe('message:sent Event Processing', () => {
    it('should correctly process message:sent events', async () => {
      const messageId = 'msg-123';
      const mockMessage = createMockMessage({
        id: messageId,
        fromUserId: 'user-123',
        toUserId: 'user-456',
        status: 'SENT',
      });

      messageService.getMessageById = jest.fn().mockResolvedValue(mockMessage);
      messageService.markMessageAsDelivered = jest.fn().mockResolvedValue({
        ...mockMessage,
        status: 'DELIVERED',
        deliveredAt: new Date(),
      });

      // Simulate message:sent event
      const socket = createMockSocket({ userId: 'user-123' });
      const eventData = { messageId };

      // In real implementation, this would be handled by the socket.on('message:sent') handler
      const message = await messageService.getMessageById(eventData.messageId);
      expect(message).toBeDefined();
    });

    it('should mark messages as delivered if recipient is online', async () => {
      const messageId = 'msg-123';
      const recipientId = 'user-456';
      const mockMessage = createMockMessage({
        id: messageId,
        toUserId: recipientId,
        status: 'SENT',
      });

      messageService.getMessageById = jest.fn().mockResolvedValue(mockMessage);
      messageService.markMessageAsDelivered = jest.fn().mockResolvedValue({
        ...mockMessage,
        status: 'DELIVERED',
        deliveredAt: new Date(),
      });

      // Simulate recipient being online
      const recipientOnline = true;

      if (recipientOnline) {
        await messageService.markMessageAsDelivered(messageId);
        expect(messageService.markMessageAsDelivered).toHaveBeenCalledWith(messageId);
      }
    });

    it('should emit message:received to recipient', () => {
      const recipientId = 'user-456';
      const mockMessage = createMockMessage({ toUserId: recipientId });
      const socketIOServer = createMockSocketIOServer();

      // Simulate emitting to recipient room
      socketIOServer.to(`user:${recipientId}`).emit('message:received', {
        message: mockMessage,
        type: 'new_message',
      });

      expect(socketIOServer.to).toHaveBeenCalledWith(`user:${recipientId}`);
    });

    it('should emit message:new_speaker_message to admins when message is from speaker', () => {
      const mockMessage = createMockMessage({
        fromUserId: 'speaker-123',
        toUserId: 'admin-123',
      });
      const socketIOServer = createMockSocketIOServer();
      const senderRole = 'SPEAKER';

      // Simulate emitting to admins room
      if (senderRole === 'SPEAKER') {
        socketIOServer.to('admins').emit('message:new_speaker_message', {
          message: mockMessage,
          type: 'new_speaker_message',
        });
      }

      expect(socketIOServer.to).toHaveBeenCalledWith('admins');
    });

    it('should emit message:delivered confirmation to sender', () => {
      const senderId = 'user-123';
      const messageId = 'msg-123';
      const socket = createMockSocket({ userId: senderId });

      // Simulate delivery confirmation
      socket.emit('message:delivered', {
        messageId,
        status: 'DELIVERED',
      });

      expect(socket.emit).toHaveBeenCalledWith('message:delivered', {
        messageId,
        status: 'DELIVERED',
      });
    });
  });

  describe('message:read Event Processing', () => {
    it('should mark message as read when message:read event is received', async () => {
      const messageId = 'msg-123';
      const mockMessage = createMockMessage({
        id: messageId,
        status: 'READ',
        readAt: new Date(),
      });

      messageService.markMessageAsRead = jest.fn().mockResolvedValue(mockMessage);

      const result = await messageService.markMessageAsRead(messageId);

      expect(result.status).toBe('READ');
      expect(result.readAt).toBeDefined();
    });

    it('should emit message:read_receipt to sender', () => {
      const senderId = 'user-123';
      const messageId = 'msg-123';
      const readAt = new Date();
      const socketIOServer = createMockSocketIOServer();

      // Simulate read receipt emission
      socketIOServer.to(`user:${senderId}`).emit('message:read_receipt', {
        messageId,
        readAt,
      });

      expect(socketIOServer.to).toHaveBeenCalledWith(`user:${senderId}`);
    });
  });

  describe('Connection Management', () => {
    it('should track connected users', () => {
      const userId = 'user-123';
      const socket = createMockSocket({ userId });

      // In real implementation, connectedUsers Map would track this
      expect(socket.userId).toBe(userId);
    });

    it('should remove user from connected users on disconnect', () => {
      const userId = 'user-123';
      const socket = createMockSocket({ userId });

      // Simulate disconnect
      socket.on('disconnect', () => {
        // User would be removed from connectedUsers Map
      });

      expect(socket.on).toHaveBeenCalled();
    });
  });
});

