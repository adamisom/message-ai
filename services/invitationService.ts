import { getUserWorkspaceInvitations } from './workspaceService';
import { getUserGroupChatInvitations } from './groupChatService';
import { getUserDirectMessageInvitations } from './dmInvitationService';

/**
 * Unified invitation type for display
 */
export type InvitationType = 'workspace' | 'group_chat' | 'direct_message';

export interface UnifiedInvitation {
  id: string;
  type: InvitationType;
  name: string; // workspace name, conversation name, or inviter name for DMs
  invitedByDisplayName: string;
  sentAt: any;
  // Workspace-specific
  workspaceId?: string;
  workspaceName?: string;
  // Group chat-specific
  conversationId?: string;
  conversationName?: string;
  // DM-specific
  inviterPhone?: string;
}

/**
 * Load all invitation types for a user and return them in a unified format.
 * This is the single source of truth for invitation loading across the app.
 * 
 * @param userId - The user ID to load invitations for
 * @returns Array of unified invitations, sorted by sentAt (newest first)
 */
export async function getAllUserInvitations(userId: string): Promise<UnifiedInvitation[]> {
  if (!userId) {
    return [];
  }

  try {
    const [workspaceInvites, groupChatInvites, dmInvites] = await Promise.all([
      getUserWorkspaceInvitations(userId),
      getUserGroupChatInvitations(userId),
      getUserDirectMessageInvitations(userId),
    ]);

    const unified = mapToUnifiedInvitations(workspaceInvites, groupChatInvites, dmInvites);
    
    // Sort by sentAt (newest first)
    unified.sort((a, b) => {
      const aTime = a.sentAt?.toMillis?.() || 0;
      const bTime = b.sentAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return unified;
  } catch (error) {
    console.error('[invitationService] Error loading invitations:', error);
    throw error;
  }
}

/**
 * Get the total count of pending invitations for a user.
 * Useful for displaying badge counts.
 * 
 * @param userId - The user ID to count invitations for
 * @returns Total number of pending invitations
 */
export async function getUserInvitationCount(userId: string): Promise<number> {
  if (!userId) {
    return 0;
  }

  try {
    const [workspaceInvites, groupChatInvites, dmInvites] = await Promise.all([
      getUserWorkspaceInvitations(userId),
      getUserGroupChatInvitations(userId),
      getUserDirectMessageInvitations(userId),
    ]);

    return workspaceInvites.length + groupChatInvites.length + dmInvites.length;
  } catch (error) {
    console.error('[invitationService] Error loading invitation count:', error);
    return 0;
  }
}

/**
 * Map various invitation types to a unified format.
 * This is the single source of truth for invitation mapping logic.
 */
function mapToUnifiedInvitations(
  workspaceInvites: any[],
  groupChatInvites: any[],
  dmInvites: any[]
): UnifiedInvitation[] {
  const unified: UnifiedInvitation[] = [];

  // Map workspace invitations
  unified.push(
    ...workspaceInvites.map((inv) => ({
      id: inv.id,
      type: 'workspace' as InvitationType,
      name: inv.workspaceName,
      invitedByDisplayName: inv.invitedByDisplayName,
      sentAt: inv.sentAt,
      workspaceId: inv.workspaceId,
      workspaceName: inv.workspaceName,
    }))
  );

  // Map group chat invitations
  unified.push(
    ...groupChatInvites.map((inv) => ({
      id: inv.id,
      type: 'group_chat' as InvitationType,
      name: inv.conversationName || 'Group Chat',
      invitedByDisplayName: inv.inviterName,
      sentAt: inv.invitedAt,
      conversationId: inv.conversationId,
      conversationName: inv.conversationName,
    }))
  );

  // Map DM invitations
  unified.push(
    ...dmInvites.map((inv) => ({
      id: inv.id,
      type: 'direct_message' as InvitationType,
      name: inv.inviterName,
      invitedByDisplayName: inv.inviterName,
      sentAt: inv.sentAt,
      inviterPhone: inv.inviterPhoneNumber,
    }))
  );

  return unified;
}

