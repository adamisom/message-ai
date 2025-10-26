/**
 * Phase 4: AI Feature Access Control
 * Helper functions to validate Pro/Trial access for AI features
 */

import * as admin from 'firebase-admin';
import { checkUserAIAccess, checkWorkspaceAIAccess } from './aiAccessHelpers';

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
    // Get firestore instance inside function to avoid initialization issues in tests
    const db = admin.firestore();
    
    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return { canAccess: false, reason: 'User not found' };
    }
    
    const user = userDoc.data()!;
    
    // Check 1 & 2: Pro user or active trial (use tested helper)
    const userAccessResult = checkUserAIAccess(user as any);
    
    if (userAccessResult.canAccess) {
      return userAccessResult;
    }
    
    // Check 3: Workspace membership (if conversationId provided)
    if (conversationId) {
      const conversationDoc = await db.collection('conversations').doc(conversationId).get();
      
      if (conversationDoc.exists) {
        const conversation = conversationDoc.data()!;
        
        if (conversation.workspaceId) {
          const workspaceDoc = await db.collection('workspaces').doc(conversation.workspaceId).get();
          
          if (workspaceDoc.exists) {
            const workspace = workspaceDoc.data()!;
            
            // Use tested helper for workspace access check
            const workspaceAccessResult = checkWorkspaceAIAccess(workspace as any, userId);
            
            if (workspaceAccessResult.canAccess) {
              return workspaceAccessResult;
            }
            
            // Return specific workspace error
            return {
              canAccess: false,
              reason: workspaceAccessResult.reason,
            };
          }
        }
      }
    }
    
    // No access: not Pro, trial expired, and not in workspace
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
 * (Kept for backward compatibility, but could also use helper directly)
 */
export async function getTrialStatus(userId: string): Promise<{
  isInTrial: boolean;
  daysRemaining: number;
  trialEndsAt?: Date;
}> {
  try {
    const db = admin.firestore(); // Move inside function
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

