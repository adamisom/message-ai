# Integration Tests Guide

**Date:** October 24, 2025  
**Branch:** `ai-spike`

---

## Overview

Integration tests verify critical backend AI features against a **real Firebase emulator**. Unlike unit tests with mocks, these tests ensure our code works correctly with actual Firestore behavior, including transactions, race conditions, and concurrent requests.

---

## What's Tested

### 1. Rate Limiting (`rateLimit.integration.test.ts`)
- ✅ First action this month (creates usage document)
- ✅ Concurrent requests (verifies transaction safety)
- ✅ Hourly limit enforcement (50 actions/hour)
- ✅ Monthly limit enforcement (1000 actions/month)
- ✅ Hourly reset after 1 hour
- ✅ Feature-specific counters (search, summary, actionItems, etc.)

**Why Critical:** Bugs here = users blocked incorrectly OR unlimited usage ($$$ cost)

### 2. Caching (`caching.integration.test.ts`)
- ✅ Cache hits (age and message count valid)
- ✅ Cache miss due to age (cache too old)
- ✅ Cache miss due to new messages (too many new messages)
- ✅ Cache miss when document doesn't exist
- ✅ Both conditions must be met (age AND message count)
- ✅ Edge cases (exactly at threshold values)

**Why Critical:** Bugs here = stale data shown OR cache never hits (wasted API calls = $$$)

### 3. Security (`security.integration.test.ts`)
- ✅ Users can access conversations they're participants in
- ✅ Users denied access to conversations they're not in
- ✅ Proper errors thrown (not-found, permission-denied)
- ✅ Search result filtering (only returns user's messages)
- ✅ Group conversation access control
- ✅ Handling missing metadata

**Why Critical:** Bugs here = data leaks, unauthorized access

---

## Prerequisites

### 1. Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Firebase Emulator Suite
The emulator should already be configured (via `firebase.json`), but verify:

```bash
firebase emulators:start
```

You should see:
```
✔  All emulators ready! It is now safe to connect your app.
┌─────────────────────────────────────────────────────────────┐
│ ✔  Emulator UI running on http://localhost:4000            │
│ ✔  Firestore emulator running on localhost:8080           │
│ ✔  Authentication emulator running on localhost:9099      │
└─────────────────────────────────────────────────────────────┘
```

---

## Running Integration Tests

### Option 1: From Project Root
```bash
# Terminal 1: Start emulator
firebase emulators:start

# Terminal 2: Run integration tests
npm run test:integration
```

### Option 2: From Functions Directory
```bash
# Terminal 1: Start emulator
firebase emulators:start

# Terminal 2: Run integration tests
cd functions
npm run test:integration
```

---

## Test Configuration

### Why Separate from Unit Tests?

Integration tests are **not** included in the standard `npm test` command because:

1. **Require Firebase Emulator:** Can't run without emulator running
2. **Slower:** Real Firestore operations take longer than mocked tests
3. **Sequential Execution:** Use `--runInBand` to avoid race conditions
4. **Different Purpose:** Integration tests verify system behavior, unit tests verify logic

### NPM Scripts

**Root `package.json`:**
```json
{
  "test": "jest",
  "test:integration": "cd functions && npm run test:integration"
}
```

**Functions `package.json`:**
```json
{
  "test": "jest --testPathIgnorePatterns=integration",
  "test:integration": "jest --testPathPattern=integration --runInBand"
}
```

**What This Does:**
- `npm test` - Runs only unit tests (excludes integration tests)
- `npm run test:integration` - Runs only integration tests sequentially

---

## Test Structure

### Setup File (`setup.ts`)

Provides helper functions for integration tests:

```typescript
// Initialize Firebase Admin SDK for emulator
export const db = admin.firestore();
export const auth = admin.auth();

// Clear Firestore between tests
export async function clearFirestore() { /* ... */ }

// Create test users
export async function createTestUser(uid, email, displayName) { /* ... */ }

// Create test conversations
export async function createTestConversation(id, participants) { /* ... */ }

// Create test messages
export async function createTestMessage(convId, msgId, senderId, text) { /* ... */ }
```

### Test Files

Each integration test file follows this pattern:

```typescript
import { functionToTest } from '../../utils/someUtil';
import { db, clearFirestore, createTestUser } from './setup';

describe('Feature Integration Tests', () => {
  beforeAll(async () => {
    // Create test users/conversations
  });

  beforeEach(async () => {
    // Clear relevant data before each test
  });

  afterAll(async () => {
    // Clean up all test data
  });

  it('should test real behavior', async () => {
    // Test against real Firestore emulator
    const result = await functionToTest(/* ... */);
    
    // Verify actual Firestore state
    const doc = await db.doc('path/to/doc').get();
    expect(doc.data()).toEqual(/* ... */);
  });
});
```

---

## Troubleshooting

### Emulator Not Running
**Error:** `ECONNREFUSED localhost:8080`

**Solution:**
```bash
# Start emulator in separate terminal
firebase emulators:start
```

### Port Already in Use
**Error:** `Port 8080 is already in use`

**Solution:**
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Or use different ports in firebase.json
```

### Tests Failing Due to Stale Data
**Error:** Tests pass individually but fail when run together

**Solution:**
- Ensure `beforeEach` clears relevant data
- Use unique IDs for each test
- Check `clearFirestore()` is working

### Tests Hanging
**Error:** Tests don't complete

**Solution:**
- Ensure all async operations use `await`
- Check for unclosed Firestore listeners
- Verify emulator is running

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install Dependencies
        run: |
          npm install
          cd functions && npm install
      
      - name: Install Firebase CLI
        run: npm install -g firebase-tools
      
      - name: Start Firebase Emulator
        run: firebase emulators:start --only firestore,auth &
        
      - name: Wait for Emulator
        run: sleep 10
      
      - name: Run Integration Tests
        run: npm run test:integration
```

---

## Best Practices

### 1. Use Unique Test Data
```typescript
// Good: Unique IDs per test
const userId = `user-${Date.now()}-${Math.random()}`;

// Bad: Shared IDs across tests
const userId = 'test-user';
```

### 2. Clean Up After Tests
```typescript
afterEach(async () => {
  // Delete test-specific data
  await db.doc(`users/${testUserId}`).delete();
});

afterAll(async () => {
  // Clear all Firestore data
  await clearFirestore();
});
```

### 3. Test Real-World Scenarios
```typescript
// Good: Test concurrent requests (real-world scenario)
it('should handle 10 concurrent requests', async () => {
  const promises = Array(10).fill(null).map(() => 
    checkAIRateLimit('user123', 'search')
  );
  await Promise.all(promises);
  // Verify counter is exactly 10
});

// Bad: Test single request (doesn't catch race conditions)
it('should increment counter', async () => {
  await checkAIRateLimit('user123', 'search');
  // Verify counter is 1
});
```

### 4. Verify Actual Firestore State
```typescript
// Good: Check actual Firestore document
const doc = await db.doc('users/user123/ai_usage/2025-10').get();
expect(doc.data().totalActions).toBe(10);

// Bad: Only check function return value
const result = await checkAIRateLimit('user123', 'search');
expect(result).toBe(true);
```

---

## Performance

**Typical Test Times:**
- Unit tests (140 tests): ~3 seconds
- Integration tests (20 tests): ~5-10 seconds

**Why Slower:**
- Real Firestore operations (not mocked)
- Network calls to emulator
- Sequential execution (`--runInBand`)
- Setup/teardown overhead

**Optimization Tips:**
- Only run integration tests when needed (not on every save)
- Use `test.only()` for debugging specific tests
- Keep integration tests focused (don't test everything)

---

## When to Run Integration Tests

### Always Run:
- ✅ Before deploying to production
- ✅ After modifying rate limiting logic
- ✅ After modifying caching logic
- ✅ After modifying security rules
- ✅ Before merging PRs that touch backend logic

### Optional:
- ⚠️ During local development (unit tests are usually sufficient)
- ⚠️ On every file save (too slow)

---

## Future Enhancements

Potential additions to integration test suite:

1. **Embedding Pipeline Tests**
   - Test batch embedding of messages
   - Verify Pinecone vector storage
   - Test retry queue processing

2. **Cloud Function Trigger Tests**
   - Test `quickPriorityCheckTrigger` on message creation
   - Test `batchAnalyzePriority` scheduled function
   - Test `incrementMessageCounter` trigger

3. **End-to-End AI Feature Tests**
   - Test full summarization flow (fetch → cache → return)
   - Test action item extraction with assignee resolution
   - Test decision tracking with confidence filtering

**Note:** These would require additional setup (Pinecone emulator, Cloud Functions emulator, etc.)

---

## Summary

Integration tests provide **high confidence** that critical backend logic works correctly with real Firestore behavior. They complement unit tests by catching issues that mocks can't detect:

- ✅ Race conditions in transactions
- ✅ Concurrent request handling
- ✅ Real Firestore query behavior
- ✅ Actual error handling

**Run them before deploying to production!**

