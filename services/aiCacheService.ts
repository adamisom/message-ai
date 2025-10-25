/**
 * AI Cache Service
 * 
 * Handles cache invalidation when AI-generated features are manually edited.
 * When users mutate cached AI data (e.g., assign action items), we invalidate the cache
 * so the next fetch retrieves fresh data from Firestore and rebuilds the cache.
 * 
 * STRATEGY: Clear cache instead of updating it
 * - Simpler and safer than trying to keep cache in sync
 * - Firestore documents are the source of truth
 * - Cloud Function automatically rebuilds cache on next fetch
 * 
 * CURRENT SCOPE (Phase 3):
 * - Action Items: Manual assignment by conversation participants
 * 
 * FUTURE SCOPE (Phase 4 - Workspaces & Paid Tier):
 * - Action Items: Edit/save by workspace admins
 * - Summaries: Edit/save by workspace admins  
 * - Decisions: Edit/save by workspace admins
 * 
 * This abstraction ensures cache consistency when AI-generated content is mutated.
 */

import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase.config';

/**
 * Invalidate (clear) the action items cache for a conversation
 * 
 * Call this after manually updating an action item (e.g., assignment, status change).
 * Next time the user opens action items, the Cloud Function will fetch fresh data
 * from Firestore and rebuild the cache.
 * 
 * @param conversationId - The conversation ID
 * @returns Promise<void>
 * 
 * @example
 * // After assigning an action item:
 * await updateDoc(itemRef, { assigneeUid: 'user123' });
 * await invalidateActionItemsCache(conversationId);
 */
export async function invalidateActionItemsCache(conversationId: string): Promise<void> {
  try {
    const cacheRef = doc(db, `conversations/${conversationId}/ai_cache`, 'action_items');
    await deleteDoc(cacheRef);
    console.log('[aiCacheService] Invalidated action items cache for conversation:', conversationId);
  } catch (error: any) {
    // Cache might not exist yet (first time extraction) - that's okay
    if (error.code === 'not-found') {
      console.log('[aiCacheService] No cache to invalidate (expected on first extraction)');
      return;
    }
    console.error('[aiCacheService] Failed to invalidate action items cache:', error);
    throw error;
  }
}

/**
 * FUTURE (Phase 4): Invalidate summaries cache
 * 
 * This will be used when workspace admins edit and save AI-generated summaries.
 * 
 * @param conversationId - The conversation ID
 */
export async function invalidateSummariesCache(conversationId: string): Promise<void> {
  try {
    const cacheRef = doc(db, `conversations/${conversationId}/ai_cache`, 'summaries');
    await deleteDoc(cacheRef);
    console.log('[aiCacheService] Invalidated summaries cache');
  } catch (error: any) {
    if (error.code === 'not-found') return; // Cache doesn't exist - okay
    console.error('[aiCacheService] Failed to invalidate summaries cache:', error);
    throw error;
  }
}

/**
 * FUTURE (Phase 4): Invalidate decisions cache
 * 
 * This will be used when workspace admins edit and save AI-generated decisions.
 * 
 * @param conversationId - The conversation ID
 */
export async function invalidateDecisionsCache(conversationId: string): Promise<void> {
  try {
    const cacheRef = doc(db, `conversations/${conversationId}/ai_cache`, 'decisions');
    await deleteDoc(cacheRef);
    console.log('[aiCacheService] Invalidated decisions cache');
  } catch (error: any) {
    if (error.code === 'not-found') return; // Cache doesn't exist - okay
    console.error('[aiCacheService] Failed to invalidate decisions cache:', error);
    throw error;
  }
}

/**
 * Invalidate all AI caches for a conversation
 * 
 * Useful when making bulk changes or for debugging.
 * 
 * @param conversationId - The conversation ID
 */
export async function invalidateAllCaches(conversationId: string): Promise<void> {
  await Promise.all([
    invalidateActionItemsCache(conversationId).catch(() => {}), // Ignore errors
    invalidateSummariesCache(conversationId).catch(() => {}),
    invalidateDecisionsCache(conversationId).catch(() => {}),
  ]);
  console.log('[aiCacheService] Invalidated all AI caches for conversation:', conversationId);
}
