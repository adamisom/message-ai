# MessageAI MVP - Quick Reference Card

**⚡ SPEED IS CRITICAL - Focus on working features over perfection**

---

## Critical Rules (Never Violate)

### 1. Firebase Timestamps
```typescript
// ✅ ALWAYS DO THIS
createdAt: serverTimestamp()

// ❌ NEVER DO THIS
createdAt: new Date()
```

### 2. Firestore Listener Cleanup
```typescript
// ✅ ALWAYS DO THIS
useEffect(() => {
  const unsubscribe = onSnapshot(/*...*/);
  return () => unsubscribe();
}, []);

// ❌ NEVER FORGET CLEANUP - Causes memory leaks
```

### 3. Pinned Versions (DO NOT UPGRADE)
- Expo SDK 54
- React 19.1.0
- React Native 0.81

---

## File Creation Order (Critical Path)

```
1. Config:    firebase.config.ts, .env
2. Utils:     validators.ts, constants.ts, timeFormat.ts
3. Services:  authService.ts, firestoreService.ts
4. Stores:    authStore.ts, chatStore.ts
5. Components: MessageBubble → MessageInput → MessageList
6. Auth:      login.tsx, register.tsx
7. Main:      _layout.tsx (update), index.tsx (conversations list)
8. Chat:      chat/[id].tsx
```

**Note:** Use TypeScript for firebase.config (`firebase.config.ts` not `.js`) for proper type safety.

---

## Firestore Schema Quick Reference

### Collections

#### `/users/{uid}`
```typescript
{
  email: string,
  displayName: string,
  isOnline: boolean,
  lastSeenAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `/conversations/{conversationId}`
```typescript
{
  type: "direct" | "group",
  name?: string,  // For groups
  participants: [uid1, uid2, ...],
  participantDetails: {
    uid1: { displayName, email },
    uid2: { displayName, email }
  },
  lastMessageAt: timestamp,
  lastMessage: string,
  lastRead: { uid1: messageId, uid2: messageId },
  createdAt: timestamp
}
```

#### `/conversations/{conversationId}/messages/{messageId}`
```typescript
{
  text: string,
  senderId: string,
  senderName: string,
  participants: [uid1, uid2, ...],  // Denormalized for security
  createdAt: timestamp
}
```

#### `/conversations/{conversationId}/typingUsers/{userId}`
```typescript
{
  uid: string,
  displayName: string,
  at: timestamp
}
```

---

## Common Firestore Queries

### Get User by Email
```typescript
const q = query(
  collection(db, 'users'),
  where('email', '==', email.toLowerCase()),
  limit(1)
);
const snapshot = await getDocs(q);
```

### Get User's Conversations
```typescript
const q = query(
  collection(db, 'conversations'),
  where('participants', 'array-contains', user.uid),
  orderBy('lastMessageAt', 'desc')
);
onSnapshot(q, (snapshot) => { /* ... */ });
```

### Get Last 100 Messages
```typescript
const q = query(
  collection(db, 'conversations', conversationId, 'messages'),
  orderBy('createdAt', 'asc'),
  limit(100)
);
onSnapshot(q, (snapshot) => { /* ... */ });
```

---

## State Management Strategy

### Zustand (Global State)
- ✅ Auth state (user, loading)
- ✅ Conversations list
- ✅ Online statuses

### Component State (Local)
- ✅ Messages in ChatScreen
- ✅ Form inputs
- ✅ Loading states
- ✅ Typing indicators

**Why Hybrid?** Better performance, cleaner separation, easier debugging.

---

## Optimistic Updates Pattern

```typescript
const sendMessage = async (text) => {
  const tempId = `temp_${Date.now()}`;
  const tempMessage = {
    id: tempId,
    text,
    senderId: user.uid,
    senderName: user.displayName,
    status: 'sending',
    createdAt: new Date(),
  };

  // 1. Add optimistic message
  setMessages([...messages, tempMessage]);

  try {
    // 2. Write to Firestore
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      text,
      senderId: user.uid,
      senderName: user.displayName,
      participants: conversation.participants,
      createdAt: serverTimestamp(),
    });

    // 3. Remove temp (real message appears via listener)
    setMessages(msgs => msgs.filter(m => m.id !== tempId));
  } catch (error) {
    // 4. Mark as failed
    setMessages(msgs => msgs.map(m => 
      m.id === tempId ? { ...m, status: 'failed' } : m
    ));
  }
};
```

---

## Offline Detection

```typescript
import NetInfo from '@react-native-community/netinfo';

const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setIsOnline(state.isConnected);
  });
  return unsubscribe;
}, []);
```

---

## Presence Tracking

```typescript
// In root layout (_layout.tsx)
useEffect(() => {
  if (!user) return;

  setUserOnline(user.uid);

  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      setUserOnline(user.uid);
    } else {
      setUserOffline(user.uid);
    }
  });

  return () => {
    subscription.remove();
    setUserOffline(user.uid);
  };
}, [user]);
```

---

## Typing Indicators

```typescript
let typingTimeout = null;

const handleTextChange = async (text) => {
  setText(text);

  // Set typing (debounced)
  if (!typingTimeout) {
    await setDoc(doc(db, 'conversations', conversationId, 'typingUsers', user.uid), {
      uid: user.uid,
      displayName: user.displayName,
      at: serverTimestamp(),
    });
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(async () => {
    await deleteDoc(doc(db, 'conversations', conversationId, 'typingUsers', user.uid));
    typingTimeout = null;
  }, 500);
};

const handleSend = async () => {
  // Clear typing immediately
  await deleteDoc(doc(db, 'conversations', conversationId, 'typingUsers', user.uid));
  clearTimeout(typingTimeout);
  typingTimeout = null;

  await sendMessage(text);
};
```

---

## Read Receipts (Last-Read Tracking)

```typescript
// Mark as read when messages load
useEffect(() => {
  if (messages.length === 0) return;

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.senderId !== user.uid) {
    updateDoc(doc(db, 'conversations', conversationId), {
      [`lastRead.${user.uid}`]: lastMessage.id,
    });
  }
}, [messages]);

// Display read status
const getReadStatus = (message, conversation) => {
  if (message.senderId !== user.uid) return null;

  const otherUserId = conversation.participants.find(uid => uid !== user.uid);
  const otherUserLastRead = conversation.lastRead?.[otherUserId];

  if (!otherUserLastRead) return '✓';

  const lastReadMsg = messages.find(m => m.id === otherUserLastRead);
  if (lastReadMsg && message.createdAt <= lastReadMsg.createdAt) {
    return '✓✓';
  }

  return '✓';
};
```

---

## Local Notifications

```typescript
// Setup (in root layout)
import * as Notifications from 'expo-notifications';

useEffect(() => {
  // Request permissions
  Notifications.requestPermissionsAsync();

  // Configure handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Listen for taps
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const { conversationId } = response.notification.request.content.data;
    router.push(`/chat/${conversationId}`);
  });

  return () => subscription.remove();
}, []);

// Trigger on new message
const handleIncomingMessage = async (message) => {
  if (message.senderId === user.uid) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: message.senderName,
      body: message.text,
      sound: 'default',
      data: { conversationId },
    },
    trigger: { seconds: 1 },
  });
};
```

---

## Navigation Patterns

### Expo Router

```typescript
// Navigate programmatically
import { useRouter } from 'expo-router';
const router = useRouter();

router.push('/chat/123');           // Navigate to chat
router.replace('/(tabs)');          // Replace (no back button)
router.back();                       // Go back

// Get dynamic params
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams();  // In chat/[id].tsx

// Declarative navigation
import { Link } from 'expo-router';
<Link href="/chat/123">Open Chat</Link>
```

---

## Testing Commands

```bash
# Start development server
npx expo start

# Android emulator
npx expo start --android

# iOS simulator (macOS)
npx expo start --ios

# Clear cache
npx expo start --clear

# Check for issues
npm run lint
```

---

## Common Issues & Solutions

### Issue: Firestore listeners not cleaning up
**Solution:** Always return unsubscribe function in useEffect

### Issue: Messages not in correct order
**Solution:** Use `serverTimestamp()`, not `new Date()`

### Issue: Can't find user by email
**Solution:** Make sure email is lowercase and trimmed

### Issue: Emulator crashes
**Solution:** Restart emulator every 2-3 hours

### Issue: Hot reload broken
**Solution:** `npx expo start --clear`

### Issue: Offline messages not syncing
**Solution:** Check NetInfo, verify Firestore offline persistence enabled

---

## Performance Tips

1. **Use `limit()` on queries** - Don't load all messages at once
2. **Debounce typing indicators** - 500ms is good balance
3. **Unsubscribe from listeners** - Prevent memory leaks
4. **Use FlatList for messages** - Better than ScrollView for long lists
5. **Optimize re-renders** - Use component state for screen-specific data

---

## MVP Feature Priority

### Must Have (Blocking):
1. ✅ Auth (register, login, persist)
2. ✅ User discovery (email lookup)
3. ✅ One-on-one chat
4. ✅ Group chat
5. ✅ Real-time sync
6. ✅ Optimistic updates
7. ✅ Message persistence

### Should Have (Important):
8. ✅ Typing indicators
9. ✅ Online/offline status
10. ✅ Read receipts
11. ✅ Network detection
12. ✅ Notifications

### Nice to Have (Skip if behind):
13. UI polish
14. Animations
15. Empty states

---

## Environment Variables Template

```env
# .env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == uid;
      allow update: if request.auth.uid == uid;
    }
    
    match /conversations/{conversationId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      allow update: if request.auth.uid in resource.data.participants;
    }
    
    match /conversations/{conversationId}/messages/{messageId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && 
                      request.auth.uid in request.resource.data.participants;
    }
    
    match /conversations/{conversationId}/typingUsers/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

---

## Package.json Dependencies

```json
{
  "dependencies": {
    "expo": "~54.0.0",
    "expo-router": "~4.0.0",
    "expo-notifications": "~0.30.0",
    "react": "19.1.0",
    "react-native": "0.81.0",
    "firebase": "^10.0.0",
    "zustand": "^5.0.0",
    "@react-native-async-storage/async-storage": "~2.1.0",
    "@react-native-community/netinfo": "~12.0.0",
    "react-native-paper": "^5.12.0",
    "@expo/vector-icons": "^14.0.0"
  }
}
```

---

## Git Workflow

```bash
# .gitignore additions
.env
node_modules/
.expo/
dist/

# Commit messages
git commit -m "feat: add authentication"
git commit -m "feat: implement chat screen"
git commit -m "fix: typing indicator cleanup"
git commit -m "refactor: optimize message list"
```

---

**📌 Keep this reference open while coding. Focus on speed and working features!**

