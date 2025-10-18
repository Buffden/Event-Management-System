import { connect, Connection, Channel, ChannelModel } from 'amqplib';
import { prisma } from '../database';
import { logger } from '../utils/logger';
import { bookingService } from './booking.service';
import {
  EventPublishedMessage,
  EventCancelledMessage
} from '../types';

class EventConsumerService {
  private connection: ChannelModel | undefined;
  private channel: Channel | undefined;
  private readonly exchangeName = 'event.exchange';
  private readonly queueName = 'booking_service_event_queue';
  private readonly routingKeys = {
    eventPublished: 'event.published',
    eventCancelled: 'event.cancelled'
  };

  /**
   * Initialize RabbitMQ connection and start consuming events
   */
  async initialize(): Promise<void> {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

      logger.info('Connecting to RabbitMQ for event consumption', { url: rabbitmqUrl });

      this.connection = await connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declare exchange
      await this.channel.assertExchange(this.exchangeName, 'topic', {
        durable: true
      });

      // Declare queue
      await this.channel.assertQueue(this.queueName, {
        durable: true
      });

      // Bind queue to exchange with routing keys
      await this.channel.bindQueue(this.queueName, this.exchangeName, this.routingKeys.eventPublished);
      await this.channel.bindQueue(this.queueName, this.exchangeName, this.routingKeys.eventCancelled);

      // Set prefetch to 1 to process messages one at a time
      await this.channel.prefetch(1);

      // Start consuming messages
      await this.channel.consume(this.queueName, this.handleMessage.bind(this), {
        noAck: false
      });

      logger.info('Event consumer service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize event consumer service', error as Error);
      throw error;
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(message: any | null): Promise<void> {
    if (!message || !this.channel) {
      return;
    }

    try {
      const content = message.content.toString();
      const routingKey = message.fields.routingKey;
      const messageData = JSON.parse(content);

      logger.info('Received event message', { routingKey, messageData });

      switch (routingKey) {
        case this.routingKeys.eventPublished:
          await this.handleEventPublished(messageData as EventPublishedMessage);
          break;
        case this.routingKeys.eventCancelled:
          await this.handleEventCancelled(messageData as EventCancelledMessage);
          break;
        default:
          logger.warn('Unknown routing key received', { routingKey });
      }

      // Acknowledge message
      this.channel.ack(message);
    } catch (error) {
      logger.error('Failed to handle message', error as Error, {
        routingKey: message.fields.routingKey,
        content: message.content.toString()
      });

      // Reject message and requeue it
      if (this.channel) {
        this.channel.nack(message, false, true);
      }
    }
  }

  /**
   * Handle event published message
   */
  private async handleEventPublished(message: EventPublishedMessage): Promise<void> {
    try {
      logger.info('Handling event published message', { eventId: message.eventId, capacity: message.capacity });

      // Create or update event in local cache
      await prisma.event.upsert({
        where: { id: message.eventId },
        update: {
          capacity: message.capacity,
          isActive: true
        },
        create: {
          id: message.eventId,
          capacity: message.capacity,
          isActive: true
        }
      });

      logger.info('Event cache updated successfully', { eventId: message.eventId });
    } catch (error) {
      logger.error('Failed to handle event published message', error as Error, message);
      throw error;
    }
  }

  /**
   * Handle event cancelled message
   */
  private async handleEventCancelled(message: EventCancelledMessage): Promise<void> {
    try {
      logger.info('Handling event cancelled message', { eventId: message.eventId });

      // Update event status to inactive
      await prisma.event.update({
        where: { id: message.eventId },
        data: { isActive: false }
      });

      // Cancel all bookings for this event
      const cancelledCount = await bookingService.cancelAllEventBookings(message.eventId);

      logger.info('Event cancelled and bookings updated', {
        eventId: message.eventId,
        cancelledBookings: cancelledCount
      });
    } catch (error) {
      logger.error('Failed to handle event cancelled message', error as Error, message);
      throw error;
    }
  }

  /**
   * Close RabbitMQ connection
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = undefined;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = undefined;
      }

      logger.info('Event consumer service connection closed');
    } catch (error) {
      logger.error('Failed to close event consumer service connection', error as Error);
      throw error;
    }
  }

  /**
   * Check if connection is healthy
   */
  isConnected(): boolean {
    return this.connection !== undefined && this.channel !== undefined;
  }
}

export const eventConsumerService = new EventConsumerService();
