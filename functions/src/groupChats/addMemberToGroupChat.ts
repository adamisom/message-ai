import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Send invitation to join a group chat
 * Phase B: Invitation system (replaces Phase A instant add)
 * 
 * Validation:
 * - User must be authenticated
 * - User must be a member of the conversation
 * - Email must exist in system
 * - User not already in conversation
 * - Conversation must be group type (not direct)
 * - Conversation must NOT be workspace chat
 * - Must not exceed 25 member limit
 * - No duplicate pending invitations
 */
export const addMemberToGroupChat = functions.https.onCall(
  async (
    data: { conversationId: string; memberEmail: string },
    context
  ) => {
    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const { conversationId, memberEmail } = data;
    const invitedByUid = context.auth.uid;

    // 2. Get conversation
    const conversationRef = db.collection('conversations').doc(conversationId);
    const conversationSnap = await conversationRef.get();

    if (!conversationSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Conversation not found'
      );
    }

    const conversation = conversationSnap.data()!;

    // 3. Validate conversation type
    if (conversation.type !== 'group') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Can only add members to group chats'
      );
    }

    // 4. Check if workspace chat (use different flow)
    if (conversation.workspaceId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Use workspace member management for workspace chats'
      );
    }

    // 5. Verify caller is member
    if (!conversation.participants.includes(invitedByUid)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You must be a member to invite others'
      );
    }

    // 6. Find user by email
    const userSnapshot = await db
      .collection('users')
      .where('email', '==', memberEmail.toLowerCase())
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'No user found with that email address'
      );
    }

    const newMemberDoc = userSnapshot.docs[0];
    const newMemberUid = newMemberDoc.id;
    const newMemberData = newMemberDoc.data();

    // 7. Check if already member
    if (conversation.participants.includes(newMemberUid)) {
      throw new functions.https.HttpsError(
        'already-exists',
        `${newMemberData.displayName} is already in this group`
      );
    }

    // 8. Check 25-member limit
    if (conversation.participants.length >= 25) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Group chat limit: 25 members max. For enterprise teams, inquire at https://x.com/adam__isom'
      );
    }

    // 9. Check for existing pending invitation
    const existingInvitationQuery = await db
      .collection('group_chat_invitations')
      .where('conversationId', '==', conversationId)
      .where('invitedUserUid', '==', newMemberUid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingInvitationQuery.empty) {
      throw new functions.https.HttpsError(
        'already-exists',
        `${newMemberData.displayName} already has a pending invitation`
      );
    }

    // 10. Get inviter's display name
    const inviterDoc = await db.collection('users').doc(invitedByUid).get();
    const inviterData = inviterDoc.data()!;

    // 11. Create invitation
    const invitationRef = db.collection('group_chat_invitations').doc();
    await invitationRef.set({
      conversationId,
      conversationName: conversation.name || 'Group Chat',
      invitedByUid,
      invitedByDisplayName: inviterData.displayName,
      invitedUserUid: newMemberUid,
      invitedUserEmail: newMemberData.email,
      status: 'pending',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 12. Send notification to invited user
    // TODO: Push notification implementation

    return {
      success: true,
      displayName: newMemberData.displayName,
      uid: newMemberUid,
      invitationId: invitationRef.id,
    };
  }
);

