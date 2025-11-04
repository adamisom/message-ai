/**
 * Phase 4: Workspace Validation Helpers
 * Pure functions for workspace creation validation
 */

export interface User {
  isPaidUser: boolean;
  subscriptionTier?: string;
  spamBanned: boolean;
  workspacesOwned?: string[];
  trialEndsAt?: any;
}

export interface WorkspaceValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Validate workspace creation request
 * Checks: name, maxUsers, Pro status, spam ban, workspace limit, name uniqueness
 */
export function validateWorkspaceCreation(
  user: User,
  workspaceName: string,
  maxUsers: number,
  existingWorkspaceNames: string[]
): WorkspaceValidationResult {
  // 1. Name validation
  if (!workspaceName || typeof workspaceName !== 'string' || workspaceName.trim().length === 0) {
    return {
      valid: false,
      error: 'Workspace name is required',
      errorCode: 'invalid-name',
    };
  }
  
  // 2. maxUsers validation
  if (!maxUsers || typeof maxUsers !== 'number' || maxUsers < 2 || maxUsers > 25) {
    return {
      valid: false,
      error: 'maxUsers must be between 2 and 25',
      errorCode: 'invalid-capacity',
    };
  }
  
  // 3. Pro subscription check (trial users cannot create workspaces)
  if (!user.isPaidUser) {
    return {
      valid: false,
      error: 'Pro subscription required to create workspaces',
      errorCode: 'pro-required',
    };
  }
  
  // 4. Spam ban check
  if (user.spamBanned) {
    return {
      valid: false,
      error: 'Account restricted from creating workspaces due to spam reports',
      errorCode: 'spam-banned',
    };
  }
  
  // 5. Workspace limit check (5 max)
  const workspaceCount = user.workspacesOwned?.length || 0;
  if (workspaceCount >= 5) {
    return {
      valid: false,
      error: 'Workspace limit reached (5 max)',
      errorCode: 'limit-reached',
    };
  }
  
  // 6. Name uniqueness check (per-user)
  const normalizedName = workspaceName.trim().toLowerCase();
  const nameExists = existingWorkspaceNames.some(
    (existingName) => existingName.toLowerCase() === normalizedName
  );
  
  if (nameExists) {
    return {
      valid: false,
      error: 'You already have a workspace with that name',
      errorCode: 'duplicate-name',
    };
  }
  
  return { valid: true };
}

/**
 * Calculate workspace billing charge
 * $0.50 per user per month
 */
export function calculateWorkspaceCharge(maxUsers: number): number {
  return maxUsers * 0.5;
}

/**
 * Create a workspace invitation
 * Shared helper used by createWorkspace and inviteWorkspaceMember
 * Returns the invitation ID
 */
export async function createWorkspaceInvitation(
  db: any,
  adminModule: any,
  params: {
    workspaceId: string;
    workspaceName: string;
    invitedByUid: string;
    invitedByDisplayName: string;
    invitedUserUid: string;
    invitedUserEmail: string;
  }
): Promise<string> {
  const invitationRef = db.collection('workspace_invitations').doc();
  const now = adminModule.firestore.FieldValue.serverTimestamp();

  // Create invitation document
  await invitationRef.set({
    workspaceId: params.workspaceId,
    workspaceName: params.workspaceName,
    invitedByUid: params.invitedByUid,
    invitedByDisplayName: params.invitedByDisplayName,
    invitedUserUid: params.invitedUserUid,
    invitedUserEmail: params.invitedUserEmail,
    status: 'pending',
    sentAt: now,
  });

  // Send notification to invited user
  await db.collection('users').doc(params.invitedUserUid)
    .collection('notifications').add({
      type: 'workspace',
      action: 'invitation',
      workspaceId: params.workspaceId,
      workspaceName: params.workspaceName,
      invitedByDisplayName: params.invitedByDisplayName,
      message: `${params.invitedByDisplayName} invited you to join ${params.workspaceName}`,
      timestamp: now,
      read: false,
    });

  return invitationRef.id;
}

