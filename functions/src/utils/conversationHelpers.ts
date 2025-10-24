import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Fetches a conversation document and validates it exists
 * @throws HttpsError if conversation doesn't exist
 */
export async function getConversationOrThrow(
  conversationId: string
): Promise<{data: FirebaseFirestore.DocumentData; messageCount: number}> {
  const conversation = await db
    .doc(`conversations/${conversationId}`)
    .get();

  if (!conversation.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Conversation not found'
    );
  }

  const data = conversation.data()!;
  return {
    data,
    messageCount: data.messageCount || 0,
  };
}

/**
 * Extracts JSON from AI response, handling markdown code blocks
 * Finds first and last brace/bracket to extract valid JSON
 */
export function extractJsonFromAIResponse<T>(rawResponse: string): T {
  let json = rawResponse.trim();

  // Extract JSON from markdown code blocks or plain text
  const firstBrace = Math.max(json.indexOf('['), json.indexOf('{'));
  const lastBrace = Math.max(json.lastIndexOf(']'), json.lastIndexOf('}'));

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    json = json.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(json);
}

/**
 * Formats participant details for AI prompts
 * Returns formatted string or fallback message
 */
export function formatParticipantsForPrompt(
  participantDetails: any
): string {
  if (!participantDetails || typeof participantDetails !== 'object') {
    return 'No participants found';
  }

  const entries = Object.entries(participantDetails);
  if (entries.length === 0) {
    return 'No participants found';
  }

  return entries
    .map(([uid, details]: [string, any]) => {
      const name = details?.displayName || 'Unknown';
      const email = details?.email || '';
      return email ? `- ${name} (${email})` : `- ${name}`;
    })
    .join('\n');
}

export interface MessageQueryOptions {
  limit?: number;
  messageRange?: {start: any; end: any};
}

export interface FormattedMessages {
  messages: Array<{id: string; [key: string]: any}>;
  formatted: string;
}

/**
 * Fetches and formats messages for AI analysis
 * Handles empty results and applies query options
 */
export async function getMessagesForAI(
  conversationId: string,
  options: MessageQueryOptions = {}
): Promise<FormattedMessages> {
  let messagesQuery = db
    .collection(`conversations/${conversationId}/messages`)
    .orderBy('createdAt', 'desc');

  // Apply messageRange OR limit, not both
  if (options.messageRange) {
    messagesQuery = messagesQuery
      .where('createdAt', '>=', options.messageRange.start)
      .where('createdAt', '<=', options.messageRange.end);
  } else if (options.limit && options.limit > 0) {
    messagesQuery = messagesQuery.limit(options.limit);
  }

  const messagesSnapshot = await messagesQuery.get();
  const messages = messagesSnapshot.docs.reverse().map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const formatted = messages
    .map((m: any) => `[${m.senderName}]: ${m.text}`)
    .join('\n');

  return {messages, formatted};
}

