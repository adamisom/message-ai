/**
 * Unit tests for User Permissions Utility
 */

import { getUserPermissions, canAccessAIInContext } from '../userPermissions';
import type { UserProfile } from '../../services/authService';
import { Colors } from '../colors';

describe('userPermissions', () => {
  const mockNow = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Helper to create minimal UserProfile for testing
  const createMockUser = (overrides: Partial<UserProfile> = {}): UserProfile => ({
    uid: 'test-user',
    email: 'test@example.com',
    displayName: 'Test User',
    phoneNumber: '1234567890',
    isPaidUser: false,
    workspacesOwned: [],
    dmPrivacySetting: 'private',
    isOnline: false,
    lastSeenAt: { toMillis: () => mockNow } as any,
    createdAt: { toMillis: () => mockNow } as any,
    updatedAt: { toMillis: () => mockNow } as any,
    ...overrides,
  });

  describe('getUserPermissions', () => {
    it('should return default permissions for no user', () => {
      const permissions = getUserPermissions(null);

      expect(permissions.isPro).toBe(false);
      expect(permissions.isTrialActive).toBe(false);
      expect(permissions.isFree).toBe(true);
      expect(permissions.canAccessAI).toBe(false);
      expect(permissions.canCreateWorkspace).toBe(false);
      expect(permissions.statusBadge).toBe('🔓 Free User');
    });

    it('should identify Pro users correctly', () => {
      const proUser = createMockUser({
        isPaidUser: true,
        subscriptionEndsAt: { toMillis: () => mockNow + 30 * oneDayMs } as any,
      });

      const permissions = getUserPermissions(proUser);

      expect(permissions.isPro).toBe(true);
      expect(permissions.isTrialActive).toBe(false);
      expect(permissions.isFree).toBe(false);
      expect(permissions.canAccessAI).toBe(true);
      expect(permissions.canEditMessages).toBe(true);
      expect(permissions.canDeleteMessages).toBe(true);
      expect(permissions.statusBadge).toBe('💎 Pro User');
      expect(permissions.statusColor).toBe(Colors.primary);
      expect(permissions.showManageButton).toBe(true);
      expect(permissions.showUpgradeButton).toBe(false);
    });

    it('should identify active trial users correctly', () => {
      const trialUser = createMockUser({
        trialEndsAt: { toMillis: () => mockNow + 3 * oneDayMs } as any,
        trialUsed: true,
      });

      const permissions = getUserPermissions(trialUser);

      expect(permissions.isPro).toBe(false);
      expect(permissions.isTrialActive).toBe(true);
      expect(permissions.isFree).toBe(false);
      expect(permissions.canAccessAI).toBe(true);
      expect(permissions.statusBadge).toBe('🎉 Trial User');
      expect(permissions.statusColor).toBe('#FFD700');
      expect(permissions.trialDaysRemaining).toBe(3);
      expect(permissions.showUpgradeButton).toBe(true);
    });

    it('should identify expired trial users correctly', () => {
      const expiredTrialUser = createMockUser({
        trialEndsAt: { toMillis: () => mockNow - oneDayMs } as any,
        trialUsed: true,
      });

      const permissions = getUserPermissions(expiredTrialUser);

      expect(permissions.isPro).toBe(false);
      expect(permissions.isTrialActive).toBe(false);
      expect(permissions.isTrialExpired).toBe(true);
      expect(permissions.isFree).toBe(true);
      expect(permissions.canAccessAI).toBe(false);
      expect(permissions.statusBadge).toBe('🔓 Free User');
      expect(permissions.statusDetail).toBe('Trial ended');
    });

    it('should identify free users correctly', () => {
      const freeUser = createMockUser({});

      const permissions = getUserPermissions(freeUser);

      expect(permissions.isPro).toBe(false);
      expect(permissions.isTrialActive).toBe(false);
      expect(permissions.isFree).toBe(true);
      expect(permissions.canAccessAI).toBe(false);
      expect(permissions.statusBadge).toBe('🔓 Free User');
      expect(permissions.showTrialButton).toBe(true);
      expect(permissions.showUpgradeButton).toBe(true);
    });

    it('should prevent workspace creation for spam-banned users', () => {
      const bannedUser = createMockUser({
        isPaidUser: true,
        spamBanned: true,
      });

      const permissions = getUserPermissions(bannedUser);

      expect(permissions.isPro).toBe(true);
      expect(permissions.isSpamBanned).toBe(true);
      expect(permissions.canCreateWorkspace).toBe(false);
    });

    it('should prevent workspace creation when limit reached', () => {
      const maxWorkspaceUser = createMockUser({
        isPaidUser: true,
        workspacesOwned: ['ws1', 'ws2', 'ws3', 'ws4', 'ws5'],
      });

      const permissions = getUserPermissions(maxWorkspaceUser);

      expect(permissions.isPro).toBe(true);
      expect(permissions.canCreateWorkspace).toBe(false);
    });
  });

  describe('canAccessAIInContext', () => {
    it('should allow Pro users to access AI anywhere', () => {
      const proUser = createMockUser({ isPaidUser: true });

      expect(canAccessAIInContext(proUser, false)).toBe(true);
      expect(canAccessAIInContext(proUser, true)).toBe(true);
    });

    it('should allow free users to access AI in workspace chats only', () => {
      const freeUser = createMockUser({});

      expect(canAccessAIInContext(freeUser, false)).toBe(false);
      expect(canAccessAIInContext(freeUser, true)).toBe(true);
    });

    it('should allow trial users to access AI anywhere', () => {
      const trialUser = createMockUser({
        trialEndsAt: { toMillis: () => Date.now() + 86400000 } as any,
      });

      expect(canAccessAIInContext(trialUser, false)).toBe(true);
      expect(canAccessAIInContext(trialUser, true)).toBe(true);
    });
  });
});

