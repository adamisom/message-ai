/**
 * Unit tests for AI Access Control Helpers
 * Tests AI feature access determination logic
 */

import { checkUserAIAccess, checkWorkspaceAIAccess, calculateTrialDaysRemaining, User, Workspace } from '../aiAccessHelpers';

describe('AI Access Control Helpers', () => {
  describe('checkUserAIAccess', () => {
    const now = new Date('2025-01-15T12:00:00Z').getTime();
    
    it('should grant access to Pro user', () => {
      const proUser: User = {
        isPaidUser: true,
        subscriptionTier: 'pro',
        trialEndsAt: null,
      };
      
      const result = checkUserAIAccess(proUser, now);
      
      expect(result.canAccess).toBe(true);
      expect(result.reason).toContain('Pro subscriber');
    });
    
    it('should grant access to trial user (within 5-day trial)', () => {
      const trialEndsAt = new Date('2025-01-18T12:00:00Z').getTime(); // 3 days from now
      const trialUser: User = {
        isPaidUser: false,
        trialEndsAt: { toMillis: () => trialEndsAt },
      };
      
      const result = checkUserAIAccess(trialUser, now);
      
      expect(result.canAccess).toBe(true);
      expect(result.reason).toContain('Trial');
      expect(result.daysRemaining).toBe(3);
    });
    
    it('should deny access to expired trial user', () => {
      const trialEndsAt = new Date('2025-01-10T12:00:00Z').getTime(); // 5 days ago
      const expiredTrialUser: User = {
        isPaidUser: false,
        trialEndsAt: { toMillis: () => trialEndsAt },
      };
      
      const result = checkUserAIAccess(expiredTrialUser, now);
      
      expect(result.canAccess).toBe(false);
      expect(result.reason).toContain('Upgrade to Pro');
    });
    
    it('should deny access to free user with no trial', () => {
      const freeUser: User = {
        isPaidUser: false,
        trialEndsAt: null,
      };
      
      const result = checkUserAIAccess(freeUser, now);
      
      expect(result.canAccess).toBe(false);
      expect(result.reason).toContain('Upgrade to Pro');
    });
    
    it('should calculate correct days remaining for trial', () => {
      const trialEndsAt = new Date('2025-01-16T18:00:00Z').getTime(); // 1.25 days from now
      const trialUser: User = {
        isPaidUser: false,
        trialEndsAt: { toMillis: () => trialEndsAt },
      };
      
      const result = checkUserAIAccess(trialUser, now);
      
      expect(result.canAccess).toBe(true);
      expect(result.daysRemaining).toBe(2); // Rounds up
    });
  });
  
  describe('checkWorkspaceAIAccess', () => {
    it('should grant access to workspace member (active workspace)', () => {
      const workspace: Workspace = {
        members: ['user1', 'user2', 'user3'],
        isActive: true,
      };
      
      const result = checkWorkspaceAIAccess(workspace, 'user2');
      
      expect(result.canAccess).toBe(true);
      expect(result.reason).toContain('Workspace member');
    });
    
    it('should deny access when workspace payment lapsed', () => {
      const workspace: Workspace = {
        members: ['user1', 'user2'],
        isActive: false, // Payment lapsed
      };
      
      const result = checkWorkspaceAIAccess(workspace, 'user1');
      
      expect(result.canAccess).toBe(false);
      expect(result.reason).toContain('payment lapsed');
    });
    
    it('should deny access to non-member', () => {
      const workspace: Workspace = {
        members: ['user1', 'user2'],
        isActive: true,
      };
      
      const result = checkWorkspaceAIAccess(workspace, 'user3');
      
      expect(result.canAccess).toBe(false);
      expect(result.reason).toContain('Not a workspace member');
    });
  });
  
  describe('calculateTrialDaysRemaining', () => {
    const now = new Date('2025-01-15T12:00:00Z').getTime();
    
    it('should return correct days remaining', () => {
      const trialEndsAt = { toMillis: () => new Date('2025-01-19T12:00:00Z').getTime() }; // 4 days from now
      
      const result = calculateTrialDaysRemaining(trialEndsAt, now);
      
      expect(result).toBe(4);
    });
    
    it('should return 0 for expired trial', () => {
      const trialEndsAt = { toMillis: () => new Date('2025-01-10T12:00:00Z').getTime() }; // 5 days ago
      
      const result = calculateTrialDaysRemaining(trialEndsAt, now);
      
      expect(result).toBe(0);
    });
    
    it('should return 0 for null trial', () => {
      const result = calculateTrialDaysRemaining(null, now);
      
      expect(result).toBe(0);
    });
    
    it('should round up partial days', () => {
      const trialEndsAt = { toMillis: () => new Date('2025-01-16T06:00:00Z').getTime() }; // 0.75 days from now
      
      const result = calculateTrialDaysRemaining(trialEndsAt, now);
      
      expect(result).toBe(1); // Rounds up
    });
  });
});

