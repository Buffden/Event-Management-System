import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {prisma} from '../database';
import {AuthResponse, LoginRequest, MESSAGE_TYPE, RegisterRequest, Role, User} from '../types/types';
import {Profile} from 'passport-google-oauth20';
import {ALLOWED_REGISTRATION_ROLES, DEFAULT_ROLE} from '../constants/roles';

import {EmailNotification, rabbitMQService} from './rabbitmq.service';

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
    private EMAIL_VERIFICATION_SECRET = process.env.EMAIL_VERIFICATION_SECRET!;

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
     * Private method to generate a short-lived email verification JWT.
     * @param userId The ID of the user to verify.
     * @returns A JWT string.
     */
    private _generateEmailVerificationToken(userId: string): string {
        return jwt.sign(
            {userId, type: 'email-verification'},
            this.EMAIL_VERIFICATION_SECRET,
            {expiresIn: '1h'}
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
     * Sends a verification email to the user.
     * If sending the email fails, the user creation is rolled back.
     * @param user The user object.
     */
    async sendVerificationEmail(user: User): Promise<void> {
        try {
            const verificationToken = this._generateEmailVerificationToken(user.id);
            const verificationLink = `${process.env.CLIENT_APP_URL}/verify-email?token=${verificationToken}`;

            const msg: EmailNotification = {
                type: MESSAGE_TYPE.EMAIL,
                message: {
                    to: user.email,
                    subject: `${process.env.APP_NAME || 'EVENTO'} Verify Your Email Address`,
                    body: `
                    <h1>Welcome, ${user.name}!</h1>
                    <p>Thank you for registering. Please click the link below to verify your email address:</p>
                    <a href="${verificationLink}">Verify My Email</a>
                    <p>This link will expire in 1 hour.</p>
                `
                }
            };

            const queueName = 'notification.email';
            await rabbitMQService.sendMessage(queueName, msg);

        } catch (error) {
            console.error('❌ Failed to publish verification email message. Rolling back user creation for user:', user.id, error);
            // Rollback user creation on email failure
            await prisma.user.delete({where: {id: user.id}});
            throw new Error('Could not send verification email. Your registration has been cancelled.');
        }
    }

    /**
     * Public method to register a user.
     * @param data The registration request object.
     * @returns An object {token: string, user: User}.
     */
    async register(data: RegisterRequest): Promise<AuthResponse> {
        // TODO: Printing the allowed roles needs to be refactored
        if (!this.isValidRegistrationRole(data.role)) {
            throw new Error(`Only ${ALLOWED_REGISTRATION_ROLES.join(' and ')} roles are allowed for registration. ADMIN roles must be created manually.`);
        }

        const existingUser = await prisma.user.findUnique({
            where: {email: data.email},
        });

        if (existingUser && existingUser.isActive && existingUser.emailVerified) {
            throw new Error('User with this email already exists.');
        } else if (existingUser && existingUser.emailVerified) {
            throw new Error('Your account has been suspended. Please contact support.');
        } else if (existingUser) {
            await this.sendVerificationEmail(existingUser);
        }

        const hashedPassword = await bcrypt.hash(data.password, 12);
        const userRole = this.getRegistrationRole(data.role);

        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                role: userRole,
                isActive: false,
                emailVerified: null,
            },
            select: userSelect,
        });

        await this.sendVerificationEmail(user);

        const token = this._generateToken(user);
        return {token, user: user as User};
    }

    /**
     * Public method to verify a user's email using a token.
     * @param token
     * @returns An object {token: string, user: User} after successful verification and login.
     */
    async verifyEmail(token: string): Promise<AuthResponse> {
        try {
            const decoded = jwt.verify(token, this.EMAIL_VERIFICATION_SECRET) as { userId: string, type: string };

            if (decoded.type !== 'email-verification') {
                throw new Error('Invalid token type.');
            }

            const user = await prisma.user.findUnique({where: {id: decoded.userId}});

            if (!user) {
                throw new Error('User not found.');
            }
            if (user.isActive && user.emailVerified) {
                throw new Error('Email is already verified.');
            }

            const updatedUser = await prisma.user.update({
                where: {id: user.id},
                data: {
                    isActive: true,
                    emailVerified: new Date(),
                },
                select: userSelect,
            });

            // After successful verification, log the user in.
            const loginToken = this._generateToken(updatedUser as User);
            return {token: loginToken, user: updatedUser as User};

        } catch (error: any) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Verification link has expired.');
            }
            throw new Error('Invalid verification link.');
        }
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

        // Check if the user's account is active
        if (!userWithPassword.isActive) {
            throw new Error('Your account is not active. Please verify your email first.');
        }

        const isPasswordValid = await bcrypt.compare(data.password, userWithPassword.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password.');
        }

        const user = userWithPassword;
        const token = this._generateToken(user);

        // Omit password before returning
        const {password, ...userWithoutPassword} = user;
        return {token, user: userWithoutPassword};
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

        return await prisma.user.create({
            data: {
                email: email,
                name: profile.displayName,
                image: profile.photos?.[0].value,
                role: DEFAULT_ROLE,
                isActive: true,
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
