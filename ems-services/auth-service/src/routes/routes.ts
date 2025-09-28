import {Express} from 'express';
import {AuthService} from '../services/auth.service';
import {authMiddleware} from '../middleware';
import {Request, Response} from 'express';
import {UpdateProfileRequest} from "../types/types";

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
     * @route   PUT http://localhost/api/auth/profile
     * @desc    Updates the profile of the authenticated user.
     * @access  Protected
     */
    app.put('/profile', authMiddleware, async (req: Request<{}, {}, UpdateProfileRequest>, res: Response) => {
        try {
            const updated = await authService.updateProfile(req.userid, req.body);
            res.json(updated);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   POST http://localhost/api/auth/logout
     * @desc    Stateless logout; client should discard the JWT.
     */
    app.post('/logout', authMiddleware, async (_req: Request, res: Response) => {
        // With stateless JWTs, logout is handled client-side by deleting the token
        // Optionally we could implement token blacklisting.
        res.status(200).json({success: true, message: 'Logged out'});
    });

    app.get('/verify-email', async (req: Request, res: Response) => {
        try {
            const {token} = req.query;
            if (!token || typeof token !== 'string') {
                return res.status(400).json({error: 'Verification token is required'});
            }

            const result = await authService.verifyEmail(token);
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
