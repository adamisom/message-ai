# Phase 3: Core Messaging

**Estimated Time:** 3-4 hours  
**Goal:** Users can send and receive text messages in real-time with optimistic updates, offline support, and message persistence

**Prerequisites:** Phase 0, 1, and 2 must be complete (Firebase configured, authentication working, conversations can be created)

---

## Objectives

By the end of Phase 3, you will have:

- ✅ Chat screen with dynamic routing
- ✅ Message display components (MessageBubble, MessageList)
- ✅ Message input component with send functionality
- ✅ Real-time message listening (last 100 messages)
- ✅ Optimistic UI updates (messages appear instantly)
- ✅ Offline detection and queueing
- ✅ Network status banner
- ✅ Message timeout detection (10 seconds)
- ✅ Failed message handling
- ✅ Message persistence across sessions

---

## Architecture Overview

### Data Flow

```
User types message → Press send
    ↓
1. Add temp message to UI (optimistic update)
    ↓
2. Write to Firestore with serverTimestamp()
    ↓
3. Firestore real-time listener receives new message
    ↓
4. Remove temp message, display real message
    ↓
5. Update conversation lastMessage & lastMessageAt
```

### Offline Flow

```
User is offline (airplane mode)
    ↓
NetInfo detects → Show offline banner
    ↓
User sends message → Status: "queued"
    ↓
Firestore SDK caches write locally
    ↓
User comes online
    ↓
Firestore auto-syncs → Message sent
    ↓
Status updates to "sent"
```

### Files You'll Create

```
app/chat/
  └── [id].tsx                    # Chat screen (replace Phase 2 placeholder)

components/
  ├── MessageBubble.tsx           # Individual message display
  ├── MessageList.tsx             # FlatList of messages
  ├── MessageInput.tsx            # Text input + send button
  └── OfflineBanner.tsx           # Network status indicator
```

### Firestore Collections Used

Refer to **mvp-prd-plus.md Section 3.3** for complete messaging schema.

```
/conversations/{conversationId}/messages/{messageId}  # Create/read messages
/conversations/{conversationId}                       # Update lastMessage
```

---

## Before Starting Phase 3

Verify Phase 2 is complete and working:

### Required from Phase 2

- [ ] Can find users by email
- [ ] Can create one-on-one conversations
- [ ] Can create group conversations
- [ ] Conversations appear in list
- [ ] Can navigate to chat screen (even if it's the placeholder)
- [ ] `firestoreService.ts` exists with conversation creation functions
- [ ] `chatStore.ts` exists and manages conversations

### Verify Firestore Security Rules

**CRITICAL:** Ensure your Firestore rules allow reading/writing messages in subcollections.

Open Firebase Console → Firestore → Rules and verify you have:

```javascript
match /conversations/{conversationId}/messages/{messageId} {
  allow read, write: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
}
```

If this rule is missing, add it before starting Phase 3. Otherwise, you'll get "Missing or insufficient permissions" errors when sending messages.

### Delete Phase 2 Temporary Files

🚨 **CRITICAL:** Delete the temporary chat screen placeholder:

```bash
rm app/chat/\[id\].tsx
```

Also remove its route from `app/_layout.tsx` (we'll add it back properly):

```typescript
// Remove this line temporarily:
<Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
```

We'll recreate the proper chat screen in this phase.

---

## Task 3.1: Create Message Components

### Purpose

Build reusable UI components for displaying and inputting messages.

### Step 1: Create MessageBubble Component

**Purpose:** Display individual messages with sender info, timestamp, and status.

```bash
touch components/MessageBubble.tsx
```

**Implementation:**

**Reference:** See FILE_STRUCTURE_GUIDE.md lines 548-590

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { formatMessageTime } from '../utils/timeFormat';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date | { toDate: () => Date } | null;
  status?: 'sending' | 'sent' | 'failed' | 'queued';
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSenderName?: boolean; // For group chats
}

export default function MessageBubble({ 
  message, 
  isOwnMessage, 
  showSenderName = false 
}: MessageBubbleProps) {
  return (
    <View style={[
      styles.container, 
      isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      {/* Show sender name for group chats (received messages only) */}
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
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    marginLeft: 12,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
  },
  ownTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTime: {
    color: '#8E8E93',
  },
  status: {
    fontSize: 11,
  },
});
```

**Key Features:**
- Different styles for sent vs received messages
- Sender name for group chats
- Status indicators (sending, queued, failed)
- Timestamp formatting
- WhatsApp-inspired design

**✅ Checkpoint:** Component compiles with no errors

---

### Step 2: Create MessageInput Component

**Purpose:** Text input with send button, typing detection, and auto-grow.

```bash
touch components/MessageInput.tsx
```

**Implementation:**

**Reference:** See FILE_STRUCTURE_GUIDE.md lines 636-688

```typescript
import { useState } from 'react';
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
  disabled?: boolean;
}

export default function MessageInput({ 
  onSend, 
  onTyping, 
  disabled = false 
}: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSend(trimmed);
      setText('');
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    onTyping(); // Notify parent component
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
```

**Key Features:**
- Auto-growing text input (multiline with maxHeight)
- Keyboard avoidance for iOS
- Disabled state when offline
- Send button enabled only when text present
- Clears input after sending

**✅ Checkpoint:** Component renders, typing works, send button responds

---

### Step 3: Create MessageList Component

**Purpose:** FlatList optimized for message display with auto-scroll.

```bash
touch components/MessageList.tsx
```

**Implementation:**

**Reference:** See FILE_STRUCTURE_GUIDE.md lines 598-632

```typescript
import { FlatList, View, StyleSheet } from 'react-native';
import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date | { toDate: () => Date } | null;
  status?: 'sending' | 'sent' | 'failed' | 'queued';
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  conversationType: 'direct' | 'group';
}

export default function MessageList({ 
  messages, 
  currentUserId, 
  conversationType 
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure FlatList has rendered
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
        />
      )}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
});
```

**Key Features:**
- Optimized FlatList rendering
- **Auto-scroll to bottom when new messages arrive**
- Conditional sender names for group chats
- Proper key extraction for performance
- Content container styling

**✅ Checkpoint:** List renders messages correctly

---

### Step 4: Create OfflineBanner Component

**Purpose:** Show banner when device is offline.

```bash
touch components/OfflineBanner.tsx
```

**Implementation:**

**Reference:** See FILE_STRUCTURE_GUIDE.md lines 839-876

```typescript
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    // CRITICAL: Cleanup on unmount
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        ⚠️ You're offline. Messages will send when reconnected.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF9800',
    padding: 8,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
```

**Key Features:**
- Real-time network detection
- Auto-shows/hides based on connectivity
- Non-intrusive warning banner
- Proper cleanup of NetInfo listener

**✅ Checkpoint:** Banner shows in airplane mode, hides when connected

---

## Task 3.2: Implement Chat Screen

### Purpose

The main chat interface where users send and receive messages.

### Step 1: Create Chat Screen File

Create the chat directory and screen file:

```bash
# Create the chat directory
mkdir -p app/chat

# Create the real chat screen
touch app/chat/\[id\].tsx
```

**Note:** If you didn't delete the Phase 2 placeholder yet, do it now before creating the new file.

### Step 2: Implement the Chat Screen

⚠️ **FIRESTORE LISTENERS - CRITICAL**

This screen uses multiple real-time listeners. Each **MUST** have a cleanup function to prevent memory leaks. See QUICK_REFERENCE.md lines 18-25 for the pattern.

---

⚠️ **FIRESTORE INDEX MAY BE REQUIRED**

The messages query uses `orderBy('createdAt', 'asc')` + `limit(100)`. Depending on your security rules, Firestore might require a composite index.

**If you get an error like:**
```
Error: The query requires an index
```

**Solution:**
1. Check the console error - it will include a link to auto-create the index
2. Click the link (opens Firebase Console)
3. Click "Create Index"
4. Wait 1-2 minutes for the index to build
5. Reload your app

The code below includes error handling that will log a clear message if this happens.

---

```typescript
import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../../firebase.config';
import { useAuthStore } from '../../store/authStore';
import MessageList from '../../components/MessageList';
import MessageInput from '../../components/MessageInput';
import OfflineBanner from '../../components/OfflineBanner';
import { MESSAGE_LIMIT, MESSAGE_TIMEOUT_MS } from '../../utils/constants';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date | { toDate: () => Date } | null;
  participants: string[];
  status?: 'sending' | 'sent' | 'failed' | 'queued';
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  participantDetails: Record<string, { displayName: string; email: string }>;
}

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const navigation = useNavigation();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Track pending message timeouts
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Update header title when conversation loads
  useEffect(() => {
    if (conversation && user) {
      let title = 'Chat';
      
      if (conversation.type === 'direct') {
        // Find the other user's name
        const otherUserId = conversation.participants.find(id => id !== user.uid);
        if (otherUserId && conversation.participantDetails[otherUserId]) {
          title = conversation.participantDetails[otherUserId].displayName;
        }
      } else {
        // Group chat
        title = conversation.name || 'Group Chat';
      }
      
      navigation.setOptions({ title });
    }
  }, [conversation, user, navigation]);

  // Listen to network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  // Listen to conversation details
  useEffect(() => {
    if (!conversationId || typeof conversationId !== 'string') return;

    const unsubscribe = onSnapshot(
      doc(db, 'conversations', conversationId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setConversation({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          } as Conversation);
        }
      }
    );

    return unsubscribe;
  }, [conversationId]);

  // Listen to messages (last 100)
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
      // If index is required, error will contain a link to create it
      if (error.message.includes('index')) {
        console.error('⚠️ Firestore index required. Check the error above for a link to create it.');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [conversationId]);

  const sendMessage = async (text: string) => {
    if (!conversation || !user || typeof conversationId !== 'string') return;

    // Generate temp ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const senderName = user.displayName || user.email || 'Unknown User';
    
    const tempMessage: Message = {
      id: tempId,
      text,
      senderId: user.uid,
      senderName,
      createdAt: new Date(),
      participants: conversation.participants,
      status: isOnline ? 'sending' : 'queued',
    };

    // Optimistic update: Add temp message immediately
    setMessages(prev => [...prev, tempMessage]);

    // Set timeout for failure detection (10 seconds)
    const timeout = setTimeout(() => {
      updateMessageStatus(tempId, 'failed');
      timeoutRefs.current.delete(tempId);
    }, MESSAGE_TIMEOUT_MS);

    timeoutRefs.current.set(tempId, timeout);

    try {
      // Write to Firestore
      const messageRef = await addDoc(
        collection(db, 'conversations', conversationId, 'messages'),
        {
          text,
          senderId: user.uid,
          senderName,
          participants: conversation.participants,
          createdAt: serverTimestamp(),
        }
      );

      // Clear timeout (message succeeded)
      const existingTimeout = timeoutRefs.current.get(tempId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeoutRefs.current.delete(tempId);
      }

      // Update conversation's lastMessage
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: text.substring(0, 100),
        lastMessageAt: serverTimestamp(),
      });

      // Remove temp message (real one will appear via listener)
      setMessages(prev => prev.filter(m => m.id !== tempId));

    } catch (error) {
      console.error('Send message error:', error);
      
      // Clear timeout
      const existingTimeout = timeoutRefs.current.get(tempId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeoutRefs.current.delete(tempId);
      }

      // Mark as failed
      updateMessageStatus(tempId, 'failed');
    }
  };

  const updateMessageStatus = (messageId: string, status: 'sending' | 'sent' | 'failed' | 'queued') => {
    setMessages(prev => 
      prev.map(m => m.id === messageId ? { ...m, status } : m)
    );
  };

  const handleTyping = () => {
    // Typing indicator logic will be added in Phase 5
    // For now, this is a no-op
  };

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.errorContainer}>
        <Text>Conversation not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <MessageList
        messages={messages}
        currentUserId={user.uid}
        conversationType={conversation.type}
      />
      <MessageInput
        onSend={sendMessage}
        onTyping={handleTyping}
        disabled={false} // Can send even when offline (will queue)
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### Key Implementation Details

**Dynamic Header Title:**
- Shows participant name for direct chats
- Shows group name (or "Group Chat") for groups
- Updates automatically when conversation loads

**Optimistic Updates:**
- Message appears instantly with temp ID
- Status: "sending" when online, "queued" when offline
- Real message replaces temp via listener

**Timeout Detection:**
- 10-second timeout per message
- If timeout expires, status → "failed"
- Cleared on success or error

**Multiple Listeners:**
1. Network status (NetInfo)
2. Conversation details (metadata)
3. Messages (last 100)

**All have cleanup functions!**

**Type Safety:**
- Proper interfaces for Message and Conversation
- Timestamp types handle both Date and Firestore Timestamp
- Fallback for missing displayName (uses email or "Unknown User")

**Firestore Writes:**
- Uses `serverTimestamp()` (CRITICAL)
- Denormalizes `participants` array for security rules

**✅ Checkpoint:** Chat screen loads, can send messages, they appear instantly

---

### Step 3: Update Root Layout

Add the chat route to `app/_layout.tsx`:

```typescript
// In your Stack component, add:
<Stack.Screen 
  name="chat/[id]" 
  options={{ 
    title: 'Chat',
    headerBackTitle: 'Back'
  }} 
/>
```

**✅ Checkpoint:** Can navigate to chat screen from conversations list

---

## Testing Phase 3

### Test 3.1: Send Message (Online)

**Steps:**
1. Open a conversation
2. Type a message
3. Press send

**Expected:**
- ✅ Message appears instantly at bottom
- ✅ Shows "sending" status briefly
- ✅ Status icon disappears when sent
- ✅ Message persists after app restart

---

### Test 3.2: Receive Message (Real-Time)

**Setup:** 2 devices/emulators with different users

**Steps:**
1. User A opens conversation with User B
2. User B sends a message

**Expected:**
- ✅ User A sees message appear within 1-2 seconds
- ✅ No refresh needed
- ✅ Message shows correct sender name
- ✅ Timestamp displays correctly

---

### Test 3.3: Offline Messaging

**Steps:**
1. Enable airplane mode
2. Send a message
3. Disable airplane mode

**Expected:**
- ✅ Offline banner appears
- ✅ Message shows "queued" status (📤)
- ✅ After reconnect, message sends automatically
- ✅ Status updates to sent
- ✅ Banner disappears

---

### Test 3.4: Message Timeout

**Setup:** Simulate slow/stuck network

**Steps:**
1. Send a message
2. Wait 10+ seconds without connection

**Expected:**
- ✅ Message shows "failed" status (❌)
- ✅ User can see it failed (Phase 3 shows status, Phase 7 will add retry)

---

### Test 3.5: Multiple Messages

**Steps:**
1. Send 10+ messages rapidly
2. Check order

**Expected:**
- ✅ All messages appear
- ✅ Correct chronological order
- ✅ No duplicates
- ✅ All messages persist after restart

---

### Test 3.6: Long Messages

**Steps:**
1. Type a message with 500+ characters
2. Send

**Expected:**
- ✅ Message sends successfully
- ✅ Bubble wraps text properly
- ✅ Preview in conversation list truncated at 100 chars

---

### Test 3.7: Group Chat Messages

**Setup:** Group conversation with 3+ users

**Steps:**
1. Each user sends a message
2. Check display

**Expected:**
- ✅ Sender names show for received messages
- ✅ Own messages don't show sender name
- ✅ All users receive all messages
- ✅ Correct styling for each message

---

### Test 3.8: Empty State

**Steps:**
1. Create new conversation
2. Open chat screen

**Expected:**
- ✅ Empty messages list
- ✅ Input works
- ✅ First message sends correctly

---

## Common Issues & Solutions

### Issue: Messages not in correct order

**Cause:** Using client timestamps instead of server timestamps

**Solution:**
- Verify `serverTimestamp()` is used in message creation
- Check QUICK_REFERENCE.md lines 9-16

```typescript
// ✅ CORRECT
createdAt: serverTimestamp()

// ❌ WRONG
createdAt: new Date()
```

---

### Issue: Duplicate messages appearing

**Cause:** Temp message not removed after real message arrives

**Solution:**
Ensure this code is in sendMessage:

```typescript
// Remove temp message
setMessages(prev => prev.filter(m => m.id !== tempId));
```

---

### Issue: Messages don't persist after restart

**Cause:** Firestore offline persistence not enabled

**Solution:**
Check `firebase.config.ts` has:

```typescript
db = initializeFirestore(app, {
  cacheSizeBytes: 40 * 1024 * 1024,
});
```

---

### Issue: "Failed" status on all messages

**Cause:** Timeout too short or Firestore writes actually failing

**Debug:**
1. Check console for Firestore errors
2. Verify Firestore rules allow message creation
3. Try increasing timeout to 20 seconds for testing

---

### Issue: Memory leak warning

**Cause:** Firestore listeners not cleaned up

**Solution:**
Check ALL useEffect hooks with `onSnapshot` have return statements:

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(/*...*/);
  return unsubscribe; // CRITICAL
}, [deps]);
```

---

### Issue: Offline banner not showing

**Cause:** NetInfo not detecting offline state

**Debug:**
```typescript
// Add to useEffect:
NetInfo.addEventListener(state => {
  console.log('Network state:', state.isConnected);
  setIsOnline(state.isConnected ?? true);
});
```

**Test:** Enable airplane mode, check console

---

### Issue: Keyboard covers input on some Android devices

**Cause:** `KeyboardAvoidingView` offset may need adjustment for specific devices

**Debug:**
1. Test on various Android devices/emulators
2. If input is covered, try adjusting `keyboardVerticalOffset`
3. Or change `behavior` from `undefined` to `"height"` for Android:

```typescript
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
>
```

**Note:** This is device-specific. Test on your target devices.

---

## Potential Roadblocks & Questions

### 🟢 Resolved: Optimistic Update Strategy

**Question:** Show temp message immediately or wait for Firestore?

**Answer:** ✅ Show immediately (optimistic update)

**Benefit:** Better UX, feels instant even with network latency

---

### 🟢 Resolved: Failed Message Handling

**Question:** What to do with failed messages?

**Answer:** ✅ Show failed status, keep in list

**Future (Phase 7):** Add retry button

---

### 🟡 Unresolved: Message Pagination

**Issue:** Only loading last 100 messages

**Impact:** Can't see older messages if conversation has 100+

**Mitigation:** Acceptable for MVP

**Recommendation:** Add "Load More" in Phase 7 or post-MVP

**Status:** ⚠️ Known limitation

---

### 🟡 Unresolved: Message Editing/Deletion

**Issue:** Can't edit or delete sent messages

**Impact:** User has to live with typos

**Mitigation:** MVP doesn't include this feature

**Recommendation:** Phase 2 post-MVP enhancement

**Status:** ⚠️ Out of scope for MVP

---

### 🟢 Resolved: Offline Message Queueing

**Question:** How do offline messages sync?

**Answer:** ✅ Firestore SDK handles automatically

**Details:** Writes are cached locally, auto-sync on reconnect

---

### 🟡 Potential Issue: Large Message Lists

**Issue:** Rendering 100 messages might be slow on older devices

**Impact:** UI lag when opening chat with many messages

**Mitigation:** FlatList is already optimized

**Recommendation:** Monitor performance during testing

**Status:** ⚠️ Monitor

---

## Verification Checklist

Before proceeding to Phase 4, verify ALL of these:

### Code Complete

- [ ] `components/MessageBubble.tsx` created
- [ ] `components/MessageList.tsx` created
- [ ] `components/MessageInput.tsx` created
- [ ] `components/OfflineBanner.tsx` created
- [ ] `app/chat/[id].tsx` created (real implementation, not placeholder)
- [ ] Chat route added to `app/_layout.tsx`
- [ ] No TypeScript errors
- [ ] No linter errors

### Functionality Tests

- [ ] Can send message in one-on-one chat
- [ ] Can send message in group chat
- [ ] Messages appear instantly (optimistic update)
- [ ] Messages appear on other user's screen in real-time
- [ ] Messages persist after app restart
- [ ] Last 100 messages load correctly
- [ ] Timestamps display correctly
- [ ] Offline banner shows in airplane mode
- [ ] Messages queue when offline
- [ ] Messages auto-send when reconnected
- [ ] Failed messages show ❌ status
- [ ] Sender names show in group chats
- [ ] Can type long messages (500+ chars)
- [ ] Input clears after sending

### Data Verification

- [ ] Check Firebase Console → Firestore
- [ ] Messages collection exists under conversations
- [ ] Message documents have correct structure
- [ ] `participants` array is denormalized
- [ ] `createdAt` uses serverTimestamp
- [ ] Conversation `lastMessage` updates
- [ ] Conversation `lastMessageAt` updates

### Memory & Performance

- [ ] No memory leaks (all listeners cleaned up)
- [ ] App doesn't crash on rapid message sending
- [ ] Messages render smoothly (no lag)
- [ ] Network transitions don't cause crashes

---

## Summary

**Phase 3 Complete When:**

- ✅ Can send messages in one-on-one chats
- ✅ Can send messages in group chats
- ✅ Messages appear instantly (optimistic updates)
- ✅ Real-time message sync works
- ✅ Messages persist across sessions
- ✅ Offline queueing works
- ✅ Network status detection works
- ✅ Message components are reusable and styled

**Time Investment:** 3-4 hours  
**Output:** Complete messaging infrastructure with real-time sync and offline support

**Next:** Phase 4 - Group Messaging Enhancements (sender names, group indicators)

---

## Before Phase 4

### Commit Your Work

```bash
git add .
git commit -m "feat: complete Phase 3 - core messaging with real-time sync and offline support"
```

### Update Progress

Check off Phase 3 in `docs/PROGRESS_TRACKER.md`

### Prepare for Phase 4

Phase 4 will enhance group chat features:
- Ensure sender names display correctly
- Group-specific UI adjustments
- Testing with multiple participants

**Estimated time:** 1-2 hours

---

**Ready to proceed? Ensure ALL verification checklist items are complete before moving to Phase 4.**

