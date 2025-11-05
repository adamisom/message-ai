# MessageAI - Demo Script

**Version:** 1.0  
**Date:** November 4, 2025  
**Duration:** ~12-15 minutes  
**Setup:** Loom recording, iPhone (Expo Go), Android Emulator

---

## 🎬 Pre-Demo Setup

### Device Setup

- [ ] **iPhone:** Expo Go app running, logged in as Adam1
- [ ] **Android Emulator:** Running, ready to login
- [ ] **Browser:** Tab open to Firestore console (spam fields view)
- [ ] **Scripts:** `downgradeUser.js` ready to run for Adam2

### Data Preparation

- [ ] Run modified population script that creates:
  - Fresh conversations
  - including Performance test data but NOT burst messages
  - verify test users 1 & 3 have private but user 2 is public
- [ ] Practice logging in with the first 3 users on Emulator

### Recording Setup

- [ ] Loom app ready
- [ ] Script notes in corner or off-screen
- [ ] Close unnecessary windows/notifications

---

## 📱 Demo Flow

### **Part 1: Performance & Core Features** (3 min)

#### 1.1 Performance Test (iPhone - Adam1)

- [ ] **Show:** Scroll through messages fast
- [ ] **Say:** "smooth scrolling even with hundreds of messages"
- [ ] **Show:** iPhone! *after* Trigger burst script (send 20+ rapid messages)
- [ ] **Say:** "rapid activity is not a problem"

#### 1.2 Real-Time Messaging (iPhone → Android)

- [ ] **iPhone (Adam1):** Find Adam2's phone number, send message
- [ ] **Say:** "Now let me log in as the recipient on Android to show real-time delivery"
- [ ] **Android:** Log in as Adam2
- [ ] **Show:** Unread indicator (blue dot) on conversation
- [ ] **Say:** "Unread indicators show which conversations have new messages"
- [ ] **Android (Adam2):** Open chat, show message from Adam1
- [ ] **Android (Adam2):** Reply to Adam1
- [ ] **iPhone (Adam1):** Show message appearing in real-time
- [ ] **Say:** "Messages sync instantly across devices with typing indicators and read receipts"

#### 1.3 Push Notifications

- [ ] **Android (Adam2):** Stay in different screen
- [ ] **iPhone (Adam1):** Send another message
- [ ] **Show:** Push notification on Android
- [ ] **Say:** "Local push notifications include sender name and message preview"

#### 1.4 Session Persistence

- [ ] **iPhone:** Force-quit and reopen Expo Go
- [ ] **Show:** Auto-login, conversation still loaded
- [ ] **Say:** "Session persistence means users stay logged in across app restarts"

---

### **Part 2: User Discovery & Group Chats** (2 min)

#### 2.1 Phone Number Auto-Formatting (Android - Adam2)

- [ ] **Android:** Go to "New Chat" tab
- [ ] **Show:** Type phone number for Adam3
- [ ] **Say:** "Phone number auto-formatting as you type: (555)123-4567"
- [ ] **Show:** Try to add own number
- [ ] **Say:** "Can't message yourself, validation prevents it"

#### 2.2 Create Group Chat

- [ ] **Android:** Add Adam1 to selected users (now 2 total)
- [ ] **Show:** Button text changes to "Create Group"
- [ ] **Say:** "Auto-detects group chat when 2+ users selected"
- [ ] **Android:** Enter group name, create group chat
- [ ] **Say:** "Invitation sent to both members, they'll see it in their invitations"

---

### **Part 3: Workspaces & Invitations** (3 min)

#### 3.1 Create Workspace (Android - Adam2)

- [ ] **Android:** Go to Workspaces tab
- [ ] **Show:** Create workspace button
- [ ] **Say:** "Only Pro users can create workspaces, $0.50 per user per month for 2-25 members"
- [ ] **Android:** Create workspace (name: "Demo Team")
- [ ] **Android:** Invite Adam3 and Adam1 to workspace
- [ ] **Say:** "Workspace invitations go to all invited members"

#### 3.2 Export Workspace

- [ ] **Android:** Workspace settings → Export
- [ ] **Show:** JSON file with share sheet
- [ ] **Say:** "Admins can export all workspace data including messages, members, and settings"

#### 3.3 Accept Invitations (Android - Adam1)

- [ ] **Android:** Log out from Adam2
- [ ] **Android:** Log in as Adam1
- [ ] **Show:** Notification badge on profile (red, shows count)
- [ ] **Android:** Open invitations screen
- [ ] **Show:** Group chat invitation + Workspace invitation
- [ ] **Android:** Accept group chat invitation
- [ ] **Say:** "After accepting, see all previous messages instantly"
- [ ] **Android:** Accept workspace invitation
- [ ] **Android:** Start DM with Adam2 in workspace context

#### 3.4 Accept & Spam Report (Android - Adam3)

- [ ] **Android:** Log out from Adam1
- [ ] **Android:** Log in as Adam3
- [ ] **Android:** Accept group chat invitation
- [ ] **Android:** Go to invitations → DM invitation
- [ ] **Android:** Report as spam
- [ ] **Say:** "Spam reporting tracks strikes with 30-day decay, temp bans at 2 strikes, permanent at 5"
- [ ] **Android:** Go to workspace invitation
- [ ] **Android:** Report as spam
- [ ] **Browser:** Show Firestore console with spam fields updated
- [ ] **Say:** "Spam data persists in database, includes strike count, last report time, and ban status"

---

### **Part 4: Real-Time Features** (2 min)

#### 4.1 Status & Timestamps (Android - Adam3)

- [ ] **Android:** Open chat with Adam1
- [ ] **Show:** Last seen timestamp
- [ ] **Say:** "Shows when user was last active if they're offline"
- [ ] **Show:** Online status (green dot) if Adam1 is active
- [ ] **Show:** Message timestamps
- [ ] **Say:** "All timestamps use server time for consistency"

#### 4.2 Read Receipts & Typing

- [ ] **iPhone (Adam1):** Send message to Adam3
- [ ] **iPhone:** Show single checkmark (✓)
- [ ] **Say:** "Single checkmark means sent, double checkmark means read"
- [ ] **Android (Adam3):** Open chat
- [ ] **iPhone:** Show double checkmark (✓✓)
- [ ] **Android (Adam3):** Start typing
- [ ] **iPhone:** Show "Adam3 is typing..."
- [ ] **Say:** "Real-time typing indicators with 500ms debouncing"

---

### **Part 5: Subscription & Trial System** (2 min)

#### 5.1 Pro User Profile (Android - Adam2)

- [ ] **Android:** Log out from Adam3
- [ ] **Android:** Log in as Adam2
- [ ] **Android:** Go to Profile screen
- [ ] **Show:** Pro badge, subscription expiration date
- [ ] **Say:** "Pro users get full AI access everywhere, can create workspaces"
- [ ] **Android:** Manage Subscription screen
- [ ] **Show:** $3/month Pro subscription details

#### 5.2 Free User & Trial Flow (Android - Adam2 downgraded)

- [ ] **Terminal:** Run `node scripts/downgradeUser.js Adam2_UID`
- [ ] **Android:** Reload profile
- [ ] **Show:** Free user status
- [ ] **Android:** Try to create workspace
- [ ] **Show:** "Pro users only" error
- [ ] **Android:** Start free trial
- [ ] **Say:** "All new users get 5-day free trial with full AI access"
- [ ] **Android:** Profile → Show trial badge with expiration
- [ ] **Say:** "Trial users can use AI everywhere but can't create workspaces"

---

### **Part 6: AI Features** (3 min)

#### 6.1 Re-login as Pro User (Android - Adam2)

- [ ] **Android:** Log out, log back in as Adam2 (Pro)
- [ ] **Android:** Open workspace chat with messages

#### 6.2 AI Features Menu

- [ ] **Android:** Tap sparkles icon (✨) in header
- [ ] **Show:** AI features menu

#### 6.3 Semantic Search

- [ ] **Android:** Select "Search"
- [ ] **Android:** Type query (e.g., "budget")
- [ ] **Show:** Relevant messages highlighted
- [ ] **Say:** "Semantic search powered by OpenAI embeddings, finds meaning not just keywords"

#### 6.4 Conversation Summary

- [ ] **Android:** AI menu → "Summary"
- [ ] **Show:** Generated summary with key points
- [ ] **Say:** "Summarizes last 50 messages, updates as conversation grows"

#### 6.5 Action Items

- [ ] **Android:** AI menu → "Action Items"
- [ ] **Show:** Extracted tasks with priorities
- [ ] **Say:** "AI identifies actionable tasks from natural conversation"

#### 6.6 Decisions

- [ ] **Android:** AI menu → "Decisions"
- [ ] **Show:** Key decisions tracked with context
- [ ] **Say:** "Tracks important decisions made in the conversation"

#### 6.7 Meeting Scheduler

- [ ] **Android:** AI menu → "Meeting Scheduler"
- [ ] **Show:** Suggested meeting times
- [ ] **Say:** "Analyzes availability mentions to suggest meeting times"

---

### **Part 7: Workspace Admin Features** (2 min)

#### 7.1 Edit & Save AI Content

- [ ] **Android:** Still in workspace chat
- [ ] **Android:** Open "Summary"
- [ ] **Show:** "Edit & Save" button (admin only)
- [ ] **Android:** Edit summary, save
- [ ] **Say:** "Workspace admins can edit and save AI-generated content"
- [ ] **Android:** Show "View Fresh AI" vs "View Saved" toggle
- [ ] **Say:** "Toggle between saved version and fresh AI analysis"
- [ ] **Android:** Repeat for "Action Items" and "Decisions"

#### 7.2 Assign Action Items

- [ ] **Android:** Open "Action Items"
- [ ] **Show:** Per-item "Assign" button
- [ ] **Android:** Assign item to Adam1
- [ ] **Show:** Assignee name appears on item
- [ ] **Say:** "Admins can assign action items to specific workspace members"

#### 7.3 Mark Urgent

- [ ] **Android:** Long-press a message
- [ ] **Show:** "Mark Urgent" option
- [ ] **Android:** Tap "Mark Urgent"
- [ ] **Show:** Red badge (🔴) appears on message
- [ ] **Say:** "Admins can manually mark up to 5 messages as urgent per chat, overrides AI priority detection"
- [ ] **Android:** Long-press again → "Unmark Urgent"
- [ ] **Show:** Badge disappears instantly (optimistic UI)

#### 7.4 Pin Messages

- [ ] **Android:** Long-press a different message
- [ ] **Show:** "Pin Message" option
- [ ] **Android:** Tap "Pin Message"
- [ ] **Android:** Tap red pin icon (📌) in header (right side)
- [ ] **Show:** Pinned Messages modal with message
- [ ] **Say:** "Admins can pin up to 5 important messages, visible to all workspace members"
- [ ] **Android:** Tap "Jump to Message"
- [ ] **Show:** Scroll to pinned message in chat
- [ ] **Android:** Open pinned messages → "Unpin"
- [ ] **Say:** "Easy to unpin and reorder as needed"

---

## 🎯 Closing Points

### Architecture Highlights

- [ ] **Say:** "Built on React Native with Expo for rapid cross-platform development"
- [ ] **Say:** "Hybrid state management: Zustand for global state, component state for screens - keeps things fast and clean"
- [ ] **Say:** "Real-time Firebase Firestore with WebSocket connections - sub-100ms message delivery"
- [ ] **Say:** "40+ serverless Cloud Functions: on-demand for AI, scheduled for background processing, triggered for real-time features"
- [ ] **Say:** "Optimistic UI everywhere - messages appear instantly, rollback on error"
- [ ] **Say:** "Offline-first with local persistence - queue messages when offline, auto-sync when back online"
- [ ] **Say:** "Smart denormalization strategy - participants embedded in messages for fast security rules, no extra database reads"
- [ ] **Say:** "Server timestamps for everything - never trust client clocks, guarantees correct message ordering"
- [ ] **Say:** "AI pipeline: Claude Sonnet 4 for LLM tasks, OpenAI embeddings with Pinecone vector DB for semantic search"

### Final Stats

- [ ] **Say:** "Built in 6 weeks across 4 phases: Core messaging, AI features, Workspaces, Paid tier"
- [ ] **Say:** "100+ features, 370+ unit tests, production-ready with enterprise-grade security rules"
- [ ] **Show:** Quick scroll through codebase (optional)

---

## 📋 Abbreviated Corner Notes (During Recording)

**Keep these visible in corner or memorize:**

```
1. PERF: Scroll + burst
2. RT: Send (iPhone) → rcv (Android) → notif
3. PERSIST: Reload iPhone
4. NEW: Phone format, can't self, group
5. WORK: Create, export, invite
6. INVITE: Accept (A1), accept+spam (A3)
7. STATUS: Last seen, read receipts, typing
8. SUB: Pro profile → downgrade → trial
9. AI: Search, Summary, Actions, Decisions, Scheduler
10. ADMIN: Edit/save, assign, urgent, pin
```

---

## ⚠️ Troubleshooting

### If something breaks

- **Messages not syncing:** Check internet connection, restart Firestore listeners
- **Login fails:** Verify test user credentials in script
- **AI not loading:** Check OpenAI API quota
- **Emulator slow:** Reduce animation speed or use physical device

### Quick fixes

- **Restart Expo:** `Ctrl+C` → `npx expo start --tunnel --clear`
- **Clear cache:** Force-quit apps, clear browser cache
- **Reset data:** Re-run population script

---

**Total Demo Time:** 12-15 minutes  
**Key Message:** Full-featured messaging app with AI, workspaces, and Pro features, built production-ready in 6 weeks.
