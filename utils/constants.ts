/**
 * App-wide constants
 * Keep all magic numbers and strings here for easy modification
 */

// Message status constants
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
  QUEUED: 'queued',
} as const;

// Conversation type constants
export const CONVERSATION_TYPE = {
  DIRECT: 'direct',
  GROUP: 'group',
} as const;

// Limits and timeouts
export const MESSAGE_LIMIT = 100; // Load last 100 messages per conversation
export const TYPING_DEBOUNCE_MS = 500; // Debounce typing indicator updates
export const MESSAGE_TIMEOUT_MS = 10000; // 10 seconds before marking message as failed
export const TYPING_CLEAR_DELAY_MS = 500; // Clear typing indicator after 500ms inactivity

// UI Constants
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_MESSAGE_PREVIEW_LENGTH = 100;

// Type exports for TypeScript
export type MessageStatus = typeof MESSAGE_STATUS[keyof typeof MESSAGE_STATUS];
export type ConversationType = typeof CONVERSATION_TYPE[keyof typeof CONVERSATION_TYPE];

