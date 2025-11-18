'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {AuthResponse} from './api/types/auth.types';
import { tokenManager, authAPI, authApiClient} from '@/lib/api/auth.api';
import { useLogger } from './logger/LoggerProvider';

const LOGGER_COMPONENT_NAME = 'AuthContext';

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
  retryAuth: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ success: boolean; error?: string, response?: AuthResponse }>;
  shouldRedirectToLogin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const logger = useLogger();

  // Check if user is authenticated on mount
  useEffect(() => {
    logger.info(LOGGER_COMPONENT_NAME, 'AuthProvider initialized, checking authentication');
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      logger.authEvent(LOGGER_COMPONENT_NAME, 'Starting authentication check');
      const token = tokenManager.getToken();
      if (!token) {
        logger.info(LOGGER_COMPONENT_NAME, 'No token found, user not authenticated');
        setIsLoading(false);
        return;
      }

      // First verify the token is valid
      logger.debug(LOGGER_COMPONENT_NAME, 'Verifying token validity');
      try {
        const isValid = await authAPI.verifyToken(token);
        if (!isValid) {
          // Token is invalid, remove it
          logger.warn(LOGGER_COMPONENT_NAME, 'Token validation failed, removing token');
          tokenManager.removeToken();
          setUser(null);
          setIsLoading(false);
          setIsAuthenticated(false);
          return;
        }
      } catch (error) {
        // Token verification failed, but don't remove token immediately
        // This could be a network issue
        logger.warn(LOGGER_COMPONENT_NAME, 'Token verification failed, but keeping token for retry', error as Error);
        setIsLoading(false);
        return;
      }

      // Token is valid, get user profile
      logger.debug(LOGGER_COMPONENT_NAME, 'Token valid, fetching user profile');
      try {
        const response = await authAPI.getProfile();
        // Backend profile endpoint returns user object directly, not wrapped in { user }
        if (response && response.id) {
          logger.authEvent(LOGGER_COMPONENT_NAME, 'User authenticated successfully', {
            userId: response.id,
            email: response.email,
            role: response.role
          });
          setUser(response);
          setIsAuthenticated(true);
        } else {
          // Profile fetch failed, but don't remove token immediately
          logger.warn(LOGGER_COMPONENT_NAME, 'Profile fetch failed, but keeping token for retry', {
            response,
            responseType: typeof response,
            responseKeys: response ? Object.keys(response) : 'null'
          });
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Profile fetch failed, but don't remove token immediately
        logger.warn(LOGGER_COMPONENT_NAME, 'Profile fetch failed, but keeping token for retry', error as Error);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      logger.errorWithContext(LOGGER_COMPONENT_NAME, 'Authentication check failed', error as Error);
      // Only remove token if it's a critical error
      if (error instanceof Error && error.message.includes('401')) {
        tokenManager.removeToken();
        setUser(null);
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      logger.authEvent(LOGGER_COMPONENT_NAME, 'Login attempt started', { email });
      setIsLoading(true);
      const response = await authAPI.login({ email, password });

      // Backend returns { token, user } directly without success field
      if (response.token && response.user) {
        logger.authEvent(LOGGER_COMPONENT_NAME, 'Login successful', {
          userId: response.user.id,
          email: response.user.email,
          role: response.user.role
        });
        tokenManager.setToken(response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        logger.warn(LOGGER_COMPONENT_NAME, 'Login failed - invalid response format', response);
        return { success: false, error: 'Login failed - invalid response format' };
      }
    } catch (error) {
      logger.errorWithContext(LOGGER_COMPONENT_NAME, 'Login failed', error as Error, { email });
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
      logger.authEvent(LOGGER_COMPONENT_NAME, 'Registration attempt started', { email, role });
      setIsLoading(true);
      const response = await authAPI.register({ name, email, password, role });
      // Backend returns { token, user } directly without success field
      if (response.token && response.user) {
        logger.authEvent(LOGGER_COMPONENT_NAME, 'Registration successful', {
          userId: response.user.id,
          email: response.user.email,
          role: response.user.role
        });
        setUser(response.user);
        return { success: true };
      } else {
        logger.warn(LOGGER_COMPONENT_NAME, 'Registration failed - invalid response format', response);
        return { success: false, error: 'Registration failed - invalid response format' };
      }
    } catch (error) {
      logger.errorWithContext(LOGGER_COMPONENT_NAME, 'Registration failed', error as Error, { email, role });
      setUser(null);
      setIsAuthenticated(false);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    logger.authEvent(LOGGER_COMPONENT_NAME, 'User logout');
    tokenManager.removeToken();
    setUser(null);
    setIsAuthenticated(false);
    router.push('/');
  };

  const retryAuth = async () => {
    logger.info(LOGGER_COMPONENT_NAME, 'Retrying authentication...');
    setIsLoading(true);
    await checkAuth();
  };

  const verifyEmail = async (token: string): Promise<{ success: boolean; error?: string, response?: AuthResponse }> => {
    try {
      logger.authEvent(LOGGER_COMPONENT_NAME, 'Email verification attempt started', { token: token.substring(0, 20) + '...' });
      setIsLoading(true);
      const response = await authApiClient.verifyEmail(token);
      logger.debug(LOGGER_COMPONENT_NAME, 'Email verification API response:', response);

      if (response.token && response.user) {
        logger.authEvent(LOGGER_COMPONENT_NAME, 'Email verification successful', {
          userId: response.user.id,
          email: response.user.email
        });
        tokenManager.setToken(response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true , response};
      } else {
        logger.warn(LOGGER_COMPONENT_NAME, 'Email verification failed - invalid response format', response);
        return { success: false, error: 'Email verification failed - invalid response format' };
      }
    } catch (error) {
      logger.errorWithContext(LOGGER_COMPONENT_NAME, 'Email verification failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email verification failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Helper function to determine if we should redirect to login
   * Only returns true if auth check is complete (!isLoading) and user is not authenticated
   * This prevents premature redirects during page refresh when auth is still being checked
   */
  const shouldRedirectToLogin = (): boolean => {
    return !isLoading && !isAuthenticated;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
    retryAuth,
    verifyEmail,
    shouldRedirectToLogin,
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
