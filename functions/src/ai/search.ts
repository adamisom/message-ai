import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {generateEmbedding} from '../utils/openai';
import {queryVectors} from '../utils/pinecone';
import {verifyConversationAccess, filterSearchResults} from '../utils/security';
import {checkAIRateLimit} from '../utils/rateLimit';

const db = admin.firestore();

interface SearchRequest {
  query: string;
  userId: string;
  conversationId?: string;
  limit: number;
}

interface SearchResult {
  id: string;
  conversationId: string;
  text: string;
  senderName: string;
  senderId: string;
  createdAt: any;
  score?: number;
}

export const semanticSearch = functions.https.onCall(
  async (data: SearchRequest, context) => {
    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    // 2. Rate limit check
    const allowed = await checkAIRateLimit(context.auth.uid, 'search');
    if (!allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Search usage limit exceeded'
      );
    }

    // 3. If conversationId provided, verify access
    if (data.conversationId) {
      await verifyConversationAccess(context.auth.uid, data.conversationId);
    }

    // 4. Generate query embedding
    const queryEmbedding = await generateEmbedding(data.query);

    // 5. Query Pinecone (get 2x results for security filtering)
    const pineconeResults = await queryVectors(
      queryEmbedding,
      data.conversationId || '',
      data.limit * 2
    );

    // 6. Security filter: only messages where user is participant
    const secureResults = filterSearchResults(
      pineconeResults.matches,
      context.auth.uid
    ).slice(0, data.limit);

    // 7. Fetch full message documents from Firestore
    const messages = await fetchMessagesByIds(secureResults);

    // 8. Return results with metadata
    return {
      results: messages,
      count: messages.length,
      source: 'vector',
    };
  }
);

async function fetchMessagesByIds(
  pineconeMatches: any[]
): Promise<SearchResult[]> {
  const messages: SearchResult[] = [];

  for (const match of pineconeMatches) {
    // Pinecone ID format: conversationId_messageId
    const [conversationId, messageId] = match.id.split('_');

    try {
      const messageDoc = await db
        .doc(`conversations/${conversationId}/messages/${messageId}`)
        .get();

      if (messageDoc.exists) {
        const messageData = messageDoc.data()!;
        messages.push({
          id: messageDoc.id,
          conversationId,
          text: messageData.text,
          senderName: messageData.senderName,
          senderId: messageData.senderId,
          createdAt: messageData.createdAt,
          score: match.score,
        });
      }
    } catch (error) {
      console.error(`Failed to fetch message ${match.id}:`, error);
    }
  }

  return messages;
}

