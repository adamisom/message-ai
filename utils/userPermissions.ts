/**
 * User Permissions Utility
 * Centralized logic for checking user Pro/Trial status and permissions
 * 
 * Refactoring: Eliminates duplicate permission checks from:
 * - app/chat/[id].tsx
 * - app/(tabs)/profile.tsx
 * - services/workspaceService.ts
 * - Multiple Cloud Functions
 */

import { Colors } from './colors';
import type { UserProfile } from '../services/authService';

export interface UserPermissions {
  // Status flags
  isPro: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isFree: boolean;
  isSpamBanned: boolean;
  
  // Feature permissions
  canAccessAI: boolean;
  canCreateWorkspace: boolean;
  canEditMessages: boolean;
  canDeleteMessages: boolean;
  
  // Display info
  statusBadge: string;
  statusColor: string;
  statusDetail: string;
  
  // Trial info
  trialDaysRemaining?: number;
  
  // UI flags
  showTrialButton: boolean;
  showUpgradeButton: boolean;
  showManageButton: boolean;
}

/**
 * Get comprehensive user permissions and status
 * Single source of truth for all permission checks
 */
export function getUserPermissions(user: UserProfile | null | undefined): UserPermissions {
  // Default permissions for no user
  if (!user) {
    return {
      isPro: false,
      isTrialActive: false,
      isTrialExpired: false,
      isFree: true,
      isSpamBanned: false,
      canAccessAI: false,
      canCreateWorkspace: false,
      canEditMessages: false,
      canDeleteMessages: false,
      statusBadge: '🔓 Free User',
      statusColor: '#8E8E93',
      statusDetail: '',
      showTrialButton: false,
      showUpgradeButton: false,
      showManageButton: false,
    };
  }
  
  const now = Date.now();
  
  // Check Pro status AND if subscription has expired
  const isPro = user.isPaidUser === true;
  let isProExpired = false;
  
  if (isPro && user.subscriptionEndsAt) {
    const subscriptionEndsAt = typeof user.subscriptionEndsAt === 'number'
      ? user.subscriptionEndsAt
      : user.subscriptionEndsAt.toMillis?.() || 0;
    isProExpired = now >= subscriptionEndsAt;
  }
  
  // User is only considered Pro if not expired
  const isActivePro = isPro && !isProExpired;
  
  // Check Trial status
  let isTrialActive = false;
  let isTrialExpired = false;
  let trialDaysRemaining: number | undefined;
  
  if (user.trialEndsAt) {
    const trialEndsAt = typeof user.trialEndsAt === 'number' 
      ? user.trialEndsAt 
      : user.trialEndsAt.toMillis?.() || 0;
    
    isTrialActive = now < trialEndsAt;
    isTrialExpired = now >= trialEndsAt;
    
    if (isTrialActive) {
      trialDaysRemaining = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
    }
  }
  
  const isFree = !isActivePro && !isTrialActive;
  const isSpamBanned = user.spamBanned === true;
  
  // Feature permissions
  const canAccessAI = isActivePro || isTrialActive;
  const canCreateWorkspace = isActivePro && !isSpamBanned && (user.workspacesOwned?.length || 0) < 5;
  const canEditMessages = isActivePro || isTrialActive;
  const canDeleteMessages = isActivePro || isTrialActive;
  
  // Display info
  let statusBadge = '🔓 Free User';
  let statusColor = '#8E8E93'; // Gray
  let statusDetail = '';
  
  if (isActivePro) {
    statusBadge = '💎 Pro User';
    statusColor = Colors.primary;
    statusDetail = user.subscriptionEndsAt 
      ? `Next billing: ${formatMonthlyBillingDate(user.subscriptionEndsAt)}`
      : '';
  } else if (isProExpired) {
    statusBadge = '🔓 Free User';
    statusColor = '#8E8E93';
    statusDetail = 'Subscription expired';
  } else if (isTrialActive) {
    statusBadge = '🎉 Trial User';
    statusColor = '#FFD700'; // Gold
    statusDetail = `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} remaining`;
  } else if (isTrialExpired) {
    statusBadge = '🔓 Free User';
    statusColor = '#8E8E93';
    statusDetail = 'Trial ended';
  }
  
  // UI button visibility
  const showTrialButton = !isActivePro && !isTrialActive && !user.trialUsed;
  const showUpgradeButton = !isActivePro; // Show upgrade for expired Pro, trial, and free users
  const showManageButton = isActivePro;
  
  return {
    isPro,
    isTrialActive,
    isTrialExpired,
    isFree,
    isSpamBanned,
    canAccessAI,
    canCreateWorkspace,
    canEditMessages,
    canDeleteMessages,
    statusBadge,
    statusColor,
    statusDetail,
    trialDaysRemaining,
    showTrialButton,
    showUpgradeButton,
    showManageButton,
  };
}

/**
 * Helper: Format subscription date for display
 */
function formatSubscriptionDate(date: any): string {
  try {
    const d = typeof date === 'number' 
      ? new Date(date) 
      : date.toDate?.() || new Date(date);
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

/**
 * Helper: Calculate next monthly billing date from subscription start/end
 * Shows the upcoming monthly billing, not the far-future subscription end date
 */
function formatMonthlyBillingDate(subscriptionDate: any): string {
  try {
    const now = new Date();
    const subDate = typeof subscriptionDate === 'number' 
      ? new Date(subscriptionDate) 
      : subscriptionDate.toDate?.() || new Date(subscriptionDate);
    
    // If subscription date is in the past, calculate next billing from now
    if (subDate < now) {
      const nextBilling = new Date(now);
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      return nextBilling.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    // Otherwise show the subscription date
    return subDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Check if user can access AI in a specific context (workspace or personal)
 */
export function canAccessAIInContext(
  user: UserProfile | null | undefined,
  isWorkspaceChat: boolean
): boolean {
  const permissions = getUserPermissions(user);
  
  // Pro/Trial users can access AI anywhere
  if (permissions.canAccessAI) {
    return true;
  }
  
  // Free users can access AI in workspace chats only
  if (isWorkspaceChat) {
    return true;
  }
  
  return false;
}

