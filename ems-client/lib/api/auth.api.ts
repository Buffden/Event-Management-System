// Auth API client for Event Management System
import {logger} from '../logger';
import {LoginRequest, RegisterRequest, AuthResponse, UserProfile} from './types/auth.types';
import {ApiError} from './types/common.types';

const LOGGER_COMPONENT_NAME = 'AuthAPI';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/api';

// Auth API client class
class AuthApiClient {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        const method = options.method || 'GET';

        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add authorization header if token exists
        const token = this.getToken();
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        // Log API call
        logger.apiCall(LOGGER_COMPONENT_NAME, method, url, options.body ? JSON.parse(options.body as string) : undefined);

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Log API error response
                logger.apiResponse(LOGGER_COMPONENT_NAME, method, url, response.status, errorData);

                // Handle specific error cases
                if (response.status === 403) {
                    throw new Error(errorData.error || 'Account access denied - account may be inactive');
                } else if (response.status === 401) {
                    throw new Error(errorData.error || 'Authentication failed - please login again');
                } else {
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
            }

            // Log successful API response
            logger.apiResponse(LOGGER_COMPONENT_NAME, method, url, response.status);

            return await response.json();
        } catch (error) {
            logger.errorWithContext(LOGGER_COMPONENT_NAME, 'Auth API Request Failed', error as Error, {
                method,
                url,
                endpoint
            });

            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred');
        }
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

    // Token management
    getToken(): string | null {
        if (typeof window === 'undefined') return null;
        const token = localStorage.getItem('auth_token');
        logger.debug(LOGGER_COMPONENT_NAME, 'Token retrieved from storage', {hasToken: !!token});
        return token;
    }

    setToken(token: string): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem('auth_token', token);
        logger.info(LOGGER_COMPONENT_NAME, 'Token stored in localStorage');
    }

    removeToken(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('auth_token');
        logger.info(LOGGER_COMPONENT_NAME, 'Token removed from localStorage');
    }

    isAuthenticated(): boolean {
        const hasToken = !!this.getToken();
        logger.debug(LOGGER_COMPONENT_NAME, 'Authentication check', {isAuthenticated: hasToken});
        return hasToken;
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
