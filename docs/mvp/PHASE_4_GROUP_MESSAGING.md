# Phase 4: Group Messaging Enhancements

**Time:** 1-2 hours | **Goal:** Verify group chats work, test with 3+ users, add optional UI polish

**Prerequisites:** Phase 0-3 complete (messaging functional)

---

## Objectives

- ✅ Verify group messages show sender names
- ✅ Test with 3+ participants (all receive messages)
- ✅ Group headers show participant count
- ✅ Optional: Add group icon to conversations list

**Note:** Phase 3 **fully implemented** group chat. This phase is **verification + testing**.

---

## What Phase 3 Already Provides

Phase 3 included complete group support:
- ✅ `MessageBubble` shows sender names when `showSenderName={true}`
- ✅ `MessageList` passes `conversationType="group"` to bubbles
- ✅ `ChatScreen` updates header dynamically
- ✅ Group creation from Phase 2

**Phase 4 = Testing + optional polish**

---

## Before Starting

### Verify Phase 3 Complete
- [ ] Messages send/receive in 1-on-1 chats
- [ ] Messages send/receive in group chats
- [ ] `MessageBubble` has sender name logic
- [ ] Dynamic header titles work

### Verify Firestore Rules

**Check Firebase Console → Firestore → Rules:**

```javascript
match /conversations/{conversationId}/messages/{messageId} {
  allow read, write: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
}
```

This rule works for both direct and group chats (checks `participants` array).

---

## Task 4.1: Verify Message Display

### Step 1: Check MessageBubble

**Verify `components/MessageBubble.tsx` has:**

```typescript
{showSenderName && !isOwn && (
  <Text style={styles.senderName}>{message.senderName || 'Unknown'}</Text>
)}
```

**Optional Enhancement:** Make sender name bolder:
```typescript
senderName: {
  fontSize: 12,
  fontWeight: '600', // Enhanced from '400'
  color: '#666',
  marginBottom: 4,
  marginLeft: 12,
},
```

✅ **Checkpoint:** Sender names visible in groups

---

## Task 4.2: Verify Header Display

### Check ChatScreen Header Logic

**Verify `app/chat/[id].tsx` has:**

```typescript
useEffect(() => {
  if (conversation && user) {
    let title = 'Chat';
    
    if (conversation.type === 'direct') {
      const otherUserId = conversation.participants.find(id => id !== user.uid);
      if (otherUserId && conversation.participantDetails[otherUserId]) {
        title = conversation.participantDetails[otherUserId].displayName;
      }
    } else {
      // Group chat
      const participantCount = conversation.participants.length;
      title = conversation.name || `Group (${participantCount} members)`;
    }
    
    navigation.setOptions({ title });
  }
}, [conversation, user, navigation]);
```

✅ **Checkpoint:** Header shows "Group (X members)"

---

## Task 4.3: Optional Group Icon

**Add to `components/ConversationItem.tsx`:**

```typescript
// Add import
import { Ionicons } from '@expo/vector-icons';

// Inside the component, after the name:
{conversation.type === 'group' && (
  <Ionicons name="people" size={16} color="#666" style={{ marginLeft: 4 }} />
)}
```

✅ **Checkpoint:** Group icon appears in conversations list

---

## Task 4.4: Multi-Participant Testing

**Testing Setup Options:**

1. **Multiple Emulators:** Run 2-3 Android/iOS emulators (requires powerful machine)
2. **Emulator + Physical Device:** Easier, uses Expo Go on phone
3. **Multiple Physical Devices:** Best option, scan QR code on each

**Setup:**
```bash
# Terminal 1
npx expo start

# Scan QR on each device/emulator
```

### Test 4.1: Create 3-User Group
1. User A: New Chat → Group → Add User B, User C → Create
2. Expected: Group created, header shows "Group (3 members)"

### Test 4.2: User A Sends Message
1. User A: Send "Hello from A"
2. **User B:** Should see "User A" above message (gray bubble, left)
3. **User C:** Should see "User A" above message (gray bubble, left)
4. **User A:** Should see no sender name (blue bubble, right)

### Test 4.3: User B Sends Message
1. User B: Send "Hello from B"
2. **User A & C:** Should see "User B" above message

### Test 4.4: Rapid Multi-User Sending
1. User A, B, C: All send messages rapidly (3-4 messages each)
2. Expected: All messages appear on all devices, sender names correct

### Test 4.5: Message Persistence
1. All users: Force quit app → Reopen → Open group chat
2. Expected: All messages still visible with correct sender names

### Test 4.6: Group Icon (Optional)
1. User A: Go to "Chats" tab
2. Expected: ✅ Group icon visible (only if you added Step 4's optional enhancement)

---

## Common Issues

### "Insufficient permissions" in group
**Fix:** Verify Firestore rules (see "Before Starting" section)

### Sender names not showing
**Check:** 
- `MessageBubble` has `showSenderName` logic
- `MessageList` passes `conversationType="group"`
- `ChatScreen` passes conversation type correctly

### Wrong sender name displayed
**Check:** `sendMessage()` uses `user.displayName || user.email || 'Unknown User'`

### Header doesn't update
**Check:** `useEffect` has correct dependencies: `[conversation, user, navigation]`

---

## Verification Checklist

### Code Verification
- [ ] MessageBubble shows sender name when `showSenderName={true}`
- [ ] MessageList passes `conversationType` to bubbles
- [ ] ChatScreen updates header based on conversation type
- [ ] No TypeScript errors
- [ ] No linter errors

### Functionality Tests
- [ ] Created 3-user group successfully
- [ ] User A's messages appear with no sender name (on A's device)
- [ ] User B & C see "User A" above messages from A
- [ ] All participants receive messages in real-time (< 1 second)
- [ ] Sender names correct for all senders
- [ ] Messages persist after app restart
- [ ] Group header shows participant count
- [ ] Firestore rules allow group messaging

### Optional Enhancements
- [ ] Sender names styled boldly (if enhanced)
- [ ] Group icon shows in conversations list (if added)

---

## Before Phase 5

1. Test group chat with 3+ real users/devices
2. Verify all participants receive messages
3. Verify sender names display correctly
4. Commit Phase 4 work:
```bash
git add .
git commit -m "feat: complete Phase 4 - group messaging verification and enhancements"
```

**Time:** 1-2 hours | **Next:** Phase 5 (Real-Time Features - Typing, Presence, Read Receipts)
