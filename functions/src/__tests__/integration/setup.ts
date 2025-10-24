/**
 * Firebase Emulator Setup for Integration Tests
 * 
 * This file initializes the Firebase Admin SDK to connect to the local
 * Firebase emulator suite for integration testing.
 */

import * as admin from 'firebase-admin';

// Check if already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'demo-message-ai',
  });
}

// Configure to use emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

export const db = admin.firestore();
export const auth = admin.auth();

/**
 * Clear all Firestore data between tests
 */
export async function clearFirestore() {
  const collections = await db.listCollections();
  const deletePromises = collections.map(async (collection) => {
    const docs = await collection.listDocuments();
    return Promise.all(docs.map((doc) => doc.delete()));
  });
  await Promise.all(deletePromises);
}

/**
 * Create a test user
 */
export async function createTestUser(uid: string, email: string, displayName: string) {
  try {
    await auth.createUser({
      uid,
      email,
      displayName,
    });
  } catch (error: any) {
    // Ignore if user already exists
    if (error.code !== 'auth/uid-already-exists') {
      throw error;
    }
  }
}

/**
 * Create a test conversation
 */
export async function createTestConversation(
  conversationId: string,
  participants: string[],
  messageCount: number = 0
) {
  await db.doc(`conversations/${conversationId}`).set({
    participants,
    type: participants.length > 2 ? 'group' : 'direct',
    messageCount,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Create a test message
 */
export async function createTestMessage(
  conversationId: string,
  messageId: string,
  senderId: string,
  text: string,
  options: {
    embedded?: boolean;
    priority?: 'high' | 'medium' | 'low';
    createdAt?: admin.firestore.Timestamp;
  } = {}
) {
  await db.doc(`conversations/${conversationId}/messages/${messageId}`).set({
    senderId,
    senderName: `User ${senderId}`,
    text,
    embedded: options.embedded || false,
    priority: options.priority || 'low',
    createdAt: options.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    status: 'sent',
  });
}

