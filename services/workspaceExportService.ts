/**
 * Workspace Export Service
 * Sub-Phase 10: Export workspace data to JSON
 */

import { exportAndShare } from './exportHelpers';

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
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `workspace_export_${timestamp}.json`;
  
  return exportAndShare<WorkspaceExportData>(
    'exportWorkspace',
    filename,
    { workspaceId }
  );
}
