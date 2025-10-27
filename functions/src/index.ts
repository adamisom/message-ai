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

// Sub-Phase 7: Edit & Save AI Content
export { saveEditedActionItems } from './ai/saveEditedActionItems';
export { saveEditedDecision } from './ai/saveEditedDecision';
export { saveEditedSummary } from './ai/saveEditedSummary';

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
export { acceptGroupChatInvitation } from './groupChats/acceptGroupChatInvitation';
export { addMemberToGroupChat } from './groupChats/addMemberToGroupChat';
export { declineGroupChatInvitation } from './groupChats/declineGroupChatInvitation';
export { reportDirectMessageSpam } from './groupChats/reportDirectMessageSpam';
export { reportGroupChatInvitationSpam } from './groupChats/reportGroupChatInvitationSpam';

// Sub-Phase 7: Workspace Admin Features
export { expandWorkspaceCapacity } from './workspaces/capacityExpansion';
export { pinMessage, unpinMessage } from './workspaces/pinnedMessages';
export { markMessageUrgent, unmarkMessageUrgent } from './workspaces/urgencyMarkers';

// Sub-Phase 8: Enhanced Spam Reporting
export { getUserSpamStatus } from './spam/getUserSpamStatus';


