/**
 * Action Item Assignment Cloud Function
 * Phase 4: Admin Features - Assign action items to workspace members
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Assign an action item to a workspace member
 * Requirements: Caller must be workspace admin, assignee must be workspace member
 */
export const assignActionItem = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { conversationId, itemId, assigneeUid, assigneeDisplayName } = data;

  // 2. Validate input
  if (!conversationId || !itemId || !assigneeUid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields: conversationId, itemId, assigneeUid'
    );
  }

  try {
    // 3. Get conversation to check workspace
    const conversationRef = db.collection('conversations').doc(conversationId);
    const conversationSnap = await conversationRef.get();

    if (!conversationSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Conversation not found');
    }

    const conversation = conversationSnap.data()!;
    const workspaceId = conversation.workspaceId;

    // 4. Verify this is a workspace chat
    if (!workspaceId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Action item assignment is only available in workspace chats'
      );
    }

    // 5. Get workspace to verify admin
    const workspaceRef = db.collection('workspaces').doc(workspaceId);
    const workspaceSnap = await workspaceRef.get();

    if (!workspaceSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Workspace not found');
    }

    const workspace = workspaceSnap.data()!;

    // 6. Verify caller is workspace admin
    if (workspace.adminUid !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only workspace admins can assign action items'
      );
    }

    // 7. Verify assignee is workspace member
    if (!workspace.members || !workspace.members.includes(assigneeUid)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Assignee must be a workspace member'
      );
    }

    // 8. Get action items from cache
    const cacheRef = db
      .collection('conversations')
      .doc(conversationId)
      .collection('ai_cache')
      .doc('action_items');

    const cacheSnap = await cacheRef.get();

    if (!cacheSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'No action items found for this conversation'
      );
    }

    const cacheData = cacheSnap.data()!;
    const items = cacheData.items || [];

    // 9. Find and update the specific item
    const itemIndex = items.findIndex((item: any) => item.id === itemId);

    if (itemIndex === -1) {
      throw new functions.https.HttpsError('not-found', 'Action item not found');
    }

    // Update the item with assignment
    const now = admin.firestore.Timestamp.now();
    items[itemIndex] = {
      ...items[itemIndex],
      assigneeUid,
      assigneeDisplayName: assigneeDisplayName || 'Unknown',
      assignedAt: now, // Use Timestamp for array storage
      assignedBy: context.auth.uid,
    };

    // 10. Save updated items back to cache
    await cacheRef.update({
      items,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Top-level field can use serverTimestamp
    });

    // 11. Send notification to assignee (optional for MVP)
    // TODO: Implement push notification to assignee

    console.log(
      `✅ Action item ${itemId} assigned to ${assigneeDisplayName} in conversation ${conversationId}`
    );

    return {
      success: true,
      message: 'Action item assigned successfully',
    };
  } catch (error: any) {
    console.error('Error assigning action item:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to assign action item');
  }
});

