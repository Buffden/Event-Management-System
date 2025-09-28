// src/services/context.service.ts
import { AsyncLocalStorage } from 'async_hooks';
import { User } from '../types/types';

export interface RequestContext {
    userId: string;
    userEmail: string;
    userRole: string;
    user?: User;
    requestId: string;
    timestamp: number;
}

class ContextService {
    private asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

    /**
     * Run a callback within a request context
     */
    run<T>(context: RequestContext, callback: () => T): T {
        return this.asyncLocalStorage.run(context, callback);
    }

    /**
     * Get the current request context
     */
    getContext(): RequestContext | undefined {
        return this.asyncLocalStorage.getStore();
    }

    /**
     * Get current user ID safely
     */
    getCurrentUserId(): string {
        const context = this.getContext();
        if (!context?.userId) {
            throw new Error('No user context available - ensure auth middleware is applied');
        }
        return context.userId;
    }

    /**
     * Get current user role safely
     */
    getCurrentUserRole(): string {
        const context = this.getContext();
        if (!context?.userRole) {
            throw new Error('No user context available');
        }
        return context.userRole;
    }

    /**
     * Get current user email safely
     */
    getCurrentUserEmail(): string {
        const context = this.getContext();
        if (!context?.userEmail) {
            throw new Error('No user context available');
        }
        return context.userEmail;
    }

    /**
     * Get request ID for correlation
     */
    getRequestId(): string {
        const context = this.getContext();
        return context?.requestId || 'unknown';
    }

    /**
     * Get cached user object if available
     */
    getCurrentUser(): User | undefined {
        const context = this.getContext();
        return context?.user;
    }

    /**
     * Set user object in context (useful for caching)
     */
    setCurrentUser(user: User): void {
        const context = this.getContext();
        if (context) {
            context.user = user;
        }
    }
}

export const contextService = new ContextService();
