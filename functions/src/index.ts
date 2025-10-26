import * as admin from 'firebase-admin';

admin.initializeApp();

// Export Cloud Functions

// Phase 0: Embeddings
export {
  batchEmbedMessages,
  retryFailedEmbeddings,
  monitorRetryQueue,
  incrementMessageCounter,
} from './ai/embeddings';

// Phase 1: AI Features
export {semanticSearch} from './ai/search';
export {quickPriorityCheckTrigger, batchAnalyzePriority} from './ai/priority';
export {generateSummary} from './ai/summarization';
export {extractActionItems} from './ai/actionItems';
export {trackDecisions} from './ai/decisions';

// Phase 3: Advanced AI Capability
export {analyzeMeetingScheduling} from './ai/proactiveMeeting';

// Phase 4: Workspaces & Paid Tier
export {
  createWorkspace,
  deleteWorkspace,
  acceptWorkspaceInvitation,
  reportWorkspaceInvitationSpam,
} from './workspaces';

