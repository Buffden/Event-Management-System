import { rabbitMQService } from './rabbitmq.service';
import { logger } from '../utils/logger';
import {
  EventPublishedMessage,
  EventUpdatedMessage,
  EventCancelledMessage
} from '../types';

class EventPublisherService {
  private readonly EXCHANGE_NAME = 'event.exchange';
  private readonly ROUTING_KEYS = {
    EVENT_PUBLISHED: 'event.published',
    EVENT_UPDATED: 'event.updated',
    EVENT_CANCELLED: 'event.cancelled'
  };

  /**
   * Publish event.published message
   */
  async publishEventPublished(message: EventPublishedMessage): Promise<void> {
    try {
      logger.info('Publishing event.published message', { eventId: message.eventId });

      const channel = rabbitMQService.getChannel();
      if (!channel) {
        throw new Error('RabbitMQ channel is not available');
      }

      // Declare exchange
      await channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true });

      // Publish message
      const published = channel.publish(
        this.EXCHANGE_NAME,
        this.ROUTING_KEYS.EVENT_PUBLISHED,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      if (!published) {
        throw new Error('Failed to publish event.published message');
      }

      logger.info('Event.published message published successfully', {
        eventId: message.eventId,
        routingKey: this.ROUTING_KEYS.EVENT_PUBLISHED
      });
    } catch (error) {
      logger.error('Failed to publish event.published message', error as Error, {
        eventId: message.eventId
      });
      throw error;
    }
  }

  /**
   * Publish event.updated message
   */
  async publishEventUpdated(message: EventUpdatedMessage): Promise<void> {
    try {
      logger.info('Publishing event.updated message', { eventId: message.eventId });

      const channel = rabbitMQService.getChannel();
      if (!channel) {
        throw new Error('RabbitMQ channel is not available');
      }

      // Declare exchange
      await channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true });

      // Publish message
      const published = channel.publish(
        this.EXCHANGE_NAME,
        this.ROUTING_KEYS.EVENT_UPDATED,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      if (!published) {
        throw new Error('Failed to publish event.updated message');
      }

      logger.info('Event.updated message published successfully', {
        eventId: message.eventId,
        routingKey: this.ROUTING_KEYS.EVENT_UPDATED
      });
    } catch (error) {
      logger.error('Failed to publish event.updated message', error as Error, {
        eventId: message.eventId
      });
      throw error;
    }
  }

  /**
   * Publish event.cancelled message
   */
  async publishEventCancelled(message: EventCancelledMessage): Promise<void> {
    try {
      logger.info('Publishing event.cancelled message', { eventId: message.eventId });

      const channel = rabbitMQService.getChannel();
      if (!channel) {
        throw new Error('RabbitMQ channel is not available');
      }

      // Declare exchange
      await channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true });

      // Publish message
      const published = channel.publish(
        this.EXCHANGE_NAME,
        this.ROUTING_KEYS.EVENT_CANCELLED,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      if (!published) {
        throw new Error('Failed to publish event.cancelled message');
      }

      logger.info('Event.cancelled message published successfully', {
        eventId: message.eventId,
        routingKey: this.ROUTING_KEYS.EVENT_CANCELLED
      });
    } catch (error) {
      logger.error('Failed to publish event.cancelled message', error as Error, {
        eventId: message.eventId
      });
      throw error;
    }
  }

  /**
   * Setup queues and bindings for consumers
   */
  async setupQueues(): Promise<void> {
    try {
      logger.info('Setting up event publisher queues and bindings');

      const channel = rabbitMQService.getChannel();
      if (!channel) {
        throw new Error('RabbitMQ channel is not available');
      }

      // Declare exchange
      await channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true });

      // Declare queues for different services
      const queues = [
        'booking-service.event.queue',
        'notification-service.event.queue'
      ];

      for (const queueName of queues) {
        await channel.assertQueue(queueName, { durable: true });

        // Bind to all event routing keys
        for (const routingKey of Object.values(this.ROUTING_KEYS)) {
          await channel.bindQueue(queueName, this.EXCHANGE_NAME, routingKey);
        }
      }

      logger.info('Event publisher queues and bindings setup completed');
    } catch (error) {
      logger.error('Failed to setup event publisher queues', error as Error);
      throw error;
    }
  }
}

export const eventPublisherService = new EventPublisherService();
