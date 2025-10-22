/**
 * Shared TypeScript types for the MessageAI app
 * Single source of truth for all type definitions
 */

// ===== MESSAGE TYPES =====

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date | { toDate: () => Date } | null;
  participants: string[];
  status?: 'sending' | 'sent' | 'failed' | 'queued';
}

// ===== CONVERSATION TYPES =====

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  participantDetails: Record<string, { displayName: string; email: string }>;
  lastMessageAt?: any;
  lastMessage?: string | null;
  lastRead?: Record<string, string>; // Phase 5: uid -> messageId for read receipts
  createdAt?: any;
  creatorId?: string;
}

// ===== USER TYPES =====

export interface User {
  uid: string;
  email: string;
  displayName: string;
  isOnline?: boolean;
  lastSeenAt?: any;
}

export interface UserStatusInfo {
  isOnline: boolean;
  lastSeenAt: any;
}

// ===== TYPING INDICATOR TYPES =====

export interface TypingUser {
  uid: string;
  displayName: string;
  at: any;
}

// ===== UTILITY TYPES =====

export type MessageStatus = 'sending' | 'sent' | 'failed' | 'queued';
export type ConversationType = 'direct' | 'group';

