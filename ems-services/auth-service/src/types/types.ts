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
}

export interface EmailPayload {
    to: string;
    subject: string;
    body: string;
}

export interface Notification {
    type: MESSAGE_TYPE;
    message: unknown;
}

// Account Verification Email
export interface AccountVerificationEmail extends Notification {
    type: MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL;
    message: {
        to: string;
        subject: string;
        verificationLink: string;
        userName: string;
    };
}

export interface EmailNotification extends Notification {
    type: MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL;
    message: EmailPayload; // Use the new type here
}

export type AnyNotification = EmailNotification;

// Request body for updating user profile
export interface UpdateProfileRequest {
    name?: string | null;
    image?: string | null;
    currentPassword?: string;
    newPassword?: string;
}
