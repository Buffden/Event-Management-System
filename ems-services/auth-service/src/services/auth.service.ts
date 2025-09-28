// src/services/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {prisma} from '../database';
import {
    AuthResponse,
    LoginRequest,
    MESSAGE_TYPE,
    RegisterRequest,
    Role,
    UpdateProfileRequest,
    User,
} from '../types/types';
import {Profile} from 'passport-google-oauth20';
import {ALLOWED_REGISTRATION_ROLES, DEFAULT_ROLE} from '../constants/roles';

import {EmailNotification, rabbitMQService} from './rabbitmq.service';
import {logger} from '../utils/logger';

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
        logger.info("isValidRegistrationRole(): Validating registration role", {role});
        if (!role) return true; // If no role provided, it will default to USER
        logger.info("isValidRegistrationRole(): Invalid role", {role});
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
        logger.info("_generateEmailVerificationToken(): Generating email verification token", {userId});
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
        logger.info("generateJwtForUser(): Generating JWT for user", {userId: user.id});
        return this._generateToken(user);
    }

    /**
     * Sends a verification email to the user.
     * If sending the email fails, the user creation is rolled back.
     * @param user The user object.
     */
    async sendVerificationEmail(user: User): Promise<void> {
        try {
            logger.info("START - sendVerificationEmail(): ", {userId: user.id});
            const verificationToken = this._generateEmailVerificationToken(user.id);
            const verificationLink = `${process.env.CLIENT_APP_URL}/verify-email?token=${verificationToken}`;

            logger.info("sendVerificationEmail(): Publishing verification email message to RabbitMQ", {
                userId: user.id,
                to: user.email
            });

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
            logger.info("END - sendVerificationEmail(): ", {userId: user.id});
        } catch (error) {
            logger.error("sendVerificationEmail(): Failed to publish verification email message. Rolling back user creation", error as Error, {userId: user.id});
            // Rollback user creation on email failure (this will cascade delete the Account as well)
            if (user?.id) {
                await prisma.user.delete({where: {id: user.id}});
            }
            throw new Error('Could not send verification email. Your registration has been cancelled.');
        }
    }

    /**
     * Public method to register a user.
     * Creates both User and Account records for email/password registration.
     * @param data The registration request object.
     * @returns An object {token: string, user: User}.
     */
    async register(data: RegisterRequest): Promise<AuthResponse> {
        try {
            logger.info("START - register(): ", {
                email: data.email,
                role: data.role,
                allowedRoles: ALLOWED_REGISTRATION_ROLES.join(', ')
            });
            if (!this.isValidRegistrationRole(data.role)) {
                throw new Error(`Only ${ALLOWED_REGISTRATION_ROLES.join(' and ')} roles are allowed for registration. ADMIN roles must be created manually.`);
            }

            const existingUser = await prisma.user.findUnique({
                where: {email: data.email},
            });

            if (existingUser && existingUser.isActive && existingUser.emailVerified) {
                logger.info("register(): User with this email already exists and is active", {email: data.email});
                throw new Error('User with this email already exists.');
            } else if (existingUser && existingUser.emailVerified) {
                logger.info("register(): User with this email is suspended", {email: data.email});
                throw new Error('Your account has been suspended. Please contact support.');
            } else if (existingUser) {
                logger.info("register(): User with this email exists but is not verified. Resending verification email.", {email: data.email});
                await this.sendVerificationEmail(existingUser);
                throw new Error('Verification email has been resent. Please check your inbox.');
            }

            logger.info("register(): No existing user found. Proceeding with registration.", {email: data.email});
            const hashedPassword = await bcrypt.hash(data.password, 12);
            const userRole = this.getRegistrationRole(data.role);

            logger.info("register(): Before entering transaction to create a new user", {
                email: data.email,
                role: userRole
            });
            const user = await prisma.$transaction(async (tx) => {
                logger.info("register(): Entering transaction to create User and Account", {email: data.email});
                const newUser = await tx.user.create({
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
                logger.info("register(): Create the corresponding Account record for email/password auth");
                await tx.account.create({
                    data: {
                        userId: newUser.id,
                        type: 'credentials',  // 'credentials' for email/password auth
                        provider: 'email',
                        providerAccountId: data.email, // Using email as the unique identifier
                    },
                });
                logger.info("register(): Successfully created User and Account", {userId: newUser.id});
                return newUser;
            });
            logger.info("register(): Exited transaction", {userId: user.id});
            await this.sendVerificationEmail(user);
            logger.info("register(): Sent verification email to ", {email: user.email});
            const token = this._generateToken(user);
            logger.info("END - register(): ", {userId: user.id});
            return {token, user: user as User};
        } catch (error) {
            logger.error("register(): Registration failed", error as Error, {email: data.email});
            throw error;
        }
    }

    /**
     * Public method to verify a user's email using a token.
     * @param token
     * @returns An object {token: string, user: User} after successful verification and login.
     */
    async verifyEmail(token: string): Promise<AuthResponse> {
        try {
            logger.info("START - verifyEmail(): Verifying email with token");
            const decoded = jwt.verify(token, this.EMAIL_VERIFICATION_SECRET) as { userId: string, type: string };

            if (decoded.type !== 'email-verification') {
                logger.error(`verifyEmail(): Invalid token type ${{userId: decoded.userId, type: decoded.type}}`);
                throw new Error('Invalid token type.');
            }

            const user = await prisma.user.findUnique({where: {id: decoded.userId}});

            if (!user) {
                logger.error(`verifyEmail(): User not found for the provided token ${{userId: decoded.userId}}`);
                throw new Error('User not found.');
            }
            if (user.isActive && user.emailVerified) {
                logger.error(`verifyEmail(): Email is already verified for user ${{userId: user.id}}`);
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
                logger.error("verifyEmail(): Verification token has expired", error as Error);
                throw new Error('Verification link has expired.');
            }
            logger.error("verifyEmail(): Email verification failed", error as Error);
            throw new Error('Invalid verification link.');
        }
    }

    /**
     * Public method to log a user in.
     * Ensures the user has an Account record (for backward compatibility).
     * @param data The login request object.
     * @returns An object {token: string, user: User}.
     */
    async login(data: LoginRequest): Promise<AuthResponse> {
        try {
            logger.info("START - login: Verifying user with token");
            const userWithPassword = await prisma.user.findUnique({
                where: {email: data.email},
                include: {
                    accounts: {
                        where: {
                            provider: 'email',
                        },
                    },
                },
            });
            logger.info("login: Verifying user with token");
            if (!userWithPassword || !userWithPassword.password) {
                logger.error(`verifyEmail(): Invalid email or password - ${{userId: data.email}}`);
                throw new Error('Invalid email or password.');
            }
            logger.info("login(): Verifying user with token", userWithPassword);
            // Check if the user's account is active
            if (!userWithPassword.isActive) {
                logger.error(`verifyEmail(): Your account is not active. Please verify your email first - ${{userId: data.email}}`);
                throw new Error('Your account is not active. Please verify your email first.');
            }

            const isPasswordValid = await bcrypt.compare(data.password, userWithPassword.password);
            if (!isPasswordValid) {
                logger.error(`verifyEmail(): Invalid email or password - ${{userId: data.email}}`);
                throw new Error('Invalid email or password.');
            }

            // Create Account record if it doesn't exist (for backward compatibility with existing users)
            if (userWithPassword.accounts.length === 0) {
                await prisma.account.create({
                    data: {
                        userId: userWithPassword.id,
                        type: 'credentials',
                        provider: 'email',
                        providerAccountId: userWithPassword.email,
                    },
                });
            }
            logger.info("login(): Created Account record if it didn't exist (for backward compatibility with existing users)", userWithPassword);

            const user = userWithPassword;
            const token = this._generateToken(user);

            // Omit password and accounts before returning
            logger.info("END - login(): User logged in successfully", {userId: user.id});
            const {password, accounts, ...userWithoutSensitiveData} = user;
            return {token, user: userWithoutSensitiveData};
        } catch (error) {
            logger.error("login(): Login failed", error as Error);
            throw new Error("Login failed: " + (error as Error).message);
        }
    }


    /**
     * Finds or creates a user from Google OAuth profile.
     * Always creates an Account record linking the user to their Google account.
     * @param profile The Google OAuth profile.
     * @returns The User object.
     */
    async findOrCreateGoogleUser(profile: Profile): Promise<User> {
        const email = profile.emails?.[0].value;
        if (!email) {
            throw new Error('Google profile is missing an email address.');
        }

        // Check if an Account already exists for this Google profile
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

        // Check if a user with this email exists
        const existingUser = await prisma.user.findUnique({
            where: {email},
            select: userSelect,
        });

        if (existingUser) {
            // User exists but no Google Account linked - create the Account
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

        // Create new user with Google Account
        const oAuthUser = await prisma.user.create({
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
        return oAuthUser;
    }

    /**
     * Checks if a user exists with the given email.
     * @param email The email to check.
     * @returns An object indicating whether the user exists.
     */
    async checkUserExists(email: string): Promise<{ exists: boolean }> {
        const userCount = await prisma.user.count({
            where: {email},
        });
        return {exists: userCount > 0};
    }

    /**
     * Verifies a JWT token and returns the associated user.
     * @param token The JWT to verify.
     * @returns An object with validity status and optionally the user.
     */
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

    /**
     * Gets the profile of a user by their ID.
     * @param userId The ID of the user.
     * @returns The User object.
     */
    async getProfile(userId: string): Promise<User> {
        const user = await prisma.user.findUnique({
            where: {id: userId},
            select: userSelect,
        });
        if (!user) throw new Error('User not found');
        return user;
    }

    /**
     * Updates a user's profile.
     * @param userId The ID of the user to update.
     * @param data The update data.
     * @returns The updated User object.
     */
    async updateProfile(userId: string, data: UpdateProfileRequest): Promise<User> {
        try {
            const user = await prisma.user.findUnique({where: {id: userId}});
            if (!user) {
                throw new Error('User not found');
            }

            const updateData: { name?: string | null; image?: string | null; password?: string } = {};

            if (typeof data.name !== 'undefined') {
                updateData.name = data.name;
            }
            if (typeof data.image !== 'undefined') {
                updateData.image = data.image;
            }

            // Handle password change if both fields provided
            if (data.newPassword) {
                if (!user.password) {
                    throw new Error('Password change not available for OAuth accounts.');
                }
                if (!data.currentPassword) {
                    throw new Error('Current password is required to set a new password.');
                }
                const isCurrentValid = await bcrypt.compare(data.currentPassword, user.password);
                if (!isCurrentValid) {
                    throw new Error('Current password is incorrect.');
                }
                const hashed = await bcrypt.hash(data.newPassword, 12);
                updateData.password = hashed;
            }

            const updated = await prisma.user.update({
                where: {id: userId},
                data: updateData,
                select: userSelect,
            });
            return updated as User;
        } catch (error) {
            logger.error("updateProfile(): Profile update failed", error as Error, {userId});
            throw new Error("Profile update failed: " + (error as Error).message);
        }
    }
}