import { callCloudFunction } from './cloudFunctions';

export interface SpamStatus {
  strikeCount: number;
  recentStrikeCount: number;
  status: 'good' | 'warning' | 'danger' | 'temp_banned' | 'permanently_banned';
  message: string;
  banEndsAt: number | null;
  activeReports: {
    reason: string;
    reportedAt: number;
  }[];
}

/**
 * Get current user's spam status
 */
export async function getUserSpamStatus(): Promise<SpamStatus> {
  try {
    const result = await callCloudFunction<SpamStatus>('getUserSpamStatus', {});
    return result;
  } catch (error: any) {
    console.error('[spamService] getUserSpamStatus error:', error);
    throw new Error(error.message || 'Failed to get spam status');
  }
}

