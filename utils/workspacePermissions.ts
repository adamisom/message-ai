/**
 * Workspace Permissions Helper
 * Phase 4: Admin Features - Check workspace admin status
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.config';

/**
 * Check if a user is the admin of a specific workspace
 */
export async function isWorkspaceAdmin(
  userId: string,
  workspaceId: string | undefined
): Promise<boolean> {
  if (!workspaceId || !userId) {
    return false;
  }

  try {
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);

    if (!workspaceSnap.exists()) {
      return false;
    }

    const workspace = workspaceSnap.data();
    return workspace.adminUid === userId;
  } catch (error) {
    console.error('Error checking workspace admin status:', error);
    return false;
  }
}

/**
 * Check if a user is a member of a specific workspace
 */
export async function isWorkspaceMember(
  userId: string,
  workspaceId: string | undefined
): Promise<boolean> {
  if (!workspaceId || !userId) {
    return false;
  }

  try {
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);

    if (!workspaceSnap.exists()) {
      return false;
    }

    const workspace = workspaceSnap.data();
    return workspace.members?.includes(userId) || false;
  } catch (error) {
    console.error('Error checking workspace membership:', error);
    return false;
  }
}

