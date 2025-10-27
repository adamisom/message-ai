import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, functions } from '../firebase.config';

/**
 * Send invitation to join a group chat
 * Phase B: Invitation system (user must accept to join)
 */
export async function addMemberToGroupChat(
  conversationId: string,
  memberEmail: string
): Promise<{ success: boolean; displayName: string; uid: string; invitationId: string }> {
  const addMember = httpsCallable(functions, 'addMemberToGroupChat');
  
  const result = await addMember({
    conversationId,
    memberEmail: memberEmail.toLowerCase().trim()
  });

  return result.data as { success: boolean; displayName: string; uid: string; invitationId: string };
}

/**
 * Get pending group chat invitations for a user
 */
export async function getUserGroupChatInvitations(uid: string): Promise<any[]> {
  const invitationsRef = collection(db, 'group_chat_invitations');
  const q = query(
    invitationsRef,
    where('invitedUserUid', '==', uid),
    where('status', '==', 'pending'),
    orderBy('sentAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Accept a group chat invitation
 */
export async function acceptGroupChatInvitation(
  invitationId: string
): Promise<{ success: boolean; alreadyMember?: boolean }> {
  const accept = httpsCallable(functions, 'acceptGroupChatInvitation');
  const result = await accept({ invitationId });
  return result.data as { success: boolean; alreadyMember?: boolean };
}

/**
 * Decline a group chat invitation
 */
export async function declineGroupChatInvitation(
  invitationId: string
): Promise<{ success: boolean }> {
  const decline = httpsCallable(functions, 'declineGroupChatInvitation');
  const result = await decline({ invitationId });
  return result.data as { success: boolean };
}

/**
 * Report a group chat invitation as spam
 */
export async function reportGroupChatInvitationSpam(
  invitationId: string
): Promise<{ success: boolean }> {
  const report = httpsCallable(functions, 'reportGroupChatInvitationSpam');
  const result = await report({ invitationId });
  return result.data as { success: boolean };
}

