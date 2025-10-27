/**
 * Workspace Export Service
 * Sub-Phase 10: Export workspace data to JSON
 */

import { httpsCallable } from 'firebase/functions';
import { Share } from 'react-native';
import { functions } from '../firebase.config';

export interface WorkspaceExportData {
  workspaceId: string;
  workspaceName: string;
  exportedAt: string;
  exportedBy: string;
  members: {
    email: string;
    displayName: string;
    role: 'admin' | 'member';
    joinedAt: string;
  }[];
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
 * Export workspace data and download as JSON file
 * @param workspaceId Workspace to export
 * @returns Success status and export data
 */
export async function exportWorkspaceData(workspaceId: string): Promise<{
  success: boolean;
  data?: WorkspaceExportData;
  error?: string;
}> {
  try {
    console.log('[exportWorkspaceData] Starting export for workspace:', workspaceId);
    
    // Call Cloud Function to generate export
    const exportFn = httpsCallable(functions, 'exportWorkspace');
    const result = await exportFn({ workspaceId });
    const exportData = result.data as WorkspaceExportData;

    console.log('[exportWorkspaceData] Export received:', 
      exportData.metadata.totalMessages, 'messages,',
      exportData.metadata.totalConversations, 'conversations'
    );

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${exportData.workspaceName.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.json`;

    // Convert to formatted JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    // Save and share the file
    await downloadJSON(jsonString, filename, exportData.workspaceName);

    return {
      success: true,
      data: exportData,
    };
  } catch (error: any) {
    console.error('[exportWorkspaceData] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to export workspace',
    };
  }
}

/**
 * Download JSON file using platform-appropriate method
 */
async function downloadJSON(
  jsonString: string,
  filename: string,
  workspaceName: string
): Promise<void> {
  try {
    // For now, use React Native Share (simple text-based sharing)
    // In the future, we can enhance this with proper file exports
    console.log('[downloadJSON] Using Share API for export');
    
    await Share.share({
      message: jsonString,
      title: `${workspaceName} Export`,
    });
  } catch (error) {
    console.error('[downloadJSON] Error sharing file:', error);
    throw new Error('Failed to share export file');
  }
}

