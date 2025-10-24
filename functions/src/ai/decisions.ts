import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { callClaude } from '../utils/anthropic';
import { getCachedResult } from '../utils/caching';
import {
    extractJsonFromAIResponse,
    getConversationOrThrow,
    getMessagesForAI,
} from '../utils/conversationHelpers';
import { checkAIRateLimit } from '../utils/rateLimit';
import { verifyConversationAccess } from '../utils/security';

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
Identify decisions made in this group conversation. A decision is when participants agree on a course of action, choice, or resolution.

Conversation participants: ${participantNames}
Messages:
${formattedMessages}

Return JSON array:
[
  {
    "decision": "Clear statement of what was decided",
    "context": "2-3 sentence context explaining why/how",
    "participantIds": ["uid1", "uid2"],
    "sourceMessageIds": ["msgId1", "msgId2"],
    "confidence": 0.0-1.0
  }
]

Only include decisions with confidence > 0.7.
Examples of decisions:
- "We'll launch the feature next Tuesday"
- "John will be the point person for this project"
- "Budget approved at $50k"
- "Meeting rescheduled to 3pm Friday"
`;

    // Call Claude
    const rawResponse = await callClaude(prompt, 2000);

    // Parse and validate
    let decisionsArray;
    try {
      decisionsArray = extractJsonFromAIResponse<any[]>(rawResponse);

      if (!Array.isArray(decisionsArray)) {
        throw new Error('Response is not an array');
      }

      // Filter by confidence
      decisionsArray = decisionsArray.filter((d) => d.confidence > 0.7);
    } catch (error) {
      console.error('Failed to parse Claude response:', rawResponse);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to parse decisions: ${(error as Error).message}`
      );
    }

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

