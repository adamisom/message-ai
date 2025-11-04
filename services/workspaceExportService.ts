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
 * @param workspaceName Optional workspace name for filename
 * @returns Success status and export data
 */
export async function exportWorkspaceData(
  workspaceId: string,
  workspaceName?: string
): Promise<{
  success: boolean;
  data?: WorkspaceExportData;
  error?: string;
}> {
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Create filename with workspace name if provided
  let filename: string;
  if (workspaceName) {
    const sanitizedName = workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    filename = `${sanitizedName}_export_${timestamp}.json`;
  } else {
    filename = `workspace_export_${timestamp}.json`;
  }
  
  return exportAndShare<WorkspaceExportData>(
    'exportWorkspace',
    filename,
    { workspaceId }
  );
}
