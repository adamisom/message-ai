import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Decline group chat invitation
 * Marks invitation as declined (no membership changes)
 */
export const declineGroupChatInvitation = functions.https.onCall(
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

    // 5. Mark as declined
    await invitationRef.update({
      status: 'declined',
      respondedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);

