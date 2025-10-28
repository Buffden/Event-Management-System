import { connect, Channel, ChannelModel } from 'amqplib';
import { logger } from '../utils/logger';
import { SpeakerService } from './speaker.service';

interface SpeakerProfileCreationMessage {
    type: 'SPEAKER_PROFILE_CREATION';
    data: {
        userId: string;
        name: string;
        email: string;
        bio?: string;
        expertise?: string[];
        isAvailable?: boolean;
    };
}

class RabbitMQService {
    private connection: ChannelModel | undefined;
    private channel: Channel | undefined;
    private rabbitmqUrl: string;
    private speakerService: SpeakerService;

    constructor(rabbitmqUrl: string, speakerService: SpeakerService) {
        this.rabbitmqUrl = rabbitmqUrl;
        this.speakerService = speakerService;
    }

    public async connect(): Promise<void> {
        try {
            logger.info('Connecting to RabbitMQ...');
            this.connection = await connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();
            
            // Set up the queue for speaker profile creation
            const queueName = 'speaker.profile.create';
            await this.channel.assertQueue(queueName, { durable: true });
            
            // Set up consumer
            await this.channel.consume(queueName, async (msg) => {
                if (msg && this.channel) {
                    try {
                        const message: SpeakerProfileCreationMessage = JSON.parse(msg.content.toString());
                        logger.info('Received speaker profile creation message', { 
                            type: message.type, 
                            userId: message.data.userId 
                        });
                        
                        await this.handleSpeakerProfileCreation(message.data);
                        
                        // Acknowledge the message
                        this.channel!.ack(msg);
                        logger.info('Speaker profile creation message processed successfully', { 
                            userId: message.data.userId 
                        });
                    } catch (error) {
                        logger.error('Error processing speaker profile creation message', error as Error);
                        // Reject the message and don't requeue it
                        this.channel!.nack(msg, false, false);
                    }
                }
            });
            
            logger.info('RabbitMQ connected and consumer set up successfully');
        } catch (error) {
            logger.error('Failed to connect to RabbitMQ', error as Error);
            throw error;
        }
    }

    private async handleSpeakerProfileCreation(data: SpeakerProfileCreationMessage['data']): Promise<void> {
        try {
            logger.info('Creating speaker profile from message', { userId: data.userId });
            
            const speakerProfile = await this.speakerService.createSpeakerProfile({
                userId: data.userId,
                name: data.name,
                email: data.email,
                bio: data.bio,
                expertise: data.expertise || [],
                isAvailable: data.isAvailable ?? true
            });
            
            logger.info('Speaker profile created successfully', { 
                speakerId: speakerProfile.id, 
                userId: data.userId 
            });
        } catch (error) {
            logger.error('Failed to create speaker profile from message', error as Error, { userId: data.userId });
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

export { RabbitMQService };
