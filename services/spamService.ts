import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase.config';

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
    const getStatus = httpsCallable(functions, 'getUserSpamStatus');
    const result = await getStatus();
    return result.data as SpamStatus;
  } catch (error: any) {
    console.error('[spamService] getUserSpamStatus error:', error);
    throw new Error(error.message || 'Failed to get spam status');
  }
}

