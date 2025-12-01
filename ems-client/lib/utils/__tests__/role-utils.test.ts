import { describe, it, expect } from '@jest/globals';
import {
  getRoleDisplayName,
  getRoleDisplayNameLower,
  isAdmin,
  canCreateEvents,
  canBookEvents,
  UserRole,
} from '../role-utils';

describe('role-utils', () => {
  describe('getRoleDisplayName', () => {
    it('should return "Attendee" for USER role', () => {
      expect(getRoleDisplayName('USER')).toBe('Attendee');
    });

    it('should return "Administrator" for ADMIN role', () => {
      expect(getRoleDisplayName('ADMIN')).toBe('Administrator');
    });

    it('should return "Speaker" for SPEAKER role', () => {
      expect(getRoleDisplayName('SPEAKER')).toBe('Speaker');
    });
  });

  describe('getRoleDisplayNameLower', () => {
    it('should return lowercase display name for USER', () => {
      expect(getRoleDisplayNameLower('USER')).toBe('attendee');
    });

    it('should return lowercase display name for ADMIN', () => {
      expect(getRoleDisplayNameLower('ADMIN')).toBe('administrator');
    });

    it('should return lowercase display name for SPEAKER', () => {
      expect(getRoleDisplayNameLower('SPEAKER')).toBe('speaker');
    });
  });

  describe('isAdmin', () => {
    it('should return true for ADMIN role', () => {
      expect(isAdmin('ADMIN')).toBe(true);
    });

    it('should return false for USER role', () => {
      expect(isAdmin('USER')).toBe(false);
    });

    it('should return false for SPEAKER role', () => {
      expect(isAdmin('SPEAKER')).toBe(false);
    });
  });

  describe('canCreateEvents', () => {
    it('should return true for ADMIN role', () => {
      expect(canCreateEvents('ADMIN')).toBe(true);
    });

    it('should return true for SPEAKER role', () => {
      expect(canCreateEvents('SPEAKER')).toBe(true);
    });

    it('should return false for USER role', () => {
      expect(canCreateEvents('USER')).toBe(false);
    });
  });

  describe('canBookEvents', () => {
    it('should return true for USER role', () => {
      expect(canBookEvents('USER')).toBe(true);
    });

    it('should return true for ADMIN role', () => {
      expect(canBookEvents('ADMIN')).toBe(true);
    });

    it('should return false for SPEAKER role', () => {
      expect(canBookEvents('SPEAKER')).toBe(false);
    });
  });
});

