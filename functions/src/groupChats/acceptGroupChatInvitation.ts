import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Accept group chat invitation
 * Adds user to group chat participants
 */
export const acceptGroupChatInvitation = functions.https.onCall(
  async (data, context) => {
    // 1. Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const { invitationId } = data;

    if (!invitationId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'invitationId is required'
      );
    }

    // 2. Get invitation
    const invitationRef = db
      .collection('group_chat_invitations')
      .doc(invitationId);
    const invitationDoc = await invitationRef.get();

    if (!invitationDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Invitation not found');
    }

    const invitation = invitationDoc.data()!;

    // 3. Verify invitee
    if (invitation.invitedUserUid !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'This invitation is not for you'
      );
    }

    // 4. Check invitation status
    if (invitation.status !== 'pending') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Invitation already responded to'
      );
    }

    // 5. Get conversation
    const conversationRef = db
      .collection('conversations')
      .doc(invitation.conversationId);
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Group chat not found'
      );
    }

    const conversation = conversationDoc.data()!;

    // 6. Check if already a member
    if (conversation.participants.includes(context.auth.uid)) {
      // Already a member, just mark invitation as accepted
      await invitationRef.update({
        status: 'accepted',
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: true, alreadyMember: true };
    }

    // 7. Check member limit
    if (conversation.participants.length >= 25) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Group chat is full (25 members max)'
      );
    }

    // 8. Get user info
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const user = userDoc.data()!;
    const currentUserUid = context.auth.uid;

    // 9. Add user to conversation in transaction
    await db.runTransaction(async (transaction) => {
      transaction.update(conversationRef, {
        participants: admin.firestore.FieldValue.arrayUnion(currentUserUid),
        [`participantDetails.${currentUserUid}`]: {
          displayName: user.displayName,
          email: user.email,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(invitationRef, {
        status: 'accepted',
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send system message
      const messageRef = db
        .collection(`conversations/${invitation.conversationId}/messages`)
        .doc();
      transaction.set(messageRef, {
        text: `${user.displayName} joined the group`,
        senderId: 'system',
        senderName: 'System',
        participants: [...conversation.participants, currentUserUid],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isSystemMessage: true,
        embedded: false,
      });
    });

    return { success: true };
  }
);

