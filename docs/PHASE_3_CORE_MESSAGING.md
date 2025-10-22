# Phase 3: Core Messaging

**Time:** 3-4 hours | **Goal:** Real-time messaging with optimistic updates, offline support, and persistence

**Prerequisites:** Phase 0, 1, 2 complete (auth + conversations working)

---

## Objectives

- ✅ Chat screen (replace Phase 2 placeholder)
- ✅ Message components (Bubble, List, Input)
- ✅ Real-time listener (last 100 messages)
- ✅ Optimistic updates (instant feedback)
- ✅ Offline detection + queuing
- ✅ Message timeout (10s)
- ✅ Persistence across sessions

**Reference:** mvp-prd-plus.md Section 3.3 for complete messaging schema

---

## Files to Create

```
app/chat/[id].tsx          # Chat screen (REPLACE placeholder)
components/MessageBubble.tsx    # Single message display
components/MessageList.tsx      # FlatList of messages
components/MessageInput.tsx     # Input + send button
components/OfflineBanner.tsx    # Network status
```

---

## Task 3.1: Message Components

### MessageBubble.tsx

**Create:** `touch components/MessageBubble.tsx`

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { formatMessageTime } from '../utils/timeFormat';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  createdAt: Date | { toDate: () => Date } | null;
  status?: 'sending' | 'sent' | 'failed' | 'queued';
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
}

export default function MessageBubble({ message, isOwn, showSenderName }: MessageBubbleProps) {
  const time = message.createdAt
    ? message.createdAt instanceof Date
      ? message.createdAt
      : message.createdAt.toDate()
    : null;

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {showSenderName && !isOwn && (
        <Text style={styles.senderName}>{message.senderName || 'Unknown'}</Text>
      )}
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>{message.text}</Text>
        <View style={styles.footer}>
          {time && <Text style={styles.time}>{formatMessageTime(time)}</Text>}
          {message.status && (
            <Text style={styles.status}>
              {message.status === 'sending' ? '⏳' : message.status === 'failed' ? '❌' : message.status === 'queued' ? '📤' : ''}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4, marginHorizontal: 12 },
  ownContainer: { alignItems: 'flex-end' },
  otherContainer: { alignItems: 'flex-start' },
  senderName: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4, marginLeft: 12 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  ownBubble: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#E5E5EA', borderBottomLeftRadius: 4 },
  text: { fontSize: 16 },
  ownText: { color: '#fff' },
  otherText: { color: '#000' },
  footer: { flexDirection: 'row', marginTop: 4, gap: 4, alignItems: 'center' },
  time: { fontSize: 11, opacity: 0.7 },
  status: { fontSize: 11 },
});
```

---

### MessageInput.tsx

**Create:** `touch components/MessageInput.tsx`

```typescript
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, onTyping, disabled = false }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSend(trimmed);
      setText('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(value) => { setText(value); onTyping(); }}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          editable={!disabled}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          <Ionicons name="send" size={20} color={text.trim() && !disabled ? '#007AFF' : '#999'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 16 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  sendButtonDisabled: { opacity: 0.5 },
});
```

---

### MessageList.tsx

**Create:** `touch components/MessageList.tsx`

```typescript
import { FlatList, StyleSheet } from 'react-native';
import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  createdAt: any;
  status?: 'sending' | 'sent' | 'failed' | 'queued';
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  conversationType?: 'direct' | 'group';
}

export default function MessageList({ messages, currentUserId, conversationType }: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
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
          isOwn={item.senderId === currentUserId}
          showSenderName={conversationType === 'group'}
        />
      )}
      contentContainerStyle={styles.contentContainer}
      onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: { paddingVertical: 8 },
});
```

---

### OfflineBanner.tsx

**Create:** `touch components/OfflineBanner.tsx`

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected ?? true));
    });

    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ Offline - Messages will send when reconnected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#ff9800', padding: 8, alignItems: 'center' },
  text: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
```

✅ **Checkpoint:** All components compile with no errors

---

## Task 3.2: Chat Screen

**IMPORTANT:** This replaces the Phase 2 placeholder `app/chat/[id].tsx`

**Create (if needed):**
```bash
mkdir -p app/chat
touch app/chat/\[id\].tsx
```

**Implementation:**
```typescript
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { collection, doc, query, orderBy, limit, onSnapshot, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { useAuthStore } from '../../store/authStore';
import { MESSAGE_LIMIT } from '../../utils/constants';
import MessageList from '../../components/MessageList';
import MessageInput from '../../components/MessageInput';
import OfflineBanner from '../../components/OfflineBanner';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
  status?: 'sending' | 'sent' | 'failed' | 'queued';
  participants: string[];
}

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch conversation details
  useEffect(() => {
    if (!conversationId || typeof conversationId !== 'string' || !user) return;

    const unsubscribe = onSnapshot(doc(db, 'conversations', conversationId), (docSnap) => {
      if (docSnap.exists()) {
        setConversation({ id: docSnap.id, ...docSnap.data() });
      }
    });

    return unsubscribe;
  }, [conversationId, user]);

  // Update header title dynamically
  useEffect(() => {
    if (conversation && user) {
      let title = 'Chat';
      
      if (conversation.type === 'direct') {
        const otherUserId = conversation.participants.find((id: string) => id !== user.uid);
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

  // Listen to messages
  useEffect(() => {
    if (!conversationId || typeof conversationId !== 'string') return;

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(MESSAGE_LIMIT)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error('Messages listener error:', error);
      if (error.message.includes('index')) {
        console.error('⚠️ FIRESTORE INDEX REQUIRED. Click the link above to create it.');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [conversationId]);

  const sendMessage = async (text: string) => {
    if (!conversationId || typeof conversationId !== 'string' || !user || !conversation) return;

    const tempId = `temp_${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      text,
      senderId: user.uid,
      senderName: user.displayName || user.email || 'Unknown User',
      createdAt: new Date(),
      status: 'sending',
      participants: conversation.participants,
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Write to Firestore
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        text,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Unknown User',
        participants: conversation.participants,
        createdAt: serverTimestamp(),
      });

      // Update conversation lastMessage
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: text.substring(0, 100),
        lastMessageAt: serverTimestamp(),
      });

      // Remove temp message (real one will appear via listener)
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } catch (error) {
      console.error('Send message error:', error);
      // Mark as failed
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    }
  };

  const handleTyping = () => {
    // Phase 5 will add typing indicator logic here
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <MessageList
        messages={messages}
        currentUserId={user!.uid}
        conversationType={conversation?.type}
      />
      <MessageInput onSend={sendMessage} onTyping={handleTyping} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
```

**⚠️ CRITICAL - Firestore Index Required:**

On first run, you'll get an error:
```
The query requires an index. Click here to create it: [LINK]
```

**Solution:**
1. Click the link in console
2. Firebase creates index automatically
3. Wait 1-2 minutes for index to build
4. Reload app

**Key Implementation Details:**
- **Optimistic updates:** Temp message shows instantly, removed when real one arrives
- **serverTimestamp():** CRITICAL - ensures correct message ordering
- **MESSAGE_LIMIT:** From `utils/constants.ts` (100 messages)
- **Dynamic header:** Shows other user's name (direct) or group name
- **Listeners cleanup:** All `onSnapshot` return unsubscribe functions

✅ **Checkpoint:** Messages send and receive in real-time

---

## Testing Phase 3

### Test 3.1: Send Message
1. User A: Open chat with User B → Type "Hello" → Send
2. Expected: Message appears instantly (blue bubble, right-aligned)
3. User B: Should see "Hello" appear in < 1 second

### Test 3.2: Receive Message
1. User B: Send "Hi back"
2. User A: Should see message appear (gray bubble, left-aligned)

### Test 3.3: Persistence
1. User A: Send message → Force quit app → Reopen → Open chat
2. Expected: Message still visible

### Test 3.4: Offline Mode
1. User A: Enable airplane mode → Send "Offline test"
2. Expected: "⚠️ Offline" banner appears, message shows ⏳ or 📤
3. Disable airplane mode
4. Expected: Message syncs, banner disappears

### Test 3.5: Message Ordering
1. User A: Send 5 messages rapidly
2. Expected: All appear in correct chronological order

### Test 3.6: Long Messages
1. Send 300-character message
2. Expected: Text wraps in bubble, scrollable

### Test 3.7: Group Chat
1. Create 3-user group → User A sends message
2. Expected: Users B & C see message with "User A" sender name above bubble

---

## Common Issues

### Messages not appearing
- **Check:** Console for index error → Click link to create index
- **Check:** Firestore rules allow read/write for authenticated users

### Messages out of order
- **Check:** Using `serverTimestamp()` not `new Date()`

### Duplicate messages
- **Normal:** Temp message + real message briefly overlap (< 100ms)
- **If persistent:** Check temp message removal logic

### Keyboard covers input (Android)
- **Solution:** Adjust `keyboardVerticalOffset` in MessageInput

### Offline banner doesn't show
- **Check:** NetInfo installed: `npm list @react-native-community/netinfo`

---

## Firestore Security Rules

**Verify in Firebase Console → Firestore → Rules:**

```javascript
match /conversations/{conversationId}/messages/{messageId} {
  allow read: if request.auth.uid in resource.data.participants;
  allow create: if request.auth != null && request.auth.uid in request.resource.data.participants;
}
```

---

## Verification Checklist

- [ ] All components compile (no TypeScript errors)
- [ ] Messages send in real-time (< 1 second delay)
- [ ] Optimistic updates work (instant feedback)
- [ ] Messages persist across app restarts
- [ ] Offline banner shows in airplane mode
- [ ] Messages queue and sync when reconnected
- [ ] Message ordering correct (chronological)
- [ ] Long messages wrap properly
- [ ] Group chats show sender names
- [ ] Dynamic header shows correct name/title
- [ ] KeyboardAvoidingView works on iOS
- [ ] Firestore index created (no console errors)
- [ ] Last 100 messages load

---

## Before Phase 4

1. Test with 2+ users to verify real-time sync
2. Test airplane mode → send → reconnect flow
3. Verify messages persist after force quit
4. Commit Phase 3 work:
```bash
git add .
git commit -m "feat: complete Phase 3 - core messaging with real-time sync and offline support"
```

**Time:** 3-4 hours | **Next:** Phase 4 (Group Messaging Enhancements)
