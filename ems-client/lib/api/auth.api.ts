// Auth API client for Event Management System
import {logger} from '../logger';
import {LoginRequest, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest, VerifyResetTokenRequest, VerifyResetTokenResponse, ResetPasswordResponse, AuthResponse, UserProfile} from './types/auth.types';
import {ApiError} from './types/common.types';
import { BaseApiClient } from './base-api.client';

const LOGGER_COMPONENT_NAME = 'AuthAPI';

import { apiEndpoints } from './config';

const API_BASE_URL = apiEndpoints.auth;

// Auth API client class
class AuthApiClient extends BaseApiClient {
    protected readonly LOGGER_COMPONENT_NAME = LOGGER_COMPONENT_NAME;

    constructor(baseURL: string) {
        super(baseURL);
    }


    // Auth methods
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        return this.request<AuthResponse>('/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    }

    async register(userData: RegisterRequest): Promise<AuthResponse> {
        return this.request<AuthResponse>('/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async verifyToken(token: string): Promise<boolean> {
        return this.request<boolean>('/verify-token', {
            method: 'POST',
            body: JSON.stringify({token}),
        });
    }

    async getProfile(): Promise<UserProfile> {
        return this.request<UserProfile>('/profile');
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
        return this.request<AuthResponse>(`/verify-email?token=${encodeURIComponent(token)}`);
    }

    async updateProfile(userData: Partial<RegisterRequest>): Promise<AuthResponse> {
        return this.request<AuthResponse>('/profile', {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    async logout(): Promise<{ success: boolean; message: string }> {
        return this.request<{ success: boolean; message: string }>('/logout', {
            method: 'POST',
        });
    }

    async checkUserExists(email: string): Promise<{ exists: boolean }> {
        return this.request<{ exists: boolean }>(`/check-user?email=${encodeURIComponent(email)}`);
    }

    async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
        return this.request<{ message: string }>('/forgot-password', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async verifyResetToken(data: VerifyResetTokenRequest): Promise<VerifyResetTokenResponse> {
        return this.request<VerifyResetTokenResponse>('/verify-reset-token', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
        return this.request<ResetPasswordResponse>('/reset-password', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getTotalUsers(): Promise<{ success: boolean; data: { totalUsers: number } }> {
        return this.request('/admin/users/stats');
    }

    async getAllUsers(filters?: { page?: number; limit?: number; role?: string; isActive?: boolean; search?: string }): Promise<{ success: boolean; data: { users: any[]; total: number; page: number; limit: number; totalPages: number } }> {
        const params = new URLSearchParams();
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.role) params.append('role', filters.role);
        if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
        if (filters?.search) params.append('search', filters.search);

        const endpoint = `/admin/users?${params.toString()}`;
        return this.request(endpoint);
    }

    async suspendUser(userId: string): Promise<{ success: boolean; message: string; data: any }> {
        return this.request(`/admin/users/${userId}/suspend`, {
            method: 'POST'
        });
    }

    async activateUser(userId: string): Promise<{ success: boolean; message: string; data: any }> {
        return this.request(`/admin/users/${userId}/activate`, {
            method: 'POST'
        });
    }

    async changeUserRole(userId: string, role: 'USER' | 'SPEAKER'): Promise<{ success: boolean; message: string; data: any }> {
        return this.request(`/admin/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
    }

    async getUserGrowth(): Promise<{ success: boolean; data: Array<{ month: string; users: number }> }> {
        return this.request('/admin/users/growth');
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
    forgotPassword: (data: ForgotPasswordRequest) => authApiClient.forgotPassword(data),
    verifyResetToken: (data: VerifyResetTokenRequest) => authApiClient.verifyResetToken(data),
    resetPassword: (data: ResetPasswordRequest) => authApiClient.resetPassword(data),
    getTotalUsers: () => authApiClient.getTotalUsers(),
    getAllUsers: (filters?: { page?: number; limit?: number; role?: string; isActive?: boolean; search?: string }) => authApiClient.getAllUsers(filters),
    suspendUser: (userId: string) => authApiClient.suspendUser(userId),
    activateUser: (userId: string) => authApiClient.activateUser(userId),
    changeUserRole: (userId: string, role: 'USER' | 'SPEAKER') => authApiClient.changeUserRole(userId, role),
    getUserGrowth: () => authApiClient.getUserGrowth(),
};

export const tokenManager = {
    getToken: () => authApiClient.getToken(),
    setToken: (token: string) => authApiClient.setToken(token),
    removeToken: () => authApiClient.removeToken(),
    isAuthenticated: () => authApiClient.isAuthenticated(),
};
