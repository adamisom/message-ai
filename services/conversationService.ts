/**
 * Conversation management service
 * Handles soft-delete (hide) conversations from user's chat list
 */

import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.config';

/**
 * Mark a conversation as inactive for the current user (soft delete)
 * The conversation will be hidden from the user's chat list but still exists
 * @param conversationId - ID of the conversation to hide
 * @param userId - UID of the user hiding the conversation
 */
export async function hideConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  const conversationRef = doc(db, 'conversations', conversationId);
  
  // Add user to inactiveParticipants array
  await updateDoc(conversationRef, {
    inactiveParticipants: arrayUnion(userId),
  });
  
  console.log(`✅ [conversationService] User ${userId} marked as inactive in conversation ${conversationId}`);
}

