// Auth API client for Event Management System
import {logger} from '../logger';
import {LoginRequest, RegisterRequest, AuthResponse, UserProfile} from './types/auth.types';
import {ApiError} from './types/common.types';
import { BaseApiClient } from './base-api.client';

const LOGGER_COMPONENT_NAME = 'AuthAPI';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/api';

// Auth API client class
class AuthApiClient extends BaseApiClient {
    protected readonly LOGGER_COMPONENT_NAME = LOGGER_COMPONENT_NAME;

    constructor(baseURL: string) {
        super(baseURL);
    }


    // Auth methods
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    }

    async register(userData: RegisterRequest): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async verifyToken(token: string): Promise<boolean> {
        return this.request<boolean>('/auth/verify-token', {
            method: 'POST',
            body: JSON.stringify({token}),
        });
    }

    async getProfile(): Promise<UserProfile> {
        return this.request<UserProfile>('/auth/profile');
    }

    async getMe(): Promise<{
        userId: string;
        email: string;
        role: string;
        requestId: string;
        timestamp: number;
    }> {
        return this.request<{
            userId: string;
            email: string;
            role: string;
            requestId: string;
            timestamp: number;
        }>('/auth/me');
    }

    async verifyEmail(token: string): Promise<AuthResponse> {
        logger.debug(LOGGER_COMPONENT_NAME, 'Verifying email with token');
        return this.request<AuthResponse>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    }

    async updateProfile(userData: Partial<RegisterRequest>): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    async logout(): Promise<{ success: boolean; message: string }> {
        return this.request<{ success: boolean; message: string }>('/auth/logout', {
            method: 'POST',
        });
    }

    async checkUserExists(email: string): Promise<{ exists: boolean }> {
        return this.request<{ exists: boolean }>(`/auth/check-user?email=${encodeURIComponent(email)}`);
    }

}

// Create and export the Auth API client instance
export const authApiClient = new AuthApiClient(API_BASE_URL);

// Convenience exports for auth methods
export const authAPI = {
    login: (credentials: LoginRequest) => authApiClient.login(credentials),
    register: (userData: RegisterRequest) => authApiClient.register(userData),
    verifyToken: (token: string) => authApiClient.verifyToken(token),
    getProfile: () => authApiClient.getProfile(),
    getMe: () => authApiClient.getMe(),
    verifyEmail: (token: string) => authApiClient.verifyEmail(token),
    updateProfile: (userData: Partial<RegisterRequest>) => authApiClient.updateProfile(userData),
    logout: () => authApiClient.logout(),
    checkUserExists: (email: string) => authApiClient.checkUserExists(email),
};

export const tokenManager = {
    getToken: () => authApiClient.getToken(),
    setToken: (token: string) => authApiClient.setToken(token),
    removeToken: () => authApiClient.removeToken(),
    isAuthenticated: () => authApiClient.isAuthenticated(),
};
