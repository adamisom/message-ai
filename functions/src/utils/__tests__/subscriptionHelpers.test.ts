/**
 * Unit tests for Subscription Helpers
 * Tests subscription calculation logic
 */

import { calculateSubscriptionEndDate, isSubscriptionExpired } from '../subscriptionHelpers';

describe('Subscription Helpers', () => {
  describe('calculateSubscriptionEndDate', () => {
    it('should return 1 year from start date', () => {
      const startDate = new Date('2025-01-15T12:00:00Z');
      const endDate = calculateSubscriptionEndDate(startDate);
      
      expect(endDate.getFullYear()).toBe(2026);
      expect(endDate.getMonth()).toBe(0); // January
      expect(endDate.getDate()).toBe(15);
    });
    
    it('should handle leap year correctly', () => {
      const startDate = new Date('2024-02-29T12:00:00Z'); // Leap day
      const endDate = calculateSubscriptionEndDate(startDate);
      
      expect(endDate.getFullYear()).toBe(2025);
      // March 1st because 2025 is not a leap year
      expect(endDate.getMonth()).toBe(2); // March
      expect(endDate.getDate()).toBe(1);
    });
    
    it('should use current date if no start date provided', () => {
      const before = new Date();
      const endDate = calculateSubscriptionEndDate();
      const after = new Date();
      
      expect(endDate.getFullYear()).toBe(before.getFullYear() + 1);
      expect(endDate.getTime()).toBeGreaterThan(before.getTime());
      expect(endDate.getTime()).toBeLessThanOrEqual(after.getTime() + (365 * 24 * 60 * 60 * 1000));
    });
  });
  
  describe('isSubscriptionExpired', () => {
    const now = new Date('2025-01-15T12:00:00Z').getTime();
    
    it('should return false for active subscription', () => {
      const endsAt = new Date('2026-01-15T12:00:00Z'); // 1 year from now
      
      const result = isSubscriptionExpired(endsAt, now);
      
      expect(result).toBe(false);
    });
    
    it('should return true for expired subscription', () => {
      const endsAt = new Date('2024-01-15T12:00:00Z'); // 1 year ago
      
      const result = isSubscriptionExpired(endsAt, now);
      
      expect(result).toBe(true);
    });
    
    it('should return true for null subscription', () => {
      const result = isSubscriptionExpired(null, now);
      
      expect(result).toBe(true);
    });
    
    it('should work with Firestore timestamp objects', () => {
      const endsAt = { toMillis: () => new Date('2026-01-15T12:00:00Z').getTime() };
      
      const result = isSubscriptionExpired(endsAt, now);
      
      expect(result).toBe(false);
    });
  });
});

