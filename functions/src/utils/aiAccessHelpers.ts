/**
 * Phase 4: AI Access Control Helpers
 * Pure functions for determining AI feature access
 */

export interface User {
  isPaidUser: boolean;
  subscriptionTier?: string;
  trialEndsAt?: { toMillis: () => number } | null;
}

export interface Workspace {
  members: string[];
  isActive: boolean;
}

export interface AIAccessResult {
  canAccess: boolean;
  reason: string;
  daysRemaining?: number;
}

/**
 * Check if a user has AI access based on their Pro status or trial
 * Does NOT check workspace membership (use checkWorkspaceAIAccess for that)
 */
export function checkUserAIAccess(user: User, currentTime: number = Date.now()): AIAccessResult {
  // 1. Check if Pro subscriber
  if (user.isPaidUser === true) {
    return {
      canAccess: true,
      reason: 'Pro subscriber',
    };
  }
  
  // 2. Check if in active 5-day trial
  if (user.trialEndsAt) {
    const trialEndsAt = user.trialEndsAt.toMillis();
    
    if (currentTime < trialEndsAt) {
      const daysRemaining = Math.ceil((trialEndsAt - currentTime) / (1000 * 60 * 60 * 24));
      return {
        canAccess: true,
        reason: `Trial (${daysRemaining} days remaining)`,
        daysRemaining,
      };
    }
  }
  
  // 3. No access
  return {
    canAccess: false,
    reason: 'Upgrade to Pro or join a workspace to access AI features',
  };
}

/**
 * Check if a user has AI access via workspace membership
 */
export function checkWorkspaceAIAccess(workspace: Workspace, userId: string): AIAccessResult {
  // User must be a member
  if (!workspace.members.includes(userId)) {
    return {
      canAccess: false,
      reason: 'Not a workspace member',
    };
  }
  
  // Workspace must have active payment
  if (!workspace.isActive) {
    return {
      canAccess: false,
      reason: 'Workspace payment lapsed - read-only mode',
    };
  }
  
  return {
    canAccess: true,
    reason: 'Workspace member',
  };
}

/**
 * Calculate trial days remaining
 */
export function calculateTrialDaysRemaining(
  trialEndsAt: { toMillis: () => number } | null,
  currentTime: number = Date.now()
): number {
  if (!trialEndsAt) {
    return 0;
  }
  
  const endsAt = trialEndsAt.toMillis();
  if (currentTime >= endsAt) {
    return 0;
  }
  
  return Math.ceil((endsAt - currentTime) / (1000 * 60 * 60 * 24));
}

