import * as admin from 'firebase-admin';

admin.initializeApp();

// Export Cloud Functions
export {
  batchEmbedMessages,
  retryFailedEmbeddings,
  monitorRetryQueue,
  incrementMessageCounter,
} from './ai/embeddings';

// These will be added in Phase 1:
// export { generateSummary } from './ai/summarization';
// export { extractActionItems } from './ai/actionItems';
// export { semanticSearch } from './ai/search';
// export { quickPriorityCheck, batchAnalyzePriority } from './ai/priority';
// export { trackDecisions } from './ai/decisions';

