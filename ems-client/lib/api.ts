// API client for Event Management System
import { logger } from './logger';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost/api';

// Types for API responses
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

export interface AuthResponse {
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

export interface ApiError {
  error: string;
  message?: string;
}

// API client class
class ApiClient {
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
    logger.apiCall(method, url, options.body ? JSON.parse(options.body as string) : undefined);

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Log API error response
        logger.apiResponse(method, url, response.status, errorData);

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
      logger.apiResponse(method, url, response.status);

      return await response.json();
    } catch (error) {
      logger.errorWithContext('API Request Failed', error as Error, {
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
      body: JSON.stringify({ token }),
    });
  }

  async getProfile(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/profile');
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
    logger.debug('Token retrieved from storage', { hasToken: !!token });
    return token;
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
    logger.info('Token stored in localStorage');
  }

  removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    logger.info('Token removed from localStorage');
  }

  isAuthenticated(): boolean {
    const hasToken = !!this.getToken();
    logger.debug('Authentication check', { isAuthenticated: hasToken });
    return hasToken;
  }
}

// Create and export the API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Convenience exports
export const authAPI = {
  login: (credentials: LoginRequest) => apiClient.login(credentials),
  register: (userData: RegisterRequest) => apiClient.register(userData),
  verifyToken: (token: string) => apiClient.verifyToken(token),
  getProfile: () => apiClient.getProfile(),
  getMe: () => apiClient.getMe(),
  updateProfile: (userData: Partial<RegisterRequest>) => apiClient.updateProfile(userData),
  logout: () => apiClient.logout(),
  checkUserExists: (email: string) => apiClient.checkUserExists(email),
};

export const tokenManager = {
  getToken: () => apiClient.getToken(),
  setToken: (token: string) => apiClient.setToken(token),
  removeToken: () => apiClient.removeToken(),
  isAuthenticated: () => apiClient.isAuthenticated(),
};
