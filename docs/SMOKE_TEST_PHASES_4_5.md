# Quick Smoke Test: Phases 4 & 5

**Time Required:** ~10-15 minutes  
**Devices Needed:** 2 test devices/simulators  
**Test Accounts:** User A (Device 1), User B (Device 2)

---

## 🔥 Prerequisites

- [ ] Both devices logged in with different test accounts
- [ ] Both devices have network connectivity
- [ ] Firebase console accessible (to verify data if needed)

---

## Phase 4: Group Messaging

### Test 1: Create & Join Group Chat
**On Device 1 (User A):**
1. [ ] Tap "New Group" or create group chat
2. [ ] Add User B as participant
3. [ ] Set group name: "Test Group"
4. [ ] Create the group

**On Device 2 (User B):**
5. [ ] Group appears in conversation list
6. [ ] Group has **people icon** 👥 next to name
7. [ ] Tap to open group chat

---

### Test 2: Group Messages & Sender Names
**On Device 1:**
1. [ ] Send message: "Hello from User A"

**On Device 2:**
2. [ ] Message appears with **sender name** above it ("User A")
3. [ ] Send reply: "Hi from User B"

**On Device 1:**
4. [ ] Reply appears with **sender name** ("User B")

---

### Test 3: Group Header
**On either device:**
1. [ ] Open the group chat
2. [ ] Header shows: "Test Group **(2 members)**"
3. [ ] Participant count is correct

---

## Phase 5: Real-Time Features

### Test 4: Typing Indicators (Direct Chat)
**On Device 1:**
1. [ ] Open direct chat with User B
2. [ ] Start typing (don't send)

**On Device 2:**
3. [ ] Open same direct chat
4. [ ] See **"User A is typing..."** indicator
5. [ ] Wait 1-2 seconds after User A stops typing
6. [ ] Typing indicator **disappears**

---

### Test 5: Typing Indicators (Group Chat)
**On Device 1:**
1. [ ] Open "Test Group"
2. [ ] Start typing (don't send)

**On Device 2:**
3. [ ] Open "Test Group"
4. [ ] See **"User A is typing..."**
5. [ ] Start typing yourself

**On Device 1:**
6. [ ] See **"User B is typing..."**

---

### Test 6: Online/Offline Status (Conversation List)
**On Device 1:**
1. [ ] Go to conversation list
2. [ ] Find User B's direct chat
3. [ ] See **green dot** 🟢 next to User B's name (online)

**On Device 2:**
4. [ ] Background the app (or logout)

**On Device 1:**
5. [ ] Wait ~5 seconds
6. [ ] Green dot **disappears**
7. [ ] See **"Last seen X minutes ago"** (or just "Last seen")

---

### Test 7: Online Status in Chat Header (Direct Chat)
**On Device 2:**
1. [ ] Open app (come back online)

**On Device 1:**
2. [ ] Open direct chat with User B
3. [ ] Header shows **green dot** 🟢 and **"Online"**

**On Device 2:**
4. [ ] Background app

**On Device 1:**
5. [ ] Wait ~5 seconds
6. [ ] Green dot disappears
7. [ ] See **"Last seen X minutes ago"**

---

### Test 8: Read Receipts (Direct Chat)
**On Device 1:**
1. [ ] Send message: "Testing read receipts"
2. [ ] See **single checkmark** ✓ next to message

**On Device 2:**
3. [ ] Open the chat (read the message)

**On Device 1:**
4. [ ] Checkmark changes to **double checkmark** ✓✓
5. [ ] Change happens within 1-2 seconds

---

### Test 9: Read Receipts (Group Chat)
**On Device 1:**
1. [ ] Open "Test Group"
2. [ ] Send message: "Group read receipt test"
3. [ ] See **single checkmark** ✓ (not everyone read)

**On Device 2:**
4. [ ] Open "Test Group" (read the message)

**On Device 1:**
5. [ ] Message still shows **single checkmark** ✓ (if group has 3+ members)
6. [ ] OR shows **double checkmark** ✓✓ (if only 2 members, both read)

---

### Test 10: All Features Together (Integration)
**Full flow:**

1. **On Device 2:** Close app (go offline)
2. **On Device 1:** 
   - [ ] Open direct chat with User B
   - [ ] Verify User B shows **offline** (no green dot)
   - [ ] Send message: "Are you there?"
   - [ ] See **single checkmark** ✓ (sent but not read)

3. **On Device 2:**
   - [ ] Open app (come online)
   - [ ] Wait 2-3 seconds

4. **On Device 1:**
   - [ ] User B shows **online** (green dot appears)
   
5. **On Device 2:**
   - [ ] Open chat with User A
   - [ ] See message "Are you there?"
   - [ ] Start typing reply (don't send yet)

6. **On Device 1:**
   - [ ] Message now shows **double checkmark** ✓✓ (User B read it)
   - [ ] See **"User B is typing..."** indicator

7. **On Device 2:**
   - [ ] Send reply: "Yes, I'm here!"

8. **On Device 1:**
   - [ ] Typing indicator disappears
   - [ ] Reply appears immediately
   - [ ] Reply shows **✓✓** (you've read it)

---

## ✅ Success Criteria

**Phase 4:**
- ✅ Groups have people icon in list
- ✅ Group header shows participant count
- ✅ Sender names appear above messages in groups

**Phase 5:**
- ✅ Typing indicators appear/disappear correctly
- ✅ Online status (green dot) updates within ~5 seconds
- ✅ Read receipts: ✓ (sent) → ✓✓ (read)
- ✅ All features work together smoothly

---

## 🐛 Common Issues

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| No typing indicator | Firestore rules not updated | Update security rules in Firebase Console |
| Online status doesn't update | App state listener not working | Check `app/_layout.tsx` presence code |
| Read receipts stuck on ✓ | lastRead not updating | Open Firebase Console, check conversation doc |
| Group icon missing | Ionicons import issue | Check `components/ConversationItem.tsx` |

---

## 📝 Test Results

**Date:** _____________  
**Tester:** _____________  
**Result:** ⬜ PASS / ⬜ FAIL  
**Issues Found:** _____________

---

## 🚀 Next Steps After Passing

1. [ ] Update `/docs/PROGRESS_TRACKER.md`:
   - Mark Phase 4 as tested ✅
   - Mark Phase 5 as tested ✅
2. [ ] Consider updating Firestore security rules (if not done)
3. [ ] Ready to move to Phase 6 (if applicable)

