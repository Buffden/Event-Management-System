import { connect, Connection, Channel, ChannelModel } from 'amqplib';
import { logger } from '../utils/logger';
import {
  BookingConfirmedMessage,
  BookingCancelledMessage,
  TicketGeneratedMessage
} from '../types';

class EventPublisherService {
  private connection: ChannelModel | undefined;
  private channel: Channel | undefined;
  private readonly exchangeName = 'booking_events';
  private readonly routingKeys = {
    bookingConfirmed: 'booking.confirmed',
    bookingCancelled: 'booking.cancelled',
    ticketGenerated: 'ticket.generated'
  };

  /**
   * Initialize RabbitMQ connection and channel
   */
  async initialize(): Promise<void> {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

      logger.info('Connecting to RabbitMQ', { url: rabbitmqUrl });

      this.connection = await connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declare exchange
      await this.channel.assertExchange(this.exchangeName, 'topic', {
        durable: true
      });

      logger.info('RabbitMQ connection established successfully');
    } catch (error) {
      logger.error('Failed to initialize RabbitMQ connection', error as Error);
      throw error;
    }
  }

  /**
   * Publish booking confirmed event
   */
  async publishBookingConfirmed(message: BookingConfirmedMessage): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      const messageBuffer = Buffer.from(JSON.stringify(message));

      const published = this.channel.publish(
        this.exchangeName,
        this.routingKeys.bookingConfirmed,
        messageBuffer,
        {
          persistent: true,
          timestamp: Date.now()
        }
      );

      if (published) {
        logger.info('Published booking confirmed event', {
          bookingId: message.bookingId,
          userId: message.userId,
          eventId: message.eventId
        });
      } else {
        logger.warn('Failed to publish booking confirmed event - channel buffer full');
      }
    } catch (error) {
      logger.error('Failed to publish booking confirmed event', error as Error, message);
      throw error;
    }
  }

  /**
   * Publish booking cancelled event
   */
  async publishBookingCancelled(message: BookingCancelledMessage): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      const messageBuffer = Buffer.from(JSON.stringify(message));

      const published = this.channel.publish(
        this.exchangeName,
        this.routingKeys.bookingCancelled,
        messageBuffer,
        {
          persistent: true,
          timestamp: Date.now()
        }
      );

      if (published) {
        logger.info('Published booking cancelled event', {
          bookingId: message.bookingId,
          userId: message.userId,
          eventId: message.eventId
        });
      } else {
        logger.warn('Failed to publish booking cancelled event - channel buffer full');
      }
    } catch (error) {
      logger.error('Failed to publish booking cancelled event', error as Error, message);
      throw error;
    }
  }

  /**
   * Publish ticket generated event
   * AC3: Tickets are automatically sent to users via email with QR code
   */
  async publishTicketGenerated(message: TicketGeneratedMessage): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      const messageBuffer = Buffer.from(JSON.stringify(message));

      const published = this.channel.publish(
        this.exchangeName,
        this.routingKeys.ticketGenerated,
        messageBuffer,
        {
          persistent: true,
          timestamp: Date.now()
        }
      );

      if (published) {
        logger.info('Published ticket generated event', {
          ticketId: message.ticketId,
          userId: message.userId,
          eventId: message.eventId
        });
      } else {
        logger.warn('Failed to publish ticket generated event - channel buffer full');
      }
    } catch (error) {
      logger.error('Failed to publish ticket generated event', error as Error, message);
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

      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Failed to close RabbitMQ connection', error as Error);
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

export const eventPublisherService = new EventPublisherService();
