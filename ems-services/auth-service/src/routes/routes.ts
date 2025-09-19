import {Express} from 'express';
import {AuthService} from '../auth.service';
import {authMiddleware} from '../middleware';
import {Request, Response} from 'express';

export function registerRoutes(app: Express, authService: AuthService) {
    /**
     * @route   GET http://localhost/api/auth/register
     * @desc    Registers a new user.
     */
    app.post('/register', async (req, res) => {
        try {
            const result = await authService.register(req.body);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   GET http://localhost/api/auth/login
     * @desc    Logs in an existing user.
     */
    app.post('/login', async (req, res) => {
        try {
            const result = await authService.login(req.body);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   GET http://localhost/api/auth/check-user
     * @desc    Checks if a user exists by email.
     */
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

    /**
     * @route   POST http://localhost/api/auth/verify-token
     * @desc    Verifies the validity of a JWT token.
     */
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

    /**
     * @route   GET http://localhost/api/auth/profile
     * @desc    Retrieves the profile of the authenticated user.
     * @access  Protected
     */
    app.get('/profile', authMiddleware, async (req: Request, res) => {
        try {
            const result = await authService.getProfile(req.userid);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   GET http://localhost/api/auth/health
     * @desc    Health check endpoint to verify the service is running.
     */
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString()
        });
    });

}
