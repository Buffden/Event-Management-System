import { Express, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { contextService } from '../services/context.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

/**
 * Seeder Routes for Auth Service
 * These routes are used by the seeding script to manipulate dates and activate users
 * All routes require admin authentication
 */
export function registerSeederRoutes(app: Express, authService: AuthService) {
    /**
     * @route   POST /api/auth/admin/seed/activate-user
     * @desc    Activate a single user by email (seeding-specific endpoint)
     * @access  Protected - Admin only
     * @body    { email: string } - User email address to activate
     */
    app.post('/admin/seed/activate-user', authMiddleware, async (req: Request, res: Response) => {
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

            const { email } = req.body;

            // Validate request body
            if (!email || typeof email !== 'string') {
                return res.status(400).json({error: 'email is required and must be a string'});
            }

            logger.info("/admin/seed/activate-user - Activating user", {
                adminId: userId,
                email
            });

            const { prisma } = await import('../database');

            const currentDate = new Date();

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
                    logger.debug("/admin/seed/activate-user - User activated", { email });
                    res.json({
                        success: true,
                        activated: true,
                        message: `User ${email} activated successfully`
                    });
                } else {
                    logger.debug("/admin/seed/activate-user - User not found", { email });
                    res.status(404).json({
                        success: false,
                        activated: false,
                        error: `User with email ${email} not found`
                    });
                }
            } catch (error: any) {
                logger.error("/admin/seed/activate-user - Error activating user", error, { email });
                res.status(500).json({error: 'Failed to activate user'});
            }
        } catch (error: any) {
            logger.error("/admin/seed/activate-user - Failed to activate user", error);
            res.status(500).json({error: 'Failed to activate user'});
        }
    });

    /**
     * @route   POST /api/auth/admin/seed/update-user-date
     * @desc    Update user createdAt date (seeding-specific endpoint)
     * @access  Protected - Admin only
     * @body    { email: string, createdAt: string } - User email and ISO date string
     */
    app.post('/admin/seed/update-user-date', authMiddleware, async (req: Request, res: Response) => {
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

            const { email, createdAt } = req.body;

            // Validate request body
            if (!email || typeof email !== 'string') {
                return res.status(400).json({error: 'email is required and must be a string'});
            }
            if (!createdAt || typeof createdAt !== 'string') {
                return res.status(400).json({error: 'createdAt is required and must be an ISO date string'});
            }

            const createdAtDate = new Date(createdAt);
            if (isNaN(createdAtDate.getTime())) {
                return res.status(400).json({error: 'createdAt must be a valid ISO date string'});
            }

            logger.info("/admin/seed/update-user-date - Updating user creation date", {
                adminId: userId,
                email,
                createdAt: createdAtDate.toISOString()
            });

            const { prisma } = await import('../database');

            try {
                const updateResult = await prisma.user.updateMany({
                    where: {
                        email: email.trim().toLowerCase()
                    },
                    data: {
                        createdAt: createdAtDate
                    }
                });

                if (updateResult.count > 0) {
                    logger.debug("/admin/seed/update-user-date - User date updated", { email });
                    res.json({
                        success: true,
                        message: `User ${email} creation date updated successfully`
                    });
                } else {
                    logger.debug("/admin/seed/update-user-date - User not found", { email });
                    res.status(404).json({
                        success: false,
                        error: `User with email ${email} not found`
                    });
                }
            } catch (error: any) {
                logger.error("/admin/seed/update-user-date - Error updating user date", error, { email });
                res.status(500).json({error: 'Failed to update user date'});
            }
        } catch (error: any) {
            logger.error("/admin/seed/update-user-date - Failed to update user date", error);
            res.status(500).json({error: 'Failed to update user date'});
        }
    });
}

