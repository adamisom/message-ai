import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { callClaude } from '../utils/anthropic';
import { getCachedResult } from '../utils/caching';
import {
  extractJsonFromAIResponse,
  formatParticipantsForPrompt,
  getConversationOrThrow,
  getMessagesForAI,
} from '../utils/conversationHelpers';
import { checkAIRateLimit } from '../utils/rateLimit';
import { verifyConversationAccess } from '../utils/security';

const db = admin.firestore();

interface ActionItemRequest {
  conversationId: string;
  messageRange?: {start: any; end: any};
}

export const extractActionItems = functions
  .runWith({
    secrets: ['ANTHROPIC_API_KEY'],
  })
  .https.onCall(async (data: ActionItemRequest, context) => {
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
      `conversations/${data.conversationId}/ai_cache/action_items`,
      86400000, // 24 hours
      10 // max 10 new messages
    );

    if (cache) {
      console.log('Cache hit for action items');
      return {items: cache.items};
    }

    // 5. Get conversation and messages
    const {data: conversationData, messageCount} = await getConversationOrThrow(
      data.conversationId
    );

    const {messages, formatted: formattedMessages} = await getMessagesForAI(
      data.conversationId,
      {limit: 100, messageRange: data.messageRange}
    );

    // Return early if no messages
    if (messages.length === 0) {
      return {items: []};
    }

    // 6. Format participants for Claude
    const participantsList = formatParticipantsForPrompt(
      conversationData.participantDetails
    );

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
    console.error('📝 Got Claude response, length:', rawResponse.length);
    console.error('📝 Response starts with:', rawResponse.substring(0, 100));

    // 9. Validate response (expecting array)
    let actionItemsArray;
    try {
      console.error('🔍 About to call extractJsonFromAIResponse');
      actionItemsArray = extractJsonFromAIResponse<any[]>(rawResponse);
      console.error('✅ Successfully extracted JSON array');

      if (!Array.isArray(actionItemsArray)) {
        throw new Error('Response is not an array');
      }
    } catch (error) {
      console.error('❌ Failed to parse action items:', (error as Error).message);
      console.error('❌ Response length:', rawResponse.length);
      console.error('❌ First 500 chars:', rawResponse.substring(0, 500));
      console.error('❌ Last 200 chars:', rawResponse.substring(rawResponse.length - 200));
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

    // 12. Store in cache (convert serverTimestamp to actual timestamp for array storage)
    const now = admin.firestore.Timestamp.now();
    const itemsForCache = resolvedItems.map((item) => ({
      ...item,
      extractedAt: now,
    }));
    await db
      .doc(`conversations/${data.conversationId}/ai_cache/action_items`)
      .set({
        items: itemsForCache,
        messageCountAtGeneration: messageCount,
        generatedAt: now,
      });

    return {items: itemsForCache};
  }
);

export async function resolveAssignee(
  identifier: string | null,
  participantDetails: any
): Promise<{uid: string; displayName: string; email: string} | null> {
  if (!identifier || !participantDetails) return null;

  const isEmail = identifier.includes('@');

  if (isEmail) {
    // Find by email
    for (const [uid, details] of Object.entries(participantDetails)) {
      const detailsObj = details as any;
      if (
        detailsObj.email &&
        detailsObj.email.toLowerCase() === identifier.toLowerCase()
      ) {
        return {
          uid,
          displayName: detailsObj.displayName || '',
          email: detailsObj.email,
        };
      }
    }
  } else {
    // Find by display name
    const matches = [];
    for (const [uid, details] of Object.entries(participantDetails)) {
      const detailsObj = details as any;
      if (
        detailsObj.displayName &&
        detailsObj.displayName.toLowerCase() === identifier.toLowerCase()
      ) {
        matches.push({
          uid,
          displayName: detailsObj.displayName,
          email: detailsObj.email || '',
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

