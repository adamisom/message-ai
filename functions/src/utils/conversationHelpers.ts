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
  console.error('[extractJsonFromAIResponse] Raw response length:', rawResponse.length);
  
  let json = rawResponse.trim();

  // Remove markdown code blocks completely - strip everything before first { or [
  // and everything after last } or ]
  const firstBrace = Math.max(json.indexOf('['), json.indexOf('{'));
  const lastBrace = Math.max(json.lastIndexOf(']'), json.lastIndexOf('}'));

  console.error('[extractJsonFromAIResponse] First brace at:', firstBrace);
  console.error('[extractJsonFromAIResponse] Last brace at:', lastBrace);

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No valid JSON structure found in response');
  }

  json = json.substring(firstBrace, lastBrace + 1);

  // Trim whitespace and any trailing characters after extraction
  json = json.trim();

  console.error('[extractJsonFromAIResponse] Final JSON length:', json.length);
  console.error('[extractJsonFromAIResponse] First 200 chars:', json.substring(0, 200));

  // 🔍 DEBUG: Check for hidden characters in extracted JSON
  let hiddenCharsFound = false;
  for (let i = 0; i < Math.min(json.length, 500); i++) {
    const code = json.charCodeAt(i);
    // Allow printable chars, space, tab, newline, carriage return
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      console.error(`[extractJsonFromAIResponse] ⚠️ Hidden char at position ${i}: code ${code}`);
      hiddenCharsFound = true;
    }
  }
  if (!hiddenCharsFound) {
    console.error('[extractJsonFromAIResponse] No hidden characters detected in first 500 chars');
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
  messages: {id: string; [key: string]: any}[];
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

