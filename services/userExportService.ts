/**
 * User Conversation Export Service
 * Sub-Phase 11 (Polish): Export non-workspace conversations
 */

import { httpsCallable } from 'firebase/functions';
import { Share } from 'react-native';
import { functions } from '../firebase.config';

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
  try {
    console.log('[exportUserConversations] Starting export...');
    
    // Call Cloud Function to generate export
    const exportFn = httpsCallable(functions, 'exportUserConversations');
    const result = await exportFn({});
    const exportData = result.data as UserConversationsExportData;

    console.log('[exportUserConversations] Export received:', 
      exportData.metadata.totalMessages, 'messages,',
      exportData.metadata.totalConversations, 'conversations'
    );

    // Convert to formatted JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    // Share the file
    await Share.share({
      message: jsonString,
      title: `My Conversations Export`,
    });

    return {
      success: true,
      data: exportData,
    };
  } catch (error: any) {
    console.error('[exportUserConversations] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to export conversations',
    };
  }
}

