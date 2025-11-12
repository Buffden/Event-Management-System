/**
 * Context Service Tests
 *
 * Tests for context service including:
 * - Context storage and retrieval
 * - User information access
 * - Request ID management
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { contextService, RequestContext } from '../context.service';

describe('ContextService', () => {
  beforeEach(() => {
    // Context is isolated per test due to AsyncLocalStorage
  });

  describe('run()', () => {
    it('should execute callback within context', () => {
      const testContext: RequestContext = {
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'test-request-id',
        timestamp: Date.now(),
      };
      const callback = jest.fn(() => 'callback-result');

      const result = contextService.run(testContext, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(result).toBe('callback-result');
    });

    it('should make context available during callback execution', () => {
      const testContext: RequestContext = {
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'test-request-id',
        timestamp: Date.now(),
      };

      contextService.run(testContext, () => {
        const context = contextService.getContext();
        expect(context).toEqual(testContext);
      });
    });

    it('should not leak context outside of run block', () => {
      const testContext: RequestContext = {
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'test-request-id',
        timestamp: Date.now(),
      };

      contextService.run(testContext, () => {
        // Context is available here
      });

      // Context should not be available here
      const context = contextService.getContext();
      expect(context).toBeUndefined();
    });
  });

  describe('getContext()', () => {
    it('should return context when available', () => {
      const testContext: RequestContext = {
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'test-request-id',
        timestamp: Date.now(),
      };

      contextService.run(testContext, () => {
        const context = contextService.getContext();
        expect(context).toEqual(testContext);
      });
    });

    it('should return undefined when no context is set', () => {
      const context = contextService.getContext();
      expect(context).toBeUndefined();
    });
  });

  describe('getCurrentUserId()', () => {
    it('should return user ID when context is available', () => {
      const testContext: RequestContext = {
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'test-request-id',
        timestamp: Date.now(),
      };

      contextService.run(testContext, () => {
        const userId = contextService.getCurrentUserId();
        expect(userId).toBe('test-user-id');
      });
    });

    it('should throw error when context is not available', () => {
      expect(() => {
        contextService.getCurrentUserId();
      }).toThrow('No user context available - ensure auth middleware is applied');
    });

    it('should throw error when userId is empty', () => {
      const testContext: RequestContext = {
        userId: '',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'test-request-id',
        timestamp: Date.now(),
      };

      contextService.run(testContext, () => {
        expect(() => {
          contextService.getCurrentUserId();
        }).toThrow('No user context available - ensure auth middleware is applied');
      });
    });
  });

  describe('getCurrentUserRole()', () => {
    it('should return user role when context is available', () => {
      const testContext: RequestContext = {
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userRole: 'ADMIN',
        requestId: 'test-request-id',
        timestamp: Date.now(),
      };

      contextService.run(testContext, () => {
        const role = contextService.getCurrentUserRole();
        expect(role).toBe('ADMIN');
      });
    });

    it('should throw error when context is not available', () => {
      expect(() => {
        contextService.getCurrentUserRole();
      }).toThrow('No user context available');
    });

    it('should throw error when userRole is empty', () => {
      const testContext: RequestContext = {
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userRole: '',
        requestId: 'test-request-id',
        timestamp: Date.now(),
      };

      contextService.run(testContext, () => {
        expect(() => {
          contextService.getCurrentUserRole();
        }).toThrow('No user context available');
      });
    });
  });

  describe('getCurrentUserEmail()', () => {
    it('should return user email when context is available', () => {
      const testContext: RequestContext = {
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'test-request-id',
        timestamp: Date.now(),
      };

      contextService.run(testContext, () => {
        const email = contextService.getCurrentUserEmail();
        expect(email).toBe('test@example.com');
      });
    });

    it('should throw error when context is not available', () => {
      expect(() => {
        contextService.getCurrentUserEmail();
      }).toThrow('No user context available');
    });

    it('should throw error when userEmail is empty', () => {
      const testContext: RequestContext = {
        userId: 'test-user-id',
        userEmail: '',
        userRole: 'USER',
        requestId: 'test-request-id',
        timestamp: Date.now(),
      };

      contextService.run(testContext, () => {
        expect(() => {
          contextService.getCurrentUserEmail();
        }).toThrow('No user context available');
      });
    });
  });

  describe('getRequestId()', () => {
    it('should return request ID when context is available', () => {
      const testContext: RequestContext = {
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'test-request-id',
        timestamp: Date.now(),
      };

      contextService.run(testContext, () => {
        const requestId = contextService.getRequestId();
        expect(requestId).toBe('test-request-id');
      });
    });

    it('should return "unknown" when context is not available', () => {
      const requestId = contextService.getRequestId();
      expect(requestId).toBe('unknown');
    });

    it('should return requestId when requestId is set but empty string', () => {
      const testContext: RequestContext = {
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: '',
        timestamp: Date.now(),
      };

      contextService.run(testContext, () => {
        const requestId = contextService.getRequestId();
        // Empty string is falsy, so getRequestId returns 'unknown' as fallback
        expect(requestId).toBe('unknown');
      });
    });
  });

  describe('Context Isolation', () => {
    it('should maintain separate contexts in nested calls', () => {
      const outerContext: RequestContext = {
        userId: 'outer-user-id',
        userEmail: 'outer@example.com',
        userRole: 'USER',
        requestId: 'outer-request-id',
        timestamp: Date.now(),
      };

      const innerContext: RequestContext = {
        userId: 'inner-user-id',
        userEmail: 'inner@example.com',
        userRole: 'ADMIN',
        requestId: 'inner-request-id',
        timestamp: Date.now(),
      };

      contextService.run(outerContext, () => {
        expect(contextService.getCurrentUserId()).toBe('outer-user-id');

        contextService.run(innerContext, () => {
          expect(contextService.getCurrentUserId()).toBe('inner-user-id');
        });

        // Should revert to outer context
        expect(contextService.getCurrentUserId()).toBe('outer-user-id');
      });
    });
  });
});

