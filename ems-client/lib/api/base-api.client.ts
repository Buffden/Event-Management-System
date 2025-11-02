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
        // If endpoint is already an absolute URL, use it directly
        // Otherwise, prepend the base URL
        const url = endpoint.startsWith('http://') || endpoint.startsWith('https://') 
            ? endpoint 
            : `${this.baseURL}${endpoint}`;
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
        
        // Try localStorage first
        let token = localStorage.getItem('auth_token');
        
        // If not found in localStorage, try sessionStorage (fallback)
        if (!token) {
            token = sessionStorage.getItem('auth_token');
        }
        
        logger.debug(this.LOGGER_COMPONENT_NAME, 'Token retrieved from storage', { 
            hasToken: !!token,
            source: token ? (localStorage.getItem('auth_token') ? 'localStorage' : 'sessionStorage') : 'none'
        });
        return token;
    }

    // Public token management methods (can be overridden by subclasses)
    public setToken(token: string): void {
        if (typeof window === 'undefined') return;
        
        try {
            localStorage.setItem('auth_token', token);
            logger.info(this.LOGGER_COMPONENT_NAME, 'Token stored in localStorage');
        } catch (error) {
            // Handle localStorage quota exceeded
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                logger.warn(this.LOGGER_COMPONENT_NAME, 'localStorage quota exceeded, attempting cleanup');
                
                // Try to clear old data and retry
                this.cleanupLocalStorage();
                
                try {
                    localStorage.setItem('auth_token', token);
                    logger.info(this.LOGGER_COMPONENT_NAME, 'Token stored after cleanup');
                } catch (retryError) {
                    logger.error(this.LOGGER_COMPONENT_NAME, 'Failed to store token even after cleanup', retryError as Error);
                    // Fallback: use sessionStorage
                    sessionStorage.setItem('auth_token', token);
                    logger.info(this.LOGGER_COMPONENT_NAME, 'Token stored in sessionStorage as fallback');
                }
            } else {
                logger.error(this.LOGGER_COMPONENT_NAME, 'Failed to store token', error as Error);
                throw error;
            }
        }
    }

    public removeToken(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token'); // Also remove from sessionStorage fallback
        logger.info(this.LOGGER_COMPONENT_NAME, 'Token removed from storage');
    }

    public isAuthenticated(): boolean {
        const hasToken = !!(this.getToken());
        logger.debug(this.LOGGER_COMPONENT_NAME, 'Authentication check', { isAuthenticated: hasToken });
        return hasToken;
    }

    // Helper method to cleanup localStorage
    private cleanupLocalStorage(): void {
        try {
            // Remove old/expired tokens and other unnecessary data
            const keysToRemove: string[] = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.startsWith('auth_token_') || // Old token versions
                    key.startsWith('temp_') || // Temporary data
                    key.startsWith('cache_') || // Cache data
                    key.includes('_backup') // Backup data
                )) {
                    keysToRemove.push(key);
                }
            }
            
            // Remove identified keys
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                logger.debug(this.LOGGER_COMPONENT_NAME, `Removed old data: ${key}`);
            });
            
            logger.info(this.LOGGER_COMPONENT_NAME, `Cleaned up ${keysToRemove.length} old items from localStorage`);
        } catch (error) {
            logger.error(this.LOGGER_COMPONENT_NAME, 'Failed to cleanup localStorage', error as Error);
        }
    }
}
