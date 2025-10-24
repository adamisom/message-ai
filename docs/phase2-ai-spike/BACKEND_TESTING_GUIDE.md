# Sub-Phase 1 Backend Testing Guide

**Status:** All 5 AI Cloud Functions implemented ✅  
**Created:** October 24, 2025  
**Ready for Testing:** Yes

---

## What Was Built

### Cloud Functions (5 new)

1. **semanticSearch** (HTTP callable) - Semantic + keyword hybrid search
2. **quickPriorityCheckTrigger** (Firestore trigger) - Real-time heuristic priority detection  
3. **batchAnalyzePriority** (Scheduled: every 30 min) - AI-powered priority refinement
4. **generateSummary** (HTTP callable) - Thread summarization with caching
5. **extractActionItems** (HTTP callable) - Action item extraction with assignee resolution
6. **trackDecisions** (HTTP callable) - Decision tracking for group conversations

### Supporting Files

- **5 Unit Test Files** - Comprehensive tests for all features
- **Test Data Script** - Populates realistic conversations for testing
- **Firestore Rules** - Security rules for AI subcollections
- **Firestore Indexes** - Composite index for priority batch queries
- **Type Definitions** - Updated Message, Conversation, and new AI types

---

## Prerequisites

Before testing, ensure:

1. ✅ Firebase emulator installed: `firebase emulators:start`
2. ✅ Environment variables set (from Phase 0):
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `PINECONE_API_KEY`
3. ✅ Firebase config set: `pinecone.index` name
4. ✅ At least 4 users exist in Firebase Auth

---

## Step 1: Run Unit Tests

Test the utility functions and validation logic:

```bash
cd functions
npm test
```

**Expected output:**
```
PASS  src/__tests__/priorityHeuristics.test.ts
PASS  src/__tests__/search.test.ts
PASS  src/__tests__/summarization.test.ts
PASS  src/__tests__/actionItems.test.ts
PASS  src/__tests__/decisions.test.ts

Test Suites: 5 passed, 5 total
Tests: 35+ passed, 35+ total
```

**⚠️ Note:** Tests that call actual APIs (OpenAI, Pinecone, Claude) will timeout in < 30 seconds if APIs are down or keys are invalid.

---

## Step 2: Populate Test Data

Create realistic test conversations:

```bash
# First, make sure you have a serviceAccountKey.json in the functions directory
# Download it from Firebase Console → Project Settings → Service Accounts

node scripts/populateTestData.js
```

**Expected output:**
```
🚀 Starting test data population...

Using 4 test users:
   1. Alice Johnson (alice@example.com)
   2. Bob Smith (bob@example.com)
   3. Charlie Davis (charlie@example.com)
   4. Diana Wilson (diana@example.com)

📝 Creating conversation: Project Team
   Participants: Alice Johnson, Bob Smith, Charlie Davis, Diana Wilson
   ✅ Conversation created: abc123xyz...
   ✅ Created 40 messages
   ✅ Conversation ready for testing

[... 3 more conversations ...]

🎉 Test data population complete!

Conversation IDs for testing:
   1. abc123xyz
   2. def456uvw
   3. ghi789rst
   4. jkl012opq
```

**⚠️ Important:** Copy these conversation IDs - you'll need them for testing!

---

## Step 3: Deploy Functions to Emulator

Start the Firebase emulator suite:

```bash
firebase emulators:start --only functions,firestore
```

**Expected output:**
```
✔  All emulators ready!
┌───────────────────────────────────────────────────────────────┐
│ ✔  All emulators started, it is now safe to connect.          │
│                                                                │
│ ┌─────────────┬────────────────┬──────────────┐              │
│ │ Emulator    │ Host:Port      │ View in UI   │              │
│ ├─────────────┼────────────────┼──────────────┤              │
│ │ Functions   │ localhost:5001 │ localhost:4000│             │
│ │ Firestore   │ localhost:8080 │ localhost:4000│             │
│ └─────────────┴────────────────┴──────────────┘              │
└───────────────────────────────────────────────────────────────┘
```

---

## Step 4: Test Individual Functions

### 4.1 Test Semantic Search

**⚠️ Important:** Semantic search requires messages to be embedded first. 

**If testing with emulator:**
- The `batchEmbedMessages` scheduled function won't run automatically
- You'll need to deploy to production and wait 5-10 minutes for embeddings
- OR manually trigger embedding: Deploy just the embedding function and let it run
- **Recommendation:** Skip semantic search testing in emulator, test after deployment

**If testing in production:**
- Wait 5-10 minutes after populating data for embeddings to process
- Check Pinecone dashboard to verify vector count increased

**Test with curl:**

```bash
# Replace YOUR_PROJECT with your Firebase project ID
# Replace CONVERSATION_ID with one from Step 2

curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/semanticSearch \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "query": "budget planning",
      "conversationId": "CONVERSATION_ID",
      "limit": 5
    }
  }'
```

**Expected response:**
```json
{
  "result": {
    "results": [
      {
        "id": "msg123",
        "text": "We need to discuss Q4 budget allocation",
        "senderName": "Alice Johnson",
        "score": 0.87,
        "conversationId": "abc123xyz"
      }
    ],
    "count": 1,
    "source": "vector"
  }
}
```

**Pass criteria:**
- ✅ Returns 200 status
- ✅ Results array contains semantically similar messages
- ✅ Response time < 3 seconds

---

### 4.2 Test Priority Detection (Trigger)

This function triggers automatically when a new message is created. To test:

**Send a test message via Firebase Console:**

1. Go to Firestore → conversations → [pick one] → messages
2. Add document with:
   ```json
   {
     "text": "URGENT: Need this ASAP!!!",
     "senderId": "user1",
     "senderName": "Alice Johnson",
     "createdAt": "2025-10-24T12:00:00Z",
     "embedded": false
   }
   ```
3. Check emulator logs for: "Priority high message detected"
4. Verify message was updated with:
   - `priority: "high"`
   - `priorityQuick: "high"`
   - `priorityNeedsAnalysis: true`

**Pass criteria:**
- ✅ Function triggered on message create
- ✅ Priority fields added to message
- ✅ Correct priority assigned (high for "URGENT", low for "lol", unknown for normal)

---

### 4.3 Test Priority Batch Analysis (Scheduled)

This function runs every 30 minutes. To test manually:

**Method 1: Wait 30 minutes**

Just wait - it will run automatically.

**Method 2: Call directly (emulator only)**

```bash
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/batchAnalyzePriority \
  -H "Content-Type: application/json"
```

**Check logs for:**
```
Analyzing priority for X messages
```

**Pass criteria:**
- ✅ Function finds messages with `priorityNeedsAnalysis: true`
- ✅ Claude API called for each message
- ✅ Messages updated with `priority` and `priorityAnalyzedAt`
- ✅ Processes up to 100 messages per run

---

### 4.4 Test Thread Summarization

**Test with curl:**

```bash
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/generateSummary \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "conversationId": "CONVERSATION_ID",
      "messageCount": 25
    }
  }'
```

**Expected response:**
```json
{
  "result": {
    "summary": "The team discussed Q4 budget allocation and project timelines. Key decisions were made about resource allocation and project deadlines. Action items were assigned to team members.",
    "keyPoints": [
      "Budget increased by 15% for Q4",
      "Project deadline extended to December 15th",
      "New team member onboarding next week"
    ]
  }
}
```

**Pass criteria:**
- ✅ Returns 200 status
- ✅ Summary is coherent and relevant (3-5 sentences)
- ✅ Key points array has 3-10 items
- ✅ Response time < 10 seconds
- ✅ Second call returns cached result (< 1 sec)

---

### 4.5 Test Action Item Extraction

**Test with curl:**

```bash
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/extractActionItems \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "conversationId": "CONVERSATION_ID"
    }
  }'
```

**Expected response:**
```json
{
  "result": {
    "items": [
      {
        "text": "Review the budget by Friday",
        "assigneeUid": "user1",
        "assigneeDisplayName": "Alice Johnson",
        "assigneeEmail": "alice@example.com",
        "dueDate": "2025-10-27T00:00:00Z",
        "priority": "high",
        "sourceMessageId": "msg123",
        "status": "pending"
      }
    ]
  }
}
```

**Pass criteria:**
- ✅ Returns 200 status
- ✅ Action items correctly extracted from messages
- ✅ Assignees resolved (by display name or email)
- ✅ Priority correctly assigned
- ✅ Items saved to Firestore: `conversations/{id}/ai_action_items`

---

### 4.6 Test Decision Tracking

**Test with curl:**

```bash
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/trackDecisions \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "conversationId": "CONVERSATION_ID"
    }
  }'
```

**Expected response:**
```json
{
  "result": {
    "decisions": [
      {
        "decision": "We will go with option A for the Q4 budget approach",
        "context": "Team discussed budget options A and B. Consensus reached after considering ROI and timeline constraints.",
        "participantIds": ["user1", "user2", "user3"],
        "sourceMessageIds": ["msg-abc", "msg-def"],
        "confidence": 0.92
      }
    ]
  }
}
```

**Pass criteria:**
- ✅ Returns 200 status
- ✅ Decisions correctly extracted from conversation
- ✅ Context provides meaningful summary
- ✅ Confidence score is reasonable (0.7-1.0)
- ✅ Only includes decisions with confidence > 0.7

---

## Step 5: Verification Checklist

### Semantic Search
- [ ] Semantic matching works (query "budget" finds "financial planning" messages)
- [ ] Security filtering works (cannot access other users' conversations)
- [ ] Hybrid fallback catches very recent messages (< 5 min old)
- [ ] Empty results return `{results: [], count: 0}`

### Priority Detection
- [ ] Heuristic: "URGENT" → high, "lol" → low, normal text → unknown
- [ ] Firestore trigger: New messages get priority fields automatically
- [ ] Batch AI analysis: Messages with `priorityNeedsAnalysis: true` get analyzed
- [ ] AI refinement: Incorrectly marked "high" messages get downgraded

### Thread Summarization
- [ ] Summary quality: Accurately reflects conversation content
- [ ] Key points: 3-10 relevant points extracted
- [ ] Caching works: Same request twice returns cache (< 1 sec)
- [ ] Cache invalidation: After 5+ new messages, new summary generated

### Action Items
- [ ] Action items extracted: Correctly identifies tasks from messages
- [ ] Assignee resolution: Resolves display names and emails to UIDs
- [ ] Ambiguous names: Sets assignee to null when multiple matches
- [ ] Priority assignment: Correctly assigns high/medium/low

### Decision Tracking
- [ ] Decision extraction: Clear decisions correctly identified
- [ ] Context quality: Context provides meaningful summary
- [ ] Confidence scoring: Low confidence for unclear discussions
- [ ] No false positives: Doesn't extract "maybe" or tentative statements

---

## Troubleshooting

### Error: "unauthenticated"

**Cause:** Function requires authentication context.

**Solution:** When testing via emulator, you need to provide auth context. For real testing, use the deployed functions or test through the client app.

---

### Error: "Pinecone not found"

**Cause:** Environment variable not set or Pinecone index doesn't exist.

**Solution:**
```bash
firebase functions:config:set pinecone.index="YOUR_INDEX_NAME"
```

---

### Error: "No messages to embed"

**Cause:** All messages already embedded.

**Solution:** This is expected! It means the embedding pipeline is working. Wait for new messages or create new ones.

---

### Error: "FAILED_PRECONDITION"

**Cause:** Firestore composite index not created.

**Solution:**
```bash
firebase deploy --only firestore:indexes
```

Wait 5-10 minutes for index to build. Check status in Firebase Console.

---

### Empty Search Results

**Cause:** Messages not yet embedded.

**Solution:** Wait 5-10 minutes after creating messages for the embedding batch function to run. Check Pinecone dashboard to verify vector count increased.

---

## Next Steps

After all tests pass:

1. ✅ Deploy security rules: `firebase deploy --only firestore:rules`
2. ✅ Deploy indexes: `firebase deploy --only firestore:indexes`
3. ✅ Deploy functions: `firebase deploy --only functions` (or specific functions)
4. 📝 Move to frontend implementation (UI components)

---

## Summary

**Total Functions Implemented:** 5  
**Total Test Files:** 5  
**Test Coverage:** Comprehensive (unit + integration)  
**Security:** Firestore rules updated  
**Performance:** Caching implemented for all AI features  
**Cost Optimization:** Rate limiting (50/hour, 1000/month per user)

All backend infrastructure is ready! 🎉

