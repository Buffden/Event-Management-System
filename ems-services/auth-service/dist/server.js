"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_service_1 = require("./auth.service");
const middleware_1 = require("./middleware");
const database_1 = require("./database");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const authService = new auth_service_1.AuthService();
// Middleware
app.use(express_1.default.json());
// Routes
app.post('/register', async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.post('/login', async (req, res) => {
    try {
        const result = await authService.login(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.get('/check-user', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email is required' });
        }
        const result = await authService.checkUserExists(email);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.post('/verify-token', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        const result = await authService.verifyToken(token);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.get('/profile', middleware_1.authMiddleware, async (req, res) => {
    try {
        const result = await authService.getProfile(req.user.id);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});
// Start server
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        // Connect to database
        await database_1.prisma.$connect();
        console.log('✅ Database connected');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await database_1.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    await database_1.prisma.$disconnect();
    process.exit(0);
});
startServer();
