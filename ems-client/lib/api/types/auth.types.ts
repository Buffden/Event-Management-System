// Types for Auth API
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    role?: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface AuthResponse {
    success?: boolean;
    message?: string;
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        image?: string | null;
        emailVerified?: string | null;
        role: string;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
    };
}

// For profile endpoint that returns user directly
export interface UserProfile {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified?: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}