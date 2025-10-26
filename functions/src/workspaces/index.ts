/**
 * Workspace Cloud Functions - Server-side workspace management
 * Phase 4: Workspaces & Paid Tier
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { validateWorkspaceCreation, calculateWorkspaceCharge } from '../utils/workspaceHelpers';
import { calculateActiveStrikes, shouldSendBanNotification } from '../utils/spamHelpers';

const db = admin.firestore();

/**
 * Create a new workspace
 * Requirements: Pro subscription, not spam banned, < 5 workspaces
 */
export const createWorkspace = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { name, maxUsers, initialMemberEmails } = data;

  // 2. Get user document
  const userRef = db.collection('users').doc(context.auth.uid);
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const user = userDoc.data()!;

  // 3. Get existing workspace names for uniqueness check
  const existingWorkspaces = await db.collection('workspaces')
    .where('adminUid', '==', context.auth.uid)
    .get();
  
  const existingNames = existingWorkspaces.docs.map(doc => doc.data().name);

  // 4. Validate workspace creation (uses tested helper function)
  const validation = validateWorkspaceCreation(user as any, name, maxUsers, existingNames);
  
  if (!validation.valid) {
    // Map error codes to appropriate HttpsError codes
    const errorCodeMap: Record<string, functions.https.FunctionsErrorCode> = {
      'invalid-name': 'invalid-argument',
      'invalid-capacity': 'invalid-argument',
      'pro-required': 'permission-denied',
      'spam-banned': 'permission-denied',
      'limit-reached': 'resource-exhausted',
      'duplicate-name': 'already-exists',
    };
    
    const errorCode = errorCodeMap[validation.errorCode || 'invalid-argument'] || 'invalid-argument';
    throw new functions.https.HttpsError(errorCode, validation.error!);
  }

  // 5. Create workspace
  const workspaceRef = db.collection('workspaces').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const workspace = {
    name: name.trim(),
    adminUid: context.auth.uid,
    adminDisplayName: user.displayName,
    members: [context.auth.uid], // Admin is first member
    memberDetails: {
      [context.auth.uid]: {
        displayName: user.displayName,
        email: user.email,
        joinedAt: now,
        role: 'admin',
      },
    },
    createdAt: now,
    maxUsersThisMonth: maxUsers,
    billingCycleStart: now,
    currentMonthCharge: calculateWorkspaceCharge(maxUsers), // Use tested helper
    isActive: true,
    groupChatCount: 0,
    directChatCount: 0,
    totalMessages: 0,
  };

  // 6. Create workspace and update user in transaction
  await db.runTransaction(async (transaction) => {
    transaction.set(workspaceRef, workspace);
    transaction.update(userRef, {
      workspacesOwned: admin.firestore.FieldValue.arrayUnion(workspaceRef.id),
    });
  });

  // 7. Send invitations to initial members (if provided)
  let invitationsSent = 0;
  if (initialMemberEmails && Array.isArray(initialMemberEmails)) {
    for (const email of initialMemberEmails.slice(0, maxUsers - 1)) {
      // Find user by email
      const memberQuery = await db.collection('users')
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (!memberQuery.empty) {
        const memberDoc = memberQuery.docs[0];
        const invitationRef = db.collection('workspace_invitations').doc();

        await invitationRef.set({
          workspaceId: workspaceRef.id,
          workspaceName: name.trim(),
          invitedByUid: context.auth.uid,
          invitedByDisplayName: user.displayName,
          invitedUserUid: memberDoc.id,
          invitedUserEmail: email.toLowerCase(),
          status: 'pending',
          sentAt: now,
        });

        invitationsSent++;
      }
    }
  }

  return {
    workspaceId: workspaceRef.id,
    invitationsSent,
  };
});

/**
 * Delete workspace
 * Requires: Admin ownership
 * Cascades: Deletes all workspace conversations
 */
export const deleteWorkspace = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { workspaceId } = data;

  if (!workspaceId) {
    throw new functions.https.HttpsError('invalid-argument', 'workspaceId is required');
  }

  // 2. Get workspace
  const workspaceRef = db.collection('workspaces').doc(workspaceId);
  const workspaceDoc = await workspaceRef.get();

  if (!workspaceDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Workspace not found');
  }

  const workspace = workspaceDoc.data()!;

  // 3. Check admin ownership
  if (workspace.adminUid !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only the workspace admin can delete this workspace'
    );
  }

  // 4. Get all workspace conversations
  const conversationsQuery = await db.collection('conversations')
    .where('workspaceId', '==', workspaceId)
    .get();

  // 5. Delete workspace, conversations, and update users in batches
  const batch = db.batch();

  // Delete workspace
  batch.delete(workspaceRef);

  // Delete all workspace conversations and their subcollections
  for (const convDoc of conversationsQuery.docs) {
    batch.delete(convDoc.ref);
    // Note: Messages subcollection deletion would need separate cleanup
    // For now, we'll handle messages cleanup in a separate scheduled function
  }

  // Update admin's workspacesOwned
  batch.update(db.collection('users').doc(context.auth.uid), {
    workspacesOwned: admin.firestore.FieldValue.arrayRemove(workspaceId),
  });

  // Update all members' workspacesMemberOf
  for (const memberUid of workspace.members) {
    if (memberUid !== context.auth.uid) { // Admin already updated above
      batch.update(db.collection('users').doc(memberUid), {
        workspacesMemberOf: admin.firestore.FieldValue.arrayRemove(workspaceId),
      });
    }
  }

  await batch.commit();

  // 6. Notify all members (except admin) via push notification
  // This would integrate with notificationService
  // For now, we'll add notifications to user docs
  for (const memberUid of workspace.members) {
    if (memberUid !== context.auth.uid) {
      await db.collection('users').doc(memberUid)
        .collection('notifications').add({
          type: 'workspace',
          action: 'deleted',
          workspaceId,
          workspaceName: workspace.name,
          message: `${workspace.name} was deleted by admin`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
    }
  }

  return { success: true };
});

/**
 * Accept workspace invitation
 * Adds user to workspace members
 */
export const acceptWorkspaceInvitation = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { invitationId } = data;

  if (!invitationId) {
    throw new functions.https.HttpsError('invalid-argument', 'invitationId is required');
  }

  // 2. Get invitation
  const invitationRef = db.collection('workspace_invitations').doc(invitationId);
  const invitationDoc = await invitationRef.get();

  if (!invitationDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Invitation not found');
  }

  const invitation = invitationDoc.data()!;

  // 3. Verify invitee
  if (invitation.invitedUserUid !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'This invitation is not for you'
    );
  }

  // 4. Check invitation status
  if (invitation.status !== 'pending') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Invitation already responded to'
    );
  }

  // 5. Get workspace
  const workspaceRef = db.collection('workspaces').doc(invitation.workspaceId);
  const workspaceDoc = await workspaceRef.get();

  if (!workspaceDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Workspace not found');
  }

  const workspace = workspaceDoc.data()!;

  // 6. Check if already a member
  if (workspace.members.includes(context.auth.uid)) {
    // Already a member, just mark invitation as accepted
    await invitationRef.update({
      status: 'accepted',
      respondedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, alreadyMember: true };
  }

  // 7. Check member limit
  if (workspace.members.length >= 25) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Workspace is full (25 members max)'
    );
  }

  // 8. Get user info
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const user = userDoc.data()!;
  const currentUserUid = context.auth.uid; // Store for use in transaction

  // 9. Add user to workspace in transaction
  await db.runTransaction(async (transaction) => {
    transaction.update(workspaceRef, {
      members: admin.firestore.FieldValue.arrayUnion(currentUserUid),
      [`memberDetails.${currentUserUid}`]: {
        displayName: user.displayName,
        email: user.email,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        role: 'member',
      },
    });

    transaction.update(db.collection('users').doc(currentUserUid), {
      workspacesMemberOf: admin.firestore.FieldValue.arrayUnion(invitation.workspaceId),
    });

    transaction.update(invitationRef, {
      status: 'accepted',
      respondedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});

/**
 * Report workspace invitation as spam
 * Increments spam strikes for inviter
 */
export const reportWorkspaceInvitationSpam = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { invitationId } = data;

  if (!invitationId) {
    throw new functions.https.HttpsError('invalid-argument', 'invitationId is required');
  }

  // 2. Get invitation
  const invitationRef = db.collection('workspace_invitations').doc(invitationId);
  const invitationDoc = await invitationRef.get();

  if (!invitationDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Invitation not found');
  }

  const invitation = invitationDoc.data()!;

  // 3. Verify reporter
  if (invitation.invitedUserUid !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You can only report invitations sent to you'
    );
  }

  // 4. Get inviter's user document
  const inviterRef = db.collection('users').doc(invitation.invitedByUid);
  const inviterDoc = await inviterRef.get();

  if (!inviterDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Inviter not found');
  }

  const inviter = inviterDoc.data()!;
  const reporterUid = context.auth.uid; // Store for use in transaction

  // 5. Calculate spam strikes using tested helper
  await db.runTransaction(async (transaction) => {
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Get spam reports and add new report
    const spamReportsReceived = inviter.spamReportsReceived || [];
    
    // Convert Firestore timestamps to Date objects for helper function
    const reportsForCalculation = spamReportsReceived.map((report: any) => ({
      reportedBy: report.reportedBy,
      timestamp: report.timestamp,
      reason: report.reason,
      workspaceId: report.workspaceId,
    }));

    // Add new report
    const newReport = {
      reportedBy: reporterUid,
      reason: 'workspace',
      timestamp: now,
      workspaceId: invitation.workspaceId,
    };
    reportsForCalculation.push(newReport);

    // Calculate active strikes using tested helper (with 1-month decay)
    const strikeResult = calculateActiveStrikes(reportsForCalculation);

    // Filter to keep only active reports (helper already validated these)
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const activeReports = spamReportsReceived.filter((report: any) => {
      const reportTime = report.timestamp?.toMillis?.() || 0;
      return reportTime > oneMonthAgo;
    });
    activeReports.push(newReport);

    // Update inviter with strike data
    transaction.update(inviterRef, {
      spamReportsReceived: activeReports,
      spamStrikes: strikeResult.activeStrikes,
      spamBanned: strikeResult.isBanned,
    });

    // Mark invitation as spam
    transaction.update(invitationRef, {
      status: 'spam',
      respondedAt: now,
    });

    // Send notifications based on strike result
    if (shouldSendBanNotification(inviter.spamBanned || false, strikeResult)) {
      // Just got banned - send ban notification
      transaction.set(inviterRef.collection('notifications').doc(), {
        type: 'spam',
        action: 'banned',
        message: '🚫 Your account is restricted from creating workspaces and group chats due to spam reports.',
        strikes: strikeResult.activeStrikes,
        timestamp: now,
        read: false,
      });
    } else if (strikeResult.shouldNotify && strikeResult.notificationType === 'warning') {
      // 3rd or 4th strike - send warning
      transaction.set(inviterRef.collection('notifications').doc(), {
        type: 'spam',
        action: 'warning',
        message: `⚠️ You have ${strikeResult.activeStrikes} spam reports. Be careful - 5 strikes will restrict workspace/group creation.`,
        strikes: strikeResult.activeStrikes,
        timestamp: now,
        read: false,
      });
    }
  });

  return { success: true };
});

