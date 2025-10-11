'use client';

import React, { ComponentType, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useLogger } from '@/lib/logger/LoggerProvider';

interface WithAuthOptions {
  requiredRole?: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function withAuth<T extends object>(
  Component: ComponentType<T>,
  options: WithAuthOptions = {}
) {
  const { requiredRole, fallback, redirectTo = '/login' } = options;

  return function AuthenticatedComponent(props: T) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const logger = useLogger();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        logger.info('withAuth', 'User not authenticated, redirecting to login');
        router.push(redirectTo);
        return;
      }

      if (!isLoading && isAuthenticated && requiredRole && user?.role !== requiredRole) {
        logger.warn('withAuth', 'User does not have required role', {
          userRole: user?.role,
          requiredRole
        });
        router.push('/dashboard');
        return;
      }
    }, [isAuthenticated, isLoading, user, requiredRole, router, redirectTo, logger]);

    // Show loading state
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-700 dark:text-slate-300 font-medium">Loading...</p>
          </div>
        </div>
      );
    }

    // Show fallback if not authenticated or wrong role
    if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
      return fallback || null;
    }

    // Render component if authenticated and authorized
    return <Component {...props} />;
  };
}

// Convenience functions for common roles
export const withAdminAuth = <T extends object>(Component: ComponentType<T>) =>
  withAuth(Component, { requiredRole: 'ADMIN' });

export const withSpeakerAuth = <T extends object>(Component: ComponentType<T>) =>
  withAuth(Component, { requiredRole: 'SPEAKER' });

export const withUserAuth = <T extends object>(Component: ComponentType<T>) =>
  withAuth(Component, { requiredRole: 'USER' });
