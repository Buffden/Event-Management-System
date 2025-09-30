import express from 'express';
import { config } from 'dotenv';
import passport from 'passport';
import { prisma } from './database';
import { registerRoutes } from './routes/routes';
import {configurePassport} from "./config/passport";
import { AuthService } from './services/auth.service';
import {registerOAuthRoutes} from "./routes/oauth.routes";
import { rabbitMQService } from './services/rabbitmq.service';
import { logger } from './utils/logger';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
config({ path: envFile });

const app = express();
const authService = new AuthService();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(passport.initialize());
configurePassport(authService);

// Register routes
registerRoutes(app, authService);
registerOAuthRoutes(app, authService);


// Start server
const PORT = process.env.PORT || 3000;


const startServer = async () => {
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected');

    // Connect to RabbitMQ
    await rabbitMQService.connect();
    logger.info('RabbitMQ connected');

    const server = app.listen(PORT, () => {
        logger.info(`Server running on http://localhost:${PORT}`, { port: PORT });
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
};

startServer().catch(error => {
    logger.error('Failed to start server', error);
    process.exit(1);
});