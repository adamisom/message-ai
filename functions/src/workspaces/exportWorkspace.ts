/**
 * Export Workspace - Sub-Phase 10
 * Exports all workspace data to JSON format for admin download
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
  manuallyMarkedUrgent?: boolean;
}

interface ExportedConversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[]; // emails
  createdAt: string;
  messageCount: number;
  messages: ExportedMessage[];
  
  // AI data
  summary?: {
    text: string;
    keyPoints: string[];
    generatedAt: string;
    editedByAdmin?: boolean;
  };
  decisions?: Array<{
    decision: string;
    context: string;
    confidence: number;
    decidedAt: string;
    editedByAdmin?: boolean;
  }>;
  actionItems?: Array<{
    text: string;
    assignee: string | null;
    dueDate: string | null;
    priority: string;
    status: string;
    editedByAdmin?: boolean;
  }>;
  pinnedMessages?: Array<{
    messageId: string;
    pinnedBy: string;
    pinnedAt: string;
  }>;
}

interface WorkspaceExport {
  workspaceId: string;
  workspaceName: string;
  exportedAt: string;
  exportedBy: string;
  
  members: Array<{
    email: string;
    displayName: string;
    role: 'admin' | 'member';
    joinedAt: string;
  }>;
  
  conversations: ExportedConversation[];
  
  metadata: {
    totalConversations: number;
    totalMessages: number;
    messageLimit: number; // 1000 per conversation
    timeoutWarning?: string;
  };
}

/**
 * Convert Firestore Timestamp to ISO string
 * Exported for testing
 */
export function timestampToISO(timestamp: any): string {
  if (!timestamp) return '';
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  return new Date(timestamp).toISOString();
}

/**
 * Export workspace data to JSON
 */
export const exportWorkspace = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' }) // 9 min max, more memory
  .https.onCall(async (data, context) => {
    const startTime = Date.now();
    const TIMEOUT_BUFFER = 50000; // 50 seconds before hard timeout
    
    // 1. Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { workspaceId } = data;

    if (!workspaceId) {
      throw new functions.https.HttpsError('invalid-argument', 'workspaceId is required');
    }

    // 2. Get workspace
    const workspaceRef = db.collection('workspaces').doc(workspaceId);
    const workspaceDoc = await workspaceRef.get();

    if (!workspaceDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Workspace not found');
    }

    const workspace = workspaceDoc.data()!;

    // 3. Verify admin permission
    if (workspace.adminUid !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only workspace admin can export data'
      );
    }

    // 4. Get user info for export metadata
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const exportedBy = userDoc.exists ? userDoc.data()!.email : context.auth.uid;

    console.log(`📦 [exportWorkspace] Starting export for workspace: ${workspace.name}`);

    // 5. Build members list
    const members: WorkspaceExport['members'] = [];
    for (const [uid, details] of Object.entries(workspace.memberDetails as any)) {
      const memberDetails = details as any;
      members.push({
        email: memberDetails.email,
        displayName: memberDetails.displayName,
        role: memberDetails.role || 'member',
        joinedAt: timestampToISO(memberDetails.joinedAt),
      });
    }

    // 6. Get all conversations for this workspace
    const conversationsSnapshot = await db
      .collection('conversations')
      .where('workspaceId', '==', workspaceId)
      .get();

    console.log(`📦 [exportWorkspace] Found ${conversationsSnapshot.size} conversations`);

    const conversations: ExportedConversation[] = [];
    let totalMessages = 0;
    let timeoutWarning: string | undefined;

    // 7. Export each conversation (with timeout protection)
    for (const convDoc of conversationsSnapshot.docs) {
      // Check timeout
      if (Date.now() - startTime > TIMEOUT_BUFFER) {
        console.warn(`⏱️ [exportWorkspace] Approaching timeout, stopping export`);
        timeoutWarning = 'Export incomplete due to timeout. Some conversations may be missing.';
        break;
      }

      const conv = convDoc.data();
      const convId = convDoc.id;

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
          manuallyMarkedUrgent: msg.manuallyMarkedUrgent,
        });
      }

      // Reverse to chronological order (oldest first)
      messages.reverse();
      totalMessages += messages.length;

      // Get AI summary (latest)
      let summary: ExportedConversation['summary'];
      const summaryDoc = await db
        .collection(`conversations/${convId}/ai_summaries`)
        .doc('latest')
        .get();
      
      if (summaryDoc.exists) {
        const summaryData = summaryDoc.data()!;
        summary = {
          text: summaryData.summary || '',
          keyPoints: summaryData.keyPoints || [],
          generatedAt: timestampToISO(summaryData.generatedAt),
          editedByAdmin: summaryData.editedByAdmin || false,
        };
      }

      // Get AI decisions
      const decisionsSnapshot = await db
        .collection(`conversations/${convId}/ai_decisions`)
        .get();
      
      const decisions = decisionsSnapshot.docs.map(doc => {
        const d = doc.data();
        return {
          decision: d.decision || '',
          context: d.context || '',
          confidence: d.confidence || 0,
          decidedAt: timestampToISO(d.decidedAt),
          editedByAdmin: d.editedByAdmin || false,
        };
      });

      // Get AI action items
      const actionItemsSnapshot = await db
        .collection(`conversations/${convId}/ai_action_items`)
        .get();
      
      const actionItems = actionItemsSnapshot.docs.map(doc => {
        const ai = doc.data();
        return {
          text: ai.text || '',
          assignee: ai.assigneeEmail || null,
          dueDate: ai.dueDate || null,
          priority: ai.priority || 'medium',
          status: ai.status || 'pending',
          editedByAdmin: ai.editedByAdmin || false,
        };
      });

      // Get pinned messages
      const pinnedMessages = conv.pinnedMessages?.map((pin: any) => ({
        messageId: pin.messageId,
        pinnedBy: conv.participantDetails?.[pin.pinnedBy]?.email || pin.pinnedBy,
        pinnedAt: timestampToISO(pin.pinnedAt),
      }));

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

      // Add AI data if exists
      if (summary) exportedConv.summary = summary;
      if (decisions.length > 0) exportedConv.decisions = decisions;
      if (actionItems.length > 0) exportedConv.actionItems = actionItems;
      if (pinnedMessages?.length > 0) exportedConv.pinnedMessages = pinnedMessages;

      conversations.push(exportedConv);
    }

    // 8. Build final export
    const exportData: WorkspaceExport = {
      workspaceId,
      workspaceName: workspace.name,
      exportedAt: new Date().toISOString(),
      exportedBy,
      members,
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
    console.log(`✅ [exportWorkspace] Export complete in ${elapsed}ms - ${totalMessages} messages`);

    return exportData;
  });

