import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  calculateActiveStrikes,
  shouldSendBanNotification,
} from '../utils/spamHelpers';

const db = admin.firestore();

/**
 * Report group chat invitation as spam
 * Increments spam strikes for inviter
 * Uses shared spam tracking system (5 strikes = 24h ban from invites & DMs)
 */
export const reportGroupChatInvitationSpam = functions.https.onCall(
  async (data, context) => {
    // 1. Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const { invitationId } = data;

    if (!invitationId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'invitationId is required'
      );
    }

    // 2. Get invitation
    const invitationRef = db
      .collection('group_chat_invitations')
      .doc(invitationId);
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
    const reporterUid = context.auth.uid;

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
        conversationId: report.conversationId,
        workspaceId: report.workspaceId,
      }));

      // Add new report
      const newReport = {
        reportedBy: reporterUid,
        reason: 'group_chat',
        timestamp: now,
        conversationId: invitation.conversationId,
      };
      reportsForCalculation.push(newReport);

      // Calculate active strikes using tested helper (with 1-month decay)
      const strikeResult = calculateActiveStrikes(reportsForCalculation);

      // Filter to keep only active reports (last 30 days)
      const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const activeReports = spamReportsReceived.filter((report: any) => {
        const reportTime = report.timestamp?.toMillis?.() || 0;
        return reportTime > oneMonthAgo;
      });
      activeReports.push(newReport);

      // Check if we need to lift ban (strikes dropped below 5)
      const wasBanned = inviter.spamBanned || false;
      const nowBanned = strikeResult.isBanned;
      const banLifted = wasBanned && !nowBanned;

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
      if (banLifted) {
        // Ban was lifted - send unban notification
        transaction.set(inviterRef.collection('notifications').doc(), {
          type: 'spam',
          action: 'unbanned',
          message: `✅ You can now send invitations and direct messages again (spam reports decayed below 5).`,
          strikes: strikeResult.activeStrikes,
          timestamp: now,
          read: false,
        });
      } else if (shouldSendBanNotification(wasBanned, strikeResult)) {
        // Just got banned - send ban notification (24-hour ban)
        transaction.set(inviterRef.collection('notifications').doc(), {
          type: 'spam',
          action: 'banned',
          message:
            '🚫 You are restricted from sending invitations and direct messages for 24 hours due to spam reports.',
          strikes: strikeResult.activeStrikes,
          timestamp: now,
          read: false,
        });
      } else if (
        strikeResult.shouldNotify &&
        strikeResult.notificationType === 'warning'
      ) {
        // 3rd or 4th strike - send warning
        transaction.set(inviterRef.collection('notifications').doc(), {
          type: 'spam',
          action: 'warning',
          message: `⚠️ You have ${strikeResult.activeStrikes} spam reports. Be careful - 5 strikes will restrict invitations/DMs for 24 hours.`,
          strikes: strikeResult.activeStrikes,
          timestamp: now,
          read: false,
        });
      }
    });

    return { success: true };
  }
);

