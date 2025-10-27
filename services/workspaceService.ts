/**
 * Workspace Service - CRUD operations for workspace management
 * Phase 4: Workspaces & Paid Tier
 */

import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    Unsubscribe,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { CreateWorkspaceRequest, Workspace, WorkspaceInvitation } from '../types';

/**
 * Create a new workspace (admin only, Pro subscription required)
 */
export async function createWorkspace(
  adminUid: string,
  request: CreateWorkspaceRequest
): Promise<Workspace> {
  // Validation happens in Cloud Function
  // This is a client-side helper that calls the Cloud Function
  
  const workspaceRef = doc(collection(db, 'workspaces'));
  
  const workspace: Workspace = {
    id: workspaceRef.id,
    name: request.name,
    adminUid,
    adminDisplayName: '', // Will be filled by Cloud Function
    members: [adminUid], // Admin is always first member
    memberDetails: {},
    createdAt: serverTimestamp() as Timestamp,
    maxUsersThisMonth: request.maxUsers,
    billingCycleStart: serverTimestamp() as Timestamp,
    currentMonthCharge: request.maxUsers * 0.5,
    isActive: true,
    groupChatCount: 0,
    directChatCount: 0,
    totalMessages: 0,
  };
  
  await setDoc(workspaceRef, workspace);
  
  return workspace;
}

/**
 * Get workspace by ID
 */
export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  const workspaceSnap = await getDoc(workspaceRef);
  
  if (!workspaceSnap.exists()) {
    return null;
  }
  
  return { id: workspaceSnap.id, ...workspaceSnap.data() } as Workspace;
}

/**
 * Get all workspaces owned by user (admin)
 */
export async function getUserOwnedWorkspaces(userId: string): Promise<Workspace[]> {
  const q = query(
    collection(db, 'workspaces'),
    where('adminUid', '==', userId),
    where('isActive', '==', true)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Workspace));
}

/**
 * Get all workspaces user is a member of (not admin)
 */
export async function getUserMemberWorkspaces(userId: string): Promise<Workspace[]> {
  const q = query(
    collection(db, 'workspaces'),
    where('members', 'array-contains', userId),
    where('isActive', '==', true)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Workspace))
    .filter(workspace => workspace.adminUid !== userId); // Exclude owned workspaces
}

/**
 * Update workspace (admin only)
 */
export async function updateWorkspace(
  workspaceId: string,
  updates: Partial<Workspace>
): Promise<void> {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  await updateDoc(workspaceRef, updates as any);
}

/**
 * Delete workspace (admin only)
 */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  // Actual deletion happens in Cloud Function (cascade delete all chats)
  // This is a client-side trigger
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  await deleteDoc(workspaceRef);
}

/**
 * Add member to workspace (admin only)
 */
export async function addMemberToWorkspace(
  workspaceId: string,
  memberUid: string,
  memberEmail: string
): Promise<void> {
  // This creates an invitation, actual membership happens when accepted
  const invitationRef = doc(collection(db, 'workspace_invitations'));
  
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) {
    throw new Error('Workspace not found');
  }
  
  const invitation: WorkspaceInvitation = {
    id: invitationRef.id,
    workspaceId,
    workspaceName: workspace.name,
    invitedByUid: workspace.adminUid,
    invitedByDisplayName: workspace.adminDisplayName,
    invitedUserUid: memberUid,
    invitedUserEmail: memberEmail,
    status: 'pending',
    sentAt: serverTimestamp() as Timestamp,
  };
  
  await setDoc(invitationRef, invitation);
}

/**
 * Remove member from workspace (admin only)
 */
export async function removeMemberFromWorkspace(
  workspaceId: string,
  memberUid: string
): Promise<void> {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) {
    throw new Error('Workspace not found');
  }
  
  const updatedMembers = workspace.members.filter(uid => uid !== memberUid);
  const updatedMemberDetails = { ...workspace.memberDetails };
  delete updatedMemberDetails[memberUid];
  
  await updateWorkspace(workspaceId, {
    members: updatedMembers,
    memberDetails: updatedMemberDetails,
  });
}

/**
 * Leave workspace (member voluntarily leaves)
 */
export async function leaveWorkspace(workspaceId: string, memberUid: string): Promise<void> {
  await removeMemberFromWorkspace(workspaceId, memberUid);
}

/**
 * Listen to workspace changes in real-time
 */
export function subscribeToWorkspace(
  workspaceId: string,
  onUpdate: (workspace: Workspace) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  
  return onSnapshot(
    workspaceRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({ id: snapshot.id, ...snapshot.data() } as Workspace);
      }
    },
    onError
  );
}

/**
 * Listen to user's workspaces in real-time
 */
export function subscribeToUserWorkspaces(
  userId: string,
  onUpdate: (workspaces: Workspace[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'workspaces'),
    where('members', 'array-contains', userId),
    where('isActive', '==', true)
  );
  
  return onSnapshot(
    q,
    (snapshot) => {
      const workspaces = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Workspace));
      onUpdate(workspaces);
    },
    onError
  );
}

/**
 * Get pending workspace invitations for user
 */
export async function getUserWorkspaceInvitations(userId: string): Promise<WorkspaceInvitation[]> {
  const q = query(
    collection(db, 'workspace_invitations'),
    where('invitedUserUid', '==', userId),
    where('status', '==', 'pending')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as WorkspaceInvitation));
}

/**
 * Accept workspace invitation
 */
export async function acceptWorkspaceInvitation(invitationId: string): Promise<void> {
  const invitationRef = doc(db, 'workspace_invitations', invitationId);
  await updateDoc(invitationRef, {
    status: 'accepted',
    respondedAt: serverTimestamp(),
  });
  
  // Cloud Function handles adding user to workspace
}

/**
 * Decline workspace invitation
 */
export async function declineWorkspaceInvitation(invitationId: string): Promise<void> {
  const invitationRef = doc(db, 'workspace_invitations', invitationId);
  await updateDoc(invitationRef, {
    status: 'declined',
    respondedAt: serverTimestamp(),
  });
}

/**
 * Report workspace invitation as spam
 */
export async function reportWorkspaceInvitationAsSpam(invitationId: string): Promise<void> {
  const invitationRef = doc(db, 'workspace_invitations', invitationId);
  await updateDoc(invitationRef, {
    status: 'spam',
    respondedAt: serverTimestamp(),
  });
  
  // Cloud Function handles incrementing spam strikes
}

/**
 * Check if user can create workspace (Pro subscription required)
 */
export function canCreateWorkspace(user: any): boolean {
  // Check 1: Must be Pro user
  if (!user.isPaidUser) {
    return false;
  }
  
  // Check 2: Must not be spam banned
  if (user.spamBanned) {
    return false;
  }
  
  // Check 3: Must have < 5 workspaces
  const ownedCount = user.workspacesOwned?.length || 0;
  if (ownedCount >= 5) {
    return false;
  }
  
  return true;
}

/**
 * Check if workspace name is unique for user
 */
export async function isWorkspaceNameUnique(
  userId: string,
  name: string
): Promise<boolean> {
  const workspaces = await getUserOwnedWorkspaces(userId);
  return !workspaces.some(ws => ws.name.toLowerCase() === name.toLowerCase());
}

