# MessageAI - Final Sprint PRD (Refined)
**Due:** October 26, 2025 (Tomorrow!)  
**Status:** MVP + 5 Basic AI Features Complete  
**Goal:** Implement Advanced AI + Polish → 90+ points (Grade A)

---

## Executive Summary

This is a **refined, actionable PRD** based on what's actually been built. The focus is on the critical missing piece (Advanced AI Capability) plus targeted polish that can be completed in one day.

### Current State ✅
- ✅ MVP messaging (real-time, group chat, offline support, persistence)
- ✅ 5 AI features (summarization, action items, smart search, priority detection, decisions)
- ✅ Firebase + Cloud Functions backend
- ✅ Anthropic Claude Sonnet 4 + OpenAI + Pinecone integration
- ✅ Rate limiting, caching, batch embedding pipeline
- ✅ Hybrid priority detection (heuristic + AI)

### What's Missing 🔴
1. ~~**Advanced AI Capability**~~ ✅ DONE - Proactive Meeting Scheduler implemented
2. ~~**Group chat read receipt details**~~ ✅ DONE - Shows "Read by Alice, Bob"
3. ~~**Typing indicator persistence**~~ ✅ DONE - Fixed to persist 2 seconds
4. ~~**AI Feature UI issues**~~ ✅ DONE - Fixed search dates, sorted action items by priority
   - ⚠️ **Manual assignment DEFERRED to Phase 4** (see note below)
5. **Performance testing with 1000+ messages**
6. **Performance benchmarking** (message delivery, app launch, scroll)
7. **Documentation updates** (README, architecture diagrams)

> **📝 Note on Action Item Assignment**
> 
> Manual assignment was initially implemented but has been **deferred to Phase 4 (Workspaces & Paid Tier)** because:
> - Creates persistent state that requires proper management
> - Needs workspace admin permissions (not yet implemented)
> - Adds complexity that doesn't fit MVP scope
> - Should be part of paid tier with proper access control
> 
> **Phase 3 Status:** Action items are **read-only** (transient AI-generated responses)  
> **Phase 4 Plan:** Assignment will be implemented with workspace admin controls

### Timeline (Today)
- ~~**Hours 1-4:** Implement Advanced AI Capability~~ ✅ DONE - Proactive Meeting Scheduler
- ~~**Hour 5:** Add group chat read receipt details~~ ✅ DONE - Shows "Read by Alice, Bob"
- ~~**Core Messaging Polish:**~~ ✅ DONE - Typing indicators + AI feature fixes
  - ~~Fixed typing indicator persistence (2 seconds)~~
  - ~~Fixed search results "Invalid Date" bug~~
  - ~~Sorted action items by priority (high → medium → low)~~
  - ⚠️ Manual assignment deferred to Phase 4 (persistent state management)
- **Hour 6:** Create test data (1000+ messages) + performance testing
- **Hour 7:** Performance benchmarking + optimization
- **Hour 8:** Documentation updates
- **Later:** User creates demo video, persona brainlift, social post

---

## Section 1: Advanced AI Capability (CRITICAL - 10 Points)

### Decision: Implement **Proactive Assistant** (Easier than Multi-Step Agent)

**Why Proactive Assistant:**
- Faster to implement (3-4 hours vs 6-8 hours for agent)
- Better fit for tight timeline
- Still demonstrates advanced AI capability
- Easier to demo in video

### Feature: Smart Meeting Scheduler (Proactive Assistant)

**Use Case:** Detects when team members are discussing scheduling and proactively suggests meeting times.

#### Requirements for "Excellent" (9-10 points)

**1. Proactive Triggers (Real-Time)**
- Monitors conversations for scheduling-related phrases
- Detects patterns: "let's schedule", "when can we meet", "need to sync"
- Non-intrusive: only triggers when appropriate
- Response time: <5 seconds from trigger to suggestion

**2. Smart Suggestions**
- Analyzes mentioned availability from conversation history
- Suggests 3 optimal meeting times
- Accounts for timezone differences (if mentioned)
- Provides reasoning for each suggestion

**3. UI Integration**
- Subtle card that appears in chat when trigger detected
- Dismissible without disrupting conversation
- Quick accept/decline actions
- Settings to disable proactive suggestions

**4. Learning Component (Simple)**
- Tracks which suggestions are accepted/rejected
- Learns preferred meeting times per user (stored in Firestore)
- Adapts suggestion frequency based on acceptance rate

#### Implementation Plan

**Cloud Function: `proactiveMeetingScheduler`**

```typescript
// functions/src/ai/proactiveMeeting.ts

interface MeetingSuggestion {
  suggestedTimes: Array<{
    time: string;
    reasoning: string;
    confidence: number;
  }>;
  participants: string[];
  context: string;
}

// Triggered by message onCreate when specific keywords detected
// OR called on-demand from client when user requests
export const analyzeMeetingScheduling = functions.https.onCall(async (data, context) => {
  // 1. Rate limit check
  // 2. Get recent messages (last 20)
  // 3. Send to Claude with Tool Use API
  // 4. Return structured suggestions
});

// Optional: Real-time trigger (may be too aggressive for MVP)
export const proactiveMeetingTrigger = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    // Quick heuristic: check for keywords
    // If detected, write to /conversations/{id}/proactive_suggestions/{suggestionId}
    // Client listens and displays card
  });
```

**Client Integration:**

1. **Trigger Detection (Option A: Manual)**
   - Add button in AI Features menu: "Suggest Meeting Times"
   - User clicks when discussing scheduling
   - Calls `analyzeMeetingScheduling` Cloud Function
   - Displays results in modal

2. **Trigger Detection (Option B: Proactive - If Time Permits)**
   - Client listens to new messages
   - Quick keyword check on client side
   - If detected, calls Cloud Function
   - Displays subtle card in chat

**MVP Scope (3-4 hours):**
- ✅ Option A: Manual trigger (button in AI menu)
- ✅ Claude analysis with Tool Use API
- ✅ Suggests 3 meeting times with reasoning
- ✅ Modal display with clear suggestions
- ⏳ Option B: Proactive trigger (if time permits)

#### Acceptance Criteria
- [ ] Cloud Function implemented with Tool Use API
- [ ] Rate limiting integrated (reuse existing system)
- [ ] Client button to trigger meeting suggestions
- [ ] Modal displays 3 suggestions with reasoning
- [ ] Handles edge cases (no availability mentioned, conflicting times)
- [ ] Response time <5 seconds
- [ ] Clear error messages
- [ ] Documented in README with example

#### Testing Scenarios
1. **Happy Path:** Conversation mentions "let's meet next week" → Suggests 3 times
2. **Edge Case:** No availability mentioned → Suggests general times based on business hours
3. **Edge Case:** Conflicting preferences → Explains conflicts, suggests compromise
4. **Performance:** Measure response time (should be <5s)

#### Alternative: Multi-Step Agent (If Proactive Assistant Seems Too Simple)

**Feature: Team Offsite Planner**

**Steps:**
1. Poll availability from conversation history
2. Analyze date preferences and constraints
3. Generate budget estimates (simple, based on team size)
4. Create proposed agenda based on conversation goals
5. Present comprehensive plan with rationale

**Implementation:** 6-8 hours (too tight for timeline)

---

## Section 2: Core Messaging Polish ✅ COMPLETED

### ✅ Group Chat Read Receipt Details
**Status:** IMPLEMENTED

**What Was Done:**
- Added `getReadDetails()` function in chat screen to calculate who read each message
- Updated `MessageList` and `MessageBubble` to display read details
- Shows "Read by Alice, Bob" below sender's messages in group chats
- Updates in real-time as participants read messages
- Only displays for sender's own messages in group chats

**Files Modified:**
- `app/chat/[id].tsx` - Added read details logic
- `components/MessageList.tsx` - Pass read details prop
- `components/MessageBubble.tsx` - Display read details UI

---

### ✅ Typing Indicator Persistence Fix
**Status:** IMPLEMENTED

**Problem:** Typing indicators disappeared instantly when sender stopped typing.

**Solution:** Client-side persistence with smart cleanup:
- Track typing users with last update timestamp
- When Firestore doc deleted, check if recent (within 2 seconds)
- Keep showing indicator for full 2 seconds after last update
- Handles multiple users typing smoothly

**Files Modified:**
- `app/chat/[id].tsx` - Enhanced typing indicators listener

---

### ✅ AI Feature UI Improvements
**Status:** IMPLEMENTED

**Issue 1: Search Results "Invalid Date"**
- Fixed: Convert Firestore Timestamp to Date before formatting
- File: `components/SearchModal.tsx`

**Issue 2: Action Items Not Sorted by Priority**
- Fixed: Sort by high → medium → low priority
- File: `components/ActionItemsModal.tsx`

**Issue 3: Manual Action Item Assignment** (NEW FEATURE)
- Added ability to assign unassigned action items to participants
- New service function: `assignActionItem()`
- UI will show "Assign" button for unassigned items
- Can assign to any conversation participant
- Updates persist and sync across devices

**Issue 4: My Tasks View** (NEW FEATURE - PLANNED)
- Dedicated screen to view all tasks assigned to current user across all conversations
- Accessed from main navigation or home screen
- Shows task text, priority, due date, conversation name, status
- Can mark complete directly from this view
- Filter by status (pending/completed), priority, or conversation
- Provides centralized task management

**Files Modified:**
- `services/aiService.ts` - Added `assignActionItem()` function
- `components/ActionItemsModal.tsx` - Sorting logic (assignment UI in progress)

**Files To Be Created:**
- `app/my-tasks.tsx` - New screen for My Tasks view
- `services/taskService.ts` - Fetch all tasks for current user

---

## Section 3: Performance Testing with 1000+ Messages

### Current Limitation
- Test conversations have ~10-50 messages
- No stress testing for scroll performance

### Create Test Data Script

**Script: `scripts/populateLargeConversation.js`**

```javascript
// Creates 1 conversation with 1000+ messages for performance testing

const NUM_MESSAGES = 1500;
const conversationId = 'performance-test-chat-1500';

// Strategy:
// - Create conversation with 3-4 participants
// - Batch write messages (500 at a time)
// - Use realistic timestamps (spread over 2 weeks)
// - Mix of short and long messages
// - Include priority messages, action items, etc.
```

**Implementation Time:** 30 minutes

#### Acceptance Criteria
- [ ] Script creates conversation with 1500 messages
- [ ] Messages have realistic content and timestamps
- [ ] Can be run multiple times (idempotent)
- [ ] Includes cleanup script to remove test data
- [ ] Documented in README

---

## Section 4: Easy Performance Benchmarks

### Identify Key Metrics (Easy to Measure)

**1. Message Delivery Time (Optimistic → Real)**
- **What:** Time from send button press to message appearing via Firestore listener
- **How:** Add timestamp logs in `sendMessage` and message listener
- **Target:** <200ms on good network
- **Implementation:** 15 minutes

**2. App Launch Time (Cold Start)**
- **What:** Time from app icon tap to chat list visible
- **How:** Use `console.time()` in `app/_layout.tsx`
- **Target:** <2 seconds
- **Implementation:** 10 minutes

**3. Scroll Performance (FPS with 1000+ messages)**
- **What:** Frames per second when scrolling through large conversation
- **How:** Manual testing + React Native performance monitor
- **Target:** 60 FPS (no visible lag)
- **Implementation:** 5 minutes setup + testing

**4. AI Feature Response Time**
- **What:** Time from button press to result displayed
- **How:** Already logged in Cloud Functions, add client-side timing
- **Target:** Summary <5s, Search <3s, Action Items <5s
- **Implementation:** 20 minutes

**5. Message List Render Time (Initial Load)**
- **What:** Time to render 100 messages on chat screen open
- **How:** Add timing in `MessageList` component
- **Target:** <500ms
- **Implementation:** 10 minutes

### Performance Testing Script

**Location:** `docs/PERFORMANCE_TEST_CHECKLIST.md`

```markdown
# Performance Testing Checklist

## Setup
1. Create 1500-message test conversation (`npm run populate:large-conversation`)
2. Enable React Native performance monitor (shake device → "Perf Monitor")
3. Use physical device (not emulator) for accurate results
4. Test on good WiFi network

## Tests

### 1. Message Delivery Time
- [ ] Send message
- [ ] Record time from send to Firestore listener callback
- [ ] Result: ___ ms (target: <200ms)

### 2. App Launch Time
- [ ] Force quit app
- [ ] Tap app icon
- [ ] Record time to conversation list visible
- [ ] Result: ___ seconds (target: <2s)

### 3. Scroll Performance
- [ ] Open 1500-message conversation
- [ ] Scroll quickly through messages
- [ ] Check FPS in performance monitor
- [ ] Result: ___ FPS (target: 60 FPS)

### 4. AI Feature Response Time
- [ ] Thread Summary: ___ seconds (target: <5s)
- [ ] Search: ___ seconds (target: <3s)
- [ ] Action Items: ___ seconds (target: <5s)

### 5. Message List Render Time
- [ ] Open 1500-message conversation
- [ ] Record time from screen mount to messages visible
- [ ] Result: ___ ms (target: <500ms)

## Results Summary
[Record actual numbers here]

## Optimizations Needed
[List any performance issues found]
```

**Implementation Time:** 1 hour (including testing)

#### Performance Optimization (If Needed)

**Quick Wins (If Tests Fail):**

1. **Scroll Performance Issues:**
   - Add `getItemLayout` to FlatList for fixed-height items
   - Increase `initialNumToRender` and `maxToRenderPerBatch`
   - Use `removeClippedSubviews={true}`

2. **Message Render Issues:**
   - Memoize `MessageBubble` with `React.memo()`
   - Optimize read status calculations (cache results)

3. **App Launch Issues:**
   - Lazy load heavy components
   - Defer non-critical Firestore listeners

---

## Section 6: Production-Ready Error Handling

### Problem Statement

**Current State:** Errors propagate directly to users, showing technical details like "FirebaseError: Missing or insufficient permissions" which:
- Confuses non-technical users
- May scare users away from the app
- Provides no actionable guidance
- Looks unprofessional

**Goal:** Implement graceful error handling that:
- **User-friendly:** Clear, non-technical error messages
- **Developer-friendly:** Detailed logs for debugging
- **Resilient:** App never completely crashes from errors
- **Actionable:** Tells users what they can do
- **Best practices:** Proper error propagation and boundaries

---

### Architecture: 3-Layer Error Handling System

#### Layer 1: Error Boundaries (Prevent Full App Crashes)

**Implementation:** React Error Boundaries at strategic points

```typescript
// components/ErrorBoundary.tsx

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactElement;
  level?: 'app' | 'screen' | 'feature';
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to monitoring service (future: Sentry, LogRocket)
    console.error('[ErrorBoundary]', this.props.level, error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      
      // Default fallback based on level
      return <ErrorFallback level={this.props.level} onRetry={this.reset} />;
    }

    return this.props.children;
  }
}
```

**Placement Strategy:**

1. **App-Level Boundary** (`app/_layout.tsx`)
   - Catches catastrophic errors
   - Shows full-screen error with app restart option
   - Last line of defense

2. **Screen-Level Boundaries** (each route)
   - Catches screen-specific errors
   - Shows error within screen, allows navigation back
   - Preserves app navigation

3. **Feature-Level Boundaries** (AI features, modals)
   - Catches feature-specific errors
   - Shows error within feature UI
   - Allows retry without leaving screen

**Example Usage:**

```typescript
// app/_layout.tsx (App-level)
export default function RootLayout() {
  return (
    <ErrorBoundary level="app">
      <Stack />
    </ErrorBoundary>
  );
}

// app/chat/[id].tsx (Screen-level)
export default function ChatScreen() {
  return (
    <ErrorBoundary level="screen">
      <View>
        {/* Screen content */}
      </View>
    </ErrorBoundary>
  );
}

// components/ActionItemsModal.tsx (Feature-level)
export function ActionItemsModal() {
  return (
    <Modal>
      <ErrorBoundary level="feature" fallback={FeatureErrorFallback}>
        {/* AI feature content */}
      </ErrorBoundary>
    </Modal>
  );
}
```

---

#### Layer 2: User-Friendly Error Messages

**Principle:** Translate technical errors into plain English with actionable guidance.

**Implementation: Error Translation Service**

```typescript
// utils/errorTranslator.ts

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export function translateError(error: Error): UserFriendlyError {
  const errorMessage = error.message.toLowerCase();
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch failed')) {
    return {
      title: 'Connection Issue',
      message: 'Unable to reach the server. Please check your internet connection.',
      action: 'Retry',
      severity: 'warning',
    };
  }
  
  // Firestore permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('insufficient')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      action: 'Contact Support',
      severity: 'error',
    };
  }
  
  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('quota exceeded')) {
    return {
      title: 'Too Many Requests',
      message: 'You\'ve reached the usage limit. Please try again in a few minutes.',
      action: 'Wait',
      severity: 'warning',
    };
  }
  
  // Authentication errors
  if (errorMessage.includes('auth') || errorMessage.includes('unauthenticated')) {
    return {
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again.',
      action: 'Log In',
      severity: 'warning',
    };
  }
  
  // AI service errors
  if (errorMessage.includes('anthropic') || errorMessage.includes('openai') || errorMessage.includes('ai')) {
    return {
      title: 'AI Service Unavailable',
      message: 'The AI feature is temporarily unavailable. Please try again in a moment.',
      action: 'Retry',
      severity: 'warning',
    };
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout')) {
    return {
      title: 'Request Timed Out',
      message: 'This is taking longer than expected. Please try again.',
      action: 'Retry',
      severity: 'warning',
    };
  }
  
  // Generic fallback
  return {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    action: 'Retry',
    severity: 'error',
  };
}
```

**Error Display Components:**

```typescript
// components/ErrorFallback.tsx

interface ErrorFallbackProps {
  level: 'app' | 'screen' | 'feature';
  onRetry?: () => void;
  error?: Error;
}

export function ErrorFallback({ level, onRetry, error }: ErrorFallbackProps) {
  const friendly = error ? translateError(error) : null;
  
  if (level === 'app') {
    return <FullScreenError error={friendly} onRetry={onRetry} />;
  }
  
  if (level === 'screen') {
    return <ScreenError error={friendly} onRetry={onRetry} />;
  }
  
  return <InlineError error={friendly} onRetry={onRetry} />;
}

// Full-screen error (catastrophic failures)
function FullScreenError({ error, onRetry }) {
  return (
    <View style={styles.fullScreen}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>
        {error?.title || 'App Error'}
      </Text>
      <Text style={styles.errorMessage}>
        {error?.message || 'The app encountered an unexpected error.'}
      </Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Restart App</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Screen-level error (navigation preserved)
function ScreenError({ error, onRetry }) {
  const router = useRouter();
  
  return (
    <View style={styles.screenError}>
      <Text style={styles.errorIcon}>😕</Text>
      <Text style={styles.errorTitle}>
        {error?.title || 'Something Went Wrong'}
      </Text>
      <Text style={styles.errorMessage}>
        {error?.message || 'We couldn\'t load this screen.'}
      </Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.secondaryButton}>
          <Text>Go Back</Text>
        </TouchableOpacity>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.primaryButton}>
            <Text>{error?.action || 'Retry'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Feature-level error (inline, dismissible)
function InlineError({ error, onRetry }) {
  return (
    <View style={styles.inlineError}>
      <Text style={styles.inlineTitle}>
        {error?.title || 'Feature Unavailable'}
      </Text>
      <Text style={styles.inlineMessage}>
        {error?.message || 'This feature is temporarily unavailable.'}
      </Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.inlineRetry}>
          <Text>{error?.action || 'Try Again'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

---

#### Layer 3: Developer-Friendly Logging

**Principle:** Preserve detailed error information for debugging while hiding it from users.

**Implementation: Centralized Error Logger**

```typescript
// utils/errorLogger.ts

export interface ErrorContext {
  userId?: string;
  conversationId?: string;
  feature?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export class ErrorLogger {
  static log(error: Error, context?: ErrorContext) {
    const timestamp = new Date().toISOString();
    const errorDetails = {
      timestamp,
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    };
    
    // Development: Log to console with full details
    if (__DEV__) {
      console.error('[ErrorLogger]', errorDetails);
    }
    
    // Production: Send to monitoring service (future)
    // Sentry.captureException(error, { extra: errorDetails });
    
    // Store locally for debugging (last 100 errors)
    this.storeLocally(errorDetails);
  }
  
  private static storeLocally(errorDetails: any) {
    // Use AsyncStorage to persist errors
    // Useful for support tickets
  }
  
  static async getRecentErrors(): Promise<any[]> {
    // Retrieve last 100 errors for debugging
    // Can be exported and sent to support
  }
}
```

**Usage in Services:**

```typescript
// services/aiService.ts

export async function generateSummary(conversationId: string): Promise<Summary> {
  try {
    const response = await fetch(/* Cloud Function */);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Summary generation failed: ${data.error}`);
    }
    
    return data.summary;
  } catch (error) {
    // Log with context for developers
    ErrorLogger.log(error as Error, {
      userId: getCurrentUserId(),
      conversationId,
      feature: 'summary',
      action: 'generate',
    });
    
    // Re-throw with user-friendly message
    throw new Error('Failed to generate summary. Please try again.');
  }
}
```

---

### Error Handling Patterns by Feature

#### 1. Message Sending Errors

**Scenario:** Firestore write fails (network, permissions, etc.)

**Current Behavior:** Message stuck in "sending" state

**Improved Behavior:**
- Show inline error below message bubble
- "Message failed to send. [Retry] [Delete]"
- Persist failed message locally
- Auto-retry when network restored

```typescript
// app/chat/[id].tsx

const sendMessage = async (text: string) => {
  try {
    // Attempt send
    await addDoc(/* ... */);
  } catch (error) {
    // Log for debugging
    ErrorLogger.log(error as Error, {
      conversationId,
      action: 'send_message',
    });
    
    // Update message status to 'failed'
    updateMessageStatus(tempId, 'failed');
    
    // User sees: red "!" icon, can tap to retry
    // NO error modal, NO full-screen error
  }
};
```

#### 2. AI Feature Errors

**Scenario:** Cloud Function timeout, rate limit, API error

**Current Behavior:** Modal shows technical error

**Improved Behavior:**
- Show user-friendly error in modal
- Suggest actionable steps
- Allow retry without closing modal

```typescript
// hooks/useAIFeature.ts

export function useAIFeature(feature: string) {
  const [error, setError] = useState<UserFriendlyError | null>(null);
  
  const execute = async (params: any) => {
    try {
      setError(null);
      const result = await callAIFeature(feature, params);
      return result;
    } catch (err) {
      // Translate to user-friendly error
      const friendly = translateError(err as Error);
      setError(friendly);
      
      // Log for developers
      ErrorLogger.log(err as Error, {
        feature,
        action: 'execute',
        metadata: params,
      });
      
      // Don't throw - let component handle gracefully
      return null;
    }
  };
  
  return { execute, error, retry: execute };
}
```

#### 3. Authentication Errors

**Scenario:** Session expired, invalid credentials

**Current Behavior:** App may crash or show confusing errors

**Improved Behavior:**
- Detect auth errors globally
- Show friendly "Session expired" message
- Auto-redirect to login
- Preserve navigation state

```typescript
// app/_layout.tsx

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (!user && requiresAuth(currentRoute)) {
      // Show toast: "Your session has expired. Please log in again."
      router.replace('/login');
    }
  });
  
  return unsubscribe;
}, []);
```

#### 4. Network Errors

**Scenario:** Offline or poor connection

**Current Behavior:** Various Firestore errors

**Improved Behavior:**
- Show persistent offline banner at top of screen
- Queue actions for when online
- Show "Waiting for connection..." on buttons
- Auto-retry when online

```typescript
// Already implemented with OfflineBanner component
// Extend to handle action queuing
```

---

### Implementation Checklist

#### Phase 1: Error Boundaries (2 hours)
- [ ] Create `ErrorBoundary` component with levels
- [ ] Create error fallback components (full-screen, screen, inline)
- [ ] Wrap app root with app-level boundary
- [ ] Wrap each screen with screen-level boundary
- [ ] Wrap AI modals with feature-level boundaries
- [ ] Test with intentional errors

#### Phase 2: Error Translation (1 hour)
- [ ] Create `errorTranslator.ts` with common error mappings
- [ ] Create `UserFriendlyError` type
- [ ] Add error translation to all service calls
- [ ] Test each error category

#### Phase 3: Developer Logging (1 hour)
- [ ] Create `ErrorLogger` class
- [ ] Add logging to all try/catch blocks
- [ ] Add context to logs (userId, conversationId, etc.)
- [ ] Test log storage and retrieval

#### Phase 4: Feature-Specific Handling (2 hours)
- [ ] Update message sending error handling
- [ ] Update AI feature error handling with retry
- [ ] Update authentication error handling
- [ ] Test each scenario

#### Phase 5: Testing & Polish (1 hour)
- [ ] Test network errors (airplane mode)
- [ ] Test permission errors
- [ ] Test rate limiting
- [ ] Test authentication expiry
- [ ] Verify no technical errors shown to users

---

### Success Criteria

**User Experience:**
- ✅ User never sees technical error messages (FirebaseError, etc.)
- ✅ Every error has a clear, actionable message
- ✅ App never crashes to home screen
- ✅ User can always recover from errors (retry, go back, etc.)

**Developer Experience:**
- ✅ All errors logged with full context
- ✅ Easy to reproduce issues from logs
- ✅ Clear error propagation through layers
- ✅ Consistent error handling patterns

**Best Practices:**
- ✅ React Error Boundaries at strategic points
- ✅ Try/catch in all async operations
- ✅ Error translation layer separates concerns
- ✅ Centralized logging for monitoring
- ✅ Graceful degradation (features fail, app continues)

---

### Future Enhancements (Post-MVP)

1. **Error Monitoring Service**
   - Integrate Sentry or LogRocket
   - Track error rates and patterns
   - Alert on critical errors

2. **User Feedback**
   - "Report a Problem" button on error screens
   - Include logs with user consent
   - Auto-populate support tickets

3. **Smart Retry Logic**
   - Exponential backoff
   - Circuit breaker pattern
   - Queue failed actions

4. **Error Analytics**
   - Track most common errors
   - Identify patterns by user/device
   - Proactive bug fixes

---

## Section 7: Documentation Updates

### Current State
- ✅ ARCHITECTURE.md is comprehensive and up-to-date
- ✅ Phase 2 AI spike docs are detailed
- ⏳ Main README needs updating for AI features
- ⏳ No architecture diagrams (visual)

### Required Updates

**1. README.md Overhaul**

**New Structure:**
```markdown
# MessageAI - Intelligent Messaging for Remote Teams

[Screenshot of app]

## Overview
WhatsApp-quality messaging with AI-powered features for remote team coordination.

## Key Features
- Real-time messaging (<200ms delivery)
- Group chat (3+ participants)
- Offline support with automatic sync
- 5 AI Features:
  - Thread Summarization
  - Action Item Extraction
  - Smart Semantic Search
  - Priority Message Detection
  - Decision Tracking
- Advanced AI: Proactive Meeting Scheduler

## Demo
[Link to demo video]

## Tech Stack
- Frontend: React Native + Expo SDK 54
- Backend: Firebase (Auth + Firestore + Cloud Functions)
- AI: Anthropic Claude Sonnet 4 + OpenAI + Pinecone
- Language: TypeScript

## Architecture
[Link to architecture diagram]

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed technical documentation.

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- iOS Simulator (macOS) or Android Emulator
- Firebase account
- Anthropic API key
- OpenAI API key
- Pinecone account

### Backend Setup
1. Clone repository
2. Install dependencies: `cd functions && npm install`
3. Copy `.env.example` to `.env` and fill in API keys
4. Deploy Cloud Functions: `firebase deploy --only functions`

### Mobile App Setup
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and add Firebase config
3. Start Expo dev server: `npx expo start --tunnel`
4. Scan QR code with Expo Go app (iOS/Android)

## AI Features Documentation

### Thread Summarization
Generates concise summaries of long conversations with key points.

**Usage:** Open conversation → AI menu (✨) → "Summarize Thread"

**Example:**
[Screenshot]

### Action Item Extraction
Automatically extracts tasks and assigns them to team members.

**Usage:** Open conversation → AI menu (✨) → "Action Items"

**Example:**
[Screenshot]

### Smart Search
Semantic search that finds messages by meaning, not just keywords.

**Usage:** Open conversation → AI menu (✨) → "Search"

**Example:**
[Screenshot]

### Priority Detection
Automatically flags urgent messages for immediate attention.

**How it works:** Hybrid approach (quick heuristic + batch AI refinement)

**Example:**
[Screenshot]

### Decision Tracking
Extracts and tracks team decisions from conversations.

**Usage:** Open conversation → AI menu (✨) → "Decisions"

**Example:**
[Screenshot]

### Proactive Meeting Scheduler (Advanced AI)
Detects scheduling discussions and suggests optimal meeting times.

**Usage:** Open conversation → AI menu (✨) → "Suggest Meeting Times"

**Example:**
[Screenshot]

## Testing

### Run Tests
```bash
# Frontend tests
npm test

# Backend tests
cd functions && npm test
```

### Manual Testing
See [PERFORMANCE_TEST_CHECKLIST.md](docs/PERFORMANCE_TEST_CHECKLIST.md)

## Performance
- Message delivery: <200ms
- App launch: <2 seconds
- Scroll performance: 60 FPS (tested with 1500 messages)
- AI features: 2-5 seconds response time

## Deployment
App runs on Expo Go for development and testing.

For production deployment, use EAS Build:
```bash
eas build --platform ios
eas build --platform android
```

## Project Structure
```
message-ai/
├── app/              # Expo Router screens
├── components/       # Reusable UI components
├── functions/        # Firebase Cloud Functions
│   └── src/
│       ├── ai/      # AI feature implementations
│       └── utils/   # Helpers and utilities
├── services/         # Business logic
├── store/            # Zustand state management
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## Troubleshooting

### Expo Go connection issues
Use the `--tunnel` flag: `npx expo start --tunnel`

### Firestore security rules
Currently in test mode. See POST_MVP.md for production rules.

### AI features timeout
Check rate limits (50/hour, 1000/month per user).

## Contributing
This is a class project. Not accepting contributions.

## License
MIT

## Acknowledgments
Built for Gauntlet AI Hackathon. Thanks to @GauntletAI for the learning opportunity.
```

**Implementation Time:** 1 hour

**2. Architecture Diagram**

**Tool:** Excalidraw (https://excalidraw.com/)

**Required Diagram:**
```
┌─────────────────────────────────────────────────────────┐
│                   React Native App                       │
│                   (Expo + TypeScript)                    │
│                                                          │
│  UI Layer          State Layer         Service Layer    │
│  (Screens,         (Zustand,           (authService,    │
│   Components)      AsyncStorage)       firestoreService) │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ Firebase SDK
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Firebase Backend                       │
│                                                          │
│  Authentication    Firestore DB       Cloud Functions   │
│  (Email/Password)  (Real-time sync)   (AI features)     │
└────────┬──────────────────────────────────┬─────────────┘
         │                                   │
         │                                   ↓
         │                          ┌───────────────────┐
         │                          │  Anthropic Claude │
         │                          │  (Summarization,  │
         │                          │   Action Items,   │
         │                          │   Decisions,      │
         │                          │   Priority,       │
         │                          │   Meeting Sched.) │
         │                          └───────────────────┘
         │                                   ↓
         │                          ┌───────────────────┐
         │                          │  OpenAI           │
         │                          │  (Embeddings)     │
         │                          └───────────────────┘
         │                                   ↓
         │                          ┌───────────────────┐
         │                          │  Pinecone         │
         │                          │  (Vector Search)  │
         │                          └───────────────────┘
         │
         ↓ (Deployment)
┌─────────────────────────────────────────────────────────┐
│                       Expo Go                            │
│              (iOS & Android Test App)                    │
└─────────────────────────────────────────────────────────┘
```

**Implementation Time:** 30 minutes

**3. Update Existing Docs**

Files to update:
- [ ] `docs/memory.md` - Add October 26 completion notes
- [ ] `docs/ARCHITECTURE.md` - Add Proactive Meeting Scheduler
- [ ] `docs/phase3-full-implementation/POST_MVP.md` - Mark items as done
- [ ] `.env.example` - Ensure all required variables listed

**Implementation Time:** 30 minutes

---

## Priority Order & Time Estimates

### Critical Path (Must Complete)

| Task | Priority | Time | Cumulative |
|------|----------|------|------------|
| **1. Advanced AI: Proactive Meeting Scheduler** | P0 | 3-4h | 4h |
| - Cloud Function with Tool Use API | | 2h | |
| - Client integration (button + modal) | | 1h | |
| - Testing and error handling | | 1h | |
| **2. Group Chat Read Receipt Details** | P1 | 1h | 5h |
| **3. Performance Test Data (1500 messages)** | P1 | 0.5h | 5.5h |
| **4. Performance Benchmarking** | P1 | 1h | 6.5h |
| - Add timing logs | | 0.5h | |
| - Run tests and document results | | 0.5h | |
| **5. Documentation Updates** | P1 | 2h | 8.5h |
| - README overhaul | | 1h | |
| - Architecture diagram | | 0.5h | |
| - Update existing docs | | 0.5h | |

### Stretch Goals (If Time Permits)

| Task | Priority | Time |
|------|----------|------|
| Performance optimizations (if tests fail) | P2 | 1-2h |
| Proactive trigger (automatic detection) | P2 | 1h |
| Additional screenshots for README | P2 | 0.5h |

---

## Testing Checklist (Before Video Recording)

### Advanced AI Feature
- [ ] Manual trigger works (button in AI menu)
- [ ] Suggests 3 meeting times with reasoning
- [ ] Handles conversations with no availability mentioned
- [ ] Response time <5 seconds
- [ ] Error handling works (timeout, rate limit)
- [ ] Results display clearly in modal

### Group Chat Read Receipts
- [ ] Shows "Read by Alice, Bob" for group messages
- [ ] Updates in real-time as users read
- [ ] Only visible for sender's own messages
- [ ] Works correctly with existing ✓/✓✓ logic

### Performance
- [ ] Message delivery <200ms (tested)
- [ ] App launch <2 seconds (tested)
- [ ] Scrolling 1500 messages is smooth (60 FPS)
- [ ] AI features respond within targets
- [ ] No crashes or memory issues

### Documentation
- [ ] README is comprehensive and accurate
- [ ] Architecture diagram is clear and correct
- [ ] All setup instructions work
- [ ] .env.example is complete

---

## Success Criteria

### Minimum for Grade A (90 points):
- ✅ Advanced AI Capability: 9-10 points (Proactive Meeting Scheduler working)
- ✅ Core Messaging: 33-35 points (already excellent, added read receipts)
- ✅ Mobile Quality: 18-20 points (performance tested and documented)
- ✅ AI Features Quality: 14-15 points (5 features already excellent)
- ✅ Technical Implementation: 9-10 points (clean code, security, architecture)
- ✅ Documentation: 5 points (comprehensive README, diagram)
- ✅ Required Deliverables: 0 deductions (user will complete after implementation)

### Expected Score: 95-100 points

---

## Implementation Notes

### Proactive Meeting Scheduler - Detailed Spec

**Cloud Function Tool Definition:**

```typescript
const meetingSchedulerTool = {
  name: "suggest_meeting_times",
  description: "Analyze conversation to suggest optimal meeting times for team members",
  input_schema: {
    type: "object",
    properties: {
      suggestedTimes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            dateTime: { type: "string", description: "Suggested date/time" },
            reasoning: { type: "string", description: "Why this time is optimal" },
            confidence: { type: "number", description: "Confidence 0-1" }
          },
          required: ["dateTime", "reasoning", "confidence"]
        },
        description: "3 suggested meeting times"
      },
      participants: {
        type: "array",
        items: { type: "string" },
        description: "UIDs of participants who should attend"
      },
      context: {
        type: "string",
        description: "Summary of scheduling discussion"
      },
      conflicts: {
        type: "array",
        items: { type: "string" },
        description: "Any scheduling conflicts detected"
      }
    },
    required: ["suggestedTimes", "participants", "context"]
  }
};
```

**Prompt Template:**

```typescript
const prompt = `You are a scheduling assistant for a remote team. Analyze the following conversation and suggest 3 optimal meeting times.

Consider:
- Mentioned availability and constraints
- Time zones if mentioned
- Preferred meeting times patterns
- Any conflicts or blockers

Conversation:
${formattedMessages}

Suggest 3 specific meeting times with reasoning. Be specific (e.g., "Tuesday, Oct 29 at 2pm EST") rather than vague (e.g., "next week").`;
```

**Example Response:**

```json
{
  "suggestedTimes": [
    {
      "dateTime": "Tuesday, October 29, 2025 at 2:00 PM EST",
      "reasoning": "Alice mentioned being free Tuesday afternoons, and Bob said mornings don't work this week",
      "confidence": 0.85
    },
    {
      "dateTime": "Wednesday, October 30, 2025 at 10:00 AM EST",
      "reasoning": "Charlie suggested Wednesday mornings work well for the whole team",
      "confidence": 0.75
    },
    {
      "dateTime": "Thursday, October 31, 2025 at 3:00 PM EST",
      "reasoning": "Backup option based on typical team availability pattern",
      "confidence": 0.60
    }
  ],
  "participants": ["uid1", "uid2", "uid3"],
  "context": "Team needs to schedule Q4 planning meeting. Alice and Bob have conflicts this week, Charlie suggested Wednesday.",
  "conflicts": ["Alice unavailable Monday-Tuesday mornings", "Bob out of office Friday"]
}
```

---

## Risk Mitigation

### Risk 1: Proactive Meeting Scheduler Takes Too Long
**Mitigation:** Start with manual trigger only (button in AI menu). Skip proactive real-time detection.

### Risk 2: Performance Tests Reveal Issues
**Mitigation:** Document issues in PERFORMANCE_TEST_CHECKLIST.md. If time permits, apply quick wins (FlatList optimization).

### Risk 3: Documentation Takes Too Long
**Mitigation:** Focus on README and one architecture diagram. Skip additional diagrams if needed.

### Risk 4: Running Out of Time
**Fallback Priority:**
1. Advanced AI (must complete)
2. Documentation (README minimum)
3. Performance testing (can document as "not yet tested" if needed)
4. Read receipts (nice-to-have)

---

## Next Steps

1. **Start immediately** with Proactive Meeting Scheduler Cloud Function
2. **Test incrementally** (don't wait to test until end)
3. **Document as you go** (add code comments, update README sections)
4. **Ask for feedback** when Advanced AI is working
5. **Prioritize ruthlessly** (skip stretch goals if needed)

**Let's build something excellent! 🚀**

