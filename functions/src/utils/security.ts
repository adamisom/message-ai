import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

export async function verifyConversationAccess(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const conversationDoc = await db
    .doc(`conversations/${conversationId}`)
    .get();

  if (!conversationDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Conversation not found'
    );
  }

  const participants = conversationDoc.data()?.participants || [];
  if (!participants.includes(userId)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You do not have access to this conversation'
    );
  }

  return true;
}

export function filterSearchResults(
  results: any[],
  userId: string
): any[] {
  return results.filter((result) =>
    result.metadata?.participants &&
    result.metadata.participants.includes(userId)
  );
}

