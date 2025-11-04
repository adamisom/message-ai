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

  // 4. Get existing action items from ai_cache
  const cacheRef = db.collection(`conversations/${conversationId}/ai_cache`).doc('action_items');
  const cacheSnap = await cacheRef.get();

  if (!cacheSnap.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'No action items found. Generate action items first.'
    );
  }

  const cacheData = cacheSnap.data()!;
  const items = cacheData.items || [];
  
  // Validate and update each edited action item in the array
  const updatedItems = [...items];
  
  for (const editedItem of editedActionItems) {
    if (!editedItem.id) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Each action item must have an id'
      );
    }
    
    // Find the item in the array
    const itemIndex = updatedItems.findIndex((item: any) => item.id === editedItem.id);
    
    if (itemIndex === -1) {
      throw new functions.https.HttpsError(
        'not-found',
        `Action item ${editedItem.id} not found`
      );
    }
    
    const existingItem = updatedItems[itemIndex];
    
    // Update the item with edited data, preserving original if first edit
    updatedItems[itemIndex] = {
      ...existingItem,
      text: editedItem.text,
      assigneeUid: editedItem.assigneeUid || null,
      assigneeDisplayName: editedItem.assigneeDisplayName || null,
      assigneeEmail: editedItem.assigneeEmail || null,
      dueDate: editedItem.dueDate || null,
      priority: editedItem.priority || 'medium',
      editedByAdmin: true,
      savedByAdmin: context.auth.uid,
      savedAt: admin.firestore.Timestamp.now(), // Use Timestamp for array storage
    };
    
    // Preserve original AI version if first edit
    if (!existingItem.originalAiVersion) {
      updatedItems[itemIndex].originalAiVersion = {
        text: existingItem.text,
        assigneeUid: existingItem.assigneeUid,
        assigneeDisplayName: existingItem.assigneeDisplayName,
        assigneeEmail: existingItem.assigneeEmail,
        dueDate: existingItem.dueDate,
        priority: existingItem.priority,
        extractedAt: existingItem.extractedAt,
      };
    }
  }
  
  // Save back to cache
  await cacheRef.update({
    items: updatedItems,
  });

  return {
    success: true,
    itemsUpdated: editedActionItems.length,
    savedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
});

