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

