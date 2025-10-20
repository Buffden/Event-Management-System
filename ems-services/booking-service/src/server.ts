import express from 'express';
import { config } from 'dotenv';
import { prisma } from './database';
import { logger } from './utils/logger';
import { eventPublisherService } from './services/event-publisher.service';
import { eventConsumerService } from './services/event-consumer.service';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
config({ path: envFile });

const app = express();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'booking-service',
    timestamp: new Date().toISOString(),
    rabbitmq: eventPublisherService.isConnected() && eventConsumerService.isConnected()
  });
});

// Register routes (maintaining original paths)
app.use('/', routes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;


const startServer = async () => {
    try {
        // Connect to database
        await prisma.$connect();
        logger.info('Database connected');

        // Initialize RabbitMQ services
        await eventPublisherService.initialize();
        await eventConsumerService.initialize();
        logger.info('RabbitMQ services initialized');

        const server = app.listen(PORT, () => {
            logger.info(`Booking Service running on http://localhost:${PORT}`, { port: PORT });
        });

        // Handle graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            logger.info(`Received ${signal}. Shutting down gracefully...`, { signal });
            server.close(async () => {
                logger.info('HTTP server closed');
                await prisma.$disconnect();
                await eventPublisherService.close();
                await eventConsumerService.close();
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