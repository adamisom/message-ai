import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Pin Message - Sub-Phase 7
 * Workspace admins can pin up to 5 messages per group chat
 */
export const pinMessage = functions.https.onCall(async (data, context) => {
  // 1. Auth & admin check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be logged in'
    );
  }

  const { conversationId, messageId, replaceMessageId } = data;

  if (!conversationId || !messageId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'conversationId and messageId are required'
    );
  }

  const conversationRef = db.collection('conversations').doc(conversationId);
  const conversationSnap = await conversationRef.get();

  if (!conversationSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Conversation not found');
  }

  const conversation = conversationSnap.data()!;

  if (!conversation.isWorkspaceChat || !conversation.workspaceId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Only workspace chats support pinning'
    );
  }

  // 2. Verify admin permission
  const workspaceRef = db.collection('workspaces').doc(conversation.workspaceId);
  const workspaceSnap = await workspaceRef.get();

  if (!workspaceSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Workspace not found');
  }

  const workspace = workspaceSnap.data()!;

  if (workspace.adminUid !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only workspace admins can pin messages'
    );
  }

  // 3. Check limit
  const pinnedMessages = conversation.pinnedMessages || [];

  if (pinnedMessages.length >= 5 && !replaceMessageId) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Maximum 5 pinned messages per conversation'
    );
  }

  // 4. Pin message (or replace)
  let updatedPins = [...pinnedMessages];

  if (replaceMessageId) {
    // Replace existing pin
    updatedPins = updatedPins.filter(p => p.messageId !== replaceMessageId);
  }

  const now = admin.firestore.Timestamp.now();
  updatedPins.push({
    messageId,
    pinnedBy: context.auth.uid,
    pinnedAt: now, // Use Timestamp for array storage
    order: updatedPins.length,
  });

  await conversationRef.update({ pinnedMessages: updatedPins });

  return {
    success: true,
    pinnedCount: updatedPins.length,
  };
});

/**
 * Unpin Message - Sub-Phase 7
 * Remove pinned message
 */
export const unpinMessage = functions.https.onCall(async (data, context) => {
  // 1. Auth & admin check
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

  const conversationRef = db.collection('conversations').doc(conversationId);
  const conversationSnap = await conversationRef.get();

  if (!conversationSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Conversation not found');
  }

  const conversation = conversationSnap.data()!;

  if (!conversation.isWorkspaceChat || !conversation.workspaceId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Only workspace chats support pinning'
    );
  }

  // 2. Verify admin permission
  const workspaceRef = db.collection('workspaces').doc(conversation.workspaceId);
  const workspaceSnap = await workspaceRef.get();

  if (!workspaceSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Workspace not found');
  }

  const workspace = workspaceSnap.data()!;

  if (workspace.adminUid !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only workspace admins can unpin messages'
    );
  }

  // 3. Remove pin and re-index
  const pinnedMessages = conversation.pinnedMessages || [];
  const updatedPins = pinnedMessages
    .filter((p: any) => p.messageId !== messageId)
    .map((p: any, index: number) => ({ ...p, order: index })); // Re-index

  await conversationRef.update({ pinnedMessages: updatedPins });

  return {
    success: true,
    pinnedCount: updatedPins.length,
  };
});

