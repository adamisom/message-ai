# MessageAI MVP - Comprehensive Task List

**PRIORITY: Maximum Speed Development**  
Focus: Ship working features fast → Test → Iterate

---

## File Structure Overview

```
message-ai/
├── app.json                              # Expo config (UPDATE)
├── package.json                          # Dependencies (UPDATE)
├── .env                                  # Firebase config (ADD - gitignored)
├── .gitignore                            # (UPDATE)
├── firebase.config.js                    # Firebase initialization (ADD)
├── app/
│   ├── _layout.tsx                       # Root layout with auth check (UPDATE)
│   ├── index.tsx                         # Landing/redirect (UPDATE)
│   ├── (auth)/
│   │   ├── _layout.tsx                   # Auth screens layout (ADD)
│   │   ├── login.tsx                     # Login screen (ADD)
│   │   └── register.tsx                  # Register screen (ADD)
│   ├── (tabs)/
│   │   ├── _layout.tsx                   # Tab navigator (ADD)
│   │   ├── index.tsx                     # Conversations list (ADD)
│   │   └── new-chat.tsx                  # New chat screen (ADD)
│   └── chat/
│       └── [id].tsx                      # Chat screen (dynamic) (ADD)
├── components/
│   ├── MessageBubble.tsx                 # Message UI component (ADD)
│   ├── MessageList.tsx                   # Message list with FlatList (ADD)
│   ├── MessageInput.tsx                  # Text input + send button (ADD)
│   ├── ConversationItem.tsx              # Conversation list item (ADD)
│   ├── TypingIndicator.tsx               # "User is typing..." (ADD)
│   ├── UserStatusBadge.tsx               # Online/offline indicator (ADD)
│   └── OfflineBanner.tsx                 # Offline mode banner (ADD)
├── store/
│   ├── authStore.ts                      # Zustand auth store (ADD)
│   └── chatStore.ts                      # Zustand chat store (ADD)
├── services/
│   ├── authService.ts                    # Auth helper functions (ADD)
│   ├── firestoreService.ts               # Firestore helpers (ADD)
│   ├── notificationService.ts            # Notification setup (ADD)
│   └── presenceService.ts                # Online/offline tracking (ADD)
├── utils/
│   ├── timeFormat.ts                     # Time formatting (ADD)
│   ├── validators.ts                     # Email/password validation (ADD)
│   └── constants.ts                      # App constants (ADD)
└── assets/
    └── (existing images)
```

---

## PHASE 0: Setup & Configuration (Foundation)
**Estimated Time: 1.5-2 hours**  
**Goal: Get project ready with all dependencies and Firebase configured**

### Task 0.1: Environment & Dependencies Setup
**Priority: CRITICAL**

#### Subtasks:
- [ ] 0.1.1: Install core dependencies
  - **Files to UPDATE:** `package.json`
  - **Action:** Add dependencies: `zustand`, `@react-native-async-storage/async-storage`, `@react-native-community/netinfo`, `expo-notifications`, `react-native-paper`

- [ ] 0.1.2: Install Firebase SDK
  - **Files to UPDATE:** `package.json`
  - **Action:** Add `@react-native-firebase/app`, `@react-native-firebase/firestore`, `@react-native-firebase/auth`
  - **Alternative:** Use Firebase Web SDK if native SDK causes issues: `firebase@^9.0.0`

- [ ] 0.1.3: Create environment file
  - **Files to ADD:** `.env`
  - **Content:** Firebase API keys, project ID, auth domain, etc.

- [ ] 0.1.4: Update .gitignore
  - **Files to UPDATE:** `.gitignore`
  - **Action:** Add `.env` to gitignore

**Test:** Run `npm install` successfully, no errors

---

### Task 0.2: Firebase Configuration
**Priority: CRITICAL**

#### Subtasks:
- [ ] 0.2.1: Create Firebase project
  - **External Action:** Firebase Console → Create new project
  - **Enable:** Email/Password authentication
  - **Enable:** Firestore Database (test mode initially)

- [ ] 0.2.2: Initialize Firebase in app
  - **Files to ADD:** `firebase.config.js`
  - **Content:** Firebase initialization with environment variables

- [ ] 0.2.3: Set up Firestore security rules
  - **External Action:** Firebase Console → Firestore → Rules
  - **Reference:** Section 5 of PRD

- [ ] 0.2.4: Create Firestore collections structure
  - **External Action:** Create `users`, `conversations` collections (empty for now)

**Test:** Firebase initializes without errors, can read/write test document

---

### Task 0.3: Project Structure Setup
**Priority: HIGH**

#### Subtasks:
- [ ] 0.3.1: Create folder structure
  - **Folders to ADD:** `components/`, `store/`, `services/`, `utils/`

- [ ] 0.3.2: Update app.json for notifications
  - **Files to UPDATE:** `app.json`
  - **Action:** Add `expo-notifications` plugin

- [ ] 0.3.3: Create utility files
  - **Files to ADD:** 
    - `utils/constants.ts` (app constants)
    - `utils/validators.ts` (email/password validation)
    - `utils/timeFormat.ts` (timestamp formatting)

**Test:** All folders exist, no import errors

---

## PHASE 1: Authentication & User Management
**Estimated Time: 2-3 hours**  
**Goal: Users can register, login, logout, and session persists**

### Task 1.1: Authentication Store & Service
**Priority: CRITICAL**

#### Subtasks:
- [ ] 1.1.1: Create auth Zustand store
  - **Files to ADD:** `store/authStore.ts`
  - **Features:** `user`, `loading`, `setUser()`, `logout()`, `restoreSession()`
  - **Integration:** AsyncStorage for persistence

- [ ] 1.1.2: Create auth service
  - **Files to ADD:** `services/authService.ts`
  - **Functions:** `registerUser()`, `loginUser()`, `logoutUser()`, `createUserProfile()`
  - **Integration:** Firebase Auth + Firestore

**Test:** Store initializes, can set/get user data

---

### Task 1.2: Registration Screen
**Priority: CRITICAL**

#### Subtasks:
- [ ] 1.2.1: Create auth layout
  - **Files to ADD:** `app/(auth)/_layout.tsx`
  - **Layout type:** Stack navigator

- [ ] 1.2.2: Create register screen UI
  - **Files to ADD:** `app/(auth)/register.tsx`
  - **Form fields:** Email, Password, Display Name
  - **Validation:** Email format, password length (6+), display name required

- [ ] 1.2.3: Implement registration logic
  - **Files to UPDATE:** `app/(auth)/register.tsx`
  - **Flow:** Validate → Create Firebase Auth account → Create Firestore user doc → Auto-login → Navigate to conversations

- [ ] 1.2.4: Add error handling
  - **Files to UPDATE:** `app/(auth)/register.tsx`
  - **Errors:** Email already exists, weak password, network errors

**Test:** Can register new user, profile created in Firestore, redirects to app

---

### Task 1.3: Login Screen
**Priority: CRITICAL**

#### Subtasks:
- [ ] 1.3.1: Create login screen UI
  - **Files to ADD:** `app/(auth)/login.tsx`
  - **Form fields:** Email, Password
  - **Link to register screen**

- [ ] 1.3.2: Implement login logic
  - **Files to UPDATE:** `app/(auth)/login.tsx`
  - **Flow:** Validate → Firebase Auth login → Fetch user profile → Store in Zustand + AsyncStorage → Navigate to conversations

- [ ] 1.3.3: Add error handling
  - **Files to UPDATE:** `app/(auth)/login.tsx`
  - **Errors:** Invalid credentials, user not found, network errors

**Test:** Can login with existing credentials, session stored, navigates to app

---

### Task 1.4: Session Persistence & Auth Guard
**Priority: CRITICAL**

#### Subtasks:
- [ ] 1.4.1: Update root layout with auth check
  - **Files to UPDATE:** `app/_layout.tsx`
  - **Logic:** Check AsyncStorage for session on mount → Restore user → Redirect based on auth status

- [ ] 1.4.2: Create landing/redirect screen
  - **Files to UPDATE:** `app/index.tsx`
  - **Logic:** If authenticated → redirect to conversations, else → redirect to login

- [ ] 1.4.3: Add logout functionality
  - **Files to UPDATE:** `store/authStore.ts`, `services/authService.ts`
  - **Integration:** Clear Firestore, AsyncStorage, Zustand state

**Test:** App remembers login after restart, logout clears session properly

---

## PHASE 2: User Discovery & Conversation Creation
**Estimated Time: 2-3 hours**  
**Goal: Users can find others by email and start conversations**

### Task 2.1: Firestore Service for User Discovery
**Priority: CRITICAL**

#### Subtasks:
- [ ] 2.1.1: Create Firestore service
  - **Files to ADD:** `services/firestoreService.ts`
  - **Functions:** 
    - `findUserByEmail(email)` → Query users collection
    - `createOrOpenConversation(otherUserId, currentUser)` → Create/open 1-on-1
    - `createGroupConversation(userIds, currentUser)` → Create group

**Test:** Can query user by email, returns null if not found

---

### Task 2.2: New Chat Screen (One-on-One)
**Priority: CRITICAL**

#### Subtasks:
- [ ] 2.2.1: Create tabs layout
  - **Files to ADD:** `app/(tabs)/_layout.tsx`
  - **Tabs:** "Chats", "New Chat"

- [ ] 2.2.2: Create new chat screen UI
  - **Files to ADD:** `app/(tabs)/new-chat.tsx`
  - **UI Elements:** Email input field, "Create Chat" button, toggle for group chat

- [ ] 2.2.3: Implement email lookup
  - **Files to UPDATE:** `app/(tabs)/new-chat.tsx`
  - **Flow:** User enters email → Validate → Query Firestore → Show result or error

- [ ] 2.2.4: Implement conversation creation
  - **Files to UPDATE:** `app/(tabs)/new-chat.tsx`
  - **Logic:** Check if conversation exists → Create if not → Navigate to chat screen

**Test:** Enter valid email → opens chat, invalid email → shows error

---

### Task 2.3: New Group Chat
**Priority: HIGH**

#### Subtasks:
- [ ] 2.3.1: Add group chat UI to new chat screen
  - **Files to UPDATE:** `app/(tabs)/new-chat.tsx`
  - **UI:** Email input + "Add" button, list of validated emails, "Create Group" button

- [ ] 2.3.2: Implement multi-email validation
  - **Files to UPDATE:** `app/(tabs)/new-chat.tsx`
  - **Logic:** Validate each email → Add to list if found → Show display name → Allow deletion from list

- [ ] 2.3.3: Implement group creation
  - **Files to UPDATE:** `app/(tabs)/new-chat.tsx`
  - **Logic:** Require 2+ valid emails → Create group conversation → Navigate to chat

**Test:** Can add multiple emails, invalid emails rejected, group created successfully

---

### Task 2.4: Conversations List Screen
**Priority: HIGH**

#### Subtasks:
- [ ] 2.4.1: Create chat store
  - **Files to ADD:** `store/chatStore.ts`
  - **State:** `conversations`, `onlineStatuses`

- [ ] 2.4.2: Create conversation item component
  - **Files to ADD:** `components/ConversationItem.tsx`
  - **Display:** Conversation name, last message preview, timestamp, unread indicator (optional)

- [ ] 2.4.3: Create conversations list screen
  - **Files to ADD:** `app/(tabs)/index.tsx`
  - **UI:** FlatList of conversations, real-time listener
  - **Logic:** Query conversations where user is participant → Sort by lastMessageAt

- [ ] 2.4.4: Add navigation to chat screen
  - **Files to UPDATE:** `app/(tabs)/index.tsx`, `components/ConversationItem.tsx`
  - **Action:** Tap conversation → Navigate to `/chat/[id]`

**Test:** Conversations list shows all user's chats, updates in real-time, navigation works

---

## PHASE 3: Core Messaging (One-on-One)
**Estimated Time: 3-4 hours**  
**Goal: Send/receive messages in real-time with optimistic updates**

### Task 3.1: Chat Screen Setup
**Priority: CRITICAL**

#### Subtasks:
- [ ] 3.1.1: Create chat screen
  - **Files to ADD:** `app/chat/[id].tsx`
  - **Layout:** Header with user info, message list, input at bottom

- [ ] 3.1.2: Fetch conversation details
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Logic:** Get conversation ID from params → Query conversation doc → Store in state

- [ ] 3.1.3: Set up real-time message listener
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Query:** `orderBy('createdAt', 'desc').limit(100)` → Reverse for display
  - **CRITICAL:** Add cleanup function to unsubscribe

**Test:** Chat screen opens, loads conversation data

---

### Task 3.2: Message Display Components
**Priority: CRITICAL**

#### Subtasks:
- [ ] 3.2.1: Create message bubble component
  - **Files to ADD:** `components/MessageBubble.tsx`
  - **Variants:** Sent (right-aligned, blue) vs Received (left-aligned, gray)
  - **Display:** Message text, timestamp, sender name (for groups), status indicator

- [ ] 3.2.2: Create message list component
  - **Files to ADD:** `components/MessageList.tsx`
  - **Implementation:** FlatList with inverted list, auto-scroll to bottom
  - **Optimization:** Use `keyExtractor`, `getItemLayout` for performance

- [ ] 3.2.3: Integrate into chat screen
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Render:** MessageList with messages array

**Test:** Messages display correctly, scrolling works, timestamps show

---

### Task 3.3: Message Input & Sending
**Priority: CRITICAL**

#### Subtasks:
- [ ] 3.3.1: Create message input component
  - **Files to ADD:** `components/MessageInput.tsx`
  - **UI:** TextInput + Send button
  - **Features:** Auto-grow input, disable send when empty

- [ ] 3.3.2: Implement message sending logic
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Flow:** User types → Presses send → Optimistic update (temp message) → Write to Firestore → Update conversation lastMessage

- [ ] 3.3.3: Handle optimistic updates
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Logic:** Add temp message with `status: 'sending'` → On success, remove temp (real message appears via listener)

- [ ] 3.3.4: Add error handling & timeout detection
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Logic:** 10-second timeout → Set status to 'failed' → Show retry option (optional for MVP)

**Test:** Message sends, appears instantly (optimistic), syncs to Firestore, appears on other user's screen

---

### Task 3.4: Network Status Integration
**Priority: HIGH**

#### Subtasks:
- [ ] 3.4.1: Add NetInfo to chat screen
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Logic:** Listen to network status → Set `isOnline` state → Show offline banner when disconnected

- [ ] 3.4.2: Create offline banner component
  - **Files to ADD:** `components/OfflineBanner.tsx`
  - **Display:** "You're offline. Messages will send when reconnected."

- [ ] 3.4.3: Update message status based on network
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Logic:** If offline → Status 'queued', if online → Status 'sending'

**Test:** Airplane mode → messages show 'queued', reconnect → messages send automatically

---

## PHASE 4: Group Messaging
**Estimated Time: 1-2 hours**  
**Goal: Group chats work with multiple participants**

### Task 4.1: Group Chat Support
**Priority: HIGH**

#### Subtasks:
- [ ] 4.1.1: Update chat screen for groups
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Changes:** Show sender name on all messages, display group name in header, show participant count

- [ ] 4.1.2: Update message bubble for groups
  - **Files to UPDATE:** `components/MessageBubble.tsx`
  - **Changes:** Show sender name above message for received messages

- [ ] 4.1.3: Test group message flow
  - **No new files**
  - **Test:** Send message in group → All participants receive in real-time

**Test:** Group chat works, sender names show, all members see messages

---

## PHASE 5: Real-time Features (Typing, Status, Read Receipts)
**Estimated Time: 3-4 hours**  
**Goal: Typing indicators, online/offline status, read receipts**

### Task 5.1: Typing Indicators
**Priority: MEDIUM**

#### Subtasks:
- [ ] 5.1.1: Create typing indicator component
  - **Files to ADD:** `components/TypingIndicator.tsx`
  - **Display:** "User is typing..." or "3 people are typing..."

- [ ] 5.1.2: Implement typing detection in input
  - **Files to UPDATE:** `components/MessageInput.tsx`
  - **Logic:** onChange → Write to `typingUsers` subcollection → Debounce 500ms → Clear on inactivity or send

- [ ] 5.1.3: Listen to typing users in chat screen
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Query:** Listen to `typingUsers` subcollection → Filter out current user → Display indicator

**Test:** Type in one window → "typing..." appears in other window → Clears after stop typing

---

### Task 5.2: Online/Offline Status
**Priority: MEDIUM**

#### Subtasks:
- [ ] 5.2.1: Create presence service
  - **Files to ADD:** `services/presenceService.ts`
  - **Functions:** `setOnline(uid)`, `setOffline(uid)`, `listenToUserStatus(uid)`

- [ ] 5.2.2: Track presence in root layout
  - **Files to UPDATE:** `app/_layout.tsx`
  - **Logic:** AppState listener → Update user's `isOnline` + `lastSeenAt` in Firestore

- [ ] 5.2.3: Create user status badge component
  - **Files to ADD:** `components/UserStatusBadge.tsx`
  - **Display:** Green dot for online, "Last seen..." for offline

- [ ] 5.2.4: Add status to chat screen header
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Display:** Online/offline status for other user(s)

- [ ] 5.2.5: Add status to conversation list
  - **Files to UPDATE:** `components/ConversationItem.tsx`
  - **Display:** Online indicator next to conversation name

**Test:** User goes offline → Status updates in real-time → Last seen timestamp shows

---

### Task 5.3: Read Receipts (Last-Read Tracking)
**Priority: MEDIUM**

#### Subtasks:
- [ ] 5.3.1: Implement mark-as-read logic
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Logic:** When messages load → Get last message → Update `lastRead.{uid}` in conversation doc

- [ ] 5.3.2: Add read status to message bubbles
  - **Files to UPDATE:** `components/MessageBubble.tsx`
  - **Display:** ✓ (sent) vs ✓✓ (read) for sent messages

- [ ] 5.3.3: Calculate read status in chat screen
  - **Files to UPDATE:** `app/chat/[id].tsx`
  - **Logic:** Compare message timestamp with lastRead timestamp for each user

**Test:** Open chat → Messages marked as read → Checkmarks update on sender's screen

---

## PHASE 6: Notifications
**Estimated Time: 1-2 hours**  
**Goal: Local notifications for incoming messages**

### Task 6.1: Notification Setup
**Priority: MEDIUM**

#### Subtasks:
- [ ] 6.1.1: Create notification service
  - **Files to ADD:** `services/notificationService.ts`
  - **Functions:** `requestPermissions()`, `scheduleNotification()`, `setupListener()`

- [ ] 6.1.2: Request notification permissions
  - **Files to UPDATE:** `app/_layout.tsx`
  - **Logic:** On mount → Request permissions

- [ ] 6.1.3: Configure notification handler
  - **Files to UPDATE:** `app/_layout.tsx`
  - **Config:** `setNotificationHandler()` for foreground behavior

**Test:** Notification permission requested on first launch

---

### Task 6.2: Trigger Notifications on New Messages
**Priority: MEDIUM**

#### Subtasks:
- [ ] 6.2.1: Add notification trigger in message listener
  - **Files to UPDATE:** `app/chat/[id].tsx` OR create global listener
  - **Logic:** New message from others → Schedule local notification

- [ ] 6.2.2: Add notification tap handler
  - **Files to UPDATE:** `app/_layout.tsx`
  - **Logic:** Tap notification → Navigate to conversation

**Test:** Receive message → Notification appears → Tap → Opens correct chat

---

## PHASE 7: Testing & Polish
**Estimated Time: 3-5 hours**  
**Goal: Everything works reliably, no crashes, good UX**

### Task 7.1: Core Flow Testing
**Priority: CRITICAL**

#### Test Cases (Reference PRD Section 10):
- [ ] 7.1.1: Authentication flow
  - Register, login, logout, session persistence

- [ ] 7.1.2: User discovery
  - Valid email, invalid email, group creation

- [ ] 7.1.3: One-on-one messaging
  - Send, receive, persistence, optimistic updates

- [ ] 7.1.4: Group messaging
  - Multiple participants, sender names

- [ ] 7.1.5: Offline behavior
  - Airplane mode, message queueing, sync on reconnect

- [ ] 7.1.6: Real-time features
  - Typing indicators, online status, read receipts

- [ ] 7.1.7: Notifications
  - Receive, display, tap navigation

---

### Task 7.2: Bug Fixes & Edge Cases
**Priority: HIGH**

#### Common Issues to Address:
- [ ] 7.2.1: Memory leaks
  - **Check:** All Firestore listeners have cleanup functions
  - **Files to REVIEW:** All files with `onSnapshot()`

- [ ] 7.2.2: Message ordering issues
  - **Verify:** All timestamps use `serverTimestamp()`
  - **Files to REVIEW:** Message creation code

- [ ] 7.2.3: Empty states
  - **Add:** Empty state UI for no conversations, no messages
  - **Files to UPDATE:** `app/(tabs)/index.tsx`, `app/chat/[id].tsx`

- [ ] 7.2.4: Loading states
  - **Add:** Loading indicators for all async operations
  - **Files to UPDATE:** All screens with async operations

- [ ] 7.2.5: Error messages
  - **Improve:** User-friendly error messages for all failures
  - **Files to UPDATE:** All screens with error handling

---

### Task 7.3: UI Polish (Time Permitting)
**Priority: LOW (Skip if behind schedule)**

#### Enhancements:
- [ ] 7.3.1: Add subtle animations
  - Message bubble entrance, typing indicator dots

- [ ] 7.3.2: Improve input UX
  - Auto-focus, keyboard handling, send on Enter (web)

- [ ] 7.3.3: Add haptic feedback
  - Message send, navigation

- [ ] 7.3.4: Polish conversation list
  - Better styling, timestamps, unread indicators

---

### Task 7.4: Deployment Preparation
**Priority: HIGH**

#### Subtasks:
- [ ] 7.4.1: Clean up code
  - Remove console.logs, debug statements, test data

- [ ] 7.4.2: Update README
  - **Files to UPDATE:** `README.md`
  - **Content:** Setup instructions, Firebase config, how to run

- [ ] 7.4.3: Create .env template
  - **Files to ADD:** `.env.example`
  - **Content:** Template with placeholder Firebase keys

- [ ] 7.4.4: Test on both platforms
  - Android emulator, iOS simulator (if macOS)

- [ ] 7.4.5: Verify Firestore rules are deployed
  - Firebase Console → Update security rules

---

## Priority Matrix for Fast Iteration

### Must Have (Block MVP if missing):
1. Authentication (Phase 1)
2. User discovery (Phase 2)
3. One-on-one messaging (Phase 3)
4. Group messaging (Phase 4)
5. Real-time sync (Phase 3)
6. Optimistic updates (Phase 3)

### Should Have (Important but not blocking):
7. Typing indicators (Phase 5)
8. Online/offline status (Phase 5)
9. Read receipts (Phase 5)
10. Notifications (Phase 6)
11. Network detection (Phase 3)

### Nice to Have (Skip if behind):
12. UI polish (Phase 7)
13. Animations (Phase 7)
14. Empty states (Phase 7)

---

## Quick Test Checklist (Before Each Phase Completion)

### Phase 1 Complete?
- [ ] Can register new user
- [ ] Can login
- [ ] Session persists on app restart

### Phase 2 Complete?
- [ ] Can find user by email
- [ ] Can create 1-on-1 conversation
- [ ] Can create group conversation
- [ ] Conversation list shows all chats

### Phase 3 Complete?
- [ ] Can send message
- [ ] Message appears instantly (optimistic)
- [ ] Message syncs to Firestore
- [ ] Other user receives in real-time
- [ ] Messages persist after restart

### Phase 4 Complete?
- [ ] Group chat sends/receives correctly
- [ ] Sender names show in groups
- [ ] All participants see messages

### Phase 5 Complete?
- [ ] Typing indicator works
- [ ] Online/offline status updates
- [ ] Read receipts show correctly

### Phase 6 Complete?
- [ ] Notifications appear on new message
- [ ] Tapping notification opens chat

### Phase 7 Complete?
- [ ] All flows tested end-to-end
- [ ] No crashes or memory leaks
- [ ] Works offline and online
- [ ] Both platforms tested

---

## Estimated Timeline (24-hour sprint)

| Phase | Time | Cumulative |
|-------|------|------------|
| Phase 0: Setup | 2h | 2h |
| Phase 1: Auth | 2.5h | 4.5h |
| Phase 2: Discovery | 2.5h | 7h |
| Phase 3: Messaging | 4h | 11h |
| Phase 4: Groups | 1.5h | 12.5h |
| Phase 5: Real-time | 3h | 15.5h |
| Phase 6: Notifications | 1.5h | 17h |
| Phase 7: Testing | 5h | 22h |
| **Buffer** | 2h | **24h** |

---

## Key Reminders

### Technical:
- ✅ Always use `firebase.firestore.FieldValue.serverTimestamp()`
- ✅ Always unsubscribe from listeners in cleanup
- ✅ Use optimistic updates for great UX
- ✅ Test offline/online transitions
- ✅ Denormalize participants in messages for security rules

### Strategy:
- ⚡ Focus on shipping working features
- ⚡ Test each phase before moving on
- ⚡ Don't over-engineer
- ⚡ Skip nice-to-haves if behind schedule
- ⚡ Use Expo Router (already set up)
- ⚡ Use hybrid Zustand + component state

---

**Start with Phase 0 and work sequentially. Test thoroughly after each phase before moving forward.**

