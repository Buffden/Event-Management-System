import express from 'express';
import dotenv from 'dotenv';
import passport from 'passport';
import { AuthService } from './auth.service';
import { prisma } from './database';
import { registerRoutes } from './routes/routes';
import {registerOAuthRoutes} from "./routes/oauth.routes";
import {configurePassport} from "./config/passport";

dotenv.config();

const app = express();
const authService = new AuthService();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
configurePassport(authService);

// Register routes
registerRoutes(app, authService);
registerOAuthRoutes(app, authService);


// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Connect to database
        await prisma.$connect();
        console.log('✅ Database connected');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    await prisma.$disconnect();
    process.exit(0);
});

startServer();