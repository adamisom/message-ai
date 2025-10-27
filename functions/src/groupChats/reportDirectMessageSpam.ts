import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  calculateActiveStrikes,
  shouldSendBanNotification,
} from '../utils/spamHelpers';

const db = admin.firestore();

/**
 * Report a direct message as spam
 * 
 * Effects:
 * - Adds spam strike to reported user
 * - Blocks reported user from sending DMs to reporter
 * - Hides conversation from reporter's list
 * - Triggers ban if thresholds exceeded:
 *   - 2+ strikes in 24h = 24-hour temp ban
 *   - 5+ strikes in 30d = indefinite ban (until decay)
 */
export const reportDirectMessageSpam = functions.https.onCall(
  async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const { conversationId, reportedUserUid } = data;
    const reporterUid = context.auth.uid;

    if (!conversationId || !reportedUserUid) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'conversationId and reportedUserUid are required'
      );
    }

    // 2. Get conversation
    const conversationRef = db.collection('conversations').doc(conversationId);
    const conversationSnap = await conversationRef.get();

    if (!conversationSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Conversation not found'
      );
    }

    const conversation = conversationSnap.data()!;

    // 3. Verify it's a direct message
    if (conversation.type !== 'direct') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Can only report spam in direct messages'
      );
    }

    // 4. Verify both users are participants
    if (
      !conversation.participants.includes(reporterUid) ||
      !conversation.participants.includes(reportedUserUid)
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Both users must be participants'
      );
    }

    // 5. Get reported user's document
    const reportedUserRef = db.collection('users').doc(reportedUserUid);
    const reportedUserSnap = await reportedUserRef.get();

    if (!reportedUserSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Reported user not found'
      );
    }

    const reportedUser = reportedUserSnap.data()!;

    // 6. Check for duplicate report (same reporter, same conversation)
    const existingReports = reportedUser.spamReportsReceived || [];
    const duplicateReport = existingReports.find(
      (report: any) =>
        report.reportedBy === reporterUid &&
        report.reason === 'direct_message' &&
        report.conversationId === conversationId
    );

    if (duplicateReport) {
      throw new functions.https.HttpsError(
        'already-exists',
        'You have already reported this user'
      );
    }

    // 7. Add spam report
    const now = admin.firestore.FieldValue.serverTimestamp();
    const newReport = {
      reportedBy: reporterUid,
      reason: 'direct_message',
      timestamp: now,
      conversationId,
    };

    // 8. Calculate strikes BEFORE adding new report
    const wasAlreadyBanned = reportedUser.spamBanned || false;

    // 9. Run transaction to update reported user
    await db.runTransaction(async (transaction) => {
      // Add new report
      transaction.update(reportedUserRef, {
        spamReportsReceived: admin.firestore.FieldValue.arrayUnion(newReport),
      });

      // Calculate new strike status
      const reportsForCalculation = existingReports.map((report: any) => ({
        reportedBy: report.reportedBy,
        timestamp: report.timestamp,
        reason: report.reason,
        conversationId: report.conversationId,
        workspaceId: report.workspaceId,
      }));
      reportsForCalculation.push(newReport);

      const strikeResult = calculateActiveStrikes(reportsForCalculation);

      // Update strike count and ban status
      transaction.update(reportedUserRef, {
        spamStrikes: strikeResult.activeStrikes,
        spamBanned: strikeResult.isBanned || strikeResult.isTempBanned || false,
      });

      // Send notifications based on strike result
      if (strikeResult.shouldNotify) {
        if (strikeResult.notificationType === 'banned') {
          // Indefinite ban (5+ strikes in 30 days)
          transaction.set(reportedUserRef.collection('notifications').doc(), {
            type: 'spam',
            action: 'banned',
            message:
              '🚫 Your account is restricted from sending direct messages and invitations indefinitely due to spam reports. This ban will lift as reports expire after 30 days.',
            strikes: strikeResult.activeStrikes,
            timestamp: now,
            read: false,
          });
        } else if (strikeResult.notificationType === 'temp-banned') {
          // 24-hour temp ban (2+ strikes in 24h)
          transaction.set(reportedUserRef.collection('notifications').doc(), {
            type: 'spam',
            action: 'temp-banned',
            message:
              '⏰ Your account is restricted from sending direct messages and invitations for 24 hours due to multiple spam reports.',
            strikes: strikeResult.activeStrikes,
            tempBanEndsAt: strikeResult.tempBanEndsAt,
            timestamp: now,
            read: false,
          });
        } else if (strikeResult.notificationType === 'warning') {
          // Warning at 3-4 strikes
          transaction.set(reportedUserRef.collection('notifications').doc(), {
            type: 'spam',
            action: 'warning',
            message: `⚠️ You have ${strikeResult.activeStrikes} spam reports. Be careful - 5 strikes will restrict messaging/invitations indefinitely, and 2 strikes in 24 hours will ban you for 24 hours.`,
            strikes: strikeResult.activeStrikes,
            timestamp: now,
            read: false,
          });
        }
      }
    });

    // 10. Block reported user from sending DMs to reporter (separate transaction)
    const reporterRef = db.collection('users').doc(reporterUid);
    await reporterRef.update({
      blockedUsers: admin.firestore.FieldValue.arrayUnion(reportedUserUid),
      hiddenConversations: admin.firestore.FieldValue.arrayUnion(conversationId),
    });

    return { success: true };
  }
);

