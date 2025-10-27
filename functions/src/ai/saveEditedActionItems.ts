import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Save admin-edited version of AI action items
 * 
 * Permissions:
 * - Workspace chats: Workspace admin only
 * - Personal chats: Pro users only
 * 
 * Updates action items list with edited versions
 */
export const saveEditedActionItems = functions.https.onCall(async (data, context) => {
  // 1. Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be logged in'
    );
  }

  const { conversationId, editedActionItems } = data;

  if (!conversationId || !editedActionItems || !Array.isArray(editedActionItems)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'conversationId and editedActionItems array are required'
    );
  }

  // 2. Get conversation
  const conversationRef = db.collection('conversations').doc(conversationId);
  const conversationSnap = await conversationRef.get();

  if (!conversationSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Conversation not found');
  }

  const conversation = conversationSnap.data()!;

  // 3. Check permissions
  if (conversation.isWorkspaceChat && conversation.workspaceId) {
    // Workspace chat: verify admin permission
    const workspaceRef = db.collection('workspaces').doc(conversation.workspaceId);
    const workspaceSnap = await workspaceRef.get();

    if (!workspaceSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Workspace not found');
    }

    const workspace = workspaceSnap.data()!;

    if (workspace.adminUid !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only workspace admins can edit action items in workspace chats'
      );
    }
  } else {
    // Personal chat: verify Pro user
    const userRef = db.collection('users').doc(context.auth.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const user = userSnap.data()!;

    if (!user.isPaidUser && !user.trialEndsAt) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Pro subscription required to edit action items'
      );
    }

    // Check if trial expired
    if (user.trialEndsAt && user.trialEndsAt.toMillis() < Date.now()) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Pro subscription required (trial expired)'
      );
    }
  }

  // 4. Update each action item in the ai_cache collection
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const item of editedActionItems) {
    if (!item.id) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Each action item must have an id'
      );
    }

    const actionItemRef = db
      .collection(`conversations/${conversationId}/ai_cache`)
      .doc(`action_item_${item.id}`);

    // Get existing item to check if it exists
    const existingItem = await actionItemRef.get();

    if (!existingItem.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Action item ${item.id} not found`
      );
    }

    // Update with edited data
    batch.update(actionItemRef, {
      text: item.text,
      assigneeUid: item.assigneeUid || null,
      assigneeDisplayName: item.assigneeDisplayName || null,
      assigneeEmail: item.assigneeEmail || null,
      dueDate: item.dueDate || null,
      priority: item.priority || 'medium',
      editedByAdmin: true,
      savedByAdmin: context.auth.uid,
      savedAt: now,
    });
  }

  await batch.commit();

  return {
    success: true,
    itemsUpdated: editedActionItems.length,
    savedAt: now,
  };
});

