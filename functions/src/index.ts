import * as admin from 'firebase-admin';

admin.initializeApp();

// Export Cloud Functions

// Phase 0: Embeddings
export {
    batchEmbedMessages, incrementMessageCounter, monitorRetryQueue, retryFailedEmbeddings
} from './ai/embeddings';

// Phase 1: AI Features
export { extractActionItems } from './ai/actionItems';
export { assignActionItem } from './ai/assignActionItem';
export { trackDecisions } from './ai/decisions';
export { batchAnalyzePriority, quickPriorityCheckTrigger } from './ai/priority';
export { semanticSearch } from './ai/search';
export { generateSummary } from './ai/summarization';

// Phase 3: Advanced AI Capability
export { analyzeMeetingScheduling } from './ai/proactiveMeeting';

// Phase 4: Workspaces & Paid Tier
export {
    acceptWorkspaceInvitation, createWorkspace,
    declineWorkspaceInvitation,
    deleteWorkspace, reportWorkspaceInvitationSpam
} from './workspaces';

// Phase 4: Billing (MVP dummy payment)
export { downgradeToFree, startFreeTrial, upgradeToPro } from './billing';

// Sub-Phase 6.5: Group Chat Management
export { addMemberToGroupChat } from './groupChats/addMemberToGroupChat';

