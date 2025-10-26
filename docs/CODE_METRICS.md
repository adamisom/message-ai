# MessageAI - Source Code Metrics

**Generated:** October 26, 2025

## Summary

- **Total Source Files:** 90 files
- **Total Lines (with comments & blanks):** 12,177 lines
- **Code Only (excluding comments & blank lines):** ~9,525 lines
- **Average Lines per File:** 135 lines

**Scope:** All TypeScript/JavaScript source files, excluding:
- Test files (`__tests__/`, `*.test.*`, `*.spec.*`)
- Node modules (`node_modules/`)
- Build artifacts (`lib/`)

---

## Files by Line Count (Largest First)

| Lines | File |
|------:|------|
| 1,052 | `./app/chat/[id].tsx` |
| 539 | `./components/ActionItemsModal.tsx` |
| 397 | `./components/MeetingSchedulerModal.tsx` |
| 357 | `./scripts/populateTestData.js` |
| 350 | `./scripts/deleteData.js` |
| 338 | `./app/(tabs)/new-chat.tsx` |
| 316 | `./components/SearchModal.tsx` |
| 302 | `./functions/src/utils/aiTools.ts` |
| 291 | `./functions/src/ai/embeddings.ts` |
| 286 | `./scripts/createPerformanceTestData.js` |
| 271 | `./components/MessageBubble.tsx` |
| 270 | `./app/(auth)/register.tsx` |
| 249 | `./app/(auth)/login.tsx` |
| 240 | `./services/aiService.ts` |
| 240 | `./app/(tabs)/index.tsx` |
| 225 | `./functions/src/ai/actionItems.ts` |
| 224 | `./components/SummaryModal.tsx` |
| 217 | `./components/ErrorFallback.tsx` |
| 217 | `./components/DecisionsModal.tsx` |
| 208 | `./components/AIFeaturesMenu.tsx` |
| 203 | `./services/firestoreService.ts` |
| 193 | `./functions/src/ai/proactiveMeeting.ts` |
| 192 | `./services/authService.ts` |
| 187 | `./components/ConversationItem.tsx` |
| 181 | `./components/MessageList.tsx` |
| 180 | `./scripts/testMessageBurst.js` |
| 170 | `./components/GroupParticipantsModal.tsx` |
| 168 | `./utils/timeFormat.ts` |
| 157 | `./components/MessageInput.tsx` |
| 148 | `./scripts/reEmbed.js` |
| 143 | `./functions/src/utils/conversationHelpers.ts` |
| 133 | `./functions/src/ai/search.ts` |
| 125 | `./scripts/addSchedulingMessagesAuto.js` |
| 124 | `./functions/src/ai/decisions.ts` |
| 123 | `./scripts/cleanupPerformanceTestData.js` |
| 122 | `./functions/src/ai/summarization.ts` |
| 120 | `./app/_layout.tsx` |
| 118 | `./types/index.ts` |
| 117 | `./functions/src/ai/priority.ts` |
| 115 | `./scripts/addSchedulingMessages.js` |
| 112 | `./utils/errorLogger.ts` |
| 110 | `./services/aiCacheService.ts` |
| 109 | `./styles/commonModalStyles.ts` |
| 107 | `./scripts/viewDebugLogs.js` |
| 106 | `./hooks/useAIFeature.ts` |
| 95 | `./services/failedMessagesService.ts` |
| 94 | `./utils/validators.ts` |
| 84 | `./utils/errorTranslator.ts` |
| 81 | `./services/notificationService.ts` |
| 80 | `./scripts/checkEmbeddings.js` |
| 77 | `./scripts/clearAICache.js` |
| 76 | `./store/authStore.ts` |
| 73 | `./functions/src/utils/rateLimit.ts` |
| 73 | `./functions/src/utils/anthropic.ts` |
| 71 | `./components/ErrorBoundary.tsx` |
| 65 | `./components/UserStatusBadge.tsx` |
| 63 | `./functions/src/utils/pinecone.ts` |
| 55 | `./scripts/clearDebugLogs.js` |
| 55 | `./functions/src/utils/validation.ts` |
| 49 | `./utils/featureFlags.ts` |
| 49 | `./firebase.config.ts` |
| 48 | `./components/OfflineBanner.tsx` |
| 47 | `./utils/conversationHelpers.ts` |
| 47 | `./app/index.tsx` |
| 45 | `./functions/src/utils/security.ts` |
| 40 | `./components/TypingIndicator.tsx` |
| 39 | `./store/chatStore.ts` |
| 39 | `./functions/src/utils/caching.ts` |
| 38 | `./utils/colors.ts` |
| 38 | `./functions/src/utils/priorityHeuristics.ts` |
| 37 | `./services/presenceService.ts` |
| 36 | `./functions/jest.config.js` |
| 35 | `./app/(tabs)/_layout.tsx` |
| 34 | `./functions/.eslintrc.js` |
| 33 | `./utils/constants.ts` |
| 33 | `./functions/src/utils/openai.ts` |
| 33 | `./components/modals/ErrorState.tsx` |
| 31 | `./utils/dateFormat.ts` |
| 29 | `./jest.config.js` |
| 27 | `./utils/colorHelpers.ts` |
| 25 | `./components/modals/LoadingState.tsx` |
| 25 | `./components/modals/EmptyState.tsx` |
| 24 | `./functions/src/index.ts` |
| 23 | `./components/modals/ModalHeader.tsx` |
| 21 | `./app/(auth)/_layout.tsx` |
| 17 | `./components/index.ts` |
| 15 | `./functions/src/utils/timeout.ts` |
| 14 | `./.expo/types/router.d.ts` |
| 10 | `./eslint.config.js` |
| 2 | `./expo-env.d.ts` |

---

## Top 10 Largest Files

1. **app/chat/[id].tsx** (1,052 lines) - Main chat screen with messaging, pagination, AI features
2. **components/ActionItemsModal.tsx** (539 lines) - Action items extraction and management UI
3. **components/MeetingSchedulerModal.tsx** (397 lines) - Smart meeting time suggestions UI
4. **scripts/populateTestData.js** (357 lines) - Test data generation script
5. **scripts/deleteData.js** (350 lines) - Data cleanup utility
6. **app/(tabs)/new-chat.tsx** (338 lines) - New chat creation (direct + group)
7. **components/SearchModal.tsx** (316 lines) - Semantic search UI
8. **functions/src/utils/aiTools.ts** (302 lines) - AI tool definitions for Claude
9. **functions/src/ai/embeddings.ts** (291 lines) - Embedding generation pipeline
10. **scripts/createPerformanceTestData.js** (286 lines) - Performance test data script

---

## Breakdown by Category

### Frontend (App & Components)
- **App Screens:** 2,336 lines (7 files)
- **Components:** 3,116 lines (21 files)
- **Services:** 921 lines (6 files)
- **Stores:** 115 lines (2 files)
- **Utils:** 568 lines (10 files)
- **Styles:** 109 lines (1 file)
- **Hooks:** 106 lines (1 file)
- **Types:** 118 lines (1 file)

**Frontend Subtotal:** ~7,389 lines

### Backend (Cloud Functions)
- **AI Features:** 1,174 lines (7 files)
- **Utils:** 601 lines (12 files)
- **Index:** 24 lines (1 file)

**Backend Subtotal:** ~1,799 lines

### Scripts & Config
- **Scripts:** 2,231 lines (13 files)
- **Config:** 110 lines (4 files)

**Scripts Subtotal:** ~2,341 lines

---

## Commands to Reproduce

### Count All Source Files (Excluding Tests)
```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/__tests__/*" \
  ! -path "*/lib/*" \
  ! -name "*.test.*" \
  ! -name "*.spec.*" \
  | wc -l
```

### Get Line Counts Sorted by Size
```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/__tests__/*" \
  ! -path "*/lib/*" \
  ! -name "*.test.*" \
  ! -name "*.spec.*" \
  -exec wc -l {} + \
  | sort -rn
```

### Count Lines Excluding Comments & Blank Lines
```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/__tests__/*" \
  ! -path "*/lib/*" \
  ! -name "*.test.*" \
  ! -name "*.spec.*" \
  -exec cat {} + \
  | grep -v '^\s*\/\/' \
  | grep -v '^\s*\*' \
  | grep -v '^\s*$' \
  | wc -l
```

**Note:** The comment-stripping command is approximate. It removes:
- Lines starting with `//` (single-line comments)
- Lines starting with `*` (multi-line comment content)
- Blank lines

It does NOT remove inline comments (e.g., `const x = 5; // comment`), so the actual code-only count may be slightly lower.

---

## Analysis

### Largest Component
**chat/[id].tsx** is by far the largest file (1,052 lines), containing:
- Message fetching & pagination logic
- Real-time listeners (messages, typing, presence)
- AI features integration (6 modals)
- Message send/retry/delete
- Scroll management
- Read receipt calculations

**Recommendation:** Consider refactoring into smaller modules.

### AI Features
The 6 AI modals total **2,195 lines**:
- ActionItemsModal: 539 lines
- MeetingSchedulerModal: 397 lines
- SearchModal: 316 lines
- SummaryModal: 224 lines
- DecisionsModal: 217 lines
- AIFeaturesMenu: 208 lines (not a modal, but AI UI)

### Scripts
13 utility scripts total **2,231 lines**, mostly for:
- Test data generation/cleanup
- Data manipulation
- Performance testing
- Development utilities

### Code Density
- **Total lines:** 12,177
- **Code-only:** ~9,525 (78%)
- **Comments & whitespace:** ~2,652 (22%)

This indicates good code documentation with ~22% comments/whitespace, which is healthy for maintainability.

---

**Last Updated:** October 26, 2025

