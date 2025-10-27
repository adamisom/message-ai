import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase.config';

/**
 * Maps Firebase/Cloud Function errors to user-friendly messages
 */
function getErrorMessage(error: any): string {
  // Timeout errors
  if (error.message === 'Request timeout') {
    return 'AI feature is taking longer than expected. Please try again.';
  }

  // Firebase auth errors
  if (error.code === 'unauthenticated') {
    return 'You must be logged in to use AI features.';
  }

  // Permission errors
  if (error.code === 'permission-denied') {
    return 'You do not have access to this conversation.';
  }

  // Rate limit errors
  if (error.code === 'resource-exhausted') {
    return 'You have exceeded your AI usage limit. Please try again later.';
  }

  // Network errors
  if (error.code === 'unavailable' || error.message?.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Function not found
  if (error.code === 'not-found') {
    return 'AI feature not available. Please update your app.';
  }

  // Generic error with message
  if (error.message) {
    return error.message;
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Timeout wrapper utility for Cloud Function calls
 */
async function callAIFeatureWithTimeout<T>(
  functionName: string,
  data: any,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });

  const functionCall = httpsCallable(functions, functionName);
  const functionPromise = functionCall(data);

  try {
    const result = await Promise.race([functionPromise, timeoutPromise]);
    return (result as any).data as T;
  } catch (error: any) {
    console.error(`[aiService] ${functionName} error:`, error);
    console.error(`[aiService] Error code:`, error.code);
    console.error(`[aiService] Error message:`, error.message);
    console.error(`[aiService] Full error:`, JSON.stringify(error, null, 2));
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Semantic Search - Search messages using AI-powered semantic search
 * @param query - Search query string
 * @param conversationId - Conversation to search in
 * @param limit - Maximum number of results (default: 10)
 * @throws Error with user-friendly message
 */
export async function searchMessages(
  query: string,
  conversationId: string,
  limit: number = 10
) {
  try {
    return await callAIFeatureWithTimeout(
      'semanticSearch',
      {
        query,
        userId: '', // Will be set by Cloud Function from auth context
        conversationId,
        limit,
      },
      30000 // 30 second timeout (increased for semantic search)
    );
  } catch (error: any) {
    throw error; // Already formatted by callAIFeatureWithTimeout
  }
}

/**
 * Thread Summarization - Generate AI summary of conversation
 * @param conversationId - Conversation to summarize
 * @param messageCount - Number of recent messages to include
 * @throws Error with user-friendly message
 */
export async function generateSummary(
  conversationId: string,
  messageCount: number
) {
  try {
    return await callAIFeatureWithTimeout(
      'generateSummary',
      {conversationId, messageCount},
      30000 // 30 second timeout
    );
  } catch (error: any) {
    throw error;
  }
}

/**
 * Action Items Extraction - Extract action items from conversation
 * @param conversationId - Conversation to extract from
 * @throws Error with user-friendly message
 */
export async function extractActionItems(conversationId: string) {
  try {
    return await callAIFeatureWithTimeout(
      'extractActionItems',
      {conversationId},
      30000 // 30 second timeout
    );
  } catch (error: any) {
    throw error;
  }
}

/**
 * Decision Tracking - Extract decisions from group conversation
 * @param conversationId - Conversation to extract from
 * @throws Error with user-friendly message
 */
export async function trackDecisions(conversationId: string) {
  try {
    return await callAIFeatureWithTimeout(
      'trackDecisions',
      {conversationId},
      30000 // 30 second timeout
    );
  } catch (error: any) {
    throw error;
  }
}

/**
 * Meeting Scheduler (Advanced AI Capability) - Suggest optimal meeting times
 * @param conversationId - Conversation to analyze
 * @param messageCount - Number of recent messages to analyze (default: 50)
 * @throws Error with user-friendly message
 */
export async function suggestMeetingTimes(
  conversationId: string,
  messageCount: number = 50
) {
  try {
    return await callAIFeatureWithTimeout(
      'analyzeMeetingScheduling',
      {conversationId, messageCount},
      30000 // 30 second timeout (matching other AI features, allows for cold start)
    );
  } catch (error: any) {
    throw error;
  }
}

/**
 * Action Item Status Toggle - Mark action item as completed or pending
 * @param conversationId - Conversation containing the action item
 * @param itemId - Action item ID
 * @param newStatus - New status ('pending' or 'completed')
 * @throws Error with user-friendly message
 */
export async function toggleActionItemStatus(
  conversationId: string,
  itemId: string,
  newStatus: 'pending' | 'completed'
) {
  try {
    const {doc, updateDoc, serverTimestamp} = await import('firebase/firestore');
    const {db} = await import('../firebase.config');

    const itemRef = doc(
      db,
      `conversations/${conversationId}/ai_action_items/${itemId}`
    );
    await updateDoc(itemRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('[aiService] toggleActionItemStatus error:', error);
    throw new Error(error.message || 'Failed to update action item status');
  }
}

/**
 * Assign Action Item - Manually assign an action item to a participant
 * @param conversationId - Conversation containing the action item
 * @param itemId - Action item ID
 * @param assigneeUid - UID of the user to assign
 * @param assigneeDisplayName - Display name of the user to assign
 * @throws Error with user-friendly message
 */
export async function assignActionItem(
  conversationId: string,
  itemId: string,
  assigneeUid: string,
  assigneeDisplayName: string
) {
  try {
    const {doc, updateDoc, serverTimestamp} = await import('firebase/firestore');
    const {db} = await import('../firebase.config');

    const itemRef = doc(
      db,
      `conversations/${conversationId}/ai_action_items/${itemId}`
    );
    await updateDoc(itemRef, {
      assigneeUid,
      assigneeDisplayName,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('[aiService] assignActionItem error:', error);
    throw new Error(error.message || 'Failed to assign action item');
  }
}

