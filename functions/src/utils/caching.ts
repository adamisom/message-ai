import * as admin from 'firebase-admin';

// Lazy initialization to avoid breaking tests
function getDb() {
  return admin.firestore();
}

export async function getCachedResult<T>(
  conversationId: string,
  cacheDocPath: string,
  maxAge: number,
  maxNewMessages: number
): Promise<T | null> {
  const db = getDb();
  const [cache, conversation] = await Promise.all([
    db.doc(cacheDocPath).get(),
    db.doc(`conversations/${conversationId}`).get(),
  ]);

  if (!cache.exists) {
    return null;
  }

  const cacheData = cache.data()!;
  const currentMessageCount = conversation.data()?.messageCount || 0;
  const messagesSinceCache =
    currentMessageCount - cacheData.messageCountAtGeneration;
  const ageMs = Date.now() - cacheData.generatedAt.toMillis();

  // Cache valid if BOTH conditions met
  if (ageMs < maxAge && messagesSinceCache < maxNewMessages) {
    console.log(`Cache hit: age=${ageMs}ms, newMessages=${messagesSinceCache}`);
    return cacheData as T;
  }

  console.log(`Cache miss: age=${ageMs}ms, newMessages=${messagesSinceCache}`);
  return null;
}

