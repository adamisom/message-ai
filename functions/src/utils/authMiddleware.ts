/**
 * Authentication Middleware for Cloud Functions
 * 
 * Provides reusable authentication and authorization helpers
 * to reduce code duplication across Cloud Functions.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Require that the user is authenticated.
 * Throws an 'unauthenticated' error if not.
 * 
 * @param context Cloud Function callable context
 * @returns The authenticated user's UID
 * @throws HttpsError if user is not authenticated
 * 
 * @example
 * export const myFunction = functions.https.onCall(async (data, context) => {
 *   const uid = requireAuth(context);
 *   // ... rest of function
 * });
 */
export function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to call this function'
    );
  }
  return context.auth.uid;
}

/**
 * Require authentication and fetch the user's document.
 * Throws an 'unauthenticated' error if not authenticated.
 * Throws a 'not-found' error if user document doesn't exist.
 * 
 * @param context Cloud Function callable context
 * @returns Object containing uid and user data
 * @throws HttpsError if user is not authenticated or not found
 * 
 * @example
 * export const myFunction = functions.https.onCall(async (data, context) => {
 *   const { uid, user } = await requireUser(context);
 *   const isPro = user.isPaidUser;
 *   // ... rest of function
 * });
 */
export async function requireUser(
  context: functions.https.CallableContext
): Promise<{ uid: string; user: FirebaseFirestore.DocumentData }> {
  const uid = requireAuth(context);
  
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'User not found'
    );
  }
  
  return { uid, user: userDoc.data()! };
}

/**
 * Require authentication and verify the user is a Pro user (paid or in trial).
 * 
 * @param context Cloud Function callable context
 * @returns Object containing uid and user data
 * @throws HttpsError if user is not authenticated, not found, or not Pro
 * 
 * @example
 * export const proFeature = functions.https.onCall(async (data, context) => {
 *   const { uid, user } = await requireProUser(context);
 *   // ... rest of function
 * });
 */
export async function requireProUser(
  context: functions.https.CallableContext
): Promise<{ uid: string; user: FirebaseFirestore.DocumentData }> {
  const { uid, user } = await requireUser(context);
  
  const isPro = user.isPaidUser || (
    user.trialEndsAt && 
    Date.now() < (
      typeof user.trialEndsAt === 'number' 
        ? user.trialEndsAt 
        : user.trialEndsAt.toMillis?.() || 0
    )
  );
  
  if (!isPro) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'This feature requires a Pro subscription'
    );
  }
  
  return { uid, user };
}

/**
 * Require authentication and verify the user is a workspace admin.
 * 
 * @param context Cloud Function callable context
 * @param workspaceId The workspace ID to check admin status for
 * @returns Object containing uid, user data, and workspace data
 * @throws HttpsError if user is not authenticated, not found, or not an admin
 * 
 * @example
 * export const adminFeature = functions.https.onCall(async (data, context) => {
 *   const { uid, user, workspace } = await requireWorkspaceAdmin(context, data.workspaceId);
 *   // ... rest of function
 * });
 */
export async function requireWorkspaceAdmin(
  context: functions.https.CallableContext,
  workspaceId: string
): Promise<{ 
  uid: string; 
  user: FirebaseFirestore.DocumentData;
  workspace: FirebaseFirestore.DocumentData;
}> {
  const { uid, user } = await requireUser(context);
  
  if (!workspaceId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'workspaceId is required'
    );
  }
  
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!workspaceDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Workspace not found'
    );
  }
  
  const workspace = workspaceDoc.data()!;
  
  if (workspace.createdBy !== uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only workspace admins can perform this action'
    );
  }
  
  return { uid, user, workspace };
}

/**
 * Require authentication and verify the user is a member of the workspace.
 * 
 * @param context Cloud Function callable context
 * @param workspaceId The workspace ID to check membership for
 * @returns Object containing uid, user data, and workspace data
 * @throws HttpsError if user is not authenticated, not found, or not a member
 * 
 * @example
 * export const memberFeature = functions.https.onCall(async (data, context) => {
 *   const { uid, user, workspace } = await requireWorkspaceMember(context, data.workspaceId);
 *   // ... rest of function
 * });
 */
export async function requireWorkspaceMember(
  context: functions.https.CallableContext,
  workspaceId: string
): Promise<{ 
  uid: string; 
  user: FirebaseFirestore.DocumentData;
  workspace: FirebaseFirestore.DocumentData;
}> {
  const { uid, user } = await requireUser(context);
  
  if (!workspaceId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'workspaceId is required'
    );
  }
  
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!workspaceDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Workspace not found'
    );
  }
  
  const workspace = workspaceDoc.data()!;
  
  if (!workspace.members || !workspace.members.includes(uid)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You must be a member of this workspace'
    );
  }
  
  return { uid, user, workspace };
}

