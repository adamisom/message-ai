import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { batchGenerateEmbeddings } from '../utils/openai';
import { MessageVector, upsertVectors } from '../utils/pinecone';

const db = admin.firestore();

/**
 * Scheduled function to batch embed unindexed messages
 * Runs every 5 minutes
 */
export const batchEmbedMessages = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '512MB',
    secrets: ['OPENAI_API_KEY', 'PINECONE_API_KEY'],
  })
  .pubsub.schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log('Starting batch embedding job...');

    try {
      // Query messages where embedded: false, limit 500
      const unembeddedMessages = await db
        .collectionGroup('messages')
        .where('embedded', '==', false)
        .orderBy('createdAt', 'asc')
        .limit(500)
        .get();

      if (unembeddedMessages.empty) {
        console.log('No messages to embed');
        return null;
      }

      console.log(`Found ${unembeddedMessages.size} messages to embed`);

      // Prepare texts and metadata
      const messageDocs = unembeddedMessages.docs;
      const texts = messageDocs.map((doc) => doc.data().text);

      // Generate embeddings in batch
      console.log('Generating embeddings...');
      const embeddings = await batchGenerateEmbeddings(texts);
      console.log(`Generated ${embeddings.length} embeddings`);

      // Prepare vectors for Pinecone
      const vectors: MessageVector[] = messageDocs.map((doc, idx) => {
        const data = doc.data();
        return {
          id: doc.id,
          values: embeddings[idx],
          metadata: {
            conversationId: data.conversationId || doc.ref.parent.parent!.id,
            text: data.text,
            senderId: data.senderId,
            senderName: data.senderName,
            participants: data.participants || [],
            createdAt: data.createdAt?.toMillis() || Date.now(),
          },
        };
      });

      // Upsert to Pinecone
      console.log('Upserting vectors to Pinecone...');
      await upsertVectors(vectors);
      console.log('Vectors upserted successfully');

      // Update messages: embedded = true
      const batch = db.batch();
      messageDocs.forEach((doc) => {
        batch.update(doc.ref, {
          embedded: true,
          embeddedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      console.log('Updated message documents');

      console.log(`✅ Successfully embedded ${messageDocs.length} messages`);
      return null;
    } catch (error) {
      console.error('Error in batch embedding:', error);

      // If error, add failed messages to retry queue
      // (implementation simplified - could enhance with individual message retry)
      throw error;
    }
  });

/**
 * Add a message to the retry queue
 */
async function queueForRetry(
  messageId: string,
  conversationId: string,
  error: string,
  retryCount: number = 0
): Promise<void> {
  const MAX_RETRIES = 5;
  const BACKOFF_DELAYS = [60000, 300000, 900000, 1800000, 3600000]; // 1m, 5m, 15m, 30m, 60m

  if (retryCount >= MAX_RETRIES) {
    console.error(`Max retries exceeded for message ${messageId}`);
    // Log permanent failure
    await db.doc(`embedding_failures/${messageId}`).set({
      messageId,
      conversationId,
      error,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      retryCount,
    });
    return;
  }

  const nextRetryDelay = BACKOFF_DELAYS[retryCount];
  const nextRetryAfter = Date.now() + nextRetryDelay;

  await db.doc(`embedding_retry_queue/${messageId}`).set({
    messageId,
    conversationId,
    error,
    retryCount,
    nextRetryAfter: admin.firestore.Timestamp.fromMillis(nextRetryAfter),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Queued message ${messageId} for retry (attempt ${retryCount + 1}/${MAX_RETRIES})`);
}

/**
 * Retry failed embeddings from the retry queue
 * Runs every 10 minutes
 */
export const retryFailedEmbeddings = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB',
    secrets: ['OPENAI_API_KEY', 'PINECONE_API_KEY'],
  })
  .pubsub.schedule('every 10 minutes')
  .onRun(async (context) => {
    console.log('Starting retry job...');

    try {
      const now = admin.firestore.Timestamp.now();

      // Query retry queue where nextRetryAfter <= now
      const retrySnapshot = await db
        .collection('embedding_retry_queue')
        .where('nextRetryAfter', '<=', now)
        .limit(100)
        .get();

      if (retrySnapshot.empty) {
        console.log('No messages to retry');
        return null;
      }

      console.log(`Found ${retrySnapshot.size} messages to retry`);

      for (const retryDoc of retrySnapshot.docs) {
        const retryData = retryDoc.data();
        const {messageId, conversationId, retryCount} = retryData;

        try {
          // Fetch the message
          const messageDoc = await db
            .doc(`conversations/${conversationId}/messages/${messageId}`)
            .get();

          if (!messageDoc.exists) {
            console.warn(`Message ${messageId} not found, removing from queue`);
            await retryDoc.ref.delete();
            continue;
          }

          const messageData = messageDoc.data()!;

          // Generate embedding
          const embeddings = await batchGenerateEmbeddings([messageData.text]);

          // Upsert to Pinecone
          const vector: MessageVector = {
            id: messageId,
            values: embeddings[0],
            metadata: {
              conversationId,
              text: messageData.text,
              senderId: messageData.senderId,
              senderName: messageData.senderName,
              participants: messageData.participants || [],
              createdAt: messageData.createdAt?.toMillis() || Date.now(),
            },
          };
          await upsertVectors([vector]);

          // Update message
          await messageDoc.ref.update({
            embedded: true,
            embeddedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Remove from retry queue
          await retryDoc.ref.delete();

          console.log(`✅ Successfully retried message ${messageId}`);
        } catch (error) {
          console.error(`Failed to retry message ${messageId}:`, error);
          // Queue for next retry
          await queueForRetry(
            messageId,
            conversationId,
            (error as Error).message,
            retryCount + 1
          );
          // Delete current retry doc
          await retryDoc.ref.delete();
        }
      }

      return null;
    } catch (error) {
      console.error('Error in retry job:', error);
      throw error;
    }
  });

/**
 * Monitor retry queue and alert if it grows too large
 * Runs every 30 minutes
 */
export const monitorRetryQueue = functions
  .pubsub.schedule('every 30 minutes')
  .onRun(async (context) => {
    const queueSize = await db.collection('embedding_retry_queue').count().get();
    const count = queueSize.data().count;

    console.log(`Retry queue size: ${count}`);

    if (count > 1000) {
      console.error(`⚠️ ALERT: Retry queue has ${count} items (> 1000)`);
    } else if (count > 100) {
      console.warn(`⚠️ WARNING: Retry queue has ${count} items (> 100)`);
    }

    return null;
  });

/**
 * Firestore trigger to increment message counter on new message
 * This is used for cache invalidation
 */
export const incrementMessageCounter = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const conversationId = context.params.conversationId;

    try {
      await db.doc(`conversations/${conversationId}`).update({
        messageCount: admin.firestore.FieldValue.increment(1),
      });
      console.log(`Incremented message count for conversation ${conversationId}`);
    } catch (error) {
      console.warn(`Failed to increment message count: ${error}`);
      // Don't throw - this is non-critical
    }

    return null;
  });

