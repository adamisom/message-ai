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
   - **If stuck loading:** Close Expo Go, return to home screen, reopen Expo Go manually, and enter the `exp://` URL directly (shown in Expo terminal) instead of using `a` - more reliable with tunnel due to WebSocket/adb issues

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

**Test in this order (easiest → complex):**

### 1. Priority Detection ⚡ (Auto-runs)

Send messages with different priorities:

- Send: `URGENT: Server is down!!!` → [ ] See 🔴 red badge instantly
- Send: `lol thanks` → [ ] No badge (low priority, expected)

---

### 2. Action Items ✅

**Open:** AI menu (✨ sparkles icon) → Action Items

- [ ] Items extract in < 30 seconds
- [ ] Tap checkbox → fills instantly, text strikes through
- [ ] Close/reopen modal → status persists

---

### 3. Thread Summarization 📝

**Open:** AI menu → Summarize Thread → Select **50 messages**

- [ ] Summary appears in < 30 seconds with key points
- [ ] Close/reopen → Summary appears **instantly** (cached)

---

### 4. Decisions 💡 (Group Chats Only)

**Open:** AI menu → Decisions (only in group chat with 3+ people)

- [ ] Decisions extract in < 30 seconds with timeline UI
- [ ] Each shows date, text, confidence %, participant count

---

### 5. Semantic Search 🔍 (Requires 10-min wait for embeddings)

**Open:** AI menu → Search Messages

- Type: `urgent` → [ ] Results appear in < 3 seconds
- Send new message `elephantTest123`, search it → [ ] Shows "📍 Recent" badge

---

## Error Handling (2 minutes)

- **Airplane mode test:** Enable airplane mode → Try AI feature → [ ] Shows error with retry button
- **Progressive loading:** Open Summary → [ ] Loading message updates after 3 seconds  
- **Modal behavior:** Rapidly open/close modals → [ ] No crashes or UI glitches

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
