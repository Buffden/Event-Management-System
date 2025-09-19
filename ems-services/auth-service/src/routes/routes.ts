import {Express} from 'express';
import {AuthService} from '../auth.service';
import {authMiddleware} from '../middleware';
import {Request, Response} from 'express';

export function registerRoutes(app: Express, authService: AuthService) {
    // Routes
    app.post('/register', async (req, res) => {
        try {
            const result = await authService.register(req.body);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    });

    app.post('/login', async (req, res) => {
        try {
            const result = await authService.login(req.body);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    });

    app.get('/check-user', async (req, res) => {
        try {
            const {email} = req.query;
            if (!email || typeof email !== 'string') {
                return res.status(400).json({error: 'Email is required'});
            }

            const result = await authService.checkUserExists(email);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    });

    app.post('/verify-token', async (req, res) => {
        try {
            const {token} = req.body;
            if (!token) {
                return res.status(400).json({error: 'Token is required'});
            }

            const result = await authService.verifyToken(token);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    });

    app.get('/profile', authMiddleware, async (req: Request, res) => {
        try {
            const result = await authService.getProfile(req.userid || '');
            res.json(result);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    });

    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString()
        });
    });

}
