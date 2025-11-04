import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Get User Spam Status - Sub-Phase 8
 * Returns current spam strike count and warnings for approaching bans
 */
export const getUserSpamStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userRef = db.collection('users').doc(context.auth.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data()!;
  const spamReports = userData.spamReportsReceived || [];

  // Calculate active strikes (within 30 days)
  const now = admin.firestore.Timestamp.now();
  const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 30 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000);

  const activeStrikes = spamReports.filter(
    (report: any) => report.timestamp?.toMillis?.() > thirtyDaysAgo.toMillis()
  );

  const recentStrikes = spamReports.filter(
    (report: any) => report.timestamp?.toMillis?.() > twentyFourHoursAgo.toMillis()
  );

  // Calculate ban status
  const strikeCount = activeStrikes.length;
  const recentStrikeCount = recentStrikes.length;
  
  let status: 'good' | 'warning' | 'danger' | 'temp_banned' | 'permanently_banned' = 'good';
  let message = '';
  let banEndsAt = null;

  // Check for permanent ban (5 strikes in 30 days)
  if (strikeCount >= 5) {
    status = 'permanently_banned';
    message = 'Your account is permanently banned from sending invitations and direct messages due to spam reports.';
  }
  // Check for temp ban (2+ strikes in 24 hours)
  else if (recentStrikeCount >= 2) {
    status = 'temp_banned';
    const mostRecentStrike = recentStrikes[recentStrikes.length - 1];
    const strikeTime = mostRecentStrike.timestamp?.toMillis?.() || Date.now();
    banEndsAt = admin.firestore.Timestamp.fromMillis(
      strikeTime + 24 * 60 * 60 * 1000
    );
    const hoursRemaining = Math.ceil((banEndsAt.toMillis() - now.toMillis()) / (60 * 60 * 1000));
    message = `Your account is temporarily banned for ${hoursRemaining} hours due to receiving 2 spam reports within 24 hours.`;
  }
  // Approaching permanent ban
  else if (strikeCount === 4) {
    status = 'danger';
    message = '⚠️ FINAL WARNING: You have 4 spam reports. One more report will result in a permanent ban from sending invitations and direct messages.';
  }
  else if (strikeCount === 3) {
    status = 'warning';
    message = '⚠️ Warning: You have 3 spam reports in the last 30 days. Continue at your own risk - 2 more reports will result in a permanent ban.';
  }
  else {
    status = 'good';
    message = `You have ${strikeCount} spam report(s) in the last 30 days. Spam reports expire after 30 days.`;
  }

  return {
    strikeCount,
    recentStrikeCount,
    status,
    message,
    banEndsAt: banEndsAt?.toMillis() || null,
    activeReports: activeStrikes.map((report: any) => ({
      reason: report.reason,
      reportedAt: report.reportedAt.toMillis(),
    })),
  };
});

