# Phase 5: Real-Time Features

**Time:** 3-4 hours | **Goal:** Typing indicators, online/offline status, read receipts

**Prerequisites:** Phase 0-4 complete (messaging + groups working)

---

## Objectives

- ✅ Typing indicators ("User is typing...")
- ✅ Online/offline status (green dot + "Last seen")
- ✅ Read receipts (✓ sent, ✓✓ read)
- ✅ Real-time presence tracking
- ✅ Works in direct & group chats

**Reference:** mvp-prd-plus.md Section 3.4, 3.5, 3.6

---

## Firestore Schema Additions

```
/users/{uid}
├── isOnline: boolean        # NEW
├── lastSeenAt: timestamp    # NEW

/conversations/{conversationId}
├── lastRead: {              # NEW
│     uid1: messageId,
│     uid2: messageId
│   }

/conversations/{conversationId}/typingUsers/{userId}  # NEW SUBCOLLECTION
├── uid: string
├── displayName: string
├── at: timestamp
```

---

## Firestore Security Rules

**Add to Firebase Console → Firestore → Rules:**

```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}

match /conversations/{conversationId}/typingUsers/{userId} {
  allow read, write: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
}
```

---

## Task 5.1: Typing Indicators

### TypingIndicator.tsx

**Create:** `touch components/TypingIndicator.tsx`

```typescript
import { View, Text, StyleSheet } from 'react-native';

interface TypingUser {
  uid: string;
  displayName: string;
  at: any;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) return `${typingUsers[0].displayName} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing...`;
    return `${typingUsers.length} people are typing...`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{getTypingText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0f0f0' },
  text: { fontSize: 13, color: '#666', fontStyle: 'italic' },
});
```

### Update MessageInput.tsx

**Add typing logic with debounce:**

```typescript
import { useState, useRef, useEffect, useCallback } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;  // NEW
  disabled?: boolean;
}

export default function MessageInput({ onSend, onTyping, onStopTyping, disabled = false }: MessageInputProps) {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize to prevent effect from re-running on every render
  const memoizedStopTyping = useCallback(() => {
    onStopTyping();
  }, [onStopTyping]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      memoizedStopTyping(); // Clear typing before sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      onSend(trimmed);
      setText('');
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    onTyping(); // Trigger typing indicator
    
    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Clear typing after 500ms of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      memoizedStopTyping();
      typingTimeoutRef.current = null;
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      memoizedStopTyping();
    };
  }, [memoizedStopTyping]);

  // ... rest of component (same as Phase 3, but use handleTextChange)
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={handleTextChange}  // Changed from setText
        // ... rest
      />
      {/* ... send button ... */}
    </View>
  );
}
```

### Integrate in ChatScreen

**Add to `app/chat/[id].tsx`:**

```typescript
import TypingIndicator from '../../components/TypingIndicator';
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// Add state
const [typingUsers, setTypingUsers] = useState<Array<{ uid: string; displayName: string; at: any }>>([]);
const lastTypingWriteRef = useRef<number>(0);

// Listen for typing users
useEffect(() => {
  if (!conversationId || typeof conversationId !== 'string') return;

  const typingRef = collection(db, 'conversations', conversationId, 'typingUsers');
  const unsubscribe = onSnapshot(typingRef, (snapshot) => {
    const typing = snapshot.docs
      .map(doc => ({ uid: doc.id, ...doc.data() }))
      .filter(t => t.uid !== user.uid) as Array<{ uid: string; displayName: string; at: any }>;
    setTypingUsers(typing);
  });

  return unsubscribe;
}, [conversationId, user.uid]);

// Handle typing with debounce (max 1 write per 500ms)
const handleTyping = async () => {
  if (!conversationId || typeof conversationId !== 'string' || !user) return;
  
  const now = Date.now();
  if (lastTypingWriteRef.current && now - lastTypingWriteRef.current < 500) return; // Skip
  lastTypingWriteRef.current = now;
  
  try {
    await setDoc(doc(db, 'conversations', conversationId, 'typingUsers', user.uid), {
      uid: user.uid,
      displayName: user.displayName || user.email || 'Unknown',
      at: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error setting typing status:', error);
  }
};

const handleStopTyping = async () => {
  if (!conversationId || typeof conversationId !== 'string' || !user) return;
  try {
    await deleteDoc(doc(db, 'conversations', conversationId, 'typingUsers', user.uid));
  } catch (error) {
    console.error('Error clearing typing status:', error);
  }
};

// In return JSX, add before MessageInput:
<TypingIndicator typingUsers={typingUsers} />
<MessageInput
  onSend={sendMessage}
  onTyping={handleTyping}
  onStopTyping={handleStopTyping}
/>
```

✅ **Checkpoint:** Typing indicator appears/disappears

---

## Task 5.2: Online/Offline Status

### presenceService.ts

**Create:** `touch services/presenceService.ts`

```typescript
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.config';

export const setUserOnline = async (uid: string) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      isOnline: true,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });  // CRITICAL: merge to avoid overwriting existing fields
  } catch (error) {
    console.error('Error setting user online:', error);
  }
};

export const setUserOffline = async (uid: string) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      isOnline: false,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });  // CRITICAL: merge to avoid overwriting existing fields
  } catch (error) {
    console.error('Error setting user offline:', error);
  }
};
```

**Why `merge: true`?**
- Phase 1 user docs don't have `isOnline`/`lastSeenAt` fields
- `updateDoc` would fail if fields don't exist
- `setDoc` with `merge: true` safely adds new fields

### Track Presence in Root Layout

**Update `app/_layout.tsx` (ADD this useEffect, keep existing code):**

```typescript
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { setUserOnline, setUserOffline } from '../services/presenceService';
import { useAuthStore } from '../store/authStore';

// Inside your root layout component, after existing useEffects:
const { user } = useAuthStore();

useEffect(() => {
  if (!user) return;

  // Set online on mount
  setUserOnline(user.uid);

  // Listen for app state changes
  const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      setUserOnline(user.uid);
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      setUserOffline(user.uid);
    }
  });

  // Set offline on unmount
  return () => {
    subscription.remove();
    setUserOffline(user.uid);
  };
}, [user]);
```

### UserStatusBadge.tsx

**Create:** `touch components/UserStatusBadge.tsx`

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { formatLastSeen } from '../utils/timeFormat';

interface UserStatusBadgeProps {
  isOnline: boolean;
  lastSeenAt?: Date | { toDate: () => Date } | null;
  showText?: boolean;
}

export default function UserStatusBadge({ isOnline, lastSeenAt, showText = false }: UserStatusBadgeProps) {
  if (isOnline) {
    return (
      <View style={styles.container}>
        <View style={styles.onlineDot} />
        {showText && <Text style={styles.onlineText}>Online</Text>}
      </View>
    );
  }

  if (!lastSeenAt) return null;

  const lastSeenDate = lastSeenAt instanceof Date ? lastSeenAt : lastSeenAt.toDate();

  return (
    <View style={styles.container}>
      {showText && <Text style={styles.offlineText}>{formatLastSeen(lastSeenDate)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  onlineText: { fontSize: 12, color: '#4CAF50', fontWeight: '500' },
  offlineText: { fontSize: 12, color: '#999' },
});
```

### Add Status to Chat Header

**Update `app/chat/[id].tsx` (REPLACE existing header useEffect):**

```typescript
import UserStatusBadge from '../../components/UserStatusBadge';

// Add state
const [userStatuses, setUserStatuses] = useState<Record<string, { isOnline: boolean; lastSeenAt: any }>>({});

// Listen to participant statuses
useEffect(() => {
  if (!conversation || !user) return;

  const otherParticipants = conversation.participants.filter((id: string) => id !== user.uid);
  const unsubscribes = otherParticipants.map(participantId => {
    return onSnapshot(doc(db, 'users', participantId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setUserStatuses(prev => ({
          ...prev,
          [participantId]: {
            isOnline: docSnapshot.data().isOnline || false,
            lastSeenAt: docSnapshot.data().lastSeenAt,
          },
        }));
      }
    });
  });

  return () => unsubscribes.forEach(unsub => unsub());
}, [conversation, user]);

// REPLACE your existing header update useEffect with this merged version:
useEffect(() => {
  if (conversation && user) {
    let title = 'Chat';
    let headerRight = undefined;
    
    if (conversation.type === 'direct') {
      const otherUserId = conversation.participants.find((id: string) => id !== user.uid);
      if (otherUserId && conversation.participantDetails[otherUserId]) {
        title = conversation.participantDetails[otherUserId].displayName;
        
        // Phase 5: Add status badge
        const status = userStatuses[otherUserId];
        if (status) {
          headerRight = () => (
            <View style={{ marginRight: 16 }}>
              <UserStatusBadge isOnline={status.isOnline} lastSeenAt={status.lastSeenAt} showText={true} />
            </View>
          );
        }
      }
    } else {
      // Group chat
      const participantCount = conversation.participants.length;
      title = conversation.name || `Group (${participantCount} members)`;
    }
    
    navigation.setOptions({ title, headerRight });
  }
}, [conversation, user, userStatuses, navigation]);  // Added userStatuses dependency
```

✅ **Checkpoint:** Online status shows in chat header

---

## Task 5.3: Read Receipts

### Update ChatScreen for Mark-as-Read

**Add to `app/chat/[id].tsx`:**

```typescript
const lastMarkedReadRef = useRef<string | null>(null);

// Mark messages as read (prevents duplicate writes)
useEffect(() => {
  if (!conversation || !user || messages.length === 0) return;

  const lastMessage = messages[messages.length - 1];
  
  // Only mark if it's from someone else and we haven't marked this message yet
  if (lastMessage.senderId !== user.uid && lastMessage.id !== lastMarkedReadRef.current) {
    lastMarkedReadRef.current = lastMessage.id;
    
    updateDoc(doc(db, 'conversations', conversationId as string), {
      [`lastRead.${user.uid}`]: lastMessage.id,
    }).catch(err => console.error('Error marking as read:', err));
  }
}, [messages, conversation, user, conversationId]);
```

### Add Read Status Helper

**Add to `app/chat/[id].tsx`:**

```typescript
// Helper to extract timestamp consistently
const getMessageTime = (msg: Message): number | undefined => {
  if (!msg.createdAt) return undefined;
  if (msg.createdAt instanceof Date) return msg.createdAt.getTime();
  if (typeof msg.createdAt.toDate === 'function') return msg.createdAt.toDate().getTime();
  return undefined;
};

// Calculate read status for a message
const getReadStatus = (message: Message): string | null => {
  if (message.senderId !== user?.uid || !conversation) return null; // Only for my messages

  if (conversation.type === 'direct') {
    const otherUserId = conversation.participants.find((id: string) => id !== user.uid);
    const otherUserLastRead = conversation.lastRead?.[otherUserId];
    
    if (!otherUserLastRead) return '✓'; // Not read yet
    
    const lastReadMsg = messages.find(m => m.id === otherUserLastRead);
    if (!lastReadMsg) return '✓';
    
    const msgTime = getMessageTime(message);
    const lastReadTime = getMessageTime(lastReadMsg);
    
    if (msgTime !== undefined && lastReadTime !== undefined && msgTime <= lastReadTime) {
      return '✓✓'; // Read
    }
    
    return '✓'; // Sent but not read
  }

  // Group chat: simple check
  const otherParticipants = conversation.participants.filter((id: string) => id !== user.uid);
  let readCount = 0;

  otherParticipants.forEach((uid: string) => {
    const theirLastRead = conversation.lastRead?.[uid];
    if (theirLastRead) {
      const lastReadMsg = messages.find(m => m.id === theirLastRead);
      if (lastReadMsg) {
        const msgTime = getMessageTime(message);
        const lastReadTime = getMessageTime(lastReadMsg);
        if (msgTime !== undefined && lastReadTime !== undefined && msgTime <= lastReadTime) {
          readCount++;
        }
      }
    }
  });

  if (readCount === 0) return '✓';
  if (readCount === otherParticipants.length) return '✓✓';
  return '✓'; // Partial read (simplified for MVP)
};
```

### Update MessageBubble for Read Status

**Update `components/MessageBubble.tsx`:**

```typescript
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  readStatus?: string | null;  // NEW
}

export default function MessageBubble({ message, isOwn, showSenderName, readStatus }: MessageBubbleProps) {
  // ... existing code ...

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {showSenderName && !isOwn && (
        <Text style={styles.senderName}>{message.senderName || 'Unknown'}</Text>
      )}
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>{message.text}</Text>
        <View style={styles.footer}>
          {time && <Text style={styles.time}>{formatMessageTime(time)}</Text>}
          {readStatus && <Text style={styles.readStatus}>{readStatus}</Text>}  {/* NEW */}
          {message.status && <Text style={styles.status}>
            {message.status === 'sending' ? '⏳' : message.status === 'failed' ? '❌' : message.status === 'queued' ? '📤' : ''}
          </Text>}
        </View>
      </View>
    </View>
  );
}

// Add to styles:
// readStatus: { fontSize: 11, marginLeft: 2 },
```

### Update MessageList to Pass Read Status

**Update `components/MessageList.tsx`:**

```typescript
interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  conversationType?: 'direct' | 'group';
  getReadStatus?: (message: Message) => string | null;  // NEW
}

export default function MessageList({ messages, currentUserId, conversationType, getReadStatus }: MessageListProps) {
  // ...

  return (
    <FlatList
      // ...
      renderItem={({ item }) => (
        <MessageBubble
          message={item}
          isOwn={item.senderId === currentUserId}
          showSenderName={conversationType === 'group'}
          readStatus={getReadStatus ? getReadStatus(item) : null}  // NEW
        />
      )}
      // ...
    />
  );
}
```

### Update ChatScreen to Pass getReadStatus

**In `app/chat/[id].tsx` JSX:**

```typescript
<MessageList
  messages={messages}
  currentUserId={user!.uid}
  conversationType={conversation?.type}
  getReadStatus={getReadStatus}  // NEW
/>
```

✅ **Checkpoint:** Read receipts show ✓ and ✓✓

---

## Testing Phase 5

### Test 5.1: Typing Indicator
1. User A & B: Open chat
2. User B: Start typing (don't send)
3. User A: Should see "User B is typing..."
4. User B: Stop for 500ms
5. User A: Indicator disappears

### Test 5.2: Online Status
1. User B: Open app (foreground)
2. User A: Open chat with B → Header shows "Online"
3. User B: Put app in background
4. User A: Status changes to "Last seen just now"

### Test 5.3: Read Receipts (Direct)
1. User A: Send message
2. Expected: Shows ✓ (single checkmark)
3. User B: Open conversation
4. User A: Checkmark changes to ✓✓ (double)

### Test 5.4: Read Receipts (Group)
1. User A: Send message in 3-user group
2. Expected: Shows ✓
3. Users B & C: Open conversation
4. User A: Changes to ✓✓ (all read)

---

## Common Issues

### Typing indicator doesn't disappear
- **Check:** Timeout set to 500ms
- **Check:** `onStopTyping` called in cleanup

### Presence not updating
- **Check:** `presenceService` uses `setDoc` with `merge: true`
- **Check:** AppState listener in `app/_layout.tsx`
- **Check:** Firestore rules allow write to `/users/{userId}`

### Read receipts not updating
- **Check:** `lastMarkedReadRef` prevents duplicate writes
- **Check:** `getMessageTime` handles both Date and Timestamp objects

### "User is typing..." shows for self
- **Check:** Filter in typing listener: `.filter(t => t.uid !== user.uid)`

---

## Verification Checklist

- [ ] Typing indicator appears when other user types
- [ ] Typing indicator disappears after 500ms inactivity
- [ ] Typing indicator clears on send
- [ ] Online status shows green dot
- [ ] Offline status shows "Last seen X ago"
- [ ] Read receipts show ✓ when sent
- [ ] Read receipts show ✓✓ when read
- [ ] Group read receipts work (simple ✓/✓✓)
- [ ] No duplicate Firestore writes for typing
- [ ] No duplicate writes for mark-as-read
- [ ] All listeners have cleanup

---

## Before Phase 6

1. Test all real-time features with 2+ users
2. Verify presence tracking works on app state changes
3. Commit Phase 5 work:
```bash
git add .
git commit -m "feat: complete Phase 5 - typing indicators, presence, and read receipts"
```

**Time:** 3-4 hours | **Next:** Phase 6 (Local Notifications)
