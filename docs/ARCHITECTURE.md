# MessageAI - Architecture Overview

**Version:** 1.1 (with AI Features)  
**Last Updated:** October 23, 2025

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
| **Anthropic Claude Sonnet 4** | LLM for summarization, action items, decisions, priority analysis |
| **OpenAI text-embedding-3-small** | Generate 1536-dim embeddings for semantic search |
| **Pinecone** | Vector database for storing and querying message embeddings |
| **Vercel AI SDK** | AI orchestration framework (optional) |
| **Zod** | Schema validation for AI responses |

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
6. Send to Claude API with structured prompt
    ↓
7. Validate response with Zod schema
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
8. Send to Claude for accurate analysis
9. Update message with final priority
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
│ 6. Send to Claude API                                               │
│    - Prompt: "Extract action items from conversation..."            │
│    - Include: participant list, formatted messages                  │
│    - Request structured JSON output                                 │
│    - Max tokens: 2000                                               │
│    ↓                                                                 │
│ 7. Validate Claude response with Zod                                │
│    - Schema: ActionItemSchema (text, assignee, dueDate, priority)   │
│    - Strip markdown code blocks if present                          │
│    - Parse JSON and validate                                        │
│    - If invalid: log error, throw 'internal' error                  │
│    ↓                                                                 │
│ 8. Resolve assignees                                                │
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
│ 3. Send to Claude API                                               │
│    - Prompt: "Identify decisions made in this conversation..."      │
│    - Request: decision, context, participantIds, sourceMessageIds   │
│    - Include confidence score (only return if > 0.7)                │
│    ↓                                                                 │
│ 4. Validate response with Zod (DecisionSchema)                      │
│    - Parse JSON, validate structure                                 │
│    - Filter: only include decisions with confidence > 0.7           │
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
  // STEP 7: Send to Claude (2-5 seconds)
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }]
  });
    ↓ (4) JSON response
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
  // STEP 8: Parse & validate with Zod (< 1ms)
  const rawText = response.content[0].text;
  const validatedSummary = parseAIResponse(rawText, SummarySchema);
  // If validation fails: throw error, client sees "Failed to generate summary"
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
6. Always validate AI responses with Zod before storing
7. Always apply security filters to Pinecone results in application code
8. Always handle AI API failures gracefully (don't break core messaging)

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
- Security: Defense-in-depth filtering, rate limiting (50/hour, 1000/month per user), Zod validation
- Cost: ~$0.90/user/month + $70/month Pinecone + Firebase Cloud Functions pay-as-you-go

See `ai-prd.md` for complete details including troubleshooting guides and manual testing procedures.

