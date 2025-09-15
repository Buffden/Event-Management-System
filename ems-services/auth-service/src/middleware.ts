import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './database';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name?: string;
    };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid token.' });
        }

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined
        };
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};