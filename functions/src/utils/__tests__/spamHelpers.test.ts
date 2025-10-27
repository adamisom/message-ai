/**
 * Unit tests for Spam Prevention Helpers
 * Tests spam strike calculation and decay logic
 */

import { calculateActiveStrikes, shouldSendBanNotification, SpamReport } from '../spamHelpers';

describe('Spam Prevention Helpers', () => {
  describe('calculateActiveStrikes', () => {
    const now = new Date('2025-01-15T12:00:00Z');
    
    it('should count strikes within 1 month', () => {
      const reports: SpamReport[] = [
        { reportedBy: 'user1', timestamp: new Date('2025-01-10T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user2', timestamp: new Date('2025-01-12T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user3', timestamp: new Date('2025-01-14T12:00:00Z'), reason: 'workspace' },
      ];
      
      const result = calculateActiveStrikes(reports, now);
      
      expect(result.activeStrikes).toBe(3);
      expect(result.isBanned).toBe(false);
    });
    
    it('should ignore strikes older than 1 month', () => {
      const reports: SpamReport[] = [
        { reportedBy: 'user1', timestamp: new Date('2024-12-10T12:00:00Z'), reason: 'workspace' }, // 36 days ago
        { reportedBy: 'user2', timestamp: new Date('2025-01-10T12:00:00Z'), reason: 'workspace' }, // 5 days ago
        { reportedBy: 'user3', timestamp: new Date('2025-01-14T12:00:00Z'), reason: 'workspace' }, // 1 day ago
      ];
      
      const result = calculateActiveStrikes(reports, now);
      
      expect(result.activeStrikes).toBe(2); // Only the 2 recent ones
    });
    
    it('should trigger ban at 5th strike', () => {
      const reports: SpamReport[] = [
        { reportedBy: 'user1', timestamp: new Date('2025-01-10T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user2', timestamp: new Date('2025-01-11T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user3', timestamp: new Date('2025-01-12T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user4', timestamp: new Date('2025-01-13T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user5', timestamp: new Date('2025-01-14T12:00:00Z'), reason: 'workspace' },
      ];
      
      const result = calculateActiveStrikes(reports, now);
      
      expect(result.activeStrikes).toBe(5);
      expect(result.isBanned).toBe(true);
      expect(result.shouldNotify).toBe(true);
      expect(result.notificationType).toBe('banned');
    });
    
    it('should send warning notification at 3rd strike', () => {
      const reports: SpamReport[] = [
        { reportedBy: 'user1', timestamp: new Date('2025-01-12T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user2', timestamp: new Date('2025-01-13T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user3', timestamp: new Date('2025-01-14T12:00:00Z'), reason: 'workspace' },
      ];
      
      const result = calculateActiveStrikes(reports, now);
      
      expect(result.activeStrikes).toBe(3);
      expect(result.isBanned).toBe(false);
      expect(result.shouldNotify).toBe(true);
      expect(result.notificationType).toBe('warning');
    });
    
    it('should send warning notification at 4th strike', () => {
      const reports: SpamReport[] = [
        { reportedBy: 'user1', timestamp: new Date('2025-01-11T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user2', timestamp: new Date('2025-01-12T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user3', timestamp: new Date('2025-01-13T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user4', timestamp: new Date('2025-01-14T12:00:00Z'), reason: 'workspace' },
      ];
      
      const result = calculateActiveStrikes(reports, now);
      
      expect(result.activeStrikes).toBe(4);
      expect(result.isBanned).toBe(false);
      expect(result.shouldNotify).toBe(true);
      expect(result.notificationType).toBe('warning');
    });
    
    it('should not notify at 1st or 2nd strike', () => {
      const reports: SpamReport[] = [
        { reportedBy: 'user1', timestamp: new Date('2025-01-13T12:00:00Z'), reason: 'workspace' },
        { reportedBy: 'user2', timestamp: new Date('2025-01-14T12:00:00Z'), reason: 'workspace' },
      ];
      
      const result = calculateActiveStrikes(reports, now);
      
      expect(result.activeStrikes).toBe(2);
      expect(result.shouldNotify).toBe(false);
      expect(result.notificationType).toBe(null);
    });
    
    it('should handle edge case: strike exactly 30 days ago', () => {
      const reports: SpamReport[] = [
        { reportedBy: 'user1', timestamp: new Date('2024-12-16T12:00:00Z'), reason: 'workspace' }, // Exactly 30 days ago
        { reportedBy: 'user2', timestamp: new Date('2025-01-14T12:00:00Z'), reason: 'workspace' },
      ];
      
      const result = calculateActiveStrikes(reports, now);
      
      // Strike at exactly 30 days should be excluded (> check, not >=)
      expect(result.activeStrikes).toBe(1);
    });

    it('should work with Firestore timestamp objects', () => {
      const reports: SpamReport[] = [
        { reportedBy: 'user1', timestamp: { toMillis: () => new Date('2025-01-10T12:00:00Z').getTime() }, reason: 'workspace' },
        { reportedBy: 'user2', timestamp: { toMillis: () => new Date('2025-01-14T12:00:00Z').getTime() }, reason: 'workspace' },
      ];
      
      const result = calculateActiveStrikes(reports, now);
      
      expect(result.activeStrikes).toBe(2);
    });
  });
  
  describe('shouldSendBanNotification', () => {
    it('should return true when newly banned', () => {
      const result = shouldSendBanNotification(false, {
        activeStrikes: 5,
        isBanned: true,
        shouldNotify: true,
        notificationType: 'banned',
      });
      
      expect(result).toBe(true);
    });
    
    it('should return false if already banned', () => {
      const result = shouldSendBanNotification(true, {
        activeStrikes: 6,
        isBanned: true,
        shouldNotify: true,
        notificationType: 'banned',
      });
      
      expect(result).toBe(false);
    });
  });
});

