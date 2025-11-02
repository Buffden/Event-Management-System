// src/routes/routes.ts - UPDATED VERSION
import {Express} from 'express';
import {AuthService} from '../services/auth.service';
import {contextMiddleware} from '../middleware/context.middleware';
import {authMiddleware} from '../middleware/auth.middleware';
import {adminMiddleware} from '../middleware/admin.middleware';
import {Request, Response} from 'express';
import {UpdateProfileRequest, ResetPasswordRequest, VerifyResetTokenRequest} from "../types/types";
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
     * @route   POST /api/auth/forgot-password
     * @desc    Sends a password reset email to the user.
     */
    app.post('/forgot-password', async (req: Request, res: Response) => {
        try {
            logger.info("/forgot-password - Password reset request", {email: req.body.email});
            await authService.forgotPassword(req.body);
            logger.info("/forgot-password - Password reset email sent successfully", {email: req.body.email});
            res.json({
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        } catch (error: any) {
            logger.error("/forgot-password - Password reset failed", error, {email: req.body.email});
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   POST /api/auth/verify-reset-token
     * @desc    Verifies a password reset token.
     */
    app.post('/verify-reset-token', async (req: Request, res: Response) => {
        try {
            logger.info("/verify-reset-token - Token verification request", {token: req.body.token});
            const result = await authService.verifyResetToken(req.body);
            logger.info("/verify-reset-token - Token verification completed", {valid: result.valid});
            res.json(result);
        } catch (error: any) {
            logger.error("/verify-reset-token - Token verification failed", error, {token: req.body.token});
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   POST /api/auth/reset-password
     * @desc    Resets the user's password using a valid reset token.
     */
    app.post('/reset-password', async (req: Request, res: Response) => {
        try {
            logger.info("/reset-password - Password reset request", {token: req.body.token});
            const result = await authService.resetPassword(req.body);
            logger.info("/reset-password - Password reset completed successfully");
            res.json(result);
        } catch (error: any) {
            logger.error("/reset-password - Password reset failed", error, {token: req.body.token});
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
     * @route   POST /api/auth/validate-user
     * @desc    Validates JWT token and returns user information for microservice authentication.
     */
    app.post('/validate-user', async (req: Request, res: Response) => {
        try {
            logger.info("/validate-user - User validation attempt");
            const { token } = req.body;
            if (!token) {
                return res.status(400).json({error: 'Token is required'});
            }

            const result = await authService.verifyToken(token as string);
            if (!result.valid || !result.user) {
                return res.status(401).json({error: 'Invalid or expired token'});
            }

            // Check if user is active
            if (!result.user.isActive) {
                return res.status(403).json({error: 'User account is not active'});
            }

            logger.info("/validate-user - User validation successful", {
                userId: result.user.id,
                role: result.user.role,
                email: result.user.email
            });

            res.json({
                valid: true,
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.name,
                    role: result.user.role,
                    isActive: result.user.isActive,
                    emailVerified: result.user.emailVerified
                }
            });
        } catch (error: any) {
            logger.error("User validation failed", error);
            res.status(401).json({error: 'Token validation failed'});
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

    /**
     * @route   GET /api/auth/internal/users/:id
     * @desc    Get user information by ID (for internal microservice communication).
     * @access  Internal service only (no auth required)
     */
    app.get('/internal/users/:id', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // Check for internal service header
            const serviceHeader = req.headers['x-internal-service'];
            if (serviceHeader !== 'event-service' && serviceHeader !== 'notification-service' && serviceHeader !== 'booking-service') {
                return res.status(403).json({error: 'Access denied: Internal service only'});
            }

            logger.info("Getting user by ID (internal)", { userId: id });
            const user = await authService.getProfile(id);

            res.json({
                valid: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    isActive: user.isActive,
                    emailVerified: user.emailVerified
                }
            });
        } catch (error: any) {
            logger.error('Get user by ID (internal) failed', error);
            if (error.message === 'User not found') {
                return res.status(404).json({error: 'User not found'});
            }
            return res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   GET /api/auth/admin/users/stats
     * @desc    Get total users count (Admin only)
     * @access  Protected (Admin)
     */
    app.get('/admin/users/stats', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
        try {
            logger.info('/admin/users/stats - Admin fetching total users count', {
                adminId: contextService.getCurrentUserId()
            });

            const totalUsers = await authService.getTotalUsers();

            res.json({
                success: true,
                data: {
                    totalUsers
                }
            });
        } catch (error: any) {
            logger.error('/admin/users/stats - Failed to get total users', error);
            res.status(500).json({error: 'Failed to fetch total users'});
        }
    });

    /**
     * @route   POST /api/auth/admin/activate-users
     * @desc    Activate multiple users by setting emailVerified and isActive (Admin only)
     * @access  Protected (Admin)
     */
    app.post('/admin/activate-users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
        try {
            const { emails } = req.body;

            if (!emails || !Array.isArray(emails) || emails.length === 0) {
                return res.status(400).json({error: 'Emails array is required'});
            }

            logger.info('/admin/activate-users - Admin activation request', {
                adminId: contextService.getCurrentUserId(),
                userCount: emails.length
            });

            const result = await authService.activateUsers(emails);

            logger.info('/admin/activate-users - Users activated', {
                activated: result.activated,
                notFound: result.notFound
            });

            res.json({
                success: true,
                message: `Activated ${result.activated} user(s)`,
                activated: result.activated,
                notFound: result.notFound,
                total: emails.length
            });
        } catch (error: any) {
            logger.error('/admin/activate-users - Activation failed', error);
            res.status(400).json({error: error.message});
        }
    });

    /**
     * @route   GET /api/auth/admin/users
     * @desc    Get all users with pagination and filtering (Admin only)
     * @access  Protected (Admin)
     */
    app.get('/admin/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
        try {
            const {
                page = 1,
                limit = 10,
                role,
                isActive,
                search
            } = req.query;

            const pageNum = Number(page);
            const limitNum = Number(limit);

            if (isNaN(pageNum) || pageNum < 1) {
                return res.status(400).json({error: 'Page must be a positive integer'});
            }

            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                return res.status(400).json({error: 'Limit must be between 1 and 100'});
            }

            const filters: { role?: any; isActive?: boolean; search?: string } = {};

            if (role && (role === 'ADMIN' || role === 'USER' || role === 'SPEAKER')) {
                filters.role = role;
            }

            if (isActive !== undefined) {
                filters.isActive = isActive === 'true';
            }

            if (search && typeof search === 'string') {
                filters.search = search;
            }

            logger.info('/admin/users - Admin fetching users', {
                adminId: contextService.getCurrentUserId(),
                filters,
                page: pageNum,
                limit: limitNum
            });

            const result = await authService.getAllUsers(filters, pageNum, limitNum);

            res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            logger.error('/admin/users - Failed to fetch users', error);
            res.status(500).json({error: 'Failed to fetch users'});
        }
    });

    /**
     * @route   POST /api/auth/admin/users/:id/suspend
     * @desc    Suspend a user by setting isActive to false (Admin only)
     * @access  Protected (Admin)
     */
    app.post('/admin/users/:id/suspend', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            logger.info('/admin/users/:id/suspend - Admin suspending user', {
                adminId: contextService.getCurrentUserId(),
                userId: id
            });

            const user = await authService.suspendUser(id);

            res.json({
                success: true,
                message: 'User suspended successfully',
                data: user
            });
        } catch (error: any) {
            logger.error('/admin/users/:id/suspend - Failed to suspend user', error);
            if (error.message === 'User not found') {
                res.status(404).json({error: error.message});
            } else {
                res.status(400).json({error: error.message});
            }
        }
    });

    /**
     * @route   POST /api/auth/admin/users/:id/activate
     * @desc    Activate a user by setting isActive to true (Admin only)
     * @access  Protected (Admin)
     */
    app.post('/admin/users/:id/activate', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            logger.info('/admin/users/:id/activate - Admin activating user', {
                adminId: contextService.getCurrentUserId(),
                userId: id
            });

            const user = await authService.activateUser(id);

            res.json({
                success: true,
                message: 'User activated successfully',
                data: user
            });
        } catch (error: any) {
            logger.error('/admin/users/:id/activate - Failed to activate user', error);
            if (error.message === 'User not found') {
                res.status(404).json({error: error.message});
            } else {
                res.status(400).json({error: error.message});
            }
        }
    });

    /**
     * @route   PATCH /api/auth/admin/users/:id/role
     * @desc    Change a user's role (Admin only). Only USER ↔ SPEAKER allowed.
     * @access  Protected (Admin)
     */
    app.patch('/admin/users/:id/role', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!role || (role !== 'USER' && role !== 'SPEAKER')) {
                return res.status(400).json({error: 'Role must be either USER or SPEAKER'});
            }

            logger.info('/admin/users/:id/role - Admin changing user role', {
                adminId: contextService.getCurrentUserId(),
                userId: id,
                newRole: role
            });

            const user = await authService.changeUserRole(id, role);

            res.json({
                success: true,
                message: `User role changed to ${role} successfully`,
                data: user
            });
        } catch (error: any) {
            logger.error('/admin/users/:id/role - Failed to change user role', error);
            if (error.message === 'User not found') {
                res.status(404).json({error: error.message});
            } else {
                res.status(400).json({error: error.message});
            }
        }
    });

    /**
     * @route   GET /api/auth/admin/users/growth
     * @desc    Get user growth statistics over time (Admin only)
     */
    app.get('/admin/users/growth', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
        try {
            logger.info('/admin/users/growth - Admin fetching user growth statistics', {
                adminId: contextService.getCurrentUserId()
            });
            const growth = await authService.getUserGrowth();
            res.json({
                success: true,
                data: growth
            });
        } catch (error: any) {
            logger.error('/admin/users/growth - Failed to get user growth statistics', error);
            res.status(500).json({error: 'Failed to fetch user growth statistics'});
        }
    });
}