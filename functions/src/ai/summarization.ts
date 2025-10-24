import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { callClaude } from '../utils/anthropic';
import { getCachedResult } from '../utils/caching';
import { getConversationOrThrow, getMessagesForAI } from '../utils/conversationHelpers';
import { checkAIRateLimit } from '../utils/rateLimit';
import { verifyConversationAccess } from '../utils/security';
import { parseAIResponse, SummarySchema } from '../utils/validation';

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
You are summarizing a ${conversationData.type} conversation with ${conversationData.participants?.length || 0} participants.

Participants: ${participantNames}

Messages (${messages.length} total):
${formattedMessages}

Provide a summary in the following JSON format:
{
  "summary": "3-5 sentence overview of the conversation",
  "keyPoints": ["point 1", "point 2", "point 3"]
}

Focus on: main topics discussed, important decisions, action items, and key information shared.
`;

    // 8. Call Claude
    const rawResponse = await callClaude(prompt, 1500);

    // 9. Validate response
    const validatedSummary = parseAIResponse(rawResponse, SummarySchema);

    // 10. Store in cache
    await db
      .doc(`conversations/${data.conversationId}/ai_cache/summary_latest`)
      .set({
        ...validatedSummary,
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
    return validatedSummary;
  }
);

