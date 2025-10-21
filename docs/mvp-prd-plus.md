# MessageAI MVP - Product Requirements Document

**Project:** MessageAI (Gauntlet AI Challenge)  
**Scope:** MVP Phase (24-hour deadline)  
**Tech Stack:** React Native (Expo Managed) + Firebase  
**Target Deployment:** Android/iOS Emulator (local testing)  
**Document Version:** 3.0 (Updated)

---

## Executive Summary

This PRD defines the MVP scope for MessageAI: a production-quality messaging app clone focused on core messaging infrastructure (one-on-one and group chat, real-time delivery, offline support, and message persistence). The MVP is designed for rapid development using React Native + Expo + Firebase to meet the 24-hour hard gate deadline. **No AI features or media handling are included in MVP scope.**

**Key Decision:** Using **Expo Managed Workflow** with **Expo Router** for file-based routing to maximize development speed. This requires no native code compilation, supports hot reload, and deploys via Expo Go for testing on emulators.

---

## 1. MVP Scope & Priorities

### What IS in MVP (Hard Requirements)

- ✅ One-on-one chat
- ✅ Group chat (3+ users)
- ✅ Real-time message delivery
- ✅ Message persistence (local + cloud)
- ✅ Optimistic UI updates
- ✅ Online/offline status indicators
- ✅ User authentication (email/password)
- ✅ User-chosen display name (nickname) during registration
- ✅ Email-based user discovery
- ✅ Message timestamps
- ✅ Message read receipts (last-read tracking)
- ✅ Typing indicators
- ✅ Push notifications setup (foreground + local notifications)
- ✅ Message pagination (last 100 messages)
- ✅ Offline/online network status detection
- ✅ Deployment on local emulator

### What IS NOT in MVP (Out of Scope)

- ❌ Media uploads (no images, files, or any media)
- ❌ User avatars or profile pictures (text-only profiles)
- ❌ Message search
- ❌ Message editing/deletion
- ❌ Voice/video calls
- ❌ End-to-end encryption
- ❌ User presence animations or complex animations
- ❌ Dark mode
- ❌ Multi-language support
- ❌ All AI features (Phase 2)
- ❌ Username system (email-only discovery for MVP)
- ❌ Contacts/friends system
- ❌ Profile editing after registration
- ❌ Group management (add/remove users, edit name)

### What to Minimize/Simplify

- **Authentication:** Email + password only (no Google Sign-In, Apple ID, phone auth)
- **UI/UX:** Functional, not beautiful. Copy WhatsApp's layout but skip polish.
- **Database schema:** Keep it simple—avoid premature optimization
- **Push notifications:** Foreground notification + local notifications (background is Phase 2)
- **User discovery:** Email-based lookup only (no user directory or search)

### Post-MVP Considerations (Phase 2)

- Username system for better user discovery
- Contacts/friends system
- Profile editing
- Group management (add/remove members, edit group name/image, leave group)
- Load older messages on scroll (infinite scroll pagination)
- Message read-by-each-user details in group chats
- Background push notifications
- Message retry mechanism with better UX

---

## 2. Technical Stack & Architecture

### Frontend (React Native + Expo)

```
├── Expo SDK 54.0.0 (managed workflow) - PINNED
├── React 19.1.0 - PINNED
├── React Native 0.81 (compatible with Expo SDK 54) - PINNED
├── Expo Router (file-based routing - PRIMARY NAVIGATION)
├── @react-native-firebase/* (Firebase SDK for RN)
├── AsyncStorage (local state persistence)
├── Zustand (lightweight state management)
├── React Native Paper (pre-built UI components)
├── expo-notifications (push/local notifications)
├── expo-vector-icons (3,000+ icons pre-included)
└── @react-native-community/netinfo (network status detection)
```

**NOTE:** All version numbers are frozen/pinned for compatibility. Do not upgrade during MVP development.

### Backend (Firebase)

```
├── Firestore (real-time database)
│   ├── Users collection
│   ├── Conversations collection
│   └── Messages subcollection (per conversation)
├── Firebase Auth (email/password)
├── Firebase Cloud Messaging (FCM) - for production push (Phase 2)
└── Firebase Cloud Functions (optional for complex logic)
```

### Development Environment

```
├── Node.js 20.19.4+ (LTS 22.20.0 recommended)
├── Expo CLI (global)
├── Expo Go (mobile testing on physical devices)
├── Android Emulator (Android Platform 35, API 34+)
├── iOS Simulator (macOS only)
└── Firebase Emulator Suite (optional for offline testing)
```

### Why This Stack?

| Component | Why | Risk Mitigation |
|-----------|-----|-----------------|
| React Native + Expo | Fast iteration, hot reload, no native code needed | Avoid ejecting; use managed workflow only |
| Expo SDK 54 | Latest stable with React 19 support | Versions verified and pinned for compatibility |
| Expo Router | File-based routing (Next.js-inspired), cleaner than React Navigation | Simplifies navigation; already set up in project |
| Firestore | Real-time sync built-in, no custom WebSocket logic | Learn Firestore rules early; test offline behavior |
| AsyncStorage | Offline message queuing, simple key-value store | Keep payloads small; clear old data periodically |
| Zustand | Minimal boilerplate vs Redux | Don't over-engineer state; use hybrid approach |
| NetInfo | Detect offline/online status for better UX | Handle edge cases when network state changes |

### Key Architectural Decisions (Rationale)

**Decision 1: Hybrid State Management (Zustand + Component State)**

- **Approach:** Use Zustand for global state (auth, conversations list), component state for screen-specific data (messages, typing indicators)
- **Why:** Better performance, cleaner separation of concerns, easier debugging
- **Alternative Considered:** Pure Zustand (all state centralized) - Rejected due to unnecessary re-renders

**Decision 2: Last-Read Message Tracking (Not Per-Message Read Receipts)**

- **Approach:** Store `lastReadMessageId` per user per conversation in conversation doc
- **Why:** Single Firestore write per conversation vs. N writes for N messages; simpler queries
- **Trade-off:** Can't show "Alice read message #5 but not #6" granularity (acceptable for MVP)

**Decision 3: Denormalized Participants in Message Docs**

- **Approach:** Each message includes `participants: [uid1, uid2, ...]` array copied from parent conversation
- **Why:** Firestore security rules can check permissions without extra `get()` calls (faster, cheaper)
- **Cost:** ~100 bytes per message (minimal overhead)

**Decision 4: Offline Detection with Timeout + NetInfo**

- **Approach:** Combine 10-second timeout for "stuck" messages + NetInfo for network state monitoring
- **Why:** Distinguish "queued" (offline) vs "failed" (timeout/error) vs "sending" (in progress)
- **Alternative Considered:** Rely on Firestore offline alone - Rejected due to no user feedback on queue status

**Decision 5: 500ms Typing Indicator Debounce**

- **Approach:** Update typing status max once per 500ms, clear on send or after 500ms inactivity
- **Why:** Balance between responsiveness and Firestore write costs
- **Alternative Considered:** 2-second debounce - Rejected as too slow for good UX

### Recommended Expo Modules (Pre-installed with SDK 54)

- **expo-notifications**: Local & push notifications (built-in)
- **expo-vector-icons**: 3,000+ icons (Ionicons, MaterialCommunityIcons, etc.)
- **expo-status-bar**: Control device status bar
- **expo-linking**: Deep linking/URL handling

---

## 3. Core Features - Implementation Guide

### 3.1 User Authentication & Registration

**Requirements:**

- Email/password registration and login
- User chooses display name (nickname) during registration
- No profile editing post-registration (MVP limitation)
- Persistent session (auto-login on app restart)
- User profiles: `{ uid, email, displayName }`

**Implementation Approach:**

```javascript
// Registration flow:
1. User enters email, password, display name (nickname)
2. Validate email format, password length (6+ chars), display name (required)
3. Create Firebase Auth account
4. Create Firestore user document with display name
5. Auto-login after registration

// Login flow:
1. User enters email + password
2. Firebase Auth validates
3. Fetch user profile from Firestore
4. Store in Zustand + AsyncStorage for persistence
```

**Firestore Schema:**

```
/users/{uid}
├── email: string
├── displayName: string (user-chosen nickname)
├── isOnline: boolean
├── lastSeenAt: timestamp (server time)
├── createdAt: timestamp
└── updatedAt: timestamp
```

**Key Implementation Details:**

- No email verification flow (keep it simple)
- Display name is required and chosen once at registration
- Use serverTimestamp() for all timestamps
- Store auth state in both Zustand (in-memory) and AsyncStorage (persistence)

**Time to Implement:** 1.5-2 hours

---

### 3.2 User Discovery & Conversation Creation

**Requirements:**

- Users find other users by entering email addresses
- Show helpful error if email not found
- Default to one-on-one chat; explicit button for group chat
- For group chat: validate each email, allow proceeding with only valid emails (minimum 2 valid emails)

**UI Flow - One-on-One Chat:**

```
1. User taps "New Chat" button
2. Screen shows email input field
3. User enters email address
4. App validates:
   - If found → Proceed to chat (create/open conversation)
   - If not found → Show error "No user found with that email"
5. User can edit and try again
```

**UI Flow - Group Chat:**

```
1. User taps "New Group Chat" button
2. Screen shows email input with "Add" button
3. User enters email, taps "Add"
4. App validates:
   - If found → Add to list, show checkmark with user's display name
   - If not found → Show error "No user found with [email]", don't add to list
5. User can add more emails (repeat step 3-4)
6. After adding at least 2 valid emails, "Create Group" button becomes enabled
7. User taps "Create Group" → Creates conversation with valid participants only
```

**Implementation Approach:**

```javascript
// Email lookup function
const findUserByEmail = async (email) => {
  const snapshot = await db.collection('users')
    .where('email', '==', email.toLowerCase().trim())
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null; // User not found
  }
  
  return snapshot.docs[0].data();
};

// Conversation creation (one-on-one)
const createOrOpenConversation = async (otherUserEmail) => {
  const otherUser = await findUserByEmail(otherUserEmail);
  if (!otherUser) {
    throw new Error('No user found with that email');
  }
  
  // Check if conversation already exists
  const conversationId = [currentUser.uid, otherUser.uid].sort().join('_');
  const conversationDoc = await db.collection('conversations').doc(conversationId).get();
  
  if (!conversationDoc.exists) {
    // Create new conversation
    await db.collection('conversations').doc(conversationId).set({
      type: 'direct',
      participants: [currentUser.uid, otherUser.uid],
      participantDetails: {
        [currentUser.uid]: { displayName: currentUser.displayName, email: currentUser.email },
        [otherUser.uid]: { displayName: otherUser.displayName, email: otherUser.email }
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastMessageAt: null,
      lastMessage: null
    });
  }
  
  // Navigate to chat screen
  router.push(`/chat/${conversationId}`);
};

// Conversation creation (group)
const createGroupConversation = async (validEmails) => {
  if (validEmails.length < 2) {
    throw new Error('Need at least 2 other participants for a group chat');
  }
  
  const participants = [currentUser.uid];
  const participantDetails = {
    [currentUser.uid]: { displayName: currentUser.displayName, email: currentUser.email }
  };
  
  for (const email of validEmails) {
    const user = await findUserByEmail(email);
    if (user) {
      participants.push(user.uid);
      participantDetails[user.uid] = { displayName: user.displayName, email: user.email };
    }
  }
  
  const conversationRef = await db.collection('conversations').add({
    type: 'group',
    name: `Group with ${participants.length} members`, // Default name
    participants,
    participantDetails,
    creatorId: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessageAt: null,
    lastMessage: null
  });
  
  router.push(`/chat/${conversationRef.id}`);
};
```

**Firestore Schema:**

```
/conversations/{conversationId}
├── type: "direct" | "group"
├── name: string (group name, optional for direct)
├── participants: [uid1, uid2, ...]
├── participantDetails: { uid1: { displayName, email }, uid2: {...}, ... }
├── creatorId: uid (for groups)
├── lastMessageAt: timestamp
├── lastMessage: string (for preview)
├── lastRead: { uid1: messageId, uid2: messageId, ... }
└── createdAt: timestamp
```

**Time to Implement:** 2-3 hours

---

### 3.3 One-on-One & Group Chat Messages

**Requirements:**

- Send/receive text messages between users
- Messages appear instantly (optimistic update)
- Conversation history persists (last 100 messages loaded)
- Timestamps on each message
- Show sender name/avatar for group chats

**Implementation Approach:**

1. **Message Schema:**

```
/conversations/{conversationId}/messages/{messageId}
├── senderId: string
├── senderName: string (denormalized for performance)
├── text: string
├── createdAt: timestamp (server time)
├── status: "sending" | "sent" | "failed" | "queued"
└── participants: [uid1, uid2, ...] (denormalized for security rules)
```

2. **Real-Time Message Listening (Load Last 100):**

   ```javascript

const [messages, setMessages] = useState([]);

useEffect(() => {
  const unsubscribe = db.collection('conversations')
    .doc(conversationId)
     .collection('messages')
    .orderBy('createdAt', 'desc') // Most recent first
    .limit(100) // Only load last 100
     .onSnapshot((snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .reverse(); // Reverse to show oldest first in UI
      setMessages(msgs);
     });

   return () => unsubscribe();
}, [conversationId]);

// NOTE: Pagination for older messages is marked as Post-MVP

   ```

3. **Optimistic Updates with Network Awareness:**
   ```javascript
import NetInfo from '@react-native-community/netinfo';

const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setIsOnline(state.isConnected);
  });
  return unsubscribe;
}, []);

const sendMessage = async (text) => {
  const tempId = `temp_${Date.now()}`;
   const tempMessage = {
    id: tempId,
    text,
     senderId: currentUser.uid,
    senderName: currentUser.displayName,
    status: isOnline ? 'sending' : 'queued',
    createdAt: new Date(),
   };
  
  // Add to local state immediately (optimistic update)
   setMessages([...messages, tempMessage]);
   
  // Set timeout for stuck detection (10 seconds)
  const timeout = setTimeout(() => {
    updateMessageStatus(tempId, 'failed');
  }, 10000);
  
  try {
    const docRef = await db.collection('conversations')
      .doc(conversationId)
     .collection('messages')
     .add({ 
        text,
       senderId: currentUser.uid,
        senderName: currentUser.displayName,
        participants: conversation.participants, // Denormalized for security
       createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    
    clearTimeout(timeout);
    
    // Update conversation's lastMessage
    await db.collection('conversations').doc(conversationId).update({
      lastMessage: text.substring(0, 100),
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Remove temp message (real one will appear via listener)
    setMessages(msgs => msgs.filter(m => m.id !== tempId));
    
  } catch (error) {
    clearTimeout(timeout);
    updateMessageStatus(tempId, 'failed');
    console.error('Send message error:', error);
  }
};

const updateMessageStatus = (messageId, status) => {
  setMessages(msgs => msgs.map(m => 
    m.id === messageId ? { ...m, status } : m
  ));
};
   ```

4. **Offline Queue:**

- Firestore's built-in offline support handles queuing automatically
- Use NetInfo to show "Offline" banner when network is unavailable
- Messages show status: `queued` when offline, auto-sync when online
- Failed messages (timeout/error) can be retried manually (Post-MVP feature)

**Time to Implement:** 3-4 hours

---

### 3.4 Message Read Receipts (Last-Read Tracking)

**Requirements:**

- Show when messages are read by recipients
- Track last-read message per user per conversation
- Update UI with read status indicator (checkmarks)
- Simplified approach: track last read message, not per-message read status

**Implementation Approach:**

1. **Firestore Schema (Updated):**

```
/conversations/{conversationId}
├── lastRead: { 
│     uid1: messageId_123,
│     uid2: messageId_456
│   }
```

2. **Mark as Read (When User Opens/Scrolls Chat):**

```javascript
useEffect(() => {
  if (messages.length === 0) return;
  
  // Get the last message in the conversation
  const lastMessage = messages[messages.length - 1];
  
  // If it's not from me and I haven't read it yet
  if (lastMessage.senderId !== currentUser.uid) {
    db.collection('conversations')
      .doc(conversationId)
      .update({
        [`lastRead.${currentUser.uid}`]: lastMessage.id
      });
  }
}, [messages]);
```

3. **Display Read Status (One-on-One):**

```javascript
const getReadStatus = (message, conversation) => {
  if (message.senderId !== currentUser.uid) return null; // Only for my messages
  
  // Get other user's last read message
  const otherUserId = conversation.participants.find(uid => uid !== currentUser.uid);
  const otherUserLastRead = conversation.lastRead?.[otherUserId];
  
  if (!otherUserLastRead) return '✓'; // Not read yet
  
  // Compare message timestamps to determine if read
  const lastReadMsg = messages.find(m => m.id === otherUserLastRead);
  if (!lastReadMsg) return '✓';
  
  if (message.createdAt <= lastReadMsg.createdAt) {
    return '✓✓'; // Read
  }
  
  return '✓'; // Sent but not read
};
```

4. **Display Read Status (Group Chat):**

   ```javascript

const getGroupReadStatus = (message, conversation) => {
  if (message.senderId !== currentUser.uid) return null;
  
  const otherParticipants = conversation.participants.filter(uid => uid !== currentUser.uid);
  let readCount = 0;
  
  otherParticipants.forEach(uid => {
    const theirLastRead = conversation.lastRead?.[uid];
    if (theirLastRead) {
      const lastReadMsg = messages.find(m => m.id === theirLastRead);
      if (lastReadMsg && message.createdAt <= lastReadMsg.createdAt) {
        readCount++;
      }
    }
  });
  
  if (readCount === 0) return '✓'; // None read
  if (readCount === otherParticipants.length) return '✓✓'; // All read
  return `✓ (${readCount}/${otherParticipants.length})`; // Partial read
};

```

**Benefits of Last-Read Approach:**
- ✅ Single write per conversation when user opens chat (vs N writes for N messages)
- ✅ Works well for group chats
- ✅ Can still show "read up to" status
- ⚠️ Limitation: Can't show per-message read status (e.g., "Alice read message #5 but not #6")
  - This is acceptable for MVP; this is a common pattern for read receipt tracking

**Post-MVP Enhancement:**
- Add detailed read-by-user tracking for group chats (show "Read by Alice, Bob")
- Add unread count badges on conversation list

**Time to Implement:** 1-1.5 hours

---

### 3.5 Typing Indicators

**Requirements:**
- Show "User is typing..." when other user types
- Update in real-time
- Clear after inactivity or on send

**Implementation Approach:**

1. **Firestore Schema (Temporary Documents):**
```

/conversations/{conversationId}/typingUsers/{userId}
├── uid: string
├── at: timestamp

```

2. **Typing Indicator Logic:**
   ```javascript
let typingTimeout = null;
   
   const handleTextChange = (text) => {
     setText(text);
     
  // Don't spam Firestore - only update once per 500ms
  if (!typingTimeout) {
    db.collection('conversations')
      .doc(conversationId)
         .collection('typingUsers')
         .doc(currentUser.uid)
      .set({ 
        uid: currentUser.uid, 
        at: firebase.firestore.FieldValue.serverTimestamp() 
      });
  }
  
  // Clear typing indicator after 500ms of no typing
     clearTimeout(typingTimeout);
     typingTimeout = setTimeout(() => {
    db.collection('conversations')
      .doc(conversationId)
         .collection('typingUsers')
         .doc(currentUser.uid)
         .delete();
    typingTimeout = null;
  }, 500);
};

const handleSend = async () => {
  // Clear typing indicator immediately on send
  await db.collection('conversations')
    .doc(conversationId)
    .collection('typingUsers')
    .doc(currentUser.uid)
    .delete();
  clearTimeout(typingTimeout);
  typingTimeout = null;
  
  // Send message
  await sendMessage(text);
  setText('');
   };
   ```

3. **Listen for Typing Users:**

   ```javascript

const [typingUsers, setTypingUsers] = useState([]);

   useEffect(() => {
  const unsubscribe = db.collection('conversations')
    .doc(conversationId)
       .collection('typingUsers')
       .onSnapshot((snapshot) => {
      const typing = snapshot.docs
        .map(doc => doc.data())
        .filter(u => u.uid !== currentUser.uid); // Don't show my own typing
      setTypingUsers(typing);
       });

     return unsubscribe;
   }, [conversationId]);

// Display:
{typingUsers.length > 0 && (
  <Text style={styles.typingIndicator}>
    {typingUsers.length === 1
      ? `${typingUsers[0].displayName} is typing...`
      : `${typingUsers.length} people are typing...`}
  </Text>
)}

   ```

**Simplifications:**
- Show typing as simple text (no animation bubbles)
- 500ms debounce to reduce Firestore writes
- Clear immediately on send button press

**Time to Implement:** 1-1.5 hours

---

### 3.6 Online/Offline Status

**Requirements:**
- Show "Online" / "Offline" next to user names
- Show "last seen" timestamp when offline
- Update status in real-time based on app lifecycle

**Implementation Approach:**

1. **Presence Tracking:**
   ```javascript
import { AppState } from 'react-native';

   useEffect(() => {
  // Set online on mount
  db.collection('users').doc(currentUser.uid).update({
    isOnline: true,
    lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  // Listen for app state changes
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      db.collection('users').doc(currentUser.uid).update({
        isOnline: true,
        lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else if (state === 'background' || state === 'inactive') {
      db.collection('users').doc(currentUser.uid).update({
        isOnline: false,
        lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  });
  
  return () => subscription.remove();
}, [currentUser]);
```

2. **Listen to User Status:**

   ```javascript

const [userStatuses, setUserStatuses] = useState({});

useEffect(() => {
  const userIds = conversation.participants.filter(uid => uid !== currentUser.uid);
  
  const unsubscribes = userIds.map(uid => {
    return db.collection('users').doc(uid).onSnapshot((doc) => {
      setUserStatuses(prev => ({
        ...prev,
        [uid]: doc.data()
      }));
    });
  });
  
  return () => unsubscribes.forEach(unsub => unsub());
}, [conversation]);

// Display:
const getUserStatus = (userId) => {
  const user = userStatuses[userId];
  if (!user) return 'Unknown';
  if (user.isOnline) return 'Online';
  
  // Format last seen
  const lastSeen = user.lastSeenAt?.toDate();
  if (!lastSeen) return 'Offline';
  
  const now = new Date();
  const diff = now - lastSeen;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${lastSeen.toLocaleDateString()}`;
};

```

**Time to Implement:** 1 hour

---

### 3.7 Local Notifications (MVP-Compatible)

**Requirements:**
- Show notifications when app is open (foreground)
- Local notifications for incoming messages
- Navigate to conversation when tapping notification

**Implementation Approach:**

   ```javascript
// Setup (in App.tsx or root component)
   import * as Notifications from 'expo-notifications';
   
   // Request permissions
   useEffect(() => {
     Notifications.requestPermissionsAsync();
  
  // Configure notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}, []);

// Listen for notification taps
   useEffect(() => {
     const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const { conversationId } = response.notification.request.content.data;
    if (conversationId) {
      router.push(`/chat/${conversationId}`);
    }
     });
     
     return () => subscription.remove();
   }, []);

// In message listener (ChatScreen or global listener)
const handleIncomingMessage = async (message, conversationId) => {
  // Only notify if message is not from me and app is in background/foreground
  if (message.senderId === currentUser.uid) return;
  
  await Notifications.scheduleNotificationAsync({
       content: {
      title: message.senderName,
      body: message.text,
      sound: 'default',
      data: { conversationId }
    },
    trigger: { seconds: 1 } // Slight delay
  });
};
```

**Limitations:**

- Works in Expo Go (MVP-friendly)
- Only works when app is open or in recent apps
- For production background notifications, need development build + FCM (Phase 2)

**Time to Implement:** 1-2 hours

---

## 4. State Management Architecture (Hybrid Approach)

### Recommended Strategy

**Use Zustand for:**

- Global app state (auth, conversations list, user statuses)
- Data that persists across navigation
- Data shared by multiple screens

**Use Component State (useState) for:**

- Screen-specific data (messages in ChatScreen)
- Form inputs
- Temporary UI state (loading, errors)
- Typing indicators

### Zustand Stores

```javascript
// store/authStore.js
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  
  setUser: (user) => {
    set({ user, loading: false });
    AsyncStorage.setItem('user', JSON.stringify(user));
  },
  
  logout: async () => {
    set({ user: null, loading: false });
    await AsyncStorage.removeItem('user');
  },
  
  restoreSession: async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        set({ user: JSON.parse(userData), loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  }
}));

// store/chatStore.js
export const useChatStore = create((set) => ({
  conversations: [],
  onlineStatuses: {}, // uid -> { isOnline, lastSeenAt }
  
  setConversations: (conversations) => set({ conversations }),
  
  addConversation: (conversation) => set((state) => ({
    conversations: [conversation, ...state.conversations]
  })),
  
  updateOnlineStatus: (uid, status) => set((state) => ({
    onlineStatuses: {
      ...state.onlineStatuses,
      [uid]: status
    }
  }))
}));
```

### Component-Level State Example

```javascript
// app/chat/[id].tsx
const ChatScreen = () => {
  const { id: conversationId } = useLocalSearchParams();
  const { user } = useAuthStore();
  
  // Component-level state
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Firestore listener
  useEffect(() => {
    const unsubscribe = db.collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .onSnapshot((snapshot) => {
        const msgs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .reverse();
        setMessages(msgs);
        setLoading(false);
      });
    
    return unsubscribe;
  }, [conversationId]);
  
  // ... rest of component
};
```

**Why Hybrid?**

- ✅ Cleaner separation of concerns
- ✅ Better performance (less unnecessary re-renders)
- ✅ Easier to debug (clear data flow)
- ✅ Component state auto-cleans on unmount

---

## 5. Firebase Configuration

### Firestore Security Rules (Optimized for MVP)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{uid} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == uid;
      allow update: if request.auth.uid == uid;
    }
    
    // Conversations
    match /conversations/{conversationId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      allow update: if request.auth.uid in resource.data.participants;
    }
    
    // Messages within conversations
    // Uses denormalized participants array for efficient permission check
    match /conversations/{conversationId}/messages/{messageId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && request.auth.uid in request.resource.data.participants;
    }
    
    // Typing users
    match /conversations/{conversationId}/typingUsers/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

**Key Optimization:**

- Messages include denormalized `participants` array to avoid extra `get()` calls
- Trade-off: ~100 bytes extra per message, but much faster permission checks
- This is the recommended approach for MVP

**Note:** These rules are permissive for fast MVP development. Tighten them before production.

---

## 6. Development Strategy & Milestone Plan

### Recommended Build Order (Fastest Path)

```
Day 1 (24 hours):

Hour 0-2:   Environment setup (Expo project, Firebase config, dependencies, Expo Router setup)
Hour 2-4:   Authentication (Login/Register screens with display name)
Hour 4-6:   User discovery UI (email lookup, validation)
Hour 6-9:   One-on-one chat infrastructure (Firestore schema, message sending, optimistic updates)
Hour 9-11:  Real-time message listening + last 100 messages pagination
Hour 11-13: Group chat support (multi-email validation, group creation)
Hour 13-14: Online/offline status + network detection
Hour 14-15: Typing indicators
Hour 15-16: Message read receipts (last-read tracking)
Hour 16-17: Local notifications
Hour 17-19: Testing on emulator (both Android & iOS)
Hour 19-22: Bug fixes, edge cases, UI polish
Hour 22-24: Final verification, documentation
```

### Absolute Minimum to Pass MVP (Core Features Only)

If you get behind, prioritize:

1. Authentication ✓
2. User discovery (email lookup) ✓
3. One-on-one chat ✓
4. Real-time sync ✓
5. Optimistic updates ✓
6. Group chat ✓
7. Message persistence ✓

Then add features incrementally:
8. Read receipts (nice-to-have)
9. Typing indicators (nice-to-have)
10. Notifications (nice-to-have)
11. Online/offline status (nice-to-have)

---

## 7. Recommended File Structure (Expo Router)

```
messageai/
├── app.json                          # Expo config
├── package.json
├── .env                              # Firebase config (gitignored)
├── .gitignore
├── README.md
├── firebase.config.js                # Firebase initialization
├── app/                              # Expo Router directory
│   ├── _layout.tsx                   # Root layout (auth check)
│   ├── index.tsx                     # Landing/redirect screen
│   ├── (auth)/                       # Auth group (no tabs)
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                       # Main app (tabs)
│   │   ├── _layout.tsx               # Tab navigator
│   │   ├── index.tsx                 # Conversations list
│   │   └── new-chat.tsx              # New chat screen
│   └── chat/
│       └── [id].tsx                  # Dynamic chat screen
├── components/
│   ├── MessageBubble.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   ├── ConversationItem.tsx
│   ├── TypingIndicator.tsx
│   └── UserStatusBadge.tsx
├── store/
│   ├── authStore.ts                  # Zustand auth store
│   └── chatStore.ts                  # Zustand chat store
├── utils/
│   ├── helpers.ts
│   ├── timeFormat.ts
│   └── firestore.ts                  # Firestore helper functions
└── assets/
    └── (fonts, icons, etc.)
```

**Expo Router Benefits:**

- File-based routing (no manual navigation setup)
- Automatic deep linking
- Type-safe routes with TypeScript
- Cleaner than manual React Navigation setup
- Already configured in project

---

## 8. Critical Implementation Notes

### Always Use Server Timestamps

- **Critical:** Use `firebase.firestore.FieldValue.serverTimestamp()` for all timestamps
- **Why:** Client clocks are unreliable (different timezones, user device clocks)
- **Impact:** Message ordering will break if you use client-side time

### Memory Leak Prevention

- **Always unsubscribe** from Firestore listeners in useEffect cleanup
- Most common cause of app crashes on rapid navigation

```javascript
useEffect(() => {
  const unsubscribe = db.collection(...).onSnapshot(...);
  return () => unsubscribe(); // CRITICAL!
}, []);
```

### Message Ordering

- Always use `orderBy('createdAt', 'desc')` for latest-first queries
- Reverse array for display (oldest first in UI)
- Use server timestamps only

### Network Testing

- Use Android Studio/Xcode throttling to simulate poor network
- Test airplane mode scenarios
- Verify messages queue and send on reconnect

### Firestore Write Costs

- Typing indicators create writes (~1 per 500ms per user)
- For MVP: 500ms debounce is acceptable
- Monitor usage in Firebase Console

---

## 9. Key Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Firestore data structure mistakes** | 🔴 Critical | Design schema on paper first; test queries before building UI |
| **Real-time listener memory leaks** | 🔴 Critical | Always unsubscribe in `useEffect` cleanup; test rapid navigation |
| **Optimistic updates not syncing** | 🔴 Critical | Test offline + online transition thoroughly; use unique temp IDs |
| **Message ordering issues** | 🔴 Critical | Use `serverTimestamp()` always; never client time for sorting |
| **Authentication state loss** | 🟠 High | Persist auth token in AsyncStorage; restore on app launch |
| **Emulator crashes with hot reload** | 🟠 High | Full restart every 2 hours; use `npx expo start --clear` if issues persist |
| **Group chat with invalid emails** | 🟡 Medium | Validate each email; allow proceeding with only valid ones |
| **UI lag with large message lists** | 🟡 Medium | Load last 100 messages only; pagination is Post-MVP |
| **Network state detection failure** | 🟡 Medium | Use NetInfo for reliable offline detection |

---

## 10. Testing Checklist

Use this before submitting MVP:

### Authentication

- [ ] Register new user with email, password, display name
- [ ] Login with existing user
- [ ] Logout
- [ ] App persists login on restart
- [ ] Can't access chat without auth

### User Discovery

- [ ] Enter valid email → finds user → proceeds to chat
- [ ] Enter invalid email → shows error message
- [ ] Create group with 2 valid emails → succeeds
- [ ] Create group with 1 valid + 1 invalid email → proceeds with valid only
- [ ] Create group with 0 valid emails → shows error

### One-on-One Chat

- [ ] Send message from User A
- [ ] Message appears on User B in real-time (< 1 second)
- [ ] Message persists after app restart
- [ ] Old messages load when opening chat (last 100)
- [ ] Message appears instantly on sender (optimistic update)
- [ ] Failed messages show "failed" status (test with airplane mode + timeout)

### Group Chat

- [ ] Create group with 3+ users
- [ ] Send message in group
- [ ] All users receive message in real-time
- [ ] Sender name shown correctly for each message
- [ ] Messages persist after restart

### Offline Behavior

- [ ] Send message while app is offline (airplane mode)
- [ ] Message shows "queued" status
- [ ] Turn offline mode off
- [ ] Message syncs and shows "sent" status
- [ ] Receive messages while offline → appear when coming back online
- [ ] App doesn't crash during transition

### Status Indicators

- [ ] Online/offline status shown for each user
- [ ] Status updates when going offline
- [ ] Typing indicator appears when other user types
- [ ] Typing indicator disappears after 500ms of inactivity
- [ ] Typing indicator clears immediately on send
- [ ] Message read receipts show ✓ vs ✓✓
- [ ] Last seen time updates correctly

### Notifications

- [ ] Local notification appears when message received
- [ ] Notification shows correct sender name and message preview
- [ ] Tapping notification navigates to correct conversation

### Emulator Testing

- [ ] Test on Android emulator
- [ ] Test on iOS simulator (if time)
- [ ] Force quit and reopen app
- [ ] Verify messages persist
- [ ] Test with poor network (DevTools throttling)
- [ ] Test rapid message sending (20+ messages)

---

## 11. Deployment Checklist (Emulator Ready)

- [ ] GitHub repository created with clean history
- [ ] `README.md` with setup instructions
- [ ] `.env` file with Firebase config template (don't commit real keys)
- [ ] Clean up console logs and debug statements
- [ ] Remove test/dummy data from Firestore
- [ ] Verify Firestore security rules are deployed
- [ ] Test full flow end-to-end on emulator
- [ ] Test on both Android and iOS emulator (if time)
- [ ] Verify app doesn't crash on force quit
- [ ] Test with 2-3 simultaneous users
- [ ] Verify hot reload works properly

---

## 12. Post-MVP Roadmap (Phase 2)

### High Priority

1. **Username system** for better user discovery (instead of email-only)
2. **Contacts/friends system** for easier conversation initiation
3. **Profile editing** (change display name, bio, etc.)
4. **Group management:**
   - Add/remove members after creation
   - Edit group name
   - Leave group
   - Group admin roles
5. **Infinite scroll pagination** for older messages
6. **Background push notifications** (requires development build + FCM)
7. **Message retry mechanism** for failed messages (with better UX)
8. **Per-message read status in groups** ("Read by Alice, Bob")

### Medium Priority

9. Message search
10. Message editing/deletion
11. Unread count badges
12. User blocking
13. Mute conversations
14. Archive conversations
15. Media uploads (images, files)

### Low Priority (Future)

16. Voice/video calls
17. End-to-end encryption
18. Dark mode
19. Animations and polish
20. Multi-language support

---

## Summary

**Goal:** Build a WhatsApp MVP clone in 24 hours using React Native (Expo Router + Managed Workflow) + Firebase, deployable on Android/iOS emulators.

**Key Success Factors:**

1. Use Expo Router for navigation (already set up)
2. Implement email-based user discovery
3. Get Firestore schema right before coding
4. Use real-time listeners correctly (with cleanup)
5. Always use server timestamps (not client time)
6. Test offline/online transitions thoroughly
7. Use optimistic updates for great UX
8. Use hybrid Zustand + component state approach
9. Test on emulator early and often

**Time Budget:**

- Setup: 2 hours
- Core features: 17 hours
- Testing/polish: 5 hours

**You can do this. Focus on shipping messaging that works reliably over feature richness.**

---

# APPENDICES

(Appendices A-E remain the same as previous version, with updates to reflect Expo Router usage)

---

**End of Document**

This PRD is comprehensive, updated with your decisions, and ready for development. Good luck with MessageAI MVP! 🚀
