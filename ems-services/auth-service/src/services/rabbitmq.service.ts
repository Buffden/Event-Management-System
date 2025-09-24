import { connect, Connection, Channel, ChannelModel } from 'amqplib';
import {EmailNotification} from "../types/types";

class RabbitMQService {
    private connection: ChannelModel | undefined;
    private channel: Channel | undefined;
    private rabbitmqUrl: string;

    constructor(rabbitmqUrl: string) {
        this.rabbitmqUrl = rabbitmqUrl;
    }

    public async connect(): Promise<void> {
        try {
            console.log('🔌 Connecting to RabbitMQ...');
            // Use the directly imported 'connect' function
            this.connection = await connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();
            console.log('✅ RabbitMQ connected successfully.');
        } catch (error) {
            console.error('❌ Failed to connect to RabbitMQ:', error);
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

            console.log(`📦 Message sent to queue "${queue}"`);
        } catch (error) {
            console.error(`❌ Error sending message to queue "${queue}":`, error);
        }
    }

    public async close(): Promise<void> {
        if (this.channel) {
            await this.channel.close();
        }
        if (this.connection) {
            await this.connection.close();
        }
        console.log('🔌 RabbitMQ connection closed.');
    }
}

const rabbitMQService = new RabbitMQService(process.env.RABBITMQ_URL!);
export { rabbitMQService, EmailNotification };