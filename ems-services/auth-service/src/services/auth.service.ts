// src/services/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {prisma} from '../database';
import {
    AuthResponse,
    EmailNotification,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyResetTokenRequest,
    LoginRequest,
    MESSAGE_TYPE,
    RegisterRequest,
    Role,
    UpdateProfileRequest,
    User, VerifyTokenResponse,
    SpeakerProfileCreationMessage,
} from '../types/types';
import {Profile} from 'passport-google-oauth20';
import {ALLOWED_REGISTRATION_ROLES, DEFAULT_ROLE} from '../constants/roles';

import {rabbitMQService} from './rabbitmq.service';
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

class AuthService {
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
        logger.debug("isValidRegistrationRole(): Validating registration role", {role});
        if (!role) return true; // If no role provided, it will default to USER
        logger.debug("isValidRegistrationRole(): Invalid role", {role});
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
        logger.debug("_generateEmailVerificationToken(): Generating email verification token", {userId});
        return jwt.sign(
            {userId, type: 'email-verification'},
            this.EMAIL_VERIFICATION_SECRET,
            {expiresIn: '1h'}
        );
    }

    /**
     * Generates a password reset token for a user.
     * @param userId The ID of the user to reset password for.
     * @returns A JWT string.
     */
    private _generatePasswordResetToken(userId: string): string {
        logger.debug("_generatePasswordResetToken(): Generating password reset token", {userId});
        return jwt.sign(
            {userId, type: 'password-reset'},
            this.EMAIL_VERIFICATION_SECRET, // Using same secret as email verification
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
        logger.debug("generateJwtForUser(): Generating JWT for user", {userId: user.id});
        return this._generateToken(user);
    }

    /**
     * Creates a speaker profile in the Speaker Service when a user registers as a SPEAKER.
     * @param user The user object with SPEAKER role.
     */
    async createSpeakerProfile(user: User): Promise<void> {
        try {
            logger.debug("START - createSpeakerProfile(): ", {userId: user.id, role: user.role});

            if (user.role !== 'SPEAKER') {
                logger.debug("createSpeakerProfile(): User is not a SPEAKER, skipping profile creation", {userId: user.id, role: user.role});
                return;
            }

            const speakerProfileMessage: SpeakerProfileCreationMessage = {
                type: MESSAGE_TYPE.SPEAKER_PROFILE_CREATION,
                data: {
                    userId: user.id,
                    name: user.name || 'Speaker',
                    email: user.email,
                    bio: undefined, // Speaker can update this later
                    expertise: [], // Speaker can update this later
                    isAvailable: true,
                }
            };

            const queueName = 'speaker.profile.create';
            await rabbitMQService.sendMessage(queueName, speakerProfileMessage);

            logger.info("createSpeakerProfile(): Speaker profile creation message sent", {
                userId: user.id,
                queue: queueName
            });

            logger.debug("END - createSpeakerProfile(): ", {userId: user.id});
        } catch (error) {
            logger.error("createSpeakerProfile(): Failed to send speaker profile creation message", error as Error, {userId: user.id});
            // Don't throw error - speaker profile creation failure shouldn't break user registration
            // The speaker can create their profile later manually
        }
    }
    async sendVerificationEmail(user: User): Promise<void> {
        try {
            logger.debug("START - sendVerificationEmail(): ", {userId: user.id});
            const verificationToken = this._generateEmailVerificationToken(user.id);
            const verificationLink = `${process.env.CLIENT_URL}/auth/callback/?accessToken=${verificationToken}`;

            logger.debug("sendVerificationEmail(): Publishing verification email message to RabbitMQ", {
                userId: user.id,
                to: user.email
            });

            const msg: EmailNotification = {
                type: MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL,
                message: {
                    to: user.email,
                    subject: `${process.env.APP_NAME || 'EVENTO'} Verify Your Email Address`,
                    body: '', // Will be generated by email template service
                    link: verificationLink,
                    userName: user.name || 'User',
                    expiryTime: new Date(Date.now() + 60 * 60 * 1000).toLocaleString(), // 1 hour from now
                }
            };

            const queueName = 'notification.email';
            await rabbitMQService.sendMessage(queueName, msg);
            logger.debug("END - sendVerificationEmail(): ", {userId: user.id});
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
            logger.debug("START - register(): ", {
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
                logger.debug("register(): User with this email already exists and is active", {email: data.email});
                throw new Error('User with this email already exists.');
            } else if (existingUser && existingUser.emailVerified) {
                logger.debug("register(): User with this email is suspended", {email: data.email});
                throw new Error('Your account has been suspended. Please contact support.');
            } else if (existingUser) {
                logger.debug("register(): User with this email exists but is not verified. Resending verification email.", {email: data.email});
                await this.sendVerificationEmail(existingUser);
                throw new Error('Verification email has been resent. Please check your inbox.');
            }

            logger.debug("register(): No existing user found. Proceeding with registration.", {email: data.email});
            const hashedPassword = await bcrypt.hash(data.password, 12);
            const userRole = this.getRegistrationRole(data.role);

            logger.debug("register(): Before entering transaction to create a new user", {
                email: data.email,
                role: userRole
            });
            const user = await prisma.$transaction(async (tx) => {
                logger.debug("register(): Entering transaction to create User and Account", {email: data.email});
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
                logger.debug("register(): Create the corresponding Account record for email/password auth");
                await tx.account.create({
                    data: {
                        userId: newUser.id,
                        type: 'credentials',  // 'credentials' for email/password auth
                        provider: 'email',
                        providerAccountId: data.email, // Using email as the unique identifier
                    },
                });
                logger.debug("register(): Successfully created User and Account", {userId: newUser.id});
                return newUser;
            });
            logger.debug("register(): Exited transaction", {userId: user.id});
            await this.sendVerificationEmail(user);
            logger.debug("register(): Sent verification email to ", {email: user.email});

            // Create speaker profile if user registered as SPEAKER
            await this.createSpeakerProfile(user);
            logger.debug("register(): Speaker profile creation initiated", {userId: user.id, role: user.role});

            const token = this._generateToken(user);
            logger.debug("END - register(): ", {userId: user.id});
            return {token, email: user.email, id: user.id, user: user as User};
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
            logger.debug("START - verifyEmail(): Verifying email with token");
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
            logger.debug("verifyEmail(): updating user to set isActive=true and emailVerified timestamp", {userId: user.id});
            const updatedUser = await prisma.user.update({
                where: {id: user.id},
                data: {
                    isActive: true,
                    emailVerified: new Date(Date.now()),
                },
                select: userSelect,
            });

            // After successful verification, log the user in.
            const loginToken = this._generateToken(updatedUser as User);
            logger.debug("END - verifyEmail(): Email verified and user logged in", {userId: user.id});
            return {token: loginToken, email: user.email, id: user.id, user: updatedUser as User};

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
     * Sends a password reset email to the user.
     * @param data The forgot password request object containing email.
     */
    async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
        try {
            logger.debug("START - forgotPassword(): ", {email: data.email});

            // Check if user exists
            const user = await prisma.user.findUnique({
                where: { email: data.email },
                select: userSelect
            });

            if (!user) {
                // For security, don't reveal if user exists or not
                logger.debug("forgotPassword(): User not found, but not revealing this to client", {email: data.email});
                return;
            }

            // Check if user is active
            if (!user.isActive) {
                logger.debug("forgotPassword(): User account is not active", {userId: user.id});
                return;
            }

            // Generate password reset token
            const resetToken = this._generatePasswordResetToken(user.id);
            const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
            const expiryTime = new Date(Date.now() + 60 * 60 * 1000).toLocaleString(); // 1 hour from now

            logger.debug("forgotPassword(): Publishing password reset email message to RabbitMQ", {
                userId: user.id,
                to: user.email
            });

            const msg: EmailNotification = {
                type: MESSAGE_TYPE.PASSWORD_RESET_EMAIL,
                message: {
                    to: user.email,
                    subject: `${process.env.APP_NAME || 'EVENTO'} Password Reset Request`,
                    body: '', // Will be generated by email template service
                    link: resetLink,
                    userName: user.name || 'User',
                    expiryTime
                }
            };

            const queueName = 'notification.email';
            await rabbitMQService.sendMessage(queueName, msg);
            logger.debug("END - forgotPassword(): ", {userId: user.id});
        } catch (error) {
            logger.error("forgotPassword(): Failed to send password reset email", error as Error, {email: data.email});
            throw new Error('Could not send password reset email. Please try again later.');
        }
    }

    /**
     * Verifies a password reset token.
     * @param data The verify reset token request object containing token.
     */
    async verifyResetToken(data: VerifyResetTokenRequest): Promise<{ valid: boolean; message: string }> {
        try {
            logger.debug("START - verifyResetToken(): ", {token: data.token});

            // Verify the JWT token
            const decoded = jwt.verify(data.token, this.EMAIL_VERIFICATION_SECRET) as any;

            if (decoded.type !== 'password-reset') {
                logger.debug("verifyResetToken(): Invalid token type", {type: decoded.type});
                return { valid: false, message: 'Invalid reset token.' };
            }

            // Check if user exists and is active
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, isActive: true }
            });

            if (!user || !user.isActive) {
                logger.debug("verifyResetToken(): User not found or inactive", {userId: decoded.userId});
                return { valid: false, message: 'Invalid or expired reset token.' };
            }

            logger.debug("verifyResetToken(): Token verified successfully", {userId: user.id});
            return { valid: true, message: 'Token is valid.' };

        } catch (error) {
            logger.error("verifyResetToken(): Error occurred", error as Error, {token: data.token});
            return { valid: false, message: 'Invalid or expired reset token.' };
        }
    }

    /**
     * Resets the user's password using a valid reset token.
     * @param data The reset password request object containing token and new password.
     */
    async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
        try {
            logger.debug("START - resetPassword(): ", {token: data.token});

            // Verify the JWT token
            const decoded = jwt.verify(data.token, this.EMAIL_VERIFICATION_SECRET) as any;

            if (decoded.type !== 'password-reset') {
                logger.debug("resetPassword(): Invalid token type", {type: decoded.type});
                throw new Error('Invalid reset token.');
            }

            // Check if user exists and is active
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, isActive: true }
            });

            if (!user || !user.isActive) {
                logger.debug("resetPassword(): User not found or inactive", {userId: decoded.userId});
                throw new Error('Invalid or expired reset token.');
            }

            // Hash the new password
            const hashedPassword = await bcrypt.hash(data.newPassword, 12);

            // Update the user's password
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });

            logger.debug("resetPassword(): Password reset successfully", {userId: user.id, email: user.email});
            return { message: 'Password has been reset successfully.' };

        } catch (error) {
            logger.error("resetPassword(): Error occurred", error as Error, {token: data.token});
            throw error;
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
            logger.debug("START - login: Verifying user with token");

            if (!data.email || !data.password) {
                logger.error("login(): Email and password are required");
                throw new Error('Email and password are required.');
            }

            logger.debug("login(): Finding user by email", {email: data.email});
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
            logger.debug("login: Verifying user with token");
            if (!userWithPassword || !userWithPassword.password) {
                logger.error(`verifyEmail(): User does not exist - ${{userId: data.email}}`);
                throw new Error('User does not exist.');
            }
            logger.debug("login(): Verifying user with token", userWithPassword);
            // Check if the user's account is active
            if (!userWithPassword.isActive) {
                logger.error(`verifyEmail(): Your account is not active. Please verify your email first - ${{userId: data.email}}`);
                throw new Error('Your account is not active. Please verify your email first.');
            }

            const isPasswordValid = await bcrypt.compare(data.password, userWithPassword.password);
            if (!isPasswordValid) {
                logger.error(`verifyEmail(): Password Incorrect - ${{userId: data.email}}`);
                throw new Error('Password Incorrect.');
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
            logger.debug("login(): Created Account record if it didn't exist (for backward compatibility with existing users)", userWithPassword);

            const user = userWithPassword;
            const token = this._generateToken(user);

            // Omit password and accounts before returning
            logger.debug("END - login(): User logged in successfully", {userId: user.id});
            const {password, accounts, ...userWithoutSensitiveData} = user;
            return {token, email: user.email, id: user.id, user: userWithPassword as User};
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
    async verifyToken(token: string): Promise<VerifyTokenResponse> {
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

    /**
     * Activate multiple users by setting emailVerified and isActive
     * Admin-only operation
     * @param emails Array of email addresses to activate
     * @returns Number of users activated
     */
    async activateUsers(emails: string[]): Promise<{ activated: number; notFound: number }> {
        try {
            if (!emails || emails.length === 0) {
                throw new Error('Email list is required');
            }

            logger.info('activateUsers(): Activating users', { count: emails.length });

            // Update all users with matching emails
            const result = await prisma.user.updateMany({
                where: {
                    email: {
                        in: emails
                    }
                },
                data: {
                    emailVerified: new Date(),
                    isActive: true,
                    updatedAt: new Date()
                }
            });

            const activated = result.count;
            const notFound = emails.length - activated;

            logger.info('activateUsers(): Users activated', {
                activated,
                notFound,
                total: emails.length
            });

            return { activated, notFound };
        } catch (error) {
            logger.error('activateUsers(): Activation failed', error as Error);
            throw new Error('Failed to activate users: ' + (error as Error).message);
        }
    }
}

export { AuthService };
export const authService = new AuthService();