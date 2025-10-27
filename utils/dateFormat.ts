/**
 * Format a Firestore timestamp or Date to a localized date string
 */
export function formatDate(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString();
}

/**
 * Format a date with specific options (for decisions timeline)
 */
export function formatDateDetailed(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string or null
 */
export function formatDateString(dateString: string | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

/**
 * Format timestamp to ISO string for JSON exports
 * Handles Firestore Timestamps, numbers, and Date objects
 */
export function timestampToISO(timestamp: any): string {
  if (!timestamp) return new Date().toISOString();
  
  // Firestore Timestamp
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  
  // Unix timestamp (milliseconds)
  if (typeof timestamp === 'number') {
    return new Date(timestamp).toISOString();
  }
  
  // Date object
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // String or unknown
  return new Date(timestamp).toISOString();
}

/**
 * Calculate days remaining until a future date
 * Returns undefined if date is in the past or invalid
 */
export function daysUntil(timestamp: any): number | undefined {
  if (!timestamp) return undefined;
  
  const targetDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  
  if (diffMs < 0) return undefined;
  
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a timestamp is in the past
 */
export function isPast(timestamp: any): boolean {
  if (!timestamp) return false;
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.getTime() < Date.now();
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(timestamp: any): string {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absDiffMs = Math.abs(diffMs);
  
  const seconds = Math.floor(absDiffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const future = diffMs > 0;
  
  if (days > 0) {
    return future ? `in ${days} day${days !== 1 ? 's' : ''}` : `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return future ? `in ${hours} hour${hours !== 1 ? 's' : ''}` : `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return future ? `in ${minutes} minute${minutes !== 1 ? 's' : ''}` : `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

