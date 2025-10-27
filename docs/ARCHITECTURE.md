# MessageAI - Architecture Overview

**Version:** 1.2 (with AI Features + Phase 4: Workspaces & Paid Tier)  
**Last Updated:** October 27, 2025

---

## System Architecture

### High-Level Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           REACT NATIVE CLIENT                                     │
│                         (Expo Managed + Expo Go)                                  │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  UI Layer: Screens (Chat, Conversations, AI Modals) + Components            ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│         ↕ (1) User interactions                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  State: Zustand (global), Component State (local), AsyncStorage (persist)   ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│         ↕ (2) Service calls                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  Services: authService, firestoreService, aiService (with timeout wrappers) ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│         ↕ (3) Firebase SDK + httpsCallable()                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  Firebase Web SDK: Auth API, Firestore (real-time listeners), Functions     ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
                    ↕ (4) HTTPS/WebSocket                    ↕ (5) HTTPS Callable
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          FIREBASE BACKEND (GCP)                                   │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  Firebase Authentication: Email/Password, Token validation                   ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│         ↕ (6) Auth checks                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  Cloud Firestore: Real-time DB, Security Rules, Offline Cache               ││
│  │  • /users, /conversations, /messages (with AI fields: embedded, priority)   ││
│  │  • /ai_summaries, /ai_action_items, /ai_decisions (AI feature data)         ││
│  │  • /ai_usage (rate limiting), /embedding_retry_queue (error handling)       ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│         ↕ (7) Triggers & Queries       ↕ (8) Scheduled jobs                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  Cloud Functions (Node.js):                                                  ││
│  │  • ON-DEMAND (https.onCall): generateSummary, extractActionItems,           ││
│  │    semanticSearch, trackDecisions                                            ││
│  │  • REAL-TIME TRIGGERS (onCreate): quickPriorityCheck, incrementMessageCounter││
│  │  • SCHEDULED (pubsub): batchEmbedMessages (5min), batchAnalyzePriority (10min)││
│  │    retryFailedEmbeddings (10min), monitorRetryQueue (30min)                 ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
         ↕ (9) HTTPS API calls                ↕ (10) HTTPS API calls
┌───────────────────────────────┐  ┌──────────────────────────────────────────────┐
│   ANTHROPIC CLAUDE API        │  │   OPENAI + PINECONE                          │
│  • Summarization              │  │  • OpenAI: text-embedding-3-small (1536-dim) │
│  • Action item extraction     │  │  • Pinecone: Vector DB (upsert/query)        │
│  • Decision tracking          │  │    - Stores embeddings + metadata            │
│  • Priority analysis          │  │    - Semantic search queries                 │
└───────────────────────────────┘  └──────────────────────────────────────────────┘

DATA FLOW KEY:
(1) User taps "Summarize", types search, sends message
(2) Service layer calls Firestore or Cloud Functions
(3) Firebase SDK: Firestore writes/listeners, httpsCallable() for functions
(4) Real-time sync for messages, conversations (WebSocket)
(5) On-demand AI feature requests (HTTPS)
(6) Auth tokens validated, security rules enforced
(7) Firestore triggers fire on message create (priority, counter)
(8) Scheduled functions run periodically (embedding, batch priority)
(9) Cloud Functions call Claude API for AI processing
(10) Cloud Functions call OpenAI for embeddings, Pinecone for vector storage/search
```

### Data Flow Types

**Real-Time Sync (Core Messaging):** Client ↔ Firestore (WebSocket, < 100ms latency)  
**On-Demand AI Features:** Client → Cloud Functions → AI APIs → Client (3-10s latency)  
**Background Processing:** Scheduled Functions → Firestore/AI APIs (no user wait)  
**Triggered Processing:** Firestore writes → Cloud Function triggers (< 1s latency)

---

## Technology Stack

### Frontend (React Native)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Expo SDK** | 54.0.0 | Development platform, managed workflow |
| **React** | 19.1.0 | UI framework |
| **React Native** | 0.81 | Mobile app framework |
| **Expo Router** | 6.0.13 | File-based navigation (Next.js-style) |
| **Expo Go** | Latest | Development/testing app (no native build needed) |
| **TypeScript** | 5.9.2 | Type safety |

### State & Storage

| Technology | Purpose |
|------------|---------|
| **Zustand** | Lightweight global state (auth, conversations) |
| **AsyncStorage** | Local persistent storage (session, settings) |
| **Component State** | Screen-specific state (messages, forms, UI) |

### UI & Utilities

| Technology | Purpose |
|------------|---------|
| **React Native Paper** | Pre-built Material Design components |
| **Expo Vector Icons** | 3,000+ icons (Ionicons, Material, etc.) |
| **NetInfo** | Network status detection (online/offline) |
| **Expo Notifications** | Local notifications (foreground) |

### Backend (Firebase)

| Service | Purpose |
|---------|---------|
| **Firebase Authentication** | Email/password authentication |
| **Cloud Firestore** | Real-time NoSQL database |
| **Firebase Cloud Functions** | Serverless backend for AI features |
| **Firebase Web SDK** | Client library (v10+) |
| **Firestore Offline Persistence** | Local cache for offline support |

### AI Services

| Service | Purpose |
|---------|---------|
| **Anthropic Claude Sonnet 4** | LLM for summarization, action items, decisions, priority analysis (with Tool Use API) |
| **OpenAI text-embedding-3-small** | Generate 1536-dim embeddings for semantic search |
| **Pinecone** | Vector database for storing and querying message embeddings |

---

## Project File Structure

```
message-ai/
│
├── app/                                    # Expo Router screens
│   ├── _layout.tsx                        # Root: auth guard, presence, notifications
│   ├── index.tsx                          # Landing: redirect based on auth
│   │
│   ├── (auth)/                            # Auth screens (grouped)
│   │   ├── _layout.tsx                    # Auth stack layout
│   │   ├── login.tsx                      # Login screen
│   │   └── register.tsx                   # Register screen
│   │
│   ├── (tabs)/                            # Main app (tab navigation)
│   │   ├── _layout.tsx                    # Tabs layout
│   │   ├── index.tsx                      # Conversations list screen
│   │   └── new-chat.tsx                   # New chat creation screen
│   │
│   └── chat/
│       └── [id].tsx                       # Dynamic chat screen (1-on-1 & groups)
│
├── components/                            # Reusable UI components
│   ├── MessageBubble.tsx                  # Single message display
│   ├── MessageList.tsx                    # FlatList of messages
│   ├── MessageInput.tsx                   # Text input + send button
│   ├── ConversationItem.tsx               # Conversation list item
│   ├── TypingIndicator.tsx                # "User is typing..."
│   ├── UserStatusBadge.tsx                # Online/offline indicator
│   └── OfflineBanner.tsx                  # Network offline warning
│
├── store/                                 # Zustand state stores
│   ├── authStore.ts                       # Global: user, loading, session
│   └── chatStore.ts                       # Global: conversations, online statuses
│
├── services/                              # Business logic & Firebase interactions
│   ├── authService.ts                     # Register, login, logout, profiles
│   ├── firestoreService.ts                # Queries, mutations, message sending
│   ├── notificationService.ts             # Local notification triggers
│   └── presenceService.ts                 # Online/offline tracking
│
├── utils/                                 # Helper functions & constants
│   ├── constants.ts                       # App-wide constants (limits, timeouts)
│   ├── validators.ts                      # Input validation (email, password)
│   └── timeFormat.ts                      # Timestamp formatting utilities
│
├── firebase.config.js                     # Firebase initialization + offline persistence
├── .env                                   # Firebase credentials (gitignored)
├── app.json                               # Expo configuration
└── package.json                           # Dependencies
```

---

## Data Architecture

### Firestore Schema

#### `/users/{uid}`

```typescript
{
  email: string,                  // Lowercase, used for discovery
  displayName: string,            // User-chosen nickname
  isOnline: boolean,              // Real-time presence
  lastSeenAt: Timestamp,          // Server timestamp
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `/conversations/{conversationId}`

```typescript
{
  type: "direct" | "group",       // Conversation type
  name?: string,                  // Group name (optional for direct)
  participants: [uid1, uid2, ...], // Array of user IDs
  participantDetails: {           // Denormalized user info
    uid1: { displayName, email },
    uid2: { displayName, email }
  },
  lastMessageAt: Timestamp,       // For sorting conversations
  lastMessage: string,            // Preview text (max 100 chars)
  lastRead: {                     // Last-read tracking per user
    uid1: messageId,
    uid2: messageId
  },
  createdAt: Timestamp,
  creatorId?: string,             // Group creator (for groups only)
  
  // AI feature fields
  messageCount: number            // Incremented on each message (for cache invalidation)
}
```

#### `/conversations/{conversationId}/messages/{messageId}`

```typescript
{
  text: string,                   // Message content
  senderId: string,               // User ID of sender
  senderName: string,             // Denormalized for performance
  participants: [uid1, uid2, ...], // Denormalized for security rules
  createdAt: Timestamp,           // Server timestamp (CRITICAL)
  
  // AI feature fields
  embedded: boolean,              // Whether message has been indexed for search
  embeddedAt?: Timestamp,         // When embedding was created
  priority?: 'high' | 'medium' | 'low',  // AI-determined priority
  priorityQuick?: 'high' | 'low' | 'unknown',  // Quick heuristic result
  priorityAnalyzedAt?: Timestamp  // When full AI analysis completed
}
```

#### `/conversations/{conversationId}/ai_summaries/{summaryId}`

```typescript
{
  summary: string,                // Generated summary text
  keyPoints: string[],            // Array of key discussion points
  messageCount: number,           // Number of messages summarized
  messageCountAtGeneration: number,  // Conversation messageCount when generated (for cache)
  generatedAt: Timestamp,         // When summary was created
  generatedBy: string,            // UID of user who requested
  model: string                   // AI model used
}
```

#### `/conversations/{conversationId}/ai_action_items/{itemId}`

```typescript
{
  text: string,                   // Action item description
  assigneeUid?: string,           // UID if assignee identified
  assigneeDisplayName?: string,   // Display name of assignee
  assigneeEmail?: string,         // Email used for assignment resolution
  dueDate?: Timestamp,            // Extracted due date if mentioned
  sourceMessageId: string,        // Message where item was identified
  priority: 'high' | 'medium' | 'low',
  status: 'pending' | 'completed',
  sourceType: 'ai',               // Always 'ai' for initial release
  extractedAt: Timestamp,         // When item was extracted
  completedAt?: Timestamp
}
```

#### `/conversations/{conversationId}/ai_decisions/{decisionId}`

```typescript
{
  decision: string,               // The decision that was made
  context: string,                // Supporting context
  participants: string[],         // UIDs who agreed/participated
  sourceMessageIds: string[],     // Messages that led to decision
  decidedAt: Timestamp,           // When decision was made
  extractedAt: Timestamp          // When AI extracted it
}
```

#### `/users/{uid}/ai_usage/{month}`

```typescript
{
  month: string,                  // "2025-10"
  totalActions: number,           // All AI feature calls combined
  summaryCalls: number,           // Count per feature type
  actionItemCalls: number,
  searchCalls: number,
  priorityCalls: number,
  decisionCalls: number,
  totalCost: number,              // Estimated cost in USD
  actionsThisHour: number,        // Rate limiting
  hourStartedAt: Timestamp,
  lastUpdated: Timestamp
}
```

#### `/embedding_retry_queue/{messageId}`

```typescript
{
  messageId: string,
  conversationId: string,
  error: string,
  retryCount: number,
  nextRetryAfter: Timestamp,      // Exponential backoff
  queuedAt: Timestamp
}
```

#### `/conversations/{conversationId}/typingUsers/{userId}`

```typescript
{
  uid: string,                    // User ID
  displayName: string,            // User's display name
  at: Timestamp                   // When they started typing
}
```

### Data Flow Patterns

#### 1. Message Sending with AI Features (Optimistic Update + Triggers)

```
User types message in chat
    ↓
1. Add temp message to local state (status: "sending")
    ↓
2. Write to Firestore with:
   - serverTimestamp() for createdAt
   - embedded: false (NEW: marks for batch embedding)
   - text, senderId, senderName, participants
    ↓
3. Firestore write succeeds
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ PARALLEL TRIGGER #1: incrementMessageCounter                    │
│ (Real-time Cloud Function trigger)                              │
│  1. Triggered on message.onCreate()                             │
│  2. Update conversation doc:                                    │
│     conversation.messageCount += 1 (FieldValue.increment)       │
│  3. This invalidates caches if > threshold                      │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ PARALLEL TRIGGER #2: quickPriorityCheck                         │
│ (Real-time Cloud Function trigger)                              │
│  1. Triggered on message.onCreate()                             │
│  2. Run quick heuristic on message.text (< 10ms)                │
│  3. If "high": Send priority push notification immediately      │
│  4. Update message:                                             │
│     - priorityQuick: 'high' | 'low' | 'unknown'                 │
│     - priority: (same as priorityQuick or tentative)            │
│     - priorityNeedsAnalysis: true (if high or unknown)          │
└─────────────────────────────────────────────────────────────────┘
    ↓
4. Client's Firestore real-time listener receives new message
    ↓
5. Remove temp message, display real message with priority badge
    ↓
6. Update local state: conversation.lastMessage & lastMessageAt
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKGROUND: Batch Embedding (scheduled, every 5 minutes)        │
│  1. Query: messages where embedded: false                       │
│  2. Includes this new message (0-5 min delay)                   │
│  3. Generate embedding via OpenAI API                           │
│  4. Upsert to Pinecone with metadata                            │
│  5. Update message: embedded: true, embeddedAt: timestamp       │
│  6. Now searchable via semantic search                          │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKGROUND: Batch Priority Analysis (scheduled, every 10 min)   │
│  1. Query: messages where priorityNeedsAnalysis: true           │
│  2. Send to Claude API for accurate analysis                    │
│  3. Update message: priority: 'high'|'medium'|'low'             │
│  4. If downgraded from 'high': Send notification to user        │
└─────────────────────────────────────────────────────────────────┘

RESULT: Message is sent, readable immediately, priority detected fast,
        indexed for search within 5 min, priority refined within 10 min
```

#### 2. Real-Time Sync (Firestore Listeners)

```
Component mounts
    ↓
1. Set up onSnapshot() listener
    ↓
2. Firestore pushes updates via WebSocket
    ↓
3. Update local state
    ↓
4. React re-renders UI
    ↓
Component unmounts → unsubscribe() (CRITICAL)
```

#### 3. Offline Behavior

```
Network disconnects
    ↓
1. NetInfo detects offline state
    ↓
2. Show offline banner
    ↓
3. Messages marked as "queued"
    ↓
4. Firestore caches writes locally
    ↓
Network reconnects
    ↓
5. Firestore auto-syncs queued writes
    ↓
6. Hide offline banner
    ↓
7. Messages show "sent" status
```

#### 4. AI Batch Embedding Pipeline

```
Scheduled Cloud Function runs every 5 minutes
    ↓
1. Query for messages where embedded: false
    ↓
2. Batch embed up to 500 messages via OpenAI API
    ↓
3. Upsert embeddings to Pinecone with metadata
    ↓
4. Update Firestore messages: embedded: true
    ↓
5. If failure: Add to retry queue with exponential backoff
    ↓
Retry processor runs every 10 minutes
    ↓
6. Process failed embeddings from retry queue
    ↓
7. Remove from queue on success or after 5 attempts
```

#### 5. AI Feature Request Flow (Summarization Example)

```
User clicks "Summarize Thread"
    ↓
1. Client calls Cloud Function with timeout wrapper
    ↓
2. Cloud Function checks rate limit (50/hour per user)
    ↓
3. Check cache: valid if < 1 hour old AND < 5 new messages
    ↓
4. Cache hit: Return cached summary (< 1 second)
    ↓
5. Cache miss: Query Firestore for messages
    ↓
6. Send to Claude API with Tool Use
    ↓
7. Extract structured response (validated by Anthropic)
    ↓
8. Store in cache with messageCountAtGeneration
    ↓
9. Return to client
    ↓
10. Client displays summary in modal
```

#### 6. Hybrid Priority Detection

```
User sends message
    ↓
[Real-time path - Quick Heuristic]
1. Cloud Function trigger fires immediately
2. Run quick priority check (< 10ms)
3. If "high": Send enhanced push notification NOW
4. Update message: priority: 'high', priorityNeedsAnalysis: true
5. If "low": Update message: priority: 'low', priorityNeedsAnalysis: false
    ↓
[Batch path - AI Refinement]
6. Batch analyzer runs every 10 minutes
7. Query messages where priorityNeedsAnalysis: true
8. Send to Claude with Tool Use (analyze_message_priority tool)
9. Update message with final priority (already validated by Anthropic)
10. If downgraded from "high": Send notification to user
```

#### 7. Semantic Search with Hybrid Fallback

```
User types search query "budget discussion"
    ↓
Client calls semanticSearch Cloud Function with 10s timeout
    ↓
┌────────────────────────── CLOUD FUNCTION ───────────────────────────┐
│ 1. Check rate limit (50/hour, 1000/month)                           │
│    - Query /users/{uid}/ai_usage/{month}                            │
│    - If exceeded: throw 'resource-exhausted' error                  │
│    ↓                                                                 │
│ 2. [Vector Search Path]                                             │
│    a. Generate embedding for "budget discussion" via OpenAI         │
│       - API call: text-embedding-3-small                            │
│       - Returns: 1536-dim vector (< 200ms)                          │
│    b. Query Pinecone                                                │
│       - query({ vector, filter: { conversationId }, topK: 20 })    │
│       - Returns: 20 results with relevance scores (< 300ms)         │
│    c. Filter results in application code (SECURITY)                 │
│       - Keep only messages where user in participants array         │
│       - Slice to top 10                                             │
│    d. Fetch full message docs from Firestore (batch get)           │
│    ↓                                                                 │
│ 3. [Local Fallback Path - Parallel to step 2]                      │
│    a. Query Firestore: last 20 messages in conversation            │
│    b. Keyword search: message.text.includes("budget") (client-side)│
│    ↓                                                                 │
│ 4. [Merge Results]                                                  │
│    a. Deduplicate: remove local matches already in vector results  │
│    b. Sort: local matches first (most recent), then vector results │
│    c. Add metadata: { source: 'vector' | 'local', score: number }  │
│    ↓                                                                 │
│ 5. Return merged results to client                                  │
│    - Total time: < 800ms (target)                                   │
└──────────────────────────────────────────────────────────────────────┘
    ↓
Client receives results (or timeout after 3s)
    ↓
Display in search results UI:
- "Recent" badge for local matches (not yet embedded)
- Relevance score for vector matches
- Tap to jump to message in context
```

#### 8. Action Item Extraction Flow

```
User taps "Action Items" button in conversation
    ↓
Client calls extractActionItems Cloud Function with 8s timeout
    ↓
┌────────────────────────── CLOUD FUNCTION ───────────────────────────┐
│ 1. Validate auth & check user in conversation.participants          │
│    - If not: throw 'permission-denied' error                        │
│    ↓                                                                 │
│ 2. Check rate limit (50/hour, 1000/month)                           │
│    - Update /users/{uid}/ai_usage/{month}                           │
│    ↓                                                                 │
│ 3. Check cache                                                       │
│    - Query: /conversations/{id}/ai_action_items_cache               │
│    - Cache valid if: age < 24hr AND newMessages < 10                │
│    - If valid: return cached items (< 1s)                           │
│    ↓                                                                 │
│ 4. Cache miss: Query messages                                       │
│    - Get last 100 messages (or custom range)                        │
│    - Include: text, senderId, senderName, messageId, createdAt      │
│    ↓                                                                 │
│ 5. Get conversation participant details                             │
│    - conversation.participantDetails: { [uid]: { displayName, email }}│
│    ↓                                                                 │
│ 6. Send to Claude API with Tool Use                             │
│    - Model: claude-sonnet-4-20250514                             │
│    - Tool: extract_action_items (defined in aiTools.ts)         │
│    - Tool enforces JSON schema server-side (no parsing needed)  │
│    - Max tokens: 2000                                            │
│    ↓                                                              │
│ 7. Validate and process Tool Use response                       │
│    - Extract structured data from tool_use block                │
│    - Already parsed and validated by Anthropic                  │
│    - No JSON.parse() or Zod validation needed                   │
│    ↓                                                              │
│ 8. Resolve assignees                                             │
│    - For each item with assigneeIdentifier:                         │
│      a. If email: match to participant by email                     │
│      b. If display name: match to participant                       │
│         - If 1 match: assign                                        │
│         - If 2+ matches: log warning, leave null (ambiguous)        │
│      c. Store: assigneeUid, assigneeDisplayName, assigneeEmail      │
│    ↓                                                                 │
│ 9. Write action items to Firestore                                  │
│    - Create docs in /conversations/{id}/ai_action_items/{itemId}    │
│    - Batch write (all items at once)                                │
│    - Store in cache with messageCountAtGeneration                   │
│    ↓                                                                 │
│ 10. Return action items to client                                   │
│     - Total time: 2-4s (target), 6s (max)                           │
└──────────────────────────────────────────────────────────────────────┘
    ↓
Client receives action items (or timeout/error after 8s)
    ↓
Display in "Action Items" tab:
- List view with checkboxes
- Assignee avatars (if identified)
- Due dates (if extracted)
- Priority badges
- Tap source message to jump to context
- Toggle status: pending ↔ completed (writes to Firestore)
```

#### 9. Decision Tracking Flow

```
User taps "Decisions" button in group chat
    ↓
Client calls trackDecisions Cloud Function with 10s timeout
    ↓
┌────────────────────────── CLOUD FUNCTION ───────────────────────────┐
│ 1. Validate auth, rate limit, check cache (same as action items)    │
│    - Cache valid if: age < 24hr AND newMessages < 10                │
│    ↓                                                                 │
│ 2. Cache miss: Query messages (last 100 or custom range)            │
│    ↓                                                                 │
│ 3. Send to Claude API with Tool Use                              │
│    - Tool: track_decisions (defined in aiTools.ts)              │
│    - Tool enforces JSON schema server-side                      │
│    - Request: decision, context, confidence, participantIds     │
│    - Only returns decisions with confidence > 0.7               │
│    ↓                                                              │
│ 4. Process Tool Use response                                     │
│    - Extract structured data (already validated by Anthropic)   │
│    - Filter already applied by confidence threshold in tool     │
│    ↓                                                                 │
│ 5. Write decisions to Firestore                                     │
│    - /conversations/{id}/ai_decisions/{decisionId}                  │
│    - Store in cache with messageCountAtGeneration                   │
│    ↓                                                                 │
│ 6. Return decisions to client (3-4s target, 7s max)                 │
└──────────────────────────────────────────────────────────────────────┘
    ↓
Display in "Decisions" timeline:
- Decision text (bold)
- Context paragraph
- Participants who agreed (avatars)
- Date decided
- Tap to view source messages
```

#### 10. Rate Limiting Flow (All AI Features)

```
User triggers ANY AI feature (summary, action items, search, decisions)
    ↓
Cloud Function receives request
    ↓
┌────────────────────────── RATE LIMIT CHECK ──────────────────────────┐
│ 1. Get current month: "2025-10"                                      │
│    ↓                                                                  │
│ 2. Query: /users/{uid}/ai_usage/2025-10                              │
│    ↓                                                                  │
│ 3. If document doesn't exist:                                        │
│    - This is user's first AI action this month                       │
│    - Create doc with:                                                │
│      { totalActions: 1, actionsThisHour: 1,                          │
│        hourStartedAt: now, [featureName]Calls: 1 }                   │
│    - Allow request                                                   │
│    ↓                                                                  │
│ 4. Document exists: Check limits                                     │
│    a. Hourly check:                                                  │
│       - If (now - hourStartedAt) > 1 hour: reset actionsThisHour=0  │
│       - If actionsThisHour >= 50: DENY (throw 'resource-exhausted')  │
│    b. Monthly check:                                                 │
│       - If totalActions >= 1000: DENY (throw 'resource-exhausted')   │
│    ↓                                                                  │
│ 5. Limits OK: Increment counters in transaction                      │
│    - totalActions += 1                                               │
│    - actionsThisHour += 1 (or reset to 1 if hour elapsed)           │
│    - [featureName]Calls += 1 (e.g., summaryCalls)                   │
│    - Update hourStartedAt if hour elapsed                            │
│    - Update lastUpdated timestamp                                    │
│    ↓                                                                  │
│ 6. Allow request to proceed                                          │
└──────────────────────────────────────────────────────────────────────┘
    ↓
If DENIED:
- Client receives error: "You have exceeded your AI usage limit..."
- Display user-friendly message
- Show current usage stats (optional)
    ↓
If ALLOWED:
- Continue with AI feature processing
- User sees loading state, then results
```

#### 11. Complete End-to-End AI Feature Journey (Thread Summarization Example)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FULL STACK DATA FLOW                                  │
│           (From User Tap to AI Result Display)                           │
└─────────────────────────────────────────────────────────────────────────┘

[REACT NATIVE CLIENT - Device]
User taps "Summarize Thread" button
    ↓
Screen: Show loading modal "Analyzing 50 messages..."
    ↓
Service Layer: aiService.ts
    ↓
const summary = await callAIFeatureWithTimeout(
  'generateSummary',
  { conversationId: 'abc123', messageCount: 50 },
  10000  // 10s timeout
)
    ↓
Firebase SDK: httpsCallable(functions, 'generateSummary')
    ↓ (1) HTTPS POST Request
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[FIREBASE CLOUD FUNCTION - Server in GCP us-central1]
    ↓ (2) Function receives request
exports.generateSummary = functions.https.onCall(async (data, context) => {
    ↓
  // STEP 1: Auth check (< 1ms)
  if (!context.auth) throw HttpsError('unauthenticated');
    ↓
  // STEP 2: Permission check (50ms - Firestore read)
  const conversation = await db.doc(`conversations/${data.conversationId}`).get();
  if (!conversation.data().participants.includes(context.auth.uid)) {
    throw HttpsError('permission-denied');
  }
    ↓
  // STEP 3: Rate limit check (100ms - Firestore transaction)
  const allowed = await checkAIRateLimit(context.auth.uid, 'summary');
  if (!allowed) throw HttpsError('resource-exhausted', 'Usage limit exceeded');
    ↓
  // STEP 4: Cache check (50ms - Firestore read)
  const cache = await getCachedSummary(data.conversationId, data.messageCount);
  if (cache) return cache;  // ✓ CACHE HIT - Return immediately (total: 200ms)
    ↓
  // CACHE MISS - Continue processing
  // STEP 5: Query messages (200ms - Firestore query)
  const messages = await db.collection(`conversations/${data.conversationId}/messages`)
    .orderBy('createdAt', 'desc')
    .limit(data.messageCount)
    .get();
    ↓
  // STEP 6: Format messages for Claude (< 1ms)
  const formattedMessages = messages.docs.map(doc => 
    `[${doc.data().senderName}]: ${doc.data().text}`
  ).join('\n');
    ↓ (3) External API call
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ANTHROPIC CLAUDE API - External Service]
    ↓
  // STEP 7: Send to Claude with Tool Use (2-5 seconds)
  const response = await callClaudeWithTool(prompt, generateSummaryTool, {
    maxTokens: 1500
  });
  // Response is already parsed JSON (no JSON.parse needed!)
    ↓ (4) Structured JSON response
  {
    "summary": "The team discussed Q4 budget allocation...",
    "keyPoints": [
      "Budget increased by 15% for engineering",
      "Hiring freeze until January",
      "New project starts in November"
    ]
  }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[FIREBASE CLOUD FUNCTION - Continued]
    ↓
  // STEP 8: Response is already validated by Anthropic (< 1ms)
  const validatedSummary = response; // Already structured and type-safe
  // Tool Use guarantees schema compliance - no manual validation needed
    ↓
  // STEP 9: Store in cache (100ms - Firestore write)
  await db.doc(`conversations/${data.conversationId}/ai_summaries/latest`).set({
    ...validatedSummary,
    messageCount: data.messageCount,
    messageCountAtGeneration: conversation.data().messageCount,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    generatedBy: context.auth.uid,
    model: "claude-sonnet-4"
  });
    ↓
  // STEP 10: Return to client (< 1ms)
  return validatedSummary;
});
    ↓ (5) HTTPS Response (total time: 3-5s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[REACT NATIVE CLIENT - Device]
    ↓ (6) Promise resolves
Firebase SDK returns result to service layer
    ↓
aiService.ts validates result, updates state
    ↓
setState({ summary: result, loading: false })
    ↓
React re-renders UI
    ↓
[SCREEN DISPLAYS]
┌─────────────────────────────────────────────┐
│  Thread Summary                             │
│  ───────────────                            │
│  Summary:                                   │
│  "The team discussed Q4 budget allocation...│
│                                             │
│  Key Points:                                │
│  • Budget increased by 15% for engineering  │
│  • Hiring freeze until January              │
│  • New project starts in November           │
│                                             │
│  50 messages • Nov 1-15                     │
│                                             │
│  [Close]  [Share Summary]                   │
└─────────────────────────────────────────────┘

TOTAL TIME: 3-5 seconds (target), 8 seconds (max), 10 seconds (timeout)

ALTERNATIVE FLOWS:
- If cache hit: 200ms (steps 1-4 only)
- If timeout (> 10s): Client shows "Request taking too long, try again"
- If rate limited: Client shows "Usage limit exceeded, try again in X minutes"
- If API error: Client shows "Summary failed, please try again"
- If network offline: Firestore SDK queues request, processes when online
```

### Data Flow Summary Table

| Flow | Type | Latency | User Wait? | Purpose |
|------|------|---------|------------|---------|
| Message sending | Real-time trigger | < 100ms | No (optimistic) | Core messaging |
| Priority detection (heuristic) | Real-time trigger | < 10ms | No | Quick notification |
| Message counter increment | Real-time trigger | < 50ms | No | Cache invalidation |
| Batch embedding | Scheduled (5 min) | N/A | No | Search indexing |
| Batch priority analysis | Scheduled (10 min) | N/A | No | Priority refinement |
| Thread summarization | On-demand | 3-5s (target) | Yes | AI feature |
| Action item extraction | On-demand | 2-4s (target) | Yes | AI feature |
| Semantic search | On-demand | < 800ms (target) | Yes | AI feature |
| Decision tracking | On-demand | 3-4s (target) | Yes | AI feature |
| Rate limit check | On-demand (inline) | < 100ms | No | Abuse prevention |

---

## Key Architectural Decisions

### 1. Hybrid State Management

**Decision:** Zustand for global, Component State for local

**Why:**

- Better performance (fewer re-renders)
- Cleaner separation of concerns
- Component state auto-cleans on unmount

**Implementation:**

- **Zustand:** Auth state, conversations list, online statuses
- **Component State:** Messages, form inputs, UI states, typing indicators

### 2. Last-Read Tracking (Not Per-Message Read Receipts)

**Decision:** Store `lastReadMessageId` per user per conversation

**Why:**

- Single Firestore write per conversation (vs N writes for N messages)
- Simpler queries
- Sufficient for MVP

**Trade-off:** Can't show "Alice read message #5 but not #6" granularity (acceptable)

### 3. Denormalized Participants in Messages

**Decision:** Each message includes `participants: [uid1, uid2, ...]`

**Why:**

- Firestore security rules can check permissions without extra `get()` calls
- Faster permission checks
- Lower cost

**Trade-off:** ~100 bytes per message (minimal overhead)

### 4. Server Timestamps (CRITICAL)

**Decision:** ALWAYS use `serverTimestamp()`, NEVER client `new Date()`

**Why:**

- Client clocks are unreliable (timezones, user changes)
- Message ordering breaks with client timestamps
- Firestore guarantees consistent server time

**Implementation:**

```typescript
// ✅ CORRECT
createdAt: serverTimestamp()

// ❌ WRONG - Will break message ordering
createdAt: new Date()
```

### 5. Typing Indicator Debounce (500ms)

**Decision:** Update typing status max once per 500ms

**Why:**

- Balance between responsiveness and Firestore write costs
- Clear after 500ms inactivity or on send

### 6. Message Timeout Detection (10 seconds)

**Decision:** Mark message as "failed" if not sent within 10 seconds

**Why:**

- Distinguish "queued" (offline) vs "failed" (error/timeout)
- Better user feedback than indefinite "sending"

---

## Client-Server Interactions

### Authentication Flow

```
User registers/logs in
    ↓
1. Client: Firebase Auth createUser/signIn (HTTPS)
    ↓
2. Server: Validates credentials
    ↓
3. Server: Returns auth token + user ID
    ↓
4. Client: Creates/fetches Firestore user doc
    ↓
5. Client: Stores in Zustand + AsyncStorage
    ↓
6. Client: Sets user online (isOnline: true)
```

### Message Sending Flow

```
User sends message
    ↓
1. Client: Optimistic update (add to UI immediately)
    ↓
2. Client: Firestore addDoc() to messages subcollection (HTTPS → WebSocket)
    ↓
3. Server: Firestore receives write request
    ↓
4. Server: Applies security rules check
    ↓
5. Server: Writes to database with serverTimestamp()
    ↓
6. Server: Broadcasts change to all listeners (WebSocket)
    ↓
7. Client (all participants): onSnapshot() callback fires
    ↓
8. Client: Update UI with real message, remove temp
```

### Real-Time Listening (Firestore onSnapshot)

```
Screen mounts
    ↓
1. Client: Set up onSnapshot() listener (WebSocket)
    ↓
2. Server: Initial data sent (all existing docs)
    ↓
3. Client: Render initial state
    ↓
[Loop while mounted]
    ↓
4. Server: Doc added/modified/deleted
    ↓
5. Server: Push update via WebSocket
    ↓
6. Client: onSnapshot() callback with docChanges()
    ↓
7. Client: Update state, trigger re-render
    ↓
[On unmount]
    ↓
8. Client: unsubscribe() - close WebSocket
```

### Presence Tracking

```
App state changes (active ↔ background)
    ↓
1. Client: AppState listener detects change
    ↓
2. Client: Update Firestore user doc
    - Active: { isOnline: true, lastSeenAt: serverTimestamp() }
    - Background: { isOnline: false, lastSeenAt: serverTimestamp() }
    ↓
3. Server: Firestore updates user doc
    ↓
4. Server: Broadcast to listeners
    ↓
5. Other clients: onSnapshot() on user doc receives update
    ↓
6. Other clients: Update UI (online indicator changes)
```

---

## Network Architecture

### Connection Types

| Service | Protocol | Purpose |
|---------|----------|---------|
| Firebase Auth | HTTPS | Token generation, validation |
| Firestore Writes | HTTPS → WebSocket | Initial write, then real-time updates |
| Firestore Reads (one-time) | HTTPS | Single query (getDocs, getDoc) |
| Firestore Reads (real-time) | WebSocket | onSnapshot() listeners |
| Offline Persistence | Local IndexedDB | Cache for offline operation |

### Offline Architecture

```
[Online Mode]
Client ←WebSocket→ Firestore
   ↓
Client writes → Firestore → Broadcast to listeners

[Going Offline]
Client detects disconnect (NetInfo)
   ↓
Firestore SDK buffers writes in IndexedDB cache
   ↓
UI shows "queued" status

[Coming Online]
Client reconnects
   ↓
Firestore SDK auto-flushes buffered writes
   ↓
Real-time listeners receive updates
   ↓
UI updates to "sent" status
```

---

## Security Architecture

### Authentication

- **Method:** Email/password (Firebase Auth)
- **Session:** Firebase auth token (auto-refreshed)
- **Persistence:** AsyncStorage stores user object locally
- **Logout:** Clear Firestore, AsyncStorage, Zustand

### Authorization (Firestore Security Rules)

**MVP Rules (Test Mode - INSECURE):**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Production Rules (Phase 7):**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read all, only update their own
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    
    // Conversations: participants only
    match /conversations/{conversationId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      allow update: if request.auth.uid in resource.data.participants;
    }
    
    // Messages: check denormalized participants array
    match /conversations/{conversationId}/messages/{messageId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && 
                      request.auth.uid in request.resource.data.participants;
    }
    
    // Typing: only your own
    match /conversations/{conversationId}/typingUsers/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### Data Validation

**Client-side:**

- Email format validation
- Password length (6+ chars)
- Display name required
- Message text non-empty

**Server-side (Firestore Rules):**

- Authentication required
- Participant membership checked
- User can only write as themselves

---

## Performance Optimizations

### 1. Message Pagination

- Load last 100 messages per conversation (not all)
- Uses Firestore `limit(100)` query
- Infinite scroll pagination: Phase 2

### 2. Typing Indicator Debounce

- Max 1 update per 500ms (not per keystroke)
- Reduces Firestore writes by ~90%

### 3. Denormalized Data

- `senderName` copied into message (avoid user lookup)
- `participants` array in messages (faster security checks)
- `participantDetails` in conversations (avoid multiple user queries)

### 4. Component State for Messages

- Messages stored in component state (not Zustand)
- Automatic cleanup on unmount
- Fewer re-renders in other components

### 5. Firestore Offline Persistence

- IndexedDB cache on client
- Works offline automatically
- Reduces server reads by ~70%

---

## Development Workflow

### Local Development

```bash
# Start Expo dev server
npx expo start

# Start with tunnel (for physical devices)
npx expo start --tunnel

# Android emulator
npx expo start --android

# iOS simulator (macOS)
npx expo start --ios

# Clear cache
npx expo start --clear
```

### Testing

- **Emulator:** Android Studio AVD / iOS Simulator
- **Physical Device:** Expo Go app (scan QR code)
- **Network Testing:** NetInfo + airplane mode
- **Multi-user Testing:** Multiple emulators/devices

### Deployment

- **MVP:** Expo Go only (no build needed)
- **Production (Phase 2):** EAS Build for standalone apps

---

## Limitations & Constraints

### MVP Limitations

| Feature | MVP Status | Phase 2 |
|---------|-----------|---------|
| Background push notifications | ❌ Local only | ✅ FCM + EAS Build |
| Infinite scroll (old messages) | ❌ Last 100 only | ✅ Pagination |
| Message editing/deletion | ❌ Not supported | ✅ Planned |
| Media uploads (images, files) | ❌ Not supported | ✅ Planned |
| End-to-end encryption | ❌ Not supported | ✅ Planned |
| Username system | ❌ Email only | ✅ Planned |

### Technical Constraints

- **Expo Go:** No custom native modules
- **Firestore:** 1MB max doc size (messages are small, not an issue)
- **Firestore:** 500 writes/sec/doc (typing indicators could hit this)
- **AsyncStorage:** 6MB limit on Android (sufficient for session data)

---

## Monitoring & Debugging

### Tools

| Tool | Purpose |
|------|---------|
| Expo DevTools | Hot reload, logs, performance |
| Firebase Console | Database browser, auth users, rules playground |
| React DevTools | Component hierarchy, props, state |
| Chrome DevTools | Network tab, console logs |
| Reactotron (optional) | Redux-like state inspection for Zustand |

### Logging Strategy

```typescript
// Development
console.log('User logged in:', user.uid);

// Production (Phase 2)
// Use Firebase Analytics or Sentry
```

---

## Scaling Considerations (Post-MVP)

### Performance

- **If conversations > 1000:** Implement pagination
- **If messages > 1000/conversation:** Implement infinite scroll
- **If typing indicators > 50 writes/sec:** Increase debounce

### Cost Optimization

- **Firestore reads:** Aggressive caching, longer TTL
- **Firestore writes:** Batch operations, reduce typing indicator frequency
- **Storage:** Add Firestore quota alerts

### Reliability

- **Add retry logic** for failed messages
- **Add connection recovery** for long disconnects
- **Add data sync verification** after offline periods

---

## Summary

**Architecture Type:** Client-Server with Real-Time Sync

**Key Technologies:**

- **Frontend:** React Native + Expo
- **Backend:** Firebase (Authentication + Firestore)
- **State:** Hybrid (Zustand + Component State)
- **Routing:** Expo Router (file-based)

**Core Patterns:**

- Real-time listeners with cleanup
- Optimistic UI updates
- Server timestamps for consistency
- Denormalized data for performance
- Offline-first with local cache

### 7. Batch Embedding Pipeline (Not Real-Time)

**Decision:** Process embeddings in scheduled batches (every 5 minutes) instead of real-time triggers

**Why:**

- Cost efficient: Batch API calls are cheaper than individual calls
- Natural rate limiting: 500 messages per batch prevents runaway costs
- Simpler error handling: Retry queue for failed embeddings
- No impact on message sending performance

**Trade-off:** Up to 5-minute delay for new messages to become searchable (mitigated by hybrid search with local fallback)

### 8. Hybrid Priority Detection

**Decision:** Quick heuristic for immediate notifications + batch AI for accuracy

**Why:**

- Notifications need speed: Heuristic runs in <10ms
- Accuracy over time: AI refinement happens asynchronously
- Cost reduction: ~70% of messages skip AI analysis
- User transparency: Notification if priority changes

**Trade-off:** Initial priority might be incorrect (~30% cases), but corrected within 10 minutes

### 9. Per-Conversation Caching (Not Per-User)

**Decision:** Cache AI results per conversation, shared by all participants

**Why:**

- AI features are not personalized (same summary for everyone)
- Higher cache hit rate (any user triggers cache for all)
- Reduced costs: One AI call serves multiple users
- Simpler cache invalidation logic

**Trade-off:** Cannot personalize AI features per user (acceptable for MVP)

### 10. Defense-in-Depth Security for Search

**Decision:** Filter Pinecone results in application code even if Pinecone supports filtering

**Why:**

- Pinecone metadata filter syntax uncertain for array fields
- Extra layer prevents security bugs
- Small performance cost for guaranteed security
- Fail-safe if Pinecone filter misconfigured

**Trade-off:** Slight performance overhead (query 2x results, then filter)

### 11. Message Counter for Cache Invalidation

**Decision:** Increment counter on each message for smart cache invalidation

**Why:**

- More intelligent than time-only invalidation
- "< 5 new messages" criteria prevents stale summaries
- Low overhead: Single field increment per message
- Firestore.FieldValue.increment() handles concurrency well

**Trade-off:** Potential contention in very high-volume chats (>10 msgs/sec), but rare

**Critical Rules:**

1. Always use `serverTimestamp()`
2. Always unsubscribe from listeners
3. Never upgrade pinned dependencies
4. Test offline behavior thoroughly
5. Always initialize messages with `embedded: false`
6. Always use Anthropic Tool Use API for Claude (no manual JSON parsing)
7. Always apply security filters to Pinecone results in application code
8. Always handle AI API failures gracefully (don't break core messaging)
9. Always use `conversationId_messageId` format for Pinecone vector IDs

---

**For detailed implementation, see:**

- `ai-prd.md` for complete AI features specification, risk callouts, and testing procedures
- `mvp-prd-plus.md` for core messaging features (existing MVP)
- `PHASE_0_SETUP.md` through `PHASE_7` for historical phase documentation
- `FILE_STRUCTURE_GUIDE.md` for code examples
- `QUICK_REFERENCE.md` for patterns

**AI Features Summary:**

- 5 AI features: Thread Summarization, Action Item Extraction, Smart Search, Priority Message Detection, Decision Tracking
- Architecture: Batch embedding pipeline (every 5 min), hybrid priority detection, per-conversation caching
- External dependencies: Anthropic Claude Sonnet 4, OpenAI text-embedding-3-small, Pinecone vector database
- Security: Defense-in-depth filtering, rate limiting (50/hour, 1000/month per user), Tool Use API validation
- Cost: ~$0.90/user/month + $70/month Pinecone + Firebase Cloud Functions pay-as-you-go

See `ai-prd.md` for complete details including troubleshooting guides and manual testing procedures.

---

# PHASE 4: WORKSPACES & PAID TIER ARCHITECTURE

**Implementation Date:** October 2025  
**Status:** Complete (Sub-Phases 1-8, 10-11)  
**Related Documents:**

- `phase4-paid-tier/WORKSPACES-PAID-TIER-PRD.md`
- `phase4-paid-tier/PRD-SUPPLEMENT-SUB-PHASE-6.5-GROUP-CHAT-INVITES.md`
- `phase4-paid-tier/PRD-SUPPLEMENT-SUB-PHASE-7-WORKSPACE-ADMIN.md`

---

## Overview

Phase 4 transforms MessageAI from a personal messaging app into a team collaboration platform with a two-tier subscription model. This phase adds:

1. **Subscription Tiers** - Free (with 5-day trial), Pro ($3/month), Workspace ($0.50/user/month)
2. **Workspaces** - Isolated team environments with admin controls
3. **Spam Prevention** - Dual ban system with strike tracking and decay
4. **Invitation Systems** - Accept/decline/report spam flows for workspaces, group chats, and DMs
5. **User Blocking** - One-way blocking with security rule enforcement
6. **Message Editing/Deletion** - Pro-only feature with edit history
7. **Phone Number Auth** - Required at signup, primary search identifier
8. **Workspace Admin Features** - Urgency markers, pinned messages, capacity expansion
9. **Export Functionality** - JSON exports for workspaces and user conversations
10. **Refactored Service Layer** - 6 helper utilities for cleaner architecture

---

## Table of Contents - Phase 4

- [A. Subscription Tiers & Feature Gating](#a-subscription-tiers--feature-gating)
- [B. Workspaces Architecture](#b-workspaces-architecture)
- [C. Spam Prevention System](#c-spam-prevention-system)
- [D. Invitation Systems](#d-invitation-systems)
- [E. User Blocking & Conversation Hiding](#e-user-blocking--conversation-hiding)
- [F. Message Editing & Deletion](#f-message-editing--deletion)
- [G. Phone Number Integration](#g-phone-number-integration)
- [H. Workspace Admin Features](#h-workspace-admin-features)
- [I. Export Functionality](#i-export-functionality)
- [J. Phase 4 Data Model](#j-phase-4-data-model)
- [K. Phase 4 Cloud Functions](#k-phase-4-cloud-functions)
- [L. Phase 4 Service Layer](#l-phase-4-service-layer)
- [M. Phase 4 Architectural Decisions](#m-phase-4-architectural-decisions)
- [N. Phase 4 Security Architecture](#n-phase-4-security-architecture)

---

## A. Subscription Tiers & Feature Gating

### A.1 Tier Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         SUBSCRIPTION TIER MODEL                             │
└────────────────────────────────────────────────────────────────────────────┘

FREE TIER (Default)                PRO TIER ($3/month)           WORKSPACE TIER
──────────────────                 ───────────────────           (+$0.50/user/month)
                                                                 ────────────────────
• 5-day trial (full Pro)          • All AI features everywhere   • Everything in Pro
• Basic messaging (unlimited)     • Unlimited conversations      • Create up to 5 workspaces
• AI features in workspaces only  • Message editing/deletion     • Max 25 members per workspace
• Join workspaces (if invited)    • Export conversations         • Admin controls:
• Cannot create workspaces        • Can create workspaces          - Assign action items
• 500 user MVP limit              • Priority support               - Edit AI content
                                                                   - Mark urgent messages
                                                                   - Pin messages
                                                                   - Capacity expansion
                                                                 • Pre-selected capacity model
                                                                   (pay for all seats)
```

### A.2 Trial State Machine

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        5-DAY FREE TRIAL FLOW                                  │
└──────────────────────────────────────────────────────────────────────────────┘

[User Registers]
     │
     ↓
[trialStartedAt: now]
[trialEndsAt: now + 5 days]
[trialUsed: true]
     │
     │ ← TRIAL ACTIVE (Days 1-5)
     │    • All AI features work everywhere (like Pro)
     │    • Cannot create workspaces (Pro subscription required)
     │    • Banner: "X days remaining in trial"
     │
     ↓
[Day 3: Warning notification]
[Day 4: Warning notification]
[Day 5: Final warning]
     │
     ↓
[trialEndsAt reached]
     │
     ├─→ [User upgrades to Pro]
     │        │
     │        ↓
     │   [isPaidUser: true]
     │   [trialEndsAt: null]
     │   [Full Pro access]
     │
     └─→ [Trial expires, no upgrade]
              │
              ↓
         [FREE USER]
         • AI features locked to workspace chats only
         • Sparkle menu (✨) shows upgrade prompt in personal chats
         • Basic messaging works everywhere
```

### A.3 Feature Access Matrix

| Feature | Free (Trial) | Free (Post-Trial) | Pro | Workspace Admin |
|---------|-------------|-------------------|-----|-----------------|
| **Basic Messaging** | ✅ | ✅ | ✅ | ✅ |
| **AI Features (Personal)** | ✅ | ❌ Upgrade | ✅ | ✅ |
| **AI Features (Workspace)** | ✅ | ✅ | ✅ | ✅ |
| **Create Workspaces** | ❌ | ❌ | ✅ | ✅ |
| **Join Workspaces** | ✅ | ✅ | ✅ | ✅ |
| **Edit AI Content** | ❌ | ❌ | ✅ (personal) | ✅ (workspace) |
| **Assign Action Items** | ❌ | ❌ | ❌ | ✅ (workspace) |
| **Mark Urgent** | ❌ | ❌ | ❌ | ✅ (workspace) |
| **Pin Messages** | ❌ | ❌ | ❌ | ✅ (workspace) |
| **Edit/Delete Messages** | ❌ | ❌ | ✅ | ✅ |
| **Export Conversations** | ❌ | ❌ | ✅ | ✅ |
| **Export Workspace** | ❌ | ❌ | ❌ | ✅ (admin only) |

### A.4 Feature Gating Implementation

**Client-Side Check:**

```typescript
// utils/userPermissions.ts
export function canAccessAIFeatures(
  user: User, 
  conversation: Conversation
): boolean {
  // Pro users can access AI everywhere
  if (user.isPaidUser) return true;
  
  // Users in 5-day trial get full Pro access
  if (user.trialEndsAt && Date.now() < user.trialEndsAt.toMillis()) {
    return true;
  }
  
  // Free users (after trial) can only access AI in workspace chats
  if (conversation.workspaceId) {
    return isUserInWorkspace(user.uid, conversation.workspaceId);
  }
  
  // Free users outside workspaces: no AI (show upgrade prompt)
  return false;
}

export function canAccessWorkspaceAdminFeatures(
  user: User,
  workspace: Workspace
): boolean {
  // Must be Pro user AND workspace admin
  return user.isPaidUser && workspace.adminUid === user.uid;
}
```

**Server-Side Validation (Cloud Functions):**

```typescript
// All AI Cloud Functions check access
export const generateSummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  const user = await getUser(context.auth.uid);
  const conversation = await getConversation(data.conversationId);
  
  // Pro users can access AI everywhere
  if (user.isPaidUser) {
    // Proceed...
    return;
  }
  
  // Check if user in trial
  if (user.trialEndsAt && Date.now() < user.trialEndsAt.toMillis()) {
    // Trial active: proceed
    return;
  }
  
  // Free users can only access AI in workspace chats
  if (conversation.workspaceId) {
    const workspace = await getWorkspace(conversation.workspaceId);
    if (workspace.members.includes(context.auth.uid)) {
      // Free user in workspace chat: allowed
      return;
    }
  }
  
  // Free user in personal chat: denied
  throw new functions.https.HttpsError(
    'permission-denied',
    'AI features require Pro subscription'
  );
});
```

### A.5 Upgrade Flow (MVP Mode)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       MVP UPGRADE FLOW (No Real Payment)                      │
└──────────────────────────────────────────────────────────────────────────────┘

[Free User clicks "Upgrade to Pro"]
     │
     ↓
[Confirmation Modal]
"Upgrade to Pro ($3/month)"
"MVP Mode: Instant upgrade"
"In production, this would open Stripe"
     │
     ├─→ [Cancel] → No change
     │
     └─→ [Upgrade Now]
              │
              ↓
         [Cloud Function: upgradeToPro]
              │
              ↓
         [Update Firestore]
         • isPaidUser: true
         • subscriptionTier: 'pro'
         • subscriptionStartedAt: now
         • trialEndsAt: null (no longer in trial)
              │
              ↓
         [Success Alert]
         "✅ Upgrade successful!"
         "AI features unlocked"
              │
              ↓
         [Client refreshes user profile]
         [UI updates to show Pro status]
         [AI features enabled everywhere]
```

---

## B. Workspaces Architecture

### B.1 Workspace Concept

A **Workspace** is an isolated team environment with:

- Single admin (creator, must be Pro user)
- Admin pre-selects max users (2-25) and pays $0.50/seat/month
- Up to 25 members (free or paid users - admin pays for all)
- Group chats (workspace-specific)
- Direct chats (workspace-specific, accessible only while in workspace)
- Admin controls for collaboration
- **Key benefit for free users:** AI features work in workspace chats!

### B.2 Workspace Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        WORKSPACE LIFECYCLE FLOW                               │
└──────────────────────────────────────────────────────────────────────────────┘

[CREATION]
Pro User creates workspace
     │
     ↓
[Cloud Function: createWorkspace]
• Validates: user is Pro, name unique, capacity 2-25
• Creates /workspaces/{id} document
• Sets creator as admin
• Adds admin to members array
• maxUsersThisMonth = selected capacity
• Billing starts (pro-rated)
     │
     ↓
[INVITATION]
Admin invites members by email
     │
     ↓
[Cloud Function: inviteToWorkspace]
• Creates /workspace_invitations/{id}
• Sends notification to invitee
• Invitee sees: Accept | Decline | Report Spam
     │
     ├─→ [Accept] → Member added to workspace
     │
     ├─→ [Decline] → Invitation deleted
     │
     └─→ [Report Spam] → Admin gets +1 spam strike
     │
     ↓
[ACTIVE WORKSPACE]
Members can:
• Send messages in workspace chats
• Use AI features (even if free tier)
• Create group chats
• Direct message other members
     │
     │ Admin can:
     │ • Invite/remove members
     │ • Assign action items
     │ • Edit AI content
     │ • Mark messages urgent
     │ • Pin messages
     │ • Expand capacity (pro-rated payment)
     │ • Export workspace data
     │ • Delete workspace
     │
     ↓
[PAYMENT FAILURE?]
     │
     ├─→ [Payment succeeds] → Continue active
     │
     └─→ [Payment fails]
              │
              ↓
         [READ-ONLY STATE]
         • workspace.isActive = false
         • Members can read messages
         • Cannot send messages
         • Banner: "Workspace read-only (payment issue)"
         • Admin sees: "Update Payment" button
              │
              ├─→ [Payment resolved] → Active again
              │
              └─→ [No resolution] → Stays read-only (NO 30-day deletion)
     │
     ↓
[DELETION]
Admin deletes workspace OR admin account deleted
     │
     ↓
[Cloud Function: deleteWorkspace]
• Deletes all workspace conversations
• Deletes all messages in those conversations
• Removes workspace from all member profiles
• Sends notifications to all members
• Billing stops
• workspace.count-- for admin (can create another)
```

### B.3 Workspace Data Isolation

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        WORKSPACE DATA ISOLATION                               │
└──────────────────────────────────────────────────────────────────────────────┘

USER'S VIEW:                        DATABASE STRUCTURE:
                                    
┌─────────────────────┐            /workspaces/{workspaceId}
│  Personal Mode      │            ├── name: "Marketing Team"
│  ─────────────      │            ├── adminUid: alice123
│  • Direct chats     │            ├── members: [alice, bob, charlie]
│  • Group chats      │            ├── maxUsersThisMonth: 10
│  • (No workspace)   │            └── isActive: true
└─────────────────────┘            
                                    /conversations/{convId}
        ↕ Toggle                    ├── workspaceId: ws_abc (FILTER KEY)
                                    ├── type: "group"
┌─────────────────────┐            ├── participants: [alice, bob]
│  Workspace Mode     │            └── isWorkspaceChat: true
│  ───────────────    │            
│  Marketing Team:    │            SECURITY:
│  • Group chats     │             • Security rules check workspace membership
│  • Direct chats    │             • Non-members cannot read workspace conversations
│  • 10 members      │             • Removed members immediately lose access
└─────────────────────┘            • Firestore queries filter by workspaceId

KEY PRINCIPLE: Conversations are scoped to workspaces via `workspaceId` field
```

### B.4 Capacity Management

**Pre-Selected Capacity Model:**

- Admin selects capacity (2-25) at creation
- Pays for ALL seats, even if unfilled
- Example: 10-seat workspace = $5/month (even with 5 members)

**Expansion Flow:**

```
[Admin tries to invite 11th member when capacity = 10]
     │
     ↓
[Capacity Expansion Modal]
"Workspace Capacity Full"
• Current: 10/10 members
• Expansion: 11 seats (+1)
• Pro-rated charge: $0.25 (15 days remaining)
• Next month: $5.50/month
     │
     ├─→ [Cancel] → No change
     │
     └─→ [Expand & Pay]
              │
              ↓
         [Cloud Function: expandWorkspaceCapacity]
         • Calculate pro-rated charge
         • Process payment (Stripe in prod, mock in MVP)
         • Update maxUsersThisMonth
         • Log billing event
              │
              ├─→ [Success] → Capacity expanded, invitation sent
              │
              └─→ [Failure] → Workspace becomes read-only
```

**Billing Calculation:**

```typescript
// Pro-rated billing for mid-month expansion
const daysInMonth = 30;
const daysRemaining = 15;
const additionalSeats = 1;
const pricePerSeat = 0.50;

const proratedCharge = additionalSeats * pricePerSeat * (daysRemaining / daysInMonth);
// = 1 * 0.50 * (15 / 30) = $0.25
```

### B.5 Workspace Limits & Constraints

| Limit | Value | Reasoning |
|-------|-------|-----------|
| **Max workspaces per user** | 5 | Prevent abuse, manageable for admins |
| **Max members per workspace** | 25 | MVP simplicity, enterprise tier for larger teams |
| **Min capacity** | 2 | Must have at least admin + 1 member |
| **Max capacity** | 25 | Same as member limit |
| **Workspace name uniqueness** | Per-user | Better UX (prevents dropdown confusion) |
| **Admin transfer** | Not supported | Simplifies ownership model |
| **Co-admins** | Not supported | MVP simplicity |

---

## C. Spam Prevention System

### C.1 Dual Ban System

Phase 4 implements a sophisticated spam prevention system with TWO ban types:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           DUAL BAN SYSTEM                                     │
└──────────────────────────────────────────────────────────────────────────────┘

SPAM REPORT TRIGGERS:
• Workspace invitation spam
• Group chat invitation spam
• Direct message spam

                    │
                    ↓
            [calculateActiveStrikes()]
                    │
        ┌───────────┴───────────┐
        │                       │
        ↓                       ↓
[24-HOUR TEMP BAN]      [INDEFINITE BAN]
Triggered by:           Triggered by:
• 2+ strikes in 24h     • 5+ strikes in 30d

Duration:               Duration:
• 24 hours from 2nd     • Until strikes decay
  strike timestamp        below 5
                    
Prevents:               Prevents:
• Sending DMs           • Sending DMs
• Creating workspaces   • Creating workspaces
• Creating groups       • Creating groups
• Sending invitations   • Sending invitations

BOTH BANS CAN BE ACTIVE SIMULTANEOUSLY
Example: User gets 5th strike, and last 2 were in 24h window
→ Both temp ban + indefinite ban apply
→ Notification sent for indefinite ban (higher priority)
```

### C.2 Strike Tracking & Decay

**Strike Storage:**

```typescript
// /users/{uid}
{
  spamStrikes: number,              // Count of active strikes (auto-computed)
  spamBanned: boolean,              // True if either ban active
  spamReportsReceived: [
    {
      reportedBy: string,
      reason: 'workspace' | 'groupChat' | 'directMessage',
      timestamp: Timestamp,
      conversationId?: string,
      workspaceId?: string
    }
  ]
}
```

**30-Day Decay Logic:**

```typescript
// functions/src/utils/spamHelpers.ts
export function calculateActiveStrikes(user: User): {
  totalStrikes: number,
  isTempBanned: boolean,
  tempBanEndsAt: number | null,
  isPermanentlyBanned: boolean,
  spamBanned: boolean
} {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
  
  // Filter strikes within 30-day window
  const activeStrikes = user.spamReportsReceived.filter(report =>
    (now - report.timestamp.toMillis()) < THIRTY_DAYS_MS
  );
  
  // Check for 2 strikes in 24h (temp ban)
  const last24hStrikes = activeStrikes.filter(report =>
    (now - report.timestamp.toMillis()) < ONE_DAY_MS
  );
  
  const isTempBanned = last24hStrikes.length >= 2;
  const tempBanEndsAt = isTempBanned 
    ? last24hStrikes[1].timestamp.toMillis() + ONE_DAY_MS
    : null;
  
  // Check for 5 strikes in 30d (indefinite ban)
  const isPermanentlyBanned = activeStrikes.length >= 5;
  
  return {
    totalStrikes: activeStrikes.length,
    isTempBanned,
    tempBanEndsAt,
    isPermanentlyBanned,
    spamBanned: isTempBanned || isPermanentlyBanned
  };
}
```

### C.3 Spam Report Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        SPAM REPORT FLOW (Any Type)                            │
└──────────────────────────────────────────────────────────────────────────────┘

[User receives invitation/unwanted DM]
     │
     ↓
[User clicks "Report Spam"]
     │
     ↓
[Confirmation: "Report as spam?"]
     │
     ↓
[Cloud Function: reportSpam]
     │
     ├─→ Validates: reporter is participant/invitee
     ├─→ Checks for duplicate report (same reporter + reported user)
     ├─→ Adds to reported user's spamReportsReceived array
     │
     ↓
[calculateActiveStrikes()]
     │
     ├─→ Filters strikes older than 30 days
     ├─→ Checks 24h window (temp ban)
     ├─→ Checks total count (indefinite ban)
     │
     ↓
[Update spamStrikes count]
[Update spamBanned flag]
     │
     ├─→ If 3 strikes: Warning notification
     ├─→ If 4 strikes: Final warning notification
     ├─→ If temp ban: "24h ban" notification
     └─→ If indefinite ban: "Indefinite ban" notification
     │
     ↓
[Enforcement at multiple layers]
     ├─→ Firestore rules: Block message creation if spamBanned
     ├─→ Cloud Functions: Check spamBanned before workspace/group creation
     └─→ Client UI: Show "Cannot send messages" if banned
```

### C.4 Ban Enforcement Points

| Action | Enforcement Point | How |
|--------|------------------|-----|
| **Send DM** | Firestore Rules | `!get(...).data.spamBanned` check |
| **Create Workspace** | Cloud Function | `if (user.spamBanned) throw error` |
| **Create Group Chat** | Cloud Function | `if (user.spamBanned) throw error` |
| **Send Invitation** | Cloud Function | `if (user.spamBanned) throw error` |
| **Message in Group** | Not blocked | Users can still participate in existing groups |
| **Message in Workspace** | Not blocked | Users can still participate in existing workspaces |

**Key Design Decision:** Spam bans only affect **creation** of new connections, not participation in existing ones.

### C.5 No Spam Report Abuse Prevention

**Explicit Decision:** No throttling or validation on spam reports

**Rationale:**

- Simplifies implementation
- Users can self-regulate
- Accepted risk of false reporting
- Appeals process not implemented (user decision)

---

## D. Invitation Systems

### D.1 Three Invitation Types

Phase 4 implements invitation flows for three connection types:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED INVITATION SYSTEM                              │
└──────────────────────────────────────────────────────────────────────────────┘

TYPE 1: WORKSPACE INVITATIONS
• Sender: Workspace admin
• Recipient: Any user (by email)
• Purpose: Join workspace as member
• Data: /workspace_invitations/{id}

TYPE 2: GROUP CHAT INVITATIONS
• Sender: Any group member
• Recipient: Any user (by email)
• Purpose: Join group chat (outside workspaces)
• Data: /group_chat_invitations/{id}

TYPE 3: DIRECT MESSAGE INVITATIONS
• Sender: User with DM intent
• Recipient: User with dmPrivacySetting: 'private'
• Purpose: Permission to start direct conversation
• Data: /direct_message_invitations/{id}

ALL THREE SHARE:
• Accept / Decline / Report Spam actions
• Same spam strike system
• Unified invitations screen UI
• Same notification badge count
```

### D.2 Invitation Data Model

```typescript
// Common fields across all invitation types
interface BaseInvitation {
  invitedByUid: string,
  invitedByDisplayName: string,
  invitedUserUid: string,
  invitedUserEmail: string,
  status: 'pending' | 'accepted' | 'declined' | 'spam',
  sentAt: Timestamp,
  respondedAt?: Timestamp
}

// /workspace_invitations/{id}
interface WorkspaceInvitation extends BaseInvitation {
  workspaceId: string,
  workspaceName: string
}

// /group_chat_invitations/{id}
interface GroupChatInvitation extends BaseInvitation {
  conversationId: string,
  conversationName: string
}

// /direct_message_invitations/{id}
interface DirectMessageInvitation extends BaseInvitation {
  senderId: string,
  senderDisplayName: string,
  conversationId?: string    // Created after acceptance
}
```

### D.3 Unified Invitations Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Invitations (3)                                                         [×] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  👥 Marketing Team (Workspace)                                              │
│  Invited by: Alice Johnson • 2 hours ago                                    │
│  "Join our marketing team for Q1"                                           │
│  4 members • 3 group chats                                                  │
│  [Accept]  [Decline]  [Report Spam]                                         │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────│
│                                                                              │
│  💬 Weekend Plans (Group Chat)                                              │
│  Invited by: Bob Smith • 5 hours ago                                        │
│  5 members                                                                  │
│  [Accept]  [Decline]  [Report Spam]                                         │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────│
│                                                                              │
│  💌 Charlie wants to message you (Direct Message)                           │
│  From: Charlie Davis • 1 day ago                                            │
│  [Accept]  [Decline]  [Report Spam]                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

BADGE DISPLAY:
• Profile button (top-right) shows: 🔔 3
• Badge count = workspaceInvites + groupInvites + dmInvites
• Real-time updates via Firestore listeners
```

### D.4 DM Privacy Setting

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    DIRECT MESSAGE PRIVACY FLOW                                │
└──────────────────────────────────────────────────────────────────────────────┘

[User A wants to message User B]
     │
     ↓
[Check: User B's dmPrivacySetting]
     │
     ├─→ [public] (default) → Create DM conversation immediately
     │
     └─→ [private] → Send invitation
              │
              ↓
         [Cloud Function: createDirectMessageInvitation]
         • Creates invitation document
         • Sends notification to User B
              │
              ├─→ [User B accepts] → Create conversation, notify User A
              │
              ├─→ [User B declines] → Delete invitation, no conversation
              │
              └─→ [User B reports spam] → +1 spam strike for User A

USER SETTINGS MODAL:
┌────────────────────────────────┐
│  DM Privacy                    │
│  ○ Public (default)            │
│  ● Private                     │
│                                │
│  Private means you have to     │
│  accept an invitation before   │
│  someone can direct message    │
│  you.                          │
│                                │
│  Phone number is always        │
│  searchable because the        │
│  purpose of the app is         │
│  messaging functionality on    │
│  top of phone numbers.         │
└────────────────────────────────┘
```

---

## E. User Blocking & Conversation Hiding

### E.1 One-Way Blocking Model

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          ONE-WAY BLOCKING FLOW                                │
└──────────────────────────────────────────────────────────────────────────────┘

[User A reports User B's DM as spam]
     │
     ↓
[Cloud Function: reportDirectMessageSpam]
     │
     ├─→ User B gets +1 spam strike
     ├─→ User A's blockedUsers: [User B UID]
     └─→ User A's hiddenConversations: [conversation ID]
     │
     ↓
[EFFECTS]
     │
     ├─→ User A's conversation list:
     │   • Conversation with User B hidden
     │   • Filtered client-side via hiddenConversations array
     │
     ├─→ User B tries to message User A:
     │   • Firestore rule checks: isBlockedInDirectMessage()
     │   • Retrieves User A's blockedUsers array
     │   • Finds User B's UID → Message creation DENIED
     │   • Error: "Permission denied"
     │
     └─→ User A can still message User B:
         • User B hasn't blocked User A
         • One-way block (asymmetric)
         • Messages sent successfully

KEY PRINCIPLE: Spam reporting = automatic blocking (one-way)
```

### E.2 Blocking vs. Hiding

| Feature | Blocking | Conversation Hiding |
|---------|----------|---------------------|
| **What it does** | Prevents sender from messaging recipient | Removes conversation from list view |
| **Direction** | One-way (reporter → reported) | One-way (reporter only) |
| **Enforcement** | Firestore security rules | Client-side filter |
| **Applies to** | Direct messages only | Any conversation type |
| **Triggered by** | Spam report | Spam report OR block action |
| **Can be undone?** | No (permanent) | No (permanent) |
| **Affects group chats?** | No | No (only hides DMs) |

### E.3 Security Rule Implementation

```javascript
// firestore.rules
function isBlockedInDirectMessage(conversationId) {
  let conversation = get(/databases/$(database)/documents/conversations/$(conversationId));
  
  if (conversation.data.type != 'direct') {
    return false; // Not a DM, no blocking
  }
  
  // Check if sender is in any participant's blockedUsers array
  let senderId = request.auth.uid;
  let participants = conversation.data.participants;
  
  // Get other participant (recipient)
  let recipientId = participants[0] == senderId ? participants[1] : participants[0];
  let recipient = get(/databases/$(database)/documents/users/$(recipientId));
  
  return senderId in recipient.data.blockedUsers;
}

// Messages: Block creation if sender is blocked by recipient
match /conversations/{conversationId}/messages/{messageId} {
  allow create: if request.auth != null && 
                   request.auth.uid in request.resource.data.participants &&
                   !isBlockedInDirectMessage(conversationId);
}
```

### E.4 Conversation Hiding Implementation

**Client-Side Filter:**

```typescript
// app/(tabs)/index.tsx
const visibleConversations = allConversations.filter(conv => 
  !user.hiddenConversations?.includes(conv.id)
);
```

**Why Client-Side Only:**

- UI-only concern (not security-critical)
- User still has read access (permissions unchanged)
- Efficient (no server-side queries needed)
- Can still access via deep link (if needed)

---

## F. Message Editing & Deletion

### F.1 Pro-Only Feature

**Permissions:**

- Pro users can edit/delete their own messages anywhere
- Free users cannot edit/delete (upgrade required)

### F.2 Edit & Delete Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      MESSAGE EDIT/DELETE FLOW                                 │
└──────────────────────────────────────────────────────────────────────────────┘

[User long-presses their own message]
     │
     ↓
[Context menu appears]
• Copy Text
• Edit Message (Pro only)
• Delete Message (Pro only)
• Report Spam (if direct chat, other user's message)
     │
     ├─→ [Edit Message]
     │        │
     │        ↓
     │   [Edit Modal opens]
     │   • Pre-filled with current text
     │   • User edits
     │   • Click "Save"
     │        │
     │        ↓
     │   [Cloud Function: editMessage]
     │   • Validates: sender is editor, user is Pro
     │   • Updates message.text
     │   • Sets message.editedAt = now
     │   • Sets message.isEdited = true
     │   • Original preserved in message.originalText
     │        │
     │        ↓
     │   [Message updated in UI]
     │   • Shows "(edited)" badge
     │   • All participants see updated version
     │
     └─→ [Delete Message]
              │
              ↓
         [Confirmation: "Delete message?"]
              │
              ↓
         [Cloud Function: deleteMessage]
         • Validates: sender is deleter, user is Pro
         • Sets message.deleted = true
         • Sets message.deletedAt = now
         • Original text preserved in message.originalText
              │
              ↓
         [Message shows as deleted]
         • Text: "This message was deleted"
         • Visible to all participants
         • Cannot be undeleted

SECURITY:
• Cloud Functions check isPaidUser
• Firestore rules allow update only if auth.uid == message.senderId
```

### F.3 Message Edit History Schema

```typescript
// /conversations/{conversationId}/messages/{messageId}
{
  text: string,                  // Current text (updated on edit)
  senderId: string,
  createdAt: Timestamp,
  
  // Edit tracking
  isEdited?: boolean,            // True if edited at least once
  editedAt?: Timestamp,          // Most recent edit timestamp
  originalText?: string,         // Preserved original (first version)
  
  // Deletion tracking
  deleted?: boolean,             // True if deleted
  deletedAt?: Timestamp,
  
  // No full edit history (MVP simplification)
  // Only original + current version preserved
}
```

---

## G. Phone Number Integration

### G.1 Required at Signup

**Signup Flow Changes:**

```
[User registers]
     │
     ↓
[Registration form]
• Email: [required]
• Password: [required]
• Display Name: [required]
• Phone Number: [required] ← NEW
     │
     ├─→ Validation:
     │   • 10 digits (US/Canada only)
     │   • Flexible input format (allows dashes, spaces, parentheses)
     │   • Stored as 10 digits: "1234567890"
     │   • Error if empty: "Phone number is required because that's how friends find you."
     │
     ↓
[Account created]
• /users/{uid}
  └── phoneNumber: "1234567890"
```

### G.2 Phone Number Search

**New Chat Screen Changes:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          SEARCH BY PHONE NUMBER                               │
└──────────────────────────────────────────────────────────────────────────────┘

OLD BEHAVIOR:                    NEW BEHAVIOR:
• Search by email                • Search by phone number ONLY
• Search by name                 • Flexible input:
• Mixed results                    - "123-456-7890"
                                   - "(123) 456-7890"
                                   - "1234567890"
                                 • All normalized to 10 digits for query
                                 • No email/name search

FIRESTORE QUERY:
db.collection('users')
  .where('phoneNumber', '==', normalizedPhoneNumber)
  .limit(1)
  .get()
```

### G.3 Phone Number Display

**User Profile:**

```
┌────────────────────────────────┐
│  Profile                       │
├────────────────────────────────┤
│  [AI]  (large circle)          │
│                                │
│  Adam Isom                     │
│  (123) 456-7890       ← NEW    │
│  adam@hey.com                  │
│                                │
│  💎 Pro User                   │
└────────────────────────────────┘
```

**Formatting Function:**

```typescript
function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || phoneNumber.length !== 10) return phoneNumber;
  
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
}

// Input: "1234567890"
// Output: "(123) 456-7890"
```

### G.4 Existing Users Migration

For the 4 existing test users, random phone numbers were generated during Phase 4 implementation.

---

## H. Workspace Admin Features

### H.1 Feature Overview

Workspace admins have four exclusive capabilities:

1. **Edit & Save AI Content** - Customize AI summaries, decisions, action items
2. **Manual Urgency Markers** - Override AI priority detection (max 5 per conversation)
3. **Pinned Messages** - Pin important messages (max 5 per group chat)
4. **Capacity Expansion** - Add members beyond initial capacity with pro-rated billing

### H.2 Edit & Save AI Content

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       EDIT AI CONTENT FLOW                                    │
└──────────────────────────────────────────────────────────────────────────────┘

[Admin opens AI Summary modal]
     │
     ↓
[AI generates summary (or loads cached)]
     │
     ↓
[Display with "Edit & Save" button] (admin/Pro only)
     │
     ↓
[Admin clicks "Edit & Save"]
     │
     ↓
[Edit modal opens]
• Pre-filled with current content
• Summary: [editable textarea]
• Key Points: [editable list with add/remove]
     │
     ↓
[Admin edits and clicks "Save"]
     │
     ↓
[Cloud Function: saveEditedSummary]
• Validates admin permission
• Preserves original AI version in originalAiVersion field
• Updates summary with edited content
• Sets editedByAdmin: true, savedByAdmin: adminUid, savedAt: now
     │
     ↓
[Saved version becomes default view]
• Badge: "✏️ Edited by [Admin Name]"
• Button: "Get Fresh AI Analysis" (generates new AI, doesn't overwrite saved)
• Button: "Re-edit" (opens edit modal again)

PERMISSIONS:
• Personal chats: Pro users can edit
• Workspace chats: Admins can edit (even if other members are Pro)
```

#### H.2.1 Cloud Function Implementation Details

**Function: `saveEditedSummary`**

```typescript
// functions/src/ai/saveEditedSummary.ts

export const saveEditedSummary = functions.https.onCall(async (data, context) => {
  // 1. AUTHENTICATION CHECK
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { conversationId, editedSummary, editedKeyPoints } = data;

  // 2. INPUT VALIDATION
  if (!conversationId || !editedSummary || !editedKeyPoints) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'conversationId, editedSummary, and editedKeyPoints are required'
    );
  }

  // 3. FETCH CONVERSATION
  const conversationSnap = await db.collection('conversations').doc(conversationId).get();
  if (!conversationSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Conversation not found');
  }
  const conversation = conversationSnap.data();

  // 4. PERMISSION CHECK (Workspace vs. Personal)
  if (conversation.isWorkspaceChat && conversation.workspaceId) {
    // WORKSPACE CHAT: Must be admin
    const workspaceSnap = await db.collection('workspaces').doc(conversation.workspaceId).get();
    if (!workspaceSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Workspace not found');
    }
    const workspace = workspaceSnap.data();
    
    if (workspace.adminUid !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only workspace admins can edit summaries in workspace chats'
      );
    }
  } else {
    // PERSONAL CHAT: Must be Pro user or in active trial
    const userSnap = await db.collection('users').doc(context.auth.uid).get();
    if (!userSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    const user = userSnap.data();
    
    // Check Pro status
    if (!user.isPaidUser) {
      // Check trial status
      if (!user.trialEndsAt || user.trialEndsAt.toMillis() < Date.now()) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Pro subscription required to edit summaries'
        );
      }
    }
  }

  // 5. FETCH OR CREATE SUMMARY DOCUMENT
  const summariesRef = db.collection('conversations').doc(conversationId).collection('ai_summaries');
  const summariesSnap = await summariesRef.orderBy('generatedAt', 'desc').limit(1).get();

  let summaryDocRef;
  let existingSummary = null;

  if (!summariesSnap.empty) {
    // Use existing summary document
    summaryDocRef = summariesSnap.docs[0].ref;
    existingSummary = summariesSnap.docs[0].data();
  } else {
    // No summary exists yet - create new document
    summaryDocRef = summariesRef.doc();
  }

  // 6. PREPARE UPDATE DATA
  const updateData: any = {
    summary: editedSummary,
    keyPoints: editedKeyPoints,
    editedByAdmin: true,
    savedByAdmin: context.auth.uid,
    savedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // 7. PRESERVE ORIGINAL AI VERSION (if not already preserved)
  if (existingSummary && !existingSummary.editedByAdmin) {
    // First time editing - preserve original AI version
    updateData.originalAiVersion = {
      summary: existingSummary.summary,
      keyPoints: existingSummary.keyPoints,
      generatedAt: existingSummary.generatedAt,
    };
  }

  // 8. If new document, add required fields
  if (!existingSummary) {
    updateData.messageCount = 0; // Will be updated by AI generation
    updateData.messageCountAtGeneration = 0;
    updateData.generatedAt = admin.firestore.FieldValue.serverTimestamp();
    updateData.generatedBy = context.auth.uid;
    updateData.model = 'manual-edit';
  }

  // 9. SAVE TO FIRESTORE
  await summaryDocRef.set(updateData, { merge: true });

  return { success: true };
});
```

**Data Flow Diagram:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                   EDIT AI CONTENT - DATA FLOW                                 │
└──────────────────────────────────────────────────────────────────────────────┘

CLIENT SIDE:
-----------
[User clicks "Edit & Save"]
     │
     ↓
[EditSummaryModal opens]
• Pre-fills with current summary/keyPoints
• User edits content
     │
     ↓
[User clicks "Save"]
     │
     ↓
[Call saveEditedSummary(conversationId, editedSummary, editedKeyPoints)]
     │
     ↓

CLOUD FUNCTION:
--------------
[Authentication & Input Validation]
     │
     ↓
[Fetch Conversation]
     │
     ├─→ isWorkspaceChat? → Check workspace admin
     └─→ Personal chat? → Check Pro user or trial
     │
     ↓
[Fetch Latest Summary Document]
     │
     ├─→ Exists?
     │   └─→ summariesRef.orderBy('generatedAt', 'desc').limit(1)
     │
     └─→ Not exists? → Create new document
     │
     ↓
[Check if First Edit]
     │
     ├─→ existingSummary.editedByAdmin === false?
     │   └─→ YES: Preserve original in originalAiVersion field
     │
     └─→ Already edited? → Don't overwrite originalAiVersion
     │
     ↓
[Prepare Update Data]
{
  summary: editedSummary,                    // NEW content
  keyPoints: editedKeyPoints,                // NEW content
  editedByAdmin: true,                       // Flag: this is edited
  savedByAdmin: context.auth.uid,            // Who edited it
  savedAt: serverTimestamp(),                // When edited
  originalAiVersion?: {                      // PRESERVED (first edit only)
    summary: original.summary,
    keyPoints: original.keyPoints,
    generatedAt: original.generatedAt
  }
}
     │
     ↓
[Write to Firestore]
/conversations/{conversationId}/ai_summaries/{summaryId}
     │
     ↓
[Return Success]
     │
     ↓

CLIENT SIDE:
-----------
[Reload Summary]
     │
     ↓
[SummaryModal displays saved version]
• Shows edited content
• Badge: "✏️ Edited by [Admin Name]"
• Buttons:
  - "Get Fresh AI Analysis" (generates new, doesn't overwrite saved)
  - "Re-edit" (opens edit modal again with saved content)
```

**Interaction with Fresh AI Generation:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│               SAVED VERSION vs. FRESH AI GENERATION                           │
└──────────────────────────────────────────────────────────────────────────────┘

STATE 1: NO SAVED VERSION
-------------------------
[User opens Summary modal]
     │
     ↓
[generateSummary() called]
     │
     ↓
[AI generates fresh summary]
     │
     ↓
[Display AI-generated content]
• No "edited" badge
• "Edit & Save" button (if admin/Pro)

STATE 2: SAVED VERSION EXISTS
-----------------------------
[User opens Summary modal]
     │
     ↓
[generateSummary() called]
     │
     ↓
[Fetch latest summary from Firestore]
     │
     ├─→ summary.editedByAdmin === true?
     │   └─→ Display SAVED version (default)
     │       • Badge: "✏️ Edited by [Admin Name]"
     │       • Button: "Get Fresh AI Analysis"
     │       • Button: "Re-edit"
     │
     └─→ summary.editedByAdmin === false?
         └─→ Display AI-generated version
             • No badge
             • "Edit & Save" button

STATE 3: USER REQUESTS FRESH AI (After Saved Version Exists)
------------------------------------------------------------
[User clicks "Get Fresh AI Analysis"]
     │
     ↓
[generateSummary() called with forceRegenerate flag]
     │
     ↓
[AI generates NEW summary]
• Does NOT overwrite saved version in Firestore
• Stored in component state only (freshAiSummary)
• User can compare fresh AI vs. saved version
     │
     ↓
[Display fresh AI-generated content]
• Toggle button: "View Saved Version"
• User can switch between saved and fresh
• Fresh version is NOT persisted (temporary view)
```

**Same Pattern for Decisions & Action Items:**

The same implementation pattern applies to:

- `saveEditedDecision` (decisions)
- `saveEditedActionItems` (action items)

All three functions follow the same:

1. Permission validation (admin for workspace, Pro for personal)
2. Original preservation (first edit only)
3. Saved version becomes default view
4. Fresh AI generation available but doesn't overwrite

### H.3 Manual Urgency Markers

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      MANUAL URGENCY MARKER FLOW                               │
└──────────────────────────────────────────────────────────────────────────────┘

[Admin taps message in workspace chat]
     │
     ↓
[Message toolbar appears]
• 🔴 Mark Urgent / Remove Urgent
• 📌 Pin Message
• 💬 Reply
     │
     ├─→ [Mark Urgent (< 5 already urgent)]
     │        │
     │        ↓
     │   [Cloud Function: markMessageUrgent]
     │   • Validates admin permission
     │   • Checks limit (5 per conversation)
     │   • Sets message.manuallyMarkedUrgent = true
     │   • Sets message.markedUrgentBy = adminUid
     │        │
     │        ↓
     │   [Message shows 🔴 urgent badge]
     │   • Badge takes precedence over AI priority
     │   • AI batch analysis skips this message
     │
     └─→ [Mark Urgent (already 5 urgent)]
              │
              ↓
         [Modal: "Urgent Message Limit (5/5)"]
         • Shows list of current 5 urgent messages
         • Admin can un-mark one to add new

PRIORITY RESOLUTION:
1. Admin manual mark → HIGH (always)
2. Workspace auto-urgency disabled → MEDIUM
3. AI-detected priority → Use message.priority field
```

### H.4 Pinned Messages

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        PINNED MESSAGES FLOW                                   │
└──────────────────────────────────────────────────────────────────────────────┘

[Admin taps message]
     │
     ↓
[Message toolbar: 📌 Pin Message]
     │
     ├─→ [Pin (< 5 already pinned)]
     │        │
     │        ↓
     │   [Cloud Function: pinMessage]
     │   • Validates admin permission
     │   • Checks limit (5 per conversation)
     │   • Adds to conversation.pinnedMessages array
     │        │
     │        ↓
     │   [Pin icon appears in chat header: 📌 3]
     │
     └─→ [Pin (already 5 pinned)]
              │
              ↓
         [Modal: "Pin Limit Reached (5/5)"]
         • Shows current 5 pinned messages
         • Admin can select one to replace

[User taps 📌 icon in chat header]
     │
     ↓
[Pinned Messages Modal]
┌────────────────────────────────┐
│  📌 Pinned Messages         [×]│
│                                │
│  "Let's target Q1 launch..."   │
│  Oct 20, 2:30 PM               │
│  [Jump to Message]  [Un-pin]   │
│                                │
│  "Budget approved: $50k"       │
│  Oct 18, 10:15 AM              │
│  [Jump to Message]  [Un-pin]   │
└────────────────────────────────┘
     │
     ├─→ [Jump to Message] → Scrolls to message in chat
     └─→ [Un-pin] (admin only) → Removes pin
```

### H.5 Capacity Expansion

(Already documented in Section B.4 - see Workspace Capacity Management)

---

## I. Export Functionality

### I.1 Two Export Types

Phase 4 implements two export features:

1. **Workspace Export** (Admin-only)
2. **User Conversation Export** (Pro users)

### I.2 Workspace Export

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        WORKSPACE EXPORT FLOW                                  │
└──────────────────────────────────────────────────────────────────────────────┘

[Admin opens workspace settings]
     │
     ↓
[Taps "Export Workspace (JSON)"]
     │
     ↓
[Cloud Function: exportWorkspace]
• Fetches workspace metadata (members, capacity, billing)
• Fetches all workspace conversations
• For each conversation:
  - Fetches last 1000 messages (scalability limit)
  - Includes AI data (summaries, decisions, action items)
  - Includes pinned messages, urgency markers
• Formats as clean JSON with human-readable timestamps
• Returns JSON blob
     │
     ├─→ [Success (< 50s)]
     │        │
     │        ↓
     │   [Share API opens]
     │   • Filename: "workspace-{name}-{date}.json"
     │   • User can save to Files, share via message, etc.
     │   • Success alert with stats:
     │     "Exported 5 conversations with 234 messages."
     │
     └─→ [Timeout Warning (>= 50s)]
              │
              ↓
         [Partial export returned]
         • Warning in metadata: "Export incomplete due to timeout"
         • Shows which conversations were included

LIMITS:
• 1000 messages per conversation
• 50-second timeout protection
• JSON only (Markdown deferred)
```

### I.3 User Conversation Export

```
[Pro user opens Help & Support modal]
     │
     ↓
[Taps "Export Conversations"]
     │
     ↓
[Cloud Function: exportUserConversations]
• Fetches all non-workspace conversations for user
• Includes direct messages + group chats
• Excludes workspace chats
• Same 1000 message/conversation limit
• Same timeout protection
     │
     ↓
[Share API opens]
• Filename: "my-conversations-{date}.json"
• User can save or share
```

### I.4 Export JSON Format

```json
{
  "workspaceId": "ws_abc123",
  "workspaceName": "Engineering Team",
  "exportedAt": "2025-10-27T14:30:00Z",
  "exportedBy": "alice@company.com",
  
  "members": [
    {
      "email": "alice@company.com",
      "displayName": "Alice Smith",
      "role": "admin",
      "joinedAt": "2025-10-01T10:00:00Z"
    }
  ],
  
  "conversations": [
    {
      "id": "conv_xyz",
      "type": "group",
      "name": "Q4 Planning",
      "participants": ["alice@company.com", "bob@company.com"],
      "createdAt": "2025-10-05T09:00:00Z",
      
      "messages": [
        {
          "id": "msg_001",
          "sender": "Alice Smith",
          "text": "Let's discuss Q4 goals",
          "timestamp": "2025-10-05T09:15:00Z",
          "priority": "high",
          "manuallyMarkedUrgent": false
        }
      ],
      
      "summary": {
        "text": "Team discussed Q4 budget...",
        "keyPoints": ["Budget increased", "Hiring freeze"],
        "generatedAt": "2025-10-06T10:00:00Z",
        "editedByAdmin": true
      },
      
      "pinnedMessages": [
        {
          "messageId": "msg_001",
          "pinnedBy": "Alice Smith",
          "pinnedAt": "2025-10-06T11:00:00Z"
        }
      ]
    }
  ],
  
  "metadata": {
    "totalConversations": 5,
    "totalMessages": 234,
    "messageLimitPerConversation": 1000,
    "timeoutWarning": null
  }
}
```

---

## J. Phase 4 Data Model

### J.1 New Collections

**`/workspaces/{workspaceId}`**

```typescript
{
  name: string,
  adminUid: string,
  adminDisplayName: string,
  members: string[],                    // Array of member UIDs (max 25)
  memberDetails: {
    [uid: string]: {
      displayName: string,
      email: string,
      phoneNumber: string,
      joinedAt: Timestamp,
      role: 'admin' | 'member'
    }
  },
  createdAt: Timestamp,
  
  // Billing
  maxUsersThisMonth: number,            // Pre-selected capacity
  billingCycleStart: Timestamp,
  currentMonthCharge: number,
  isActive: boolean,                    // False if payment failed
  readOnlySince?: Timestamp,
  
  // Admin Features
  autoUrgencyEnabled: boolean,          // Default: true
  pendingCapacityChange?: {
    newMaxUsers: number,
    requestedAt: Timestamp,
    effectiveDate: Timestamp
  },
  
  // Statistics
  groupChatCount: number,
  directChatCount: number,
  totalMessages: number
}
```

**`/workspace_invitations/{invitationId}`**

```typescript
{
  workspaceId: string,
  workspaceName: string,
  invitedByUid: string,
  invitedByDisplayName: string,
  invitedUserUid: string,
  invitedUserEmail: string,
  status: 'pending' | 'accepted' | 'declined' | 'spam',
  sentAt: Timestamp,
  respondedAt?: Timestamp
}
```

**`/group_chat_invitations/{invitationId}`**

```typescript
{
  conversationId: string,
  conversationName: string,
  invitedByUid: string,
  invitedByDisplayName: string,
  invitedUserUid: string,
  invitedUserEmail: string,
  status: 'pending' | 'accepted' | 'declined' | 'spam',
  sentAt: Timestamp,
  respondedAt?: Timestamp
}
```

**`/direct_message_invitations/{invitationId}`**

```typescript
{
  senderId: string,
  senderDisplayName: string,
  recipientUid: string,
  recipientEmail: string,
  status: 'pending' | 'accepted' | 'declined' | 'spam',
  sentAt: Timestamp,
  respondedAt?: Timestamp,
  conversationId?: string               // Created after acceptance
}
```

**`/workspaces/{workspaceId}/billingEvents/{eventId}`**

```typescript
{
  type: 'expansion' | 'downgrade_requested' | 'downgrade_applied' | 'payment_failed' | 'payment_recovered',
  timestamp: Timestamp,
  triggeredBy: string,                  // Admin UID
  details: {
    oldCapacity?: number,
    newCapacity?: number,
    proratedCharge?: number,
    daysRemaining?: number,
    paymentIntentId?: string,
    errorMessage?: string
  }
}
```

### J.2 Extended Collections

**`/users/{uid}` (Extended)**

```typescript
{
  // Existing MVP fields...
  email: string,
  displayName: string,
  isOnline: boolean,
  lastSeenAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  
  // NEW: Phase 4 subscription fields
  isPaidUser: boolean,
  subscriptionTier: 'free' | 'pro',
  subscriptionStartedAt?: Timestamp,
  subscriptionEndsAt?: Timestamp,
  stripeCustomerId?: string,
  
  // NEW: Free trial fields
  trialStartedAt?: Timestamp,
  trialEndsAt?: Timestamp,
  trialUsed: boolean,
  
  // NEW: Workspace fields
  workspacesOwned: string[],            // Max 5
  workspacesMemberOf: string[],
  
  // NEW: Spam prevention
  spamStrikes: number,
  spamBanned: boolean,
  spamReportsReceived: Array<{
    reportedBy: string,
    reason: 'workspace' | 'groupChat' | 'directMessage',
    timestamp: Timestamp,
    workspaceId?: string,
    conversationId?: string
  }>,
  
  // NEW: User blocking
  blockedUsers: string[],               // UIDs of blocked users
  
  // NEW: Conversation hiding
  hiddenConversations: string[],        // Conversation IDs hidden from list
  
  // NEW: Phone number
  phoneNumber: string,                  // 10 digits, US/Canada only
  
  // NEW: DM privacy
  dmPrivacySetting: 'public' | 'private' // Default: 'public'
}
```

**`/conversations/{conversationId}` (Extended)**

```typescript
{
  // Existing MVP fields...
  type: 'direct' | 'group',
  name?: string,
  participants: string[],
  participantDetails: {...},
  lastMessageAt: Timestamp,
  lastMessage: string,
  lastRead: {...},
  createdAt: Timestamp,
  creatorId?: string,
  messageCount: number,
  
  // NEW: Workspace fields
  workspaceId?: string,
  workspaceName?: string,
  isWorkspaceChat: boolean,
  
  // NEW: Pinned messages
  pinnedMessages?: Array<{
    messageId: string,
    pinnedBy: string,
    pinnedAt: Timestamp,
    order: number
  }>
}
```

**`/conversations/{conversationId}/messages/{messageId}` (Extended)**

```typescript
{
  // Existing MVP fields...
  text: string,
  senderId: string,
  senderName: string,
  participants: string[],
  createdAt: Timestamp,
  embedded: boolean,
  embeddedAt?: Timestamp,
  priority?: 'high' | 'medium' | 'low',
  priorityQuick?: 'high' | 'low' | 'unknown',
  priorityAnalyzedAt?: Timestamp,
  
  // NEW: Manual urgency
  manuallyMarkedUrgent?: boolean,
  markedUrgentBy?: string,
  markedUrgentAt?: Timestamp,
  
  // NEW: Message editing
  isEdited?: boolean,
  editedAt?: Timestamp,
  originalText?: string,
  
  // NEW: Message deletion
  deleted?: boolean,
  deletedAt?: Timestamp
}
```

**`/conversations/{conversationId}/ai_summaries/{summaryId}` (Extended)**

```typescript
{
  // Existing MVP fields...
  summary: string,
  keyPoints: string[],
  messageCount: number,
  messageCountAtGeneration: number,
  generatedAt: Timestamp,
  generatedBy: string,
  model: string,
  
  // NEW: Admin editing
  editedByAdmin?: boolean,
  savedByAdmin?: string,
  savedAt?: Timestamp,
  originalAiVersion?: {
    summary: string,
    keyPoints: string[],
    generatedAt: Timestamp
  }
}
```

**Similar extensions for:**

- `/conversations/{conversationId}/ai_decisions/{decisionId}`
- `/conversations/{conversationId}/ai_action_items/{itemId}`

### J.3 Firestore Indexes Required

```json
{
  "indexes": [
    {
      "collectionGroup": "workspaces",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "adminUid", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "workspace_invitations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "invitedUserUid", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "sentAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "group_chat_invitations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "invitedUserUid", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "sentAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "direct_message_invitations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "recipientUid", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "sentAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "conversations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workspaceId", "order": "ASCENDING" },
        { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "phoneNumber", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## K. Phase 4 Cloud Functions

### K.1 Subscription Management

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `startFreeTrial` | Activate 5-day trial | None | `{ success: boolean }` |
| `upgradeToPro` | Upgrade to Pro (MVP: instant) | None | `{ success: boolean }` |

### K.2 Workspace Management

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `createWorkspace` | Create new workspace | `{ name, maxUsers, initialMemberEmails }` | `{ workspace: Workspace }` |
| `deleteWorkspace` | Delete workspace + all chats | `{ workspaceId }` | `{ success: boolean }` |
| `inviteToWorkspace` | Send workspace invitation | `{ workspaceId, userEmail }` | `{ invitationId }` |
| `acceptWorkspaceInvitation` | Accept invitation | `{ invitationId }` | `{ success: boolean }` |
| `declineWorkspaceInvitation` | Decline invitation | `{ invitationId }` | `{ success: boolean }` |
| `reportWorkspaceInvitationSpam` | Report spam | `{ invitationId }` | `{ newStrikeCount }` |
| `expandWorkspaceCapacity` | Expand capacity mid-month | `{ workspaceId, newMaxUsers }` | `{ newCapacity, chargeAmount }` |
| `exportWorkspace` | Export workspace data to JSON | `{ workspaceId }` | `{ data: WorkspaceExport }` |

### K.3 Group Chat Management

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `addMemberToGroupChat` | Send group chat invitation | `{ conversationId, memberEmail }` | `{ invitationId }` |
| `acceptGroupChatInvitation` | Accept invitation | `{ invitationId }` | `{ success: boolean }` |
| `declineGroupChatInvitation` | Decline invitation | `{ invitationId }` | `{ success: boolean }` |
| `reportGroupChatInvitationSpam` | Report spam | `{ invitationId }` | `{ newStrikeCount }` |

### K.4 Direct Message Management

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `createDirectMessageInvitation` | Send DM invitation (privacy: private) | `{ recipientId }` | `{ invitationId }` |
| `acceptDirectMessageInvitation` | Accept invitation | `{ invitationId }` | `{ conversationId }` |
| `declineDirectMessageInvitation` | Decline invitation | `{ invitationId }` | `{ success: boolean }` |
| `reportDirectMessageInvitationSpam` | Report spam | `{ invitationId }` | `{ newStrikeCount }` |
| `reportDirectMessageSpam` | Report existing DM as spam | `{ conversationId, reportedUserUid }` | `{ success: boolean }` |

### K.5 Workspace Admin Features

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `saveEditedSummary` | Save admin-edited summary | `{ conversationId, editedSummary, editedKeyPoints }` | `{ success: boolean }` |
| `saveEditedDecision` | Save admin-edited decision | `{ conversationId, decisionId, editedDecision, editedContext }` | `{ success: boolean }` |
| `saveEditedActionItems` | Save admin-edited action items | `{ conversationId, editedItems }` | `{ success: boolean }` |
| `markMessageUrgent` | Manually mark message urgent | `{ conversationId, messageId }` | `{ urgentCount }` |
| `unmarkMessageUrgent` | Remove urgent marker | `{ conversationId, messageId }` | `{ success: boolean }` |
| `pinMessage` | Pin message to conversation | `{ conversationId, messageId, replaceMessageId? }` | `{ pinnedCount }` |
| `unpinMessage` | Unpin message | `{ conversationId, messageId }` | `{ pinnedCount }` |

### K.6 Message Operations

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `editMessage` | Edit own message (Pro only) | `{ conversationId, messageId, newText }` | `{ success: boolean }` |
| `deleteMessage` | Delete own message (Pro only) | `{ conversationId, messageId }` | `{ success: boolean }` |

### K.7 Export Operations

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `exportWorkspace` | Export workspace to JSON | `{ workspaceId }` | `{ data: WorkspaceExport }` |
| `exportUserConversations` | Export user's non-workspace chats | None | `{ data: UserExport }` |

### K.8 Spam & Utilities

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `getUserSpamStatus` | Get current spam strike status | None | `{ strikeCount, status, banEndsAt }` |

---

## L. Phase 4 Service Layer

### L.1 Refactored Helper Utilities

Phase 4 introduced 6 helper utilities to eliminate duplication and improve architecture:

**1. `subscriptionService.ts`** - Trial & Pro Upgrade Logic

```typescript
// Centralized upgrade/trial logic
export async function upgradeUserToPro(): Promise<void>
export async function startFreeTrial(): Promise<void>
export function showTrialStartedAlert(): void
export function showUpgradeSuccessAlert(onConfirm?: () => void): void
export function showUpgradeErrorAlert(error: Error): void
```

**Used in:** `app/(tabs)/profile.tsx`, `components/UpgradeToProModal.tsx`, `components/TrialWorkspaceModal.tsx`

**2. `userPermissions.ts`** - Feature Access Checks

```typescript
// Consistent permission checking
export function getUserPermissions(
  user: User, 
  conversation?: Conversation, 
  workspace?: Workspace
): UserPermissions

export function canAccessAIInContext(
  user: User, 
  conversation?: Conversation
): boolean
```

**Used in:** `app/(tabs)/profile.tsx`, `app/chat/[id].tsx`

**3. `cloudFunctions.ts`** - Standardized Cloud Function Calls

```typescript
// Unified error handling, logging, timeout support
export async function callCloudFunction<T = any>(
  functionName: string,
  data?: any,
  options?: { timeout?: number }
): Promise<T>
```

**Used in:** All service files that call Cloud Functions

**4. `alerts.ts` (`Alerts` helper)** - Consistent Alert UI

```typescript
// Standardized success/error/confirm alerts
export const Alerts = {
  success: (message: string, onConfirm?: () => void) => void
  error: (message: string) => void
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string,
      cancelText?: string,
      isDestructive?: boolean
    }
  ) => void
}
```

**Used in:** 21 files (components + screens) - replaced 81 `Alert.alert` calls

**5. `useModalManager.ts`** - Modal State Management Hook

```typescript
// Consolidated modal state (11 modals → 1 hook)
export function useModalManager() {
  return {
    isOpen: (modalName: string) => boolean
    open: (modalName: string) => void
    close: () => void
    current: string | null
  }
}
```

**Used in:** `app/chat/[id].tsx` (replaced 11 individual `useState` calls)

**6. `exportHelpers.ts`** - Export Functionality

```typescript
// Shared logic for workspace & user exports
export async function exportAndShare(
  data: any,
  filename: string
): Promise<void>
```

**Used in:** `app/(tabs)/profile.tsx`, `app/workspace/[id]/settings.tsx`

### L.2 Service Layer Architecture Pattern

**Before Phase 4:**

```
Component → Firebase SDK directly → Cloud Function
          → Alert.alert() for every error
          → Duplicate permission checks
          → Inconsistent error messages
```

**After Phase 4:**

```
Component → Service Helper → cloudFunctions.ts → Cloud Function
          → Alerts.error() for standardized errors
          → userPermissions.ts for consistent checks
          → Centralized error translation
```

**Benefits:**

- **Testability:** Helpers are unit-testable (347 tests passing)
- **Consistency:** Same error handling everywhere
- **Maintainability:** Change once, update everywhere
- **Type Safety:** TypeScript generics for Cloud Function responses

---

## M. Phase 4 Architectural Decisions

### Decision 12: Pre-Selected Workspace Capacity Model

**Decision:** Admin selects capacity (2-25) at creation and pays for all seats

**Why:**

- Simplifies billing (predictable monthly cost)
- Prevents capacity gaming (adding/removing members to save money)
- Encourages planning (admin thinks about team size upfront)

**Trade-off:** Admin pays for unfilled seats

### Decision 13: Dual Ban System (Temp + Indefinite)

**Decision:** 2 strikes in 24h = 24h ban, 5 strikes in 30d = indefinite ban

**Why:**

- Immediate response to spam bursts (temp ban)
- Long-term protection against persistent spammers (indefinite ban)
- Strikes decay after 30 days (rehabilitation opportunity)

**Trade-off:** Complexity in strike calculation logic

### Decision 14: One-Way Blocking (Reporter → Reported)

**Decision:** Spam reporting automatically blocks reported user for reporter only

**Why:**

- Immediate protection for reporter
- Spam report implies "don't want to hear from them"
- Simple to implement (unidirectional relationship)

**Trade-off:** Asymmetric relationship (reported user can still try to message, but fails at security rule level)

### Decision 15: Invitation-Based Group Chats (Outside Workspaces)

**Decision:** Adding members to group chats requires invitation (accept/decline/spam)

**Why:**

- Prevents spam (user controls who adds them)
- Consistent with workspace invitation model
- Gives users opt-out option

**Trade-off:** Added friction to group chat creation

### Decision 16: Phone Number Required at Signup

**Decision:** 10-digit phone number (US/Canada only) required at registration

**Why:**

- Primary identifier for user discovery (replacing email)
- Aligns with messaging app model (phone numbers are social graph)
- Unique identifier across app

**Trade-off:** Privacy concerns, geographic limitation (US/Canada only for MVP)

### Decision 17: Message Editing as Pro-Only Feature

**Decision:** Only Pro users can edit/delete their own messages

**Why:**

- Incentivizes Pro subscriptions
- Premium feature expectation (common in other apps)
- Server-side tracking overhead (edit history)

**Trade-off:** Basic users frustrated by inability to fix typos

### Decision 18: Workspace Read-Only on Payment Failure

**Decision:** Failed payment → immediate read-only state, NO 30-day deletion

**Why:**

- Preserves data (no accidental loss)
- Encourages payment resolution (data still accessible)
- Simplifies billing logic (no grace period tracking)

**Trade-off:** Users may stay in read-only state indefinitely if payment not resolved

### Decision 19: Export to JSON Only (Not Markdown)

**Decision:** Workspace & user exports generate JSON, not Markdown

**Why:**

- Simpler implementation (direct Firestore → JSON)
- Structured data (easier to parse/import elsewhere)
- Preserves metadata (timestamps, IDs, flags)

**Trade-off:** Less human-readable than Markdown

### Decision 20: No Spam Report Abuse Prevention

**Decision:** No throttling, rate limiting, or validation on spam reports

**Why:**

- Simplifies implementation (no abuse detection logic)
- Trust users to self-regulate
- Edge case (spam report abuse) vs. common case (legitimate reports)

**Trade-off:** Potential for false reporting (accepted risk)

### Decision 21: Chat Screen Modal Refactoring with useModalManager

**Decision:** Consolidate 11 separate modal states into single `useModalManager` hook

**Why:**

- Cleaner code (11 `useState` → 1 hook)
- Easier to manage (single source of truth for modal state)
- Better type safety (centralized modal names)

**Trade-off:** Initial refactoring complexity for large component

### Decision 22: 1000 Message Export Limit

**Decision:** Export functions limited to last 1000 messages per conversation

**Why:**

- Prevents Cloud Function timeout (50s limit)
- Reasonable data size for mobile downloads
- Covers 99% of use cases

**Trade-off:** Large conversations get truncated (warning shown to user)

### Decision 23: Admin-Only Edit AI Content in Workspaces

**Decision:** Only workspace admins can edit AI content, even if other members are Pro

**Why:**

- Clear authority model (admin controls workspace content)
- Prevents conflicts (multiple Pro users editing same summary)
- Consistent with other admin-only features

**Trade-off:** Pro members can't customize AI in workspaces they join

---

## N. Phase 4 Security Architecture

### N.1 Multi-Layer Security Model

Phase 4 implements defense-in-depth with 3 enforcement layers:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      3-LAYER SECURITY ARCHITECTURE                            │
└──────────────────────────────────────────────────────────────────────────────┘

LAYER 1: CLIENT-SIDE CHECKS (UI Gating)
────────────────────────────────────────
• Hide features user doesn't have access to
• Show upgrade prompts for paywalled features
• Display "You cannot send messages" for blocked users
• Filter conversations by hiddenConversations array

Purpose: Better UX (don't show inaccessible features)
Security: NONE (client-side only, easily bypassed)

         │
         ↓

LAYER 2: FIRESTORE SECURITY RULES (Primary Enforcement)
────────────────────────────────────────────────────────
• Validate workspace membership before read/write
• Block message creation if sender is spam-banned
• Block message creation if sender is blocked by recipient
• Enforce participant membership for conversations
• Allow only message sender to edit their own messages

Purpose: Primary security layer (cannot be bypassed)
Security: HIGH (server-side, enforced by Firestore)

         │
         ↓

LAYER 3: CLOUD FUNCTION VALIDATION (Business Logic)
────────────────────────────────────────────────────
• Check isPaidUser before allowing AI features
• Validate workspace admin before admin actions
• Check spam-banned status before workspace/group creation
• Enforce capacity limits
• Validate trial status

Purpose: Business logic + secondary enforcement
Security: HIGH (server-side, runs before mutations)
```

### N.2 Firestore Security Rules (Phase 4 Extensions)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isUser(uid) {
      return isAuthenticated() && request.auth.uid == uid;
    }
    
    function isPaidUser() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isPaidUser == true;
    }
    
    function isWorkspaceAdmin(workspaceId) {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.adminUid == request.auth.uid;
    }
    
    function isWorkspaceMember(workspaceId) {
      return isAuthenticated() &&
             request.auth.uid in get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.members;
    }
    
    function isBlockedInDirectMessage(conversationId) {
      let conversation = get(/databases/$(database)/documents/conversations/$(conversationId));
      
      if (conversation.data.type != 'direct') {
        return false;
      }
      
      let senderId = request.auth.uid;
      let participants = conversation.data.participants;
      let recipientId = participants[0] == senderId ? participants[1] : participants[0];
      let recipient = get(/databases/$(database)/documents/users/$(recipientId));
      
      return senderId in recipient.data.blockedUsers;
    }
    
    function isSpamBanned() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.spamBanned == true;
    }
    
    // Users collection
    match /users/{uid} {
      allow read: if isAuthenticated();
      allow write: if isUser(uid);
    }
    
    // Workspaces collection
    match /workspaces/{workspaceId} {
      allow read: if isWorkspaceMember(workspaceId);
      allow create: if isPaidUser() && isUser(request.resource.data.adminUid) && !isSpamBanned();
      allow update: if isWorkspaceAdmin(workspaceId);
      allow delete: if isWorkspaceAdmin(workspaceId);
      
      // Billing events (read-only for admin)
      match /billingEvents/{eventId} {
        allow read: if isWorkspaceAdmin(workspaceId);
        allow write: if false; // Only Cloud Functions
      }
    }
    
    // Workspace invitations
    match /workspace_invitations/{invitationId} {
      allow read: if isAuthenticated() && 
                     (isUser(resource.data.invitedUserUid) || 
                      isUser(resource.data.invitedByUid));
      allow create: if isPaidUser() && !isSpamBanned();
      allow update: if isUser(resource.data.invitedUserUid);
      allow delete: if isUser(resource.data.invitedUserUid) || 
                       isUser(resource.data.invitedByUid);
    }
    
    // Group chat invitations
    match /group_chat_invitations/{invitationId} {
      allow read: if isAuthenticated() && 
                     (isUser(resource.data.invitedUserUid) || 
                      isUser(resource.data.invitedByUid));
      allow create: if isAuthenticated() && !isSpamBanned();
      allow update: if isUser(resource.data.invitedUserUid);
      allow delete: if isUser(resource.data.invitedUserUid) || 
                       isUser(resource.data.invitedByUid);
    }
    
    // Direct message invitations
    match /direct_message_invitations/{invitationId} {
      allow read: if isAuthenticated() && 
                     (isUser(resource.data.recipientUid) || 
                      isUser(resource.data.senderId));
      allow create: if isAuthenticated() && !isSpamBanned();
      allow update: if isUser(resource.data.recipientUid);
      allow delete: if isUser(resource.data.recipientUid) || 
                       isUser(resource.data.senderId);
    }
    
    // Conversations
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() && 
                     request.auth.uid in resource.data.participants;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
                       request.auth.uid in resource.data.participants;
      
      // Messages (with spam ban + blocking enforcement)
      match /messages/{messageId} {
        allow read: if isAuthenticated() && 
                       request.auth.uid in resource.data.participants;
        
        allow create: if isAuthenticated() && 
                         request.auth.uid in request.resource.data.participants &&
                         !isSpamBanned() &&
                         !isBlockedInDirectMessage(conversationId);
        
        // Only sender can edit/delete their own messages
        allow update: if isAuthenticated() && 
                         isUser(resource.data.senderId) &&
                         isPaidUser();
      }
      
      // AI Summaries
      match /ai_summaries/{summaryId} {
        allow read: if isAuthenticated() && 
                       request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow create: if false; // Only Cloud Functions
        allow update: if isPaidUser(); // Pro users or admins can edit
      }
      
      // AI Action Items
      match /ai_action_items/{itemId} {
        allow read: if isAuthenticated() && 
                       request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow create: if false; // Only Cloud Functions
        allow update: if isPaidUser(); // Status changes or admin edits
      }
      
      // AI Decisions
      match /ai_decisions/{decisionId} {
        allow read: if isAuthenticated() && 
                       request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow create: if false; // Only Cloud Functions
        allow update: if isPaidUser(); // Admin edits
      }
    }
  }
}
```

### N.3 Cloud Function Authorization Pattern

All Cloud Functions follow this authorization pattern:

```typescript
export const exampleFunction = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  // 2. Get user document
  const userRef = db.collection('users').doc(context.auth.uid);
  const userSnap = await userRef.get();
  const user = userSnap.data();
  
  // 3. Check spam ban (if creating resources)
  if (user.spamBanned) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Account restricted due to spam reports'
    );
  }
  
  // 4. Check subscription tier (if Pro feature)
  if (!user.isPaidUser && !isInActiveTrial(user)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Pro subscription required'
    );
  }
  
  // 5. Check workspace membership/admin (if workspace feature)
  if (data.workspaceId) {
    const workspace = await getWorkspace(data.workspaceId);
    
    if (!workspace.members.includes(context.auth.uid)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Not a workspace member'
      );
    }
    
    // Admin-only actions
    if (requiresAdmin && workspace.adminUid !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Workspace admin only'
      );
    }
  }
  
  // 6. Proceed with business logic...
});
```

### N.4 Security Decision Matrix

| Feature | Client Check | Firestore Rule | Cloud Function | Why |
|---------|-------------|----------------|----------------|-----|
| **Spam Ban (DMs)** | No | ✅ Primary | ✅ Backup | Critical: must block at rule level |
| **Spam Ban (Workspaces)** | No | ✅ Creation block | ✅ Primary | Function handles complex logic |
| **User Blocking** | ✅ UI hint | ✅ Primary | No | Rule-level enforcement sufficient |
| **Conversation Hiding** | ✅ Primary | No | No | UI-only, not security-critical |
| **Pro Feature Access** | ✅ UI gate | No | ✅ Primary | Business logic in function |
| **Workspace Admin** | ✅ UI gate | ✅ Writes | ✅ Primary | Multi-layer for sensitive operations |
| **Message Edit/Delete** | ✅ UI gate | ✅ Ownership | ✅ Primary | Pro check in function, ownership in rules |
| **Invitation Creation** | ✅ UI gate | ✅ Spam ban | ✅ Validation | Prevent spam at multiple levels |

---

## Phase 4 Summary

Phase 4 successfully transforms MessageAI from a personal messaging app into a team collaboration platform with:

- **3-tier subscription model** with 5-day free trial
- **Workspaces** supporting up to 25 members with pre-selected capacity billing
- **Sophisticated spam prevention** with dual ban system and 30-day decay
- **3 invitation systems** (workspaces, group chats, DMs) with unified UX
- **User blocking & conversation hiding** with one-way blocking model
- **Message editing/deletion** as Pro-only feature
- **Phone number authentication** as primary user identifier
- **4 workspace admin features** (edit AI, urgency, pins, capacity expansion)
- **2 export features** (workspace & user conversations to JSON)
- **6 refactored service helpers** improving code quality

**Total Phase 4 Implementation:**

- 13 sub-phases completed (1-8, 10-11 complete; 9, 12-13 pending)
- 454 unit tests passing
- 50+ Cloud Functions
- 8 new Firestore collections
- 14 architectural decisions documented

**See Phase 4 PRDs for complete implementation details:**

- `phase4-paid-tier/WORKSPACES-PAID-TIER-PRD.md`
- `phase4-paid-tier/PRD-SUPPLEMENT-SUB-PHASE-6.5-GROUP-CHAT-INVITES.md`
- `phase4-paid-tier/PRD-SUPPLEMENT-SUB-PHASE-7-WORKSPACE-ADMIN.md`

---

**END OF PHASE 4 ARCHITECTURE DOCUMENTATION**
