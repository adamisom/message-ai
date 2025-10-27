import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Save admin-edited version of AI decision
 * 
 * Permissions:
 * - Workspace chats: Workspace admin only
 * - Personal chats: Pro users only
 * 
 * Preserves original AI version for reference
 */
export const saveEditedDecision = functions.https.onCall(async (data, context) => {
  // 1. Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be logged in'
    );
  }

  const { conversationId, decisionId, editedDecision, editedContext } = data;

  if (!conversationId || !decisionId || !editedDecision || !editedContext) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'conversationId, decisionId, editedDecision, and editedContext are required'
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
        'Only workspace admins can edit decisions in workspace chats'
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
        'Pro subscription required to edit decisions'
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

  // 4. Get existing decision from ai_cache
  const cacheRef = db.collection(`conversations/${conversationId}/ai_cache`).doc(`decision_${decisionId}`);
  const cacheSnap = await cacheRef.get();

  if (!cacheSnap.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Decision not found'
    );
  }

  const existingDecision = cacheSnap.data()!;

  // 5. Save edited version, preserving original AI version if this is first edit
  const updateData: any = {
    decision: editedDecision,
    context: editedContext,
    editedByAdmin: true,
    savedByAdmin: context.auth.uid,
    savedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Only set originalAiVersion if it doesn't already exist (first edit)
  if (!existingDecision.originalAiVersion) {
    updateData.originalAiVersion = {
      decision: existingDecision.decision,
      context: existingDecision.context,
      extractedAt: existingDecision.extractedAt,
    };
  }

  await cacheRef.update(updateData);

  return {
    success: true,
    savedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
});

