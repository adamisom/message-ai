/**
 * Unit tests for Workspace Validation Helpers
 * Tests workspace creation validation logic
 */

import { validateWorkspaceCreation, calculateWorkspaceCharge, User } from '../workspaceHelpers';

describe('Workspace Validation Helpers', () => {
  const validProUser: User = {
    isPaidUser: true,
    subscriptionTier: 'pro',
    spamBanned: false,
    workspacesOwned: [],
  };
  
  describe('validateWorkspaceCreation', () => {
    it('should validate a valid workspace creation', () => {
      const result = validateWorkspaceCreation(validProUser, 'Engineering Team', 10, []);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should reject empty workspace name', () => {
      const result = validateWorkspaceCreation(validProUser, '   ', 10, []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Workspace name is required');
      expect(result.errorCode).toBe('invalid-name');
    });
    
    it('should reject null workspace name', () => {
      const result = validateWorkspaceCreation(validProUser, null as any, 10, []);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('invalid-name');
    });
    
    it('should reject maxUsers < 2', () => {
      const result = validateWorkspaceCreation(validProUser, 'Engineering Team', 1, []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maxUsers must be between 2 and 25');
      expect(result.errorCode).toBe('invalid-capacity');
    });
    
    it('should reject maxUsers > 25', () => {
      const result = validateWorkspaceCreation(validProUser, 'Engineering Team', 30, []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maxUsers must be between 2 and 25');
      expect(result.errorCode).toBe('invalid-capacity');
    });
    
    it('should block free user from creating workspace', () => {
      const freeUser: User = {
        ...validProUser,
        isPaidUser: false,
        subscriptionTier: 'free',
      };
      
      const result = validateWorkspaceCreation(freeUser, 'Engineering Team', 10, []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Pro subscription required');
      expect(result.errorCode).toBe('pro-required');
    });
    
    it('should block spam-banned user from creating workspace', () => {
      const bannedUser: User = {
        ...validProUser,
        spamBanned: true,
      };
      
      const result = validateWorkspaceCreation(bannedUser, 'Engineering Team', 10, []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('spam reports');
      expect(result.errorCode).toBe('spam-banned');
    });
    
    it('should enforce 5 workspace limit', () => {
      const userWith5Workspaces: User = {
        ...validProUser,
        workspacesOwned: ['w1', 'w2', 'w3', 'w4', 'w5'],
      };
      
      const result = validateWorkspaceCreation(userWith5Workspaces, 'Engineering Team', 10, []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Workspace limit reached');
      expect(result.errorCode).toBe('limit-reached');
    });
    
    it('should reject duplicate workspace name (case-insensitive)', () => {
      const existingNames = ['Engineering Team', 'Marketing Team'];
      
      const result = validateWorkspaceCreation(validProUser, 'engineering team', 10, existingNames);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already have a workspace with that name');
      expect(result.errorCode).toBe('duplicate-name');
    });
    
    it('should allow workspace with unique name', () => {
      const existingNames = ['Engineering Team', 'Marketing Team'];
      
      const result = validateWorkspaceCreation(validProUser, 'Sales Team', 10, existingNames);
      
      expect(result.valid).toBe(true);
    });
  });
  
  describe('calculateWorkspaceCharge', () => {
    it('should calculate charge at $0.50 per user', () => {
      expect(calculateWorkspaceCharge(10)).toBe(5.0);
      expect(calculateWorkspaceCharge(25)).toBe(12.5);
      expect(calculateWorkspaceCharge(2)).toBe(1.0);
    });
  });
});

