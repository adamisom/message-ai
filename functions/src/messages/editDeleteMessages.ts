/**
 * Message Editing and Deletion
 * Sub-Phase 11 (Polish): Pro-only feature
 * 
 * Allows Pro users to edit or delete their own messages
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Edit a message (Pro-only)
 * Only message sender can edit their own messages
 */
export const editMessage = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { conversationId, messageId, newText } = data;
  const userId = context.auth.uid;

  if (!conversationId || !messageId || !newText) {
    throw new functions.https.HttpsError('invalid-argument', 'conversationId, messageId, and newText are required');
  }

  // Validate new text length
  if (newText.trim().length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Message text cannot be empty');
  }

  if (newText.length > 10000) {
    throw new functions.https.HttpsError('invalid-argument', 'Message text cannot exceed 10,000 characters');
  }

  // 2. Check if user is Pro
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;
  const isPro = userData.isPro || userData.isProTrial;

  if (!isPro) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Message editing is a Pro feature. Upgrade to Pro to edit messages.'
    );
  }

  // 3. Get message
  const messageRef = db.collection(`conversations/${conversationId}/messages`).doc(messageId);
  const messageDoc = await messageRef.get();

  if (!messageDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Message not found');
  }

  const message = messageDoc.data()!;

  // 4. Verify user is the sender
  if (message.senderId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'You can only edit your own messages');
  }

  // 5. Check if message is already deleted
  if (message.isDeleted) {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot edit a deleted message');
  }

  // 6. Update message
  await messageRef.update({
    text: newText.trim(),
    isEdited: true,
    editedAt: admin.firestore.FieldValue.serverTimestamp(),
    // Invalidate AI analysis (needs re-embedding and re-priority)
    embedded: false,
    priorityNeedsAnalysis: true,
  });

  console.log(`✏️ [editMessage] User ${userId} edited message ${messageId} in conversation ${conversationId}`);

  return { success: true };
});

/**
 * Delete a message (Pro-only)
 * Only message sender can delete their own messages
 * Soft delete - message is marked as deleted but not removed
 */
export const deleteMessage = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { conversationId, messageId } = data;
  const userId = context.auth.uid;

  if (!conversationId || !messageId) {
    throw new functions.https.HttpsError('invalid-argument', 'conversationId and messageId are required');
  }

  // 2. Check if user is Pro
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;
  const isPro = userData.isPro || userData.isProTrial;

  if (!isPro) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Message deletion is a Pro feature. Upgrade to Pro to delete messages.'
    );
  }

  // 3. Get message
  const messageRef = db.collection(`conversations/${conversationId}/messages`).doc(messageId);
  const messageDoc = await messageRef.get();

  if (!messageDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Message not found');
  }

  const message = messageDoc.data()!;

  // 4. Verify user is the sender
  if (message.senderId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'You can only delete your own messages');
  }

  // 5. Check if already deleted
  if (message.isDeleted) {
    throw new functions.https.HttpsError('failed-precondition', 'Message is already deleted');
  }

  // 6. Soft delete message
  await messageRef.update({
    isDeleted: true,
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedBy: userId,
    text: '[Message deleted]',
    // Invalidate AI features (no longer useful)
    embedded: false,
    priority: undefined,
    priorityQuick: undefined,
  });

  console.log(`🗑️ [deleteMessage] User ${userId} deleted message ${messageId} in conversation ${conversationId}`);

  return { success: true };
});

