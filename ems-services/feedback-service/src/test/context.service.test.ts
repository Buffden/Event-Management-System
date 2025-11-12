/**
 * Comprehensive Test Suite for Context Service
 *
 * Tests all context service functionality including:
 * - Setting context
 * - Getting context
 * - Getting request ID
 * - Clearing context
 */

import { describe, it, beforeEach, expect, jest } from '@jest/globals';

// Mock uuid
const mockUuidV4 = jest.fn();
jest.mock('uuid', () => ({
  v4: (...args: any[]) => mockUuidV4(...args),
}));

import { contextService } from '../services/context.service';

describe('ContextService', () => {
  beforeEach(() => {
    // Clear context before each test
    contextService.clearContext();
  });

  describe('setContext()', () => {
    it('should set context with all properties', () => {
      const context = {
        requestId: 'req-123',
        userId: 'user-123',
        userRole: 'ADMIN',
      };

      contextService.setContext(context);

      const retrieved = contextService.getContext();
      expect(retrieved).toEqual(context);
      expect(retrieved?.requestId).toBe('req-123');
      expect(retrieved?.userId).toBe('user-123');
      expect(retrieved?.userRole).toBe('ADMIN');
    });

    it('should set context with only requestId', () => {
      const context = {
        requestId: 'req-456',
      };

      contextService.setContext(context);

      const retrieved = contextService.getContext();
      expect(retrieved).toEqual(context);
      expect(retrieved?.requestId).toBe('req-456');
      expect(retrieved?.userId).toBeUndefined();
      expect(retrieved?.userRole).toBeUndefined();
    });

    it('should overwrite existing context', () => {
      const context1 = {
        requestId: 'req-1',
        userId: 'user-1',
      };

      const context2 = {
        requestId: 'req-2',
        userId: 'user-2',
        userRole: 'USER',
      };

      contextService.setContext(context1);
      contextService.setContext(context2);

      const retrieved = contextService.getContext();
      expect(retrieved).toEqual(context2);
      expect(retrieved?.requestId).toBe('req-2');
      expect(retrieved?.userId).toBe('user-2');
    });
  });

  describe('getContext()', () => {
    it('should return null when context is not set', () => {
      const context = contextService.getContext();
      expect(context).toBeNull();
    });

    it('should return the set context', () => {
      const context = {
        requestId: 'req-123',
        userId: 'user-123',
        userRole: 'ADMIN',
      };

      contextService.setContext(context);
      const retrieved = contextService.getContext();

      expect(retrieved).toEqual(context);
    });

    it('should return null after clearing context', () => {
      const context = {
        requestId: 'req-123',
      };

      contextService.setContext(context);
      contextService.clearContext();

      const retrieved = contextService.getContext();
      expect(retrieved).toBeNull();
    });
  });

  describe('getRequestId()', () => {
    it('should return requestId from context when set', () => {
      const context = {
        requestId: 'req-123',
        userId: 'user-123',
      };

      contextService.setContext(context);
      const requestId = contextService.getRequestId();

      expect(requestId).toBe('req-123');
    });

    it('should generate a new UUID when context is not set', () => {
      // Mock uuid to return different values
      mockUuidV4
        .mockReturnValueOnce('mock-uuid-1')
        .mockReturnValueOnce('mock-uuid-2');

      const requestId1 = contextService.getRequestId();
      const requestId2 = contextService.getRequestId();

      // Should be different UUIDs
      expect(requestId1).toBe('mock-uuid-1');
      expect(requestId2).toBe('mock-uuid-2');
      expect(requestId1).not.toBe(requestId2);
    });

    it('should return the same requestId when context is set', () => {
      const context = {
        requestId: 'req-456',
      };

      contextService.setContext(context);
      const requestId1 = contextService.getRequestId();
      const requestId2 = contextService.getRequestId();

      expect(requestId1).toBe('req-456');
      expect(requestId2).toBe('req-456');
      expect(requestId1).toBe(requestId2);
    });
  });

  describe('clearContext()', () => {
    it('should clear context when context is set', () => {
      const context = {
        requestId: 'req-123',
        userId: 'user-123',
      };

      contextService.setContext(context);
      expect(contextService.getContext()).not.toBeNull();

      contextService.clearContext();
      expect(contextService.getContext()).toBeNull();
    });

    it('should not throw error when clearing context that is already null', () => {
      expect(contextService.getContext()).toBeNull();

      expect(() => {
        contextService.clearContext();
      }).not.toThrow();

      expect(contextService.getContext()).toBeNull();
    });

    it('should allow setting new context after clearing', () => {
      const context1 = {
        requestId: 'req-1',
      };

      const context2 = {
        requestId: 'req-2',
        userId: 'user-2',
      };

      contextService.setContext(context1);
      contextService.clearContext();
      contextService.setContext(context2);

      const retrieved = contextService.getContext();
      expect(retrieved).toEqual(context2);
    });
  });
});

