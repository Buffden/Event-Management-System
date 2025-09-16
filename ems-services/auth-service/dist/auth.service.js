"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("./database");
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
class AuthService {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET;
    }
    async register(data) {
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new Error('User with this email already exists.');
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
        // The 'role' and 'isActive' fields will be set to their default values by the database.
        const user = await database_1.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
            },
            select: userSelect, // Use the consistent select object
        });
        // Include user's role in the JWT payload for role-based access control.
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, this.JWT_SECRET, { expiresIn: '30d' });
        return { token, user };
    }
    async login(data) {
        const user = await database_1.prisma.user.findUnique({
            where: { email: data.email },
        });
        // Critical check: Ensure the user exists AND has a password set.
        // This prevents users who signed up via OAuth from logging in with a password.
        if (!user || !user.password) {
            throw new Error('Invalid email or password.');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(data.password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password.');
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, this.JWT_SECRET, { expiresIn: '30d' });
        // Construct the user object to return, ensuring it matches the User interface.
        const userResponse = {
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
    async checkUserExists(email) {
        const userCount = await database_1.prisma.user.count({
            where: { email },
        });
        return { exists: userCount > 0 };
    }
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
            const user = await database_1.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: userSelect,
            });
            if (!user) {
                return { valid: false };
            }
            return { valid: true, user };
        }
        catch (error) {
            return { valid: false };
        }
    }
    async getProfile(userId) {
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
            select: userSelect,
        });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
}
exports.AuthService = AuthService;
