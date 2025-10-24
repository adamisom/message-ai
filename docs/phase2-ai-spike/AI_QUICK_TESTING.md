# AI Features - Quick Smoke Tests

**Purpose:** Fast manual testing to verify all 5 AI features work end-to-end.  
**Time:** ~20 minutes

---

## Setup (8 minutes)

1. **Deploy Backend:**

   ```bash
   firebase deploy --only functions,firestore:indexes,firestore:rules
   ```

2. **Populate Test Data:**

   ```bash
   node scripts/populateTestData.js
   ```

   Save the conversation IDs printed at the end.

3. **Wait 10 minutes** for message embeddings to process (required for semantic search).

4. **Run App:**

   ```bash
   npx expo start --tunnel
   ```

5. **Start Android Emulator (optional):**

   ```bash
   # Starts the first available Android emulator
   ~/Library/Android/sdk/emulator/emulator -avd $(~/Library/Android/sdk/emulator/emulator -list-avds | head -n 1) &
   ```

   **Then in Expo terminal:**
   - Press `a` to open app on Android
   - Expo Go will install automatically on first run
   - The app should load in Expo Go on the emulator

   **To restart emulator if stuck:**

   `~/Library/Android/sdk/platform-tools/adb emu kill` # stop emulator, then run the start command again (see above)
  
   **To reload app in emulator:**

   - Press `r` in Expo terminal to reload
   - Or press `Cmd + M` in emulator to open dev menu → Reload
   - Or restart Expo with `npx expo start --tunnel --clear`

6. **Open on iPhone:**
   - Scan the QR code from terminal with your iPhone camera
   - Opens in Expo Go app

7. **Login** as one of your test users and open a test conversation.

---

## Feature Tests (10 minutes)

### 1. Priority Detection ⚡ (Auto-runs)

**Test:** Send messages with different priorities

1. Send: `URGENT: Server is down!!!`
   - [ ] **Instantly** see 🔴 red badge next to message

2. Send: `lol thanks`
   - [ ] **No badge** (low priority, expected)

3. Send: `Meeting at 3pm today`
   - [ ] **No badge** or 🟡 yellow badge (medium/unknown)

**✅ Pass:** High priority shows red badge, low priority shows nothing

---

### 2. Semantic Search 🔍

**Open:** AI menu (✨ sparkles icon) → Search Messages

**Test 1: Basic Search**

- Type: `urgent` → Search
  - [ ] Results appear in < 3 seconds
  - [ ] Shows messages with "urgent" or similar
  - [ ] Each result shows: sender, date, preview, match %

**Test 2: No Results**

- Type: `xyzabc123notfound` → Search
  - [ ] Shows "No messages found" (no crash)

**Test 3: Recent Message (Local Search)**

- Send new message: `elephantTest123`
- Immediately search for: `elephantTest123`
  - [ ] Result appears with "📍 Recent" badge

**Test 4: Jump to Message**

- Search for any message → Tap result
  - [ ] Modal closes, scrolls to message, highlights it for 2 seconds

**✅ Pass:** Search works, handles errors, jump-to-message works

---

### 3. Thread Summarization 📝

**Open:** AI menu → Summarize Thread

**Test 1: Generate Summary**

- Select **50 messages** → Wait
  - [ ] Loading: "Analyzing 50 messages..."
  - [ ] After 3 seconds: "Still working on it..." (progressive loading)
  - [ ] Summary appears in < 30 seconds
  - [ ] Shows 2-4 sentence summary
  - [ ] Shows 3-10 key points
  - [ ] Footer: "Summary generated from 50 messages"

**Test 2: Caching**

- Close modal → Reopen → Select **50 messages**
  - [ ] Summary appears **instantly** (< 1 second, cached)

**Test 3: Different Message Count**

- Select **25 messages** → Wait
  - [ ] New summary generated (different from 50-message summary)

**✅ Pass:** Summary generates, caching works, different counts work

---

### 4. Action Items ✅

**Open:** AI menu → Action Items

**Test 1: Extraction**

- Wait for extraction
  - [ ] Loading: "Scanning for action items..."
  - [ ] Items appear in < 30 seconds
  - [ ] Each item shows: text, checkbox, priority color, assignee (if any)

**Test 2: Toggle Completion**

- Tap checkbox on pending item
  - [ ] Checkbox fills instantly (optimistic update)
  - [ ] Text gets strikethrough
  - [ ] Color changes to gray

**Test 3: Persistence**

- Close modal → Reopen
  - [ ] Completed item still shows as completed
  - [ ] Status persisted to Firestore

**Test 4: Uncomplete**

- Tap checkbox on completed item
  - [ ] Checkbox empties, strikethrough removed

**Test 5: Empty State**

- Use conversation with no action items (e.g., "Casual Weekend Chat")
  - [ ] Shows ✓ icon, "No action items found"

**✅ Pass:** Items extracted, checkboxes work, persistence works

---

### 5. Decisions 💡 (Group Chats Only)

**Open:** AI menu → Decisions

**Test 1: Visibility**

- In **direct chat**: Menu shows 4 items (no Decisions)
- In **group chat**: Menu shows 5 items (includes Decisions)

**Test 2: Extraction (Group Chat)**

- Open Decisions in group chat
  - [ ] Loading: "Analyzing decisions..."
  - [ ] Decisions appear in < 30 seconds
  - [ ] Each shows: date, decision text, context, confidence %, participant count
  - [ ] Timeline UI (dots and lines) visible
  - [ ] Confidence colors: 90%+=green, 80-89%=light green, <80%=orange

**Test 3: Empty State**

- Use conversation with no clear decisions
  - [ ] Shows 💡 icon, "No decisions found"

**✅ Pass:** Only in group chats, extracts correctly, timeline displays

---

## Error Handling (2 minutes)

### Network Errors

1. Turn on **Airplane Mode**
2. Try any AI feature
   - [ ] Error: "Network error. Please check your connection..."
   - [ ] **Retry button** appears
3. Turn off Airplane Mode → Tap Retry
   - [ ] Feature works

**✅ Pass:** Errors handled gracefully with retry

---

### Progressive Loading

1. Open **Summarize Thread** (with slow/normal connection)
   - [ ] 0-3 seconds: "This may take a few seconds"
   - [ ] 3+ seconds: "Still working on it, thanks for your patience..."

**✅ Pass:** Loading message updates after 3 seconds

---

### Modal Behavior

1. Open AI menu → Tap Search
   - [ ] Menu closes, Search opens (no overlap)
2. Close Search → Open AI menu → Tap Cancel
   - [ ] Menu closes smoothly
3. Rapidly open/close modals
   - [ ] No crashes or UI glitches

**✅ Pass:** Modals transition smoothly

---

## Integration Tests (Optional)

**Run automated integration tests against Firebase emulator:**

```bash
# Terminal 1: Start emulator
firebase emulators:start

# Terminal 2: Run tests  
npm run test:integration
```

**Expected:** ~20 tests pass, verifying:

- Rate limiting (concurrent requests, hourly/monthly limits, hour resets)
- Caching (hits/misses, age/message-count invalidation)
- Security (access control, participant verification, result filtering)

See `docs/phase2-ai-spike/INTEGRATION_TESTS.md` for details.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **No search results?** | Wait 10 minutes after sending messages for embeddings to process. Check Pinecone dashboard for vector count. |
| **"AI feature not available"?** | Deploy functions: `firebase deploy --only functions` |
| **"Rate limit exceeded"?** | Hit 50/hour or 1000/month limit. Wait or clear usage doc in Firestore. |
| **Functions timeout?** | Check API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, PINECONE_API_KEY). Check Firebase logs: `firebase functions:log` |
| **"FAILED_PRECONDITION"?** | Deploy indexes: `firebase deploy --only firestore:indexes` (wait 5-10 min to build) |
| **Decisions not showing?** | Only visible in group chats (3+ participants). Check conversation type. |
| **Action items not persisting?** | Check Firestore rules deployed. Check browser console for errors. |

---

## Checklist Summary

After all tests:

- [ ] Priority badges appear on high/medium messages
- [ ] Search works (semantic + local fallback)
- [ ] Jump-to-message highlights correctly
- [ ] Summary generates and caches
- [ ] Action items extract and checkboxes work
- [ ] Decisions only show in group chats
- [ ] Progressive loading works (3-second update)
- [ ] Network errors show retry button
- [ ] No crashes during entire session
- [ ] Performance acceptable (< 30 seconds per feature)

---

## Full Testing Guides

For comprehensive testing:

- **Frontend (Detailed):** `docs/phase2-ai-spike/FRONTEND_TESTING_GUIDE.md` - 7 parts, 400+ checks
- **Backend (Detailed):** `docs/phase2-ai-spike/BACKEND_TESTING_GUIDE.md` - curl commands, verification
- **Integration Tests:** `docs/phase2-ai-spike/INTEGRATION_TESTS.md` - automated emulator tests

---

## Next Steps

✅ **All tests pass?** Ready for production deployment!

📝 **Found bugs?** Report with:

```
Feature: [Search/Summary/Action Items/Decisions/Priority]
Steps: 1. ... 2. ... 3. ...
Expected: [What should happen]
Actual: [What happened]
Device: [iOS/Android, version]
```
