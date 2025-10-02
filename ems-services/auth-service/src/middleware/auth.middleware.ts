// src/middleware/auth.middleware.ts
import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {v4 as uuidv4} from 'uuid';
import {contextService} from '../services/context.service';
import {prisma} from '../database';
import {logger} from '../utils/logger';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({error: 'No token provided'});
        }

        const token = authHeader.slice(7);

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        // Validate user exists and is active in database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                emailVerified: true
            }
        });

        if (!user) {
            logger.warn('Authentication failed: User not found', { userId: decoded.userId });
            return res.status(401).json({error: 'User not found'});
        }

        if (!user.isActive) {
            logger.warn('Authentication failed: User account not active', { userId: decoded.userId });
            return res.status(403).json({error: 'Account is not active'});
        }

        const requestId = uuidv4();
        const context = {
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            requestId,
            timestamp: Date.now()
        };

        logger.debug('User authenticated successfully', {
            userId: user.id,
            role: user.role,
            email: user.email
        });

        // Set context for this request's execution
        contextService.run(context, () => {
            next();
        });
    } catch (error) {
        logger.error('Authentication failed', error as Error);

        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({error: 'Invalid token'});
        }

        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({error: 'Token expired'});
        }

        return res.status(500).json({error: 'Authentication error'});
    }
};