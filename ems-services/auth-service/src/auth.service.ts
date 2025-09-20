import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {prisma} from './database';
import {RegisterRequest, LoginRequest, AuthResponse, User, Role} from './types/types';
import {Profile} from 'passport-google-oauth20';
import { ALLOWED_REGISTRATION_ROLES, DEFAULT_ROLE } from './constants/roles';

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

    /**
     * Validates if the provided role is allowed for registration.
     * Only USER and SPEAKER roles are allowed for registration.
     * ADMIN roles must be created manually.
     * @param role The role to validate
     * @returns true if the role is valid for registration
     */
    private isValidRegistrationRole(role: Role | undefined): boolean {
        if (!role) return true; // If no role provided, it will default to USER
        return ALLOWED_REGISTRATION_ROLES.includes(role);
    }
    /**
     * Gets the default role for registration if none provided.
     * @param providedRole The role provided in the request
     * @returns The role to use (defaults to USER)
     */
    private getRegistrationRole(providedRole: Role | undefined): Role {
        return providedRole || DEFAULT_ROLE;
    }

    /**
     * Gets the list of allowed roles for registration.
     * This method makes the role validation more extensible.
     * @returns Array of roles allowed for registration
     */
    private getAllowedRegistrationRoles(): Role[] {
        return ALLOWED_REGISTRATION_ROLES;
    }

    /**
     * Private method to generate a JWT for a given user.
     * @param user The user object.
     * @returns A JWT string.
     */
    private _generateToken(user: User): string {
        return jwt.sign(
            {userId: user.id, email: user.email, role: user.role},
            this.JWT_SECRET,
            {expiresIn: '30d'}
        );
    }

    /**
     * Public method to generate a JWT for a given user.
     * This will be called by our OAuth callback.
     * @param user The user object.
     * @returns A JWT string.
     */
    public generateJwtForUser(user: User): string {
        return this._generateToken(user);
    }

    /**
     * Public method to register a user.
     * @param data The registeration request object.
     * @returns An object {token: string, user: User}.
     */
    async register(data: RegisterRequest): Promise<AuthResponse> {
        // Validate the provided role
        // ToDo: Priting the allowed roles needs to be refactored
        if (!this.isValidRegistrationRole(data.role)) {
            throw new Error(`Only ${ALLOWED_REGISTRATION_ROLES.join(' and ')} roles are allowed for registration. ADMIN roles must be created manually.`);
        }

        const existingUser = await prisma.user.findUnique({
            where: {email: data.email},
        });

        if (existingUser) {
            throw new Error('User with this email already exists.');
        }

        const hashedPassword = await bcrypt.hash(data.password, 12);
        
        // Get the role to use. Defaults to USER if not provided
        const userRole = this.getRegistrationRole(data.role);

        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                role: userRole, // Use the validated role
            },
            select: userSelect,
        });

        const token = this._generateToken(user);

        return {token, user: user as User};
    }

    /**
     * Public method to log a user in.
     * @param data The login request object.
     * @returns An object {token: string, user: User}.
     */
    async login(data: LoginRequest): Promise<AuthResponse> {
        const userWithPassword = await prisma.user.findUnique({
            where: {email: data.email},
        });

        if (!userWithPassword || !userWithPassword.password) {
            throw new Error('Invalid email or password.');
        }

        const isPasswordValid = await bcrypt.compare(data.password, userWithPassword.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password.');
        }

        // Fetch only safe fields
        const user = await prisma.user.findUnique({
            where: {email: data.email},
            select: userSelect,
        });

        if (!user) {
            throw new Error('User not found after login.');
        }

        const token = this._generateToken(user as User);

        return {token, user: user as User};
    }


    async findOrCreateGoogleUser(profile: Profile): Promise<User> {
        const email = profile.emails?.[0].value;
        if (!email) {
            throw new Error('Google profile is missing an email address.');
        }

        const account = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: 'google',
                    providerAccountId: profile.id,
                },
            },
            select: {user: {select: userSelect}},
        });

        if (account) {
            return account.user;
        }

        const existingUser = await prisma.user.findUnique({
            where: {email},
            select: userSelect,
        });

        if (existingUser) {
            await prisma.account.create({
                data: {
                    userId: existingUser.id,
                    type: 'oauth',
                    provider: 'google',
                    providerAccountId: profile.id,
                },
            });
            return existingUser;
        }

        const newUser = await prisma.user.create({
            data: {
                email: email,
                name: profile.displayName,
                image: profile.photos?.[0].value,
                emailVerified: new Date(),
                accounts: {
                    create: {
                        type: 'oauth',
                        provider: 'google',
                        providerAccountId: profile.id,
                    },
                },
            },
            select: userSelect,
        });

        return newUser;
    }

    async checkUserExists(email: string): Promise<{ exists: boolean }> {
        const userCount = await prisma.user.count({
            where: {email},
        });
        return {exists: userCount > 0};
    }

    async verifyToken(token: string): Promise<{ valid: boolean; user?: User }> {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };
            const user = await prisma.user.findUnique({
                where: {id: decoded.userId},
                select: userSelect,
            });
            if (!user) return {valid: false};
            return {valid: true, user};
        } catch (error) {
            return {valid: false};
        }
    }

    async getProfile(userId: string): Promise<User> {
        const user = await prisma.user.findUnique({
            where: {id: userId},
            select: userSelect,
        });
        if (!user) throw new Error('User not found');
        return user;
    }
}
