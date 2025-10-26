import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase.config';

/**
 * Add a member to a group chat by email address
 * Phase A: Instant add (no invitation required)
 */
export async function addMemberToGroupChat(
  conversationId: string,
  memberEmail: string
): Promise<{ success: boolean; displayName: string; uid: string }> {
  const addMember = httpsCallable(functions, 'addMemberToGroupChat');
  
  const result = await addMember({
    conversationId,
    memberEmail: memberEmail.toLowerCase().trim()
  });

  return result.data as { success: boolean; displayName: string; uid: string };
}

