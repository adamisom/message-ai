/**
 * Direct Message Invitations
 * Sub-Phase 11 (Polish): DM Privacy System
 * 
 * Handles creating DM invitations when recipient has dmPrivacySetting: 'private'
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Create a direct message invitation
 * Called when user tries to message someone with dmPrivacySetting: 'private'
 */
export const createDirectMessageInvitation = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { recipientId } = data;
  const inviterId = context.auth.uid;

  if (!recipientId) {
    throw new functions.https.HttpsError('invalid-argument', 'recipientId is required');
  }

  // 2. Get inviter and recipient data
  const [inviterDoc, recipientDoc] = await Promise.all([
    db.collection('users').doc(inviterId).get(),
    db.collection('users').doc(recipientId).get(),
  ]);

  if (!inviterDoc.exists || !recipientDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const inviter = inviterDoc.data()!;
  const recipient = recipientDoc.data()!;

  // 3. Check if inviter is spam-banned
  if (inviter.spamBanned) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Cannot send invitations while banned for spam'
    );
  }

  // 4. Check if inviter is blocked by recipient
  if (recipient.blockedUsers && recipient.blockedUsers.includes(inviterId)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Cannot send invitation to this user'
    );
  }

  // 5. Check if recipient has dmPrivacySetting: 'public' (no invitation needed)
  if (recipient.dmPrivacySetting === 'public') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'User has public DM settings, no invitation needed'
    );
  }

  // 6. Check for existing pending invitation
  const existingInvitationQuery = await db
    .collection('dm_invitations')
    .where('inviterId', '==', inviterId)
    .where('inviteeId', '==', recipientId)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (!existingInvitationQuery.empty) {
    throw new functions.https.HttpsError(
      'already-exists',
      'You already have a pending invitation to this user'
    );
  }

  // 7. Check if there's already a conversation between these users
  const conversationId = [inviterId, recipientId].sort().join('_');
  const existingConvDoc = await db.collection('conversations').doc(conversationId).get();
  
  if (existingConvDoc.exists) {
    throw new functions.https.HttpsError(
      'already-exists',
      'Conversation already exists with this user'
    );
  }

  // 8. Create invitation
  const invitation = {
    inviterId,
    inviterEmail: inviter.email,
    inviterName: inviter.displayName,
    inviterPhoneNumber: inviter.phoneNumber || '',
    inviteeId: recipientId,
    inviteeEmail: recipient.email,
    inviteeName: recipient.displayName,
    status: 'pending',
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const invitationRef = await db.collection('dm_invitations').add(invitation);

  console.log(`✉️ [createDMInvitation] Created invitation ${invitationRef.id} from ${inviter.email} to ${recipient.email}`);

  return {
    invitationId: invitationRef.id,
    recipientName: recipient.displayName,
  };
});

/**
 * Accept a direct message invitation
 * Creates the conversation and marks invitation as accepted
 */
export const acceptDirectMessageInvitation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { invitationId } = data;
  const userId = context.auth.uid;

  if (!invitationId) {
    throw new functions.https.HttpsError('invalid-argument', 'invitationId is required');
  }

  // 1. Get invitation
  const invitationRef = db.collection('dm_invitations').doc(invitationId);
  const invitationDoc = await invitationRef.get();

  if (!invitationDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Invitation not found');
  }

  const invitation = invitationDoc.data()!;

  // 2. Verify user is the invitee
  if (invitation.inviteeId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  // 3. Check if already responded
  if (invitation.status !== 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Invitation already responded to');
  }

  // 4. Get both users' data
  const [inviterDoc, inviteeDoc] = await Promise.all([
    db.collection('users').doc(invitation.inviterId).get(),
    db.collection('users').doc(invitation.inviteeId).get(),
  ]);

  if (!inviterDoc.exists || !inviteeDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const inviter = inviterDoc.data()!;
  const invitee = inviteeDoc.data()!;

  // 5. Create conversation
  const conversationId = [invitation.inviterId, invitation.inviteeId].sort().join('_');
  const conversationData = {
    type: 'direct',
    participants: [invitation.inviterId, invitation.inviteeId],
    participantDetails: {
      [invitation.inviterId]: {
        displayName: inviter.displayName,
        email: inviter.email,
      },
      [invitation.inviteeId]: {
        displayName: invitee.displayName,
        email: invitee.email,
      },
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    lastMessage: null,
  };

  await db.collection('conversations').doc(conversationId).set(conversationData);

  // 6. Update invitation status
  await invitationRef.update({
    status: 'accepted',
    respondedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ [acceptDMInvitation] Created conversation ${conversationId}`);

  return { conversationId };
});

/**
 * Decline a direct message invitation
 */
export const declineDirectMessageInvitation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { invitationId } = data;
  const userId = context.auth.uid;

  if (!invitationId) {
    throw new functions.https.HttpsError('invalid-argument', 'invitationId is required');
  }

  // 1. Get invitation
  const invitationRef = db.collection('dm_invitations').doc(invitationId);
  const invitationDoc = await invitationRef.get();

  if (!invitationDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Invitation not found');
  }

  const invitation = invitationDoc.data()!;

  // 2. Verify user is the invitee
  if (invitation.inviteeId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  // 3. Check if already responded
  if (invitation.status !== 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Invitation already responded to');
  }

  // 4. Update invitation status
  await invitationRef.update({
    status: 'declined',
    respondedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`❌ [declineDMInvitation] Declined invitation ${invitationId}`);

  return { success: true };
});

/**
 * Report a direct message invitation as spam
 * Similar to group chat invitation spam reporting
 */
export const reportDirectMessageInvitationSpam = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { invitationId } = data;
  const userId = context.auth.uid;

  if (!invitationId) {
    throw new functions.https.HttpsError('invalid-argument', 'invitationId is required');
  }

  // 1. Get invitation
  const invitationRef = db.collection('dm_invitations').doc(invitationId);
  const invitationDoc = await invitationRef.get();

  if (!invitationDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Invitation not found');
  }

  const invitation = invitationDoc.data()!;

  // 2. Verify user is the invitee
  if (invitation.inviteeId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  // 3. Check if already responded
  if (invitation.status !== 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Invitation already responded to');
  }

  // 4. Update invitation status
  await invitationRef.update({
    status: 'spam',
    respondedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 5. Add spam report to inviter (reuse existing spam helper logic)
  const { calculateActiveStrikes } = require('../utils/spamHelpers');
  
  const inviterRef = db.collection('users').doc(invitation.inviterId);
  const inviterDoc = await inviterRef.get();
  const inviterData = inviterDoc.data()!;

  // Add spam report
  const updatedReports = [
    ...(inviterData.spamReportsReceived || []),
    {
      reportedBy: userId,
      reportedAt: admin.firestore.FieldValue.serverTimestamp(),
      reason: 'dm_invitation',
    },
  ];

  await inviterRef.update({
    spamReportsReceived: updatedReports,
  });

  // Calculate strikes and apply bans if needed
  const strikeResult = calculateActiveStrikes(updatedReports);
  
  if (strikeResult.isTempBanned || strikeResult.isPermanentlyBanned) {
    await inviterRef.update({
      spamBanned: true,
      spamBanExpiresAt: strikeResult.tempBanEndsAt || null,
    });
  }

  // 6. Block inviter automatically
  const inviteeRef = db.collection('users').doc(userId);
  await inviteeRef.update({
    blockedUsers: admin.firestore.FieldValue.arrayUnion(invitation.inviterId),
  });

  console.log(`🚫 [reportDMInvitationSpam] Reported invitation ${invitationId} as spam`);

  // 7. Send notification if needed
  if (strikeResult.shouldNotify) {
    // Future: Send push notification about spam warning/ban
    console.log(`📧 [reportDMInvitationSpam] Should notify inviter: ${strikeResult.notificationType}`);
  }

  return { 
    success: true,
    strikeCount: strikeResult.strikeCount,
  };
});

