// src/consumers/NotificationConsumer.ts

import { connect, ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { emailService } from '../services/email.service';
import { AnyNotification, EmailNotification, MESSAGE_TYPE } from '../types/types';

// A type guard to safely check if a message is a valid notification
function isNotification(obj: any): obj is AnyNotification {
    return obj && typeof obj.type === 'string' && 'message' in obj;
}

export class NotificationConsumer {
    private connection: ChannelModel | null = null; // Correct type is Connection
    private channel: Channel | null = null;
    private readonly rabbitmqUrl: string;
    private readonly queueName = 'notification.email';

    constructor(rabbitmqUrl: string) {
        this.rabbitmqUrl = rabbitmqUrl;
    }

    public async start(): Promise<void> {
        try {
            console.log('🚀 Starting Notification Consumer...');
            this.connection = await connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            await this.channel.assertQueue(this.queueName, { durable: true });
            this.channel.prefetch(1);

            console.log(`👂 Worker listening for messages on queue "${this.queueName}"`);
            this.channel.consume(this.queueName, this.handleMessage.bind(this), { noAck: false });
        } catch (error) {
            console.error('❌ Error starting consumer:', error);
            setTimeout(() => {
                this.start().catch(err => console.error('❌ Retry failed:', err));
            }, 5000); // Retry after 5 seconds
        }
    }

    private async handleMessage(msg: ConsumeMessage | null) {
        if (!msg || !this.channel) return;

        try {
            const notification = JSON.parse(msg.content.toString());

            // Use the type guard to validate the message structure
            if (!isNotification(notification)) {
                throw new Error('Invalid message format received.');
            }

            console.log(`Processing message of type: ${notification.type}`);

            // Use a switch statement for scalability
            switch (notification.type) {
                case MESSAGE_TYPE.EMAIL:
                    // TypeScript now knows `notification` is of type `EmailNotification`
                    // and that `notification.message` has `to`, `subject`, and `body`.
                    await emailService.sendEmail(notification.message);
                    console.log(`✅ Email sent to ${notification.message.to}`);
                    break;

                // case MESSAGE_TYPE.SMS:
                //     // Handle SMS messages here
                //     break;

                default:
                    // Handle unknown message types
                    throw new Error(`Unsupported message type: ${notification.type}`);
            }

            // Acknowledge the message on success
            this.channel.ack(msg);

        } catch (error) {
            console.error('❌ Error processing message. It will be rejected.', error);
            // Reject the message (don't requeue) to avoid poison message loops
            this.channel.nack(msg, false, false);
        }
    }

    public async stop(): Promise<void> {
        console.log('🔌 Shutting down consumer...');
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
        } catch (error) {
            console.error('Error during consumer shutdown:', error);
        }
    }
}