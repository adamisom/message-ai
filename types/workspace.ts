import { Timestamp } from 'firebase/firestore';

/**
 * Workspace - Team collaboration space with admin controls
 */
export interface Workspace {
  id: string;
  name: string;
  adminUid: string;
  adminDisplayName: string;
  members: string[]; // Array of member UIDs (max 25)
  memberDetails: {
    [uid: string]: {
      displayName: string;
      email: string;
      joinedAt: Timestamp;
      role: 'admin' | 'member';
    };
  };
  createdAt: Timestamp;

  // Billing
  maxUsersThisMonth: number; // Admin's chosen capacity (pays for all seats)
  billingCycleStart: Timestamp;
  currentMonthCharge: number; // $0.50 × maxUsersThisMonth
  isActive: boolean; // False if payment lapsed
  readOnlySince?: Timestamp; // Set when payment fails (no deletion)

  // Statistics
  groupChatCount: number;
  directChatCount: number;
  totalMessages: number;
  
  // Sub-Phase 7: Admin features
  autoUrgencyEnabled?: boolean;         // Default: true (AI urgency detection)
  pendingCapacityChange?: {             // For downgrades (future)
    newMaxUsers: number;
    requestedAt: Timestamp;
    effectiveDate: Timestamp;           // 1st of next month
  };
}

/**
 * Workspace Invitation - Pending invitation to join workspace
 */
export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  invitedByUid: string;
  invitedByDisplayName: string;
  invitedUserUid: string;
  invitedUserEmail: string;
  status: 'pending' | 'accepted' | 'declined' | 'spam';
  sentAt: Timestamp;
  respondedAt?: Timestamp;
}

/**
 * Workspace Member Details
 */
export interface WorkspaceMember {
  uid: string;
  displayName: string;
  email: string;
  joinedAt: Timestamp;
  role: 'admin' | 'member';
}

/**
 * Create Workspace Request
 */
export interface CreateWorkspaceRequest {
  name: string;
  maxUsers: number; // 2-25
  initialMemberEmails?: string[];
}

/**
 * Workspace Creation Result
 */
export interface CreateWorkspaceResult {
  workspace: Workspace;
  invitationsSent: number;
}

/**
 * Billing Event - Sub-Phase 7: Capacity expansion tracking
 */
export interface BillingEvent {
  id: string;
  type: 'expansion' | 'downgrade_requested' | 'downgrade_applied' | 'payment_failed' | 'payment_recovered';
  timestamp: Timestamp;
  triggeredBy: string;                 // Admin UID
  
  details: {
    oldCapacity?: number;
    newCapacity?: number;
    proratedCharge?: number;
    daysRemaining?: number;
    paymentIntentId?: string;          // Stripe reference (production)
    errorMessage?: string;             // If payment failed
  };
}

