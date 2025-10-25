# PHASE 0: SETUP

**Infrastructure, External Services & Foundation**

---

**⚠️ IMPORTANT: IMPLEMENTATION NOTE**
This document will be implemented by AI assistance. The AI should:
1. Read through each task and subtask carefully
2. Explain what it's about to do
3. **WAIT for explicit user approval before taking action**
4. Proceed only after receiving confirmation
5. Report results and wait for next instruction

---

## Phase Overview

**Goal:** Establish the technical foundation for AI features by setting up external services (Anthropic, OpenAI, Pinecone), initializing Firebase Cloud Functions infrastructure, and implementing the batch embedding pipeline.

**What You'll Build:**
- External AI service accounts and API keys
- Pinecone vector database index
- Firebase Cloud Functions project structure
- Shared utility functions for AI services
- Batch embedding pipeline with retry logic
- Message counter system for cache invalidation

**Time Estimate:** 8-10 hours

**Stages in This Phase:**
1. [Stage 0: Prerequisites & Setup](#stage-0-prerequisites--setup) - External services
2. [Stage 1: Infrastructure & Cloud Functions Setup](#stage-1-infrastructure--cloud-functions-setup) - Utilities
3. [Stage 2: Embedding Pipeline](#stage-2-embedding-pipeline) - Batch processing

---

## Navigation

- **Next Phase:** [PHASE_1_FEATURES.md](./PHASE_1_FEATURES.md) - AI Feature Implementation
- **Related:** [PHASE_2_INTEGRATION_TESTING.md](./PHASE_2_INTEGRATION_TESTING.md) - Integration & Testing

---

## Stage 0: Prerequisites & Setup

**Goal:** Set up external services and development environment

### Task 0.1: Create External Service Accounts
**Estimated Time:** 30 minutes

**⚠️ CRITICAL ROADBLOCKS & TROUBLESHOOTING:**

**Issue #1: OpenAI requires payment method even for testing**
- **Problem:** Cannot generate API keys without credit card
- **Mitigation:** Use a prepaid debit card if concerned about charges
- **Cost:** Minimal during development (~$0.10-$1.00 for testing)
- **Alternative:** Use free tier initially, but embedding calls will require paid tier

**Issue #2: Pinecone free tier limitations**
- **Good news:** Pinecone has a FREE Starter plan! (Source: [Pinecone Pricing](https://www.pinecone.io/pricing/))
- **Free tier includes:**
  - Up to 2 GB storage
  - Up to 2M write units/month
  - Up to 1M read units/month
  - Up to 5 indexes
  - **Limitation:** AWS us-east-1 region ONLY
- **When to upgrade to Standard ($50/month minimum):**
  - Need more than 2 GB storage
  - Need regions other than us-east-1
  - Need production features (SAML SSO, RBAC, backups)
  - Exceed free tier usage limits
- **Cost planning:** Start free, upgrade when needed

**Issue #3: API keys stored insecurely during setup**
- **Problem:** Temptation to hard-code keys or commit to git
- **Mitigation:** 
  - NEVER commit API keys to git
  - Store in password manager (1Password, LastPass)
  - Add `.env` to `.gitignore` immediately
  - Use Firebase secrets (Task 0.3.4) for production

**Subtasks:**

- [ ] **0.1.1: Create Anthropic Account**
  - Go to https://console.anthropic.com
  - Sign up and verify email
  - Navigate to API Keys section
  - Generate new API key
  - Copy key to secure location (password manager recommended)
  - **Note:** Keep this secure - will add to Cloud Functions environment later
  - **Troubleshooting:** If "Create API Key" is grayed out, verify email first
  - **Troubleshooting:** If rate limits appear immediately, check you're on correct pricing tier

- [ ] **0.1.2: Create OpenAI Account**
  - Go to https://platform.openai.com
  - Sign up and verify email
  - Add payment method (required for API access)
  - Navigate to API Keys
  - Generate new API key
  - Copy key to secure location
  - **Set billing limit:** Go to Billing → Usage limits → Set $10/month soft limit
  - **Why:** Prevents runaway costs during development/testing
  - **Troubleshooting:** If "Insufficient credits" error, verify payment method is active
  - **Troubleshooting:** If "Rate limit exceeded" during testing, you're on free tier - upgrade required

- [ ] **0.1.3: Create Pinecone Account**
  - Go to https://www.pinecone.io
  - Sign up for **FREE Starter plan** ([Pricing details](https://www.pinecone.io/pricing/))
  - Verify email and complete onboarding
  - Copy API key from dashboard
  - **Important:** Free tier is AWS us-east-1 ONLY
    - If your Firebase is in us-east-1 or us-central1: FREE tier works fine
    - If Firebase is in other regions: Consider latency impact or upgrade to Standard ($50/month) for region choice
  - **Free tier limits:**
    - 2 GB storage (sufficient for ~100K-200K messages with embeddings)
    - 2M write units/month (sufficient for development/testing)
    - 1M read units/month
  - **When to upgrade:** When you exceed free limits or need other regions
  - **Troubleshooting:** If asked to add payment method, can skip for free tier
  - **Troubleshooting:** If index creation fails, verify you're in us-east-1 region

### Task 0.2: Initialize Pinecone Index
**Estimated Time:** 15 minutes  
**Dependencies:** Task 0.1.3

**⚠️ CRITICAL ROADBLOCKS & TROUBLESHOOTING:**

**Issue #1: Wrong dimensions will break everything later**
- **Problem:** If you set dimensions wrong (not 1536), embeddings won't match
- **Mitigation:** MUST be 1536 for `text-embedding-3-small` model
- **Cannot change after creation:** You'd have to delete index and recreate (loses all data)
- **Verification:** Double-check dimensions = 1536 before clicking Create

**Issue #2: Pinecone region latency to Firebase (FREE TIER CONSTRAINT)**
- **Problem:** FREE Starter plan ONLY supports AWS us-east-1 region
- **Check Firebase region:** Go to Firebase Console → Project Settings → find your region
- **If Firebase is us-central1 or us-east-1:** FREE tier is perfect! (~20-50ms latency)
- **If Firebase is other regions:**
  - **Option A (FREE but slower):** Use us-east-1 Pinecone (expect 100-300ms latency)
  - **Option B (PAID but faster):** Upgrade to Standard plan ($50/month minimum) to choose region:
    - Firebase `us-central1` → Pinecone `us-central1` or `us-east-1`
    - Firebase `europe-west` → Pinecone `eu-west1-gcp`
    - Firebase `asia-southeast` → Pinecone `asia-southeast1-gcp`
- **Recommendation:** Start with FREE tier, upgrade if latency becomes an issue
- **Impact:** 50-200ms latency difference affects search responsiveness

**Issue #3: Index takes time to initialize**
- **Problem:** Index shows "Initializing" for 1-5 minutes
- **Expected:** This is normal, do not recreate
- **Wait for:** Status "Ready" before proceeding
- **Troubleshooting:** If stuck >10 minutes, contact Pinecone support

**Subtasks:**

- [ ] **0.2.1: Create Pinecone Index**
  - **Option A (Dashboard - RECOMMENDED):**
    - Navigate to Indexes in Pinecone dashboard
    - Click "Create Index"
    - Name: `message-ai-embeddings` (must match config later)
    - **CRITICAL:** Dimensions: `1536` (for text-embedding-3-small)
    - Metric: `cosine` (best for semantic similarity)
    - **Cloud:** AWS (only option on free tier)
    - **Region:** us-east-1 (only option on free tier)
    - **Capacity Mode:** Serverless (default for Starter/Standard plans)
    - Click "Create Index"
    - **Wait:** 1-5 minutes for "Ready" status
    - **Note:** Free tier supports up to 5 indexes
  - **Option B (Python Script - for automation):**
    ```bash
    # Create script: scripts/init-pinecone.py
    pip install pinecone-client
    python scripts/init-pinecone.py
    ```
    ```python
    # scripts/init-pinecone.py
    from pinecone import Pinecone, ServerlessSpec
    
    pc = Pinecone(api_key='YOUR_API_KEY')
    
    pc.create_index(
      name="message-ai-embeddings",
      dimension=1536,  # CRITICAL: Must match embedding model
      metric="cosine",
      spec=ServerlessSpec(
        cloud='aws',        # FREE tier requires AWS
        region='us-east-1'  # FREE tier requires us-east-1
      )
    )
    ```
  - Verify index created (shows in dashboard)
  - Copy index name to notes (exactly: `message-ai-embeddings`)
  - **Troubleshooting:** If error "Index already exists", use existing or delete first
  - **Troubleshooting:** If error "Invalid dimensions", must be integer 1536
  - **Troubleshooting:** If Python script fails, verify `pinecone-client>=3.0.0` installed

- [ ] **0.2.2: Test Pinecone Connection**
  - Use Pinecone dashboard to verify index is "Ready" (not "Initializing")
  - Check capacity: should show 0 vectors initially
  - Check vector count: should be 0
  - Verify region matches your Firebase region (or is nearby)
  - **Manual Test (optional):**
    ```python
    # Quick connection test
    from pinecone import Pinecone
    pc = Pinecone(api_key='YOUR_API_KEY')
    index = pc.Index("message-ai-embeddings")
    print(index.describe_index_stats())
    # Should show: {'dimension': 1536, 'total_vector_count': 0}
    ```
  - **Troubleshooting:** If connection fails, verify API key is correct
  - **Troubleshooting:** If "Index not found", verify exact spelling of index name

### Task 0.3: Initialize Firebase Cloud Functions Project
**Estimated Time:** 45 minutes  
**Dependencies:** None

**⚠️ CRITICAL ROADBLOCKS & TROUBLESHOOTING:**

**Issue #1: `firebase init functions` may overwrite existing code**
- **Problem:** If functions/ directory already exists, init may offer to overwrite
- **Mitigation:** Check if `functions/` exists first: `ls functions/`
- **If exists:** Skip 0.3.2, go straight to 0.3.3 (install dependencies only)
- **Backup:** `cp -r functions functions-backup` before running init

**Issue #2: NPM package version conflicts**
- **Problem:** Newer SDK versions may have breaking changes
- **Known working versions (as of Oct 2025):**
  - `@anthropic-ai/sdk`: `^0.9.0` or newer
  - `openai`: `^4.20.0` or newer
  - `@pinecone-database/pinecone`: `^1.1.0` or newer
  - `zod`: `^3.22.0` or newer
  - `firebase-functions`: `^4.5.0` (check existing version first)
  - `firebase-admin`: `^11.11.0` (check existing version first)
- **If errors:** Try `npm install --legacy-peer-deps`

**Issue #3: Firebase secrets vs. config confusion**
- **Problem:** Mix up `functions:secrets:set` vs `functions:config:set`
- **Rule:** 
  - **Secrets** (encrypted): API keys, passwords, tokens
  - **Config** (plain text): Non-sensitive values like limits, names
- **Security risk:** If you put API keys in config, they're visible in console!

**Issue #4: Node version mismatch**
- **Problem:** Firebase Functions requires Node 18 or 20
- **Check your version:** `node --version`
- **Required:** v18.x or v20.x
- **If wrong version:** Use nvm: `nvm install 20 && nvm use 20`
- **Update functions:**
  ```json
  // functions/package.json
  "engines": {
    "node": "20"
  }
  ```

**Issue #5: firebase-tools not installed or outdated**
- **Check:** `firebase --version`
- **Required:** >= 12.0.0
- **Update:** `npm install -g firebase-tools@latest`
- **Login:** `firebase login` (if not already)

**Subtasks:**

- [ ] **0.3.1: Create Functions Directory**
  ```bash
  cd /Users/adamisom/Desktop/message-ai
  # Check if exists first
  if [ -d "functions" ]; then echo "EXISTS - skip or backup"; else mkdir -p functions/src; fi
  ```
  - **New Directory:** `functions/`
  - **New Directory:** `functions/src/`
  - **Troubleshooting:** If "Permission denied", check folder permissions
  - **Troubleshooting:** If path doesn't exist, verify you're in project root

- [ ] **0.3.2: Initialize Firebase Functions**
  ```bash
  cd functions
  firebase init functions
  ```
  - **IMPORTANT:** Select existing Firebase project (don't create new)
  - Choose TypeScript (REQUIRED - our code is TypeScript)
  - Use ESLint: Yes (recommended)
  - Install dependencies: Yes (will run npm install)
  - **Creates:**
    - `functions/package.json`
    - `functions/tsconfig.json`
    - `functions/.eslintrc.js`
    - `functions/src/index.ts`
  - **Troubleshooting:** If "No project found", run `firebase use --add` first
  - **Troubleshooting:** If init hangs, check internet connection (downloading packages)
  - **Troubleshooting:** If "Firebase project not found", verify project ID is correct
  - **Troubleshooting:** If TypeScript errors immediately, check Node version (must be 18 or 20)

- [ ] **0.3.3: Install AI Dependencies**
  ```bash
  cd functions
  npm install @anthropic-ai/sdk openai @pinecone-database/pinecone zod
  npm install --save-dev @types/node
  ```
  - **Updates:** `functions/package.json`
  - Verify versions in package.json match requirements (see roadblocks above)
  - **Expected time:** 1-3 minutes depending on internet speed
  - **Troubleshooting:** If "ERESOLVE unable to resolve dependency tree"
    - Try: `npm install --legacy-peer-deps @anthropic-ai/sdk openai @pinecone-database/pinecone zod`
  - **Troubleshooting:** If "npm ERR! 404 Not Found", check package names are spelled correctly
  - **Troubleshooting:** If install hangs, clear npm cache: `npm cache clean --force`
  - **Verification:** Check `functions/package.json` has all 4 packages listed

- [ ] **0.3.4: Set Up Environment Variables**
  ```bash
  cd functions
  firebase functions:secrets:set ANTHROPIC_API_KEY
  firebase functions:secrets:set OPENAI_API_KEY
  firebase functions:secrets:set PINECONE_API_KEY
  ```
  - Enter API keys when prompted (paste from password manager)
  - **CRITICAL:** Use secrets:set (NOT config:set) for API keys
  - **Alternative:** Use `.env` for local development only (never commit .env!)
  - **Creates:** Secret references in Firebase console
  - **Security:** Keys encrypted at rest, injected at runtime
  - **Verify secrets set:** `firebase functions:secrets:access ANTHROPIC_API_KEY --data file.txt && cat file.txt && rm file.txt`
  - **Troubleshooting:** If "insufficient permissions", check Firebase IAM roles
  - **Troubleshooting:** If prompt doesn't appear, try pasting key and pressing Enter twice
  - **Troubleshooting:** If "Invalid secret name", use only uppercase letters, numbers, underscores
  - **Local development:** For local testing, create `functions/.env`:
    ```bash
    # functions/.env (NEVER commit this file!)
    ANTHROPIC_API_KEY=sk-ant-...
    OPENAI_API_KEY=sk-...
    PINECONE_API_KEY=...
    ```
  - **CRITICAL:** Add to `.gitignore`: `echo "functions/.env" >> .gitignore`

- [ ] **0.3.5: Configure Functions Environment**
  ```bash
  firebase functions:config:set \
    pinecone.environment="us-east-1" \
    pinecone.index="message-ai-embeddings" \
    ai.hourly_limit=50 \
    ai.monthly_limit=1000
  ```
  - **IMPORTANT:** For FREE tier, environment MUST be `us-east-1` (not us-west1-gcp)
  - **IMPORTANT:** Index name must EXACTLY match what you created in Task 0.2.1
  - **If using paid Standard plan with different region:** Replace `us-east-1` with your actual region
  - Verify with: `firebase functions:config:get`
  - **Note:** These are non-secret configs, safe to store (no API keys here!)
  - **Expected output:**
    ```json
    {
      "pinecone": {
        "environment": "us-east-1",
        "index": "message-ai-embeddings"
      },
      "ai": {
        "hourly_limit": "50",
        "monthly_limit": "1000"
      }
    }
    ```
  - **Troubleshooting:** If config:get shows empty, re-run config:set command
  - **Troubleshooting:** If "Parse error", check quotes around string values
  - **Troubleshooting:** For local development, create `functions/.runtimeconfig.json`:
    ```json
    {
      "pinecone": {
        "environment": "us-east-1",
        "index": "message-ai-embeddings"
      },
      "ai": {
        "hourly_limit": "50",
        "monthly_limit": "1000"
      }
    }
    ```
  - **CRITICAL:** Add to `.gitignore`: `echo "functions/.runtimeconfig.json" >> .gitignore`

---

## Stage 1: Infrastructure & Cloud Functions Setup

**Goal:** Create Cloud Functions project structure and shared utilities

### Task 1.1: Create Functions Directory Structure
**Estimated Time:** 20 minutes  
**Dependencies:** Task 0.3

**Subtasks:**

- [ ] **1.1.1: Create Directory Structure**
  ```bash
  cd functions/src
  mkdir -p ai utils
  ```
  - **New Directories:**
    - `functions/src/ai/` - AI feature Cloud Functions
    - `functions/src/utils/` - Shared utilities

- [ ] **1.1.2: Create Placeholder Files**
  ```bash
  touch src/ai/summarization.ts
  touch src/ai/actionItems.ts
  touch src/ai/search.ts
  touch src/ai/priority.ts
  touch src/ai/decisions.ts
  touch src/ai/embeddings.ts
  touch src/utils/anthropic.ts
  touch src/utils/openai.ts
  touch src/utils/pinecone.ts
  touch src/utils/validation.ts
  touch src/utils/security.ts
  touch src/utils/rateLimit.ts
  touch src/utils/caching.ts
  touch src/utils/priorityHeuristics.ts
  touch src/utils/timeout.ts
  ```
  - **New Files:** All files listed above (empty for now)

### Task 1.2: Create Shared Utilities
**Estimated Time:** 2 hours  
**Dependencies:** Task 1.1

**Subtasks:**

- [ ] **1.2.1: Create Anthropic Client Utility**
  - **File:** `functions/src/utils/anthropic.ts`
  - **Purpose:** Wrapper for Anthropic API calls
  - **Implementation:**
    ```typescript
    import Anthropic from '@anthropic-ai/sdk';
    
    export const anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    export async function callClaude(
      prompt: string,
      maxTokens: number = 1500
    ): Promise<string> {
      const response = await anthropicClient.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }]
      });
      return response.content[0].text;
    }
    ```
  - **Exports:** `anthropicClient`, `callClaude()`
  - **Error Handling:** Wrap in try-catch, throw HttpsError on failure

- [ ] **1.2.2: Create OpenAI Client Utility**
  - **File:** `functions/src/utils/openai.ts`
  - **Purpose:** Wrapper for OpenAI embeddings API
  - **Implementation:**
    ```typescript
    import OpenAI from 'openai';
    
    export const openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    export async function generateEmbedding(text: string): Promise<number[]> {
      const response = await openaiClient.embeddings.create({
        model: "text-embedding-3-small",
        input: text
      });
      return response.data[0].embedding;
    }
    
    export async function batchGenerateEmbeddings(
      texts: string[]
    ): Promise<number[][]> {
      const response = await openaiClient.embeddings.create({
        model: "text-embedding-3-small",
        input: texts
      });
      return response.data.map(item => item.embedding);
    }
    ```
  - **Exports:** `openaiClient`, `generateEmbedding()`, `batchGenerateEmbeddings()`
  - **Note:** Batch function for efficiency (up to 500 texts)

- [ ] **1.2.3: Create Pinecone Client Utility**
  - **File:** `functions/src/utils/pinecone.ts`
  - **Purpose:** Wrapper for Pinecone vector database
  - **Implementation:**
    ```typescript
    import { Pinecone } from '@pinecone-database/pinecone';
    import * as functions from 'firebase-functions';
    
    const config = functions.config();
    
    export const pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: config.pinecone.environment
    });
    
    export const pineconeIndex = pineconeClient.index(config.pinecone.index);
    
    export interface MessageVector {
      id: string;
      values: number[];
      metadata: {
        conversationId: string;
        text: string;
        senderId: string;
        senderName: string;
        participants: string[];
        createdAt: number;
      };
    }
    
    export async function upsertVectors(vectors: MessageVector[]): Promise<void> {
      await pineconeIndex.upsert(vectors);
    }
    
    export async function queryVectors(
      queryVector: number[],
      conversationId: string,
      topK: number = 10
    ) {
      return await pineconeIndex.query({
        vector: queryVector,
        filter: { conversationId },
        topK,
        includeMetadata: true
      });
    }
    ```
  - **Exports:** `pineconeClient`, `pineconeIndex`, `MessageVector`, `upsertVectors()`, `queryVectors()`

- [ ] **1.2.4: Create Zod Validation Schemas**
  - **File:** `functions/src/utils/validation.ts`
  - **Purpose:** Validate AI responses before storing
  - **Implementation:**
    ```typescript
    import { z } from 'zod';
    
    export const SummarySchema = z.object({
      summary: z.string().min(10).max(1000),
      keyPoints: z.array(z.string()).min(3).max(10)
    });
    
    export const ActionItemSchema = z.object({
      text: z.string(),
      assigneeIdentifier: z.string().optional().nullable(),
      dueDate: z.string().datetime().optional().nullable(),
      priority: z.enum(['high', 'medium', 'low']),
      sourceMessageId: z.string()
    });
    
    export const DecisionSchema = z.object({
      decision: z.string(),
      context: z.string(),
      participantIds: z.array(z.string()),
      sourceMessageIds: z.array(z.string()),
      confidence: z.number().min(0).max(1)
    });
    
    export const PrioritySchema = z.object({
      priority: z.enum(['high', 'medium', 'low']),
      reason: z.string()
    });
    
    export function parseAIResponse<T>(
      rawResponse: string,
      schema: z.ZodSchema<T>
    ): T {
      // Strip markdown code blocks
      let json = rawResponse.trim();
      if (json.startsWith('```')) {
        json = json.replace(/^```json?\n/, '').replace(/\n```$/, '');
      }
      
      // Parse JSON
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch (error) {
        throw new Error(`JSON parsing failed: ${error.message}`);
      }
      
      // Validate with Zod
      const result = schema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`Validation failed: ${result.error.message}`);
      }
      
      return result.data;
    }
    ```
  - **Exports:** All schemas, `parseAIResponse()`

- [ ] **1.2.5: Create Security Utilities**
  - **File:** `functions/src/utils/security.ts`
  - **Purpose:** Permission checks and security helpers
  - **Implementation:**
    ```typescript
    import * as admin from 'firebase-admin';
    import * as functions from 'firebase-functions';
    
    const db = admin.firestore();
    
    export async function verifyConversationAccess(
      userId: string,
      conversationId: string
    ): Promise<boolean> {
      const conversationDoc = await db
        .doc(`conversations/${conversationId}`)
        .get();
      
      if (!conversationDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Conversation not found'
        );
      }
      
      const participants = conversationDoc.data()?.participants || [];
      if (!participants.includes(userId)) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You do not have access to this conversation'
        );
      }
      
      return true;
    }
    
    export function filterSearchResults(
      results: any[],
      userId: string
    ): any[] {
      return results.filter(result =>
        result.metadata?.participants &&
        result.metadata.participants.includes(userId)
      );
    }
    ```
  - **Exports:** `verifyConversationAccess()`, `filterSearchResults()`

- [ ] **1.2.6: Create Rate Limiting Utility**
  - **File:** `functions/src/utils/rateLimit.ts`
  - **Purpose:** Check and enforce AI usage limits
  - **Implementation:**
    ```typescript
    import * as admin from 'firebase-admin';
    import * as functions from 'firebase-functions';
    
    const db = admin.firestore();
    const config = functions.config();
    
    const HOURLY_LIMIT = parseInt(config.ai?.hourly_limit || '50');
    const MONTHLY_LIMIT = parseInt(config.ai?.monthly_limit || '1000');
    
    export async function checkAIRateLimit(
      userId: string,
      feature: string
    ): Promise<boolean> {
      const month = new Date().toISOString().slice(0, 7);
      const usageRef = db.doc(`users/${userId}/ai_usage/${month}`);
      
      return await db.runTransaction(async (transaction) => {
        const usageDoc = await transaction.get(usageRef);
        const now = Date.now();
        const oneHourAgo = now - 3600000;
        
        if (!usageDoc.exists) {
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
        
        const data = usageDoc.data()!;
        const hourlyActions = 
          (data.hourStartedAt?.toMillis() < oneHourAgo) 
            ? 0 
            : data.actionsThisHour || 0;
        
        // Check limits
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
          actionsThisHour: 
            hourlyActions >= HOURLY_LIMIT || 
            data.hourStartedAt?.toMillis() < oneHourAgo
              ? 1
              : admin.firestore.FieldValue.increment(1),
          hourStartedAt: 
            data.hourStartedAt?.toMillis() < oneHourAgo
              ? admin.firestore.FieldValue.serverTimestamp()
              : data.hourStartedAt,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return true;
      });
    }
    ```
  - **Exports:** `checkAIRateLimit()`
  - **Config:** Uses `ai.hourly_limit` and `ai.monthly_limit` from Firebase config

- [ ] **1.2.7: Create Caching Utilities**
  - **File:** `functions/src/utils/caching.ts`
  - **Purpose:** Check cache validity and invalidation logic
  - **Implementation:**
    ```typescript
    import * as admin from 'firebase-admin';
    
    const db = admin.firestore();
    
    export async function getCachedResult<T>(
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
      
      const cacheData = cache.data()!;
      const currentMessageCount = conversation.data()?.messageCount || 0;
      const messagesSinceCache = 
        currentMessageCount - cacheData.messageCountAtGeneration;
      const ageMs = Date.now() - cacheData.generatedAt.toMillis();
      
      // Cache valid if BOTH conditions met
      if (ageMs < maxAge && messagesSinceCache < maxNewMessages) {
        console.log(`Cache hit: age=${ageMs}ms, newMessages=${messagesSinceCache}`);
        return cacheData as T;
      }
      
      console.log(`Cache miss: age=${ageMs}ms, newMessages=${messagesSinceCache}`);
      return null;
    }
    ```
  - **Exports:** `getCachedResult()`

- [ ] **1.2.8: Create Priority Heuristics Utility**
  - **File:** `functions/src/utils/priorityHeuristics.ts`
  - **Purpose:** Quick priority detection (shared with client)
  - **Implementation:**
    ```typescript
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
      
      const urgentPunctuation = /\?{2,}|!{2,}/;
      
      // Check low priority
      if (lowPriorityPatterns.some(p => p.test(text)) && text.length < 30) {
        return 'low';
      }
      
      // Check high priority
      const lowerText = text.toLowerCase();
      if (highPriorityKeywords.some(kw => lowerText.includes(kw))) {
        return 'high';
      }
      
      if (urgentPunctuation.test(text)) {
        return 'high';
      }
      
      // Check all caps
      if (text.length > 10 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
        return 'high';
      }
      
      return text.length < 30 ? 'low' : 'unknown';
    }
    ```
  - **Exports:** `quickPriorityCheck()`
  - **Note:** This logic should be duplicated in client-side code later

### Task 1.3: Initialize Firebase Admin in Functions
**Estimated Time:** 10 minutes  
**Dependencies:** Task 1.1

**Subtasks:**

- [ ] **1.3.1: Update functions/src/index.ts**
  - **File:** `functions/src/index.ts`
  - **Add at top:**
    ```typescript
    import * as admin from 'firebase-admin';
    import * as functions from 'firebase-functions';
    
    admin.initializeApp();
    
    // Export Cloud Functions (will add these incrementally)
    export { batchEmbedMessages } from './ai/embeddings';
    export { generateSummary } from './ai/summarization';
    export { extractActionItems } from './ai/actionItems';
    export { semanticSearch } from './ai/search';
    export { quickPriorityCheck, batchAnalyzePriority } from './ai/priority';
    export { trackDecisions } from './ai/decisions';
    export { incrementMessageCounter } from './ai/embeddings';
    ```
  - **Note:** Some exports will fail until we create those functions

---

## Stage 2: Embedding Pipeline

**Goal:** Implement batch embedding system for semantic search

### Task 2.1: Create Batch Embedding Cloud Function
**Estimated Time:** 3 hours  
**Dependencies:** Stage 1 complete

**Subtasks:**

- [ ] **2.1.1: Implement batchEmbedMessages Function**
  - **File:** `functions/src/ai/embeddings.ts`
  - **Purpose:** Scheduled function to embed unindexed messages
  - **Implementation:** (See detailed code in PRD lines 701-786)
  - **Key Logic:**
    - Query messages where `embedded: false`
    - Limit to 500 per batch
    - Call `batchGenerateEmbeddings()` from OpenAI util
    - Upsert vectors to Pinecone with metadata
    - Update messages: `embedded: true`
    - Handle errors → add to retry queue
  - **Schedule:** `every 5 minutes`
  - **Timeout:** 540 seconds (9 minutes)
  - **Memory:** 512MB
  - **Exports:** `batchEmbedMessages`

- [ ] **2.1.2: Implement Retry Queue Logic**
  - **File:** `functions/src/ai/embeddings.ts`
  - **Add function:** `queueForRetry()`
  - **Purpose:** Add failed embeddings to retry queue
  - **Implementation:** (See PRD lines 788-825)
  - **Key Logic:**
    - Write to `/embedding_retry_queue/{messageId}`
    - Track retry count (max 5)
    - Exponential backoff: 1min, 5min, 15min, 30min, 60min
    - Log permanent failures after max retries

- [ ] **2.1.3: Implement Retry Processor**
  - **File:** `functions/src/ai/embeddings.ts`
  - **Add function:** `retryFailedEmbeddings`
  - **Purpose:** Process messages in retry queue
  - **Implementation:** (See PRD lines 827-884)
  - **Key Logic:**
    - Query retry queue where `nextRetryAfter <= now`
    - Limit 100 per run
    - Retry embedding for each message
    - On success: delete from queue
    - On failure: call `queueForRetry()` again
  - **Schedule:** `every 10 minutes`
  - **Exports:** `retryFailedEmbeddings`

- [ ] **2.1.4: Implement Queue Monitoring**
  - **File:** `functions/src/ai/embeddings.ts`
  - **Add function:** `monitorRetryQueue`
  - **Purpose:** Alert if retry queue grows too large
  - **Implementation:** (See PRD lines 886-898)
  - **Key Logic:**
    - Count documents in retry queue
    - Log ERROR if > 1000
    - Log WARNING if > 100
  - **Schedule:** `every 30 minutes`
  - **Exports:** `monitorRetryQueue`

- [ ] **2.1.5: Implement Message Counter Trigger**
  - **File:** `functions/src/ai/embeddings.ts`
  - **Add function:** `incrementMessageCounter`
  - **Purpose:** Increment conversation.messageCount on new message
  - **Implementation:** (See PRD lines 1532-1547)
  - **Key Logic:**
    - Trigger: `onCreate('conversations/{conversationId}/messages/{messageId}')`
    - Update conversation doc: `messageCount += 1`
    - Use `FieldValue.increment(1)`
    - Wrap in try-catch (log warning on failure, don't throw)
  - **Exports:** `incrementMessageCounter`

### Task 2.2: Update Firestore Schema for Embeddings
**Estimated Time:** 30 minutes  
**Dependencies:** None (can do in parallel)

**Subtasks:**

- [ ] **2.2.1: Update Message Creation Logic**
  - **File:** `services/firestoreService.ts`
  - **Find:** `sendMessage()` function
  - **Add field:** `embedded: false` to all new message documents
  - **Example:**
    ```typescript
    await messageRef.set({
      text,
      senderId: auth.currentUser!.uid,
      senderName: userDisplayName,
      participants: conversationParticipants,
      createdAt: serverTimestamp(),
      embedded: false  // NEW: mark for embedding
    });
    ```

- [ ] **2.2.2: Update Conversation Schema**
  - **File:** `services/firestoreService.ts`
  - **Find:** `createConversation()` function
  - **Add field:** `messageCount: 0` to new conversation documents
  - **Example:**
    ```typescript
    await conversationRef.set({
      type,
      participants,
      participantDetails,
      lastMessageAt: null,
      lastMessage: null,
      lastRead: {},
      createdAt: serverTimestamp(),
      messageCount: 0  // NEW: for cache invalidation
    });
    ```

- [ ] **2.2.3: Create Migration Script for Existing Data**
  - **File:** `scripts/migrate-add-embedding-fields.ts` (NEW)
  - **Purpose:** Add `embedded: false` to existing messages, `messageCount` to conversations
  - **Implementation:**
    ```typescript
    import * as admin from 'firebase-admin';
    
    admin.initializeApp();
    const db = admin.firestore();
    
    async function migrateMessages() {
      const messagesSnapshot = await db.collectionGroup('messages').get();
      const batch = db.batch();
      let count = 0;
      
      messagesSnapshot.docs.forEach(doc => {
        if (!doc.data().hasOwnProperty('embedded')) {
          batch.update(doc.ref, { embedded: false });
          count++;
        }
      });
      
      await batch.commit();
      console.log(`Updated ${count} messages with embedded: false`);
    }
    
    async function migrateConversations() {
      const conversationsSnapshot = await db.collection('conversations').get();
      
      for (const convDoc of conversationsSnapshot.docs) {
        if (!convDoc.data().hasOwnProperty('messageCount')) {
          const messagesCount = await db
            .collection(`conversations/${convDoc.id}/messages`)
            .count()
            .get();
          
          await convDoc.ref.update({
            messageCount: messagesCount.data().count
          });
        }
      }
      
      console.log('Migration complete');
    }
    
    async function run() {
      await migrateMessages();
      await migrateConversations();
      process.exit(0);
    }
    
    run();
    ```
  - **Run:** `npx ts-node scripts/migrate-add-embedding-fields.ts`

### Task 2.3: Create Firestore Composite Indexes
**Estimated Time:** 15 minutes (+ 5-10 min build time)  
**Dependencies:** Task 2.1.1 deployed

**⚠️ CRITICAL ROADBLOCKS & TROUBLESHOOTING:**

**Issue #1: Index creation URL expires quickly**
- **Problem:** Firebase provides a one-time URL in error logs to create index
- **Timeout:** URL may expire if you wait too long (>30 minutes)
- **Mitigation:** Click the URL immediately when you see it
- **Alternative:** Create manually in Firebase Console (steps below)

**Issue #2: Index building takes longer than expected**
- **Problem:** Large message collections take 10-60 minutes to index
- **Check status:** Firebase Console → Firestore → Indexes tab
- **Status meanings:**
  - "Building" → In progress (normal, be patient)
  - "Enabled" → Ready to use
  - "Error" → Something wrong, check configuration
- **Don't:** Try to create duplicate index while first is building
- **Impact:** Functions will error until index is "Enabled"

**Issue #3: Wrong collection group vs collection**
- **Problem:** Must use "Collection group" not "Collection" for messages
- **Why:** Messages are in subcollections under multiple conversations
- **Correct:** Collection group = `messages` (searches across all conversations)
- **Wrong:** Collection = `conversations/{id}/messages` (only one conversation)
- **If wrong:** Index won't work for collection group queries, must recreate

**Issue #4: Index fields order matters**
- **Problem:** Wrong field order causes index to not be used
- **Correct order for embedding query:**
  1. `embedded` (Equality ==)
  2. `createdAt` (Ascending or Descending)
- **If wrong:** Functions will still error "query requires an index"

**Issue #5: Scheduled function doesn't trigger**
- **Problem:** Deployed but no logs appear after 5 minutes
- **Troubleshooting:**
  - Check Cloud Scheduler in GCP Console
  - Look for job named `firebase-schedule-batchEmbedMessages`
  - Verify job status is "Enabled" not "Paused"
  - Check "Last run" timestamp
  - Manually trigger: Click job → "Force run"
- **Common causes:**
  - Wrong region (must match Functions region)
  - Permissions issue (Cloud Scheduler SA needs roles)
  - Billing not enabled on GCP project

**Subtasks:**

- [ ] **2.3.1: Deploy Batch Embedding Function**
  ```bash
  cd functions
  npm run build
  # Check for TypeScript errors
  firebase deploy --only functions:batchEmbedMessages
  ```
  - Wait for deployment to complete (3-5 minutes typically)
  - **Expected output:** "✔  functions[batchEmbedMessages(us-central1)]: Successful create operation."
  - **Troubleshooting:** If "Build failed", check TypeScript errors in output
  - **Troubleshooting:** If "Deployment error", verify Firebase project has Blaze plan (required for Cloud Functions)
  - **Troubleshooting:** If "Permission denied", run `firebase login` and try again
  - **Troubleshooting:** If function times out during deploy, increase deployment timeout
  - **Verify deployment:**
    ```bash
    firebase functions:list
    # Should show: batchEmbedMessages(us-central1)
    ```

- [ ] **2.3.2: Trigger Index Creation**
  - Wait 5 minutes for first scheduled run
  - Check Cloud Function logs in Firebase Console:
    - Go to Functions → batchEmbedMessages → Logs tab
    - Look for logs with timestamp within last 6 minutes
  - **Expected error:** "The query requires an index. You can create it here: https://console.firebase.google.com/..."
  - Copy index creation URL from logs (entire HTTPS URL)
  - Click URL to auto-create index
  - **Confirm details:**
    - Collection ID: `messages` (must be collection group)
    - Query scope: `Collection group`
    - Fields: `embedded` Ascending/Descending, `createdAt` Ascending
  - Click "Create index"
  - **OR** manually create in Firebase Console:
    - Go to Firestore > Indexes > Composite Indexes
    - Click "Create Index"
    - **Collection Group:** `messages` (NOT collection!)
    - **Fields:**
      - Field 1: `embedded`, Equality (==)
      - Field 2: `createdAt`, Ascending
    - **Query scope:** Collection group
    - Click Create
  - **Troubleshooting:** If no error appears in logs:
    - Check if function ran at all (look for any logs)
    - Verify Cloud Scheduler job is enabled
    - Manually trigger function: `firebase functions:shell` then `batchEmbedMessages()`
  - **Troubleshooting:** If error but no URL:
    - Error format changed - manually create index with settings above
  - **Troubleshooting:** If "Index already exists":
    - Good! Index was created previously
    - Check status is "Enabled" before proceeding

- [ ] **2.3.3: Wait for Index to Build**
  - Go to Firebase Console → Firestore → Indexes → Composite
  - Find index: Collection Group `messages`, Fields `embedded`, `createdAt`
  - Check status column
  - **Status: "Building"** → Wait (refresh page every 2 minutes)
  - **Status: "Enabled"** → Ready! Proceed to next task
  - **Status: "Error"** → Delete and recreate with correct settings
  - Typical build time:
    - < 100 messages: 1-2 minutes
    - 100-1000 messages: 3-5 minutes
    - 1000-10000 messages: 5-15 minutes
    - > 10000 messages: 15-60 minutes
  - **Troubleshooting:** If stuck in "Building" > 30 minutes:
    - Check Firebase Console for any alerts
    - Try deleting and recreating index
    - Contact Firebase support if persists

- [ ] **2.3.4: Verify Batch Embedding Works**
  - Send a test message in the app (open app, send any message)
  - Note the message ID from Firestore Console (optional)
  - Wait 6 minutes (one 5-minute batch cycle + 1 minute buffer)
  - Check Firestore Console:
    - Navigate to conversations/{convId}/messages/{msgId}
    - Verify field `embedded: true` exists
    - Verify field `embeddedAt` has timestamp
  - Check Pinecone dashboard:
    - Go to Pinecone Console → Indexes → message-ai-embeddings
    - Check "Total vectors" count
    - Should have increased by 1
  - **Pass Criteria:**
    - Message has `embedded: true` in Firestore
    - Pinecone vector count increased
    - No errors in Cloud Function logs
  - **Troubleshooting:** If still `embedded: false` after 10 minutes:
    - Check Cloud Function logs for errors
    - Verify OpenAI API key is set correctly
    - Verify Pinecone connection works
    - Check retry queue for failed attempts:
      ```
      Firestore → embedding_retry_queue collection
      Should be empty or have entry with error message
      ```
  - **Troubleshooting:** If Pinecone count didn't increase:
    - Check Pinecone API key is correct
    - Verify index name matches exactly
    - Check Cloud Function logs for Pinecone errors
  - **Troubleshooting:** If "Rate limit exceeded" error:
    - OpenAI free tier issue - upgrade to paid tier
    - Or: Reduce batch size temporarily for testing

### Task 2.4: Test Embedding Pipeline
**Estimated Time:** 1 hour  
**Dependencies:** Task 2.3 complete

**Subtasks:**

- [ ] **2.4.1: Test Normal Operation**
  - Send 10 test messages in app
  - Wait 6 minutes
  - Check Firestore: all messages have `embedded: true`
  - Check Pinecone: vector count increased by 10
  - **Pass Criteria:** All messages embedded successfully

- [ ] **2.4.2: Test API Failure Handling**
  - Temporarily break OpenAI API key (add invalid char)
  - Send 3 test messages
  - Wait 6 minutes
  - Verify messages still sent/readable (core app works)
  - Check retry queue: 3 documents added
  - Fix API key
  - Wait 15 minutes (retry processor runs)
  - Verify retry queue cleared
  - Verify messages now have `embedded: true`
  - **Pass Criteria:** Graceful degradation, eventual consistency

- [ ] **2.4.3: Test Rate Limiting**
  - Send 600 messages rapidly (exceeds 500/batch)
  - Wait 6 minutes
  - Check: first 500 embedded
  - Wait 6 more minutes
  - Check: remaining 100 embedded
  - **Pass Criteria:** Natural rate limiting works

---
