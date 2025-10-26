/**
 * Phase 4: Spam Prevention Helpers
 * Pure functions for spam strike calculation and decay logic
 */

export interface SpamReport {
  reportedBy: string;
  timestamp: Date | { toMillis: () => number };
  reason: string;
  workspaceId?: string;
}

export interface SpamStrikeResult {
  activeStrikes: number;
  isBanned: boolean;
  shouldNotify: boolean;
  notificationType: 'warning' | 'banned' | null;
}

/**
 * Calculate active spam strikes with 1-month decay
 * Strikes older than 1 month are not counted
 */
export function calculateActiveStrikes(
  reports: SpamReport[],
  referenceDate: Date = new Date()
): SpamStrikeResult {
  const oneMonthAgo = new Date(referenceDate.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  // Filter out reports older than 1 month
  const activeReports = reports.filter((report) => {
    const reportTime = report.timestamp instanceof Date
      ? report.timestamp.getTime()
      : report.timestamp.toMillis();
    return reportTime > oneMonthAgo.getTime();
  });
  
  const strikeCount = activeReports.length;
  const isBanned = strikeCount >= 5;
  
  // Determine notification type
  let notificationType: 'warning' | 'banned' | null = null;
  let shouldNotify = false;
  
  if (strikeCount === 5) {
    notificationType = 'banned';
    shouldNotify = true;
  } else if (strikeCount === 3 || strikeCount === 4) {
    notificationType = 'warning';
    shouldNotify = true;
  }
  
  return {
    activeStrikes: strikeCount,
    isBanned,
    shouldNotify,
    notificationType,
  };
}

/**
 * Check if a new spam report should trigger a ban notification
 * (avoids duplicate notifications if already banned)
 */
export function shouldSendBanNotification(
  wasAlreadyBanned: boolean,
  newStrikeResult: SpamStrikeResult
): boolean {
  return newStrikeResult.isBanned && !wasAlreadyBanned;
}

