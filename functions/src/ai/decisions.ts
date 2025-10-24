import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {callClaude} from '../utils/anthropic';
import {verifyConversationAccess} from '../utils/security';
import {checkAIRateLimit} from '../utils/rateLimit';
import {getCachedResult} from '../utils/caching';

const db = admin.firestore();

export const trackDecisions = functions.https.onCall(
  async (data: {conversationId: string}, context) => {
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
      `conversations/${data.conversationId}/ai_decisions_cache`,
      86400000,
      10
    );

    if (cache) {
      return {decisions: cache.decisions};
    }

    // Get conversation and messages
    const conversation = await db
      .doc(`conversations/${data.conversationId}`)
      .get();
    const conversationData = conversation.data()!;

    const messagesSnapshot = await db
      .collection(`conversations/${data.conversationId}/messages`)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const messages = messagesSnapshot.docs.reverse().map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Format for Claude
    const formattedMessages = messages
      .map((m: any) => `[${m.senderName}]: ${m.text}`)
      .join('\n');

    const participantNames = Object.values(conversationData.participantDetails)
      .map((p: any) => p.displayName)
      .join(', ');

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
      let json = rawResponse.trim();
      if (json.startsWith('```')) {
        json = json.replace(/^```json?\n/, '').replace(/\n```$/, '');
      }
      decisionsArray = JSON.parse(json);

      if (!Array.isArray(decisionsArray)) {
        throw new Error('Response is not an array');
      }

      // Filter by confidence
      decisionsArray = decisionsArray.filter((d) => d.confidence > 0.7);
    } catch (error) {
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

    // Cache
    await db
      .doc(`conversations/${data.conversationId}/ai_decisions_cache`)
      .set({
        decisions: decisionsArray,
        messageCountAtGeneration: conversationData.messageCount,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {decisions: decisionsArray};
  }
);

