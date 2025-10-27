/**
 * User Conversation Export Service
 * Sub-Phase 11 (Polish): Export non-workspace conversations
 */

import { exportAndShare } from './exportHelpers';

export interface UserConversationsExportData {
  userId: string;
  userEmail: string;
  exportedAt: string;
  conversations: {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    participants: string[];
    createdAt: string;
    messageCount: number;
    messages: {
      sender: string;
      senderEmail: string;
      text: string;
      timestamp: string;
    }[];
  }[];
  metadata: {
    totalConversations: number;
    totalMessages: number;
    messageLimit: number;
    timeoutWarning?: string;
  };
}

/**
 * Export user's non-workspace conversations and share as JSON
 * @returns Success status and export data
 */
export async function exportUserConversationsData(): Promise<{
  success: boolean;
  data?: UserConversationsExportData;
  error?: string;
}> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `my_conversations_${timestamp}.json`;
  
  return exportAndShare<UserConversationsExportData>(
    'exportUserConversations',
    filename
  );
}
