import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {canAccessAIFeatures} from '../utils/aiAccess';
import {callClaudeWithTool} from '../utils/anthropic';
import {trackDecisionsTool} from '../utils/aiTools';
import {getCachedResult} from '../utils/caching';
import {
  getConversationOrThrow,
  getMessagesForAI,
} from '../utils/conversationHelpers';
import {checkAIRateLimit} from '../utils/rateLimit';
import {verifyConversationAccess} from '../utils/security';

const db = admin.firestore();

export const trackDecisions = functions
  .runWith({
    secrets: ['ANTHROPIC_API_KEY'],
  })
  .https.onCall(async (data: {conversationId: string}, context) => {
    // Auth, access, rate limit checks
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    await verifyConversationAccess(context.auth.uid, data.conversationId);

    // Phase 4: Check AI feature access
    const aiAccess = await canAccessAIFeatures(context.auth.uid, data.conversationId);
    if (!aiAccess.canAccess) {
      throw new functions.https.HttpsError(
        'permission-denied',
        aiAccess.reason || 'AI features require Pro subscription or active trial'
      );
    }

    const allowed = await checkAIRateLimit(context.auth.uid, 'decision');
    if (!allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Decision tracking usage limit exceeded'
      );
    }

    // Check cache (24 hours, 10 new messages)
    const cache = await getCachedResult<any>(
      data.conversationId,
      `conversations/${data.conversationId}/ai_cache/decisions`,
      86400000,
      10
    );

    if (cache) {
      return {decisions: cache.decisions};
    }

    // Get conversation and messages
    const {data: conversationData, messageCount} = await getConversationOrThrow(
      data.conversationId
    );

    const {messages, formatted: formattedMessages} = await getMessagesForAI(
      data.conversationId,
      {limit: 100}
    );

    // Return early if no messages
    if (messages.length === 0) {
      return {decisions: []};
    }

    // Format participant names
    const participantNames = conversationData.participantDetails
      ? Object.values(conversationData.participantDetails)
          .map((p: any) => p?.displayName || 'Unknown')
          .join(', ')
      : 'Unknown';

    // Build prompt
    const prompt = `
Identify decisions made in this group conversation.

Conversation participants: ${participantNames}

Messages:
${formattedMessages}
`;

    // Call Claude with Tool Use
    const result = await callClaudeWithTool<{decisions: any[]}>(
      prompt,
      trackDecisionsTool,
      {maxTokens: 2000}
    );

    // Already have structured data - no parsing needed!
    // Anthropic already filters by confidence > 0.7 via schema
    const decisionsArray = result.decisions;

    // Store in Firestore
    const batch = db.batch();
    decisionsArray.forEach((decision) => {
      const decisionRef = db
        .collection(`conversations/${data.conversationId}/ai_decisions`)
        .doc();
      batch.set(decisionRef, {
        decision: decision.decision,
        context: decision.context,
        participants: decision.participantIds || [],
        sourceMessageIds: decision.sourceMessageIds || [],
        confidence: decision.confidence,
        decidedAt: admin.firestore.FieldValue.serverTimestamp(),
        extractedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    // Cache (use actual timestamp instead of serverTimestamp for array storage)
    const now = admin.firestore.Timestamp.now();
    await db
      .doc(`conversations/${data.conversationId}/ai_cache/decisions`)
      .set({
        decisions: decisionsArray,
        messageCountAtGeneration: messageCount,
        generatedAt: now,
      });

    return {decisions: decisionsArray};
  }
);

