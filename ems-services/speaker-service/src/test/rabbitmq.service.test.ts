/**
 * Comprehensive Test Suite for RabbitMQ Service
 *
 * Tests all RabbitMQ functionality including:
 * - Connection management
 * - Message consumption
 * - Speaker profile creation handling
 * - Error handling
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { mockLogger, resetAllMocks } from './mocks-simple';

// Mock amqplib - create mocks inside factory to avoid hoisting issues
const mockChannel: any = {
  assertQueue: jest.fn(),
  consume: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn(),
};

jest.mock('amqplib', () => {
  const mockConnectFn = jest.fn() as jest.MockedFunction<(...args: any[]) => Promise<any>>;
  const mockConn: any = {
    createChannel: jest.fn(),
    close: jest.fn(),
  };
  mockConn.createChannel.mockResolvedValue(mockChannel);
  mockConnectFn.mockResolvedValue(mockConn);

  return {
    connect: mockConnectFn,
  };
});

// Mock SpeakerService
const mockSpeakerService = {
  createSpeakerProfile: jest.fn(),
};

jest.mock('../services/speaker.service', () => ({
  SpeakerService: jest.fn(() => mockSpeakerService),
}));

import { RabbitMQService } from '../services/rabbitmq.service';

describe('RabbitMQService', () => {
  let rabbitmqService: RabbitMQService;
  const testRabbitmqUrl = 'amqp://localhost:5672';

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    rabbitmqService = new RabbitMQService(testRabbitmqUrl, mockSpeakerService as any);

    // Get the mocked connect function and set up mocks
    const amqplib = jest.requireMock('amqplib');
    const mockConnect = amqplib.connect;
    const mockConn: any = {
      createChannel: jest.fn(),
      close: jest.fn(),
    };
    mockConn.createChannel.mockResolvedValue(mockChannel);
    mockConnect.mockResolvedValue(mockConn);

    // Reset mocks
    mockChannel.assertQueue.mockResolvedValue(undefined);
    mockChannel.consume.mockImplementation(() => {});

    // Store mockChannel for use in tests
    (global as any).__mockChannel = mockChannel;
  });

  afterEach(() => {
    // Clean up
    if (rabbitmqService) {
      rabbitmqService.close().catch(() => {
        // Ignore cleanup errors
      });
    }
  });

  describe('constructor()', () => {
    it('should create RabbitMQService with provided URL and speaker service', () => {
      const service = new RabbitMQService('amqp://test:5672', mockSpeakerService as any);
      expect(service).toBeDefined();
    });
  });

  describe('connect()', () => {
    it('should connect to RabbitMQ and set up consumer', async () => {
      const amqplib = jest.requireMock('amqplib');
      const mockConnect = amqplib.connect;
      const mockChannel = (global as any).__mockChannel;

      await rabbitmqService.connect();

      expect(mockConnect).toHaveBeenCalledWith(testRabbitmqUrl);
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('speaker.profile.create', { durable: true });
      expect(mockChannel.consume).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const amqplib = jest.requireMock('amqplib');
      const mockConnect = amqplib.connect;
      const connectionError = new Error('Connection failed');
      mockConnect.mockRejectedValueOnce(connectionError);

      await expect(rabbitmqService.connect()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        expect.any(Error)
      );
    });

    it('should handle channel creation errors', async () => {
      const amqplib = jest.requireMock('amqplib');
      const mockConnect = amqplib.connect;
      const mockConn: any = {
        createChannel: jest.fn(),
        close: jest.fn(),
      };
      const channelError = new Error('Channel creation failed');
      mockConn.createChannel.mockRejectedValueOnce(channelError);
      mockConnect.mockResolvedValueOnce(mockConn);

      await expect(rabbitmqService.connect()).rejects.toThrow('Channel creation failed');
    });
  });

  describe('handleSpeakerProfileCreation()', () => {
    it('should process speaker profile creation message', async () => {
      const mockChannel = (global as any).__mockChannel;
      await rabbitmqService.connect();

      const messageData = {
        userId: 'user-123',
        name: 'Test Speaker',
        email: 'speaker@example.com',
        bio: 'Test bio',
        expertise: ['Technology'],
        isAvailable: true,
      };

      const mockProfile = {
        id: 'speaker-123',
        ...messageData,
      };
      mockSpeakerService.createSpeakerProfile.mockResolvedValue(mockProfile);

      // Get the consume callback
      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const mockMessage = {
        content: Buffer.from(JSON.stringify({
          type: 'SPEAKER_PROFILE_CREATION',
          data: messageData,
        })),
      };

      await consumeCallback(mockMessage);

      expect(mockSpeakerService.createSpeakerProfile).toHaveBeenCalledWith(messageData);
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle invalid message format', async () => {
      const mockChannel = (global as any).__mockChannel;
      await rabbitmqService.connect();

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ invalid: 'message' })),
      };

      await consumeCallback(mockMessage);

      expect(mockSpeakerService.createSpeakerProfile).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle null message', async () => {
      const mockChannel = (global as any).__mockChannel;
      await rabbitmqService.connect();

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      await consumeCallback(null);

      expect(mockSpeakerService.createSpeakerProfile).not.toHaveBeenCalled();
    });

    it('should handle speaker profile creation errors', async () => {
      const mockChannel = (global as any).__mockChannel;
      await rabbitmqService.connect();

      const messageData = {
        userId: 'user-123',
        name: 'Test Speaker',
        email: 'speaker@example.com',
      };

      mockSpeakerService.createSpeakerProfile.mockRejectedValue(
        new Error('Profile already exists')
      );

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const mockMessage = {
        content: Buffer.from(JSON.stringify({
          type: 'SPEAKER_PROFILE_CREATION',
          data: messageData,
        })),
      };

      await consumeCallback(mockMessage);

      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle JSON parse errors', async () => {
      const mockChannel = (global as any).__mockChannel;
      await rabbitmqService.connect();

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const mockMessage = {
        content: Buffer.from('invalid json'),
      };

      await consumeCallback(mockMessage);

      expect(mockSpeakerService.createSpeakerProfile).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });
  });

  describe('close()', () => {
    it('should close channel and connection successfully', async () => {
      const mockChannel = (global as any).__mockChannel;
      await rabbitmqService.connect();
      mockChannel.close.mockResolvedValue(undefined);
      const amqplib = jest.requireMock('amqplib');
      const mockConnect = amqplib.connect;
      const mockConn = await mockConnect('test');
      mockConn.close.mockResolvedValue(undefined);

      await rabbitmqService.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConn.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ connection closed');
    });

    it('should handle close when not connected', async () => {
      await rabbitmqService.close();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle channel close errors gracefully', async () => {
      const mockChannel = (global as any).__mockChannel;
      await rabbitmqService.connect();
      const closeError = new Error('Channel close failed');
      mockChannel.close.mockRejectedValueOnce(closeError);

      await expect(rabbitmqService.close()).rejects.toThrow('Channel close failed');
    });
  });
});

