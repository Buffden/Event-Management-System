/**
 * Comprehensive Test Suite for Context Service
 *
 * Tests all context service functionality including:
 * - AsyncLocalStorage context management
 * - Context getters and setters
 * - Error handling
 * - Context isolation
 */

import '@jest/globals';
import { contextService, RequestContext } from '../services/context.service';
import { createMockUser } from './mocks-simple';

describe('Context Service', () => {
  beforeEach(() => {
    // Clear any existing context before each test
    // Note: AsyncLocalStorage doesn't have a clear method, so we rely on test isolation
  });

  afterEach(() => {
    // Clean up after each test
  });

  describe('run()', () => {
    it('should execute callback within context', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      let executed = false;
      contextService.run(context, () => {
        executed = true;
      });

      expect(executed).toBe(true);
    });

    it('should return value from callback', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      const result = contextService.run(context, () => {
        return 'test-value';
      });

      expect(result).toBe('test-value');
    });

    it('should make context available during callback execution', () => {
      const context: RequestContext = {
        userId: 'user-456',
        userEmail: 'admin@example.com',
        userRole: 'ADMIN',
        requestId: 'req-456',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        const retrievedContext = contextService.getContext();
        expect(retrievedContext).toEqual(context);
        expect(retrievedContext?.userId).toBe('user-456');
        expect(retrievedContext?.userEmail).toBe('admin@example.com');
        expect(retrievedContext?.userRole).toBe('ADMIN');
      });
    });

    it('should not leak context outside of callback', () => {
      const context: RequestContext = {
        userId: 'user-789',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-789',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        // Context is available here
        expect(contextService.getContext()).toBeDefined();
      });

      // Context should not be available outside
      const outsideContext = contextService.getContext();
      expect(outsideContext).toBeUndefined();
    });

    it('should handle nested context runs', () => {
      const outerContext: RequestContext = {
        userId: 'user-outer',
        userEmail: 'outer@example.com',
        userRole: 'USER',
        requestId: 'req-outer',
        timestamp: Date.now(),
      };

      const innerContext: RequestContext = {
        userId: 'user-inner',
        userEmail: 'inner@example.com',
        userRole: 'ADMIN',
        requestId: 'req-inner',
        timestamp: Date.now(),
      };

      contextService.run(outerContext, () => {
        expect(contextService.getContext()?.userId).toBe('user-outer');

        contextService.run(innerContext, () => {
          expect(contextService.getContext()?.userId).toBe('user-inner');
        });

        // Should return to outer context
        expect(contextService.getContext()?.userId).toBe('user-outer');
      });
    });

    it('should handle async callbacks', async () => {
      const context: RequestContext = {
        userId: 'user-async',
        userEmail: 'async@example.com',
        userRole: 'USER',
        requestId: 'req-async',
        timestamp: Date.now(),
      };

      const result = await contextService.run(context, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return contextService.getContext()?.userId;
      });

      expect(result).toBe('user-async');
    });
  });

  describe('getContext()', () => {
    it('should return undefined when no context is set', () => {
      const context = contextService.getContext();
      expect(context).toBeUndefined();
    });

    it('should return current context when set', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        const retrievedContext = contextService.getContext();
        expect(retrievedContext).toEqual(context);
      });
    });

    it('should return context with all fields', () => {
      const context: RequestContext = {
        userId: 'user-full',
        userEmail: 'full@example.com',
        userRole: 'SPEAKER',
        requestId: 'req-full',
        timestamp: 1234567890,
      };

      contextService.run(context, () => {
        const retrievedContext = contextService.getContext();
        expect(retrievedContext).toMatchObject({
          userId: 'user-full',
          userEmail: 'full@example.com',
          userRole: 'SPEAKER',
          requestId: 'req-full',
          timestamp: 1234567890,
        });
      });
    });
  });

  describe('getCurrentUserId()', () => {
    it('should return userId when context is available', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        const userId = contextService.getCurrentUserId();
        expect(userId).toBe('user-123');
      });
    });

    it('should throw error when context is not available', () => {
      expect(() => {
        contextService.getCurrentUserId();
      }).toThrow('No user context available - ensure auth middleware is applied');
    });

    it('should throw error when userId is empty string', () => {
      const context: RequestContext = {
        userId: '',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        expect(() => {
          contextService.getCurrentUserId();
        }).toThrow('No user context available - ensure auth middleware is applied');
      });
    });

    it('should throw error when context exists but userId is undefined', () => {
      const context: Partial<RequestContext> = {
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context as RequestContext, () => {
        expect(() => {
          contextService.getCurrentUserId();
        }).toThrow('No user context available - ensure auth middleware is applied');
      });
    });
  });

  describe('getCurrentUserRole()', () => {
    it('should return userRole when context is available', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'ADMIN',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        const role = contextService.getCurrentUserRole();
        expect(role).toBe('ADMIN');
      });
    });

    it('should throw error when context is not available', () => {
      expect(() => {
        contextService.getCurrentUserRole();
      }).toThrow('No user context available');
    });

    it('should throw error when userRole is empty string', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: '',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        expect(() => {
          contextService.getCurrentUserRole();
        }).toThrow('No user context available');
      });
    });
  });

  describe('getCurrentUserEmail()', () => {
    it('should return userEmail when context is available', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        const email = contextService.getCurrentUserEmail();
        expect(email).toBe('test@example.com');
      });
    });

    it('should throw error when context is not available', () => {
      expect(() => {
        contextService.getCurrentUserEmail();
      }).toThrow('No user context available');
    });

    it('should throw error when userEmail is empty string', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: '',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        expect(() => {
          contextService.getCurrentUserEmail();
        }).toThrow('No user context available');
      });
    });
  });

  describe('getRequestId()', () => {
    it('should return requestId when context is available', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        const requestId = contextService.getRequestId();
        expect(requestId).toBe('req-123');
      });
    });

    it('should return "unknown" when context is not available', () => {
      const requestId = contextService.getRequestId();
      expect(requestId).toBe('unknown');
    });

    it('should return "unknown" when requestId is not set', () => {
      const context: Partial<RequestContext> = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        timestamp: Date.now(),
      };

      contextService.run(context as RequestContext, () => {
        const requestId = contextService.getRequestId();
        expect(requestId).toBe('unknown');
      });
    });
  });

  describe('getCurrentUser()', () => {
    it('should return user object when set in context', () => {
      const mockUser = createMockUser({
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });

      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
        user: mockUser,
      };

      contextService.run(context, () => {
        const user = contextService.getCurrentUser();
        expect(user).toEqual(mockUser);
        expect(user?.id).toBe('user-123');
      });
    });

    it('should return undefined when user is not set in context', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        const user = contextService.getCurrentUser();
        expect(user).toBeUndefined();
      });
    });

    it('should return undefined when context is not available', () => {
      const user = contextService.getCurrentUser();
      expect(user).toBeUndefined();
    });
  });

  describe('setCurrentUser()', () => {
    it('should set user object in context', () => {
      const mockUser = createMockUser({
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });

      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        contextService.setCurrentUser(mockUser);
        const user = contextService.getCurrentUser();
        expect(user).toEqual(mockUser);
        expect(user?.id).toBe('user-123');
      });
    });

    it('should update existing user in context', () => {
      const initialUser = createMockUser({
        id: 'user-123',
        email: 'old@example.com',
      });

      const updatedUser = createMockUser({
        id: 'user-123',
        email: 'new@example.com',
      });

      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
        user: initialUser,
      };

      contextService.run(context, () => {
        expect(contextService.getCurrentUser()?.email).toBe('old@example.com');
        contextService.setCurrentUser(updatedUser);
        expect(contextService.getCurrentUser()?.email).toBe('new@example.com');
      });
    });

    it('should not throw error when context is not available', () => {
      const mockUser = createMockUser();
      expect(() => {
        contextService.setCurrentUser(mockUser);
      }).not.toThrow();
    });

    it('should not set user when context is not available', () => {
      const mockUser = createMockUser();
      contextService.setCurrentUser(mockUser);
      const user = contextService.getCurrentUser();
      expect(user).toBeUndefined();
    });
  });

  describe('Context Isolation', () => {
    it('should maintain separate contexts in parallel operations', async () => {
      const context1: RequestContext = {
        userId: 'user-1',
        userEmail: 'user1@example.com',
        userRole: 'USER',
        requestId: 'req-1',
        timestamp: Date.now(),
      };

      const context2: RequestContext = {
        userId: 'user-2',
        userEmail: 'user2@example.com',
        userRole: 'ADMIN',
        requestId: 'req-2',
        timestamp: Date.now(),
      };

      const results = await Promise.all([
        contextService.run(context1, async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return contextService.getContext()?.userId;
        }),
        contextService.run(context2, async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return contextService.getContext()?.userId;
        }),
      ]);

      expect(results[0]).toBe('user-1');
      expect(results[1]).toBe('user-2');
    });

    it('should not interfere with other contexts', () => {
      const context1: RequestContext = {
        userId: 'user-1',
        userEmail: 'user1@example.com',
        userRole: 'USER',
        requestId: 'req-1',
        timestamp: Date.now(),
      };

      const context2: RequestContext = {
        userId: 'user-2',
        userEmail: 'user2@example.com',
        userRole: 'ADMIN',
        requestId: 'req-2',
        timestamp: Date.now(),
      };

      let context1UserId: string | undefined;
      let context2UserId: string | undefined;

      contextService.run(context1, () => {
        context1UserId = contextService.getContext()?.userId;
      });

      contextService.run(context2, () => {
        context2UserId = contextService.getContext()?.userId;
      });

      expect(context1UserId).toBe('user-1');
      expect(context2UserId).toBe('user-2');
    });
  });
});

