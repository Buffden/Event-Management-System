// 1. IMPORT the 'Role' enum directly from the generated Prisma client.
//    (Adjust the import path if your file structure is different)
import type {Role} from '../../generated/prisma/index';

// 2. RE-EXPORT the Role enum so other files can import it from this file.
export {Role};

/**
 * Represents the complete User object, reflecting the User model in Prisma.
 * It now correctly uses the Role type imported from Prisma.
 */
export interface User {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: Role; // Role from Prisma Schema
    isActive: boolean;
    emailVerified: Date | null;
    createdAt?: Date;
}

/**
 * Defines the shape of the request body for user registration.
 */
export interface RegisterRequest {
    email: string;
    password: string;
    name?: string;
    role?: Role;
    image?: string;
}

/**
 * Defines the shape of the request body for user login.
 */
export interface LoginRequest {
    email: string;
    password: string;
}

/**
 * Defines the shape of the request body for forgot password.
 */
export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

export interface VerifyResetTokenRequest {
    token: string;
}

/**
 * Defines the shape of a successful authentication response.
 * It includes the access token and the full user object.
 */
export interface AuthResponse {
    token: string;
    email: string;
    id: string;
    user?: User;
}

export interface VerifyTokenResponse {
    valid: boolean;
    user?: User;
}

export enum MESSAGE_TYPE {
    ACCOUNT_VERIFICATION_EMAIL = 'ACCOUNT_VERIFICATION_EMAIL',
    PASSWORD_RESET_EMAIL = 'PASSWORD_RESET_EMAIL',
    SPEAKER_PROFILE_CREATION = 'SPEAKER_PROFILE_CREATION',
}

// Unified Email Notification Interface
export interface EmailNotification {
    type: MESSAGE_TYPE;
    message: {
        to: string;
        subject: string;
        body: string;
        link: string;
        userName: string;
        expiryTime: string;
    };
}

// Speaker Profile Creation Message Interface
export interface SpeakerProfileCreationMessage {
    type: MESSAGE_TYPE.SPEAKER_PROFILE_CREATION;
    data: {
        userId: string;
        name: string;
        email: string;
        bio?: string;
        expertise?: string[];
        isAvailable?: boolean;
    };
}

export type AnyNotification = EmailNotification;

// Request body for updating user profile
export interface UpdateProfileRequest {
    name?: string | null;
    image?: string | null;
    currentPassword?: string;
    newPassword?: string;
}
