import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './database';
import { RegisterRequest, LoginRequest, AuthResponse, User, Role } from './types';

// A reusable Prisma select object to consistently fetch the fields for our User type.
// This avoids repetition and ensures all methods return the same user shape.
const userSelect = {
    id: true,
    email: true,
    name: true,
    image: true,
    role: true,
    isActive: true,
    emailVerified: true,
};

export class AuthService {
    private JWT_SECRET = process.env.JWT_SECRET!;

    async register(data: RegisterRequest): Promise<AuthResponse> {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new Error('User with this email already exists.');
        }

        const hashedPassword = await bcrypt.hash(data.password, 12);

        // The 'role' and 'isActive' fields will be set to their default values by the database.
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
            },
            select: userSelect, // Use the consistent select object
        });

        // Include user's role in the JWT payload for role-based access control.
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            this.JWT_SECRET,
            { expiresIn: '30d' }
        );

        return { token, user };
    }

    async login(data: LoginRequest): Promise<AuthResponse> {
        const user = await prisma.user.findUnique({
            where: { email: data.email },
        });

        // Critical check: Ensure the user exists AND has a password set.
        // This prevents users who signed up via OAuth from logging in with a password.
        if (!user || !user.password) {
            throw new Error('Invalid email or password.');
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password.');
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            this.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Construct the user object to return, ensuring it matches the User interface.
        const userResponse: User = {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
        };

        return { token, user: userResponse };
    }

    async checkUserExists(email: string): Promise<{ exists: boolean }> {
        const userCount = await prisma.user.count({
            where: { email },
        });
        return { exists: userCount > 0 };
    }

    async verifyToken(token: string): Promise<{ valid: boolean; user?: User }> {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: userSelect,
            });

            if (!user) {
                return { valid: false };
            }

            return { valid: true, user };
        } catch (error) {
            return { valid: false };
        }
    }

    async getProfile(userId: string): Promise<User> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: userSelect,
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }
}