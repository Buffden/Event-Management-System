"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("./database");
class AuthService {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET;
    }
    async register(data) {
        // Check if user exists
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email: data.email }
        });
        if (existingUser) {
            throw new Error('User already exists');
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
        // Create user
        const user = await database_1.prisma.user.create({
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
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, this.JWT_SECRET, { expiresIn: '30d' });
        return {
            token, user: {
                id: user.id,
                email: user.email,
                name: user.name ?? undefined
            }
        };
    }
    async login(data) {
        // Find user
        const user = await database_1.prisma.user.findUnique({
            where: { email: data.email }
        });
        if (!user) {
            throw new Error('Invalid credentials');
        }
        // Check password
        const validPassword = await bcryptjs_1.default.compare(data.password, user.password);
        if (!validPassword) {
            throw new Error('Invalid credentials');
        }
        // Generate token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, this.JWT_SECRET, { expiresIn: '30d' });
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name ?? undefined
            }
        };
    }
    async checkUserExists(email) {
        const user = await database_1.prisma.user.findUnique({
            where: { email },
            select: { id: true }
        });
        return { exists: !!user };
    }
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
            const user = await database_1.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, name: true }
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
            select: { id: true, email: true, name: true, createdAt: true }
        });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
}
exports.AuthService = AuthService;
