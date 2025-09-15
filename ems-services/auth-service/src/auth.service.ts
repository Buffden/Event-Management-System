import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {prisma} from './database';
import {RegisterRequest, LoginRequest, AuthResponse} from './types';

export class AuthService {
    private JWT_SECRET = process.env.JWT_SECRET!;

    async register(data: RegisterRequest): Promise<AuthResponse> {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: {email: data.email}
        });

        if (existingUser) {
            throw new Error('User already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name ?? ''
            },
            select: {
                id: true,
                email: true,
                name: true
            }
        });

        // Generate token
        const token = jwt.sign(
            {userId: user.id, email: user.email},
            this.JWT_SECRET,
            {expiresIn: '30d'}
        );

        return {
            token, user: {
                id: user.id,
                email: user.email,
                name: user.name ?? undefined
            }
        };
    }

    async login(data: LoginRequest): Promise<AuthResponse> {
        // Find user
        const user = await prisma.user.findUnique({
            where: {email: data.email}
        });

        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check password
        const validPassword = await bcrypt.compare(data.password, user.password);
        if (!validPassword) {
            throw new Error('Invalid credentials');
        }

        // Generate token
        const token = jwt.sign(
            {userId: user.id, email: user.email},
            this.JWT_SECRET,
            {expiresIn: '30d'}
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name ?? undefined
            }
        };
    }

    async checkUserExists(email: string): Promise<{ exists: boolean }> {
        const user = await prisma.user.findUnique({
            where: {email},
            select: {id: true}
        });

        return {exists: !!user};
    }

    async verifyToken(token: string): Promise<{ valid: boolean; user?: any }> {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET) as any;

            const user = await prisma.user.findUnique({
                where: {id: decoded.userId},
                select: {id: true, email: true, name: true}
            });

            if (!user) {
                return {valid: false};
            }

            return {valid: true, user};
        } catch (error) {
            return {valid: false};
        }
    }

    async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: {id: userId},
            select: {id: true, email: true, name: true, createdAt: true}
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }
}
