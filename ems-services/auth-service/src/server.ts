import express from 'express';
import dotenv from 'dotenv';
import passport from 'passport';
import { prisma } from './database';
import { registerRoutes } from './routes/routes';
import {configurePassport} from "./config/passport";
import { AuthService } from './services/auth.service';
import {registerOAuthRoutes} from "./routes/oauth.routes";
import { rabbitMQService } from './services/rabbitmq.service';

dotenv.config();

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
    console.log('✅ Database connected');

    // Connect to RabbitMQ
    await rabbitMQService.connect();
    console.log('✅ RabbitMQ connected');

    const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
        console.log(`Received ${signal}. Shutting down gracefully...`);
        server.close(async () => {
            console.log('HTTP server closed.');
            await prisma.$disconnect();
            await rabbitMQService.close();
            process.exit(0);
        });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
};

startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});