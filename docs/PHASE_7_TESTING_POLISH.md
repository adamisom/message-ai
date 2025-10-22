# Phase 7: Testing & Polish

**Estimated Time:** 3-5 hours  
**Goal:** Comprehensive end-to-end testing, bug fixes, edge case handling, and final polish to ensure the MVP is production-ready

**Prerequisites:** Phase 0, 1, 2, 3, 4, 5, and 6 must be complete (all core features implemented)

---

## Objectives

By the end of Phase 7, you will have:

- ✅ Verified all core features work end-to-end
- ✅ Fixed all critical bugs and memory leaks
- ✅ Tested edge cases and error handling
- ✅ Verified offline/online behavior
- ✅ Tested on both Android and iOS (if available)
- ✅ Code cleanup (no console.logs, type errors, linter errors)
- ✅ Documentation updated (README, setup instructions)
- ✅ App ready for deployment/demo

**Note:** This phase is critical. A feature-complete app that crashes is worse than a limited but stable app. **Prioritize reliability over adding features.**

---

## Architecture Overview

### Testing Strategy

Phase 7 follows a **systematic testing pyramid**:

```
1. Manual End-to-End Testing (Core Flows)
    ↓
2. Edge Case Testing (Offline, Network Issues, Rapid Actions)
    ↓
3. Multi-User Testing (2-3 simultaneous users)
    ↓
4. Platform Testing (Android + iOS)
    ↓
5. Bug Fixing & Code Cleanup
    ↓
6. Final Verification & Documentation
```

### Critical Focus Areas

**Reference:** See mvp-prd-plus.md Section 9 for comprehensive risk mitigation

1. **Memory Leaks:** Most common cause of crashes (unsubscribed listeners)
2. **Message Ordering:** Must use server timestamps consistently
3. **Optimistic Updates:** Temp messages must sync correctly
4. **Network Transitions:** Offline → Online must not lose messages
5. **Firestore Rules:** Must be deployed and working

---

## Before Starting Phase 7

### Verify All Phases Complete

Run through this quick checklist:

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

**Setup:** Fresh app install (clear app data or uninstall/reinstall)

**Steps:**
1. Launch app
2. Should land on login screen (no saved session)
3. Tap "Register" link
4. Enter:
   - Email: `test1@example.com`
   - Password: `password123`
   - Display Name: `Test User 1`
5. Tap "Register"
6. Should navigate to conversations list (empty state)
7. Force quit app (swipe away from recent apps)
8. Relaunch app
9. Should automatically login and show conversations list

**Expected Results:**
- ✅ Registration succeeds
- ✅ User document created in Firestore (`/users/[uid]`)
- ✅ Auto-login after registration
- ✅ Session persists after force quit
- ✅ No "loading forever" state
- ✅ No crashes

**Common Issues:**
- Session doesn't persist → Check AsyncStorage is working
- User stuck on login screen → Check `restoreSession()` runs on mount
- Registration fails → Check Firestore rules allow `create` for authenticated users

---

### Test 7.1.2: User Discovery (Direct Chat)

**Setup:** 2 registered users (register another user in separate emulator/device)

**Steps:**
1. **User A:** Tap "New Chat" tab
2. **User A:** Toggle should be "Direct Chat" (default)
3. **User A:** Enter User B's email
4. **User A:** Tap "Find User"
5. Should show "✅ User found: [Display Name]"
6. **User A:** Tap "Create Chat"
7. Should navigate to chat screen with User B

**Expected Results:**
- ✅ Valid email found successfully
- ✅ Display name shown for validation
- ✅ Chat screen opens
- ✅ Header shows User B's display name (from Phase 3)
- ✅ Conversation created in Firestore (`/conversations/[id]`)

**Test Invalid Email:**
1. **User A:** Enter `nonexistent@example.com`
2. **User A:** Tap "Find User"
3. Should show error: "No user found with that email"
4. "Create Chat" button stays disabled

**Expected Results:**
- ✅ Error message displayed
- ✅ No navigation
- ✅ Can try again with different email

---

### Test 7.1.3: User Discovery (Group Chat)

**Setup:** 3 registered users (User A, User B, User C)

**Steps:**
1. **User A:** Tap "New Chat" tab
2. **User A:** Toggle to "Group Chat"
3. **User A:** Enter User B's email → Tap "Add User"
4. Should show "✅ [User B Display Name]" in valid users list
5. **User A:** Enter User C's email → Tap "Add User"
6. Should show "✅ [User C Display Name]" in valid users list
7. "Create Group" button should now be enabled (2+ users)
8. **User A:** Tap "Create Group"
9. Should navigate to group chat screen

**Expected Results:**
- ✅ Both users added to list
- ✅ Group created with 3 participants (A, B, C)
- ✅ Conversation type is `group`
- ✅ Header shows "Group (3 members)" (from Phase 4)

**Test Mixed Valid/Invalid:**
1. **User A:** Enter `invalid@example.com` → Tap "Add User"
2. Should show error, NOT added to list
3. **User A:** Enter User B's email → Tap "Add User"
4. Should add User B successfully
5. Can still create group with only valid users

**Expected Results:**
- ✅ Invalid emails rejected
- ✅ Valid emails added
- ✅ Can proceed with valid users only

---

### Test 7.1.4: One-on-One Messaging

**Setup:** User A and User B in a direct chat

**Steps:**
1. **User A:** Send message "Hello from A"
2. Message should appear instantly on User A's screen (optimistic update)
3. **User B:** Should see "Hello from A" appear in real-time (< 1 second)
4. **User B:** Send message "Hi from B"
5. **User A:** Should see "Hi from B" in real-time
6. **User A:** Force quit app
7. **User A:** Relaunch app → Open same conversation
8. Both messages should still be visible

**Expected Results:**
- ✅ Messages appear instantly for sender (optimistic)
- ✅ Messages appear on recipient in < 1 second
- ✅ Messages persist after app restart
- ✅ Message order is correct (chronological)
- ✅ Timestamps display correctly
- ✅ Sent messages aligned right (blue)
- ✅ Received messages aligned left (gray)

**Check Firestore:**
- ✅ Messages exist in `/conversations/[id]/messages/`
- ✅ `createdAt` is server timestamp (not client date)
- ✅ `participants` array includes both User A and User B
- ✅ Conversation's `lastMessage` and `lastMessageAt` updated

---

### Test 7.1.5: Group Messaging

**Setup:** User A, User B, User C in a group chat

**Steps:**
1. **User A:** Send message "Hello group!"
2. **User B and User C:** Should see message appear with "User A" as sender name
3. **User B:** Send message "Hi everyone"
4. **User A and User C:** Should see message with "User B" as sender name
5. All three users force quit and relaunch
6. All messages should persist

**Expected Results:**
- ✅ All participants receive messages in real-time
- ✅ Sender names display correctly above each message (from Phase 4)
- ✅ Own messages don't show sender name (right-aligned, blue)
- ✅ Others' messages show sender name (left-aligned, gray)
- ✅ Messages persist across restarts
- ✅ Group header shows participant count

---

### Test 7.1.6: Conversation List Updates

**Setup:** User A with multiple conversations

**Steps:**
1. **User A:** Create conversation with User B (send 1 message)
2. **User A:** Create conversation with User C (send 1 message)
3. **User A:** Go to "Chats" tab
4. Should see both conversations listed
5. **User B:** Send message "New message from B"
6. **User A:** Check "Chats" tab
7. Conversation with User B should move to top
8. Last message preview should update to "New message from B"

**Expected Results:**
- ✅ Conversations list shows all conversations
- ✅ Sorted by `lastMessageAt` (most recent first)
- ✅ Last message preview updates in real-time
- ✅ Timestamp updates
- ✅ New message brings conversation to top

---

## Task 7.2: Offline & Network Testing

### Purpose

Verify the app handles network issues gracefully without crashes or data loss.

---

### Test 7.2.1: Send Message While Offline

**Setup:** User A and User B in a conversation

**Steps:**
1. **User A:** Enable airplane mode (or turn off WiFi/data)
2. Check for "Offline" banner at top of screen (from Phase 3)
3. **User A:** Type and send message "Offline message"
4. Message should appear immediately with "queued" or "sending" status
5. Message should NOT disappear
6. **User A:** Disable airplane mode (turn WiFi/data back on)
7. Message status should change to "sent"
8. **User B:** Should see "Offline message" appear after User A reconnects

**Expected Results:**
- ✅ Offline banner appears
- ✅ Message shows "queued" or "sending" status
- ✅ Message persists locally (doesn't disappear)
- ✅ Message syncs to Firestore after reconnect
- ✅ Recipient receives message
- ✅ No crashes during network state change

**Firestore Behavior:**
- Firestore's offline persistence queues the write
- Message will sync automatically when network restored
- `onSnapshot` listeners will fire once synced

---

### Test 7.2.2: Receive Messages While Offline

**Setup:** User A and User B in a conversation

**Steps:**
1. **User A:** Enable airplane mode
2. **User B:** Send message "You're offline"
3. **User A:** Should NOT see message yet (offline)
4. **User A:** Disable airplane mode
5. **User A:** Message "You're offline" should appear immediately

**Expected Results:**
- ✅ Messages don't appear while offline
- ✅ Messages appear instantly after reconnect
- ✅ No crashes
- ✅ Message order preserved

---

### Test 7.2.3: Message Timeout Detection

**Setup:** User A in a conversation

**Steps:**
1. **User A:** Enable airplane mode
2. **User A:** Send message "Timeout test"
3. Wait 10 seconds (default timeout from Phase 3)
4. Message status should change to "failed" (if timeout logic implemented)

**Expected Results:**
- ✅ Message doesn't stay "sending" forever
- ✅ Failed status shown (or remains "queued")
- ✅ Message still syncs when network restored

**Note:** If you implemented 10-second timeout in Phase 3, verify it works. If not, messages will stay "queued" indefinitely (acceptable for MVP).

---

### Test 7.2.4: Network State Banner

**Setup:** Any screen in the app

**Steps:**
1. Enable airplane mode
2. "Offline" banner should appear at top
3. Disable airplane mode
4. Banner should disappear

**Expected Results:**
- ✅ Banner appears when offline
- ✅ Banner disappears when online
- ✅ Banner doesn't block UI

---

## Task 7.3: Real-Time Features Testing

### Purpose

Verify Phase 5 features (typing indicators, presence, read receipts) work correctly.

---

### Test 7.3.1: Typing Indicators

**Setup:** User A and User B in a conversation

**Steps:**
1. **User B:** Start typing in message input (don't send)
2. **User A:** Should see "User B is typing..." below message list (from Phase 5)
3. **User B:** Stop typing for 500ms
4. **User A:** Typing indicator should disappear
5. **User B:** Start typing again, then tap send
6. **User A:** Typing indicator should disappear immediately

**Expected Results:**
- ✅ Typing indicator appears when other user types
- ✅ Shows correct user name
- ✅ Disappears after 500ms of inactivity
- ✅ Disappears immediately on send
- ✅ Own typing doesn't show indicator

**Group Chat:**
1. **User B and User C:** Both start typing
2. **User A:** Should see "2 people are typing..."

**Expected Results:**
- ✅ Multiple typing users shown correctly

---

### Test 7.3.2: Online/Offline Status

**Setup:** User A and User B in a conversation

**Steps:**
1. **User B:** App is open (foreground)
2. **User A:** Open chat with User B
3. Header should show "Online" or green dot next to User B's name (Phase 5)
4. **User B:** Put app in background (home button)
5. **User A:** Status should change to "Last seen just now" or similar
6. Wait 1 minute
7. **User A:** Status should update to "Last seen 1m ago"

**Expected Results:**
- ✅ Online status shows when user is active
- ✅ Status changes to offline when app backgrounded
- ✅ "Last seen" timestamp updates correctly
- ✅ Time format is human-readable (e.g., "2m ago", "5h ago")

**Check:**
- Presence tracked in `/users/[uid]` with `isOnline` and `lastSeenAt` fields
- AppState listener in `app/_layout.tsx` updates presence

---

### Test 7.3.3: Read Receipts (Direct Chat)

**Setup:** User A and User B in a conversation

**Steps:**
1. **User A:** Send message "Read receipt test"
2. Message should show single checkmark ✓ (sent, not read)
3. **User B:** Open conversation (view the message)
4. **User A:** Checkmark should change to double checkmark ✓✓ (read)

**Expected Results:**
- ✅ Single checkmark when sent
- ✅ Double checkmark when recipient opens chat
- ✅ Only sender sees checkmarks (not recipient)

**Check Firestore:**
- Conversation's `lastRead.userB_uid` should be set to latest message ID
- Phase 5 logic compares message timestamp with `lastRead` to determine status

---

### Test 7.3.4: Read Receipts (Group Chat)

**Setup:** User A, User B, User C in a group

**Steps:**
1. **User A:** Send message "Group read test"
2. Message should show single checkmark ✓
3. **User B:** Open conversation
4. **User A:** Should see partial read indicator (e.g., "✓ (1/2)" if implemented)
5. **User C:** Open conversation
6. **User A:** Should see double checkmark ✓✓ (all read)

**Expected Results:**
- ✅ Single checkmark initially
- ✅ Updates when some users read
- ✅ Double checkmark when all read

**Note:** Phase 5's group read receipts show simple ✓ or ✓✓. Detailed "Read by Alice, Bob" is marked as Post-MVP.

---

## Task 7.4: Edge Cases & Stress Testing

### Purpose

Test uncommon scenarios that users might encounter.

---

### Test 7.4.1: Rapid Message Sending

**Setup:** User A in a conversation

**Steps:**
1. **User A:** Send 20 messages rapidly (tap send 20 times in 10 seconds)
2. All messages should appear
3. Messages should be in correct order
4. **User B:** Should receive all 20 messages in correct order

**Expected Results:**
- ✅ No messages lost
- ✅ Order preserved
- ✅ No crashes
- ✅ Optimistic updates work for all messages
- ✅ All messages sync to Firestore

---

### Test 7.4.2: Long Messages

**Setup:** User A in a conversation

**Steps:**
1. **User A:** Type a 500-character message (copy/paste a long paragraph)
2. Send message
3. Message should display correctly (wrapped text)
4. **User B:** Should receive and display full message

**Expected Results:**
- ✅ Long messages display correctly
- ✅ Text wraps properly in bubble
- ✅ No truncation
- ✅ Input field handles long text (multiline)

**Check Max Length:**
- Phase 3's `MessageInput.tsx` has `maxLength={1000}`
- Verify hitting 1000 characters stops input

---

### Test 7.4.3: Empty Conversation List

**Setup:** New user with no conversations

**Steps:**
1. Register new user
2. Go to "Chats" tab
3. Should see empty state (e.g., "No conversations yet" message)

**Expected Results:**
- ✅ Empty state displayed (not blank screen)
- ✅ No crashes
- ✅ "New Chat" button accessible

---

### Test 7.4.4: Conversation with 100+ Messages

**Setup:** User A and User B with existing conversation

**Steps:**
1. Send 110 messages between User A and User B (script or manual)
2. **User A:** Open conversation
3. Should load last 100 messages only (Phase 3 requirement)
4. Scroll to top - older messages should NOT load (pagination is Post-MVP)

**Expected Results:**
- ✅ Last 100 messages load
- ✅ Performance acceptable (no lag)
- ✅ Messages in correct order

**Check Firestore Query:**
```typescript
query(
  collection(db, 'conversations', conversationId, 'messages'),
  orderBy('createdAt', 'asc'),
  limit(100)  // MESSAGE_LIMIT from constants
)
```

---

### Test 7.4.5: Rapid Screen Navigation

**Setup:** User A with multiple conversations

**Steps:**
1. **User A:** Tap conversation → tap back → tap different conversation
2. Repeat 10 times rapidly
3. App should not crash

**Expected Results:**
- ✅ No crashes
- ✅ No "memory leak" warnings in console
- ✅ Each conversation loads correctly

**Critical Check:**
- All Firestore listeners have cleanup in `useEffect`
- Check `app/chat/[id].tsx` for `return unsubscribe;` in all listeners

---

### Test 7.4.6: App Force Quit During Message Send

**Setup:** User A in a conversation

**Steps:**
1. **User A:** Enable airplane mode
2. **User A:** Send message "Force quit test"
3. Message shows "queued"
4. **User A:** Force quit app (swipe away from recent apps)
5. **User A:** Disable airplane mode
6. **User A:** Relaunch app → Open conversation
7. Message should still be there (Firestore offline persistence)

**Expected Results:**
- ✅ Message persists locally
- ✅ Message syncs to Firestore after relaunch + reconnect

**Firestore Behavior:**
- Firestore offline cache persists across app restarts
- Queued writes will sync when network available

---

## Task 7.5: Multi-User Testing

### Purpose

Test with 2-3 simultaneous users to verify real-time sync.

---

### Test 7.5.1: Three-User Group Chat

**Setup:** User A, User B, User C in a group

**Steps:**
1. All three users open the group chat
2. **User A:** Send "Message from A"
3. **User B:** Send "Message from B"
4. **User C:** Send "Message from C"
5. All three users should see all messages in real-time

**Expected Results:**
- ✅ All messages appear on all devices
- ✅ Sender names correct
- ✅ Message order consistent across all devices

---

### Test 7.5.2: Two Users Sending Simultaneously

**Setup:** User A and User B in a conversation

**Steps:**
1. **User A and User B:** Both send message at exact same time
2. Both messages should appear
3. Order might vary (based on Firestore server timestamp)

**Expected Results:**
- ✅ No messages lost
- ✅ Order is consistent (based on `createdAt` server timestamp)

---

## Task 7.6: Notification Testing

### Purpose

Verify Phase 6 notifications work correctly.

---

### Test 7.6.1: Notification Permissions

**Setup:** Fresh app install

**Steps:**
1. Launch app
2. Should prompt for notification permissions
3. Tap "Allow"

**Expected Results:**
- ✅ Permission dialog appears
- ✅ Permissions granted
- ✅ Permissions saved (doesn't ask again)

---

### Test 7.6.2: Notification Appears

**Setup:** User A and User B in a conversation

**Steps:**
1. **User A:** Open app, but stay on "Chats" tab (not in conversation)
2. **User B:** Send message "Notification test"
3. **User A:** Notification should appear (banner/sound)
4. Notification should show "User B" and "Notification test"

**Expected Results:**
- ✅ Notification appears
- ✅ Shows sender name
- ✅ Shows message preview
- ✅ Plays sound (if device not muted)

**Test Background:**
1. **User A:** Put app in background (home button)
2. **User B:** Send message
3. **User A:** Notification should appear on lock screen/notification tray

**Expected Results:**
- ✅ Notification works in background

**Known Limitation (MVP):**
- Local notifications only work when app is in recent apps (not force-quit)
- This is documented in Phase 6 as acceptable for MVP

---

### Test 7.6.3: Notification Tap Navigation

**Setup:** User A receives notification

**Steps:**
1. **User A:** Tap notification
2. App should open and navigate to conversation with User B

**Expected Results:**
- ✅ App opens (if closed)
- ✅ Navigates to correct conversation
- ✅ Can see the message that triggered notification

---

### Test 7.6.4: No Notification for Own Messages

**Setup:** User A sends message

**Steps:**
1. **User A:** Send message
2. **User A:** Should NOT receive notification

**Expected Results:**
- ✅ No notification on sender's device

---

## Task 7.7: Platform-Specific Testing

### Purpose

Test on both Android and iOS (if available).

---

### Test 7.7.1: Android Emulator

**Steps:**
1. Launch Android emulator
2. Run `npx expo start --android`
3. Run through Tests 7.1.1 through 7.6.4 on Android

**Expected Results:**
- ✅ All tests pass on Android
- ✅ UI displays correctly
- ✅ No Android-specific crashes

**Android-Specific Checks:**
- KeyboardAvoidingView works (`Platform.OS === 'android'` logic)
- Notification channel created (required for Android 8+)
- Back button behavior works

---

### Test 7.7.2: iOS Simulator (macOS Only)

**Steps:**
1. Launch iOS simulator
2. Run `npx expo start --ios`
3. Run through Tests 7.1.1 through 7.6.4 on iOS

**Expected Results:**
- ✅ All tests pass on iOS
- ✅ UI displays correctly (safe areas, status bar)
- ✅ No iOS-specific crashes

**iOS-Specific Checks:**
- KeyboardAvoidingView works (`Platform.OS === 'ios'` logic)
- Notification permissions requested
- Status bar doesn't overlap content

---

## Task 7.8: Bug Fixing Checklist

### Purpose

Fix common issues before final verification.

---

### Critical Fixes

Run through this checklist and fix any issues:

#### 1. Memory Leaks

**Check:**
```bash
# Look for Firestore listeners without cleanup
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

---

#### 2. Server Timestamps

**Check:**
```bash
# Look for client-side Date()
grep -r "new Date()" app/ services/
```

**Rule:** All Firestore timestamps MUST use `serverTimestamp()`

**Correct:**
```typescript
createdAt: serverTimestamp()
```

**Incorrect:**
```typescript
createdAt: new Date()  // ❌ Client time, will break sorting
```

---

#### 3. Console Errors

**Steps:**
1. Open Metro bundler terminal
2. Run through all core flows
3. Look for red errors in console

**Fix all errors before proceeding.**

Common errors:
- Missing dependencies in `useEffect`
- Accessing undefined properties
- Type errors

---

#### 4. Linter Warnings

**Run:**
```bash
npm run lint
```

**Fix all errors and warnings.**

---

#### 5. TypeScript Errors

**Run:**
```bash
npm run type-check
```

**Fix all type errors.**

---

#### 6. Empty States

**Add empty states where missing:**
- Conversations list: "No conversations yet. Tap 'New Chat' to start."
- Message list: "No messages yet. Send the first message!"
- Valid users list (new chat): "No users added yet"

---

#### 7. Loading States

**Verify loading indicators show:**
- Login/Register buttons (disable + spinner while processing)
- Conversations list (initial load)
- Messages list (initial load)
- User lookup ("Finding user...")

---

#### 8. Error Messages

**Verify user-friendly errors:**
- Login fails: "Invalid email or password"
- Register fails: "Email already in use" or "Registration failed"
- User not found: "No user found with that email"
- Network error: "Connection error. Please try again."

**Avoid:**
- Raw Firebase errors: `"auth/user-not-found"` ❌
- Technical jargon: `"Firestore write failed"` ❌

---

## Task 7.9: Code Cleanup

### Purpose

Clean up code for readability and professionalism.

---

### Cleanup Checklist

#### Remove Debug Code

**Remove:**
- `console.log()` statements (except critical errors)
- Commented-out code blocks
- Test/dummy data
- `// TODO` comments (move to GitHub issues)

**Keep:**
- `console.error()` for real errors
- `console.warn()` for important warnings

---

#### Format Code

**Run:**
```bash
npm run format  # If you have prettier configured
```

**Or manually:**
- Consistent indentation (2 or 4 spaces)
- Consistent quote style (single or double)
- Trailing commas in objects/arrays

---

#### Remove Unused Imports

**Run:**
```bash
npm run lint -- --fix
```

**Or manually check each file for unused imports.**

---

#### Add Missing Types

**Check for `any` types:**
```bash
grep -r ": any" app/ components/ services/ store/
```

**Replace with specific types/interfaces.**

---

## Task 7.10: Documentation

### Purpose

Update project documentation for setup and deployment.

---

### Update README.md

**File:** `/README.md`

**Add/Update sections:**

```markdown
# MessageAI MVP

A production-quality messaging app built with React Native (Expo) + Firebase.

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

- **Frontend:** React Native (Expo SDK 54), Expo Router
- **Backend:** Firebase (Firestore, Auth)
- **State:** Zustand + AsyncStorage
- **UI:** React Native Paper

## Prerequisites

- Node.js 20.19.4+
- Expo CLI
- Android Studio (for Android emulator)
- Xcode (for iOS simulator, macOS only)

## Setup Instructions

### 1. Clone Repository

\`\`\`bash
git clone <repository-url>
cd message-ai
npm install
\`\`\`

### 2. Configure Firebase

1. Create Firebase project at https://console.firebase.google.com/
2. Enable Email/Password authentication
3. Create Firestore database (test mode)
4. Copy Firebase config from Project Settings
5. Create `.env` file in root:

\`\`\`
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
\`\`\`

### 3. Deploy Firestore Security Rules

Copy rules from `/firestore.rules` to Firebase Console:

1. Go to Firestore → Rules
2. Paste rules from file
3. Click "Publish"

### 4. Run App

\`\`\`bash
# Start development server
npx expo start

# Run on Android emulator
npx expo start --android

# Run on iOS simulator (macOS only)
npx expo start --ios
\`\`\`

## Testing

### Run Tests

\`\`\`bash
npm test
\`\`\`

### Run Linter

\`\`\`bash
npm run lint
\`\`\`

### Type Check

\`\`\`bash
npm run type-check
\`\`\`

## Project Structure

\`\`\`
app/              # Expo Router screens
components/       # Reusable UI components
services/         # Firebase services
store/            # Zustand stores
utils/            # Helper functions
docs/             # Documentation
\`\`\`

## Known Limitations (MVP)

- Local notifications only (background notifications require development build)
- No message editing/deletion
- No media uploads (text-only)
- Last 100 messages loaded (no infinite scroll)

## Post-MVP Roadmap

See `/docs/mvp-prd-plus.md` Section 12 for full roadmap.

## License

MIT
```

---

### Create .env.example

**File:** `/.env.example`

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

### Create/Update Firestore Rules File

**File:** `/firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    
    // Conversations
    match /conversations/{conversationId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      allow update: if request.auth.uid in resource.data.participants;
    }
    
    // Messages within conversations
    match /conversations/{conversationId}/messages/{messageId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && request.auth.uid in request.resource.data.participants;
    }
    
    // Typing users
    match /conversations/{conversationId}/typingUsers/{userId} {
      allow read, write: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
    }
  }
}
```

**Deploy to Firebase:**
1. Firebase Console → Firestore → Rules
2. Paste rules
3. Click "Publish"

---

## Task 7.11: Final Verification

### Purpose

Last comprehensive check before declaring MVP complete.

---

### Final Checklist

Run through this checklist one final time:

#### Must-Have Features (All Must Work)

- [ ] ✅ User can register with email/password/display name
- [ ] ✅ User can login with valid credentials
- [ ] ✅ Session persists after app restart
- [ ] ✅ Can find users by email (valid/invalid handling)
- [ ] ✅ Can create 1-on-1 chat
- [ ] ✅ Can create group chat (2+ users)
- [ ] ✅ Can send message in direct chat
- [ ] ✅ Can send message in group chat
- [ ] ✅ Messages appear in real-time (< 1 second)
- [ ] ✅ Messages persist across app restarts
- [ ] ✅ Optimistic UI updates work (instant feedback)
- [ ] ✅ Offline queuing works (messages sync when reconnect)
- [ ] ✅ Last 100 messages load per conversation

#### Should-Have Features (Important)

- [ ] ✅ Typing indicators appear/disappear correctly
- [ ] ✅ Online/offline status displays and updates
- [ ] ✅ "Last seen" timestamps show when offline
- [ ] ✅ Read receipts work (✓ sent, ✓✓ read)
- [ ] ✅ Network detection ("Offline" banner)
- [ ] ✅ Local notifications appear for new messages
- [ ] ✅ Tapping notification navigates to correct chat

#### Technical Requirements

- [ ] ✅ No memory leaks (all listeners cleaned up)
- [ ] ✅ No unhandled crashes
- [ ] ✅ All Firestore timestamps use `serverTimestamp()`
- [ ] ✅ All error states handled gracefully
- [ ] ✅ No console errors in Metro bundler
- [ ] ✅ `npm run lint` passes (no errors)
- [ ] ✅ `npm run type-check` passes (no errors)
- [ ] ✅ `npm test` passes (all tests green)
- [ ] ✅ Works on Android emulator
- [ ] ✅ Works on iOS simulator (if macOS available)

#### Documentation & Deployment

- [ ] ✅ `README.md` updated with setup instructions
- [ ] ✅ `.env.example` created
- [ ] ✅ Firestore security rules deployed to Firebase
- [ ] ✅ Git repository clean (no sensitive data committed)
- [ ] ✅ `.gitignore` includes `.env`
- [ ] ✅ All phases checked off in `PROGRESS_TRACKER.md`

---

## Troubleshooting Common Issues

### Issue: App Crashes on Navigation

**Cause:** Memory leak from unsubscribed Firestore listeners

**Solution:**
```typescript
// Check ALL useEffect with onSnapshot
useEffect(() => {
  const unsubscribe = onSnapshot(/*...*/);
  return unsubscribe;  // MUST HAVE THIS
}, []);
```

**Files to check:**
- `app/chat/[id].tsx`
- `app/(tabs)/index.tsx`

---

### Issue: Messages Out of Order

**Cause:** Using client-side timestamps instead of server timestamps

**Solution:**
```typescript
// Replace ALL instances of new Date()
createdAt: serverTimestamp()  // ✅ Correct
createdAt: new Date()          // ❌ Wrong
```

---

### Issue: Offline Messages Don't Sync

**Cause:** Firestore offline persistence not enabled or network check failing

**Solution:**
1. Check Firebase initialization:
```typescript
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});
```

2. Check NetInfo integration in `OfflineBanner.tsx`

---

### Issue: Notifications Don't Appear

**Cause:** Permissions denied or notification handler not configured

**Solution:**
1. Check permissions requested on launch
2. Check notification handler configured in `app/_layout.tsx`
3. Verify Android notification channel created (required for Android 8+)

---

### Issue: TypeScript Errors

**Cause:** Missing type definitions or incorrect types

**Solution:**
```bash
npm run type-check  # See specific errors
```

Fix by adding proper types/interfaces. Common issues:
- `any` types
- Missing `return` types on functions
- Incorrect prop types

---

### Issue: Linter Errors

**Cause:** Code style issues or unused variables

**Solution:**
```bash
npm run lint -- --fix  # Auto-fix many issues
```

Manually fix remaining issues.

---

## Common Pitfalls to Avoid

### 1. Don't Skip Listener Cleanup

❌ **Bad:**
```typescript
useEffect(() => {
  onSnapshot(/*...*/);
  // No cleanup!
}, []);
```

✅ **Good:**
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(/*...*/);
  return unsubscribe;
}, []);
```

---

### 2. Don't Use Client Timestamps

❌ **Bad:**
```typescript
createdAt: new Date()
```

✅ **Good:**
```typescript
createdAt: serverTimestamp()
```

---

### 3. Don't Hardcode Values

❌ **Bad:**
```typescript
.limit(100)  // Magic number
```

✅ **Good:**
```typescript
import { MESSAGE_LIMIT } from '../utils/constants';
.limit(MESSAGE_LIMIT)
```

---

### 4. Don't Ignore Error States

❌ **Bad:**
```typescript
try {
  await sendMessage();
} catch (error) {
  // Ignore error
}
```

✅ **Good:**
```typescript
try {
  await sendMessage();
} catch (error) {
  console.error('Send message error:', error);
  Alert.alert('Error', 'Failed to send message. Please try again.');
}
```

---

### 5. Don't Trust Client Data in Rules

❌ **Bad Firestore Rules:**
```javascript
allow read: if true;  // Anyone can read!
```

✅ **Good:**
```javascript
allow read: if request.auth.uid in resource.data.participants;
```

---

## Summary

**Phase 7 Complete When:**

- ✅ All core flows tested and working
- ✅ All edge cases handled
- ✅ Offline/online transitions work
- ✅ Real-time features functional
- ✅ Notifications working
- ✅ Multi-user testing passed
- ✅ Platform testing passed (Android + iOS)
- ✅ All bugs fixed
- ✅ Code cleaned up
- ✅ Documentation complete
- ✅ Final verification checklist 100% complete

**Time Investment:** 3-5 hours  
**Output:** Production-ready MVP messaging app

**Next:** Deploy and demo! 🎉

---

## Deployment Notes

### For Emulator Demo

1. Have both Android and iOS emulators ready (if available)
2. Pre-register 2-3 test users
3. Have a conversation with messages ready to show
4. Demo script:
   - Show registration
   - Show user discovery
   - Show message sending (real-time)
   - Show typing indicator
   - Show offline mode
   - Show notifications

### For Production Deployment (Post-MVP)

1. **Create development build:**
   ```bash
   eas build --profile development --platform android
   ```

2. **Configure FCM for background notifications**

3. **Deploy to Google Play Store / Apple App Store**

See Appendix D of `mvp-prd-plus.md` for detailed deployment instructions.

---

## Before Calling Phase 7 Complete

### Commit Your Work

```bash
git add .
git commit -m "feat: complete Phase 7 - testing, bug fixes, and final polish

Phase 7 Deliverables:
- ✅ Comprehensive end-to-end testing (all core flows)
- ✅ Edge case testing (offline, rapid actions, long messages)
- ✅ Multi-user testing (2-3 simultaneous users)
- ✅ Platform testing (Android + iOS)
- ✅ Bug fixes (memory leaks, timestamps, error handling)
- ✅ Code cleanup (removed console.logs, fixed linter/type errors)
- ✅ Documentation (README, .env.example, Firestore rules)
- ✅ Final verification (all checklists complete)

MVP Status: READY FOR DEPLOYMENT"
```

### Update Progress Tracker

Check off Phase 7 in `/docs/PROGRESS_TRACKER.md`

---

## Congratulations! 🎉

If you've completed all tasks in Phase 7 and the final verification checklist is 100% complete, **your MVP is ready for deployment and demo.**

**Key Achievements:**

- ✅ Built a production-quality messaging app
- ✅ Implemented real-time sync with Firebase
- ✅ Handled offline scenarios gracefully
- ✅ Added typing indicators, presence, and read receipts
- ✅ Tested thoroughly across platforms
- ✅ Fixed all critical bugs
- ✅ Documented the project

**What You Built:**

A fully functional WhatsApp-like messaging app with:
- User authentication
- One-on-one and group messaging
- Real-time delivery
- Typing indicators
- Online/offline status
- Read receipts
- Local notifications
- Offline support

**Total Time:** ~22 hours (if following recommended schedule)

---

**Ready to ship! 🚀**

