/**
 * Unit tests for spam helper functions
 * Tests the dual ban logic: 2 strikes in 24h = 24h ban, 5 strikes in 30d = indefinite ban
 */

import { calculateActiveStrikes } from '../utils/spamHelpers';

describe('spamHelpers', () => {
  describe('calculateActiveStrikes', () => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const ONE_DAY = 24 * ONE_HOUR;

    it('should return 0 strikes for empty array', () => {
      const result = calculateActiveStrikes([]);
      expect(result.activeStrikes).toBe(0);
      expect(result.isTempBanned).toBe(false);
      expect(result.isPermanentlyBanned).toBe(false);
      expect(result.tempBanEndsAt).toBeUndefined();
    });

    it('should count strikes within 30 days', () => {
      const reports = [
        { timestamp: new Date(now - (29 * ONE_DAY)) }, // 29 days ago
        { timestamp: new Date(now - (15 * ONE_DAY)) }, // 15 days ago
        { timestamp: new Date(now - (5 * ONE_DAY)) },  // 5 days ago
      ];

      const result = calculateActiveStrikes(reports as any);
      expect(result.activeStrikes).toBe(3);
      expect(result.isTempBanned).toBe(false);
      expect(result.isPermanentlyBanned).toBe(false);
    });

    it('should exclude strikes older than 30 days', () => {
      const reports = [
        { timestamp: new Date(now - (31 * ONE_DAY)) }, // 31 days ago - should be excluded
        { timestamp: new Date(now - (15 * ONE_DAY)) }, // 15 days ago
        { timestamp: new Date(now - (5 * ONE_DAY)) },  // 5 days ago
      ];

      const result = calculateActiveStrikes(reports as any);
      expect(result.activeStrikes).toBe(2);
    });

    it('should trigger 24h temp ban with 2 strikes in 24h', () => {
      const secondStrikeTime = now - (1 * ONE_HOUR); // 1 hour ago
      const reports = [
        { timestamp: new Date(now - (23 * ONE_HOUR)) }, // 23 hours ago
        { timestamp: new Date(secondStrikeTime) },       // 1 hour ago
      ];

      const result = calculateActiveStrikes(reports as any);
      expect(result.activeStrikes).toBe(2);
      expect(result.isTempBanned).toBe(true);
      expect(result.isPermanentlyBanned).toBe(false);
      expect(result.tempBanEndsAt).toBe(secondStrikeTime + ONE_DAY);
    });

    it('should not trigger temp ban with 2 strikes more than 24h apart', () => {
      const reports = [
        { timestamp: new Date(now - (25 * ONE_HOUR)) }, // 25 hours ago
        { timestamp: new Date(now - (1 * ONE_HOUR)) },  // 1 hour ago
      ];

      const result = calculateActiveStrikes(reports as any);
      expect(result.activeStrikes).toBe(2);
      expect(result.isTempBanned).toBe(false);
      expect(result.isPermanentlyBanned).toBe(false);
    });

    it('should trigger indefinite ban with 5 strikes in 30 days', () => {
      const reports = [
        { timestamp: new Date(now - (29 * ONE_DAY)) },
        { timestamp: new Date(now - (20 * ONE_DAY)) },
        { timestamp: new Date(now - (10 * ONE_DAY)) },
        { timestamp: new Date(now - (5 * ONE_DAY)) },
        { timestamp: new Date(now - (1 * ONE_DAY)) },
      ];

      const result = calculateActiveStrikes(reports as any);
      expect(result.activeStrikes).toBe(5);
      expect(result.isPermanentlyBanned).toBe(true);
      // Temp ban doesn't matter if permanently banned
    });

    it('should trigger both temp ban (2 in 24h) and indefinite ban (5 in 30d)', () => {
      const secondStrikeTime = now - (1 * ONE_HOUR);
      const reports = [
        { timestamp: new Date(now - (29 * ONE_DAY)) },  // Old strike
        { timestamp: new Date(now - (20 * ONE_DAY)) },  // Old strike
        { timestamp: new Date(now - (10 * ONE_DAY)) },  // Old strike
        { timestamp: new Date(now - (23 * ONE_HOUR)) }, // Recent strike (part of 24h pair)
        { timestamp: new Date(secondStrikeTime) },       // Recent strike (second of 24h pair)
      ];

      const result = calculateActiveStrikes(reports as any);
      expect(result.activeStrikes).toBe(5);
      expect(result.isTempBanned).toBe(true);
      expect(result.isPermanentlyBanned).toBe(true);
      expect(result.tempBanEndsAt).toBe(secondStrikeTime + ONE_DAY);
    });

    it('should not trigger temp ban if currently past the 24h window', () => {
      const secondStrikeTime = now - (25 * ONE_HOUR); // 25 hours ago
      const reports = [
        { timestamp: new Date(now - (26 * ONE_HOUR)) }, // 26 hours ago
        { timestamp: new Date(secondStrikeTime) },       // 25 hours ago (2nd strike)
      ];

      const result = calculateActiveStrikes(reports as any);
      expect(result.activeStrikes).toBe(2);
      expect(result.isTempBanned).toBe(false); // Ban has expired
      expect(result.isPermanentlyBanned).toBe(false);
    });

    it('should handle 3 strikes in 24h (still only 24h ban, not indefinite)', () => {
      const thirdStrikeTime = now - (1 * ONE_HOUR);
      const reports = [
        { timestamp: new Date(now - (23 * ONE_HOUR)) },
        { timestamp: new Date(now - (12 * ONE_HOUR)) },
        { timestamp: new Date(thirdStrikeTime) }, // 3rd strike
      ];

      const result = calculateActiveStrikes(reports as any);
      expect(result.activeStrikes).toBe(3);
      expect(result.isTempBanned).toBe(true);
      expect(result.isPermanentlyBanned).toBe(false); // Not 5 yet
    });

    it('should correctly identify most recent strike within 24h for temp ban end time', () => {
      const mostRecentTime = now - (1 * ONE_HOUR);
      const reports = [
        { timestamp: new Date(now - (23 * ONE_HOUR)) },
        { timestamp: new Date(now - (15 * ONE_HOUR)) },
        { timestamp: new Date(mostRecentTime) }, // Most recent
      ];

      const result = calculateActiveStrikes(reports as any);
      expect(result.isTempBanned).toBe(true);
      expect(result.tempBanEndsAt).toBe(mostRecentTime + ONE_DAY);
    });
  });
});

