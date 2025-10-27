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
  notificationType: 'warning' | 'banned' | 'temp-banned' | null;
  isTempBanned?: boolean; // NEW: 24-hour ban (2 strikes in 24h)
  tempBanEndsAt?: number; // NEW: timestamp when temp ban expires
  isPermanentlyBanned?: boolean; // NEW: indefinite ban (5 strikes in 30d)
}

/**
 * Calculate active spam strikes with 1-month decay
 * AND check for 24-hour temporary ban (2+ strikes in 24h)
 * 
 * Ban Logic:
 * - 2+ strikes within 24 hours = 24-hour temp ban
 * - 5+ strikes within 30 days = indefinite ban (until strikes decay)
 */
export function calculateActiveStrikes(
  reports: SpamReport[],
  referenceDate: Date = new Date()
): SpamStrikeResult {
  const oneMonthAgo = new Date(referenceDate.getTime() - (30 * 24 * 60 * 60 * 1000));
  const oneDayAgo = new Date(referenceDate.getTime() - (24 * 60 * 60 * 1000));
  
  // Filter out reports older than 1 month
  const activeReports = reports.filter((report) => {
    const reportTime = report.timestamp instanceof Date
      ? report.timestamp.getTime()
      : report.timestamp.toMillis();
    return reportTime > oneMonthAgo.getTime();
  });
  
  // Check for 24-hour temporary ban (2+ strikes in last 24 hours)
  const recentReports = activeReports.filter((report) => {
    const reportTime = report.timestamp instanceof Date
      ? report.timestamp.getTime()
      : report.timestamp.toMillis();
    return reportTime > oneDayAgo.getTime();
  });
  
  const strikeCount = activeReports.length;
  const recentStrikeCount = recentReports.length;
  
  // Check if temp banned (2+ strikes in 24h)
  const isTempBanned = recentStrikeCount >= 2;
  let tempBanEndsAt: Date | undefined;
  
  if (isTempBanned && recentReports.length > 0) {
    // Temp ban ends 24 hours after the most recent strike
    const mostRecentStrike = recentReports.reduce((latest, report) => {
      const reportTime = report.timestamp instanceof Date
        ? report.timestamp.getTime()
        : report.timestamp.toMillis();
      return reportTime > latest ? reportTime : latest;
    }, 0);
    tempBanEndsAt = new Date(mostRecentStrike + (24 * 60 * 60 * 1000));
  }
  
  // Check if indefinitely banned (5+ strikes in 30 days)
  const isPermanentlyBanned = strikeCount >= 5;
  const isBanned = isPermanentlyBanned; // Legacy field for backward compatibility
  
  // Determine notification type
  let notificationType: 'warning' | 'banned' | 'temp-banned' | null = null;
  let shouldNotify = false;
  
  if (isPermanentlyBanned && strikeCount === 5) {
    // Just hit 5 strikes - indefinite ban
    notificationType = 'banned';
    shouldNotify = true;
  } else if (isTempBanned && recentStrikeCount === 2 && !isPermanentlyBanned) {
    // Just hit 2 strikes in 24h - temp ban (but not indefinite ban yet)
    notificationType = 'temp-banned';
    shouldNotify = true;
  } else if (strikeCount === 3 || strikeCount === 4) {
    // Warning at 3 or 4 strikes
    notificationType = 'warning';
    shouldNotify = true;
  }
  
  return {
    activeStrikes: strikeCount,
    isBanned,
    isTempBanned,
    tempBanEndsAt: tempBanEndsAt?.getTime(),
    isPermanentlyBanned,
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

