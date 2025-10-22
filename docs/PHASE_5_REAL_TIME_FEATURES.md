# Phase 5: Real-Time Features

**Estimated Time:** 3-4 hours  
**Goal:** Add typing indicators, online/offline status, and read receipts to make the app feel alive and responsive

**Prerequisites:** Phase 0, 1, 2, 3, and 4 must be complete (Firebase configured, authentication working, messaging functional, groups tested)

---

## Objectives

By the end of Phase 5, you will have:

- ✅ Typing indicators ("User is typing...")
- ✅ Online/offline status with green dots
- ✅ "Last seen" timestamps for offline users
- ✅ Read receipts (✓ sent, ✓✓ read)
- ✅ Real-time presence tracking
- ✅ All features working in both direct and group chats

**Note:** These features significantly enhance UX and make the app feel professional and responsive.

---

## Architecture Overview

### Real-Time Features Data Flow

```
User Types
    ↓
Debounced write to /conversations/{id}/typingUsers/{uid}
    ↓
Other users' listeners detect → Show "typing..."
    ↓
User stops typing (500ms) or sends → Delete typing doc
    ↓
"Typing..." disappears

---

User Opens App
    ↓
AppState listener → Update /users/{uid} { isOnline: true }
    ↓
Chat screen listeners detect → Show green dot
    ↓
User closes app → AppState background
    ↓
Update /users/{uid} { isOnline: false, lastSeenAt: now }
    ↓
"Last seen 2m ago"

---

User Opens Chat
    ↓
Get last message in view
    ↓
Update /conversations/{id} { lastRead.{uid}: messageId }
    ↓
Sender's device listener detects → ✓ → ✓✓
```

### Firestore Schema Additions

**Reference:** See mvp-prd-plus.md Section 3.4, 3.5, 3.6 for complete schemas

```
/users/{uid}
├── isOnline: boolean              # NEW
├── lastSeenAt: timestamp          # NEW

/conversations/{conversationId}
├── lastRead: {                    # NEW
│     uid1: messageId_123,
│     uid2: messageId_456
│   }

/conversations/{conversationId}/typingUsers/{userId}  # NEW SUBCOLLECTION
├── uid: string
├── displayName: string
├── at: timestamp
```

---

## Before Starting Phase 5

Verify Phase 4 is complete and working:

### Required from Phase 4

- [ ] Group chats work with 3+ users
- [ ] Sender names display correctly
- [ ] All real-time messaging features functional
- [ ] No TypeScript errors
- [ ] No linter errors

### Update Firestore Security Rules

Add rules for typing indicators and presence:

```javascript
// Add to your Firestore rules
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}

match /conversations/{conversationId}/typingUsers/{userId} {
  allow read, write: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
}
```

**Test:** Verify rules save without errors in Firebase Console.

---

## Task 5.1: Typing Indicators

### Purpose

Show "User is typing..." when other participants are actively composing messages.

### Architecture Decision

**Reference:** mvp-prd-plus.md Decision 5 (500ms debounce)

- **Debounce:** 500ms (balance between responsiveness and Firestore write costs)
- **Storage:** Temporary subcollection `/conversations/{id}/typingUsers/{uid}`
- **Cleanup:** Auto-delete after 500ms of inactivity or on send

---

### Step 1: Create Typing Indicator Component

```bash
touch components/TypingIndicator.tsx
```

**Implementation:**

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
    if (typingUsers.length === 1) {
      return `${typingUsers[0].displayName} is typing...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing...`;
    }
    return `${typingUsers.length} people are typing...`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{getTypingText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
  },
  text: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
});
```

**✅ Checkpoint:** Component compiles with no errors

---

### Step 2: Add Typing Detection to MessageInput

**File:** `components/MessageInput.tsx`

**Add typing logic with debounce:**

```typescript
import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;  // NEW
  disabled?: boolean;
}

export default function MessageInput({ 
  onSend, 
  onTyping, 
  onStopTyping,  // NEW
  disabled = false 
}: MessageInputProps) {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize to prevent effect from re-running on every render
  const memoizedStopTyping = useCallback(() => {
    onStopTyping();
  }, [onStopTyping]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      // Clear typing indicator before sending
      memoizedStopTyping();
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
    
    // Trigger typing indicator
    onTyping();
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to clear typing after 500ms of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      memoizedStopTyping();
      typingTimeoutRef.current = null;
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      memoizedStopTyping();
    };
  }, [memoizedStopTyping]);  // Added dependency

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          editable={!disabled}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || disabled) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={text.trim() && !disabled ? '#007AFF' : '#999'} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

**Key Changes:**
- Added `onStopTyping` prop
- Added `typingTimeoutRef` for debouncing
- **Added `useCallback` to memoize `onStopTyping`** to prevent unnecessary re-renders
- Clear typing on send
- Cleanup on unmount with proper dependency array

**✅ Checkpoint:** MessageInput compiles, typing detection works

---

### Step 3: Integrate Typing in Chat Screen

**File:** `app/chat/[id].tsx`

**Add typing state and Firestore operations:**

```typescript
// Add these imports at the top
import { collection, doc, onSnapshot, query, orderBy, limit, addDoc, updateDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import TypingIndicator from '../../components/TypingIndicator';

// Inside ChatScreen component, add typing state
const [typingUsers, setTypingUsers] = useState<Array<{ uid: string; displayName: string; at: any }>>([]);
const lastTypingWriteRef = useRef<number>(0);  // Track last write time for debounce

// Add listener for typing users
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

// Handle typing indicator writes with debounce
const handleTyping = async () => {
  if (!conversationId || typeof conversationId !== 'string' || !user) return;
  
  // Debounce: only write if 500ms has passed since last write
  const now = Date.now();
  if (lastTypingWriteRef.current && now - lastTypingWriteRef.current < 500) {
    return;  // Skip write, too soon since last write
  }
  
  lastTypingWriteRef.current = now;
  
  try {
    await setDoc(
      doc(db, 'conversations', conversationId, 'typingUsers', user.uid),
      {
        uid: user.uid,
        displayName: user.displayName || user.email || 'Unknown',
        at: serverTimestamp(),
      }
    );
  } catch (error) {
    console.error('Error setting typing status:', error);
  }
};

const handleStopTyping = async () => {
  if (!conversationId || typeof conversationId !== 'string' || !user) return;
  
  try {
    await deleteDoc(
      doc(db, 'conversations', conversationId, 'typingUsers', user.uid)
    );
  } catch (error) {
    console.error('Error clearing typing status:', error);
  }
};

// Add TypingIndicator before MessageInput
<TypingIndicator typingUsers={typingUsers} />
<MessageInput
  onSend={sendMessage}
  onTyping={handleTyping}
  onStopTyping={handleStopTyping}
  disabled={false}
/>
```

**Why debounce in `handleTyping`?**
- Without debounce: 20 characters = 20 Firestore writes (expensive)
- With 500ms debounce: First keystroke writes immediately, then max 1 write per 500ms
- Reduces Firestore writes by ~90% while keeping UX responsive

**✅ Checkpoint:** Typing indicators work in both direct and group chats

---

## Task 5.2: Online/Offline Status

### Purpose

Show users' online status with a green dot and "Last seen" timestamps for offline users.

### Step 1: Create Presence Service

```bash
touch services/presenceService.ts
```

**Implementation:**

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
- Phase 1 user documents don't have `isOnline` or `lastSeenAt` fields
- Using `setDoc` with `merge` safely adds these fields without overwriting existing data
- Using `updateDoc` would fail if the fields don't exist

**✅ Checkpoint:** Service functions compile correctly

---

### Step 2: Track Presence in Root Layout

**File:** `app/_layout.tsx`

**Add AppState listener:**

```typescript
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { setUserOnline, setUserOffline } from '../services/presenceService';

// Inside your root layout component, after session restoration
useEffect(() => {
  if (!user) return;

  // Set online when component mounts
  setUserOnline(user.uid);

  // Listen for app state changes
  const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      setUserOnline(user.uid);
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      setUserOffline(user.uid);
    }
  });

  // Set offline on unmount (app close)
  return () => {
    subscription.remove();
    setUserOffline(user.uid);
  };
}, [user]);
```

**✅ Checkpoint:** User status updates when app opens/closes

---

### Step 3: Create User Status Badge Component

```bash
touch components/UserStatusBadge.tsx
```

**Implementation:**

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { formatLastSeen } from '../utils/timeFormat';

interface UserStatusBadgeProps {
  isOnline: boolean;
  lastSeenAt?: Date | { toDate: () => Date } | null;
  showText?: boolean;
}

export default function UserStatusBadge({ 
  isOnline, 
  lastSeenAt, 
  showText = false 
}: UserStatusBadgeProps) {
  if (isOnline) {
    return (
      <View style={styles.container}>
        <View style={styles.onlineDot} />
        {showText && <Text style={styles.onlineText}>Online</Text>}
      </View>
    );
  }

  if (!lastSeenAt) {
    return null;
  }

  const lastSeenDate = lastSeenAt instanceof Date 
    ? lastSeenAt 
    : lastSeenAt.toDate();

  return (
    <View style={styles.container}>
      {showText && (
        <Text style={styles.offlineText}>
          {formatLastSeen(lastSeenDate)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  onlineText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  offlineText: {
    fontSize: 12,
    color: '#999',
  },
});
```

**✅ Checkpoint:** Badge component renders correctly

---

### Step 4: Add Status to Chat Screen Header

**File:** `app/chat/[id].tsx`

**IMPORTANT:** This step **replaces** the header update logic from Phase 3, not adds alongside it. You should have ONE `useEffect` for header updates.

**Add explicit imports at the top:**

```typescript
import UserStatusBadge from '../../components/UserStatusBadge';
```

**Add status listener and display:**

```typescript
// Add state for user statuses
const [userStatuses, setUserStatuses] = useState<Record<string, { isOnline: boolean; lastSeenAt: any }>>({});

// Listen to participant statuses
useEffect(() => {
  if (!conversation || !user) return;

  const otherParticipants = conversation.participants.filter(id => id !== user.uid);
  
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

  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
}, [conversation, user]);

// REPLACE the existing Phase 3 header update useEffect with this merged version
useEffect(() => {
  if (conversation && user) {
    let title = 'Chat';
    let headerRight = undefined;
    
    if (conversation.type === 'direct') {
      const otherUserId = conversation.participants.find(id => id !== user.uid);
      if (otherUserId && conversation.participantDetails[otherUserId]) {
        title = conversation.participantDetails[otherUserId].displayName;
        
        // Phase 5 addition: Add status badge for direct chats
        const status = userStatuses[otherUserId];
        if (status) {
          headerRight = () => (
            <View style={{ marginRight: 16 }}>
              <UserStatusBadge 
                isOnline={status.isOnline} 
                lastSeenAt={status.lastSeenAt}
                showText={true}
              />
            </View>
          );
        }
      }
    } else {
      // Group chat with participant count (from Phase 4)
      const participantCount = conversation.participants.length;
      title = conversation.name || `Group (${participantCount} members)`;
    }
    
    navigation.setOptions({ title, headerRight });
  }
}, [conversation, user, userStatuses, navigation]);  // Added userStatuses dependency
```

**⚠️ CRITICAL:** Do NOT have two separate `useEffect` hooks for header updates. Merge the Phase 3 logic with this Phase 5 addition as shown above.

**✅ Checkpoint:** Online status shows in chat header for direct chats

---

### Step 5: Add Status to Conversation List (Optional Enhancement)

**Note:** This enhancement is **completely optional**. The main online/offline status feature is already complete in Step 4.

This adds a green dot next to each contact's name in the conversation list, showing their real-time online status.

---

#### Part A: Update ConversationItem Component

**File:** `components/ConversationItem.tsx`

**Add import and prop:**

```typescript
import UserStatusBadge from './UserStatusBadge';

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  userStatuses?: Record<string, { isOnline: boolean; lastSeenAt: any }>;  // NEW
  onPress: () => void;
}
```

**Update the component to display status badge:**

```typescript
export default function ConversationItem({ 
  conversation, 
  currentUserId, 
  userStatuses,  // NEW
  onPress 
}: ConversationItemProps) {
  // Get online status for direct chats
  const getDirectChatStatus = () => {
    if (conversation.type !== 'direct' || !userStatuses) return null;
    
    const otherUserId = conversation.participants.find(id => id !== currentUserId);
    if (!otherUserId) return null;
    
    const status = userStatuses[otherUserId];
    return status || null;
  };

  const directChatStatus = getDirectChatStatus();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            {conversation.type === 'group' && (
              <Ionicons name="people" size={16} color="#666" style={styles.groupIcon} />
            )}
            <Text style={styles.name} numberOfLines={1}>
              {getConversationName(conversation, currentUserId)}
            </Text>
            {/* NEW: Show online status badge for direct chats */}
            {directChatStatus && (
              <UserStatusBadge 
                isOnline={directChatStatus.isOnline} 
                lastSeenAt={directChatStatus.lastSeenAt}
                showText={false}  // Only show dot, not text
              />
            )}
          </View>
          {conversation.lastMessageAt && (
            <Text style={styles.time}>
              {formatConversationTime(conversation.lastMessageAt.toDate())}
            </Text>
          )}
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {conversation.lastMessage || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

**Update styles to accommodate status badge:**

```typescript
const styles = StyleSheet.create({
  // ... existing styles ...
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,  // Add gap between name and status badge
  },
  // ... rest of styles ...
});
```

---

#### Part B: Set Up Status Listeners in Conversation List

**File:** `app/(tabs)/index.tsx`

**Add state for user statuses:**

```typescript
import { useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

export default function ConversationsList() {
  const { user, logout } = useAuthStore();
  const { conversations, setConversations } = useChatStore();
  const router = useRouter();
  
  // NEW: Track online statuses for all conversation participants
  const [userStatuses, setUserStatuses] = useState<Record<string, { isOnline: boolean; lastSeenAt: any }>>({});

  // ... existing conversations listener ...

  // NEW: Listen to participant statuses
  useEffect(() => {
    if (!user || conversations.length === 0) return;

    console.log('👂 [ConversationsList] Setting up status listeners');

    // Collect all unique participant IDs (excluding current user)
    const participantIds = new Set<string>();
    conversations.forEach(convo => {
      convo.participants.forEach(participantId => {
        if (participantId !== user.uid) {
          participantIds.add(participantId);
        }
      });
    });

    console.log('👥 [ConversationsList] Listening to statuses for', participantIds.size, 'users');

    // Set up listener for each participant
    const unsubscribes = Array.from(participantIds).map(participantId => {
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

    // Cleanup all listeners
    return () => {
      console.log('🔌 [ConversationsList] Cleaning up status listeners');
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, conversations]);  // Re-run when conversations change

  // ... rest of component ...

  return (
    <View style={styles.container}>
      {/* ... header ... */}
      
      {conversations.length === 0 ? (
        // ... empty state ...
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              currentUserId={user?.uid || ''}
              userStatuses={userStatuses}  // NEW: Pass statuses
              onPress={() => {
                router.push(`/chat/${item.id}` as any);
              }}
            />
          )}
        />
      )}
    </View>
  );
}
```

**Performance Note:**
- With 10 conversations, this creates ~10 listeners (one per unique participant)
- Firestore listeners are efficient and this is acceptable for MVP
- For 100+ conversations, consider pagination or caching strategies

---

**✅ Checkpoint:** Green dot shows next to online contacts in conversation list

---

## Task 5.3: Read Receipts

### Purpose

Show checkmarks (✓ sent, ✓✓ read) to indicate when messages have been read.

### Architecture Decision

**Reference:** mvp-prd-plus.md Decision 2 (Last-Read Tracking)

- **Approach:** Store `lastRead.{uid}: messageId` in conversation doc
- **Why:** Single write per conversation vs N writes per message
- **Trade-off:** Can't show per-message granularity (acceptable for MVP)

---

### Step 1: Implement Mark-as-Read Logic

**File:** `app/chat/[id].tsx`

**Add read tracking with duplicate write prevention:**

```typescript
// Track the last message we marked as read to prevent duplicate writes
const lastMarkedReadRef = useRef<string | null>(null);

// Mark messages as read when they load
useEffect(() => {
  if (messages.length === 0 || !user || typeof conversationId !== 'string') return;

  // Get the last message
  const lastMessage = messages[messages.length - 1];
  
  // Only mark as read if:
  // 1. It's not from me
  // 2. It's a different message than what we last marked
  if (lastMessage.senderId !== user.uid && lastMessage.id !== lastMarkedReadRef.current) {
    lastMarkedReadRef.current = lastMessage.id;
    
    updateDoc(doc(db, 'conversations', conversationId), {
      [`lastRead.${user.uid}`]: lastMessage.id,
    }).catch(error => {
      console.error('Error updating last read:', error);
    });
  }
}, [messages, user, conversationId]);
```

**Why use `lastMarkedReadRef`?**
- Without it: Every message update triggers a Firestore write (status changes, optimistic updates, etc.)
- With it: Only writes when a new message from another user appears
- Prevents dozens of unnecessary writes per conversation

**✅ Checkpoint:** lastRead updates in Firestore when viewing messages

---

### Step 2: Add Read Status Calculation

**File:** `app/chat/[id].tsx`

**Add function to calculate read status:**

```typescript
// Helper function to safely extract timestamp from message
const getMessageTime = (msg: Message): number | undefined => {
  if (!msg.createdAt) return undefined;
  if (msg.createdAt instanceof Date) return msg.createdAt.getTime();
  if (typeof msg.createdAt.toDate === 'function') return msg.createdAt.toDate().getTime();
  return undefined;
};

const getReadStatus = (message: Message): '✓' | '✓✓' | null => {
  // Only show status for own messages
  if (message.senderId !== user.uid || !conversation) return null;

  if (conversation.type === 'direct') {
    // Direct chat: simple ✓ or ✓✓
    const otherUserId = conversation.participants.find(id => id !== user.uid);
    if (!otherUserId) return '✓';

    const lastRead = conversation.lastRead?.[otherUserId];
    if (!lastRead) return '✓'; // Not read yet

    // Find the last read message
    const lastReadMsg = messages.find(m => m.id === lastRead);
    if (!lastReadMsg) return '✓';

    // Compare timestamps using normalized extraction
    const messageTime = getMessageTime(message);
    const lastReadTime = getMessageTime(lastReadMsg);

    return messageTime && lastReadTime && messageTime <= lastReadTime ? '✓✓' : '✓';
  } else {
    // Group chat: show ✓✓ if all members have read
    const otherParticipants = conversation.participants.filter(id => id !== user.uid);
    let readCount = 0;

    otherParticipants.forEach(participantId => {
      const lastRead = conversation.lastRead?.[participantId];
      if (lastRead) {
        const lastReadMsg = messages.find(m => m.id === lastRead);
        if (lastReadMsg) {
          const messageTime = getMessageTime(message);
          const lastReadTime = getMessageTime(lastReadMsg);

          if (messageTime && lastReadTime && messageTime <= lastReadTime) {
            readCount++;
          }
        }
      }
    });

    // Show ✓✓ only if ALL members have read
    return readCount === otherParticipants.length ? '✓✓' : '✓';
  }
};

// Update conversation type to include lastRead
interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  participantDetails: Record<string, { displayName: string; email: string }>;
  lastRead?: Record<string, string>;  // NEW: uid -> messageId
}
```

**Why `getMessageTime` helper?**
- Temp messages from Phase 3 use `new Date()` (JavaScript Date)
- Real messages from Firestore use Firestore Timestamp (with `.toDate()` method)
- Without normalization: timestamp comparison fails, causing incorrect ✓/✓✓ display
- Helper function safely handles both types

**✅ Checkpoint:** Read status calculation logic works

---

### Step 3: Display Read Status in MessageBubble

**File:** `components/MessageBubble.tsx`

**Update interface and display:**

```typescript
interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSenderName?: boolean;
  readStatus?: '✓' | '✓✓' | null;  // NEW
}

export default function MessageBubble({ 
  message, 
  isOwnMessage, 
  showSenderName = false,
  readStatus  // NEW
}: MessageBubbleProps) {
  return (
    <View style={[
      styles.container, 
      isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      {showSenderName && !isOwnMessage && (
        <Text style={styles.senderName}>{message.senderName}</Text>
      )}
      
      <View style={[
        styles.bubble,
        isOwnMessage ? styles.ownBubble : styles.otherBubble
      ]}>
        <Text style={[
          styles.text,
          isOwnMessage ? styles.ownText : styles.otherText
        ]}>
          {message.text}
        </Text>
        
        <View style={styles.footer}>
          <Text style={[
            styles.time,
            isOwnMessage ? styles.ownTime : styles.otherTime
          ]}>
            {message.createdAt ? formatMessageTime(message.createdAt.toDate()) : 'Sending...'}
          </Text>
          
          {/* Show status for own messages */}
          {isOwnMessage && message.status && (
            <Text style={styles.status}>
              {message.status === 'sending' && '⏳'}
              {message.status === 'queued' && '📤'}
              {message.status === 'failed' && '❌'}
            </Text>
          )}
          
          {/* Show read status for own messages */}
          {isOwnMessage && !message.status && readStatus && (
            <Text style={styles.readStatus}>{readStatus}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// Add to styles
readStatus: {
  fontSize: 11,
  color: 'rgba(255, 255, 255, 0.7)',
  marginLeft: 4,
},
```

**✅ Checkpoint:** Read receipts display on messages

---

### Step 4: Pass Read Status from Chat Screen

**File:** `app/chat/[id].tsx`

**Update MessageList with read status:**

```typescript
<MessageList
  messages={messages}
  currentUserId={user.uid}
  conversationType={conversation.type}
  getReadStatus={getReadStatus}  // NEW
/>
```

**File:** `components/MessageList.tsx`

**Update to pass read status:**

```typescript
interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  conversationType: 'direct' | 'group';
  getReadStatus?: (message: Message) => '✓' | '✓✓' | null;  // NEW
}

export default function MessageList({ 
  messages, 
  currentUserId, 
  conversationType,
  getReadStatus  // NEW
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MessageBubble
          message={item}
          isOwnMessage={item.senderId === currentUserId}
          showSenderName={conversationType === 'group'}
          readStatus={getReadStatus ? getReadStatus(item) : null}  // NEW
        />
      )}
      contentContainerStyle={styles.container}
    />
  );
}
```

**✅ Checkpoint:** Read receipts show ✓ → ✓✓ when messages are read

---

## Testing Phase 5

### Test 5.1: Typing Indicator - Direct Chat

**Setup:** 2 devices with User A and User B

1. **User A:** Open chat with User B
2. **User B:** Start typing
3. **Check User A's screen**

**Expected:**
- ✅ "User B is typing..." appears within 500ms
- ✅ Indicator updates as User B types
- ✅ Indicator disappears 500ms after User B stops typing

---

### Test 5.2: Typing Indicator - Send Message

1. **User B:** Type message
2. **User B:** Tap send before 500ms passes
3. **Check User A's screen**

**Expected:**
- ✅ Typing indicator disappears immediately when message is sent
- ✅ Message appears
- ✅ No lingering typing indicator

---

### Test 5.3: Typing Indicator - Group Chat

**Setup:** Group with 3 users

1. **User A:** Type
2. **User B:** Type simultaneously
3. **Check User C's screen**

**Expected:**
- ✅ "2 people are typing..." appears
- ✅ Updates when one person stops
- ✅ Shows individual names when only 1 typing

---

### Test 5.4: Online Status - App Lifecycle

1. **User A:** Open app
2. **Check User B's device** (viewing chat with User A)
3. **User A:** Close app (home button)
4. **Wait 1-2 seconds**
5. **Check User B's device**

**Expected:**
- ✅ Green dot shows when User A opens app
- ✅ Green dot disappears when User A closes app
- ✅ "Last seen just now" appears

---

### Test 5.5: Last Seen Timestamp

1. **User A:** Close app
2. **Wait 5 minutes**
3. **User B:** Check chat header

**Expected:**
- ✅ Shows "Last seen 5m ago"
- ✅ Updates to "6m ago" after another minute

---

### Test 5.6: Read Receipts - Direct Chat

1. **User A:** Send message to User B
2. **Check User A's screen**
3. **User B:** Open chat
4. **Check User A's screen**

**Expected:**
- ✅ Message shows ✓ (single checkmark) after sending
- ✅ Changes to ✓✓ (double checkmark) when User B opens chat

---

### Test 5.7: Read Receipts - Group Chat

**Setup:** Group with User A, B, C

1. **User A:** Send message
2. **User B:** Open chat (reads message)
3. **Check User A's screen**
4. **User C:** Open chat (reads message)
5. **Check User A's screen**

**Expected:**
- ✅ Message shows ✓ initially
- ✅ Still shows ✓ after User B reads (not all members)
- ✅ Changes to ✓✓ after User C reads (all members have read)

---

### Test 5.8: Read Receipts - Multiple Messages

1. **User A:** Send 5 messages rapidly
2. **User B:** Open chat (sees all 5)
3. **Check User A's screen**

**Expected:**
- ✅ All 5 messages show ✓✓
- ✅ Correct order maintained

---

## Common Issues & Solutions

### Issue: Typing indicator doesn't appear

**Cause:** Firestore subcollection not being created or listener not set up

**Debug:**
1. Check Firebase Console → Conversations → [conversation_id] → typingUsers
2. Verify documents are created when typing
3. Check console for listener errors

**Solution:**
```typescript
// Ensure listener is correctly filtering own user
.filter(t => t.uid !== user.uid)
```

---

### Issue: Typing indicator never disappears

**Cause:** Cleanup not happening on inactivity or send

**Solution:**
Verify timeout is set correctly:
```typescript
typingTimeoutRef.current = setTimeout(() => {
  onStopTyping();
  typingTimeoutRef.current = null;
}, 500);  // Must be 500ms, not 5000ms
```

---

### Issue: Online status not updating

**Cause:** AppState listener not registered or user doc not updating

**Debug:**
```typescript
// Add to AppState listener
console.log('App state changed:', nextAppState);
```

**Check:**
- Firebase Console → users → [uid] → Check `isOnline` field
- Verify fields update when app state changes

---

### Issue: "Last seen" shows weird timestamps

**Cause:** Using client-side dates instead of server timestamps

**Solution:**
Always use `serverTimestamp()`:
```typescript
lastSeenAt: serverTimestamp()  // ✅ CORRECT
// NOT: new Date()  // ❌ WRONG
```

---

### Issue: Read receipts stuck on ✓

**Cause:** lastRead not updating or timestamp comparison failing

**Debug:**
1. Check Firestore → conversations → [id] → `lastRead` object
2. Verify `lastRead.{uid}` contains message ID
3. Add console logs to `getReadStatus` function

**Solution:**
Verify mark-as-read logic runs:
```typescript
useEffect(() => {
  console.log('Messages:', messages.length);
  console.log('Last message:', messages[messages.length - 1]);
  // ... rest of mark-as-read logic
}, [messages]);
```

---

### Issue: Read receipts show ✓✓ before actually read

**Cause:** Timestamp comparison logic inverted

**Solution:**
```typescript
// ✅ CORRECT
messageTime <= lastReadTime ? '✓✓' : '✓'

// ❌ WRONG
messageTime >= lastReadTime ? '✓✓' : '✓'
```

---

### Issue: Memory leak warnings

**Cause:** Firestore listeners not cleaned up

**Solution:**
Check ALL useEffect hooks with onSnapshot have return statements:
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(/*...*/);
  return unsubscribe;  // CRITICAL
}, [deps]);
```

---

## Potential Roadblocks & Questions

### 🟢 Resolved: Typing Indicator Debounce Strategy

**Question:** How often should we update typing status?

**Answer:** ✅ 500ms debounce (Decision 5 from PRD)

**Implementation:** First keystroke writes immediately, subsequent updates debounced

---

### 🟢 Resolved: Read Receipt Granularity

**Question:** Per-message read status or last-read tracking?

**Answer:** ✅ Last-read tracking (Decision 2 from PRD)

**Reason:** Single write per conversation vs N writes per message

---

### 🟡 Unresolved: Group Read Receipt Detail

**Issue:** Can't show which specific users have read in groups

**Impact:** Can only show "all read" or "some read"

**Mitigation:** Acceptable for MVP

**Recommendation:** Post-MVP enhancement (show "Read by Alice, Bob")

**Status:** ⚠️ Known limitation

---

### 🟡 Unresolved: Stale Typing Indicators

**Issue:** If app crashes, typing document might not be deleted

**Impact:** Typing indicator might linger for 1-2 minutes

**Mitigation:** Firestore TTL can clean up (requires Cloud Functions)

**Recommendation:** Post-MVP feature

**Status:** ⚠️ Edge case

---

### 🟢 Resolved: Presence Tracking Accuracy

**Question:** How accurate is AppState for online status?

**Answer:** ✅ Very accurate for foreground/background detection

**Details:** AppState is reliable on both iOS and Android

---

### 🟡 Potential Issue: Battery Drain from Listeners

**Issue:** Multiple real-time listeners might drain battery

**Impact:** 3-5 active listeners per chat screen

**Mitigation:** Firestore listeners are optimized, acceptable for MVP

**Recommendation:** Monitor in production

**Status:** ⚠️ Monitor

---

## Verification Checklist

Before proceeding to Phase 6, verify ALL of these:

### Code Complete

- [ ] `components/TypingIndicator.tsx` created
- [ ] `services/presenceService.ts` created
- [ ] `components/UserStatusBadge.tsx` created
- [ ] `MessageInput.tsx` updated with typing detection
- [ ] `ChatScreen` updated with typing logic
- [ ] `ChatScreen` updated with presence tracking
- [ ] `ChatScreen` updated with read receipt logic
- [ ] `MessageBubble.tsx` updated with read status display
- [ ] `MessageList.tsx` updated to pass read status
- [ ] Root layout updated with AppState listener
- [ ] No TypeScript errors
- [ ] No linter errors

### Functionality Tests

- [ ] Typing indicator shows when user types
- [ ] Typing indicator clears after 500ms inactivity
- [ ] Typing indicator clears immediately on send
- [ ] Multiple users typing shows correct text
- [ ] Online status (green dot) shows correctly
- [ ] Online status updates when app state changes
- [ ] "Last seen" timestamp displays correctly
- [ ] "Last seen" updates over time
- [ ] Read receipts show ✓ after sending
- [ ] Read receipts change to ✓✓ after recipient reads
- [ ] Group chat read receipts work (all members must read)
- [ ] All features work in both direct and group chats

### Data Verification

- [ ] Check Firebase Console → Conversations → typingUsers subcollection
- [ ] Typing documents created/deleted correctly
- [ ] Check Firebase Console → Users → isOnline + lastSeenAt fields
- [ ] Status fields update correctly
- [ ] Check Firebase Console → Conversations → lastRead object
- [ ] lastRead contains message IDs
- [ ] All listeners have cleanup functions

### Performance & UX

- [ ] Typing indicators appear within 500ms
- [ ] Status updates appear within 1-2 seconds
- [ ] Read receipts update within 1-2 seconds
- [ ] No UI lag from multiple listeners
- [ ] No duplicate typing indicators
- [ ] No memory leaks

---

## Summary

**Phase 5 Complete When:**

- ✅ Typing indicators work in all chats
- ✅ Online/offline status displays accurately
- ✅ Last seen timestamps update correctly
- ✅ Read receipts show ✓ and ✓✓ appropriately
- ✅ All features work in both direct and group chats
- ✅ Performance is acceptable with multiple listeners

**Time Investment:** 3-4 hours  
**Output:** Fully featured real-time communication experience

**Next:** Phase 6 - Local Notifications (Foreground notifications for incoming messages)

---

## Before Phase 6

### Commit Your Work

```bash
git add .
git commit -m "feat: complete Phase 5 - real-time features (typing, status, read receipts)"
```

### Update Progress

Check off Phase 5 in `docs/PROGRESS_TRACKER.md`

### Prepare for Phase 6

Phase 6 will add local notifications:
- Foreground notifications for new messages
- Notification tap to open conversation
- Simpler than Phases 3-5

**Estimated time:** 1-2 hours

---

**Ready to proceed? Ensure ALL verification checklist items are complete before moving to Phase 6.**

