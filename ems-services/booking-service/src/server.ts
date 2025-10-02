import express from 'express';
import { config } from 'dotenv';
import { prisma } from './database';
import { logger } from './utils/logger';
import { rabbitMQService } from "./services/rabbitmq.service";

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
config({ path: envFile });

const app = express();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'event-service',
    timestamp: new Date().toISOString()
  });
});

// Register routes

// Start server
const PORT = process.env.PORT || 3000;


const startServer = async () => {
    try {
        // Connect to database
        await prisma.$connect();
        logger.info('Database connected');

        // Connect to RabbitMQ
        await rabbitMQService.connect();
        logger.info('RabbitMQ connected');

        logger.info('Event publisher setup completed');

        const server = app.listen(PORT, () => {
            logger.info(`Event Service running on http://localhost:${PORT}`, { port: PORT });
        });

        // Handle graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            logger.info(`Received ${signal}. Shutting down gracefully...`, { signal });
            server.close(async () => {
                logger.info('HTTP server closed');
                await prisma.$disconnect();
                await rabbitMQService.close();
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