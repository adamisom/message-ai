import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {callClaudeWithTool} from '../utils/anthropic';
import {extractActionItemsTool} from '../utils/aiTools';
import {getCachedResult} from '../utils/caching';
import {
  formatParticipantsForPrompt,
  getConversationOrThrow,
  getMessagesForAI,
} from '../utils/conversationHelpers';
import {checkAIRateLimit} from '../utils/rateLimit';
import {verifyConversationAccess} from '../utils/security';

// Lazy initialization to avoid breaking tests
function getDb() {
  return admin.firestore();
}

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
Extract action items from this conversation.

Participants:
${participantsList}

Messages:
${formattedMessages}

Assignment rules:
- Use display name if mentioned unambiguously
- Use email if explicitly mentioned
- Leave null if assignee is unclear

Priority rules:
- High: urgent language or near deadline
- Medium: standard tasks with timeframes
- Low: suggestions or optional items
`;

    // 8. Call Claude with Tool Use
    const result = await callClaudeWithTool<{items: any[]}>(
      prompt,
      extractActionItemsTool,
      {maxTokens: 2000}
    );

    // Already have structured data - no parsing needed!
    const actionItemsArray = result.items;

    // 9. Resolve assignees
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
    const db = getDb();
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

