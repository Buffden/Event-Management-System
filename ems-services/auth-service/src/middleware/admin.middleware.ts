// src/middleware/admin.middleware.ts
import {Request, Response, NextFunction} from 'express';
import {contextService} from '../services/context.service';
import {logger} from '../utils/logger';

/**
 * Middleware that ensures the authenticated user has ADMIN role
 * Must be used after authMiddleware to ensure user is authenticated
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const userRole = contextService.getCurrentUserRole();

        if (!userRole || userRole !== 'ADMIN') {
            logger.warn('Admin access denied', {
                role: userRole,
                userId: contextService.getCurrentUserId()
            });
            return res.status(403).json({error: 'Admin access required'});
        }

        logger.debug('Admin access granted', {
            role: userRole,
            userId: contextService.getCurrentUserId()
        });

        next();
    } catch (error) {
        logger.error('Admin middleware error', error as Error);
        return res.status(500).json({error: 'Authorization check failed'});
    }
};

