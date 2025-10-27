/**
 * Unit tests for Date Format Utilities
 */

import {
  timestampToISO,
  daysUntil,
  isPast,
  formatRelativeTime,
} from '../dateFormat';

describe('dateFormat', () => {
  const mockNow = new Date('2025-10-27T12:00:00.000Z');
  const oneDayMs = 24 * 60 * 60 * 1000;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('timestampToISO', () => {
    it('should convert Firestore Timestamp to ISO string', () => {
      const firestoreTimestamp = {
        toDate: () => new Date('2025-10-15T10:30:00.000Z'),
      };

      const result = timestampToISO(firestoreTimestamp);
      expect(result).toBe('2025-10-15T10:30:00.000Z');
    });

    it('should convert Unix timestamp (milliseconds) to ISO string', () => {
      const unixTimestamp = 1729000000000; // Oct 15, 2024
      const result = timestampToISO(unixTimestamp);
      expect(result).toContain('2024-10-15');
    });

    it('should convert Date object to ISO string', () => {
      const date = new Date('2025-10-20T15:45:00.000Z');
      const result = timestampToISO(date);
      expect(result).toBe('2025-10-20T15:45:00.000Z');
    });

    it('should handle null/undefined by returning current time', () => {
      const result = timestampToISO(null);
      expect(result).toBe(mockNow.toISOString());
    });

    it('should handle string timestamps', () => {
      const result = timestampToISO('2025-10-25T08:00:00.000Z');
      expect(result).toBe('2025-10-25T08:00:00.000Z');
    });
  });

  describe('daysUntil', () => {
    it('should calculate days until future date', () => {
      const futureDate = new Date(mockNow.getTime() + 5 * oneDayMs);
      const result = daysUntil(futureDate);
      expect(result).toBe(5);
    });

    it('should return undefined for past dates', () => {
      const pastDate = new Date(mockNow.getTime() - 2 * oneDayMs);
      const result = daysUntil(pastDate);
      expect(result).toBeUndefined();
    });

    it('should handle Firestore Timestamps', () => {
      const futureTimestamp = {
        toDate: () => new Date(mockNow.getTime() + 3 * oneDayMs),
      };
      const result = daysUntil(futureTimestamp);
      expect(result).toBe(3);
    });

    it('should return undefined for null', () => {
      const result = daysUntil(null);
      expect(result).toBeUndefined();
    });

    it('should round up partial days', () => {
      const futureDate = new Date(mockNow.getTime() + 1.5 * oneDayMs);
      const result = daysUntil(futureDate);
      expect(result).toBe(2); // Ceiling of 1.5
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date(mockNow.getTime() - oneDayMs);
      expect(isPast(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date(mockNow.getTime() + oneDayMs);
      expect(isPast(futureDate)).toBe(false);
    });

    it('should handle Firestore Timestamps', () => {
      const pastTimestamp = {
        toDate: () => new Date(mockNow.getTime() - oneDayMs),
      };
      expect(isPast(pastTimestamp)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isPast(null)).toBe(false);
    });
  });

  describe('formatRelativeTime', () => {
    it('should format future days', () => {
      const futureDate = new Date(mockNow.getTime() + 3 * oneDayMs);
      expect(formatRelativeTime(futureDate)).toBe('in 3 days');
    });

    it('should format past days', () => {
      const pastDate = new Date(mockNow.getTime() - 2 * oneDayMs);
      expect(formatRelativeTime(pastDate)).toBe('2 days ago');
    });

    it('should format future hours', () => {
      const futureDate = new Date(mockNow.getTime() + 5 * 60 * 60 * 1000);
      expect(formatRelativeTime(futureDate)).toBe('in 5 hours');
    });

    it('should format past hours', () => {
      const pastDate = new Date(mockNow.getTime() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(pastDate)).toBe('3 hours ago');
    });

    it('should format future minutes', () => {
      const futureDate = new Date(mockNow.getTime() + 45 * 60 * 1000);
      expect(formatRelativeTime(futureDate)).toBe('in 45 minutes');
    });

    it('should format past minutes', () => {
      const pastDate = new Date(mockNow.getTime() - 30 * 60 * 1000);
      expect(formatRelativeTime(pastDate)).toBe('30 minutes ago');
    });

    it('should return "just now" for very recent times', () => {
      const recentDate = new Date(mockNow.getTime() - 30 * 1000);
      expect(formatRelativeTime(recentDate)).toBe('just now');
    });

    it('should handle singular forms correctly', () => {
      const oneDayAgo = new Date(mockNow.getTime() - oneDayMs);
      expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');

      const oneHourAgo = new Date(mockNow.getTime() - 60 * 60 * 1000);
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');

      const oneMinuteAgo = new Date(mockNow.getTime() - 60 * 1000);
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should return empty string for null', () => {
      expect(formatRelativeTime(null)).toBe('');
    });
  });
});

