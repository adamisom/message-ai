import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase.config';
import { callCloudFunction } from './cloudFunctions';

/**
 * Send invitation to join a group chat
 * Phase B: Invitation system (user must accept to join)
 */
export async function addMemberToGroupChat(
  conversationId: string,
  memberEmail: string
): Promise<{ success: boolean; displayName: string; uid: string; invitationId: string }> {
  const result = await callCloudFunction<{ success: boolean; displayName: string; uid: string; invitationId: string }>(
    'addMemberToGroupChat',
    {
      conversationId,
      memberEmail: memberEmail.toLowerCase().trim()
    }
  );

  return result;
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
  const result = await callCloudFunction<{ success: boolean; alreadyMember?: boolean }>(
    'acceptGroupChatInvitation',
    { invitationId }
  );
  return result;
}

/**
 * Decline a group chat invitation
 */
export async function declineGroupChatInvitation(
  invitationId: string
): Promise<{ success: boolean }> {
  const result = await callCloudFunction<{ success: boolean }>(
    'declineGroupChatInvitation',
    { invitationId }
  );
  return result;
}

/**
 * Report a group chat invitation as spam
 */
export async function reportGroupChatInvitationSpam(
  invitationId: string
): Promise<{ success: boolean }> {
  const result = await callCloudFunction<{ success: boolean }>(
    'reportGroupChatInvitationSpam',
    { invitationId }
  );
  return result;
}

/**
 * Report a direct message as spam
 * Blocks user and hides conversation
 */
export async function reportDirectMessageSpam(
  conversationId: string,
  reportedUserUid: string
): Promise<{ success: boolean }> {
  const result = await callCloudFunction<{ success: boolean }>(
    'reportDirectMessageSpam',
    { conversationId, reportedUserUid }
  );
  return result;
}

