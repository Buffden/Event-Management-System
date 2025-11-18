/**
 * Test Suite for Context Service
 *
 * Tests AsyncLocalStorage-based request context management.
 */

import '@jest/globals';
import { contextService, RequestContext } from '../context.service';

describe('ContextService', () => {
  describe('run()', () => {
    it('should run callback within context', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      const result = contextService.run(context, () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });

    it('should make context available during callback execution', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'ADMIN',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      let capturedContext: RequestContext | undefined;

      contextService.run(context, () => {
        capturedContext = contextService.getContext();
        return 'test';
      });

      expect(capturedContext).toEqual(context);
    });

    it('should not leak context outside of run callback', () => {
      const context: RequestContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context, () => {
        // Context is available here
        expect(contextService.getContext()).toBeDefined();
      });

      // Context should not be available outside
      expect(contextService.getContext()).toBeUndefined();
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
  });

  describe('getCurrentUserId()', () => {
    it('should return userId from context', () => {
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

    it('should throw error when userId is missing from context', () => {
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
    it('should return userRole from context', () => {
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

    it('should throw error when userRole is missing from context', () => {
      const context: Partial<RequestContext> = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context as RequestContext, () => {
        expect(() => {
          contextService.getCurrentUserRole();
        }).toThrow('No user context available');
      });
    });
  });

  describe('getCurrentUserEmail()', () => {
    it('should return userEmail from context', () => {
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

    it('should throw error when userEmail is missing from context', () => {
      const context: Partial<RequestContext> = {
        userId: 'user-123',
        userRole: 'USER',
        requestId: 'req-123',
        timestamp: Date.now(),
      };

      contextService.run(context as RequestContext, () => {
        expect(() => {
          contextService.getCurrentUserEmail();
        }).toThrow('No user context available');
      });
    });
  });

  describe('getRequestId()', () => {
    it('should return requestId from context', () => {
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

    it('should return "unknown" when requestId is missing from context', () => {
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

  describe('Nested contexts', () => {
    it('should handle nested context runs correctly', () => {
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
        expect(contextService.getCurrentUserId()).toBe('user-outer');

        contextService.run(innerContext, () => {
          expect(contextService.getCurrentUserId()).toBe('user-inner');
        });

        // Should return to outer context
        expect(contextService.getCurrentUserId()).toBe('user-outer');
      });
    });
  });
});

