import { connect, Connection, Channel, ChannelModel } from 'amqplib';
import { logger } from '../utils/logger';

class RabbitMQService {
    private connection: ChannelModel | undefined;
    private channel: Channel | undefined;
    private rabbitmqUrl: string;

    constructor(rabbitmqUrl: string) {
        this.rabbitmqUrl = rabbitmqUrl;
    }

    public getConnection(): ChannelModel | undefined {
        return this.connection;
    }

    public getChannel(): Channel | undefined {
        return this.channel;
    }

    public async connect(): Promise<void> {
        try {
            logger.info('Connecting to RabbitMQ...');
            // Use the directly imported 'connect' function
            this.connection = await connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();
            logger.info('RabbitMQ connected successfully');
        } catch (error) {
            logger.error('Failed to connect to RabbitMQ', error as Error);
            throw error;
        }
    }

    public async setupQueues(): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel is not available. Please connect first.');
        }
        try {
            // Setup feedback service specific queues
            await this.channel.assertQueue('feedback.notifications', { durable: true });
            await this.channel.assertQueue('feedback.analytics', { durable: true });

            logger.info('Feedback service queues setup completed');
        } catch (error) {
            logger.error('Failed to setup queues', error as Error);
            throw error;
        }
    }

    public async sendMessage(queue: string, message: object): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel is not available. Please connect first.');
        }
        try {
            await this.channel.assertQueue(queue, { durable: true });

            this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
                persistent: true,
            });

            logger.info(`Message sent to queue "${queue}"`, { queue });
        } catch (error) {
            logger.error(`Error sending message to queue "${queue}"`, error as Error, { queue });
            throw error;
        }
    }

    public async close(): Promise<void> {
        if (this.channel) {
            await this.channel.close();
        }
        if (this.connection) {
            await this.connection.close();
        }
        logger.info('RabbitMQ connection closed');
    }
}

const rabbitMQService = new RabbitMQService(process.env.RABBITMQ_URL!);
export { rabbitMQService };