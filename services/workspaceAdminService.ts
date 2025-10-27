import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase.config';

/**
 * Mark Message as Urgent - Sub-Phase 7
 * Workspace admins can manually mark up to 5 messages as urgent
 */
export async function markMessageUrgent(
  conversationId: string,
  messageId: string
): Promise<{ success: boolean; urgentCount: number }> {
  try {
    const markUrgent = httpsCallable(functions, 'markMessageUrgent');
    const result = await markUrgent({ conversationId, messageId });
    return result.data as { success: boolean; urgentCount: number };
  } catch (error: any) {
    console.error('[workspaceAdminService] markMessageUrgent error:', error);
    
    // Handle 5-message limit
    if (error.code === 'functions/resource-exhausted') {
      throw new Error('Maximum 5 urgent messages per conversation. Unmark one first.');
    }
    
    throw new Error(error.message || 'Failed to mark message urgent');
  }
}

/**
 * Unmark Message Urgent - Sub-Phase 7
 */
export async function unmarkMessageUrgent(
  conversationId: string,
  messageId: string
): Promise<{ success: boolean }> {
  try {
    const unmarkUrgent = httpsCallable(functions, 'unmarkMessageUrgent');
    const result = await unmarkUrgent({ conversationId, messageId });
    return result.data as { success: boolean };
  } catch (error: any) {
    console.error('[workspaceAdminService] unmarkMessageUrgent error:', error);
    throw new Error(error.message || 'Failed to unmark message urgent');
  }
}

/**
 * Pin Message - Sub-Phase 7
 * Pin a message (max 5 per conversation)
 */
export async function pinMessage(
  conversationId: string,
  messageId: string,
  replaceMessageId?: string
): Promise<{ success: boolean; pinnedCount: number }> {
  try {
    const pin = httpsCallable(functions, 'pinMessage');
    const result = await pin({ conversationId, messageId, replaceMessageId });
    return result.data as { success: boolean; pinnedCount: number };
  } catch (error: any) {
    console.error('[workspaceAdminService] pinMessage error:', error);
    
    // Handle 5-message limit
    if (error.code === 'functions/resource-exhausted') {
      throw new Error('Maximum 5 pinned messages. Replace an existing pin or unpin one first.');
    }
    
    throw new Error(error.message || 'Failed to pin message');
  }
}

/**
 * Unpin Message - Sub-Phase 7
 */
export async function unpinMessage(
  conversationId: string,
  messageId: string
): Promise<{ success: boolean; pinnedCount: number }> {
  try {
    const unpin = httpsCallable(functions, 'unpinMessage');
    const result = await unpin({ conversationId, messageId });
    return result.data as { success: boolean; pinnedCount: number };
  } catch (error: any) {
    console.error('[workspaceAdminService] unpinMessage error:', error);
    throw new Error(error.message || 'Failed to unpin message');
  }
}

/**
 * Expand Workspace Capacity - Sub-Phase 7
 * Expand capacity mid-month with pro-rated billing
 */
export async function expandWorkspaceCapacity(
  workspaceId: string,
  newMaxUsers: number
): Promise<{ success: boolean; newCapacity: number; chargeAmount: number }> {
  try {
    const expand = httpsCallable(functions, 'expandWorkspaceCapacity');
    const result = await expand({ workspaceId, newMaxUsers });
    return result.data as { success: boolean; newCapacity: number; chargeAmount: number };
  } catch (error: any) {
    console.error('[workspaceAdminService] expandWorkspaceCapacity error:', error);
    
    if (error.code === 'functions/aborted') {
      throw new Error('Payment failed. Please update your payment method.');
    }
    
    throw new Error(error.message || 'Failed to expand workspace capacity');
  }
}

