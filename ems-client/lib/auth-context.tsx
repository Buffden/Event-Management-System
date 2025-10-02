'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {apiClient, AuthResponse, tokenManager} from './api';
import { logger } from './logger';

interface User {
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

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ success: boolean; error?: string, response?: AuthResponse }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  // Check if user is authenticated on mount
  useEffect(() => {
    logger.info('AuthProvider initialized, checking authentication');
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      logger.authEvent('Starting authentication check');
      const token = tokenManager.getToken();
      if (!token) {
        logger.info('No token found, user not authenticated');
        setIsLoading(false);
        return;
      }

      // First verify the token is valid
      logger.debug('Verifying token validity');
      const isValid = await apiClient.verifyToken(token);
      if (!isValid) {
        // Token is invalid, remove it
        logger.warn('Token validation failed, removing token');
        tokenManager.removeToken();
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Token is valid, get user profile
      logger.debug('Token valid, fetching user profile');
      const response = await apiClient.getProfile();
      if (response.user) {
        logger.authEvent('User authenticated successfully', {
          userId: response.user.id,
          email: response.user.email,
          role: response.user.role
        });
        setUser(response.user);
      } else {
        // Profile fetch failed, remove token
        logger.warn('Profile fetch failed, removing token');
        tokenManager.removeToken();
        setUser(null);
      }
    } catch (error) {
      logger.errorWithContext('Authentication check failed', error as Error);
      tokenManager.removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      logger.authEvent('Login attempt started', { email });
      setIsLoading(true);
      const response = await apiClient.login({ email, password });

      // Backend returns { token, user } directly without success field
      if (response.token && response.user) {
        logger.authEvent('Login successful', {
          userId: response.user.id,
          email: response.user.email,
          role: response.user.role
        });
        tokenManager.setToken(response.token);
        setUser(response.user);
        return { success: true };
      } else {
        logger.warn('Login failed - invalid response format', response);
        return { success: false, error: 'Login failed - invalid response format' };
      }
    } catch (error) {
      logger.errorWithContext('Login failed', error as Error, { email });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      logger.authEvent('Registration attempt started', { email, role });
      setIsLoading(true);
      const response = await apiClient.register({ name, email, password, role });
      // Backend returns { token, user } directly without success field
      if (response.token && response.user) {
        logger.authEvent('Registration successful', {
          userId: response.user.id,
          email: response.user.email,
          role: response.user.role
        });
        tokenManager.setToken(response.token);
        setUser(response.user);
        return { success: true };
      } else {
        logger.warn('Registration failed - invalid response format', response);
        return { success: false, error: 'Registration failed - invalid response format' };
      }
    } catch (error) {
      logger.errorWithContext('Registration failed', error as Error, { email, role });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    logger.authEvent('User logout');
    tokenManager.removeToken();
    setUser(null);
    router.push('/');
  };

  const verifyEmail = async (token: string): Promise<{ success: boolean; error?: string, response?: AuthResponse }> => {
    try {
      logger.authEvent('Email verification attempt started');
      setIsLoading(true);
      const response = await apiClient.verifyEmail(token);

      if (response.token && response.user) {
        logger.authEvent('Email verification successful', {
          userId: response.user.id,
          email: response.user.email
        });
        tokenManager.setToken(response.token);
        setUser(response.user);
        return { success: true , response};
      } else {
        logger.warn('Email verification failed - invalid response format', response);
        return { success: false, error: 'Email verification failed - invalid response format' };
      }
    } catch (error) {
      logger.errorWithContext('Email verification failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email verification failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
    verifyEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
