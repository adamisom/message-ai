/**
 * Direct Message Invitation Service
 * Sub-Phase 11 (Polish): DM Privacy System
 */

import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, functions } from '../firebase.config';
import type { DirectMessageInvitation } from '../types/workspace';

/**
 * Create a direct message invitation
 * Called when trying to message a user with dmPrivacySetting: 'private'
 */
export async function createDirectMessageInvitation(recipientId: string): Promise<{
  invitationId: string;
  recipientName: string;
}> {
  try {
    const createInvitationFn = httpsCallable(functions, 'createDirectMessageInvitation');
    const result = await createInvitationFn({ recipientId });
    return result.data as { invitationId: string; recipientName: string };
  } catch (error: any) {
    console.error('[createDirectMessageInvitation] Error:', error);
    throw new Error(error.message || 'Failed to create invitation');
  }
}

/**
 * Accept a direct message invitation
 * Creates the conversation
 */
export async function acceptDirectMessageInvitation(invitationId: string): Promise<{
  conversationId: string;
}> {
  try {
    const acceptFn = httpsCallable(functions, 'acceptDirectMessageInvitation');
    const result = await acceptFn({ invitationId });
    return result.data as { conversationId: string };
  } catch (error: any) {
    console.error('[acceptDirectMessageInvitation] Error:', error);
    throw new Error(error.message || 'Failed to accept invitation');
  }
}

/**
 * Decline a direct message invitation
 */
export async function declineDirectMessageInvitation(invitationId: string): Promise<void> {
  try {
    const declineFn = httpsCallable(functions, 'declineDirectMessageInvitation');
    await declineFn({ invitationId });
  } catch (error: any) {
    console.error('[declineDirectMessageInvitation] Error:', error);
    throw new Error(error.message || 'Failed to decline invitation');
  }
}

/**
 * Report a direct message invitation as spam
 */
export async function reportDirectMessageInvitationSpam(invitationId: string): Promise<void> {
  try {
    const reportFn = httpsCallable(functions, 'reportDirectMessageInvitationSpam');
    await reportFn({ invitationId });
  } catch (error: any) {
    console.error('[reportDirectMessageInvitationSpam] Error:', error);
    throw new Error(error.message || 'Failed to report spam');
  }
}

/**
 * Get user's DM invitations (pending only)
 */
export async function getUserDirectMessageInvitations(userId: string): Promise<DirectMessageInvitation[]> {
  try {
    const q = query(
      collection(db, 'dm_invitations'),
      where('inviteeId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    const invitations: DirectMessageInvitation[] = [];
    
    snapshot.forEach((doc) => {
      invitations.push({
        id: doc.id,
        ...doc.data(),
      } as DirectMessageInvitation);
    });
    
    return invitations;
  } catch (error: any) {
    console.error('[getUserDirectMessageInvitations] Error:', error);
    return [];
  }
}

/**
 * Check if a DM invitation is needed for a specific user
 * Returns true if user has dmPrivacySetting: 'private'
 */
export async function checkDmInvitationNeeded(recipientId: string): Promise<boolean> {
  try {
    const userDoc = await getDocs(
      query(collection(db, 'users'), where('__name__', '==', recipientId))
    );
    
    if (userDoc.empty) return false;
    
    const userData = userDoc.docs[0].data();
    return userData.dmPrivacySetting === 'private';
  } catch (error) {
    console.error('[checkDmInvitationNeeded] Error:', error);
    return false;
  }
}

