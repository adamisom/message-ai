import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {callClaude} from '../utils/anthropic';
import {parseAIResponse, SummarySchema} from '../utils/validation';
import {verifyConversationAccess} from '../utils/security';
import {checkAIRateLimit} from '../utils/rateLimit';
import {getCachedResult} from '../utils/caching';

const db = admin.firestore();

interface SummarizeRequest {
  conversationId: string;
  messageCount: number; // 25, 50, 100, or -1 for all
}

export const generateSummary = functions.https.onCall(
  async (data: SummarizeRequest, context) => {
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
      `conversations/${data.conversationId}/ai_summaries/latest`,
      3600000, // 1 hour
      5 // max 5 new messages
    );

    if (cache && cache.messageCount === data.messageCount) {
      console.log('Cache hit for summary');
      return cache;
    }

    // 5. Query messages
    const conversation = await db
      .doc(`conversations/${data.conversationId}`)
      .get();
    const conversationData = conversation.data()!;

    let messagesQuery = db
      .collection(`conversations/${data.conversationId}/messages`)
      .orderBy('createdAt', 'desc');

    if (data.messageCount > 0) {
      messagesQuery = messagesQuery.limit(data.messageCount);
    }

    const messagesSnapshot = await messagesQuery.get();
    const messages = messagesSnapshot.docs.reverse().map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 6. Format messages for Claude
    const formattedMessages = messages
      .map((m: any) => `[${m.senderName}]: ${m.text}`)
      .join('\n');

    // 7. Build prompt
    const prompt = `
You are summarizing a ${conversationData.type} conversation with ${conversationData.participants.length} participants.

Participants: ${Object.values(conversationData.participantDetails)
      .map((p: any) => p.displayName)
      .join(', ')}

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
      .doc(`conversations/${data.conversationId}/ai_summaries/latest`)
      .set({
        ...validatedSummary,
        messageCount: messages.length,
        messageCountAtGeneration: conversationData.messageCount,
        startMessageId: messages[0].id,
        endMessageId: messages[messages.length - 1].id,
        startTimestamp: (messages[0] as any).createdAt,
        endTimestamp: (messages[messages.length - 1] as any).createdAt,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        generatedBy: context.auth.uid,
        model: 'claude-sonnet-4',
      });

    // 11. Return summary
    return validatedSummary;
  }
);

