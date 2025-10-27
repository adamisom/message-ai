import { callCloudFunction } from './cloudFunctions';

/**
 * Mark Message as Urgent - Sub-Phase 7
 * Workspace admins can manually mark up to 5 messages as urgent
 */
export async function markMessageUrgent(
  conversationId: string,
  messageId: string
): Promise<{ success: boolean; urgentCount: number }> {
  try {
    const result = await callCloudFunction<{ success: boolean; urgentCount: number }>(
      'markMessageUrgent',
      { conversationId, messageId }
    );
    return result;
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
    const result = await callCloudFunction<{ success: boolean }>(
      'unmarkMessageUrgent',
      { conversationId, messageId }
    );
    return result;
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
    const result = await callCloudFunction<{ success: boolean; pinnedCount: number }>(
      'pinMessage',
      { conversationId, messageId, replaceMessageId }
    );
    return result;
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
    const result = await callCloudFunction<{ success: boolean; pinnedCount: number }>(
      'unpinMessage',
      { conversationId, messageId }
    );
    return result;
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
    const result = await callCloudFunction<{ success: boolean; newCapacity: number; chargeAmount: number }>(
      'expandWorkspaceCapacity',
      { workspaceId, newMaxUsers }
    );
    return result;
  } catch (error: any) {
    console.error('[workspaceAdminService] expandWorkspaceCapacity error:', error);
    
    if (error.code === 'functions/aborted') {
      throw new Error('Payment failed. Please update your payment method.');
    }
    
    throw new Error(error.message || 'Failed to expand workspace capacity');
  }
}

