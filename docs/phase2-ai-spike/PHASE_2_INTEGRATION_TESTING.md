# PHASE 2: INTEGRATION & TESTING

**Frontend Integration, Testing & Deployment**

---

## Phase Overview

**Goal:** Integrate AI features into the React Native app, perform comprehensive testing, and deploy to production with monitoring.

**What You'll Build:**
- AI service layer in frontend
- UI components (modals for search, summaries, action items, decisions)
- Priority badges in message bubbles
- Comprehensive end-to-end tests
- Production deployment scripts
- Monitoring and alerting infrastructure

**Time Estimate:** 12-15 hours

**Stages in This Phase:**
1. [Stage 8: Frontend Integration](#stage-8-frontend-integration) - UI components & service layer
2. [Stage 9: Testing & Validation](#stage-9-testing--validation) - E2E testing
3. [Stage 10: Deployment & Monitoring](#stage-10-deployment--monitoring) - Production deployment

---

## Navigation

- **Previous Phase:** [PHASE_1_FEATURES.md](./PHASE_1_FEATURES.md) - AI Feature Implementation
- **Related:** [PHASE_0_SETUP.md](./PHASE_0_SETUP.md) - Infrastructure & Setup

---

## Stage 8: Frontend Integration

**Goal:** Integrate all AI features into the existing app

### Task 8.1: Update Chat Screen Navigation
**Estimated Time:** 1.5 hours  
**Dependencies:** Stages 3-7 complete

**Subtasks:**

- [ ] **8.1.1: Add AI Features Menu to Chat Screen**
  - **File:** `app/chat/[id].tsx`
  - **Add:** Three-dot menu or bottom sheet with AI options
  - **Menu Items:**
    - 🔍 Search Messages
    - 📝 Summarize Thread
    - ✅ Action Items
    - 📋 Decisions
  - **Implementation:**
    ```tsx
    import { useState } from 'react';
    import { Menu, IconButton } from 'react-native-paper';
    import { SearchModal } from '../../components/SearchModal';
    import { SummaryModal } from '../../components/SummaryModal';
    import { ActionItemsModal } from '../../components/ActionItemsModal';
    import { DecisionsModal } from '../../components/DecisionsModal';
    
    export default function ChatScreen() {
      const [menuVisible, setMenuVisible] = useState(false);
      const [searchVisible, setSearchVisible] = useState(false);
      const [summaryVisible, setSummaryVisible] = useState(false);
      const [actionItemsVisible, setActionItemsVisible] = useState(false);
      const [decisionsVisible, setDecisionsVisible] = useState(false);
      
      return (
        <View>
          {/* Header with AI menu */}
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setSearchVisible(true);
                setMenuVisible(false);
              }}
              title="🔍 Search Messages"
            />
            <Menu.Item
              onPress={() => {
                setSummaryVisible(true);
                setMenuVisible(false);
              }}
              title="📝 Summarize Thread"
            />
            <Menu.Item
              onPress={() => {
                setActionItemsVisible(true);
                setMenuVisible(false);
              }}
              title="✅ Action Items"
            />
            <Menu.Item
              onPress={() => {
                setDecisionsVisible(true);
                setMenuVisible(false);
              }}
              title="📋 Decisions"
            />
          </Menu>
          
          {/* Existing chat UI */}
          
          {/* AI Modals */}
          <SearchModal
            visible={searchVisible}
            conversationId={conversationId}
            onClose={() => setSearchVisible(false)}
            onSelectMessage={handleJumpToMessage}
          />
          <SummaryModal
            visible={summaryVisible}
            conversationId={conversationId}
            onClose={() => setSummaryVisible(false)}
          />
          <ActionItemsModal
            visible={actionItemsVisible}
            conversationId={conversationId}
            onClose={() => setActionItemsVisible(false)}
          />
          <DecisionsModal
            visible={decisionsVisible}
            conversationId={conversationId}
            onClose={() => setDecisionsVisible(false)}
          />
        </View>
      );
    }
    ```

- [ ] **8.1.2: Implement Jump to Message Functionality**
  - **File:** `app/chat/[id].tsx`
  - **Purpose:** Allow search results to scroll to specific message
  - **Add:** Ref to MessageList component
  - **Implementation:**
    ```tsx
    const messageListRef = useRef(null);
    
    const handleJumpToMessage = (messageId: string) => {
      // Find message index in current messages array
      const index = messages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        messageListRef.current?.scrollToIndex({ index, animated: true });
        // Optionally highlight message
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 2000);
      }
    };
    ```

### Task 8.2: Update Types and Exports
**Estimated Time:** 30 minutes  
**Dependencies:** None

**Subtasks:**

- [ ] **8.2.1: Update Type Definitions**
  - **File:** `types/index.ts`
  - **Add:**
    ```typescript
    export interface ActionItem {
      id: string;
      text: string;
      assigneeUid?: string;
      assigneeDisplayName?: string;
      assigneeEmail?: string;
      dueDate?: string;
      sourceMessageId: string;
      priority: 'high' | 'medium' | 'low';
      status: 'pending' | 'completed';
      sourceType: 'ai';
      extractedAt: Timestamp;
      extractedBy: string;
      completedAt?: Timestamp;
    }
    
    export interface Decision {
      id: string;
      decision: string;
      context: string;
      participants: string[];
      sourceMessageIds: string[];
      decidedAt: Timestamp;
      extractedAt: Timestamp;
    }
    
    export interface Summary {
      summary: string;
      keyPoints: string[];
      messageCount: number;
      startMessageId: string;
      endMessageId: string;
      startTimestamp: Timestamp;
      endTimestamp: Timestamp;
      generatedAt: Timestamp;
      generatedBy: string;
      model: string;
    }
    ```

- [ ] **8.2.2: Export All AI Components**
  - **File:** `components/index.ts` (create if doesn't exist)
  - **Add:**
    ```typescript
    export { SearchModal } from './SearchModal';
    export { SummaryModal } from './SummaryModal';
    export { ActionItemsModal } from './ActionItemsModal';
    export { DecisionsModal } from './DecisionsModal';
    ```

### Task 8.3: Add Loading States and Error Handling
**Estimated Time:** 1 hour  
**Dependencies:** Task 8.1

**Subtasks:**

- [ ] **8.3.1: Standardize Error Messages**
  - **File:** `services/aiService.ts`
  - **Add:** Error message mapping
  - **Implementation:**
    ```typescript
    function getErrorMessage(error: any): string {
      if (error.message === 'Request timeout') {
        return 'AI feature is taking longer than expected. Please try again.';
      }
      if (error.code === 'unauthenticated') {
        return 'You must be logged in to use AI features.';
      }
      if (error.code === 'permission-denied') {
        return 'You do not have access to this conversation.';
      }
      if (error.code === 'resource-exhausted') {
        return 'You have exceeded your AI usage limit. Please try again later.';
      }
      return error.message || 'An error occurred. Please try again.';
    }
    
    // Update all AI functions to use this
    export async function searchMessages(...) {
      try {
        return await callAIFeatureWithTimeout(...);
      } catch (error: any) {
        throw new Error(getErrorMessage(error));
      }
    }
    ```

- [ ] **8.3.2: Add Retry Buttons to Modals**
  - **All Modal Files:** SearchModal, SummaryModal, ActionItemsModal, DecisionsModal
  - **Add:** Retry button when error occurs
  - **Example:**
    ```tsx
    {error && (
      <View>
        <Text style={{ color: 'red' }}>{error}</Text>
        <TouchableOpacity onPress={loadData}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    )}
    ```

---

## Stage 9: Testing & Validation

**Goal:** Comprehensive testing of all AI features

### Task 9.1: Unit Tests for Cloud Functions
**Estimated Time:** 4 hours  
**Dependencies:** Stages 1-7 complete

**Subtasks:**

- [ ] **9.1.1: Set Up Cloud Functions Testing**
  - **Install:** `npm install --save-dev @firebase/rules-unit-testing mocha`
  - **File:** `functions/test/ai.test.ts` (NEW)
  - **Purpose:** Test AI Cloud Functions

- [ ] **9.1.2: Test Utility Functions**
  - **Test:** `utils/priorityHeuristics.ts`
  - **Test:** `utils/validation.ts` (parseAIResponse)
  - **Test:** `utils/security.ts` (verifyConversationAccess)
  - **Test:** `utils/caching.ts` (getCachedResult)

- [ ] **9.1.3: Test Rate Limiting**
  - **Test:** `checkAIRateLimit()` function
  - **Test Cases:**
    - First action this month
    - Under hourly limit
    - Over hourly limit (should deny)
    - Over monthly limit (should deny)
    - Hourly reset after 1 hour

- [ ] **9.1.4: Test Assignee Resolution**
  - **Test:** `resolveAssignee()` in action items
  - **Test Cases:**
    - Email match
    - Display name match (unique)
    - Display name match (ambiguous - should return null)
    - No match (should return null)

### Task 9.2: Integration Tests
**Estimated Time:** 3 hours  
**Dependencies:** Task 9.1

**Subtasks:**

- [ ] **9.2.1: Test Complete Embedding Pipeline**
  - Send 100 messages
  - Wait 6 minutes
  - Verify all have `embedded: true`
  - Verify Pinecone has 100 vectors
  - Search for message
  - Verify results returned

- [ ] **9.2.2: Test All AI Features End-to-End**
  - Create conversation with 50 messages
  - Test summarization (cache miss then cache hit)
  - Test action item extraction
  - Test decision tracking
  - Test search (vector + local fallback)
  - Verify priority badges appear

- [ ] **9.2.3: Test Error Recovery**
  - Simulate OpenAI API failure (break key)
  - Send messages
  - Verify messages still sent
  - Verify retry queue populated
  - Fix key
  - Verify retry processor works

### Task 9.3: Manual Frontend Testing Checklist
**Estimated Time:** 3 hours  
**Dependencies:** Task 9.2

**Subtasks:**

- [ ] **9.3.1: Test Smart Search UI**
  - **Setup:** Create conversation with 50+ messages
  - **Send message:** "Let's discuss the Q4 budget allocation"
  - **Wait:** 6 minutes (embedding delay)
  - **Tap:** Search icon/button in chat header
  - **Type:** "budget planning" in search box
  - **Verify:** Modal shows results with semantic match
  - **Verify:** Message found even though exact keywords don't match
  - **Send message:** "TESTXYZ123 unique keyword"
  - **Immediately tap:** Search
  - **Type:** "TESTXYZ123"
  - **Verify:** Message found with "📍 Recent" badge (local search)
  - **Wait:** 6 minutes
  - **Search again:** "TESTXYZ123"
  - **Verify:** Message found with "🔍 Search" badge (vector search)
  - **Pass Criteria:** Search UI works, hybrid fallback functions

- [ ] **9.3.2: Test Priority Badges**
  - **Send message:** "URGENT: Server is down!!!"
  - **Verify:** Message immediately shows 🔴 high priority badge
  - **Check Firestore:** `priorityQuick: 'high'`, `priority: 'high'`
  - **Wait:** 15 minutes (batch AI analysis)
  - **Verify:** Badge still shows (AI confirmed)
  - **Send message:** "lol 😊"
  - **Verify:** No priority badge shown
  - **Check Firestore:** `priorityQuick: 'low'`, `priority: 'low'`
  - **Send message:** "IMPORTANT meeting notes"
  - **Verify:** Shows 🔴 badge initially (heuristic keyword match)
  - **Wait:** 15 minutes
  - **Verify:** Badge removed or changed (AI determined not urgent)
  - **Check:** Notification about priority downgrade
  - **Pass Criteria:** Priority badges display correctly, AI refinement works

- [ ] **9.3.3: Test Thread Summarization UI**
  - **Setup:** Create conversation with 50+ messages
  - **Tap:** "Summarize" button (or 3-dot menu → Summarize)
  - **Select:** "50 msgs" option
  - **Verify:** Loading indicator appears
  - **Verify:** Summary modal appears within 10 seconds
  - **Verify:** Summary accurately reflects conversation
  - **Verify:** Key points (3-10) are relevant
  - **Close modal, tap "Summarize" again immediately**
  - **Verify:** Response < 1 second (cache hit, no loading)
  - **Send:** 3 new messages
  - **Tap:** "Summarize"
  - **Verify:** Still cache hit (< 5 new messages)
  - **Send:** 3 more messages (total 6 new)
  - **Tap:** "Summarize"
  - **Verify:** Loading indicator (cache miss, regenerating)
  - **Pass Criteria:** Summarization UI works, caching visible to user

- [ ] **9.3.4: Test Action Items UI**
  - **Send messages:**
    - "John needs to review the budget by Friday"
    - "Can someone update the wiki?"
    - "URGENT: Fix the login bug ASAP"
  - **Tap:** "Action Items" button (or 3-dot menu → Action Items)
  - **Verify:** Modal shows loading indicator
  - **Verify:** 3 action items extracted within 8 seconds
  - **Verify:** First item assigned to "John", high priority color
  - **Verify:** Second item shows "Unassigned"
  - **Verify:** Third item shows high/urgent priority color
  - **Tap:** Checkbox on first action item
  - **Verify:** Item marked completed, shows ✅
  - **Verify:** Text has strikethrough style
  - **Check Firestore:** `status: 'completed'`, `completedAt` set
  - **Tap:** Checkbox again
  - **Verify:** Item marked pending again (✅ → ⬜️)
  - **Test assignee resolution:**
    - Add 2 users named "John" to conversation
    - **Send:** "John should do task X"
    - **Tap:** "Action Items"
    - **Verify:** Assignee is null or shows "Ambiguous (2 Johns)"
    - **Send:** "john@example.com should do task Y"
    - **Tap:** "Action Items"
    - **Verify:** Assignee correctly identified by email
  - **Pass Criteria:** Action items UI fully functional

- [ ] **9.3.5: Test Decisions UI**
  - **Setup:** Create group chat (3+ people)
  - **Send messages:**
    - "Should we go with option A or B?"
    - "I think option A is better"
    - "Agreed, let's do option A"
    - "Great, option A it is!"
  - **Tap:** "Decisions" button (or 3-dot menu → Decisions)
  - **Verify:** Modal shows loading indicator
  - **Verify:** Decision appears within 10 seconds
  - **Verify:** Decision text: "We will go with option A"
  - **Verify:** Context explains the discussion
  - **Verify:** Participants listed
  - **Verify:** Source messages linked (can tap to jump to message)
  - **Pass Criteria:** Decisions UI shows extracted decisions

- [ ] **9.3.6: Test Error Handling UX**
  - **Disable internet connection**
  - **Tap:** "Summarize"
  - **Verify:** Error message: "Network error. Please check your connection."
  - **Verify:** Retry button appears
  - **Enable internet**
  - **Tap:** Retry button
  - **Verify:** Summary loads successfully
  - **Trigger rate limit** (call AI feature 51 times in 1 hour)
  - **Tap:** "Summarize" on 51st attempt
  - **Verify:** Error message: "AI usage limit reached. Try again in [X] minutes."
  - **Pass Criteria:** Error states handled gracefully

- [ ] **9.3.7: Test Loading States**
  - **Tap:** "Summarize" (slow connection)
  - **Verify:** Loading indicator visible
  - **Verify:** Modal title shows "Generating summary..."
  - **Verify:** Can cancel operation (close modal)
  - **Wait for timeout** (11+ seconds)
  - **Verify:** Error message: "Request timeout. Please try again."
  - **Pass Criteria:** Loading and timeout states work

- [ ] **9.3.8: Test on iOS Device**
  - **Open app** on physical iPhone or simulator
  - **Run all above tests** (Search, Priority, Summarization, Action Items, Decisions)
  - **Verify:** UI renders correctly (no layout issues)
  - **Verify:** Modals display properly
  - **Verify:** Tap targets are appropriate size
  - **Pass Criteria:** All features work on iOS

- [ ] **9.3.9: Test on Android Device**
  - **Open app** on physical Android or emulator
  - **Run all above tests**
  - **Verify:** UI renders correctly
  - **Verify:** Material Design elements appropriate
  - **Check:** No platform-specific crashes
  - **Pass Criteria:** All features work on Android

### Task 9.4: Performance Testing
**Estimated Time:** 2 hours  
**Dependencies:** Task 9.3

**Subtasks:**

- [ ] **9.4.1: Measure Response Times**
  - Summarization: Measure 10 runs, verify < 5s average
  - Action items: Measure 10 runs, verify < 4s average
  - Search: Measure 10 runs, verify < 800ms average
  - Priority (heuristic): Verify < 50ms
  - Decision tracking: Measure 10 runs, verify < 4s average

- [ ] **9.4.2: Test Under Load**
  - Send 500 messages rapidly
  - Verify batch embedding handles all messages
  - Check Cloud Function logs for errors
  - Verify no messages dropped

- [ ] **9.4.3: Verify Cost Estimates**
  - Run AI features for 1 day
  - Check Firebase billing
  - Check Anthropic usage
  - Check OpenAI usage
  - Check Pinecone usage
  - Verify costs match estimates (~$0.90/user/month + $70 Pinecone)

---

## Stage 10: Deployment & Monitoring

**Goal:** Deploy to production and set up monitoring

### Task 10.1: Pre-Deployment Checklist
**Estimated Time:** 1 hour  
**Dependencies:** Stage 9 complete

**Subtasks:**

- [ ] **10.1.1: Review All Environment Variables**
  - **Check:** All API keys set in Cloud Functions secrets
  - **Check:** Firebase config values set
  - **Check:** Rate limits configured correctly
  - **Verify:** No hardcoded secrets in code

- [ ] **10.1.2: Update Firestore Security Rules**
  - **File:** `firestore.rules`
  - **Verify:** All AI collection rules in place
  - **Verify:** Rate limiting rules in place
  - **Verify:** Retry queue rules (Cloud Functions only)
  - **Deploy:** `firebase deploy --only firestore:rules`

- [ ] **10.1.3: Create Firestore Indexes**
  - **Verify:** Composite indexes created:
    - `messages` (embedded, createdAt)
    - `messages` (priorityNeedsAnalysis, createdAt)
  - **Check:** All indexes status is "Enabled"

- [ ] **10.1.4: Run Validation Script**
  - Create validation script to check:
    - Pinecone index exists and is accessible
    - API keys are valid (test API calls)
    - Firestore rules deployed
    - Composite indexes enabled
    - Cloud Functions deployed

### Task 10.2: Deploy Cloud Functions
**Estimated Time:** 1 hour  
**Dependencies:** Task 10.1

**Subtasks:**

- [ ] **10.2.1: Build and Deploy All Functions**
  ```bash
  cd functions
  npm run build
  time firebase deploy --only functions
  ```
  - Note deployment time (should complete in 5-10 minutes)
  - Verify no errors in deployment logs

- [ ] **10.2.2: Verify Scheduled Functions**
  - Wait 5 minutes for `batchEmbedMessages` to run
  - Check logs: `firebase functions:log --only batchEmbedMessages --limit 10`
  - Verify no errors
  - Wait 10 minutes for `batchAnalyzePriority` to run
  - Check logs
  - Wait 10 minutes for `retryFailedEmbeddings` to run
  - Check logs

- [ ] **10.2.3: Test Deployed Functions**
  - Send test message via app
  - Verify triggers fire (check logs for `quickPriorityCheck`, `incrementMessageCounter`)
  - Test AI feature via app (summarization)
  - Verify on-demand function works

### Task 10.3: Set Up Monitoring and Alerts
**Estimated Time:** 2 hours  
**Dependencies:** Task 10.2

**Subtasks:**

- [ ] **10.3.1: Enable Firebase Performance Monitoring**
  - Go to Firebase Console > Performance
  - Enable performance monitoring
  - Add custom traces for AI features (optional)

- [ ] **10.3.2: Set Up Cloud Function Monitoring**
  - Go to Firebase Console > Functions
  - Enable "Detailed usage statistics"
  - Set up email alerts for:
    - Function errors (> 10 errors in 10 minutes)
    - Function timeouts
    - High memory usage (> 80%)

- [ ] **10.3.3: Set Up Billing Alerts**
  - Go to Firebase Console > Billing
  - Set budget alert at $50/month
  - Set budget alert at $100/month
  - Add notification email

- [ ] **10.3.4: Create Monitoring Dashboard**
  - **File:** `docs/MONITORING.md` (NEW)
  - **Document:**
    - Where to check Cloud Function logs
    - Where to check Pinecone usage
    - Where to check Anthropic usage
    - Where to check OpenAI usage
    - Key metrics to monitor:
      - Retry queue size (should be < 100)
      - AI feature error rate (should be < 2%)
      - Response times (see performance targets)
      - Daily costs

- [ ] **10.3.5: Set Up Error Reporting**
  - Install Sentry or Firebase Crashlytics (if not already)
  - Add error tracking to AI service calls
  - Test error reporting (trigger intentional error)

### Task 10.4: Documentation and Handoff
**Estimated Time:** 2 hours  
**Dependencies:** Task 10.3

**Subtasks:**

- [ ] **10.4.1: Update README**
  - **File:** `README.md`
  - **Add section:** "AI Features"
  - **Document:**
    - Overview of 5 AI features
    - How to use each feature
    - Rate limits (50/hour, 1000/month)
    - Cost estimates
    - Link to `ai-prd.md` for details

- [ ] **10.4.2: Create Ops Runbook**
  - **File:** `docs/AI_OPS_RUNBOOK.md` (NEW)
  - **Include:**
    - How to check if AI features are working
    - Common error scenarios and fixes
    - How to manually run batch processes
    - How to clear retry queue
    - How to rotate API keys
    - Emergency contacts

- [ ] **10.4.3: Create User Guide**
  - **File:** `docs/AI_FEATURES_USER_GUIDE.md` (NEW)
  - **Include:**
    - Screenshots of each feature
    - Step-by-step usage instructions
    - Tips for getting best results
    - Limitations and known issues
    - Rate limits explained

- [ ] **10.4.4: Final Code Review**
  - Review all Cloud Functions code
  - Check for TODOs or FIXMEs
  - Verify all error handling in place
  - Verify all logging in place
  - Verify no console.logs in production code

### Task 10.5: Post-Deployment Validation
**Estimated Time:** 1 hour  
**Dependencies:** Task 10.2

**Subtasks:**

- [ ] **10.5.1: Smoke Test in Production**
  - Create new test account
  - Send 10 test messages
  - Test all 5 AI features
  - Verify all work correctly
  - Check logs for errors

- [ ] **10.5.2: Monitor for 24 Hours**
  - Check Cloud Function logs every 4 hours
  - Check error rate in Firebase Console
  - Check retry queue size
  - Check billing (should see costs accumulating)
  - Verify scheduled functions running (check logs)

- [ ] **10.5.3: User Acceptance Testing**
  - Invite 3-5 beta users
  - Ask them to test AI features
  - Collect feedback
  - Monitor for errors during their usage
  - Fix critical issues if found

---

## Summary

### Total Estimated Time: 65-75 hours

**Phase Breakdown:**
- Phase 0: Prerequisites & Setup - 1.5 hours
- Phase 1: Infrastructure & Cloud Functions Setup - 3 hours
- Phase 2: Embedding Pipeline - 5 hours
- Phase 3: Smart Search - 6.5 hours
- Phase 4: Priority Message Detection - 5 hours
- Phase 5: Thread Summarization - 5 hours
- Phase 6: Action Item Extraction - 7 hours
- Phase 7: Decision Tracking - 4.5 hours
- Phase 8: Frontend Integration - 3 hours
- Phase 9: Testing & Validation - 12 hours
- Phase 10: Deployment & Monitoring - 7 hours

### Key Files Created/Modified:

**New Files Created:**
- `functions/src/ai/` - 6 files (embeddings, summarization, actionItems, search, priority, decisions)
- `functions/src/utils/` - 9 files (anthropic, openai, pinecone, validation, security, rateLimit, caching, priorityHeuristics, timeout)
- `components/` - 4 new modals (SearchModal, SummaryModal, ActionItemsModal, DecisionsModal)
- `services/aiService.ts` - New AI service layer
- `scripts/` - Migration and setup scripts
- `docs/` - Monitoring, ops runbook, user guide

**Files Modified:**
- `services/firestoreService.ts` - Add embedded field, messageCount
- `app/chat/[id].tsx` - Add AI features menu and modals
- `components/MessageBubble.tsx` - Add priority badges
- `types/index.ts` - Add AI types
- `firestore.rules` - Add AI collection rules
- `functions/src/index.ts` - Export all Cloud Functions

### Critical Dependencies:
1. External API keys (Anthropic, OpenAI, Pinecone)
2. Firestore composite indexes
3. Cloud Functions deployment
4. Firebase security rules deployment

### Success Criteria:
- [ ] All 5 AI features functional
- [ ] Response times meet targets
- [ ] Error rate < 2%
- [ ] Retry queue < 100 messages
- [ ] Costs within estimates
- [ ] No security vulnerabilities
- [ ] All tests passing
