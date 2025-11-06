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

  // Sub-Phase 11: Message editing/deletion (Pro feature)
  isEdited?: boolean;
  editedAt?: any;
  isDeleted?: boolean;
  deletedAt?: any;
  deletedBy?: string; // UID of user who deleted it
  
  // Sub-Phase 7: Manual urgency markers (two-field system)
  hasManualUrgencyOverride?: boolean;  // true if admin has manually set urgency (overrides AI)
  showUrgentBadge?: boolean;          // the actual value: true = show badge, false = don't show
  markedUrgentBy?: string;            // Admin UID
  markedUrgentAt?: any;
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
  // Phase 4: Soft delete
  inactiveParticipants?: string[]; // UIDs of users who have "deleted" this chat
  
  // Sub-Phase 7: Pinned messages
  pinnedMessages?: {          // Max 5
    messageId: string;              // Reference to message doc
    pinnedBy: string;               // Admin UID
    pinnedAt: any;
    order: number;                  // 0-4, for display sequence
  }[];
}

// ===== USER TYPES =====

export interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string; // 10 digits, US/Canada only - REQUIRED for signup
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
  spamReportsReceived?: {
    reportedBy: string;
    reason: 'workspace' | 'groupChat';
    timestamp: any;
    workspaceId?: string;
    conversationId?: string;
  }[];
  
  // Sub-Phase 6.5: User blocking & conversation hiding
  blockedUsers?: string[]; // UIDs of users this user has blocked (DM only)
  hiddenConversations?: string[]; // Conversation IDs this user has hidden (spam reports)
  
  // Sub-Phase 11 (Polish): DM Privacy Settings
  dmPrivacySetting?: 'private' | 'public'; // Default: 'private' (requires invitation)
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
  model?: string;
  
  // Sub-Phase 7: Edit & Save AI Content
  editedByAdmin?: boolean;        // Flag: admin saved custom version
  savedByAdmin?: string;          // Admin UID who saved
  savedAt?: any;                  // When saved
  originalAiVersion?: {           // Keep original AI for reference
    summary: string;
    keyPoints: string[];
    generatedAt: any;
  };
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
  
  // Sub-Phase 7: Edit & Save AI Content
  editedByAdmin?: boolean;        // Flag: admin saved custom version
  savedByAdmin?: string;          // Admin UID who saved
  savedAt?: any;                  // When saved
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
  
  // Sub-Phase 7: Edit & Save AI Content
  editedByAdmin?: boolean;        // Flag: admin saved custom version
  savedByAdmin?: string;          // Admin UID who saved
  savedAt?: any;                  // When saved
  originalAiVersion?: {           // Keep original AI for reference
    decision: string;
    context: string;
    extractedAt: any;
  };
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

// ===== INVITATION TYPES =====

export type InvitationType = 'workspace' | 'group_chat' | 'direct_message';

export interface UnifiedInvitation {
  id: string;
  type: InvitationType;
  name: string; // workspace name, conversation name, or inviter name for DMs
  invitedByDisplayName: string;
  sentAt: any;
  // Workspace-specific
  workspaceId?: string;
  workspaceName?: string;
  // Group chat-specific
  conversationId?: string;
  conversationName?: string;
  // DM-specific
  inviterPhone?: string;
}

// ===== PHASE 4: WORKSPACE TYPES =====

export * from './workspace';
