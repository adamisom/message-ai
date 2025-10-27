import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {canAccessAIFeatures} from '../utils/aiAccess';
import {callClaudeWithTool} from '../utils/anthropic';
import {generateSummaryTool} from '../utils/aiTools';
import {getCachedResult} from '../utils/caching';
import {getConversationOrThrow, getMessagesForAI} from '../utils/conversationHelpers';
import {checkAIRateLimit} from '../utils/rateLimit';
import {verifyConversationAccess} from '../utils/security';

const db = admin.firestore();

interface SummarizeRequest {
  conversationId: string;
  messageCount: number; // 25, 50, 100, or -1 for all
}

export const generateSummary = functions
  .runWith({
    secrets: ['ANTHROPIC_API_KEY'],
  })
  .https.onCall(async (data: SummarizeRequest, context) => {
    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    // 2. Verify access
    await verifyConversationAccess(context.auth.uid, data.conversationId);

    // 2.5. Phase 4: Check AI feature access (Pro/Trial/Workspace)
    const aiAccess = await canAccessAIFeatures(context.auth.uid, data.conversationId);
    if (!aiAccess.canAccess) {
      throw new functions.https.HttpsError(
        'permission-denied',
        aiAccess.reason || 'AI features require Pro subscription or active trial'
      );
    }

    // 3. Rate limit check
    const allowed = await checkAIRateLimit(context.auth.uid, 'summary');
    if (!allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Summary usage limit exceeded'
      );
    }

    // 4. Check cache
    const cache = await getCachedResult<any>(
      data.conversationId,
      `conversations/${data.conversationId}/ai_cache/summary_latest`,
      3600000, // 1 hour
      5 // max 5 new messages
    );

    if (cache && cache.messageCount === data.messageCount) {
      console.log('Cache hit for summary');
      return cache;
    }

    // 5. Query messages
    const {data: conversationData, messageCount} = await getConversationOrThrow(
      data.conversationId
    );

    const limit = data.messageCount > 0 ? data.messageCount : undefined;
    const {messages, formatted: formattedMessages} = await getMessagesForAI(
      data.conversationId,
      {limit}
    );

    // Return early if no messages
    if (messages.length === 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No messages found in conversation'
      );
    }

    // Format participant names
    const participantNames = conversationData.participantDetails
      ? Object.values(conversationData.participantDetails)
          .map((p: any) => p?.displayName || 'Unknown')
          .join(', ')
      : 'Unknown';

    // 7. Build prompt
    const prompt = `
Summarize this ${conversationData.type} conversation.

Participants: ${participantNames}

Messages (${messages.length} total):
${formattedMessages}

Focus on: main topics discussed, important decisions, action items, and key information shared.
`;

    // 8. Call Claude with Tool Use
    const summaryData = await callClaudeWithTool<{summary: string; keyPoints: string[]}>(
      prompt,
      generateSummaryTool,
      {maxTokens: 1500}
    );

    // Already have validated structured data - no parsing needed!

    // 10. Store in cache
    await db
      .doc(`conversations/${data.conversationId}/ai_cache/summary_latest`)
      .set({
        ...summaryData,
        messageCount: messages.length,
        messageCountAtGeneration: messageCount,
        startMessageId: messages[0]?.id || null,
        endMessageId: messages[messages.length - 1]?.id || null,
        startTimestamp: (messages[0] as any)?.createdAt || null,
        endTimestamp: (messages[messages.length - 1] as any)?.createdAt || null,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        generatedBy: context.auth.uid,
        model: 'claude-sonnet-4',
      });

    // 11. Return summary
    return summaryData;
  }
);

