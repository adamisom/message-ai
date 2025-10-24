import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase.config';

// Timeout wrapper utility
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
    if (error.message === 'Request timeout') {
      throw new Error(
        'AI feature is taking longer than expected. Please try again.'
      );
    }
    throw error;
  }
}

// Semantic Search
export async function searchMessages(
  query: string,
  conversationId: string,
  limit: number = 10
) {
  return await callAIFeatureWithTimeout(
    'semanticSearch',
    {
      query,
      userId: '', // Will be set by Cloud Function from auth context
      conversationId,
      limit,
    },
    3000 // 3 second timeout
  );
}

// Thread Summarization
export async function generateSummary(
  conversationId: string,
  messageCount: number
) {
  return await callAIFeatureWithTimeout(
    'generateSummary',
    {conversationId, messageCount},
    10000 // 10 second timeout
  );
}

// Action Items Extraction
export async function extractActionItems(conversationId: string) {
  return await callAIFeatureWithTimeout(
    'extractActionItems',
    {conversationId},
    8000 // 8 second timeout
  );
}

// Decision Tracking
export async function trackDecisions(conversationId: string) {
  return await callAIFeatureWithTimeout(
    'trackDecisions',
    {conversationId},
    10000 // 10 second timeout
  );
}

// Action Item Status Toggle
export async function toggleActionItemStatus(
  conversationId: string,
  itemId: string,
  newStatus: 'pending' | 'completed'
) {
  const {doc, updateDoc, serverTimestamp} = await import('firebase/firestore');
  const {db} = await import('../firebase.config');

  const itemRef = doc(
    db,
    `conversations/${conversationId}/ai_action_items/${itemId}`
  );
  await updateDoc(itemRef, {
    status: newStatus,
    completedAt: newStatus === 'completed' ? serverTimestamp() : null,
  });
}

