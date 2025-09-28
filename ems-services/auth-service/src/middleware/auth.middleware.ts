// src/middleware/auth.middleware.ts
import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {v4 as uuidv4} from 'uuid';
import {contextService} from '../services/context.service';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({error: 'No token provided'});
    }

    const token = authHeader.slice(7);

    jwt.verify(token, process.env.JWT_SECRET!, (err, decoded: any) => {
        if (err) {
            return res.status(401).json({error: 'Invalid token'});
        }

        const requestId = uuidv4();
        const context = {
            userId: decoded.userId,
            userEmail: decoded.email,
            userRole: decoded.role,
            requestId,
            timestamp: Date.now()
        };

        // Set context for this request's execution
        contextService.run(context, () => {
            next();
        });
    });
};