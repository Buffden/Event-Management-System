// src/middleware/context.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { contextService, RequestContext } from '../services/context.service';

/**
 * Context middleware that sets up AsyncLocalStorage context for each request
 * This should be applied BEFORE any route handlers that need user context
 */
export const contextMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = uuidv4();
    const timestamp = Date.now();

    // Create base context with request metadata
    const baseContext: Partial<RequestContext> = {
        requestId,
        timestamp
    };

    // Check if there's an Authorization header
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);

        try {
            // Verify token and extract user info
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            const context: RequestContext = {
                ...baseContext as RequestContext,
                userId: decoded.userId,
                userEmail: decoded.email,
                userRole: decoded.role
            };

            // Run the request in authenticated context
            contextService.run(context, () => {
                next();
            });
        } catch (error) {
            // Invalid token - continue without user context but with request context
            const context: RequestContext = {
                requestId,
                timestamp,
                userId: '',
                userEmail: '',
                userRole: ''
            };

            contextService.run(context, () => {
                next();
            });
        }
    } else {
        // No auth header - continue with minimal context
        const context: RequestContext = {
            requestId,
            timestamp,
            userId: '',
            userEmail: '',
            userRole: ''
        };

        contextService.run(context, () => {
            next();
        });
    }
};

/**
 * Authentication middleware that ensures user is authenticated
 * This should be used on protected routes AFTER contextMiddleware
 * NOTE: This is a simple check - use the proper authMiddleware from auth.middleware.ts for JWT validation
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = contextService.getCurrentUserId();
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication required' });
    }
};