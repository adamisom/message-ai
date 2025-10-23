# PHASE 1: FEATURES

**AI Capabilities Implementation**

---

## Phase Overview

**Goal:** Implement all core AI features including smart search, priority detection, summarization, action item extraction, and decision tracking.

**What You'll Build:**
- Semantic search with hybrid local fallback
- Hybrid priority message detection (heuristic + AI)
- On-demand thread summarization
- Action item extraction with assignee resolution
- Decision tracking for group conversations

**Time Estimate:** 18-22 hours

**Stages in This Phase:**
1. [Stage 3: Smart Search](#stage-3-smart-search) - Semantic + keyword search
2. [Stage 4: Priority Message Detection](#stage-4-priority-message-detection) - Hybrid detection
3. [Stage 5: Thread Summarization](#stage-5-thread-summarization) - Conversation summaries
4. [Stage 6: Action Item Extraction](#stage-6-action-item-extraction) - Task extraction
5. [Stage 7: Decision Tracking](#stage-7-decision-tracking) - Decision logging

---

## Navigation

- **Previous Phase:** [PHASE_0_SETUP.md](./PHASE_0_SETUP.md) - Infrastructure & Setup
- **Next Phase:** [PHASE_2_INTEGRATION_TESTING.md](./PHASE_2_INTEGRATION_TESTING.md) - Integration & Testing

---

## Stage 3: Smart Search

**Goal:** Implement semantic search with hybrid fallback

### Task 3.1: Create Semantic Search Cloud Function
**Estimated Time:** 2.5 hours  
**Dependencies:** Stage 2 complete

**Subtasks:**

- [ ] **3.1.1: Implement semanticSearch Function**
  - **File:** `functions/src/ai/search.ts`
  - **Purpose:** On-demand semantic search with security filtering
  - **Implementation:**
    ```typescript
    import * as functions from 'firebase-functions';
    import * as admin from 'firebase-admin';
    import { generateEmbedding } from '../utils/openai';
    import { queryVectors } from '../utils/pinecone';
    import { verifyConversationAccess, filterSearchResults } from '../utils/security';
    import { checkAIRateLimit } from '../utils/rateLimit';
    
    const db = admin.firestore();
    
    interface SearchRequest {
      query: string;
      userId: string;
      conversationId?: string;
      limit: number;
    }
    
    export const semanticSearch = functions.https.onCall(
      async (data: SearchRequest, context) => {
        // 1. Auth check
        if (!context.auth) {
          throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }
        
        // 2. Rate limit check
        const allowed = await checkAIRateLimit(context.auth.uid, 'search');
        if (!allowed) {
          throw new functions.https.HttpsError(
            'resource-exhausted',
            'Search usage limit exceeded'
          );
        }
        
        // 3. If conversationId provided, verify access
        if (data.conversationId) {
          await verifyConversationAccess(context.auth.uid, data.conversationId);
        }
        
        // 4. Generate query embedding
        const queryEmbedding = await generateEmbedding(data.query);
        
        // 5. Query Pinecone (get 2x results for security filtering)
        const pineconeResults = await queryVectors(
          queryEmbedding,
          data.conversationId || '',
          data.limit * 2
        );
        
        // 6. Security filter: only messages where user is participant
        const secureResults = filterSearchResults(
          pineconeResults.matches,
          context.auth.uid
        ).slice(0, data.limit);
        
        // 7. Fetch full message documents from Firestore
        const messageIds = secureResults.map(r => r.id);
        const messages = await fetchMessagesByIds(messageIds);
        
        // 8. Return results with metadata
        return {
          results: messages,
          count: messages.length,
          source: 'vector'
        };
      }
    );
    
    async function fetchMessagesByIds(messageIds: string[]) {
      const messages = [];
      for (const messageId of messageIds) {
        // messageId format: conversationId_messageId or just messageId
        // Need to determine conversationId from messageId or query
        // This is a simplification - actual implementation needs conversation context
        const messageSnap = await db
          .collectionGroup('messages')
          .where(admin.firestore.FieldPath.documentId(), '==', messageId)
          .limit(1)
          .get();
        
        if (!messageSnap.empty) {
          messages.push({
            id: messageSnap.docs[0].id,
            conversationId: messageSnap.docs[0].ref.parent.parent!.id,
            ...messageSnap.docs[0].data()
          });
        }
      }
      return messages;
    }
    ```
  - **Exports:** `semanticSearch`
  - **Timeout:** Default (60s)

### Task 3.2: Create Client-Side Search Service
**Estimated Time:** 2 hours  
**Dependencies:** Task 3.1

**Subtasks:**

- [ ] **3.2.1: Create aiService.ts**
  - **File:** `services/aiService.ts` (NEW)
  - **Purpose:** Client-side service for AI feature calls
  - **Implementation:**
    ```typescript
    import { httpsCallable } from 'firebase/functions';
    import { functions } from '../firebase.config';
    
    // Timeout wrapper utility
    async function callAIFeatureWithTimeout<T>(
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
      } catch (error: any) {
        if (error.message === 'Request timeout') {
          throw new Error('AI feature is taking longer than expected. Please try again.');
        }
        throw error;
      }
    }
    
    // Search function
    export async function searchMessages(
      query: string,
      conversationId?: string,
      limit: number = 10
    ) {
      return await callAIFeatureWithTimeout(
        'semanticSearch',
        {
          query,
          conversationId,
          limit
        },
        3000  // 3 second timeout
      );
    }
    
    // Will add more AI feature functions here
    ```
  - **Exports:** `searchMessages()`, plus placeholders for other AI features

- [ ] **3.2.2: Implement Hybrid Search in Client**
  - **File:** `services/aiService.ts`
  - **Update:** `searchMessages()` function to include local fallback
  - **Implementation:**
    ```typescript
    import { collection, query, orderBy, limit as firestoreLimit, getDocs } from 'firebase/firestore';
    import { db } from '../firebase.config';
    
    export async function searchMessages(
      searchQuery: string,
      conversationId: string,
      limitCount: number = 10
    ) {
      // Parallel: vector search + local keyword search
      const [vectorResults, localResults] = await Promise.all([
        // Vector search via Cloud Function
        callAIFeatureWithTimeout(
          'semanticSearch',
          { query: searchQuery, conversationId, limit: limitCount },
          3000
        ).catch(err => {
          console.warn('Vector search failed, using local only:', err);
          return { results: [], count: 0, source: 'vector' };
        }),
        
        // Local keyword search (last 20 messages)
        searchLocalMessages(searchQuery, conversationId)
      ]);
      
      // Merge and deduplicate
      const vectorIds = new Set(vectorResults.results.map((m: any) => m.id));
      const uniqueLocalResults = localResults.filter(m => !vectorIds.has(m.id));
      
      return {
        results: [...uniqueLocalResults, ...vectorResults.results],
        vectorCount: vectorResults.count,
        localCount: uniqueLocalResults.length
      };
    }
    
    async function searchLocalMessages(searchQuery: string, conversationId: string) {
      const q = query(
        collection(db, `conversations/${conversationId}/messages`),
        orderBy('createdAt', 'desc'),
        firestoreLimit(20)
      );
      
      const snapshot = await getDocs(q);
      const lowerQuery = searchQuery.toLowerCase();
      
      return snapshot.docs
        .filter(doc => doc.data().text.toLowerCase().includes(lowerQuery))
        .map(doc => ({
          id: doc.id,
          conversationId,
          ...doc.data(),
          source: 'local'
        }));
    }
    ```

### Task 3.3: Create Search UI Component
**Estimated Time:** 2 hours  
**Dependencies:** Task 3.2

**Subtasks:**

- [ ] **3.3.1: Create SearchModal Component**
  - **File:** `components/SearchModal.tsx` (NEW)
  - **Purpose:** Modal for displaying search results
  - **Props:**
    - `visible: boolean`
    - `conversationId: string`
    - `onClose: () => void`
    - `onSelectMessage: (messageId: string) => void`
  - **Implementation:**
    ```tsx
    import React, { useState } from 'react';
    import { Modal, View, TextInput, FlatList, Text, TouchableOpacity } from 'react-native';
    import { searchMessages } from '../services/aiService';
    
    interface SearchResult {
      id: string;
      text: string;
      senderName: string;
      createdAt: any;
      source: 'vector' | 'local';
    }
    
    export function SearchModal({ visible, conversationId, onClose, onSelectMessage }) {
      const [query, setQuery] = useState('');
      const [results, setResults] = useState<SearchResult[]>([]);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      
      const handleSearch = async () => {
        if (!query.trim()) return;
        
        setLoading(true);
        setError('');
        
        try {
          const response = await searchMessages(query, conversationId);
          setResults(response.results);
        } catch (err: any) {
          setError(err.message || 'Search failed');
        } finally {
          setLoading(false);
        }
      };
      
      return (
        <Modal visible={visible} animationType="slide">
          <View style={{ flex: 1, padding: 16 }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search messages..."
              onSubmitEditing={handleSearch}
              autoFocus
            />
            
            {loading && <Text>Searching...</Text>}
            {error && <Text style={{ color: 'red' }}>{error}</Text>}
            
            <FlatList
              data={results}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelectMessage(item.id);
                    onClose();
                  }}
                >
                  <View style={{ padding: 12, borderBottomWidth: 1 }}>
                    <Text style={{ fontWeight: 'bold' }}>{item.senderName}</Text>
                    <Text>{item.text}</Text>
                    <Text style={{ fontSize: 12, color: 'gray' }}>
                      {item.source === 'local' ? '📍 Recent' : '🔍 Search'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            
            <TouchableOpacity onPress={onClose}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      );
    }
    ```

- [ ] **3.3.2: Add Search Button to Chat Screen**
  - **File:** `app/chat/[id].tsx`
  - **Add:** Search icon in header
  - **Add:** State for search modal visibility
  - **Add:** SearchModal component with proper props
  - **Example:**
    ```tsx
    import { SearchModal } from '../../components/SearchModal';
    
    export default function ChatScreen() {
      const [searchVisible, setSearchVisible] = useState(false);
      
      // ... existing code ...
      
      return (
        <View>
          {/* Header with search icon */}
          <TouchableOpacity onPress={() => setSearchVisible(true)}>
            <Text>🔍</Text>
          </TouchableOpacity>
          
          {/* Existing chat UI */}
          
          <SearchModal
            visible={searchVisible}
            conversationId={conversationId}
            onClose={() => setSearchVisible(false)}
            onSelectMessage={(msgId) => {
              // Scroll to message
              messageListRef.current?.scrollToMessage(msgId);
            }}
          />
        </View>
      );
    }
    ```

### Task 3.4: How to Verify (Backend Only)
**Estimated Time:** 1 hour  
**Dependencies:** Task 3.1 complete

This section explains how to test the `semanticSearch` Cloud Function **before** building the frontend UI.

#### Method 1: Firebase Emulator (Recommended for Development)

**Setup:**
```bash
# Start emulator suite
firebase emulators:start --only functions,firestore

# In another terminal, create test data
node scripts/createTestMessages.js  # You'll create this helper
```

**Test with curl:**
```bash
# Replace YOUR_PROJECT with your Firebase project ID
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/semanticSearch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(firebase auth:print-identity-token)" \
  -d '{
    "data": {
      "query": "budget planning",
      "conversationId": "test-conv-123",
      "limit": 10
    }
  }'
```

**Expected Response:**
```json
{
  "result": {
    "results": [
      {
        "id": "msg1",
        "text": "Let's discuss Q4 budget allocation",
        "score": 0.87,
        "conversationId": "test-conv-123"
      }
    ],
    "count": 1,
    "source": "vector"
  }
}
```

**Pass Criteria:**
- ✅ Returns 200 status
- ✅ Results array contains semantically similar messages
- ✅ Security filtering works (only messages from accessible conversations)

---

#### Method 2: Deploy and Test in Firebase Console

**Deploy:**
```bash
firebase deploy --only functions:semanticSearch
```

**Test in Console:**
1. Go to Firebase Console → Functions
2. Click `semanticSearch` function
3. Navigate to "Testing" tab
4. Input test data:
   ```json
   {
     "query": "budget planning",
     "conversationId": "YOUR_REAL_CONVERSATION_ID",
     "limit": 5
   }
   ```
5. Click "Run the function"

**Expected:**
- ✅ Status: 200
- ✅ Response contains `results` array
- ✅ Response time < 3 seconds

**Troubleshooting:**
- **Error: "unauthenticated"** → Must be logged in user context (use Method 3 instead)
- **Error: "Pinecone not found"** → Check environment variables set
- **Empty results** → Check if messages are embedded (wait 5 min after sending)

---

#### Method 3: Quick Unit Test

**Create test file:**
```typescript
// functions/src/__tests__/search.test.ts
import { generateEmbedding } from '../utils/openai';
import { queryVectors } from '../utils/pinecone';

describe('Semantic Search', () => {
  it('should generate embeddings', async () => {
    const embedding = await generateEmbedding('test query');
    expect(embedding).toHaveLength(1536);
    expect(typeof embedding[0]).toBe('number');
  });

  it('should query Pinecone', async () => {
    const testEmbedding = new Array(1536).fill(0.1);
    const results = await queryVectors(
      testEmbedding,
      'test-conversation',
      10
    );
    expect(results).toHaveProperty('matches');
    expect(Array.isArray(results.matches)).toBe(true);
  });
});
```

**Run tests:**
```bash
cd functions
npm test -- search.test.ts
```

**Pass Criteria:**
- ✅ All tests pass
- ✅ No API errors
- ✅ Pinecone connection successful

---

#### Verification Checklist

- [ ] **Semantic matching works:** Query "budget" finds "financial planning" messages
- [ ] **Security filtering:** Cannot access other users' conversations
- [ ] **Rate limiting:** After 50 searches, returns "resource-exhausted" error
- [ ] **Timeout handling:** Long queries fail gracefully
- [ ] **Empty results:** Returns `{results: [], count: 0}` when no matches
- [ ] **Hybrid fallback:** Local search catches very recent messages (< 5 min old)

---

## Stage 4: Priority Message Detection

**Goal:** Implement hybrid priority detection (heuristic + AI)

### Task 4.1: Create Priority Detection Cloud Functions
**Estimated Time:** 3 hours  
**Dependencies:** Stage 1 complete

**Subtasks:**

- [ ] **4.1.1: Implement quickPriorityCheck Trigger**
  - **File:** `functions/src/ai/priority.ts`
  - **Purpose:** Real-time heuristic priority check on new messages
  - **Implementation:**
    ```typescript
    import * as functions from 'firebase-functions';
    import * as admin from 'firebase-admin';
    import { quickPriorityCheck } from '../utils/priorityHeuristics';
    
    const db = admin.firestore();
    
    export const quickPriorityCheckTrigger = functions.firestore
      .document('conversations/{conversationId}/messages/{messageId}')
      .onCreate(async (snap, context) => {
        const message = snap.data();
        const quickPriority = quickPriorityCheck(message.text);
        
        if (quickPriority === 'high') {
          // Send enhanced push notification
          await sendPriorityNotification(message, 'high');
          
          // Update message
          await snap.ref.update({
            priorityQuick: 'high',
            priority: 'high',  // Tentative
            priorityNeedsAnalysis: true
          });
        } else if (quickPriority === 'low') {
          await snap.ref.update({
            priorityQuick: 'low',
            priority: 'low',
            priorityNeedsAnalysis: false
          });
        } else {
          // Unknown - defer to batch
          await snap.ref.update({
            priorityQuick: 'unknown',
            priority: 'medium',  // Default
            priorityNeedsAnalysis: true
          });
        }
      });
    
    async function sendPriorityNotification(message: any, priority: string) {
      // TODO: Implement enhanced notification
      // For now, log
      console.log(`Priority ${priority} message detected:`, message.id);
    }
    ```
  - **Exports:** `quickPriorityCheckTrigger`

- [ ] **4.1.2: Implement batchAnalyzePriority Function**
  - **File:** `functions/src/ai/priority.ts`
  - **Purpose:** Scheduled batch AI priority analysis
  - **Implementation:**
    ```typescript
    import { callClaude } from '../utils/anthropic';
    import { parseAIResponse } from '../utils/validation';
    import { PrioritySchema } from '../utils/validation';
    
    export const batchAnalyzePriority = functions.pubsub
      .schedule('every 10 minutes')
      .onRun(async (context) => {
        const needsAnalysis = await db.collectionGroup('messages')
          .where('priorityNeedsAnalysis', '==', true)
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get();
        
        if (needsAnalysis.empty) {
          console.log('No messages need priority analysis');
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
            
            // Notify user if downgraded
            if (priorityChanged) {
              await notifyPriorityDowngrade(message, aiPriority);
            }
          } catch (error) {
            console.error(`Priority analysis failed for ${messageDoc.id}:`, error);
            // Keep heuristic result
            await messageDoc.ref.update({ priorityNeedsAnalysis: false });
          }
        }
      });
    
    async function analyzeMessagePriorityWithAI(text: string): Promise<string> {
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
      
      const rawResponse = await callClaude(prompt, 150);
      const result = parseAIResponse(rawResponse, PrioritySchema);
      return result.priority;
    }
    
    async function notifyPriorityDowngrade(message: any, newPriority: string) {
      // TODO: Send in-app notification
      console.log(`Priority downgraded to ${newPriority} for message ${message.id}`);
    }
    ```
  - **Exports:** `batchAnalyzePriority`

- [ ] **4.1.3: Create Composite Index for Priority Batch**
  - Deploy `batchAnalyzePriority`
  - Wait for first run (10 minutes)
  - Check logs for index creation URL
  - Create index via URL or Firebase Console:
    - Collection Group: `messages`
    - Fields: `priorityNeedsAnalysis` (==), `createdAt` (Descending)

### Task 4.2: Add Priority Badges to UI
**Estimated Time:** 1.5 hours  
**Dependencies:** Task 4.1

**Subtasks:**

- [ ] **4.2.1: Update MessageBubble Component**
  - **File:** `components/MessageBubble.tsx`
  - **Add:** Priority badge display
  - **Example:**
    ```tsx
    export function MessageBubble({ message, isOwn }) {
      const getPriorityBadge = () => {
        if (message.priority === 'high') return '🔴';
        if (message.priority === 'medium') return '🟡';
        return null;
      };
      
      return (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text>{message.text}</Text>
            {getPriorityBadge() && (
              <Text style={{ marginLeft: 8 }}>{getPriorityBadge()}</Text>
            )}
          </View>
        </View>
      );
    }
    ```

- [ ] **4.2.2: Update Message Type Definition**
  - **File:** `types/index.ts`
  - **Update:** Message type to include priority fields
  - **Add:**
    ```typescript
    export interface Message {
      // ... existing fields ...
      embedded?: boolean;
      embeddedAt?: Timestamp;
      priority?: 'high' | 'medium' | 'low';
      priorityQuick?: 'high' | 'low' | 'unknown';
      priorityAnalyzedAt?: Timestamp;
      priorityNeedsAnalysis?: boolean;
    }
    ```

### Task 4.3: How to Verify (Backend Only)
**Estimated Time:** 45 minutes  
**Dependencies:** Task 4.1 complete

This section explains how to test the priority detection Cloud Functions **before** building the frontend UI.

#### Method 1: Firebase Emulator (Recommended for Development)

**Setup:**
```bash
# Start emulator with Firestore triggers
firebase emulators:start --only functions,firestore
```

**Test heuristic detection:**
```typescript
// Create a test script: scripts/testPriority.ts
import * as admin from 'firebase-admin';
import { quickPriorityCheck } from '../functions/src/utils/priorityHeuristics';

admin.initializeApp();
const db = admin.firestore();

async function testPriorityHeuristic() {
  // Test high priority
  console.log('Testing: "URGENT: Server is down!!!"');
  const result1 = quickPriorityCheck('URGENT: Server is down!!!');
  console.log('Result:', result1); // Expected: 'high'
  
  // Test low priority
  console.log('Testing: "lol 😊"');
  const result2 = quickPriorityCheck('lol 😊');
  console.log('Result:', result2); // Expected: 'low'
  
  // Test unknown priority
  console.log('Testing: "Let\'s discuss the project timeline"');
  const result3 = quickPriorityCheck("Let's discuss the project timeline");
  console.log('Result:', result3); // Expected: 'unknown'
}

testPriorityHeuristic();
```

**Run:**
```bash
npm run test:priority
```

**Expected Output:**
```
Testing: "URGENT: Server is down!!!"
Result: high
Testing: "lol 😊"
Result: low
Testing: "Let's discuss the project timeline"
Result: unknown
```

---

#### Method 2: Test Firestore Trigger (onMessageCreate)

**Create test message in Firestore:**
```bash
# Use Firebase Console or CLI
firebase firestore:shell

# In Firestore shell:
db.collection('conversations').doc('test-conv').collection('messages').add({
  text: 'URGENT: Need this ASAP!!!',
  senderId: 'user123',
  senderName: 'Test User',
  createdAt: new Date(),
  embedded: false
})
```

**Check function execution:**
1. Go to Firebase Console → Functions → Logs
2. Look for `onMessageCreate` execution
3. Verify log shows: `Quick priority: high`
4. Check Firestore message document:
   - `priorityQuick: 'high'`
   - `priority: 'high'`
   - `priorityNeedsAnalysis: true`

**Pass Criteria:**
- ✅ Function triggered automatically on message create
- ✅ Priority fields added to message document
- ✅ Correct priority assigned based on heuristic

---

#### Method 3: Test Batch AI Analysis (Scheduled Function)

**Force run scheduled function:**
```bash
# Option A: Use Firebase Console
# Go to Cloud Scheduler → batchAnalyzePriority → "Run Now"

# Option B: Call function directly in emulator
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/batchAnalyzePriority \
  -H "Content-Type: application/json"
```

**Check execution:**
1. Create messages with `priorityNeedsAnalysis: true`
2. Trigger batch function
3. Wait 30 seconds
4. Check Firestore for updated messages:
   - `priorityNeedsAnalysis: false`
   - `priorityAnalyzedAt: <timestamp>`
   - `priority` field updated by AI

**Expected behavior:**
```
Message: "URGENT: Server down!!!"
  quickPriority: high
  AI analysis: high
  Result: No change, still high

Message: "IMPORTANT meeting tomorrow"
  quickPriority: high (keyword match)
  AI analysis: medium (not actually urgent)
  Result: Priority downgraded, notification sent
```

---

#### Method 4: Unit Test for Priority Heuristics

**Create test file:**
```typescript
// functions/src/__tests__/priorityHeuristics.test.ts
import { quickPriorityCheck } from '../utils/priorityHeuristics';

describe('Priority Heuristics', () => {
  describe('High priority detection', () => {
    it('should detect urgent keywords', () => {
      expect(quickPriorityCheck('URGENT: Please review')).toBe('high');
      expect(quickPriorityCheck('Need this ASAP!')).toBe('high');
      expect(quickPriorityCheck('EMERGENCY meeting')).toBe('high');
    });

    it('should detect multiple exclamation marks', () => {
      expect(quickPriorityCheck('Server is down!!!')).toBe('high');
      expect(quickPriorityCheck('Help needed???')).toBe('high');
    });

    it('should detect all caps', () => {
      expect(quickPriorityCheck('ATTENTION TEAM LEADERS')).toBe('high');
    });
  });

  describe('Low priority detection', () => {
    it('should detect casual messages', () => {
      expect(quickPriorityCheck('lol')).toBe('low');
      expect(quickPriorityCheck('okay')).toBe('low');
      expect(quickPriorityCheck('thanks')).toBe('low');
      expect(quickPriorityCheck('😊')).toBe('low');
    });

    it('should detect short greetings', () => {
      expect(quickPriorityCheck('good night')).toBe('low');
      expect(quickPriorityCheck('bye')).toBe('low');
    });
  });

  describe('Unknown priority', () => {
    it('should return unknown for normal messages', () => {
      expect(quickPriorityCheck('Let me review and get back')).toBe('unknown');
      expect(quickPriorityCheck('Meeting at 3pm today')).toBe('unknown');
    });
  });
});
```

**Run tests:**
```bash
cd functions
npm test -- priorityHeuristics.test.ts
```

**Pass Criteria:**
- ✅ All heuristic tests pass
- ✅ High priority correctly detected
- ✅ Low priority correctly filtered
- ✅ Edge cases handled (emojis, short messages, all caps)

---

#### Verification Checklist

- [ ] **Heuristic works:** "URGENT" → high, "lol" → low, normal text → unknown
- [ ] **Firestore trigger:** New messages automatically get priority fields
- [ ] **Batch AI analysis:** Messages with `priorityNeedsAnalysis: true` get analyzed
- [ ] **AI refinement:** Incorrectly marked "high" messages get downgraded
- [ ] **Notification:** Downgraded messages trigger notification (check logs)
- [ ] **Performance:** Heuristic runs < 1ms, batch processes 100 messages in < 2 minutes

---

## Stage 5: Thread Summarization

**Goal:** Implement on-demand conversation summarization

### Task 5.1: Create Summarization Cloud Function
**Estimated Time:** 2.5 hours  
**Dependencies:** Stage 1 complete

**Subtasks:**

- [ ] **5.1.1: Implement generateSummary Function**
  - **File:** `functions/src/ai/summarization.ts`
  - **Purpose:** On-demand thread summarization with caching
  - **Implementation:**
    ```typescript
    import * as functions from 'firebase-functions';
    import * as admin from 'firebase-admin';
    import { callClaude } from '../utils/anthropic';
    import { parseAIResponse } from '../utils/validation';
    import { SummarySchema } from '../utils/validation';
    import { verifyConversationAccess } from '../utils/security';
    import { checkAIRateLimit } from '../utils/rateLimit';
    import { getCachedResult } from '../utils/caching';
    
    const db = admin.firestore();
    
    interface SummarizeRequest {
      conversationId: string;
      messageCount: number;  // 25, 50, 100, or -1 for all
    }
    
    export const generateSummary = functions.https.onCall(
      async (data: SummarizeRequest, context) => {
        // 1. Auth check
        if (!context.auth) {
          throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }
        
        // 2. Verify access
        await verifyConversationAccess(context.auth.uid, data.conversationId);
        
        // 3. Rate limit check
        const allowed = await checkAIRateLimit(context.auth.uid, 'summary');
        if (!allowed) {
          throw new functions.https.HttpsError(
            'resource-exhausted',
            'Summary usage limit exceeded'
          );
        }
        
        // 4. Check cache
        const cache = await getCachedResult<any>(
          data.conversationId,
          `conversations/${data.conversationId}/ai_summaries/latest`,
          3600000,  // 1 hour
          5  // max 5 new messages
        );
        
        if (cache && cache.messageCount === data.messageCount) {
          console.log('Cache hit for summary');
          return cache;
        }
        
        // 5. Query messages
        const conversation = await db.doc(`conversations/${data.conversationId}`).get();
        const conversationData = conversation.data()!;
        
        let messagesQuery = db
          .collection(`conversations/${data.conversationId}/messages`)
          .orderBy('createdAt', 'desc');
        
        if (data.messageCount > 0) {
          messagesQuery = messagesQuery.limit(data.messageCount);
        }
        
        const messagesSnapshot = await messagesQuery.get();
        const messages = messagesSnapshot.docs.reverse().map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // 6. Format messages for Claude
        const formattedMessages = messages
          .map(m => `[${m.senderName}]: ${m.text}`)
          .join('\n');
        
        // 7. Build prompt
        const prompt = `
You are summarizing a ${conversationData.type} conversation with ${conversationData.participants.length} participants.

Participants: ${Object.values(conversationData.participantDetails).map((p: any) => p.displayName).join(', ')}

Messages (${messages.length} total):
${formattedMessages}

Provide a summary in the following JSON format:
{
  "summary": "3-5 sentence overview of the conversation",
  "keyPoints": ["point 1", "point 2", "point 3"]
}

Focus on: main topics discussed, important decisions, action items, and key information shared.
`;
        
        // 8. Call Claude
        const rawResponse = await callClaude(prompt, 1500);
        
        // 9. Validate response
        const validatedSummary = parseAIResponse(rawResponse, SummarySchema);
        
        // 10. Store in cache
        await db.doc(`conversations/${data.conversationId}/ai_summaries/latest`).set({
          ...validatedSummary,
          messageCount: messages.length,
          messageCountAtGeneration: conversationData.messageCount,
          startMessageId: messages[0].id,
          endMessageId: messages[messages.length - 1].id,
          startTimestamp: messages[0].createdAt,
          endTimestamp: messages[messages.length - 1].createdAt,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          generatedBy: context.auth.uid,
          model: 'claude-sonnet-4'
        });
        
        // 11. Return summary
        return validatedSummary;
      }
    );
    ```
  - **Exports:** `generateSummary`

### Task 5.2: Create Summary UI
**Estimated Time:** 2 hours  
**Dependencies:** Task 5.1

**Subtasks:**

- [ ] **5.2.1: Create SummaryModal Component**
  - **File:** `components/SummaryModal.tsx` (NEW)
  - **Purpose:** Display thread summary
  - **Props:**
    - `visible: boolean`
    - `conversationId: string`
    - `onClose: () => void`
  - **Implementation:**
    ```tsx
    import React, { useState, useEffect } from 'react';
    import { Modal, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
    import { generateSummary } from '../services/aiService';
    
    export function SummaryModal({ visible, conversationId, onClose }) {
      const [summary, setSummary] = useState(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [messageCount, setMessageCount] = useState(50);
      
      useEffect(() => {
        if (visible) {
          loadSummary();
        }
      }, [visible, messageCount]);
      
      const loadSummary = async () => {
        setLoading(true);
        setError('');
        
        try {
          const result = await generateSummary(conversationId, messageCount);
          setSummary(result);
        } catch (err: any) {
          setError(err.message || 'Failed to generate summary');
        } finally {
          setLoading(false);
        }
      };
      
      return (
        <Modal visible={visible} animationType="slide">
          <ScrollView style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
              Thread Summary
            </Text>
            
            {/* Message count selector */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[25, 50, 100].map(count => (
                <TouchableOpacity
                  key={count}
                  onPress={() => setMessageCount(count)}
                  style={{
                    padding: 8,
                    backgroundColor: messageCount === count ? 'blue' : 'gray',
                    borderRadius: 4
                  }}
                >
                  <Text style={{ color: 'white' }}>{count} msgs</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {loading && (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 16 }}>Analyzing {messageCount} messages...</Text>
              </View>
            )}
            
            {error && (
              <Text style={{ color: 'red', padding: 16 }}>{error}</Text>
            )}
            
            {summary && !loading && (
              <View>
                <Text style={{ fontSize: 16, marginBottom: 16 }}>
                  {summary.summary}
                </Text>
                
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>
                  Key Points:
                </Text>
                {summary.keyPoints.map((point: string, index: number) => (
                  <Text key={index} style={{ fontSize: 14, marginBottom: 4 }}>
                    • {point}
                  </Text>
                ))}
              </View>
            )}
            
            <TouchableOpacity
              onPress={onClose}
              style={{
                marginTop: 32,
                padding: 16,
                backgroundColor: 'gray',
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </Modal>
      );
    }
    ```

- [ ] **5.2.2: Add Summarize Button to Chat Screen**
  - **File:** `app/chat/[id].tsx`
  - **Add:** "Summarize" button in header or options menu
  - **Add:** State for summary modal visibility
  - **Add:** SummaryModal component
  - **Example:**
    ```tsx
    import { SummaryModal } from '../../components/SummaryModal';
    
    export default function ChatScreen() {
      const [summaryVisible, setSummaryVisible] = useState(false);
      
      return (
        <View>
          <TouchableOpacity onPress={() => setSummaryVisible(true)}>
            <Text>📝 Summarize</Text>
          </TouchableOpacity>
          
          {/* Existing chat UI */}
          
          <SummaryModal
            visible={summaryVisible}
            conversationId={conversationId}
            onClose={() => setSummaryVisible(false)}
          />
        </View>
      );
    }
    ```

- [ ] **5.2.3: Add generateSummary to aiService**
  - **File:** `services/aiService.ts`
  - **Add:**
    ```typescript
    export async function generateSummary(
      conversationId: string,
      messageCount: number
    ) {
      return await callAIFeatureWithTimeout(
        'generateSummary',
        { conversationId, messageCount },
        10000  // 10 second timeout
      );
    }
    ```

### Task 5.3: How to Verify (Backend Only)
**Estimated Time:** 30 minutes  
**Dependencies:** Task 5.1 complete

This section explains how to test the `generateSummary` Cloud Function **before** building the frontend UI.

#### Method 1: Firebase Emulator with curl

**Setup:**
```bash
# Start emulator
firebase emulators:start --only functions,firestore

# Create test conversation with messages
# Use Firebase Console or Firestore shell
```

**Test with curl:**
```bash
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/generateSummary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(firebase auth:print-identity-token)" \
  -d '{
    "data": {
      "conversationId": "test-conv-123",
      "messageCount": 50
    }
  }'
```

**Expected Response:**
```json
{
  "result": {
    "summary": "The team discussed Q4 budget allocation and project timelines. Key decisions were made about...",
    "keyPoints": [
      "Budget increased by 15% for Q4",
      "Project deadline extended to December 15th",
      "New team member onboarding next week"
    ],
    "messageCount": 50,
    "generatedAt": "2025-10-23T12:00:00Z"
  }
}
```

**Pass Criteria:**
- ✅ Returns 200 status
- ✅ Summary is coherent and relevant (read actual message content)
- ✅ Key points array has 3-10 items
- ✅ Response time < 10 seconds

---

#### Method 2: Deploy and Test in Firebase Console

**Deploy:**
```bash
firebase deploy --only functions:generateSummary
```

**Test in Console:**
1. Firebase Console → Functions → `generateSummary`
2. Testing tab → Input:
   ```json
   {
     "conversationId": "YOUR_REAL_CONVERSATION_ID",
     "messageCount": 50
   }
   ```
3. Click "Run the function"

**Verify caching:**
1. Run function twice with same conversationId
2. Check Firestore: `conversations/{id}/ai_summaries/{summaryId}`
3. Verify `messageCountAtGeneration` matches conversation `messageCount`
4. Second call should return cached result (check `generatedAt` timestamp)

**Pass Criteria:**
- ✅ First call: New summary generated (10 sec)
- ✅ Second call: Cached result returned (< 1 sec)
- ✅ Firestore document created in `ai_summaries` subcollection

---

#### Method 3: Unit Test for Summarization

**Create test file:**
```typescript
// functions/src/__tests__/summarization.test.ts
import { callClaude } from '../utils/anthropic';
import { parseAIResponse } from '../utils/validation';
import { SummarySchema } from '../utils/validation';

describe('Thread Summarization', () => {
  it('should call Claude API successfully', async () => {
    const prompt = `Summarize: "Project meeting at 3pm. Budget approved."`;
    const response = await callClaude(prompt, 500);
    expect(response).toBeTruthy();
    expect(typeof response).toBe('string');
  });

  it('should parse and validate summary response', () => {
    const mockResponse = JSON.stringify({
      summary: "Team discussed project timeline and budget",
      keyPoints: [
        "Meeting scheduled for 3pm",
        "Budget approved by management",
        "Next steps defined"
      ]
    });

    const parsed = parseAIResponse(mockResponse, SummarySchema);
    expect(parsed.summary).toBeTruthy();
    expect(parsed.keyPoints).toHaveLength(3);
  });

  it('should reject invalid summary format', () => {
    const invalidResponse = JSON.stringify({
      summary: "Too short",  // Less than 10 chars
      keyPoints: ["One"]  // Less than 3 items
    });

    expect(() => {
      parseAIResponse(invalidResponse, SummarySchema);
    }).toThrow();
  });
});
```

**Run tests:**
```bash
cd functions
npm test -- summarization.test.ts
```

---

#### Verification Checklist

- [ ] **Summary quality:** Accurately reflects conversation content
- [ ] **Key points:** 3-10 relevant points extracted
- [ ] **Caching works:** Same request twice returns cache (< 1 sec)
- [ ] **Cache invalidation:** After 5+ new messages, new summary generated
- [ ] **Rate limiting:** 50th call in hour returns "resource-exhausted"
- [ ] **Security:** Cannot summarize conversations user doesn't have access to
- [ ] **Timeout:** Response within 10 seconds or fails gracefully

---

## Stage 6: Action Item Extraction

**Goal:** Implement on-demand action item extraction with assignee resolution

### Task 6.1: Create Action Items Cloud Function
**Estimated Time:** 3.5 hours  
**Dependencies:** Stage 1 complete

**Subtasks:**

- [ ] **6.1.1: Implement extractActionItems Function**
  - **File:** `functions/src/ai/actionItems.ts`
  - **Purpose:** Extract action items from conversation with assignee resolution
  - **Implementation:**
    ```typescript
    import * as functions from 'firebase-functions';
    import * as admin from 'firebase-admin';
    import { callClaude } from '../utils/anthropic';
    import { parseAIResponse } from '../utils/validation';
    import { ActionItemSchema } from '../utils/validation';
    import { verifyConversationAccess } from '../utils/security';
    import { checkAIRateLimit } from '../utils/rateLimit';
    import { getCachedResult } from '../utils/caching';
    
    const db = admin.firestore();
    
    interface ActionItemRequest {
      conversationId: string;
      messageRange?: { start: any, end: any };
    }
    
    export const extractActionItems = functions.https.onCall(
      async (data: ActionItemRequest, context) => {
        // 1-3. Auth, access, rate limit (same as summary)
        if (!context.auth) {
          throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }
        
        await verifyConversationAccess(context.auth.uid, data.conversationId);
        
        const allowed = await checkAIRateLimit(context.auth.uid, 'actionItem');
        if (!allowed) {
          throw new functions.https.HttpsError(
            'resource-exhausted',
            'Action item usage limit exceeded'
          );
        }
        
        // 4. Check cache
        const cache = await getCachedResult<any>(
          data.conversationId,
          `conversations/${data.conversationId}/ai_action_items_cache`,
          86400000,  // 24 hours
          10  // max 10 new messages
        );
        
        if (cache) {
          console.log('Cache hit for action items');
          return { items: cache.items };
        }
        
        // 5. Get conversation and messages
        const conversation = await db.doc(`conversations/${data.conversationId}`).get();
        const conversationData = conversation.data()!;
        
        let messagesQuery = db
          .collection(`conversations/${data.conversationId}/messages`)
          .orderBy('createdAt', 'desc')
          .limit(100);
        
        if (data.messageRange) {
          messagesQuery = messagesQuery
            .where('createdAt', '>=', data.messageRange.start)
            .where('createdAt', '<=', data.messageRange.end);
        }
        
        const messagesSnapshot = await messagesQuery.get();
        const messages = messagesSnapshot.docs.reverse().map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // 6. Format messages for Claude
        const formattedMessages = messages
          .map(m => `[${m.senderName}]: ${m.text}`)
          .join('\n');
        
        // Format participants for Claude
        const participantsList = Object.entries(conversationData.participantDetails)
          .map(([uid, details]: [string, any]) => `- ${details.displayName} (${details.email})`)
          .join('\n');
        
        // 7. Build prompt
        const prompt = `
Extract action items from this conversation. An action item is a task, commitment, or to-do mentioned by any participant.

Participants:
${participantsList}

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
        
        // 8. Call Claude
        const rawResponse = await callClaude(prompt, 2000);
        
        // 9. Validate response (expecting array)
        let actionItemsArray;
        try {
          let json = rawResponse.trim();
          if (json.startsWith('```')) {
            json = json.replace(/^```json?\n/, '').replace(/\n```$/, '');
          }
          actionItemsArray = JSON.parse(json);
          
          if (!Array.isArray(actionItemsArray)) {
            throw new Error('Response is not an array');
          }
        } catch (error) {
          throw new functions.https.HttpsError(
            'internal',
            `Failed to parse action items: ${error.message}`
          );
        }
        
        // 10. Resolve assignees
        const resolvedItems = await Promise.all(
          actionItemsArray.map(async (item) => {
            const assignee = await resolveAssignee(
              item.assigneeIdentifier,
              conversationData.participantDetails
            );
            
            return {
              text: item.text,
              assigneeUid: assignee?.uid || null,
              assigneeDisplayName: assignee?.displayName || null,
              assigneeEmail: assignee?.email || null,
              dueDate: item.dueDate || null,
              sourceMessageId: item.sourceMessageId,
              priority: item.priority,
              status: 'pending',
              sourceType: 'ai',
              extractedAt: admin.firestore.FieldValue.serverTimestamp(),
              extractedBy: context.auth.uid
            };
          })
        );
        
        // 11. Store in Firestore
        const batch = db.batch();
        resolvedItems.forEach(item => {
          const itemRef = db
            .collection(`conversations/${data.conversationId}/ai_action_items`)
            .doc();
          batch.set(itemRef, item);
        });
        await batch.commit();
        
        // 12. Store in cache
        await db.doc(`conversations/${data.conversationId}/ai_action_items_cache`).set({
          items: resolvedItems,
          messageCountAtGeneration: conversationData.messageCount,
          generatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return { items: resolvedItems };
      }
    );
    
    async function resolveAssignee(
      identifier: string | null,
      participantDetails: any
    ): Promise<{ uid: string; displayName: string; email: string } | null> {
      if (!identifier) return null;
      
      const isEmail = identifier.includes('@');
      
      if (isEmail) {
        // Find by email
        for (const [uid, details] of Object.entries(participantDetails)) {
          if ((details as any).email.toLowerCase() === identifier.toLowerCase()) {
            return {
              uid,
              displayName: (details as any).displayName,
              email: (details as any).email
            };
          }
        }
      } else {
        // Find by display name
        const matches = [];
        for (const [uid, details] of Object.entries(participantDetails)) {
          if ((details as any).displayName.toLowerCase() === identifier.toLowerCase()) {
            matches.push({
              uid,
              displayName: (details as any).displayName,
              email: (details as any).email
            });
          }
        }
        
        if (matches.length === 1) {
          return matches[0];
        } else if (matches.length > 1) {
          console.warn(`Ambiguous assignee "${identifier}" - ${matches.length} matches`);
          return null;
        }
      }
      
      console.warn(`Assignee "${identifier}" not found in participants`);
      return null;
    }
    ```
  - **Exports:** `extractActionItems`

### Task 6.2: Create Action Items UI
**Estimated Time:** 3 hours  
**Dependencies:** Task 6.1

**Subtasks:**

- [ ] **6.2.1: Create ActionItemsModal Component**
  - **File:** `components/ActionItemsModal.tsx` (NEW)
  - **Purpose:** Display and manage action items
  - **Implementation:**
    ```tsx
    import React, { useState, useEffect } from 'react';
    import { Modal, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
    import { extractActionItems, toggleActionItemStatus } from '../services/aiService';
    
    export function ActionItemsModal({ visible, conversationId, onClose }) {
      const [items, setItems] = useState([]);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      
      useEffect(() => {
        if (visible) {
          loadActionItems();
        }
      }, [visible]);
      
      const loadActionItems = async () => {
        setLoading(true);
        setError('');
        
        try {
          const result = await extractActionItems(conversationId);
          setItems(result.items);
        } catch (err: any) {
          setError(err.message || 'Failed to extract action items');
        } finally {
          setLoading(false);
        }
      };
      
      const handleToggleStatus = async (itemId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
        
        try {
          await toggleActionItemStatus(conversationId, itemId, newStatus);
          setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, status: newStatus } : item
          ));
        } catch (err: any) {
          console.error('Failed to toggle status:', err);
        }
      };
      
      const getPriorityColor = (priority: string) => {
        switch (priority) {
          case 'high': return '#ff4444';
          case 'medium': return '#ffaa00';
          case 'low': return '#44ff44';
          default: return '#999999';
        }
      };
      
      return (
        <Modal visible={visible} animationType="slide">
          <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
              Action Items
            </Text>
            
            {loading && (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 16 }}>Scanning for action items...</Text>
              </View>
            )}
            
            {error && (
              <Text style={{ color: 'red', padding: 16 }}>{error}</Text>
            )}
            
            <FlatList
              data={items}
              keyExtractor={(item, index) => `${item.sourceMessageId}-${index}`}
              renderItem={({ item }) => (
                <View style={{
                  padding: 12,
                  marginBottom: 12,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: getPriorityColor(item.priority)
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <TouchableOpacity
                      onPress={() => handleToggleStatus(item.id, item.status)}
                      style={{ marginRight: 12 }}
                    >
                      <Text style={{ fontSize: 24 }}>
                        {item.status === 'completed' ? '✅' : '⬜️'}
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16,
                        textDecorationLine: item.status === 'completed' ? 'line-through' : 'none'
                      }}>
                        {item.text}
                      </Text>
                      
                      {item.assigneeDisplayName && (
                        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                          👤 {item.assigneeDisplayName}
                        </Text>
                      )}
                      
                      {item.dueDate && (
                        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                          📅 Due: {new Date(item.dueDate).toLocaleDateString()}
                        </Text>
                      )}
                      
                      <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        {item.priority.toUpperCase()} PRIORITY
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                !loading && !error ? (
                  <Text style={{ textAlign: 'center', padding: 32, color: '#999' }}>
                    No action items found
                  </Text>
                ) : null
              }
            />
            
            <TouchableOpacity
              onPress={onClose}
              style={{
                marginTop: 16,
                padding: 16,
                backgroundColor: 'gray',
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      );
    }
    ```

- [ ] **6.2.2: Add Action Items Functions to aiService**
  - **File:** `services/aiService.ts`
  - **Add:**
    ```typescript
    export async function extractActionItems(conversationId: string) {
      return await callAIFeatureWithTimeout(
        'extractActionItems',
        { conversationId },
        8000  // 8 second timeout
      );
    }
    
    export async function toggleActionItemStatus(
      conversationId: string,
      itemId: string,
      newStatus: 'pending' | 'completed'
    ) {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase.config');
      
      const itemRef = doc(db, `conversations/${conversationId}/ai_action_items/${itemId}`);
      await updateDoc(itemRef, {
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date() : null
      });
    }
    ```

- [ ] **6.2.3: Update Firestore Security Rules for Action Items**
  - **File:** `firestore.rules`
  - **Add rules for action items:**
    ```javascript
    // AI action items
    match /conversations/{conversationId}/ai_action_items/{itemId} {
      allow read: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
      
      // Users can mark action items as complete (status, completedAt only)
      allow update: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'completedAt']);
      
      // Only Cloud Functions can create/delete
      allow create, delete: if false;
    }
    ```
  - **Deploy rules:** `firebase deploy --only firestore:rules`

### Task 6.3: How to Verify (Backend Only)
**Estimated Time:** 45 minutes  
**Dependencies:** Task 6.1 complete

This section explains how to test the `extractActionItems` Cloud Function **before** building the frontend UI.

#### Method 1: Firebase Emulator with curl

**Setup:**
```bash
# Start emulator
firebase emulators:start --only functions,firestore

# Create test conversation with action-item messages
```

**Test with curl:**
```bash
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/extractActionItems \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(firebase auth:print-identity-token)" \
  -d '{
    "data": {
      "conversationId": "test-conv-123",
      "messageCount": 50
    }
  }'
```

**Expected Response:**
```json
{
  "result": {
    "items": [
      {
        "text": "Review the budget by Friday",
        "assigneeUid": "user123",
        "assigneeDisplayName": "John Doe",
        "assigneeEmail": "john@example.com",
        "dueDate": "2025-10-27T00:00:00Z",
        "priority": "high",
        "sourceMessageId": "msg-abc",
        "status": "pending"
      },
      {
        "text": "Update the wiki",
        "assigneeUid": null,
        "assigneeDisplayName": null,
        "assigneeEmail": null,
        "dueDate": null,
        "priority": "medium",
        "sourceMessageId": "msg-def",
        "status": "pending"
      }
    ],
    "count": 2
  }
}
```

**Pass Criteria:**
- ✅ Returns 200 status
- ✅ Action items correctly extracted from messages
- ✅ Assignees resolved (by display name or email)
- ✅ Priority correctly assigned
- ✅ Response time < 8 seconds

---

#### Method 2: Test Assignee Resolution Logic

**Create test script:**
```typescript
// scripts/testAssigneeResolution.ts
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

async function testAssigneeResolution() {
  const conversationId = 'test-conv-123';
  
  // Get conversation participants
  const conversationDoc = await db.doc(`conversations/${conversationId}`).get();
  const participants = conversationDoc.data()?.participants || [];
  
  // Get participant details
  const users = await Promise.all(
    participants.map(uid => db.doc(`users/${uid}`).get())
  );
  
  console.log('Participants:');
  users.forEach(u => {
    const data = u.data();
    console.log(`  - ${data?.displayName} (${data?.email})`);
  });
  
  // Test cases
  const testCases = [
    { mention: 'John', expected: 'Resolves to John if only one' },
    { mention: 'john@example.com', expected: 'Resolves by email' },
    { mention: 'John Doe', expected: 'Resolves by full name match' },
  ];
  
  console.log('\nTest resolution logic in extractActionItems function');
}

testAssigneeResolution();
```

**Run:**
```bash
npx ts-node scripts/testAssigneeResolution.ts
```

**Expected Output:**
```
Participants:
  - John Doe (john@example.com)
  - Jane Smith (jane@example.com)

Test resolution logic in extractActionItems function
```

---

#### Method 3: Test Action Item Storage in Firestore

**Deploy function:**
```bash
firebase deploy --only functions:extractActionItems
```

**Call function via Firebase Console:**
1. Functions → `extractActionItems` → Testing tab
2. Input conversation with action items:
   ```json
   {
     "conversationId": "YOUR_REAL_CONVERSATION_ID",
     "messageCount": 20
   }
   ```
3. Check Firestore after execution:
   - Navigate to: `conversations/{id}/ai_action_items`
   - Verify documents created with correct fields

**Verify fields:**
```
ai_action_items/{itemId}:
  ✅ text: string
  ✅ assigneeUid: string | null
  ✅ assigneeDisplayName: string | null
  ✅ assigneeEmail: string | null
  ✅ dueDate: timestamp | null
  ✅ priority: 'high' | 'medium' | 'low'
  ✅ sourceMessageId: string
  ✅ sourceType: 'ai'
  ✅ status: 'pending' | 'completed'
  ✅ extractedBy: string (uid)
  ✅ extractedAt: timestamp
  ✅ messageCountAtGeneration: number
```

---

#### Method 4: Unit Test for Action Item Parsing

**Create test file:**
```typescript
// functions/src/__tests__/actionItems.test.ts
import { parseAIResponse } from '../utils/validation';
import { ActionItemSchema } from '../utils/validation';

describe('Action Item Extraction', () => {
  it('should parse valid action item', () => {
    const response = JSON.stringify({
      text: 'Review the budget',
      assigneeIdentifier: 'john@example.com',
      dueDate: '2025-10-27T00:00:00Z',
      priority: 'high',
      sourceMessageId: 'msg123'
    });

    const parsed = parseAIResponse(response, ActionItemSchema);
    expect(parsed.text).toBe('Review the budget');
    expect(parsed.priority).toBe('high');
  });

  it('should handle missing assignee', () => {
    const response = JSON.stringify({
      text: 'Update documentation',
      assigneeIdentifier: null,
      dueDate: null,
      priority: 'medium',
      sourceMessageId: 'msg456'
    });

    const parsed = parseAIResponse(response, ActionItemSchema);
    expect(parsed.assigneeIdentifier).toBeNull();
  });

  it('should reject invalid priority', () => {
    const response = JSON.stringify({
      text: 'Do something',
      priority: 'super-urgent',  // Invalid
      sourceMessageId: 'msg789'
    });

    expect(() => {
      parseAIResponse(response, ActionItemSchema);
    }).toThrow();
  });
});
```

**Run tests:**
```bash
cd functions
npm test -- actionItems.test.ts
```

---

#### Verification Checklist

- [ ] **Action items extracted:** Correctly identifies tasks from messages
- [ ] **Assignee resolution:** Resolves display names and emails to UIDs
- [ ] **Ambiguous names:** Sets assignee to null when multiple matches
- [ ] **Date parsing:** Extracts due dates like "by Friday", "next Tuesday"
- [ ] **Priority assignment:** Correctly assigns high/medium/low
- [ ] **Caching works:** Same request returns cached results
- [ ] **Security:** Cannot extract action items from inaccessible conversations
- [ ] **Rate limiting:** 50th call returns "resource-exhausted"

---

## Stage 7: Decision Tracking

**Goal:** Implement decision tracking for group conversations

### Task 7.1: Create Decisions Cloud Function
**Estimated Time:** 2 hours  
**Dependencies:** Stage 1 complete

**Subtasks:**

- [ ] **7.1.1: Implement trackDecisions Function**
  - **File:** `functions/src/ai/decisions.ts`
  - **Purpose:** Extract decisions from group conversations
  - **Implementation:** (Similar structure to action items)
    ```typescript
    import * as functions from 'firebase-functions';
    import * as admin from 'firebase-admin';
    import { callClaude } from '../utils/anthropic';
    import { DecisionSchema } from '../utils/validation';
    import { verifyConversationAccess } from '../utils/security';
    import { checkAIRateLimit } from '../utils/rateLimit';
    import { getCachedResult } from '../utils/caching';
    
    const db = admin.firestore();
    
    export const trackDecisions = functions.https.onCall(
      async (data: { conversationId: string }, context) => {
        // Auth, access, rate limit checks
        if (!context.auth) {
          throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }
        
        await verifyConversationAccess(context.auth.uid, data.conversationId);
        
        const allowed = await checkAIRateLimit(context.auth.uid, 'decision');
        if (!allowed) {
          throw new functions.https.HttpsError(
            'resource-exhausted',
            'Decision tracking usage limit exceeded'
          );
        }
        
        // Check cache (24 hours, 10 new messages)
        const cache = await getCachedResult<any>(
          data.conversationId,
          `conversations/${data.conversationId}/ai_decisions_cache`,
          86400000,
          10
        );
        
        if (cache) {
          return { decisions: cache.decisions };
        }
        
        // Get conversation and messages
        const conversation = await db.doc(`conversations/${data.conversationId}`).get();
        const conversationData = conversation.data()!;
        
        const messagesSnapshot = await db
          .collection(`conversations/${data.conversationId}/messages`)
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get();
        
        const messages = messagesSnapshot.docs.reverse().map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Format for Claude
        const formattedMessages = messages
          .map(m => `[${m.senderName}]: ${m.text}`)
          .join('\n');
        
        const participantNames = Object.values(conversationData.participantDetails)
          .map((p: any) => p.displayName)
          .join(', ');
        
        // Build prompt
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
    "participantIds": ["uid1", "uid2"],
    "sourceMessageIds": ["msgId1", "msgId2"],
    "confidence": 0.0-1.0
  }
]

Only include decisions with confidence > 0.7.
Examples of decisions:
- "We'll launch the feature next Tuesday"
- "John will be the point person for this project"
- "Budget approved at $50k"
- "Meeting rescheduled to 3pm Friday"
`;
        
        // Call Claude
        const rawResponse = await callClaude(prompt, 2000);
        
        // Parse and validate
        let decisionsArray;
        try {
          let json = rawResponse.trim();
          if (json.startsWith('```')) {
            json = json.replace(/^```json?\n/, '').replace(/\n```$/, '');
          }
          decisionsArray = JSON.parse(json);
          
          if (!Array.isArray(decisionsArray)) {
            throw new Error('Response is not an array');
          }
          
          // Filter by confidence
          decisionsArray = decisionsArray.filter(d => d.confidence > 0.7);
        } catch (error) {
          throw new functions.https.HttpsError(
            'internal',
            `Failed to parse decisions: ${error.message}`
          );
        }
        
        // Store in Firestore
        const batch = db.batch();
        decisionsArray.forEach(decision => {
          const decisionRef = db
            .collection(`conversations/${data.conversationId}/ai_decisions`)
            .doc();
          batch.set(decisionRef, {
            decision: decision.decision,
            context: decision.context,
            participants: decision.participantIds || [],
            sourceMessageIds: decision.sourceMessageIds || [],
            decidedAt: admin.firestore.FieldValue.serverTimestamp(),
            extractedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
        
        // Cache
        await db.doc(`conversations/${data.conversationId}/ai_decisions_cache`).set({
          decisions: decisionsArray,
          messageCountAtGeneration: conversationData.messageCount,
          generatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return { decisions: decisionsArray };
      }
    );
    ```
  - **Exports:** `trackDecisions`

### Task 7.2: Create Decisions UI
**Estimated Time:** 2 hours  
**Dependencies:** Task 7.1

**Subtasks:**

- [ ] **7.2.1: Create DecisionsModal Component**
  - **File:** `components/DecisionsModal.tsx` (NEW)
  - **Purpose:** Display decision timeline
  - **Implementation:** (Similar to action items but read-only, timeline view)
  - **Key Features:**
    - Timeline layout (most recent first)
    - Decision text (bold)
    - Context paragraph
    - Participant avatars
    - Date decided
    - Link to source messages

- [ ] **7.2.2: Add trackDecisions to aiService**
  - **File:** `services/aiService.ts`
  - **Add:**
    ```typescript
    export async function trackDecisions(conversationId: string) {
      return await callAIFeatureWithTimeout(
        'trackDecisions',
        { conversationId },
        10000  // 10 second timeout
      );
    }
    ```

### Task 7.3: How to Verify (Backend Only)
**Estimated Time:** 30 minutes  
**Dependencies:** Task 7.1 complete

This section explains how to test the `trackDecisions` Cloud Function **before** building the frontend UI.

#### Method 1: Firebase Emulator with curl

**Setup:**
```bash
# Start emulator
firebase emulators:start --only functions,firestore

# Create test conversation with decision messages
```

**Test with curl:**
```bash
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/trackDecisions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(firebase auth:print-identity-token)" \
  -d '{
    "data": {
      "conversationId": "test-conv-123",
      "messageCount": 50
    }
  }'
```

**Expected Response:**
```json
{
  "result": {
    "decisions": [
      {
        "decision": "We will go with option A for the Q4 budget approach",
        "context": "Team discussed budget options A and B. Consensus reached after considering ROI and timeline constraints.",
        "participantIds": ["user123", "user456", "user789"],
        "sourceMessageIds": ["msg-abc", "msg-def", "msg-ghi"],
        "confidence": 0.92,
        "decidedAt": "2025-10-23T14:30:00Z"
      }
    ],
    "count": 1
  }
}
```

**Pass Criteria:**
- ✅ Returns 200 status
- ✅ Decisions correctly extracted from conversation
- ✅ Context provides meaningful summary
- ✅ Confidence score is reasonable (0.7-1.0)
- ✅ Response time < 10 seconds

---

#### Method 2: Test Decision Storage in Firestore

**Deploy function:**
```bash
firebase deploy --only functions:trackDecisions
```

**Call function via Firebase Console:**
1. Functions → `trackDecisions` → Testing tab
2. Input conversation with decisions:
   ```json
   {
     "conversationId": "YOUR_REAL_CONVERSATION_ID",
     "messageCount": 30
   }
   ```
3. Check Firestore after execution:
   - Navigate to: `conversations/{id}/ai_decisions`
   - Verify documents created

**Verify fields:**
```
ai_decisions/{decisionId}:
  ✅ decision: string
  ✅ context: string
  ✅ participantIds: string[]
  ✅ sourceMessageIds: string[]
  ✅ confidence: number (0-1)
  ✅ trackedBy: string (uid)
  ✅ trackedAt: timestamp
  ✅ messageCountAtGeneration: number
```

---

#### Method 3: Unit Test for Decision Parsing

**Create test file:**
```typescript
// functions/src/__tests__/decisions.test.ts
import { parseAIResponse } from '../utils/validation';
import { DecisionSchema } from '../utils/validation';

describe('Decision Tracking', () => {
  it('should parse valid decision', () => {
    const response = JSON.stringify({
      decision: 'We will go with option A',
      context: 'Team agreed after discussing pros and cons',
      participantIds: ['user1', 'user2'],
      sourceMessageIds: ['msg1', 'msg2', 'msg3'],
      confidence: 0.9
    });

    const parsed = parseAIResponse(response, DecisionSchema);
    expect(parsed.decision).toBe('We will go with option A');
    expect(parsed.confidence).toBe(0.9);
    expect(parsed.participantIds).toHaveLength(2);
  });

  it('should reject low confidence decision', () => {
    const response = JSON.stringify({
      decision: 'Maybe we should try option B',
      context: 'Unclear discussion',
      participantIds: ['user1'],
      sourceMessageIds: ['msg1'],
      confidence: -0.5  // Invalid: < 0
    });

    expect(() => {
      parseAIResponse(response, DecisionSchema);
    }).toThrow();
  });

  it('should require source messages', () => {
    const response = JSON.stringify({
      decision: 'We decided something',
      context: 'Context here',
      participantIds: ['user1'],
      sourceMessageIds: [],  // Empty array not allowed
      confidence: 0.8
    });

    expect(() => {
      parseAIResponse(response, DecisionSchema);
    }).toThrow();
  });
});
```

**Run tests:**
```bash
cd functions
npm test -- decisions.test.ts
```

---

#### Method 4: Manual Testing with Real Conversation

**Create test conversation:**
1. Use Firebase Console or Firestore shell
2. Create conversation with decision messages:
   ```bash
   # Message 1
   "Should we launch the product in Q1 or Q2?"
   
   # Message 2
   "I vote Q1, we need to beat competition"
   
   # Message 3
   "Agreed, Q1 launch makes sense"
   
   # Message 4
   "Great, let's target January 15th for launch"
   ```
3. Call `trackDecisions` function with this conversation ID
4. Verify decision is extracted:
   - Decision: "Launch product in Q1, targeting January 15th"
   - Context: "Team discussed launch timing to stay competitive..."

**Expected behavior:**
- ✅ Clear decisions extracted
- ✅ Context summarizes discussion
- ✅ All participants included
- ✅ Source messages referenced

---

#### Verification Checklist

- [ ] **Decision extraction:** Clear decisions correctly identified
- [ ] **Context quality:** Context provides meaningful summary
- [ ] **Confidence scoring:** Low confidence for unclear discussions
- [ ] **Participant tracking:** All involved participants listed
- [ ] **Source messages:** Correct messages referenced
- [ ] **Caching works:** Same request returns cached results
- [ ] **Security:** Cannot track decisions from inaccessible conversations
- [ ] **Rate limiting:** 50th call returns "resource-exhausted"
- [ ] **No false positives:** Doesn't extract "maybe" or tentative statements

---

