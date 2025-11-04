import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Mark Message Urgent - Sub-Phase 7
 * Workspace admins can manually mark up to 5 messages as urgent per conversation
 */
export const markMessageUrgent = functions.https.onCall(async (data, context) => {
  // 1. Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be logged in'
    );
  }

  const { conversationId, messageId } = data;

  if (!conversationId || !messageId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'conversationId and messageId are required'
    );
  }

  // 2. Get conversation and validate workspace admin
  const conversationRef = db.collection('conversations').doc(conversationId);
  const conversationSnap = await conversationRef.get();

  if (!conversationSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Conversation not found');
  }

  const conversation = conversationSnap.data()!;

  if (!conversation.isWorkspaceChat || !conversation.workspaceId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Only workspace chats support urgency markers'
    );
  }

  // 3. Verify admin permission
  const workspaceRef = db.collection('workspaces').doc(conversation.workspaceId);
  const workspaceSnap = await workspaceRef.get();

  if (!workspaceSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Workspace not found');
  }

  const workspace = workspaceSnap.data()!;

  if (workspace.adminUid !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only workspace admins can mark messages urgent'
    );
  }

  // 4. Check limit (5 urgent messages per conversation)
  const urgentMessagesSnap = await db
    .collection(`conversations/${conversationId}/messages`)
    .where('manuallyMarkedUrgent', '==', true)
    .get();

  if (urgentMessagesSnap.size >= 5) {
    // Return current urgent messages for replacement UI
    const urgentMessages = urgentMessagesSnap.docs.map(doc => ({
      id: doc.id,
      text: doc.data().text,
      markedAt: doc.data().markedUrgentAt,
    }));

    throw new functions.https.HttpsError(
      'resource-exhausted',
      JSON.stringify({
        message: 'Maximum 5 urgent messages per conversation',
        urgentMessages,
      })
    );
  }

  // 5. Mark message urgent
  const messageRef = db.collection(`conversations/${conversationId}/messages`).doc(messageId);
  const messageSnap = await messageRef.get();

  if (!messageSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Message not found');
  }

  await messageRef.update({
    manuallyMarkedUrgent: true,
    markedUrgentBy: context.auth.uid,
    markedUrgentAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    urgentCount: urgentMessagesSnap.size + 1,
  };
});

/**
 * Unmark Message Urgent - Sub-Phase 7
 * Remove urgent marker from a message
 */
export const unmarkMessageUrgent = functions.https.onCall(async (data, context) => {
  // 1. Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be logged in'
    );
  }

  const { conversationId, messageId } = data;

  if (!conversationId || !messageId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'conversationId and messageId are required'
    );
  }

  // 2. Get conversation and validate workspace admin
  const conversationRef = db.collection('conversations').doc(conversationId);
  const conversationSnap = await conversationRef.get();

  if (!conversationSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Conversation not found');
  }

  const conversation = conversationSnap.data()!;

  if (!conversation.isWorkspaceChat || !conversation.workspaceId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Only workspace chats support urgency markers'
    );
  }

  // 3. Verify admin permission
  const workspaceRef = db.collection('workspaces').doc(conversation.workspaceId);
  const workspaceSnap = await workspaceRef.get();

  if (!workspaceSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Workspace not found');
  }

  const workspace = workspaceSnap.data()!;

  if (workspace.adminUid !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only workspace admins can unmark messages urgent'
    );
  }

  // 4. Remove urgent marker (set to false to override AI detection)
  const messageRef = db.collection(`conversations/${conversationId}/messages`).doc(messageId);
  await messageRef.update({
    manuallyMarkedUrgent: false,
    markedUrgentBy: admin.firestore.FieldValue.delete(),
    markedUrgentAt: admin.firestore.FieldValue.delete(),
  });

  return { success: true };
});

