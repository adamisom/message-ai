# Phase 4: Group Messaging - Test Plan

**Status:** Ready for Testing  
**Created:** October 22, 2025  
**Purpose:** Comprehensive multi-device testing guide for group chat functionality

---

## Overview

This test plan verifies that group messaging works correctly with 3+ participants, including:
- Sender name display in group messages
- Group headers with participant counts
- Real-time message delivery to all participants
- Visual distinction between direct and group chats

**Note:** This is an optional testing phase. The core implementation is complete from Phase 3, and Phase 4 adds polish and validation.

---

## Prerequisites

### 1. Test Accounts

Create at least **3 test user accounts** in Firebase Authentication:

| Account | Email | Display Name | Notes |
|---------|-------|--------------|-------|
| User A | test1@example.com | Alice | Primary test account |
| User B | test2@example.com | Bob | Secondary account |
| User C | test3@example.com | Charlie | Tertiary account |
| User D (optional) | test4@example.com | Diana | For 4+ user testing |
| User E (optional) | test5@example.com | Eve | For stress testing |

**To create accounts:**
1. Open app on device/emulator
2. Tap "Register"
3. Enter email, display name, password
4. Confirm registration
5. Logout and repeat for each account

---

### 2. Testing Setup Options

Choose one of the following setups based on available resources:

#### **Option A: Physical Device + Emulator** (Recommended)
- **Pros:** Balance of convenience and realism, easy to manage
- **Cons:** Requires USB cable or same WiFi network

**Setup:**
1. Connect iPhone/Android phone via USB (or use Expo Go over WiFi)
2. Start Android emulator (Android Studio → AVD Manager)
3. Run `npx expo start --clear`
4. App deploys to both devices

---

#### **Option B: 2 Physical Devices + 1 Emulator** (Best Real-World Test)
- **Pros:** Most realistic, easy to see simultaneous updates
- **Cons:** Requires 2 physical devices

**Setup:**
1. Install Expo Go on both phones
2. Start emulator
3. Run `npx expo start --tunnel`
4. Scan QR code on both phones
5. App opens on all 3 devices

---

#### **Option C: 3 Emulator Instances** (Last Resort)
- **Pros:** No physical devices needed, all on one machine
- **Cons:** High CPU/memory usage, slower

**Setup (Android):**
1. Open Android Studio → AVD Manager
2. Launch first emulator (wait for full boot)
3. Launch second emulator
4. Launch third emulator
5. Run `npx expo start`
6. Press `a` to open on first emulator
7. From Expo dev tools, select other emulators

**Note:** Running 3 emulators requires 16GB+ RAM

---

#### **Option D: Mix of iOS Simulator + Android Emulator**
- **Pros:** Tests cross-platform compatibility
- **Cons:** Only works on macOS

**Setup:**
1. Start iOS Simulator: `npx expo start --ios`
2. Start Android Emulator: `npx expo start --android`
3. Use physical device for third user

---

## Test Scenarios

### **Test Suite 1: Group Creation & UI Verification**

#### Test 1.1: Create Group with 3 Users
**Goal:** Verify group creation works correctly

**Steps:**
1. Login as **User A** (Alice)
2. Go to "New Chat" tab
3. Switch to "Group Chat" mode
4. Enter **test2@example.com** → Tap "Add User"
5. Enter **test3@example.com** → Tap "Add User"
6. Tap "Create Group"

**Expected Results:**
- ✅ Navigates to chat screen
- ✅ Header shows "Group (3 members)"
- ✅ Empty message area (no errors)
- ✅ Message input is enabled

**Pass/Fail:** _____

---

#### Test 1.2: Verify Group Icon in Conversation List
**Goal:** Confirm group conversations show a people icon

**Steps:**
1. From chat screen (Test 1.1), go back to "Chats" tab
2. Observe the newly created group conversation

**Expected Results:**
- ✅ Group conversation appears at top of list
- ✅ People icon (👥) visible next to group name
- ✅ Shows "No messages yet" as preview
- ✅ Timestamp shows "Just now"

**Pass/Fail:** _____

---

#### Test 1.3: Verify Header Shows Participant Count
**Goal:** Ensure group header dynamically shows member count

**Steps:**
1. Tap on the group conversation to open it
2. Check the header at top of screen

**Expected Results:**
- ✅ Header shows "Group (3 members)" format
- ✅ Count matches actual participants (3)

**Pass/Fail:** _____

---

### **Test Suite 2: Message Sending & Display**

#### Test 2.1: Send Message from User A
**Goal:** Verify own messages display correctly

**Steps:**
1. Login as **User A** on Device 1
2. Open the group chat
3. Type "Message from Alice" and send

**Expected Results on User A's device:**
- ✅ Message appears immediately (optimistic update)
- ✅ Message is right-aligned with blue bubble
- ✅ **No sender name shown** (own message)
- ✅ Timestamp shows "Just now"
- ✅ No status icon or checkmark shows (sent successfully)

**Pass/Fail:** _____

---

#### Test 2.2: Receive Message on User B
**Goal:** Verify received messages show sender name

**Steps:**
1. Login as **User B** on Device 2
2. Navigate to "Chats" tab
3. Open the group conversation
4. Observe the message from User A

**Expected Results on User B's device:**
- ✅ Message appears within 1-2 seconds
- ✅ Message is left-aligned with gray bubble
- ✅ **"Alice" shown above message** (sender name)
- ✅ Timestamp shows "Just now"
- ✅ Sender name is readable (slightly bold, gray)

**Pass/Fail:** _____

---

#### Test 2.3: Receive Message on User C
**Goal:** Verify all participants receive messages

**Steps:**
1. Login as **User C** on Device 3
2. Navigate to "Chats" tab (should show new conversation)
3. Open the group conversation
4. Observe the message from User A

**Expected Results on User C's device:**
- ✅ Group conversation appears in list
- ✅ Message preview shows "Message from Alice"
- ✅ Inside chat: message left-aligned, gray bubble
- ✅ **"Alice" shown above message**
- ✅ Timestamp shows "Just now"

**Pass/Fail:** _____

---

#### Test 2.4: Multi-User Message Exchange
**Goal:** Verify messages from different users display correctly

**Steps:**
1. **User A:** Send "Hi from Alice"
2. **User B:** Send "Hi from Bob"
3. **User C:** Send "Hi from Charlie"

**Expected Results on EACH device:**

**On User A's device:**
- ✅ "Hi from Alice" → right-aligned, blue, no name
- ✅ "Hi from Bob" → left-aligned, gray, "Bob" shown
- ✅ "Hi from Charlie" → left-aligned, gray, "Charlie" shown

**On User B's device:**
- ✅ "Hi from Alice" → left-aligned, gray, "Alice" shown
- ✅ "Hi from Bob" → right-aligned, blue, no name
- ✅ "Hi from Charlie" → left-aligned, gray, "Charlie" shown

**On User C's device:**
- ✅ "Hi from Alice" → left-aligned, gray, "Alice" shown
- ✅ "Hi from Bob" → left-aligned, gray, "Bob" shown
- ✅ "Hi from Charlie" → right-aligned, blue, no name

**Pass/Fail:** _____

---

### **Test Suite 3: Real-Time Sync**

#### Test 3.1: Real-Time Message Delivery
**Goal:** Verify messages appear instantly on all devices

**Steps:**
1. Arrange all 3 devices side-by-side
2. **User A:** Send "Testing real-time sync"
3. Watch User B and C's screens simultaneously

**Expected Results:**
- ✅ Message appears on User B's screen within 1-2 seconds
- ✅ Message appears on User C's screen within 1-2 seconds
- ✅ No manual refresh needed
- ✅ Sender name "Alice" shows on B and C
- ✅ Auto-scrolls to new message

**Pass/Fail:** _____

---

#### Test 3.2: Rapid Message Sequence
**Goal:** Ensure rapid messages don't cause issues

**Steps:**
1. **User A:** Send 3 messages quickly: "One", "Two", "Three"
2. **User B:** Send 2 messages quickly: "Four", "Five"
3. **User C:** Send 1 message: "Six"

**Expected Results on ALL devices:**
- ✅ All 6 messages appear on all devices
- ✅ Correct chronological order: One, Two, Three, Four, Five, Six
- ✅ Sender names correct on each message
- ✅ No duplicates
- ✅ No missing messages
- ✅ UI doesn't lag or freeze

**Pass/Fail:** _____

---

#### Test 3.3: Background to Foreground Sync
**Goal:** Verify messages sync when returning to app

**Steps:**
1. **User A:** Keep app open in foreground
2. **User B:** Put app in background (home screen)
3. **User A:** Send "Background test message"
4. Wait 5 seconds
5. **User B:** Open app from background

**Expected Results on User B's device:**
- ✅ Message appears when app returns to foreground
- ✅ Sender name "Alice" shown
- ✅ Timestamp correct
- ✅ Conversation list updated with preview

**Pass/Fail:** _____

---

### **Test Suite 4: Conversation List Updates**

#### Test 4.1: Last Message Preview
**Goal:** Verify conversation list shows correct preview

**Steps:**
1. **User A:** Send "Last message preview test"
2. **User A:** Go back to "Chats" tab
3. Check conversation list

**Expected Results on User A's device:**
- ✅ Group conversation at top of list
- ✅ Preview shows "Last message preview test"
- ✅ Timestamp shows "Just now"
- ✅ Group icon (👥) visible

**Pass/Fail:** _____

---

#### Test 4.2: Multiple Groups Sorting
**Goal:** Ensure groups sort by most recent message

**Steps:**
1. Create **Group A** (Alice, Bob, Charlie)
2. Create **Group B** (Alice, Bob, Diana)
3. **In Group A:** Send "Message in A"
4. Wait 10 seconds
5. **In Group B:** Send "Message in B"
6. Go to "Chats" tab

**Expected Results:**
- ✅ Group B appears at top (most recent)
- ✅ Group A appears below
- ✅ Both show correct last message previews
- ✅ Both show group icons
- ✅ Timestamps are different

**Pass/Fail:** _____

---

### **Test Suite 5: Edge Cases**

#### Test 5.1: Group with 5+ Users (Optional Stress Test)
**Goal:** Verify performance with more users

**Steps:**
1. Create group with 5 participants: Alice, Bob, Charlie, Diana, Eve
2. Each user sends 1 message
3. Observe delivery speed and UI performance

**Expected Results:**
- ✅ All messages deliver to all 5 users
- ✅ Delivery time < 3 seconds per message
- ✅ UI remains responsive (no lag)
- ✅ Sender names correct for all messages
- ✅ Header shows "Group (5 members)"

**Pass/Fail:** _____

---

#### Test 5.2: Long Sender Names
**Goal:** Ensure long names don't break UI

**Steps:**
1. Create test account with long display name: "Christopher Alexander Thompson"
2. Add to group
3. Send message from that user

**Expected Results:**
- ✅ Sender name displays without truncation issues
- ✅ Message bubble layout not broken
- ✅ Text readable and properly spaced

**Pass/Fail:** _____

---

#### Test 5.3: Empty Group Name
**Goal:** Verify fallback when no group name set

**Steps:**
1. Create group without setting a custom name
2. Open chat screen

**Expected Results:**
- ✅ Header shows "Group (X members)" format
- ✅ Conversation list shows "Group (X members)"
- ✅ No empty text or "undefined"

**Pass/Fail:** _____

---

### **Test Suite 6: Direct Chat Comparison**

#### Test 6.1: Direct Chat (No Sender Names)
**Goal:** Ensure sender names DON'T show in 1-on-1 chats

**Steps:**
1. Create direct chat (Alice ↔ Bob)
2. **User A:** Send "Direct message test"
3. **User B:** Check received message

**Expected Results on User B's device:**
- ✅ Message appears
- ✅ **No sender name shown** (direct chat)
- ✅ Message left-aligned, gray bubble
- ✅ Header shows "Alice" (not "Group (2 members)")

**Pass/Fail:** _____

---

## Verification Checklist

After completing all tests, verify:

### Code Quality
- [ ] No TypeScript errors in modified files
- [ ] No linter errors
- [ ] All console logs from tests are clean (no errors)

### UI Polish
- [ ] Group icon (👥) visible on all group conversations
- [ ] Sender names are readable (good contrast, slightly bold)
- [ ] Participant count shows in header
- [ ] Own messages never show sender name (in any chat type)

### Functionality
- [ ] Can create group with 3+ users
- [ ] Messages deliver to all participants
- [ ] Real-time sync works (< 2 second delivery)
- [ ] Rapid messages don't break ordering
- [ ] Conversation list updates correctly

### Performance
- [ ] No UI lag when scrolling messages
- [ ] Messages deliver within 2-3 seconds (even with 5 users)
- [ ] No duplicate messages
- [ ] No memory leaks (app doesn't slow down over time)

### Data Integrity
- [ ] Check Firestore Console: messages have `senderName` field
- [ ] Check Firestore Console: conversations have `type: "group"`
- [ ] Check Firestore Console: `participants` array includes all members

---

## Common Issues & Solutions

### Issue: Sender names not showing in groups
**Symptoms:** All messages appear without names, even in groups

**Debug Steps:**
1. Check `MessageList.tsx` line 47: `showSenderName={conversationType === 'group'}`
2. Check `ChatScreen` passes `conversationType={conversation.type}`
3. Add console log: `console.log('Conversation type:', conversation.type)`
4. Verify Firestore: conversation doc has `type: "group"`

**Fix:** Ensure conversation type is correctly set during group creation

---

### Issue: Own messages show sender name
**Symptoms:** Your own messages show your name above them

**Debug Steps:**
1. Check `MessageBubble.tsx` line 44: `{showSenderName && !isOwnMessage && ...}`
2. Verify `isOwnMessage` logic: `item.senderId === currentUserId`
3. Add console log: `console.log('Own message check:', item.senderId, currentUserId)`

**Fix:** Ensure `currentUserId` matches Firebase Auth UID

---

### Issue: Messages not appearing for some users
**Symptoms:** User C doesn't receive messages that Users A and B see

**Debug Steps:**
1. Check Firestore Console → Conversations → [group_id]
2. Verify `participants` array includes User C's UID
3. Check Firestore security rules allow User C to read

**Fix:** Recreate group ensuring all users are added, or manually add UID in Firestore

---

### Issue: Header shows "Chat" instead of "Group (3 members)"
**Symptoms:** Header doesn't update to show participant count

**Debug Steps:**
1. Add console log in `useEffect` that sets header
2. Check if `conversation.type` is "group" or "direct"
3. Verify `conversation.participants.length` is correct

**Fix:** Ensure conversation document in Firestore has correct `type` field

---

### Issue: Group icon not showing
**Symptoms:** No people icon next to group names in list

**Debug Steps:**
1. Check `ConversationItem.tsx` imports Ionicons
2. Verify `conversation.type === 'group'` condition
3. Check if icon is hidden by CSS (flexbox issue)

**Fix:** Ensure `nameContainer` has `flexDirection: 'row'`

---

### Issue: Slow message delivery (> 5 seconds)
**Symptoms:** Messages take a long time to appear on other devices

**Possible Causes:**
- Network connection is slow
- Firestore index missing (check console errors)
- Too many messages in conversation (> 1000)

**Debug Steps:**
1. Check device network speed (WiFi vs cellular)
2. Look for Firestore index error in console
3. Test with new group (fresh conversation)

**Acceptable Performance:**
- 3 users: 1-2 seconds
- 5 users: 2-3 seconds
- 10 users: 3-5 seconds

---

## Test Results Summary

**Date Tested:** _________________  
**Tester:** _________________  
**Devices Used:** _________________

| Test Suite | Tests Passed | Tests Failed | Notes |
|------------|--------------|--------------|-------|
| Suite 1: Group Creation & UI | __ / 3 | __ / 3 | |
| Suite 2: Message Display | __ / 4 | __ / 4 | |
| Suite 3: Real-Time Sync | __ / 3 | __ / 3 | |
| Suite 4: Conversation List | __ / 2 | __ / 2 | |
| Suite 5: Edge Cases | __ / 3 | __ / 3 | |
| Suite 6: Direct Chat | __ / 1 | __ / 1 | |
| **TOTAL** | **__ / 16** | **__ / 16** | |

**Overall Status:** ⬜ PASS | ⬜ FAIL | ⬜ PARTIAL

---

## Next Steps

### If All Tests Pass ✅
1. Update `docs/PROGRESS_TRACKER.md` → Mark Phase 4 complete
2. Commit changes: `git commit -m "feat: complete Phase 4 - group messaging enhancements"`
3. Proceed to Phase 5 (Real-Time Features)

### If Some Tests Fail ⚠️
1. Document failures in "Test Results Summary"
2. Fix issues based on "Common Issues & Solutions"
3. Re-run failed tests
4. Repeat until all pass

### If Major Issues Found 🔴
1. Roll back to previous commit
2. Review Phase 3 implementation
3. Check Firestore security rules
4. Verify Firebase indexes exist

---

## Appendix: Quick Test Commands

### Create Multiple Test Accounts (Script)
You can automate account creation using this pattern:

```typescript
// In a test script or console
const testAccounts = [
  { email: 'test1@example.com', name: 'Alice', password: 'test123' },
  { email: 'test2@example.com', name: 'Bob', password: 'test123' },
  { email: 'test3@example.com', name: 'Charlie', password: 'test123' },
];

// Register each in Firebase Console or via app UI
```

### Check Firestore Data
Navigate to Firebase Console → Firestore Database:

**Verify conversation structure:**
```
/conversations/{conversationId}
  - type: "group"
  - participants: [uid1, uid2, uid3]
  - participantDetails: { ... }
  - name: "Group Chat"
```

**Verify message structure:**
```
/conversations/{conversationId}/messages/{messageId}
  - text: "Hello"
  - senderId: "uid1"
  - senderName: "Alice"
  - participants: [uid1, uid2, uid3]
  - createdAt: Timestamp
```

---

**End of Test Plan**

