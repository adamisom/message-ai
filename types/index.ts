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
  // AI features
  embedded?: boolean;
  embeddedAt?: any;
  priority?: 'high' | 'medium' | 'low';
  priorityQuick?: 'high' | 'low' | 'unknown';
  priorityAnalyzedAt?: any;
  priorityNeedsAnalysis?: boolean;
}

// ===== CONVERSATION TYPES =====

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  participantDetails: Record<string, {displayName: string; email: string}>;
  lastMessageAt?: any;
  lastMessage?: string | null;
  lastRead?: Record<string, string>; // Phase 5: uid -> messageId for read receipts
  lastReadAt?: Record<string, any>; // Phase 5: uid -> timestamp for unread indicators
  createdAt?: any;
  creatorId?: string;
  messageCount?: number;
  // Phase 4: Workspace fields
  workspaceId?: string;
  workspaceName?: string;
  isWorkspaceChat?: boolean;
}

// ===== USER TYPES =====

export interface User {
  uid: string;
  email: string;
  displayName: string;
  isOnline?: boolean;
  lastSeenAt?: any;
  
  // Phase 4: Paid tier fields
  isPaidUser?: boolean;
  subscriptionTier?: 'free' | 'pro';
  subscriptionStartedAt?: any;
  subscriptionEndsAt?: any;
  stripeCustomerId?: string;
  
  // Phase 4: Free trial fields
  trialStartedAt?: any;
  trialEndsAt?: any;
  trialUsed?: boolean;
  
  // Phase 4: Workspace fields
  workspacesOwned?: string[];
  workspacesMemberOf?: string[];
  
  // Phase 4: Spam prevention
  spamStrikes?: number;
  spamBanned?: boolean;
  spamReportsReceived?: Array<{
    reportedBy: string;
    reason: 'workspace' | 'groupChat';
    timestamp: any;
    workspaceId?: string;
    conversationId?: string;
  }>;
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

// ===== AI FEATURE TYPES =====

export interface Summary {
  summary: string;
  keyPoints: string[];
  messageCount: number;
  generatedAt: any;
  generatedBy: string;
}

export interface ActionItem {
  id: string;
  text: string;
  assigneeUid: string | null;
  assigneeDisplayName: string | null;
  assigneeEmail: string | null;
  dueDate: string | null;
  sourceMessageId: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  sourceType: 'ai';
  extractedAt: any;
  extractedBy: string;
  completedAt?: any;
}

export interface Decision {
  id: string;
  decision: string;
  context: string;
  participants: string[];
  sourceMessageIds: string[];
  confidence: number;
  decidedAt: any;
  extractedAt: any;
}

export interface SearchResult {
  id: string;
  conversationId: string;
  text: string;
  senderName: string;
  senderId: string;
  createdAt: any;
  score?: number;
  source?: 'vector' | 'local';
}

// ===== PHASE 4: WORKSPACE TYPES =====

export * from './workspace';
