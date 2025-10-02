// src/routes/routes.ts - UPDATED VERSION
import {Express} from 'express';
import {AuthService} from '../services/auth.service';
import {authMiddleware, contextMiddleware} from '../middleware/context.middleware';
import {Request, Response} from 'express';
import {UpdateProfileRequest} from "../types/types";
import {contextService} from '../services/context.service';
import {logger} from '../utils/logger';

export function registerRoutes(app: Express, authService: AuthService) {
    // Apply context middleware to ALL routes for request correlation
    app.use('/api/auth', contextMiddleware);

    /**
     * @route   POST /api/auth/register
     * @desc    Registers a new user.
     */
    app.post('/register', async (req: Request, res: Response) => {
        try {
            logger.info("/register - User registration attempt", {email: req.body.email});
            const result = await authService.register(req.body);
            logger.info("/register - User registered successfully", {userId: result.id});
            res.status(201).json({
                message: 'Registration successful! Please check your email to verify your account.',
                token: result.token,
                user: result.user
            });
        } catch (error: any) {
            logger.error("/register - Registration failed", error, {email: req.body.email});
            return res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   POST /api/auth/login
     * @desc    Logs in an existing user.
     */
    app.post('/login', async (req: Request, res: Response) => {
        try {
            logger.info("/login - User login attempt", {email: req.body.email});
            const result = await authService.login(req.body);
            logger.info("/login - User logged in successfully", {userId: result.id});
            res.json({
                message: 'Login successful',
                token: result.token,
                user: result.user
            });
        } catch (error: any) {
            logger.error("/login - Login failed", error, {email: req.body.email});
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   GET /api/auth/check-user
     * @desc    Checks if a user exists by email.
     */
    app.get('/check-user', async (req: Request, res: Response) => {
        try {
            const {email} = req.query;
            logger.info("/check-user - User check attempt", {email});
            if (!email || typeof email !== 'string') {
                return res.status(400).json({error: 'Email is required'});
            }

            const result = await authService.checkUserExists(email);
            logger.info("/check-user - User existence check", {email, exists: result.exists});
            res.json({
                message: 'User exists',
                exists: result.exists
            });
        } catch (error: any) {
            logger.error("/check-user - User check failed", error);
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   POST /api/auth/verify-token
     * @desc    Verifies the validity of a JWT token.
     */
    app.post('/verify-token', async (req: Request, res: Response) => {
        try {
            logger.info("/verify-token - Token verification attempt");
            const { token } = req.body;
            if (!token) {
                return res.status(400).send('Verification token is missing.');
            }

            const result = await authService.verifyToken(token as string);
            logger.info("/verify-token -Token verification ", {valid: result.valid, userId: result.user?.id});
            const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?accessToken=${token}`;
            res.status(200).send(result.valid);
        } catch (error: any) {
            logger.error("Token verification failed ", error);
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   GET /api/auth/profile
     * @desc    Retrieves the profile of the authenticated user.
     * @access  Protected
     */
    app.get('/profile', authMiddleware, async (req: Request, res: Response) => {
        try {
            const userId = contextService.getCurrentUserId();

            // Check if user is cached in context
            let user = contextService.getCurrentUser();
            if (!user) {
                user = await authService.getProfile(userId);
                contextService.setCurrentUser(user); // Cache for this request
            }

            logger.info("Profile retrieved");
            res.json(user);
        } catch (error: any) {
            logger.error('Profile retrieval failed', error);
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   PUT /api/auth/profile
     * @desc    Updates the profile of the authenticated user.
     * @access  Protected
     */
    app.put('/profile', authMiddleware, async (req: Request<{}, {}, UpdateProfileRequest>, res: Response) => {
        try {
            const userId = contextService.getCurrentUserId();
            const updated = await authService.updateProfile(userId, req.body);

            // Update cached user in context
            contextService.setCurrentUser(updated);

            logger.info('Profile updated', {fields: Object.keys(req.body)});
            res.json(updated);
        } catch (error: any) {
            logger.error('Profile update failed', error);
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   POST /api/auth/logout
     * @desc    Stateless logout; client should discard the JWT.
     * @access  Protected
     */
    app.post('/logout', authMiddleware, async (req: Request, res: Response) => {
        try {
            logger.info('User logged out');
        } catch (error) {
            logger.info('Anonymous logout request');
        }

        res.status(200).json({success: true, message: 'Logged out'});
    });

    /**
     * @route   GET /api/auth/verify-email
     * @desc    Verifies user's email using a token.
     */
    app.get('/verify-email', async (req: Request, res: Response) => {
        logger.info("/verify-email - Email verification attempt");
        try {
            const {token} = req.query;
            if (!token || typeof token !== 'string') {
                return res.status(400).json({error: 'Verification token is required'});
            }

            const result = await authService.verifyEmail(token);
            logger.info('Email verified successfully', {userId: result.id});
            res.status(200).json({success: true, message: 'Email verified successfully', token: result.token, user: result.user});
        } catch (error: any) {
            logger.error('Email verification failed', error);
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   GET /api/auth/health
     * @desc    Health check endpoint to verify the service is running.
     */
    app.get('/health', (req: Request, res: Response) => {
        const context = contextService.getContext();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'auth-service',
            requestId: context?.requestId
        });
    });

    /**
     * @route   GET /api/auth/me
     * @desc    Get current user context information.
     * @access  Protected
     */
    app.get('/me', authMiddleware, async (req: Request, res: Response) => {
        try {
            logger.info("/me - Current user context retrieval");
            const context = contextService.getContext();
            if (!context) {
                logger.info("/me - No user context available");
                return res.status(401).json({error: 'No user context available'});
            }
            logger.info("/me - User context retrieved ", {userId: context.userId});
            return res.json({
                userId: context.userId,
                email: context.userEmail,
                role: context.userRole,
                requestId: context.requestId,
                timestamp: context.timestamp
            });
        } catch (error: any) {
            logger.error("Context retrieval failed ", error);
            return res.status(400).json({error: error.message});
        }
    });
}