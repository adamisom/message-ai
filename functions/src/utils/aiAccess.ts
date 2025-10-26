/**
 * Phase 4: AI Feature Access Control
 * Helper functions to validate Pro/Trial access for AI features
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Check if user can access AI features
 * Access granted if:
 * 1. User is a paid Pro subscriber (isPaidUser === true), OR
 * 2. User is in active 5-day trial (trialEndsAt > now), OR
 * 3. User is a member of an active workspace
 */
export async function canAccessAIFeatures(
  userId: string,
  conversationId?: string
): Promise<{ canAccess: boolean; reason?: string; trialDaysRemaining?: number }> {
  try {
    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return { canAccess: false, reason: 'User not found' };
    }
    
    const user = userDoc.data()!;
    
    // Check 1: Is user a paid Pro subscriber?
    if (user.isPaidUser === true) {
      return { canAccess: true };
    }
    
    // Check 2: Is user in active trial?
    if (user.trialEndsAt) {
      const now = Date.now();
      const trialEndsAt = user.trialEndsAt.toMillis();
      
      if (now < trialEndsAt) {
        const daysRemaining = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
        return { canAccess: true, trialDaysRemaining: daysRemaining };
      }
    }
    
    // Check 3: Is this conversation in a workspace where user is a member?
    if (conversationId) {
      const conversationDoc = await db.collection('conversations').doc(conversationId).get();
      
      if (conversationDoc.exists) {
        const conversation = conversationDoc.data()!;
        
        if (conversation.workspaceId) {
          const workspaceDoc = await db.collection('workspaces').doc(conversation.workspaceId).get();
          
          if (workspaceDoc.exists) {
            const workspace = workspaceDoc.data()!;
            
            // User must be a member and workspace must be active (payment not lapsed)
            if (workspace.members.includes(userId) && workspace.isActive) {
              return { canAccess: true };
            }
            
            if (!workspace.isActive) {
              return { canAccess: false, reason: 'Workspace payment lapsed - read-only mode' };
            }
          }
        }
      }
    }
    
    // No access: trial expired and not Pro
    return { 
      canAccess: false, 
      reason: 'Upgrade to Pro or join a workspace to access AI features' 
    };
    
  } catch (error) {
    console.error('Error checking AI feature access:', error);
    return { canAccess: false, reason: 'Error checking access' };
  }
}

/**
 * Get trial status for a user
 */
export async function getTrialStatus(userId: string): Promise<{
  isInTrial: boolean;
  daysRemaining: number;
  trialEndsAt?: Date;
}> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return { isInTrial: false, daysRemaining: 0 };
    }
    
    const user = userDoc.data()!;
    
    if (!user.trialEndsAt) {
      return { isInTrial: false, daysRemaining: 0 };
    }
    
    const now = Date.now();
    const trialEndsAt = user.trialEndsAt.toMillis();
    
    if (now < trialEndsAt) {
      const daysRemaining = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
      return {
        isInTrial: true,
        daysRemaining,
        trialEndsAt: new Date(trialEndsAt),
      };
    }
    
    return { isInTrial: false, daysRemaining: 0 };
    
  } catch (error) {
    console.error('Error getting trial status:', error);
    return { isInTrial: false, daysRemaining: 0 };
  }
}

