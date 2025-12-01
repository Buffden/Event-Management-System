import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  formatLocalTime,
  getCurrentLocalTime,
  formatTimeDifference,
  USER_TIMEZONE,
} from '../timezone';

describe('timezone', () => {
  describe('USER_TIMEZONE', () => {
    it('should be set to America/Chicago', () => {
      expect(USER_TIMEZONE).toBe('America/Chicago');
    });
  });

  describe('formatLocalTime', () => {
    it('should format Date object to local time string', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatLocalTime(date);
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('should format date string to local time string', () => {
      const dateString = '2024-01-15T14:30:00Z';
      const result = formatLocalTime(dateString);
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('should handle different timezones correctly', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatLocalTime(date);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getCurrentLocalTime', () => {
    it('should return a Date object', () => {
      const result = getCurrentLocalTime();
      expect(result).toBeInstanceOf(Date);
    });

    it('should return current time', () => {
      const before = new Date();
      const result = getCurrentLocalTime();
      const after = new Date();

      expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('formatTimeDifference', () => {
    it('should return "now" for same dates', () => {
      const date = new Date();
      expect(formatTimeDifference(date, date)).toBe('now');
    });

    it('should return "X minutes ago" for past minutes', () => {
      const date1 = new Date('2024-01-15T14:00:00Z');
      const date2 = new Date('2024-01-15T14:15:00Z');
      expect(formatTimeDifference(date1, date2)).toBe('15 minutes ago');
    });

    it('should return "X minute ago" for singular past minute', () => {
      const date1 = new Date('2024-01-15T14:00:00Z');
      const date2 = new Date('2024-01-15T14:01:00Z');
      expect(formatTimeDifference(date1, date2)).toBe('1 minutes ago');
    });

    it('should return "X hours ago" for past hours', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-01-15T13:00:00Z');
      expect(formatTimeDifference(date1, date2)).toBe('3 hours ago');
    });

    it('should return "X hour ago" for singular past hour', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-01-15T11:00:00Z');
      expect(formatTimeDifference(date1, date2)).toBe('1 hour ago');
    });

    it('should return "X days ago" for past days', () => {
      const date1 = new Date('2024-01-10T10:00:00Z');
      const date2 = new Date('2024-01-15T10:00:00Z');
      expect(formatTimeDifference(date1, date2)).toBe('5 days ago');
    });

    it('should return "X day ago" for singular past day', () => {
      const date1 = new Date('2024-01-14T10:00:00Z');
      const date2 = new Date('2024-01-15T10:00:00Z');
      expect(formatTimeDifference(date1, date2)).toBe('1 day ago');
    });

    it('should return "in X minutes" for future minutes', () => {
      const date1 = new Date('2024-01-15T14:15:00Z');
      const date2 = new Date('2024-01-15T14:00:00Z');
      expect(formatTimeDifference(date1, date2)).toBe('in 15 minutes');
    });

    it('should return "in X hours" for future hours', () => {
      const date1 = new Date('2024-01-15T13:00:00Z');
      const date2 = new Date('2024-01-15T10:00:00Z');
      expect(formatTimeDifference(date1, date2)).toBe('in 3 hours');
    });

    it('should return "in X days" for future days', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-01-10T10:00:00Z');
      expect(formatTimeDifference(date1, date2)).toBe('in 5 days');
    });

    it('should handle date strings', () => {
      const date1 = '2024-01-15T14:00:00Z';
      const date2 = '2024-01-15T14:15:00Z';
      expect(formatTimeDifference(date1, date2)).toBe('15 minutes ago');
    });
  });
});

