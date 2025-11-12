// src/routes/routes.ts - UPDATED VERSION
import {Express} from 'express';
import {AuthService} from '../services/auth.service';
import {contextMiddleware} from '../middleware/context.middleware';
import {authMiddleware} from '../middleware/auth.middleware';
import {Request, Response} from 'express';
import {UpdateProfileRequest, ResetPasswordRequest, VerifyResetTokenRequest} from "../types/types";
import {contextService} from '../services/context.service';
import {logger} from '../utils/logger';
import {registerSeederRoutes} from './seeder.routes';

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
            if (serviceHeader !== 'event-service' && serviceHeader !== 'notification-service' && serviceHeader !== 'booking-service' && serviceHeader !== 'feedback-service') {
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
     * @route   GET /api/auth/admin/stats
     * @desc    Get user statistics for admin dashboard.
     * @access  Protected - Admin only
     */
    app.get('/admin/stats', authMiddleware, async (req: Request, res: Response) => {
        try {
            const userId = contextService.getCurrentUserId();
            let user = contextService.getCurrentUser();

            // If user not in context, fetch it
            if (!user) {
                user = await authService.getProfile(userId);
            }

            // Check if user is admin
            if (!user || user.role !== 'ADMIN') {
                return res.status(403).json({error: 'Access denied: Admin only'});
            }

            logger.info("/admin/stats - Fetching user statistics", { adminId: userId });

            const { prisma } = await import('../database');

            const totalUsers = await prisma.user.count();

            res.json({
                success: true,
                data: {
                    totalUsers
                }
            });
        } catch (error: any) {
            logger.error("/admin/stats - Failed to fetch user statistics", error);
            res.status(500).json({error: 'Failed to fetch user statistics'});
        }
    });

    /**
     * @route   GET /api/auth/admin/users
     * @desc    Get all users list for admin dashboard with search, filters, and pagination.
     * @access  Protected - Admin only
     * @query   search: string (optional) - Search by name or email
     * @query   role: string (optional) - Filter by role (ADMIN, USER, SPEAKER)
     * @query   status: string (optional) - Filter by status (ACTIVE, INACTIVE)
     * @query   page: number (optional) - Page number (default: 1)
     * @query   limit: number (optional) - Items per page (default: 10, max: 100)
     */
    app.get('/admin/users', authMiddleware, async (req: Request, res: Response) => {
        try {
            const userId = contextService.getCurrentUserId();
            let user = contextService.getCurrentUser();

            // If user not in context, fetch it
            if (!user) {
                user = await authService.getProfile(userId);
            }

            // Check if user is admin
            if (!user || user.role !== 'ADMIN') {
                return res.status(403).json({error: 'Access denied: Admin only'});
            }

            // Extract query parameters
            const search = req.query.search as string | undefined;
            const role = req.query.role as string | undefined;
            const status = req.query.status as string | undefined;
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
            const skip = (page - 1) * limit;

            logger.info("/admin/users - Fetching users", {
                adminId: userId,
                search,
                role,
                status,
                page,
                limit
            });

            const { prisma } = await import('../database');

            // Build where clause
            const where: any = {};

            // Search filter (name or email)
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ];
            }

            // Role filter
            if (role && role !== 'ALL') {
                where.role = role;
            }

            // Status filter
            if (status && status !== 'ALL') {
                where.isActive = status === 'ACTIVE';
            }

            // Get total count for pagination
            const total = await prisma.user.count({ where });

            // Get paginated users
            const users = await prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                    emailVerified: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            });

            const totalPages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: users.map(u => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    isActive: u.isActive,
                    emailVerified: u.emailVerified ? u.emailVerified.toISOString() : null,
                    createdAt: u.createdAt.toISOString(),
                    updatedAt: u.updatedAt.toISOString()
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            });
        } catch (error: any) {
            logger.error("/admin/users - Failed to fetch users", error);
            res.status(500).json({error: 'Failed to fetch users'});
        }
    });

    /**
     * @route   GET /api/auth/admins
     * @desc    Get list of admin users (accessible by authenticated users for messaging purposes)
     * @access  Protected - Any authenticated user (SPEAKER, ADMIN, USER)
     * @query   limit: number (optional) - Items per page (default: 100, max: 100)
     */
    app.get('/admins', authMiddleware, async (req: Request, res: Response) => {
        try {
            const userId = contextService.getCurrentUserId();
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 100));

            logger.info("/admins - Fetching admin users", {
                requestedBy: userId,
                limit
            });

            const { prisma } = await import('../database');

            // Get active admin users only
            const admins = await prisma.user.findMany({
                where: {
                    role: 'ADMIN',
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                },
                orderBy: {
                    name: 'asc'
                },
                take: limit
            });

            res.json({
                success: true,
                data: admins.map(admin => ({
                    id: admin.id,
                    name: admin.name || admin.email,
                    email: admin.email,
                    role: admin.role
                }))
            });
        } catch (error: any) {
            logger.error("/admins - Failed to fetch admin users", error);
            res.status(500).json({error: 'Failed to fetch admin users'});
        }
    });

    /**
     * @route   POST /api/auth/admin/activate-users
     * @desc    Activate multiple users by setting isActive=true and emailVerified=now()
     * @access  Protected - Admin only
     * @body    { emails: string[] } - Array of user email addresses to activate
     */
    app.post('/admin/activate-users', authMiddleware, async (req: Request, res: Response) => {
        try {
            const userId = contextService.getCurrentUserId();
            let user = contextService.getCurrentUser();

            // If user not in context, fetch it
            if (!user) {
                user = await authService.getProfile(userId);
            }

            // Check if user is admin
            if (!user || user.role !== 'ADMIN') {
                return res.status(403).json({error: 'Access denied: Admin only'});
            }

            const { emails } = req.body;

            // Validate request body
            if (!emails || !Array.isArray(emails) || emails.length === 0) {
                return res.status(400).json({error: 'emails array is required and must not be empty'});
            }

            logger.info("/admin/activate-users - Activating users", {
                adminId: userId,
                emailCount: emails.length
            });

            const { prisma } = await import('../database');

            let activated = 0;
            let notFound = 0;
            const currentDate = new Date();

            // Process each email
            for (const email of emails) {
                if (!email || typeof email !== 'string') {
                    continue; // Skip invalid emails
                }

                try {
                    const updateResult = await prisma.user.updateMany({
                        where: {
                            email: email.trim().toLowerCase()
                        },
                        data: {
                            isActive: true,
                            emailVerified: currentDate
                        }
                    });

                    if (updateResult.count > 0) {
                        activated++;
                        logger.debug("/admin/activate-users - User activated", { email });
                    } else {
                        notFound++;
                        logger.debug("/admin/activate-users - User not found", { email });
                    }
                } catch (error: any) {
                    logger.error("/admin/activate-users - Error activating user", error, { email });
                    notFound++; // Count as not found on error
                }
            }

            logger.info("/admin/activate-users - Activation complete", {
                adminId: userId,
                activated,
                notFound,
                total: emails.length
            });

            res.json({
                success: true,
                activated,
                notFound,
                total: emails.length,
                message: `Activated ${activated} user(s), ${notFound} user(s) not found`
            });
        } catch (error: any) {
            logger.error("/admin/activate-users - Failed to activate users", error);
            res.status(500).json({error: 'Failed to activate users'});
        }
    });

    // Register seeder routes (for seeding script)
    registerSeederRoutes(app, authService);

    /**
     * @route   GET /api/auth/admin/reports/user-growth
     * @desc    Get user growth trend (monthly user registrations).
     * @access  Protected - Admin only
     */
    app.get('/admin/reports/user-growth', authMiddleware, async (req: Request, res: Response) => {
        try {
            const userId = contextService.getCurrentUserId();
            let user = contextService.getCurrentUser();

            if (!user) {
                user = await authService.getProfile(userId);
            }

            if (!user || user.role !== 'ADMIN') {
                return res.status(403).json({error: 'Access denied: Admin only'});
            }

            logger.info("/admin/reports/user-growth - Fetching user growth data", { adminId: userId });

            const { prisma } = await import('../database');

            // Get all users ordered by creation date
            const users = await prisma.user.findMany({
                select: {
                    createdAt: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            // Group users by month
            const monthlyGrowth: Record<string, number> = {};
            users.forEach(user => {
                const date = new Date(user.createdAt);
                const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
                monthlyGrowth[monthKey] = (monthlyGrowth[monthKey] || 0) + 1;
            });

            // Convert to array format and calculate cumulative totals
            const growthData = Object.entries(monthlyGrowth)
                .map(([month, count]) => {
                    // Calculate cumulative users up to this month
                    const monthIndex = Object.keys(monthlyGrowth).indexOf(month);
                    const previousMonths = Object.values(monthlyGrowth).slice(0, monthIndex);
                    const cumulativeUsers = previousMonths.reduce((sum, val) => sum + val, 0) + count;

                    return {
                        month,
                        users: cumulativeUsers,
                        newUsers: count
                    };
                })
                .sort((a, b) => {
                    // Sort by date (simple string comparison should work for format "MMM YYYY")
                    return a.month.localeCompare(b.month);
                });

            res.json({
                success: true,
                data: growthData
            });
        } catch (error: any) {
            logger.error("/admin/reports/user-growth - Failed to fetch user growth data", error);
            res.status(500).json({error: 'Failed to fetch user growth data'});
        }
    });
}