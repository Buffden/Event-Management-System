// Base API client for Event Management System
import { logger } from '../logger';

export abstract class BaseApiClient {
    protected baseURL: string;
    protected abstract readonly LOGGER_COMPONENT_NAME: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    protected async request<T>(
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
        logger.apiCall(this.LOGGER_COMPONENT_NAME, method, url, options.body ? JSON.parse(options.body as string) : undefined);

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Log API error response
                logger.apiResponse(this.LOGGER_COMPONENT_NAME, method, url, response.status, errorData);

                // Handle specific error cases
                if (response.status === 403) {
                    throw new Error(errorData.error || 'Access denied');
                } else if (response.status === 401) {
                    throw new Error(errorData.error || 'Authentication required');
                } else {
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
            }

            // Log successful API response
            logger.apiResponse(this.LOGGER_COMPONENT_NAME, method, url, response.status);

            return await response.json();
        } catch (error) {
            logger.errorWithContext(this.LOGGER_COMPONENT_NAME, `${this.LOGGER_COMPONENT_NAME} Request Failed`, error as Error, {
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

    // Token management (for authenticated requests)
    public getToken(): string | null {
        if (typeof window === 'undefined') return null;
        const token = localStorage.getItem('auth_token');
        logger.debug(this.LOGGER_COMPONENT_NAME, 'Token retrieved from storage', { hasToken: !!token });
        return token;
    }

    // Public token management methods (can be overridden by subclasses)
    public setToken(token: string): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem('auth_token', token);
        logger.info(this.LOGGER_COMPONENT_NAME, 'Token stored in localStorage');
    }

    public removeToken(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('auth_token');
        logger.info(this.LOGGER_COMPONENT_NAME, 'Token removed from localStorage');
    }

    public isAuthenticated(): boolean {
        const hasToken = !!this.getToken();
        logger.debug(this.LOGGER_COMPONENT_NAME, 'Authentication check', { isAuthenticated: hasToken });
        return hasToken;
    }
}
