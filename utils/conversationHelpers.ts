/**
 * Conversation Helper Functions
 * Pure functions for conversation-related business logic
 * These are extracted to enable unit testing
 */

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  participantDetails: Record<string, { displayName: string; email: string }>;
}

/**
 * Get display name for a conversation
 * - For groups: returns the group name or "Unnamed Group"
 * - For direct chats: returns the other user's display name
 * 
 * @param conversation - The conversation object
 * @param currentUserId - The current user's UID
 * @returns The display name for the conversation
 */
export function getConversationName(conversation: Conversation, currentUserId: string): string {
  if (conversation.type === 'group') {
    return conversation.name || 'Unnamed Group';
  }
  
  // For direct chat, get other user's name
  const otherUserId = conversation.participants.find(
    (id: string) => id !== currentUserId
  );
  
  if (!otherUserId) return 'Unknown';
  
  const otherUser = conversation.participantDetails[otherUserId];
  return otherUser?.displayName || 'Unknown User';
}

/**
 * Generate a consistent conversation ID for direct chats
 * Uses sorted UIDs to ensure the same ID regardless of who initiates
 * 
 * Example: User A → User B and User B → User A both get "userA_userB"
 * 
 * @param uid1 - First user's UID
 * @param uid2 - Second user's UID
 * @returns Conversation ID in format "uid1_uid2" (alphabetically sorted)
 */
export function generateConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

