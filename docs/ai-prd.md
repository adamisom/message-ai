# Product Requirements Document: Message AI - AI Features

**Document Version:** 1.1  
**Last Updated:** October 23, 2025  
**Author:** Product Team  
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Technical Architecture](#technical-architecture)
4. [AI Feature Specifications](#ai-feature-specifications)
5. [Implementation Details](#implementation-details)
6. [Performance Requirements](#performance-requirements)
7. [Security & Privacy](#security--privacy)
8. [Testing Strategy](#testing-strategy)
9. [Success Metrics](#success-metrics)
10. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### Purpose
This PRD defines the initial implementation of AI-powered features for Message AI, a React Native messaging application. The goal is to enhance user productivity through intelligent message analysis while maintaining the application's core focus on speed and real-time performance.

### Scope
**AI Features (Initial Release):**
- Thread Summarization
- Action Item Extraction
- Smart Search
- Priority Message Detection
- Decision Tracking

**Out of Scope for Initial Release:**
- Streaming responses for summarization
- Progressive loading for search results
- Multi-language support
- Voice message transcription
- Sentiment analysis
- Manual action item creation (future work)
- User flagging of incorrect AI extractions (future work)

### Key Principles
1. **Speed First:** AI features must not degrade core messaging performance
2. **Simple UX:** Loading states with clear progress indicators
3. **Privacy:** All AI processing respects conversation permissions
4. **Pragmatic:** Focus on high-value features that users will actually use

---

## Product Overview

### Current Application State

**Platform:** React Native + Expo Framework  
**Backend:** Firebase (Auth + Firestore)  
**Current Features:**
- One-on-one and group chats
- Real-time message delivery
- Read receipts and unread indicators
- Online status indicators
- Push notifications
- Message persistence
- Optimistic UI updates

### Target Users
Mobile messaging users who need to:
- Quickly catch up on lengthy conversations
- Track commitments and action items
- Find specific information in message history
- Identify urgent messages requiring attention
- Track decisions made in group discussions

---

## Technical Architecture

### Stack Overview

**Frontend:**
- React Native (Expo)
- Firebase Web SDK (Authentication)
- Firestore SDK (Data operations)

**Backend:**
- Firebase Cloud Functions (Node.js runtime)
- Vercel AI SDK (AI orchestration)
- Anthropic Claude Sonnet 4 (LLM provider)
- Pinecone (Vector database for embeddings)

**AI Pipeline Architecture:**
```
[React Native App] → [Firebase Cloud Functions] → [Vercel AI SDK] → [Claude API]
                                                ↓
                                          [Pinecone Vector DB]
                                                ↓
                                          [Firestore Cache]
```

### Firestore Data Structure

#### Collections Schema

**`/users/{uid}`**
```typescript
{
  uid: string,              // Firebase Auth UID
  email: string,            // Normalized lowercase email
  displayName: string,      // User-chosen display name
  isOnline: boolean,        // Online status
  lastSeenAt: timestamp,    // Last activity
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**`/conversations/{conversationId}`**
```typescript
{
  type: 'direct' | 'group',
  participants: string[],    // Array of UIDs
  participantDetails: {      // Denormalized user info
    [uid]: {
      displayName: string,
      email: string
    }
  },
  lastMessage: string | null,        // Truncated to 100 chars
  lastMessageAt: timestamp | null,
  lastRead: { [uid]: messageId },    // Last message read per user
  lastReadAt: { [uid]: timestamp },  // Last read timestamp per user
  createdAt: timestamp,
  
  // AI feature fields
  messageCount: number,              // Incremented on each message (for cache invalidation)
  
  // Group-specific fields
  name?: string,
  creatorId?: string
}
```

**`/conversations/{conversationId}/messages/{messageId}`**
```typescript
{
  text: string,
  senderId: string,          // UID of sender
  senderName: string,        // Denormalized for display
  participants: string[],    // Denormalized for security rules
  createdAt: timestamp,      // Server timestamp
  status?: 'sending' | 'sent' | 'failed' | 'queued',  // Client-side only
  
  // AI feature fields
  embedded: boolean,         // Whether message has been indexed for search
  embeddedAt?: timestamp,    // When embedding was created
  priority?: 'high' | 'medium' | 'low',  // AI-determined priority
  priorityQuick?: 'high' | 'low' | 'unknown',  // Quick heuristic result
  priorityAnalyzedAt?: timestamp  // When full AI analysis completed
}
```

**Conversation ID Patterns:**
- 1-on-1 chats: Deterministic ID using sorted UIDs → `[uid1, uid2].sort().join('_')`
- Group chats: Auto-generated Firestore document ID

**Important Initialization Notes:**

1. **Message `embedded` field**: All messages must be created with `embedded: false` initially. The batch embedding process will update this to `true` after successful indexing.

2. **Conversation `messageCount` field**: Should be initialized to `0` when conversation is created. The `incrementMessageCounter` trigger will increment it on each message.

3. **Existing conversations**: If adding to an existing app, run a migration to add `messageCount: 0` to all conversations and `embedded: false` to all messages.

#### New Collections for AI Features

**`/conversations/{conversationId}/ai_summaries/{summaryId}`**
```typescript
{
  summary: string,              // Generated summary text
  keyPoints: string[],          // Array of key discussion points
  messageCount: number,         // Number of messages summarized
  startMessageId: string,       // First message in range
  endMessageId: string,         // Last message in range
  startTimestamp: timestamp,    // Start of summarized period
  endTimestamp: timestamp,      // End of summarized period
  generatedAt: timestamp,       // When summary was created
  generatedBy: string,          // UID of user who requested
  model: string                 // AI model used (e.g., "claude-sonnet-4")
}
```

**`/conversations/{conversationId}/ai_action_items/{itemId}`**
```typescript
{
  text: string,                 // Action item description
  assigneeUid?: string,         // UID if assignee identified
  assigneeDisplayName?: string, // Display name of assignee
  assigneeEmail?: string,       // Email used for assignment resolution
  dueDate?: timestamp,          // Extracted due date if mentioned
  sourceMessageId: string,      // Message where item was identified
  sourceMessageText: string,    // Original message text
  priority: 'high' | 'medium' | 'low',
  status: 'pending' | 'completed',
  sourceType: 'ai',             // Always 'ai' for initial release
  extractedAt: timestamp,       // When item was extracted
  extractedBy: string,          // UID of user who requested extraction
  completedAt?: timestamp
}
```

**Note:** Future releases will support `sourceType: 'manual'` for user-created action items.

**Cache Documents:**
- `/conversations/{conversationId}/ai_summaries/latest` - Most recent summary cache
- `/conversations/{conversationId}/ai_action_items_cache` - Action items cache document  
- `/conversations/{conversationId}/ai_decisions_cache` - Decisions cache document

**`/conversations/{conversationId}/ai_decisions/{decisionId}`**
```typescript
{
  decision: string,             // The decision that was made
  context: string,              // Supporting context
  participants: string[],       // UIDs who agreed/participated
  sourceMessageIds: string[],   // Messages that led to decision
  decidedAt: timestamp,         // When decision was made
  extractedAt: timestamp        // When AI extracted it
}
```

**Note on Embeddings Storage:**
Message embeddings are stored exclusively in Pinecone (vector database). The `embedded` boolean field on message documents tracks indexing status. We do not mirror the full embedding vectors in Firestore to avoid storage costs (1536 floats × 8 bytes = ~12KB per message).

**`/users/{uid}/ai_usage/{month}`** (Rate Limiting & Usage Tracking)
```typescript
{
  month: string,                    // "2025-10"
  totalActions: number,             // All AI feature calls combined
  embeddingCalls: number,
  summaryCalls: number,
  actionItemCalls: number,
  searchCalls: number,
  priorityCalls: number,
  decisionCalls: number,
  totalCost: number,                // Estimated cost in USD
  
  // Rate limiting
  actionsThisHour: number,
  hourStartedAt: timestamp,
  
  lastUpdated: timestamp
}
```

**`/embedding_retry_queue/{messageId}`** (Error Handling)
```typescript
{
  messageId: string,
  conversationId: string,
  error: string,
  retryCount: number,
  nextRetryAfter: timestamp,        // Exponential backoff
  queuedAt: timestamp
}
```

### RAG Pipeline Architecture

**Embedding Strategy:**
- **Model:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **Trigger:** Batch processing every 5 minutes (scheduled Cloud Function)
- **Batch Size:** 500 messages per batch (serves as natural rate limit)
- **Storage:** Pinecone vector database (no Firestore mirror to save costs)
- **Tracking:** `embedded` boolean field on message documents
- **Context Window:** All messages per conversation (no limit)

**Pinecone Index Initialization:**

Before deploying Cloud Functions, you must create and configure the Pinecone index:

```bash
# 1. Create Pinecone account at https://www.pinecone.io/

# 2. Create index via Pinecone dashboard or API:
#    - Index name: message-ai-embeddings
#    - Dimensions: 1536 (matches text-embedding-3-small)
#    - Metric: cosine (for semantic similarity)
#    - Pod type: p1.x1 (starter)
#    - Replicas: 1 (can increase for production)

# 3. Example using Pinecone Python SDK:
pip install pinecone-client

python3 << EOF
import pinecone
pinecone.init(api_key="YOUR_API_KEY", environment="us-west1-gcp")

pinecone.create_index(
    name="message-ai-embeddings",
    dimension=1536,
    metric="cosine",
    pod_type="p1.x1"
)

# Verify index created
print(pinecone.list_indexes())
EOF

# 4. Add to Cloud Functions environment variables:
#    PINECONE_API_KEY=...
#    PINECONE_ENVIRONMENT=us-west1-gcp
#    PINECONE_INDEX_NAME=message-ai-embeddings
```

> ⚠️ **RISK CALLOUT: Pinecone Vector Database Dependency**
>
> **Risk**: Search functionality depends on Pinecone. If Pinecone is down or misconfigured, semantic search will fail.
>
> **Mitigation**:
> 1. Hybrid search with local keyword fallback (searches last 20 messages)
> 2. Pinecone outages don't affect message sending/reading
> 3. Failed embeddings go to retry queue for later processing
> 4. Firestore tracks embedding status (`embedded` field)
>
> **Manual Testing**:
> ```bash
> # Test 1: Pinecone connectivity
> 1. Deploy Cloud Functions with Pinecone credentials
> 2. Send test message
> 3. Wait 6 minutes for embedding
> 4. Check Pinecone dashboard: verify vector count increased
> 5. Try semantic search: verify results returned
>
> # Test 2: Metadata storage
> 1. Embed a test message via batch process
> 2. Query Pinecone index for that message ID
> 3. Verify metadata includes: conversationId, text, participants, senderId
> 4. Verify participants is an array of UIDs
>
> # Test 3: Pinecone failure simulation
> 1. Temporarily break Pinecone API key
> 2. Send test messages
> 3. Verify messages still sent/readable (core functionality intact)
> 4. Verify semantic search returns local fallback results only
> 5. Fix API key
> 6. Verify retry queue processes failed embeddings
>
> # Test 4: Hybrid search fallback
> 1. Send message with unique keyword "TESTXYZ123"
> 2. Search for "TESTXYZ123" immediately (before embedding)
> 3. Verify message found via local fallback
> 4. Wait 6 minutes for embedding
> 5. Search again, verify message found via vector search
> ```
>
> **Troubleshooting**:
> - **Symptom**: Search returns no results
>   - Check: Pinecone API key validity
>   - Check: Index name matches environment variable
>   - Check: Messages have `embedded: true` in Firestore
>   - Check: Vector count in Pinecone dashboard
> - **Symptom**: Search returns wrong conversations
>   - SECURITY ISSUE: Check post-query filtering is applied
>   - Check: Participants array in Pinecone metadata
>   - Check: conversationId filter working
> - **Symptom**: Embedding batch fails
>   - Check: Pinecone index exists and is active
>   - Check: Index dimension is 1536
>   - Check: Pinecone quota not exceeded

**Query Patterns:**

1. **Full Conversation Context** (for summarization, action items, decisions):
```javascript
// Get conversation metadata
const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));

// Get messages in time range
const messagesQuery = query(
  collection(db, 'conversations', conversationId, 'messages'),
  orderBy('createdAt', 'asc'),
  where('createdAt', '>=', startTime),
  where('createdAt', '<=', endTime),
  limit(500)
);
```

2. **Semantic Search** (for Smart Search feature):
```javascript
// User query → embedding
const queryEmbedding = await generateEmbedding(userQuery);

// Pinecone vector search
// NOTE: Security filter - verify exact Pinecone syntax during implementation
// May need to be: participants: userId (if Pinecone supports array membership)
// Or use post-query filtering for guaranteed security
const searchResults = await pinecone.query({
  vector: queryEmbedding,
  filter: { 
    conversationId: conversationId
    // Additional participant filtering done post-query for security
  },
  topK: 20,  // Get extra results for post-filtering
  includeMetadata: true
});

// Defense-in-depth: Filter results to ensure user has access
const secureResults = searchResults.matches.filter(match =>
  match.metadata.participants && match.metadata.participants.includes(userId)
).slice(0, 10);

// Fetch full messages from Firestore
const messageIds = searchResults.matches.map(m => m.id);
const messages = await fetchMessagesByIds(conversationId, messageIds);
```

3. **Collection Group Query** (for cross-conversation search):
```javascript
// IMPORTANT: Requires composite index in Firestore
// Firestore will prompt you to create this index on first query attempt
// Or manually create via Firebase console:
//   Collection Group: messages
//   Fields: participants (Array-contains), createdAt (Descending), __name__ (Descending)
//   Query scope: Collection group

const allMessagesQuery = query(
  collectionGroup(db, 'messages'),
  where('participants', 'array-contains', userId),
  orderBy('createdAt', 'desc'),
  limit(1000)
);
```

> ⚠️ **RISK CALLOUT: Firestore Composite Indexes Required**
>
> **Risk**: Collection group queries (used by batch embedding and batch priority analysis) will fail without proper composite indexes.
>
> **Required Indexes**:
> 1. **For batch embedding** (collection group: `messages`):
>    - Fields: `embedded` (==), `createdAt` (Ascending)
> 2. **For batch priority analysis** (collection group: `messages`):
>    - Fields: `priorityNeedsAnalysis` (==), `createdAt` (Descending)
>
> **How to Create**:
> - **Option 1 (Recommended)**: Let Firestore auto-prompt
>   1. Deploy Cloud Function
>   2. Wait for first scheduled run
>   3. Check Cloud Function logs for index creation URL
>   4. Click URL to auto-create index
>   5. Wait ~5 minutes for index to build
> - **Option 2**: Manual creation via Firebase Console
>   1. Go to Firestore > Indexes > Composite Indexes
>   2. Click "Create Index"
>   3. Collection Group ID: `messages`
>   4. Add fields as specified above
>
> **Manual Testing**:
> ```bash
> # Test: Verify indexes exist before deploying
> 1. Check Firebase Console > Firestore > Indexes
> 2. Verify composite indexes listed above exist
> 3. Verify status is "Enabled" (not "Building")
> 
> # Test: Batch embedding without index
> 1. Deploy without creating index
> 2. Wait for batch function to run
> 3. Check logs for index creation URL
> 4. Create index via URL
> 5. Wait 5 minutes
> 6. Verify next batch run succeeds
> ```
>
> **Troubleshooting**:
> - **Symptom**: "The query requires an index" error
>   - Check: Cloud Function logs for index creation link
>   - Check: Firebase Console for index status
>   - Action: Click link or manually create index
> - **Symptom**: "Index is still building"
>   - Wait: Indexes take 5-10 minutes to build
>   - Check: Firebase Console shows "Enabled" status
> - **Symptom**: Batch functions timeout
>   - May be due to missing index (forces full collection scan)
>   - Check: All required composite indexes exist and are enabled

---

## AI Feature Specifications

### Feature 1: Thread Summarization

**User Story:**  
*"As a user, I want to quickly understand what happened in a long conversation without reading every message, so I can catch up efficiently."*

**Functionality:**
- Summarize the last N messages in a conversation (user-selectable: 25, 50, 100, all)
- Extract key discussion points as bullet points
- Show time range covered by the summary
- Cache summaries to avoid redundant processing

**UI/UX:**
- **Entry Point:** "Summarize Thread" button in conversation header
- **Loading State:** Modal with spinner and "Analyzing X messages..." text
- **Display:** Full-screen modal with:
  - Summary paragraph (3-5 sentences)
  - Key points (3-7 bullet points)
  - Time range covered
  - Message count
  - "Close" and "Share Summary" buttons

**Technical Implementation:**

*Cloud Function: `generateThreadSummary`*

```typescript
// Input parameters
interface SummarizeRequest {
  conversationId: string;
  userId: string;
  messageCount: number;  // 25, 50, 100, or -1 for all
}

// Processing flow
1. Validate user has access to conversation (check participants array)
2. Query last N messages from Firestore (ordered by createdAt)
3. Check if cached summary exists and is recent (< 1 hour old)
4. If no cache, construct prompt for Claude:
   - Include conversation type (1-on-1 vs group)
   - Include participant names
   - Include all messages with timestamps and sender names
5. Send to Claude API with structured output request
6. Store summary in Firestore (/ai_summaries subcollection)
7. Return summary to client

// Claude prompt structure
const prompt = `
You are summarizing a ${conversationType} conversation with ${participantCount} participants.
Participants: ${participantNames}

Messages (${messageCount} total, from ${startTime} to ${endTime}):
${formattedMessages}

Provide a summary in the following JSON format:
{
  "summary": "3-5 sentence overview of the conversation",
  "keyPoints": ["point 1", "point 2", "point 3"]
}

Focus on: main topics discussed, important decisions, action items, and key information shared.
`;
```

> ⚠️ **RISK CALLOUT: Anthropic Claude API Dependency**
>
> **Risk**: All AI features (summarization, action items, decisions, priority analysis) depend on Anthropic Claude API. Outages or rate limiting will prevent these features from working.
>
> **Mitigation**:
> 1. Timeout handling (10s for summaries, 8s for actions, etc.)
> 2. Clear error messages to users
> 3. Cache reduces repeated API calls (>50% cache hit rate expected)
> 4. Rate limiting prevents runaway costs (50 actions/hour per user)
> 5. Structured output validation catches malformed responses
>
> **Manual Testing**:
> ```bash
> # Test 1: Normal summarization
> 1. Create conversation with 50 messages
> 2. Click "Summarize Thread"
> 3. Verify summary appears within 5 seconds
> 4. Verify summary accurately reflects conversation
> 5. Click "Summarize" again immediately
> 6. Verify cache hit (< 1 second response)
>
> # Test 2: API failure simulation
> 1. Temporarily break Anthropic API key
> 2. Try to generate summary
> 3. Verify friendly error message shown
> 4. Verify no app crash
> 5. Fix API key and retry
> 6. Verify summary now works
>
> # Test 3: Timeout handling
> 1. Request summary of 100-message conversation
> 2. If response > 10 seconds, verify timeout error shown
> 3. Verify user can retry
>
> # Test 4: Malformed response handling
> 1. Monitor for validation errors in Cloud Function logs
> 2. If Claude returns non-JSON, verify error logged
> 3. Verify user sees "Failed to generate summary" not raw error
> ```
>
> **Troubleshooting**:
> - **Symptom**: "Summary failed, please try again"
>   - Check: Anthropic API key validity
>   - Check: Cloud Function logs for API errors
>   - Check: Rate limit not exceeded (50 requests/min)
> - **Symptom**: Incorrect or incomplete summaries
>   - Check: Prompt includes all message context
>   - Check: Message count matches what was requested
>   - Check: Claude response includes keyPoints array
> - **Symptom**: Validation errors in logs
>   - Check: Claude response format matches Zod schema
>   - Check: Response includes markdown code blocks (should be stripped)
>   - Verify parseAIResponse() function working correctly

**Performance Targets:**
- Response time: 3-5 seconds for 100 messages (target), 8 seconds maximum
- Timeout: 10 seconds (client-side)
- Cache hit rate: >50% for frequently accessed threads
- Cost per summary: <$0.05

**Caching Strategy:**
- Cache lifetime: 1 hour OR until 5 new messages (whichever comes first)
- Cache scope: Per-conversation (shared by all participants)
- Cache storage: `/conversations/{conversationId}/ai_summaries/latest`

**Error Handling:**
- Network timeout: Show "Summary failed, please try again"
- Invalid conversation: Show "You don't have access to this conversation"
- API rate limit: Show "Too many requests, please wait a moment"

---

### Feature 2: Action Item Extraction

**User Story:**  
*"As a user, I want to see all action items and tasks mentioned in a conversation, so I don't forget commitments."*

**Functionality:**
- Automatically identify action items from messages
- Extract assignee if mentioned (e.g., "@John will handle this")
- Extract due dates if mentioned (e.g., "by Friday", "next week")
- Mark items as completed
- Show all action items for a conversation in one view

**UI/UX:**
- **Entry Point:** "Action Items" tab in conversation details
- **Loading State:** Spinner with "Scanning for action items..."
- **Display:** List view with:
  - Checkbox for completion status
  - Action item text
  - Assignee (if identified)
  - Due date (if mentioned)
  - Source message link (tap to jump to message)
  - Priority indicator (high/medium/low)

**Technical Implementation:**

*Cloud Function: `extractActionItems`*

```typescript
interface ActionItemRequest {
  conversationId: string;
  userId: string;
  messageRange?: { start: timestamp, end: timestamp };  // Optional range
}

// Processing flow
1. Validate user access
2. Query messages (last 100 by default, or specified range)
3. Check for cached action items (< 24 hours old)
4. Send messages to Claude with extraction prompt
5. Parse structured JSON response
6. Store in /ai_action_items subcollection
7. Return action items to client

// Claude prompt
const prompt = `
Extract action items from this conversation. An action item is a task, commitment, or to-do mentioned by any participant.

Participants:
${participants.map(p => `- ${p.displayName} (${p.email})`).join('\n')}

Messages:
${formattedMessages}

Return JSON array:
[
  {
    "text": "Description of the action item",
    "assigneeIdentifier": "Display name OR email if specified",
    "dueDate": "ISO timestamp (if mentioned, otherwise null)",
    "priority": "high|medium|low",
    "sourceMessageId": "ID of message containing this item"
  }
]

Assignment rules:
- Use display name if mentioned unambiguously (e.g., "John should review")
- Use email if explicitly mentioned (e.g., "john@company.com should review")
- Leave null if assignee is unclear or not mentioned

Priority rules:
- High priority: uses urgent language, has near deadline
- Medium priority: standard tasks with timeframes
- Low priority: suggestions or optional items
`;

// After getting AI response, resolve assignee
async function resolveAssignee(
  identifier: string | null,
  conversationId: string
): Promise<{ uid: string; displayName: string; email: string } | null> {
  if (!identifier) return null;
  
  const conversationDoc = await db.doc(`conversations/${conversationId}`).get();
  const participantDetails = conversationDoc.data().participantDetails;
  
  // Check if identifier is an email
  const isEmail = identifier.includes('@');
  
  if (isEmail) {
    // Find by email
    for (const [uid, details] of Object.entries(participantDetails)) {
      if (details.email.toLowerCase() === identifier.toLowerCase()) {
        return { uid, displayName: details.displayName, email: details.email };
      }
    }
  } else {
    // Find by display name
    const matches = [];
    for (const [uid, details] of Object.entries(participantDetails)) {
      if (details.displayName.toLowerCase() === identifier.toLowerCase()) {
        matches.push({ uid, displayName: details.displayName, email: details.email });
      }
    }
    
    if (matches.length === 1) {
      return matches[0];
    } else if (matches.length > 1) {
      console.warn(`Ambiguous assignee "${identifier}" - ${matches.length} matches found`);
      return null;  // Cannot resolve ambiguous assignee
    }
  }
  
  console.warn(`Assignee "${identifier}" not found in conversation participants`);
  return null;
}
```

**Client-Side UX for Mentions:**

When users type action items in messages, the app should:
1. Detect `@` character and show mention picker
2. If user types a display name that has duplicates, show warning: "2+ [name]s in thread, you must specify their email"
3. Insert email when user selects from picker (e.g., "@john.doe@company.com")
4. This ensures AI can unambiguously extract assignees

**Performance Targets:**
- Response time: 2-4 seconds for 100 messages (target), 6 seconds maximum
- Timeout: 8 seconds (client-side)
- Accuracy: >85% precision on identifying actual action items
- False positive rate: <20%

**Caching Strategy:**
- Cache lifetime: 24 hours OR until 10 new messages (whichever comes first)
- Cache scope: Per-conversation (shared by all participants)
- Cache storage: `/conversations/{conversationId}/ai_action_items_cache`

**Edge Cases:**
- Completed items mentioned in messages: Mark with strikethrough
- Duplicate items: Deduplicate based on semantic similarity
- Ambiguous assignees: Leave assignee field empty

---

### Feature 3: Smart Search

**User Story:**  
*"As a user, I want to search for messages using natural language and concepts, not just exact keywords, so I can find relevant information even when I don't remember exact wording."*

**Functionality:**
- Semantic search across conversation history
- Search within current conversation or across all conversations
- Rank results by relevance
- Show context around matched messages

**UI/UX:**
- **Entry Point:** Search icon in conversation header or main screen
- **Loading State:** "Searching..." with spinner (800ms for 10 results)
- **Display:** List of results with:
  - Message preview (with search context highlighted)
  - Sender name and avatar
  - Timestamp
  - Conversation name (for cross-conversation search)
  - Tap to jump to message in full context

**Technical Implementation:**

*Cloud Function: `semanticSearch`*

```typescript
interface SearchRequest {
  query: string;
  userId: string;
  conversationId?: string;  // Optional: search within specific conversation
  limit: number;            // Default 10
}

// Processing flow
1. Generate embedding for search query using text-embedding-3-small
2. Query Pinecone with:
   - Query vector
   - Filter: user in participants array (security)
   - Filter: conversationId if specified
   - TopK: requested limit
3. Fetch full message documents from Firestore using returned message IDs
4. Return results with relevance scores

// Pinecone query with defense-in-depth security
const results = await pineconeIndex.query({
  vector: queryEmbedding,  // 1536-dim vector
  filter: { 
    ...(conversationId && { conversationId })
    // Note: Participant filtering done post-query for guaranteed security
  },
  topK: limit * 2,  // Get extra results for filtering
  includeMetadata: true
});

// SECURITY-CRITICAL: Filter results on server side
const secureResults = results.matches.filter(match =>
  match.metadata.participants && match.metadata.participants.includes(userId)
).slice(0, limit);

return secureResults;
```

> ⚠️ **RISK CALLOUT: Pinecone Security Filtering**
>
> **Risk**: Pinecone metadata filters may not work as expected with array fields, potentially allowing unauthorized access to messages.
>
> **Mitigation**: We use defense-in-depth approach:
> 1. Filter by conversationId in Pinecone (reduces result set)
> 2. Filter by participants array in application code (guaranteed security)
> 3. Always verify user is in participants array before returning results
>
> **Testing**: Before deploying, manually test that users cannot see messages from conversations they're not in:
> ```bash
> # Test: Try to search across all conversations as user A
> # Verify: Results only contain messages from user A's conversations
> # Test: Add user B to conversation, verify they can now search those messages
> # Test: Remove user B, verify they can no longer search those messages
> ```
>
> **Troubleshooting**: If users report seeing messages from wrong conversations:
> 1. Check Cloud Function logs for "SECURITY VIOLATION" warnings
> 2. Verify participants array is correctly stored in Pinecone metadata
> 3. Verify post-query filtering is applied before returning results
> 4. Check that conversation participant list is up to date

**Embedding Pipeline (Batch Processing):**

*Cloud Function: `batchEmbedMessages` (scheduled every 5 minutes)*

> ⚠️ **RISK CALLOUT: OpenAI Embedding API Dependency**
>
> **Risk**: Batch embedding pipeline depends on OpenAI API. If API is down or rate-limited, new messages won't be searchable.
>
> **Mitigation**:
> 1. Retry queue with exponential backoff (max 5 attempts)
> 2. Messages remain readable even if embedding fails
> 3. Queue monitoring alerts if backlog grows
> 4. Graceful degradation: Hybrid search includes local keyword fallback
>
> **Manual Testing**:
> ```bash
> # Test 1: Normal operation
> 1. Send 10 test messages
> 2. Wait 6 minutes (one batch cycle + buffer)
> 3. Verify all messages have embedded:true in Firestore
> 4. Verify messages are searchable via Smart Search
>
> # Test 2: API failure simulation
> 1. Temporarily break OpenAI API key (add invalid character)
> 2. Send test messages
> 3. Verify messages still sent/readable
> 4. Check retry queue populates correctly
> 5. Fix API key
> 6. Verify retry processor clears queue
>
> # Test 3: Rate limit handling
> 1. Send 600 messages rapidly (exceeds 500/batch limit)
> 2. Verify first 500 processed in batch 1
> 3. Verify remaining 100 processed in batch 2
> 4. Check no errors or dropped messages
> ```
>
> **Troubleshooting**:
> - **Symptom**: Messages not becoming searchable
>   - Check: `embedded: false` messages in Firestore
>   - Check: Cloud Function logs for OpenAI API errors
>   - Check: Retry queue size (should be < 100)
> - **Symptom**: High retry queue size (>1000)
>   - Check: OpenAI API status
>   - Check: API key validity
>   - Check: Pinecone connectivity
> - **Symptom**: Search results missing recent messages
>   - Expected: Up to 5-minute delay for new messages
>   - Check: Batch function running (every 5 min)
>   - Check: Hybrid search fallback working (last 20 messages)

```typescript
/**
 * Batch Embedding Processor
 * 
 * Runs every 5 minutes to embed messages that haven't been indexed yet.
 * 
 * RATE LIMITING:
 * The `limit(500)` serves dual purpose:
 * 1. Prevents function timeout (batch size management)
 * 2. Acts as natural rate limit (max 500 messages per 5 min = 6K/hour = 144K/day)
 * 
 * Cost protection: Max cost per batch = 500 × $0.0001 = $0.05
 * Max daily cost for embeddings: 144K × $0.0001 = $14.40
 */
exports.batchEmbedMessages = functions.pubsub
  .schedule('every 5 minutes')
  .timeoutSeconds(540)  // 9 minutes (max for Cloud Functions)
  .memory('512MB')
  .onRun(async (context) => {
    // Find unembedded messages across all conversations
    const unembeddedMessages = await db.collectionGroup('messages')
      .where('embedded', '==', false)
      .orderBy('createdAt', 'asc')
      .limit(500)  // RATE LIMIT: Max 500 per batch
      .get();
    
    if (unembeddedMessages.empty) {
      console.log('No messages to embed');
      return;
    }
    
    console.log(`Embedding ${unembeddedMessages.size} messages`);
    
    // Batch embed (OpenAI allows array of texts)
    const texts = unembeddedMessages.docs.map(doc => doc.data().text);
    
    const embeddings = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts
    });
    
    // Batch upsert to Pinecone
    const vectors = unembeddedMessages.docs.map((doc, index) => ({
      id: doc.id,
      values: embeddings.data[index].embedding,
      metadata: {
        conversationId: doc.ref.parent.parent.id,
        text: doc.data().text,
        senderId: doc.data().senderId,
        senderName: doc.data().senderName,
        participants: doc.data().participants,
        createdAt: doc.data().createdAt.toMillis()
      }
    }));
    
    await pineconeIndex.upsert(vectors);
    
    // Mark messages as embedded
    const batch = db.batch();
    unembeddedMessages.docs.forEach(doc => {
      batch.update(doc.ref, {
        embedded: true,
        embeddedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    
    console.log(`Successfully embedded ${unembeddedMessages.size} messages`);
  });
```

**Fallback & Retry Strategy:**

```typescript
// Retry queue management
async function queueForRetry(messageId: string, conversationId: string, error: Error) {
  const queueRef = db.collection('embedding_retry_queue').doc(messageId);
  const existingDoc = await queueRef.get();
  
  const retryCount = existingDoc.exists ? existingDoc.data().retryCount : 0;
  const MAX_RETRIES = 5;
  
  if (retryCount >= MAX_RETRIES) {
    console.error(`Message ${messageId} exceeded max retries, giving up`);
    await queueRef.delete();
    
    // Log for monitoring
    console.error('EMBEDDING_PERMANENT_FAILURE', {
      messageId,
      conversationId,
      retryCount,
      error: error.message
    });
    return;
  }
  
  // Exponential backoff: 1min, 5min, 15min, 30min, 60min
  const delays = [60, 300, 900, 1800, 3600]; // seconds
  const delaySeconds = delays[Math.min(retryCount, delays.length - 1)];
  const nextRetry = new Date(Date.now() + delaySeconds * 1000);
  
  await queueRef.set({
    messageId,
    conversationId,
    error: error.message,
    retryCount: retryCount + 1,
    nextRetryAfter: admin.firestore.Timestamp.fromDate(nextRetry),
    queuedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Retry processor (runs every 10 minutes)
exports.retryFailedEmbeddings = functions.pubsub
  .schedule('every 10 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    
    const readyForRetry = await db.collection('embedding_retry_queue')
      .where('nextRetryAfter', '<=', now)
      .limit(100)
      .get();
    
    if (readyForRetry.empty) {
      return;
    }
    
    console.log(`Retrying ${readyForRetry.size} failed embeddings`);
    
    for (const doc of readyForRetry.docs) {
      const item = doc.data();
      
      try {
        const messageSnap = await db
          .doc(`conversations/${item.conversationId}/messages/${item.messageId}`)
          .get();
        
        if (!messageSnap.exists) {
          await doc.ref.delete();
          continue;
        }
        
        // Retry embedding
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
          input: messageSnap.data().text
    });
    
    await pineconeIndex.upsert([{
          id: item.messageId,
      values: embedding.data[0].embedding,
          metadata: { /* ... */ }
        }]);
        
        await messageSnap.ref.update({
          embedded: true,
          embeddedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Success - remove from queue
        await doc.ref.delete();
        console.log(`Successfully retried ${item.messageId}`);
        
      } catch (error) {
        console.error(`Retry failed for ${item.messageId}:`, error);
        await queueForRetry(item.messageId, item.conversationId, error);
      }
    }
  });

// Monitoring: Log warning if queue grows large
exports.monitorRetryQueue = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async () => {
    const queueSize = await db.collection('embedding_retry_queue').count().get();
    const count = queueSize.data().count;
    
    if (count > 1000) {
      console.error('ALERT: Embedding retry queue large', { queueSize: count });
    } else if (count > 100) {
      console.warn('WARNING: Embedding retry queue growing', { queueSize: count });
    }
  });
```

**Graceful Degradation:**
- Message sending never fails due to embedding issues
- Messages are readable immediately even if not yet searchable
- Retry queue ensures eventual consistency
- Max 5 retries with exponential backoff (1min → 60min)
- Queue monitoring alerts if problems persist

**Performance Targets:**
- Embedding generation: <200ms per message (batch processing)
- Search query time: <500ms for embedding + Pinecone search
- Total search time: <800ms for 10 results (target), 1.5s maximum
- Timeout: 3 seconds (client-side)
- Batch embedding delay: Up to 5 minutes for new messages to become searchable

**Search Quality Metrics:**
- Relevance: Top result relevant >80% of the time
- Recall: Finds target message in top 10 results >90% of the time

**Hybrid Search (Handling Recent Messages):**

To prevent "just sent message not found" issues during the 0-5 minute embedding delay:

```typescript
async function smartSearch(query: string, conversationId: string) {
  // 1. Vector search (embedded messages only)
  const vectorResults = await semanticSearchCloudFunction({ query, conversationId });
  
  // 2. Local fallback: keyword search in last 20 messages
  const recentMessages = await db
    .collection(`conversations/${conversationId}/messages`)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();
  
  const localMatches = recentMessages.docs
    .filter(doc => doc.data().text.toLowerCase().includes(query.toLowerCase()))
    .map(doc => ({ id: doc.id, ...doc.data(), source: 'local' }));
  
  // 3. Merge results (deduplicate by message ID)
  const vectorIds = new Set(vectorResults.map(r => r.id));
  const uniqueLocalMatches = localMatches.filter(m => !vectorIds.has(m.id));
  
  return [...uniqueLocalMatches, ...vectorResults];
}
```

This ensures users always find their recently sent messages even before embedding completes.

---

### Feature 4: Priority Message Detection

**User Story:**  
*"As a user, I want to be notified about urgent messages that need immediate attention, so I don't miss important information."*

**Functionality:**
- Analyze incoming messages for urgency indicators
- Flag messages as high, medium, or low priority
- Show priority badge on message
- Send enhanced push notification for high-priority messages
- Hybrid approach: Quick heuristic + batch AI refinement

**UI/UX:**
- **Entry Point:** Automatic, runs on all incoming messages
- **Display:** 
  - Priority badge on message (🔴 High, 🟡 Medium)
  - No badge for low priority (default)
  - Push notification includes priority level for high-priority messages
  - If AI downgrades priority after analysis, show notification: "Message priority updated based on AI analysis"

**Technical Implementation (Hybrid Approach):**

**Phase 1: Real-Time Quick Heuristic**

```typescript
// Shared utility (client + server): utils/priorityHeuristics.ts
export function quickPriorityCheck(text: string): 'high' | 'low' | 'unknown' {
  const lowPriorityPatterns = [
    /^(ok|okay|sure|thanks|thx|ty|lol|haha|😊|👍|❤️)$/i,
    /^(good ?night|good ?morning|see you|bye|later|ttyl)/i,
    /^(nice|cool|awesome|great|sounds good)/i
  ];
  
  const highPriorityKeywords = [
    'urgent', 'asap', 'immediately', 'emergency', 'critical', 'important',
    'deadline', 'need now', 'right away', 'time sensitive', 'breaking',
    'alert', 'attention', 'priority', 'action required'
  ];
  
  const urgentPunctuation = /\?{2,}|!{2,}/;  // "WHAT??" or "NOW!!!"
  
  // Check low priority (skip AI)
  if (lowPriorityPatterns.some(p => p.test(text)) && text.length < 30) {
    return 'low';
  }
  
  // Check high priority indicators
  const lowerText = text.toLowerCase();
  if (highPriorityKeywords.some(kw => lowerText.includes(kw))) {
    return 'high';
  }
  
  if (urgentPunctuation.test(text)) {
    return 'high';
  }
  
  // Check all caps (might be urgent)
  if (text.length > 10 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    return 'high';
  }
  
  return text.length < 30 ? 'low' : 'unknown';
}

// Real-time Cloud Function trigger
exports.quickPriorityCheck = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const quickPriority = quickPriorityCheck(message.text);
    
    if (quickPriority === 'high') {
      // Send enhanced push notification NOW
      await sendPriorityNotification(message, 'high');
      
      // Mark for full AI analysis
      await snap.ref.update({ 
        priorityQuick: 'high',
        priority: 'high',  // Tentative, may be refined by batch
        priorityNeedsAnalysis: true
      });
    } else if (quickPriority === 'low') {
      await snap.ref.update({ 
        priorityQuick: 'low',
        priority: 'low',
        priorityNeedsAnalysis: false
      });
    } else {
      // Unknown - defer to batch analysis
      await snap.ref.update({ 
        priorityQuick: 'unknown',
        priorityNeedsAnalysis: true
      });
    }
  });
```

**Phase 2: Batch AI Refinement**

```typescript
/**
 * Batch Priority Analysis
 * 
 * Runs every 10 minutes to refine priority detection with full AI analysis.
 * Only analyzes messages where heuristic returned 'high' or 'unknown'.
 * Provides more accurate priority but doesn't delay notifications.
 */
exports.batchAnalyzePriority = functions.pubsub
  .schedule('every 10 minutes')
  .onRun(async (context) => {
    const needsAnalysis = await db.collectionGroup('messages')
      .where('priorityNeedsAnalysis', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    if (needsAnalysis.empty) {
      return;
    }
    
    console.log(`Analyzing priority for ${needsAnalysis.size} messages`);
    
    for (const messageDoc of needsAnalysis.docs) {
      const message = messageDoc.data();
      
      try {
        const aiPriority = await analyzeMessagePriorityWithAI(message.text);
        
        // Check if priority changed from heuristic
        const priorityChanged = message.priorityQuick === 'high' && aiPriority !== 'high';
        
        await messageDoc.ref.update({
          priority: aiPriority,
          priorityNeedsAnalysis: false,
          priorityAnalyzedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Notify user if priority was downgraded
        if (priorityChanged) {
          await notifyPriorityDowngrade(message, aiPriority);
        }
        
      } catch (error) {
        console.error(`Priority analysis failed for ${messageDoc.id}:`, error);
        // Keep heuristic result, don't retry
        await messageDoc.ref.update({ priorityNeedsAnalysis: false });
      }
    }
  });

// Claude priority analysis
async function analyzeMessagePriorityWithAI(text: string): Promise<Priority> {
  const prompt = `
Analyze this message and determine its priority level.

Message: "${text}"

Respond with JSON:
{ "priority": "high" | "medium" | "low", "reason": "brief explanation" }

Priority guidelines:
- HIGH: Urgent matters, time-sensitive requests, emergencies, critical decisions
- MEDIUM: Important but not urgent, questions needing response, scheduled items
- LOW: Casual conversation, acknowledgments, social messages
`;
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }]
  });
  
  let jsonText = response.content[0].text.trim();
  
  // Strip markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```json?\n/, '').replace(/\n```$/, '');
  }
  
  const result = JSON.parse(jsonText);
  return result.priority;
}

// Notify user when priority downgraded
async function notifyPriorityDowngrade(message: any, newPriority: string) {
  // Send in-app notification to conversation participants
  await sendInAppNotification({
    conversationId: message.conversationId,
    message: `Message priority updated to '${newPriority}' based on AI analysis`,
    messageId: message.messageId,
    type: 'priority_update'
  });
}
```

**Performance Targets:**
- Quick heuristic: <10ms (client + server)
- Heuristic accuracy: ~70% (acceptable for notifications)
- AI analysis: <500ms per message (batch processing)
- AI accuracy: >85%
- Timeout: 2 seconds (not user-facing, batch process only)
- Cost reduction: ~70% (only analyze 30% of messages with AI)

**Priority Indicators:**
- **High Priority:** Urgent keywords, deadlines, questions requiring immediate response, emergencies, all caps, excessive punctuation
- **Medium Priority:** Requests for action, questions, meeting scheduling, decisions needed
- **Low Priority:** Acknowledgments, casual chat, emoji-only messages, greetings

**Why Hybrid Approach:**
1. **Notifications need speed:** Real-time heuristic ensures high-priority messages trigger enhanced notifications immediately
2. **Accuracy over time:** Batch AI refinement improves accuracy without delaying notifications
3. **Cost effective:** ~70% of messages skip AI analysis (quick heuristic sufficient)
4. **User transparency:** Notifications inform users when AI refines the priority

---

### Feature 5: Decision Tracking

**User Story:**  
*"As a user in group chats, I want to track important decisions that were made, so everyone stays aligned and I can reference them later."*

**Functionality:**
- Identify when a decision has been made in conversation
- Extract the decision and supporting context
- Track who participated in the decision
- Show timeline of decisions for the conversation

**UI/UX:**
- **Entry Point:** "Decisions" tab in conversation details
- **Loading State:** "Scanning for decisions..."
- **Display:** Timeline view with:
  - Decision text (bold)
  - Context paragraph
  - Participants involved
  - Date decided
  - Link to source messages
  - "Add Comment" option

**Technical Implementation:**

*Cloud Function: `trackDecisions`*

```typescript
interface DecisionRequest {
  conversationId: string;
  userId: string;
  messageRange?: { start: timestamp, end: timestamp };
}

// Processing flow
1. Validate user access
2. Query messages (last 100 by default, or specified range)
3. Check for cached decisions (< 24 hours old)
4. Send to Claude with decision extraction prompt
5. Store in /ai_decisions subcollection
6. Return decisions to client

// Claude prompt
const prompt = `
Identify decisions made in this group conversation. A decision is when participants agree on a course of action, choice, or resolution.

Conversation participants: ${participantNames}
Messages:
${formattedMessages}

Return JSON array:
[
  {
    "decision": "Clear statement of what was decided",
    "context": "2-3 sentence context explaining why/how",
    "participantIds": ["uid1", "uid2"],  // Who agreed or participated
    "sourceMessageIds": ["msgId1", "msgId2"],  // Messages showing the decision
    "confidence": 0.0-1.0  // How confident you are this is a decision
  }
]

Only include decisions with confidence > 0.7.
Examples of decisions:
- "We'll launch the feature next Tuesday"
- "John will be the point person for this project"
- "Budget approved at $50k"
- "Meeting rescheduled to 3pm Friday"
`;
```

**Performance Targets:**
- Response time: 3-4 seconds for 100 messages (target), 7 seconds maximum
- Timeout: 10 seconds (client-side)
- Accuracy: >75% precision on identifying real decisions
- False positive rate: <25%

**Caching Strategy:**
- Cache lifetime: 24 hours OR until 10 new messages (whichever comes first)
- Cache scope: Per-conversation (shared by all participants)
- Cache storage: `/conversations/{conversationId}/ai_decisions_cache`

---

## Implementation Details

### Development Phases

**Phase 1: Infrastructure Setup**
- Set up Firebase Cloud Functions project
- Install dependencies: Vercel AI SDK, Anthropic SDK, OpenAI SDK, Pinecone client, Zod
- Set up Pinecone account and index
- Configure environment variables and secrets
- Create Firestore security rules for new AI collections
- Set up rate limiting and usage tracking collections

**Phase 2: Embedding Pipeline**
- Implement `batchEmbedMessages` scheduled Cloud Function
- Implement retry queue and error handling
- Test embedding generation and Pinecone storage
- Backfill embeddings for existing messages (one-time script)
- Monitor embedding costs and performance
- Implement message counter for cache invalidation

**Phase 3: Core AI Features**
- Implement Thread Summarization with caching
- Implement Action Item Extraction with assignee resolution
- Implement Smart Search with hybrid local fallback
- Implement Priority Message Detection (hybrid heuristic + batch)
- Implement Decision Tracking with caching
- Add Zod schema validation for all AI responses
- Add timeout handling for all features

**Phase 4: Frontend Integration**
- Create UI components for all features
- Implement loading states and error handling
- Add feature entry points to existing screens
- Implement mention picker for action item assignees
- Add timeout wrappers for all AI feature calls
- Implement priority downgrade notifications
- Test on iOS and Android

**Phase 5: Testing & Optimization**
- End-to-end testing of all features
- Performance optimization and timeout testing
- Cost analysis and optimization
- Rate limiting validation
- User acceptance testing
- Bug fixes and refinements

### Firebase Cloud Functions Structure

```
functions/
├── src/
│   ├── ai/
│   │   ├── summarization.ts      # Thread summarization logic
│   │   ├── actionItems.ts        # Action item extraction
│   │   ├── search.ts             # Semantic search
│   │   ├── priority.ts           # Priority detection (heuristic + batch)
│   │   ├── decisions.ts          # Decision tracking
│   │   └── embeddings.ts         # Batch embedding generation
│   ├── utils/
│   │   ├── anthropic.ts          # Claude API client
│   │   ├── pinecone.ts           # Pinecone client
│   │   ├── openai.ts             # OpenAI embeddings client
│   │   ├── validation.ts         # Zod schemas for validation
│   │   ├── security.ts           # Permission checks
│   │   ├── rateLimit.ts          # Rate limiting logic
│   │   ├── caching.ts            # Cache invalidation helpers
│   │   ├── priorityHeuristics.ts # Quick priority check (shared)
│   │   └── timeout.ts            # Timeout utilities
│   └── index.ts                  # Function exports
├── package.json
└── tsconfig.json
```

### Environment Variables

```bash
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI API (for embeddings)
OPENAI_API_KEY=sk-...

# Pinecone
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=message-ai-embeddings

# Feature flags
ENABLE_PRIORITY_DETECTION=true
ENABLE_BATCH_EMBEDDING=true
ENABLE_PRIORITY_BATCH_REFINEMENT=true

# Rate limiting
AI_ACTIONS_PER_HOUR_LIMIT=50
AI_ACTIONS_PER_MONTH_LIMIT=1000

# Caching thresholds
SUMMARY_CACHE_MAX_AGE_MS=3600000        # 1 hour
SUMMARY_CACHE_MAX_NEW_MESSAGES=5
ACTION_ITEMS_CACHE_MAX_AGE_MS=86400000  # 24 hours
ACTION_ITEMS_CACHE_MAX_NEW_MESSAGES=10
DECISIONS_CACHE_MAX_AGE_MS=86400000     # 24 hours
DECISIONS_CACHE_MAX_NEW_MESSAGES=10
```

### Cost Estimation

**Per-User Monthly Costs (Assumptions: 500 messages/month):**

| Feature | API Calls | Unit Cost | Monthly Cost |
|---------|-----------|-----------|--------------|
| Message Embeddings | 500 | $0.0001 | $0.05 |
| Thread Summaries (5/month) | 5 | $0.05 | $0.25 |
| Action Items (10/month) | 10 | $0.02 | $0.20 |
| Smart Search (20/month) | 20 | $0.01 | $0.20 |
| Priority Detection (50/month) | 50 | $0.001 | $0.05 |
| Decisions (5/month) | 5 | $0.03 | $0.15 |
| **Total** | | | **$0.90** |

**Pinecone Costs:**
- Starter plan: $70/month (1M vectors, sufficient for initial release)
- Scales with user base

**Firebase Costs:**
- Cloud Functions: Pay-as-you-go (~$10-50/month for initial scale)
- Firestore: Minimal (existing usage + AI metadata)

> **Note**: Costs will scale with usage. Monitor Firebase and Pinecone dashboards for actual costs. Set up billing alerts at $50/month threshold.

---

## Performance Requirements

### Response Time Targets

| Feature | Target | Maximum | Client Timeout |
|---------|--------|---------|----------------|
| Thread Summarization (100 msgs) | 3-5s | 8s | 10s |
| Action Item Extraction | 2-4s | 6s | 8s |
| Smart Search | <800ms | 1.5s | 3s |
| Priority Detection (heuristic) | <10ms | 50ms | N/A |
| Priority Detection (AI batch) | <500ms | 1s | 2s |
| Decision Tracking | 3-4s | 7s | 10s |
| Message Embedding (batch) | <200ms/msg | 500ms/msg | N/A |

**Testing Methodology:**
- **End-to-end measurement:** From user button click to UI update
- **Network assumption:** Good WiFi (10+ Mbps) or LTE/5G
- **Test environment:** Same geographic region as Firebase/Cloud Functions
- **Device:** Physical device (not emulator)
- **Timeout implementation:** Client-side wrapper aborts request if exceeded

### Scalability Targets

- **Concurrent Users:** Support 1,000 concurrent users initially
- **Messages per Second:** Handle 100 messages/second embedding pipeline
- **Search Queries:** Support 50 queries/second
- **API Rate Limits:** Respect Anthropic rate limits (50 requests/minute on starter tier)

### Reliability Targets

- **Uptime:** 99.5% (excluding scheduled maintenance)
- **Error Rate:** <2% for AI feature requests
- **Cache Hit Rate:** >50% for summaries and action items
- **Retry Success Rate:** >90% for failed embeddings (within 5 attempts)
- **Heuristic Accuracy:** >70% for priority detection quick checks

### AI Response Validation & Error Handling

**Structured Output Processing:**

All AI features return JSON that must be validated before storage:

```typescript
import { z } from 'zod';

// Zod schemas for each feature
const SummarySchema = z.object({
  summary: z.string().min(10).max(1000),
  keyPoints: z.array(z.string()).min(3).max(10)
});

const ActionItemSchema = z.object({
  text: z.string(),
  assigneeIdentifier: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['high', 'medium', 'low']),
  sourceMessageId: z.string()
});

const DecisionSchema = z.object({
  decision: z.string(),
  context: z.string(),
  participantIds: z.array(z.string()),
  sourceMessageIds: z.array(z.string()),
  confidence: z.number().min(0).max(1)
});

// Generic parser with validation
function parseAIResponse<T>(
  rawResponse: string,
  schema: z.ZodSchema<T>
): T {
  // 1. Clean response (strip markdown code blocks)
  let json = rawResponse.trim();
  if (json.startsWith('```')) {
    json = json.replace(/^```json?\n/, '').replace(/\n```$/, '');
  }
  
  // 2. Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
  
  // 3. Validate with Zod
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  
  return result.data;
}

// Usage in Cloud Functions
const rawResponse = claudeResponse.content[0].text;
const validatedSummary = parseAIResponse(rawResponse, SummarySchema);
```

**Error Handling Strategy:**

1. **Parsing errors:** Log raw response, return user-friendly error
2. **Validation errors:** Log validation details, return error with specifics
3. **API timeouts:** Retry with exponential backoff (max 3 attempts)
4. **Rate limit errors:** Queue for later processing
5. **Invalid auth:** Return 401, don't retry

### Comprehensive Caching Strategy

**Cache Configuration Table:**

| Feature | Max Age | Max New Messages | Storage Location | Shared? |
|---------|---------|------------------|------------------|---------|
| Thread Summarization | 1 hour (3600000ms) | 5 messages | `/conversations/{id}/ai_summaries/latest` | Yes (per-conversation) |
| Action Items | 24 hours (86400000ms) | 10 messages | `/conversations/{id}/ai_action_items_cache` | Yes (per-conversation) |
| Decisions | 24 hours (86400000ms) | 10 messages | `/conversations/{id}/ai_decisions_cache` | Yes (per-conversation) |
| Priority Detection | N/A (not cached) | N/A | Stored on message doc | N/A |
| Smart Search | N/A (not cached) | N/A | N/A (real-time queries) | N/A |

**Cache Invalidation Logic:**

```typescript
async function getCachedResult<T>(
  conversationId: string,
  cacheDocPath: string,
  maxAge: number,
  maxNewMessages: number
): Promise<T | null> {
  const [cache, conversation] = await Promise.all([
    db.doc(cacheDocPath).get(),
    db.doc(`conversations/${conversationId}`).get()
  ]);
  
  if (!cache.exists) {
    return null;
  }
  
  const cacheData = cache.data();
  const currentMessageCount = conversation.data()?.messageCount || 0;
  const messagesSinceCache = currentMessageCount - cacheData.messageCountAtGeneration;
  const ageMs = Date.now() - cacheData.generatedAt.toMillis();
  
  // Cache is valid if BOTH conditions are met
  if (ageMs < maxAge && messagesSinceCache < maxNewMessages) {
    console.log(`Cache hit: age=${ageMs}ms, newMessages=${messagesSinceCache}`);
    return cacheData as T;
  }
  
  console.log(`Cache miss: age=${ageMs}ms, newMessages=${messagesSinceCache}`);
  return null;
}
```

**Incrementing Message Counter:**

```typescript
// Firestore trigger on message creation
exports.incrementMessageCounter = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      await db.doc(`conversations/${context.params.conversationId}`).update({
        messageCount: admin.firestore.FieldValue.increment(1)
      });
    } catch (error) {
      // If increment fails (rare contention), log but don't fail
      console.warn('Failed to increment message counter:', error);
    }
  });
```

---

## Security & Privacy

### Data Security

**Principle: AI features respect existing conversation permissions**

1. **Authentication Required:** All AI feature requests require valid Firebase Auth token
2. **Authorization Checks:** Verify user is in conversation's `participants` array before processing
3. **Data Isolation:** Users can only access AI features for their own conversations
4. **Embedding Security:** Pinecone queries filtered by `participants` array

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // AI summaries - only conversation participants can access
    match /conversations/{conversationId}/ai_summaries/{summaryId} {
      allow read: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
      allow write: if false;  // Only Cloud Functions can write
    }
    
    // AI action items
    match /conversations/{conversationId}/ai_action_items/{itemId} {
      allow read: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
      
      // Users can mark action items as complete (status, completedAt only)
      allow update: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'completedAt']);
      
      // Only Cloud Functions can create/delete (future: allow manual creation)
      allow create, delete: if false;
    }
    
    // AI decisions
    match /conversations/{conversationId}/ai_decisions/{decisionId} {
      allow read: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
      allow write: if false;  // Only Cloud Functions can write
    }
    
    // Rate limiting & usage tracking
    match /users/{userId}/ai_usage/{month} {
      allow read: if request.auth.uid == userId;
      allow write: if false;  // Only Cloud Functions can write
    }
    
    // Embedding retry queue
    match /embedding_retry_queue/{messageId} {
      allow read, write: if false;  // Only Cloud Functions
    }
  }
}
```

### Rate Limiting Implementation

**Per-User Rate Limits:**
- **Hourly:** 50 AI actions (any feature)
- **Monthly:** 1000 AI actions (any feature)

**Implementation:**

```typescript
async function checkAIRateLimit(userId: string, feature: string): Promise<boolean> {
  const month = new Date().toISOString().slice(0, 7);
  const usageRef = db.doc(`users/${userId}/ai_usage/${month}`);
  
  return await db.runTransaction(async (transaction) => {
    const usageDoc = await transaction.get(usageRef);
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    if (!usageDoc.exists) {
      // First action this month
      transaction.set(usageRef, {
        month,
        totalActions: 1,
        [`${feature}Calls`]: 1,
        actionsThisHour: 1,
        hourStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    }
    
    const data = usageDoc.data();
    
    // Reset hourly counter if hour has elapsed
    const hourlyActions = (data.hourStartedAt?.toMillis() < oneHourAgo) 
      ? 0 
      : data.actionsThisHour || 0;
    
    // Check limits
    const HOURLY_LIMIT = 50;
    const MONTHLY_LIMIT = 1000;
    
    if (hourlyActions >= HOURLY_LIMIT) {
      return false;
    }
    
    if ((data.totalActions || 0) >= MONTHLY_LIMIT) {
      return false;
    }
    
    // Increment counters
    transaction.update(usageRef, {
      totalActions: admin.firestore.FieldValue.increment(1),
      [`${feature}Calls`]: admin.firestore.FieldValue.increment(1),
      actionsThisHour: hourlyActions >= HOURLY_LIMIT || data.hourStartedAt?.toMillis() < oneHourAgo 
        ? 1  // Reset
        : admin.firestore.FieldValue.increment(1),
      hourStartedAt: data.hourStartedAt?.toMillis() < oneHourAgo
        ? admin.firestore.FieldValue.serverTimestamp()
        : data.hourStartedAt,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return true;
  });
}

// Usage in all AI feature Cloud Functions
exports.generateSummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  const allowed = await checkAIRateLimit(context.auth.uid, 'summary');
  if (!allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'You have exceeded your AI usage limit. Please try again later.'
    );
  }
  
  // Proceed with feature...
});
```

### Privacy Considerations

1. **Data Retention:** 
   - AI summaries cached for 1 hour
   - Action items persist until conversation is deleted
   - Embeddings in Pinecone persist for search functionality
   - Users can request data deletion (delete conversation deletes all AI data)
   - Usage tracking persists indefinitely for analytics

2. **Third-Party Data Sharing:**
   - Message content sent to Anthropic for processing (covered by their privacy policy)
   - Embeddings stored in Pinecone (covered by their privacy policy)
   - No data sold to third parties
   - All processing happens server-side (no AI SDKs in mobile app)

3. **Anonymization:**
   - User IDs (UIDs) used for authorization but not sent to AI models
   - Display names sent to AI for context (necessary for accurate summaries)

---

## Testing Strategy

### Unit Testing

**Cloud Functions:**
- Test each AI feature function independently
- Mock Anthropic/OpenAI API responses
- Test error handling and edge cases
- Test security rules and authorization

**Frontend Components:**
- Test loading states
- Test error states
- Test data display
- Test user interactions

### Integration Testing

**End-to-End Flows:**
1. User requests thread summary → Summary generated and displayed
2. Message sent → Embedded → Searchable via Smart Search
3. Action item extracted → Displayed in UI → Marked complete
4. Priority message sent → Detected → Push notification sent
5. Decision made → Tracked → Displayed in timeline

**Performance Testing:**
- Load test embedding pipeline with 100 messages/second
- Load test search with 50 concurrent queries
- Measure response times for all features
- Test with various conversation sizes (10, 100, 1000+ messages)

### User Acceptance Testing

**Test Scenarios:**
1. **Thread Summarization:**
   - Summarize a 50-message work conversation
   - Summarize a 100-message group chat
   - Verify key points accuracy
   - Test with different conversation types (1-on-1, group, work, casual)

2. **Action Item Extraction:**
   - Create conversation with clear action items
   - Create conversation with ambiguous tasks
   - Test assignee and due date extraction
   - Mark items as complete and verify state

3. **Smart Search:**
   - Search for specific message by keyword
   - Search by concept (e.g., "budget discussion")
   - Search across multiple conversations
   - Verify results relevance

4. **Priority Detection:**
   - Send urgent message with "URGENT" keyword
   - Send casual message
   - Verify priority badges appear correctly
   - Test push notification enhancement

5. **Decision Tracking:**
   - Have group conversation with clear decision
   - Verify decision extracted correctly
   - Check decision timeline display
   - Test with multiple decisions

### Quality Metrics

**Accuracy Targets:**
- Thread Summaries: >90% user satisfaction ("accurate and helpful")
- Action Items: >85% precision, >80% recall
- Smart Search: >80% relevance for top result
- Priority Detection: >85% accuracy, <15% false positives
- Decision Tracking: >75% precision

**User Feedback Collection:**
- Thumbs up/down on summaries
- "Report incorrect action item" button
- Search result click-through rate
- Priority badge feedback ("mark as incorrect")
- Decision timeline feedback

---

## Success Metrics

### Primary Metrics

1. **Adoption Rate:**
   - **Target:** 60% of active users try at least one AI feature within first month
   - **Target:** 30% of active users use AI features weekly

2. **Feature Usage:**
   - Thread Summarization: 5+ uses per user per month
   - Smart Search: 20+ searches per user per month
   - Action Items: 70% of action items marked as "helpful"

3. **User Satisfaction:**
   - **Target:** >4.0/5.0 average rating for AI features
   - **Target:** <10% negative feedback rate

4. **Performance:**
   - **Target:** 95% of requests complete within target response times
   - **Target:** <2% error rate

### Secondary Metrics

1. **Cost Efficiency:**
   - **Target:** <$1.00 per user per month for AI features
   - **Target:** >50% cache hit rate for summaries

2. **Engagement Impact:**
   - **Hypothesis:** AI features increase daily active users by 10%
   - **Hypothesis:** Users spend 20% more time in app (reading summaries vs scrolling)

3. **Retention:**
   - **Hypothesis:** Users with AI feature usage have 15% higher 30-day retention

### Data Collection

**Analytics Events:**
```typescript
// Track AI feature usage
analytics.logEvent('ai_feature_used', {
  feature: 'thread_summarization',
  conversationId: string,
  messageCount: number,
  responsetime: number,
  cacheHit: boolean
});

analytics.logEvent('ai_feature_feedback', {
  feature: 'action_items',
  rating: 1-5,
  feedback: string  // optional
});
```

---

## Future Enhancements

### Phase 2: UX Improvements

**Progressive Search Results**
- **Current:** All 10 results appear at once (~800ms)
- **Enhancement:** First result at ~500ms, remaining results load progressively
- **UX Benefit:** Feels 300ms faster, matches user expectations (Google-like)
- **Technical:** Return first result immediately, stream remaining results
- **Priority:** Medium (nice-to-have)

**Why NOT Streaming for Summarization:**
- Marginal UX benefit (users need complete summary to act)
- Possibly worse UX (distracting, hard to skim)
- Users expect to wait for complete summaries

**Manual Action Item Management:**
- Allow users to create action items manually
- Allow users to delete or flag incorrect AI-extracted items
- Add `sourceType: 'manual'` support

### Phase 3: Advanced Features

**Multi-Language Support:**
- Detect message language automatically
- Support summarization and search in 10+ languages
- UI localization for AI feature screens

**Conversation Insights:**
- Analytics dashboard for group chats
- Activity patterns (who talks most, response times)
- Topic trends over time
- Sentiment analysis

**Smart Replies:**
- AI-suggested responses based on conversation context
- Quick reply options for common scenarios
- Context-aware suggestions

**Meeting Coordination:**
- Automatic meeting scheduling from group chat
- Extract meeting times and participants
- Calendar integration
- Meeting agenda generation from discussion

### Phase 4: Integration & Automation

**Voice Message Transcription:**
- Real-time transcription of voice messages
- Make voice content searchable
- Accessibility improvement

**File Analysis:**
- Extract text from images and documents
- Summarize shared files
- Make file contents searchable

**Automated Workflows:**
- "When someone mentions deadline, create calendar event"
- "When action item assigned to me, add to to-do list"
- "When decision made, post summary to specific channel"

**Third-Party Integrations:**
- Slack/Discord export
- Google Calendar sync for action items
- Notion/Trello integration for task management

---

## Appendix

### Glossary

- **RAG (Retrieval-Augmented Generation):** AI technique combining document retrieval with language model generation
- **Embedding:** Numerical vector representation of text for semantic similarity comparison
- **Semantic Search:** Search based on meaning rather than exact keyword matching
- **Vector Database:** Specialized database for storing and querying embeddings
- **Context Window:** Maximum amount of text an AI model can process at once
- **LLM (Large Language Model):** AI model trained on text data (e.g., Claude, GPT)
- **Cloud Function:** Serverless function that runs in response to events
- **Subcollection:** Nested collection within a Firestore document

### References

- **Anthropic Claude Documentation:** https://docs.anthropic.com
- **Vercel AI SDK Documentation:** https://sdk.vercel.ai/docs
- **Pinecone Documentation:** https://docs.pinecone.io
- **Firebase Cloud Functions:** https://firebase.google.com/docs/functions
- **OpenAI Embeddings:** https://platform.openai.com/docs/guides/embeddings

### Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 22, 2025 | Product Team | Initial specification |
| 1.1 | Oct 23, 2025 | Product Team | Updated architecture: batch embeddings, hybrid priority detection, rate limiting, caching strategy, timeout handling, Zod validation |

---

### Client-Side Timeout Implementation

**Timeout Wrapper Utility:**

```typescript
// utils/aiTimeout.ts
export async function callAIFeatureWithTimeout<T>(
  functionName: string,
  data: any,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });
  
  const functionPromise = httpsCallable(functions, functionName)(data);
  
  try {
    const result = await Promise.race([functionPromise, timeoutPromise]);
    return result.data as T;
  } catch (error) {
    if (error.message === 'Request timeout') {
      throw new Error('AI feature is taking longer than expected. Please try again.');
    }
    throw error;
  }
}

// Usage in components
try {
  setSummaryLoading(true);
  const summary = await callAIFeatureWithTimeout(
    'generateSummary',
    { conversationId, messageCount: 100 },
    10000  // 10 second timeout
  );
  setSummary(summary);
} catch (error) {
  showError(error.message);
} finally {
  setSummaryLoading(false);
}
```

---

**Document Status:** ✅ Ready for Implementation  
**Next Steps:** Begin Phase 1 infrastructure setup  

---

*This PRD is a living document and will be updated as requirements evolve and implementation insights are gained.*