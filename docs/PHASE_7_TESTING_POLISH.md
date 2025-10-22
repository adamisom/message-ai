# Phase 7: Testing & Polish

**Estimated Time:** 4-6 hours  
**Goal:** Comprehensive testing, bug fixes, and final polish to ensure the MVP is production-ready

**Prerequisites:** Phases 0-6 complete (all features implemented)

---

## Objectives

By the end of Phase 7, you will have:

- ✅ Verified all core features work end-to-end
- ✅ Fixed all critical bugs and memory leaks
- ✅ Tested edge cases and error handling
- ✅ Verified offline/online behavior
- ✅ Tested on both Android and iOS (if available)
- ✅ Code cleanup (removed debug code, fixed linter/type errors)
- ✅ Documentation updated (README, Firestore rules)
- ✅ App ready for deployment/demo

**Note:** This phase is critical. A feature-complete app that crashes is worse than a limited but stable app. **Prioritize reliability over adding features.**

---

## Testing Strategy

Phase 7 follows a systematic testing approach:

```
1. Core Flow Testing (all primary user journeys)
    ↓
2. Edge Case Testing (offline, network issues, rapid actions)
    ↓
3. Multi-User Testing (2-3 simultaneous users)
    ↓
4. Notification Testing (Phase 6 smoke test)
    ↓
5. Platform Testing (Android + iOS)
    ↓
6. Bug Fixing & Code Cleanup
    ↓
7. Documentation & Final Verification
```

### Critical Focus Areas

1. **Memory Leaks:** Most common cause of crashes (unsubscribed Firestore listeners)
2. **Message Ordering:** Must use server timestamps consistently
3. **Optimistic Updates:** Temp messages must sync correctly
4. **Network Transitions:** Offline → Online must not lose messages
5. **Firestore Rules:** Must be properly configured

---

## Before Starting Phase 7

### Verify All Phases Complete

Quick checklist:

- [ ] Phase 1: Can register, login, logout
- [ ] Phase 2: Can create conversations (direct and group)
- [ ] Phase 3: Can send/receive messages in real-time
- [ ] Phase 4: Group chats show sender names
- [ ] Phase 5: Typing indicators, online status, read receipts work
- [ ] Phase 6: Notifications appear on new messages

**If any phase is incomplete, finish it before starting Phase 7.**

---

## Task 7.1: Core Flow Testing

### Purpose
Verify all primary user flows work without errors from start to finish.

---

### Test 7.1.1: Authentication Flow

**Setup:** Fresh app install

**Steps:**
1. Launch app → Should land on login screen
2. Tap "Register"
3. Enter: email, password, display name
4. Tap "Register" → Should navigate to conversations list
5. Force quit app
6. Relaunch → Should auto-login

**Expected:**
- ✅ Registration succeeds, user doc created in Firestore
- ✅ Session persists after force quit
- ✅ No crashes or infinite loading

---

### Test 7.1.2: User Discovery (Direct Chat)

**Setup:** 2 registered users

**Steps:**
1. User A: Tap "New Chat" → Enter User B's email → "Find User"
2. Should show "✅ User found: [Display Name]"
3. Tap "Create Chat" → Should open chat screen

**Test invalid email:**
1. Enter `nonexistent@example.com` → "Find User"
2. Should show error, button stays disabled

**Expected:**
- ✅ Valid email found, displays name
- ✅ Invalid email shows error
- ✅ Conversation created in Firestore

---

### Test 7.1.3: User Discovery (Group Chat)

**Setup:** 3 registered users (A, B, C)

**Steps:**
1. User A: Toggle to "Group Chat"
2. Add User B → Shows in list
3. Add User C → Shows in list
4. "Create Group" enabled → Tap it

**Test mixed valid/invalid:**
1. Enter invalid email → Error, not added
2. Enter valid email → Added successfully

**Expected:**
- ✅ Both valid users added
- ✅ Invalid emails rejected
- ✅ Group created with 3 participants
- ✅ Header shows "Group (3 members)"

---

### Test 7.1.4: One-on-One Messaging

**Setup:** User A and User B in a conversation

**Steps:**
1. User A: Send "Hello from A"
2. Should appear instantly (optimistic update)
3. User B: Should see in < 1 second
4. User B: Send "Hi from B"
5. User A: Should see in real-time
6. Both force quit and relaunch
7. Messages should persist

**Expected:**
- ✅ Instant optimistic updates
- ✅ Real-time delivery (< 1 second)
- ✅ Messages persist
- ✅ Correct order (chronological)
- ✅ Sent messages right-aligned (blue)
- ✅ Received messages left-aligned (gray)

**Check Firestore:**
- ✅ `createdAt` is server timestamp (not client date)
- ✅ `lastMessage` and `lastMessageAt` updated

---

### Test 7.1.5: Group Messaging

**Setup:** User A, B, C in a group

**Steps:**
1. User A: Send "Hello group!"
2. User B and C: See with "User A" as sender name
3. User B: Send "Hi everyone"
4. User A and C: See with "User B" as sender name
5. All force quit and relaunch
6. Messages persist

**Expected:**
- ✅ All participants receive in real-time
- ✅ Sender names correct (others' messages only)
- ✅ Own messages don't show sender name
- ✅ Messages persist
- ✅ Header shows participant count

---

### Test 7.1.6: Conversation List Updates

**Setup:** User A with multiple conversations

**Steps:**
1. Create conversation with User B (send 1 message)
2. Create conversation with User C (send 1 message)
3. Go to "Chats" tab → Both listed
4. User B sends new message
5. Conversation with User B moves to top
6. Last message preview updates

**Expected:**
- ✅ Sorted by `lastMessageAt` (most recent first)
- ✅ Last message preview updates in real-time
- ✅ New message brings conversation to top

---

## Task 7.2: Offline & Network Testing

### Purpose
Verify the app handles network issues gracefully.

---

### Test 7.2.1: Send Message While Offline

**Steps:**
1. User A: Enable airplane mode
2. "Offline" banner appears
3. Send message "Offline message"
4. Shows "queued" or "sending" status
5. Disable airplane mode
6. Status changes to "sent"
7. User B receives message

**Expected:**
- ✅ Offline banner appears
- ✅ Message persists locally
- ✅ Syncs after reconnect
- ✅ No crashes

---

### Test 7.2.2: Receive Messages While Offline

**Steps:**
1. User A: Enable airplane mode
2. User B: Send "You're offline"
3. User A: Doesn't see yet
4. User A: Disable airplane mode
5. Message appears immediately

**Expected:**
- ✅ Messages don't appear while offline
- ✅ Appear instantly after reconnect
- ✅ Order preserved

---

### Test 7.2.3: Network State Banner

**Steps:**
1. Enable airplane mode → Banner appears
2. Disable airplane mode → Banner disappears

**Expected:**
- ✅ Banner shows/hides correctly
- ✅ Doesn't block UI

---

## Task 7.3: Real-Time Features Testing

### Purpose
Verify Phase 5 features work correctly.

---

### Test 7.3.1: Typing Indicators

**Direct Chat:**
1. User B: Start typing (don't send)
2. User A: See "User B is typing..."
3. User B: Stop typing 500ms → Disappears
4. User B: Type and send → Disappears immediately

**Group Chat:**
1. User B and C: Both type
2. User A: See "2 people are typing..."

**Expected:**
- ✅ Appears when other user types
- ✅ Disappears after 500ms inactivity
- ✅ Disappears on send
- ✅ Multiple users shown correctly

---

### Test 7.3.2: Online/Offline Status

**Steps:**
1. User B: App open (foreground)
2. User A: Open chat → Shows "Online" or green dot
3. User B: Put in background
4. User A: Status changes to "Last seen just now"
5. Wait 1 minute → "Last seen 1m ago"

**Expected:**
- ✅ Online status when active
- ✅ Offline status when backgrounded
- ✅ "Last seen" timestamp updates
- ✅ Human-readable format ("2m ago", "5h ago")

---

### Test 7.3.3: Read Receipts (Direct Chat)

**Steps:**
1. User A: Send "Read receipt test"
2. Shows single checkmark ✓ (sent)
3. User B: Open conversation
4. User A: Checkmark changes to ✓✓ (read)

**Expected:**
- ✅ Single checkmark when sent
- ✅ Double checkmark when read
- ✅ Only sender sees checkmarks

---

### Test 7.3.4: Read Receipts (Group Chat)

**Steps:**
1. User A: Send "Group read test" → Shows ✓
2. User B: Open conversation → Updates
3. User C: Open conversation → Shows ✓✓ (all read)

**Expected:**
- ✅ Single checkmark initially
- ✅ Double checkmark when all read

**Note:** Simple ✓/✓✓ only. Detailed "Read by Alice, Bob" is Post-MVP.

---

## Task 7.4: Edge Cases & Stress Testing

### Purpose
Test uncommon scenarios users might encounter.

---

### Test 7.4.1: Rapid Message Sending

**Steps:**
1. User A: Send 20 messages rapidly (10 seconds)
2. All appear in correct order
3. User B: Receives all 20 in order

**Expected:**
- ✅ No messages lost
- ✅ Order preserved
- ✅ No crashes
- ✅ Optimistic updates work

---

### Test 7.4.2: Long Messages

**Steps:**
1. User A: Send 500-character message
2. Displays correctly (wrapped text)
3. User B: Receives full message

**Expected:**
- ✅ Text wraps properly in bubble
- ✅ No truncation
- ✅ Input handles multiline (max 1000 chars)

---

### Test 7.4.3: Empty Conversation List

**Steps:**
1. Register new user
2. Go to "Chats" tab

**Expected:**
- ✅ Empty state message displayed (not blank screen)
- ✅ No crashes

---

### Test 7.4.4: Conversation with 100+ Messages

**Steps:**
1. Send 110 messages between User A and B
2. Open conversation → Last 100 load

**Expected:**
- ✅ Last 100 messages load
- ✅ Performance acceptable (no lag)
- ✅ Correct order

---

### Test 7.4.5: Rapid Screen Navigation

**Steps:**
1. User A: Tap conversation → back → different conversation
2. Repeat 10 times rapidly

**Expected:**
- ✅ No crashes
- ✅ No "memory leak" warnings
- ✅ Each conversation loads correctly

**Critical:** All Firestore listeners must have cleanup (`return unsubscribe;`)

---

### Test 7.4.6: App Force Quit During Message Send

**Steps:**
1. User A: Enable airplane mode
2. Send "Force quit test" → Shows "queued"
3. Force quit app
4. Disable airplane mode → Relaunch app
5. Open conversation → Message still there

**Expected:**
- ✅ Message persists locally
- ✅ Syncs after relaunch + reconnect

---

## Task 7.5: Multi-User Testing

### Purpose
Test with 2-3 simultaneous users.

---

### Test 7.5.1: Three-User Group Chat

**Steps:**
1. All three users open group chat
2. Each user sends a message
3. All see all messages in real-time

**Expected:**
- ✅ All messages appear on all devices
- ✅ Sender names correct
- ✅ Order consistent across devices

---

### Test 7.5.2: Simultaneous Sends

**Steps:**
1. User A and B: Send at exact same time
2. Both messages appear

**Expected:**
- ✅ No messages lost
- ✅ Order consistent (server timestamp)

---

## Task 7.6: Notification Testing

### Purpose
Verify Phase 6 notifications work correctly.

---

**Run the complete Phase 6 smoke test:**

```bash
# Reference: /docs/PHASE_6_SMOKE_TEST.md
```

**Quick summary:**
1. ✅ Permission request on first launch
2. ✅ Notifications appear when app is backgrounded
3. ✅ Tapping notification navigates to conversation
4. ✅ No notification for own messages
5. ✅ No notification when app is in foreground
6. ✅ Group chat notifications work
7. ✅ Long messages truncated

**If all 7 tests pass, Task 7.6 is complete.**

**Note:** Our implementation shows notifications **only when app is backgrounded** (not when on different screens). This is intentional for MVP.

---

## Task 7.7: Platform-Specific Testing

### Purpose
Test on both Android and iOS.

---

### Android Emulator

**Steps:**
1. `npx expo start --android`
2. Run Tests 7.1-7.6

**Check:**
- ✅ KeyboardAvoidingView works
- ✅ Notification channel created
- ✅ Back button behavior works

---

### iOS Simulator (macOS Only)

**Steps:**
1. `npx expo start --ios`
2. Run Tests 7.1-7.6

**Check:**
- ✅ KeyboardAvoidingView works
- ✅ Safe areas respected
- ✅ Status bar doesn't overlap

---

## Task 7.8: Bug Fixing Checklist

### Purpose
Fix common issues before final verification.

---

### 1. Memory Leaks

**Check all Firestore listeners have cleanup:**

```bash
grep -r "onSnapshot" app/
```

**For each `onSnapshot`:**
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(/*...*/);
  return unsubscribe;  // MUST BE PRESENT
}, []);
```

**Files to check:**
- `app/chat/[id].tsx` (messages, typing, conversation, presence)
- `app/(tabs)/index.tsx` (conversations list)
- `app/_layout.tsx` (notification listeners)

---

### 2. Server Timestamps

**Check for client-side Date():**

```bash
grep -r "new Date()" app/ services/
```

**Rule:** All Firestore timestamps MUST use `serverTimestamp()`

```typescript
// ✅ Correct
createdAt: serverTimestamp()

// ❌ Wrong - breaks ordering
createdAt: new Date()
```

---

### 3. Console Errors

**Steps:**
1. Open Metro bundler terminal
2. Run through all core flows
3. Fix all red errors

Common issues:
- Missing dependencies in `useEffect`
- Accessing undefined properties
- Type errors

---

### 4. Linter & TypeScript

**Run validation:**

```bash
npm run validate
```

**Fix all errors before proceeding.**

---

### 5. Verify Empty/Loading States Exist

**Check these are present:**
- Conversations list empty state
- Login/Register loading indicators
- Message list initial load indicator
- User lookup "Finding user..." state

**Note:** Don't add new ones, just verify existing ones work.

---

### 6. Verify User-Friendly Error Messages

**Check these show friendly errors:**
- Login fails: "Invalid email or password"
- Register fails: "Email already in use"
- User not found: "No user found with that email"

**Avoid raw Firebase errors like:** `"auth/user-not-found"`

---

## Task 7.9: Code Cleanup

### Purpose
Clean up code for readability.

---

### Cleanup Checklist

**Remove:**
- Debug-only `console.log()` (e.g., "TESTING 123")
- Commented-out code blocks
- Test/dummy data
- Unused imports

**Keep:**
- `console.error()` for real errors
- `console.warn()` for important warnings
- `console.log()` with emoji prefixes (helpful for debugging)

**Fix:**
```bash
npm run lint -- --fix
```

**Check for `any` types:**
```bash
grep -r ": any" app/ components/ services/ store/
```

Replace with specific types where possible.

---

## Task 7.10: Documentation

### Purpose
Update documentation for deployment.

---

### 1. Update README.md

Create or update with:

```markdown
# MessageAI MVP

Real-time messaging app built with React Native (Expo) + Firebase.

## Features

- ✅ User authentication (email/password)
- ✅ One-on-one messaging
- ✅ Group chat (3+ users)
- ✅ Real-time message delivery
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Read receipts
- ✅ Local notifications
- ✅ Offline support

## Tech Stack

- **Frontend:** React Native (Expo SDK 54)
- **Backend:** Firebase (Auth + Firestore)
- **State:** Zustand + AsyncStorage
- **Navigation:** Expo Router

## Setup

### Prerequisites

- Node.js 20.19.4+
- Expo CLI
- Firebase account

### Installation

\`\`\`bash
git clone <repo>
cd message-ai
npm install
\`\`\`

### Configure Firebase

1. Create Firebase project
2. Enable Email/Password auth
3. Create Firestore database
4. Copy config to `.env`:

\`\`\`
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
\`\`\`

### Deploy Firestore Rules

See `firestore.rules` → Deploy via Firebase Console

### Run

\`\`\`bash
npx expo start
\`\`\`

## Testing

\`\`\`bash
npm run validate  # Lint + type-check + tests
npm test          # Run tests only
\`\`\`

## Known MVP Limitations

- Local notifications only (requires background app)
- No message editing/deletion
- No media uploads (text-only)
- Last 100 messages per conversation

## License

MIT
```

---

### 2. Create .env.example

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

### 3. Create/Verify firestore.rules

**File:** `/firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users: read all, write own
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    
    // Conversations: participants only
    match /conversations/{conversationId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      allow update: if request.auth.uid in resource.data.participants;
    }
    
    // Messages: check denormalized participants
    match /conversations/{conversationId}/messages/{messageId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && 
                      request.auth.uid in request.resource.data.participants;
    }
    
    // Typing indicators
    match /conversations/{conversationId}/typingUsers/{userId} {
      allow read, write: if request.auth != null && 
                           request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
    }
  }
}
```

**Deploy:**
1. Firebase Console → Firestore → Rules
2. Paste rules above
3. Click "Publish"

**Note:** Only deploy when ready. Keep test mode during development.

---

## Task 7.11: Final Verification

### Purpose
Last comprehensive check before declaring MVP complete.

---

### Final Checklist

#### Must-Have Features (All Must Work)

- [ ] ✅ User can register
- [ ] ✅ User can login
- [ ] ✅ Session persists after restart
- [ ] ✅ Can find users by email
- [ ] ✅ Can create 1-on-1 chat
- [ ] ✅ Can create group chat (2+ users)
- [ ] ✅ Can send message in direct chat
- [ ] ✅ Can send message in group chat
- [ ] ✅ Messages appear in real-time (< 1 second)
- [ ] ✅ Messages persist across restarts
- [ ] ✅ Optimistic UI updates work
- [ ] ✅ Offline queuing works
- [ ] ✅ Last 100 messages load per conversation

#### Should-Have Features (Important)

- [ ] ✅ Typing indicators work
- [ ] ✅ Online/offline status works
- [ ] ✅ "Last seen" timestamps show
- [ ] ✅ Read receipts work (✓/✓✓)
- [ ] ✅ Network detection (offline banner)
- [ ] ✅ Local notifications appear
- [ ] ✅ Tapping notification navigates correctly

#### Technical Requirements

- [ ] ✅ No memory leaks (all listeners cleaned up)
- [ ] ✅ No crashes
- [ ] ✅ All Firestore timestamps use `serverTimestamp()`
- [ ] ✅ All error states handled
- [ ] ✅ No console errors
- [ ] ✅ `npm run validate` passes
- [ ] ✅ Works on Android
- [ ] ✅ Works on iOS (if macOS available)

#### Documentation

- [ ] ✅ `README.md` updated
- [ ] ✅ `.env.example` created
- [ ] ✅ `firestore.rules` ready to deploy
- [ ] ✅ `.gitignore` includes `.env`
- [ ] ✅ No sensitive data in git

---

## Common Issues & Solutions

### App Crashes on Navigation
**Cause:** Memory leak from unsubscribed listeners  
**Fix:** Check all `useEffect` with `onSnapshot` have `return unsubscribe;`

### Messages Out of Order
**Cause:** Client timestamps  
**Fix:** Replace all `new Date()` with `serverTimestamp()`

### Offline Messages Don't Sync
**Cause:** Firestore persistence not configured  
**Fix:** Check `firebase.config.ts` has offline persistence enabled

### Notifications Don't Appear
**Cause:** Permissions denied or handler not configured  
**Fix:** Verify notification setup in `app/_layout.tsx`

---

## Summary

**Phase 7 Complete When:**

- ✅ All core flows tested and working
- ✅ All edge cases handled
- ✅ Real-time features functional
- ✅ Notifications working
- ✅ Multi-user testing passed
- ✅ Platform testing passed
- ✅ All bugs fixed
- ✅ Code cleaned up
- ✅ Documentation complete
- ✅ Final verification 100% complete

**Time Investment:** 4-6 hours  
**Output:** Production-ready MVP

---

## Commit & Deploy

### Commit Your Work

```bash
git add .
git commit -m "feat: complete Phase 7 - testing, bug fixes, and polish

Phase 7 Deliverables:
- ✅ Comprehensive testing (all core flows, edge cases, multi-user)
- ✅ Platform testing (Android + iOS)
- ✅ Bug fixes (memory leaks, timestamps, error handling)
- ✅ Code cleanup (removed debug code, fixed linter/type errors)
- ✅ Documentation (README, .env.example, Firestore rules)
- ✅ Final verification complete

MVP Status: READY FOR DEPLOYMENT"
```

### Update Progress Tracker

Check off Phase 7 in `/docs/PROGRESS_TRACKER.md`

---

## Congratulations! 🎉

**Your MVP is complete:**

- ✅ Production-quality messaging app
- ✅ Real-time sync with Firebase
- ✅ Offline support
- ✅ Typing indicators, presence, read receipts
- ✅ Local notifications
- ✅ Thoroughly tested
- ✅ Fully documented

**Ready to demo and deploy!** 🚀
