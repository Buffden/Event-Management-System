import express from 'express';
import { config } from 'dotenv';
import { prisma } from './database';
import { logger } from './utils/logger';
import speakerRoutes from './routes/speaker.routes';
import invitationRoutes from './routes/invitation.routes';
import messageRoutes from './routes/message.routes';
import materialRoutes from './routes/material.routes';
import speakerAttendanceRoutes from './routes/speaker-attendance.routes';
import { errorMiddleware, notFoundHandler } from './middleware/error.middleware';
import { RabbitMQService } from './services/rabbitmq.service';
import { SpeakerService } from './services/speaker.service';

// Load environment variables based on NODE_ENV
const envFile = process.env['NODE_ENV'] === 'production' ? '.env.production' : '.env.local';
config({ path: envFile });

const app = express();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'speaker-service',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/speakers', speakerRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/speaker-attendance', speakerAttendanceRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorMiddleware);

// Start server
const PORT = process.env['PORT'] || 3000;

const startServer = async () => {
    try {
        // Try to connect to database (optional for testing)
        try {
            await prisma.$connect();
            logger.info('Database connected');
        } catch (dbError) {
            logger.warn('Database connection failed, running without database', { error: dbError });
        }

        // Initialize RabbitMQ for speaker profile creation from Auth Service
        const speakerService = new SpeakerService();
        const rabbitMQService = new RabbitMQService(process.env['RABBITMQ_URL'] || 'amqp://localhost:5672', speakerService);
        
        try {
            await rabbitMQService.connect();
            logger.info('RabbitMQ connected for speaker profile creation');
        } catch (rabbitError) {
            logger.warn('RabbitMQ connection failed, speaker profile creation will be manual', { error: rabbitError });
        }

        const server = app.listen(PORT, () => {
            logger.info(`Speaker Service running on http://localhost:${PORT}`, { port: PORT });
        });

        // Handle graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            logger.info(`Received ${signal}. Shutting down gracefully...`, { signal });
            server.close(async () => {
                logger.info('HTTP server closed');
                try {
                    await rabbitMQService.close();
                    await prisma.$disconnect();
                } catch (error) {
                    logger.warn('Error during shutdown', { error });
                }
                process.exit(0);
            });
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    } catch (error) {
        logger.error('Failed to start server', error as Error);
        process.exit(1);
    }
};

startServer().catch(error => {
    logger.error('Failed to start server', error);
    process.exit(1);
});
