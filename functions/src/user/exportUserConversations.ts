/**
 * Export User Conversations
 * Sub-Phase 11 (Polish): Export non-workspace conversations
 * 
 * Exports all direct messages and group chats (excludes workspace conversations)
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

interface ExportedMessage {
  sender: string;
  senderEmail: string;
  text: string;
  timestamp: string;
  priority?: string;
}

interface ExportedConversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  createdAt: string;
  messageCount: number;
  messages: ExportedMessage[];
}

interface UserConversationsExport {
  userId: string;
  userEmail: string;
  exportedAt: string;
  conversations: ExportedConversation[];
  metadata: {
    totalConversations: number;
    totalMessages: number;
    messageLimit: number;
    timeoutWarning?: string;
  };
}

/**
 * Convert Firestore Timestamp to ISO string
 */
function timestampToISO(timestamp: any): string {
  if (!timestamp) return '';
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  return new Date(timestamp).toISOString();
}

/**
 * Export user's non-workspace conversations to JSON
 * Excludes workspace conversations (those are exported by workspace admin)
 */
export const exportUserConversations = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .https.onCall(async (data, context) => {
    const startTime = Date.now();
    const TIMEOUT_BUFFER = 50000; // 50 seconds before hard timeout
    
    // 1. Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const userId = context.auth.uid;

    // 2. Get user info
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data()!;
    const userEmail = userData.email;

    console.log(`📦 [exportUserConversations] Starting export for user: ${userEmail}`);

    // 3. Get all conversations where user is a participant (exclude workspace chats)
    const conversationsSnapshot = await db
      .collection('conversations')
      .where('participants', 'array-contains', userId)
      .get();

    console.log(`📦 [exportUserConversations] Found ${conversationsSnapshot.size} total conversations`);

    const conversations: ExportedConversation[] = [];
    let totalMessages = 0;
    let timeoutWarning: string | undefined;

    // 4. Export each non-workspace conversation
    for (const convDoc of conversationsSnapshot.docs) {
      // Check timeout
      if (Date.now() - startTime > TIMEOUT_BUFFER) {
        console.warn(`⏱️ [exportUserConversations] Approaching timeout, stopping export`);
        timeoutWarning = 'Export incomplete due to timeout. Some conversations may be missing.';
        break;
      }

      const conv = convDoc.data();
      const convId = convDoc.id;

      // Skip workspace conversations (only export personal chats)
      if (conv.isWorkspaceChat || conv.workspaceId) {
        console.log(`⏭️ [exportUserConversations] Skipping workspace chat: ${convId}`);
        continue;
      }

      // Get messages (limit 1000 per conversation)
      const messagesSnapshot = await db
        .collection(`conversations/${convId}/messages`)
        .orderBy('createdAt', 'desc')
        .limit(1000)
        .get();

      const messages: ExportedMessage[] = [];
      for (const msgDoc of messagesSnapshot.docs) {
        const msg = msgDoc.data();
        messages.push({
          sender: msg.senderName || 'Unknown',
          senderEmail: conv.participantDetails?.[msg.senderId]?.email || '',
          text: msg.text || '',
          timestamp: timestampToISO(msg.createdAt),
          priority: msg.priority,
        });
      }

      // Reverse to chronological order (oldest first)
      messages.reverse();
      totalMessages += messages.length;

      // Build conversation export
      const exportedConv: ExportedConversation = {
        id: convId,
        type: conv.type,
        name: conv.name,
        participants: Object.values(conv.participantDetails as any).map((p: any) => p.email),
        createdAt: timestampToISO(conv.createdAt),
        messageCount: messages.length,
        messages,
      };

      conversations.push(exportedConv);
    }

    // 5. Build final export
    const exportData: UserConversationsExport = {
      userId,
      userEmail,
      exportedAt: new Date().toISOString(),
      conversations,
      metadata: {
        totalConversations: conversations.length,
        totalMessages,
        messageLimit: 1000,
      },
    };

    if (timeoutWarning) {
      exportData.metadata.timeoutWarning = timeoutWarning;
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ [exportUserConversations] Export complete in ${elapsed}ms - ${totalMessages} messages`);

    return exportData;
  });

