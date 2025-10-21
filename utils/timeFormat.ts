/**
 * Time formatting utilities
 * Used for message timestamps, last seen, conversation list
 */

/**
 * Format a timestamp relative to now (e.g., "2m ago", "3h ago")
 * @param date - Date object to format
 * @returns Formatted string
 */
export const formatTimestamp = (date: Date): string => {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return 'Just now';
  }
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  
  // For older messages, show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Format time for message bubble (e.g., "2:30 PM")
 * @param date - Date object to format
 * @returns Formatted time string
 */
export const formatMessageTime = (date: Date): string => {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format last seen time with "Last seen" prefix
 * @param date - Date object to format
 * @returns Formatted string with "Last seen" prefix
 */
export const formatLastSeen = (date: Date): string => {
  if (!date || !(date instanceof Date)) {
    return 'Last seen recently';
  }

  const timestamp = formatTimestamp(date);
  
  if (timestamp === 'Just now') {
    return 'Last seen just now';
  }
  
  return `Last seen ${timestamp}`;
};

/**
 * Format conversation list timestamp (today shows time, older shows date)
 * @param date - Date object to format
 * @returns Formatted string
 */
export const formatConversationTime = (date: Date): string => {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  const now = new Date();
  const isToday = 
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return formatMessageTime(date);
  }

  const isYesterday = 
    date.getDate() === now.getDate() - 1 &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  // Within this week, show day name
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // Older, show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

