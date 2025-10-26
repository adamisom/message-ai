import * as admin from 'firebase-admin';

admin.initializeApp();

// Export Cloud Functions

// Phase 0: Embeddings
export {
    batchEmbedMessages, incrementMessageCounter, monitorRetryQueue, retryFailedEmbeddings
} from './ai/embeddings';

// Phase 1: AI Features
export { extractActionItems } from './ai/actionItems';
export { trackDecisions } from './ai/decisions';
export { batchAnalyzePriority, quickPriorityCheckTrigger } from './ai/priority';
export { semanticSearch } from './ai/search';
export { generateSummary } from './ai/summarization';

// Phase 3: Advanced AI Capability
export { analyzeMeetingScheduling } from './ai/proactiveMeeting';

// Phase 4: Workspaces & Paid Tier
export {
    acceptWorkspaceInvitation, createWorkspace,
    deleteWorkspace, reportWorkspaceInvitationSpam
} from './workspaces';

