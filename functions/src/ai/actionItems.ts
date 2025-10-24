import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {callClaude} from '../utils/anthropic';
import {verifyConversationAccess} from '../utils/security';
import {checkAIRateLimit} from '../utils/rateLimit';
import {getCachedResult} from '../utils/caching';

const db = admin.firestore();

interface ActionItemRequest {
  conversationId: string;
  messageRange?: {start: any; end: any};
}

export const extractActionItems = functions.https.onCall(
  async (data: ActionItemRequest, context) => {
    // 1-3. Auth, access, rate limit
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    await verifyConversationAccess(context.auth.uid, data.conversationId);

    const allowed = await checkAIRateLimit(context.auth.uid, 'actionItem');
    if (!allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Action item usage limit exceeded'
      );
    }

    // 4. Check cache
    const cache = await getCachedResult<any>(
      data.conversationId,
      `conversations/${data.conversationId}/ai_action_items_cache`,
      86400000, // 24 hours
      10 // max 10 new messages
    );

    if (cache) {
      console.log('Cache hit for action items');
      return {items: cache.items};
    }

    // 5. Get conversation and messages
    const conversation = await db
      .doc(`conversations/${data.conversationId}`)
      .get();
    const conversationData = conversation.data()!;

    let messagesQuery = db
      .collection(`conversations/${data.conversationId}/messages`)
      .orderBy('createdAt', 'desc')
      .limit(100);

    if (data.messageRange) {
      messagesQuery = messagesQuery
        .where('createdAt', '>=', data.messageRange.start)
        .where('createdAt', '<=', data.messageRange.end);
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

    // Format participants for Claude
    const participantsList = Object.entries(
      conversationData.participantDetails
    )
      .map(
        ([uid, details]: [string, any]) =>
          `- ${details.displayName} (${details.email})`
      )
      .join('\n');

    // 7. Build prompt
    const prompt = `
Extract action items from this conversation. An action item is a task, commitment, or to-do mentioned by any participant.

Participants:
${participantsList}

Messages:
${formattedMessages}

Return JSON array:
[
  {
    "text": "Description of the action item",
    "assigneeIdentifier": "Display name OR email if specified",
    "dueDate": "ISO timestamp (if mentioned, otherwise null)",
    "priority": "high|medium|low",
    "sourceMessageId": "ID of message containing this item"
  }
]

Assignment rules:
- Use display name if mentioned unambiguously (e.g., "John should review")
- Use email if explicitly mentioned (e.g., "john@company.com should review")
- Leave null if assignee is unclear or not mentioned

Priority rules:
- High priority: uses urgent language, has near deadline
- Medium priority: standard tasks with timeframes
- Low priority: suggestions or optional items
`;

    // 8. Call Claude
    const rawResponse = await callClaude(prompt, 2000);

    // 9. Validate response (expecting array)
    let actionItemsArray;
    try {
      let json = rawResponse.trim();
      if (json.startsWith('```')) {
        json = json.replace(/^```json?\n/, '').replace(/\n```$/, '');
      }
      actionItemsArray = JSON.parse(json);

      if (!Array.isArray(actionItemsArray)) {
        throw new Error('Response is not an array');
      }
    } catch (error) {
      throw new functions.https.HttpsError(
        'internal',
        `Failed to parse action items: ${(error as Error).message}`
      );
    }

    // 10. Resolve assignees
    const resolvedItems = await Promise.all(
      actionItemsArray.map(async (item) => {
        const assignee = await resolveAssignee(
          item.assigneeIdentifier,
          conversationData.participantDetails
        );

        return {
          text: item.text,
          assigneeUid: assignee?.uid || null,
          assigneeDisplayName: assignee?.displayName || null,
          assigneeEmail: assignee?.email || null,
          dueDate: item.dueDate || null,
          sourceMessageId: item.sourceMessageId,
          priority: item.priority,
          status: 'pending',
          sourceType: 'ai',
          extractedAt: admin.firestore.FieldValue.serverTimestamp(),
          extractedBy: context.auth?.uid || '',
        };
      })
    );

    // 11. Store in Firestore
    const batch = db.batch();
    resolvedItems.forEach((item) => {
      const itemRef = db
        .collection(`conversations/${data.conversationId}/ai_action_items`)
        .doc();
      batch.set(itemRef, item);
    });
    await batch.commit();

    // 12. Store in cache
    await db
      .doc(`conversations/${data.conversationId}/ai_action_items_cache`)
      .set({
        items: resolvedItems,
        messageCountAtGeneration: conversationData.messageCount,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {items: resolvedItems};
  }
);

async function resolveAssignee(
  identifier: string | null,
  participantDetails: any
): Promise<{uid: string; displayName: string; email: string} | null> {
  if (!identifier) return null;

  const isEmail = identifier.includes('@');

  if (isEmail) {
    // Find by email
    for (const [uid, details] of Object.entries(participantDetails)) {
      if ((details as any).email.toLowerCase() === identifier.toLowerCase()) {
        return {
          uid,
          displayName: (details as any).displayName,
          email: (details as any).email,
        };
      }
    }
  } else {
    // Find by display name
    const matches = [];
    for (const [uid, details] of Object.entries(participantDetails)) {
      if (
        (details as any).displayName.toLowerCase() === identifier.toLowerCase()
      ) {
        matches.push({
          uid,
          displayName: (details as any).displayName,
          email: (details as any).email,
        });
      }
    }

    if (matches.length === 1) {
      return matches[0];
    } else if (matches.length > 1) {
      console.warn(
        `Ambiguous assignee "${identifier}" - ${matches.length} matches`
      );
      return null;
    }
  }

  console.warn(`Assignee "${identifier}" not found in participants`);
  return null;
}

