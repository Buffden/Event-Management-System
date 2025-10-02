// API client for Event Management System
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

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
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

  async verifyToken(token: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/verify-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async getProfile(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/profile');
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
    return localStorage.getItem('auth_token');
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  }

  removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
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
