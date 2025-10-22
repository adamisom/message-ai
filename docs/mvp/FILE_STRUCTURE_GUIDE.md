# MessageAI - File Structure & Implementation Guide

## Quick Reference: File Dependencies

### File Creation Order (Critical Path)

```
1. Configuration Files
   → firebase.config.ts
   → .env
   → utils/constants.ts
   → utils/validators.ts
   → utils/timeFormat.ts

2. Services Layer
   → services/authService.ts
   → services/firestoreService.ts
   → services/notificationService.ts
   → services/presenceService.ts

3. State Management
   → store/authStore.ts
   → store/chatStore.ts

4. UI Components (Bottom-Up)
   → components/MessageBubble.tsx
   → components/MessageInput.tsx
   → components/MessageList.tsx
   → components/ConversationItem.tsx
   → components/TypingIndicator.tsx
   → components/UserStatusBadge.tsx
   → components/OfflineBanner.tsx

5. Screens (Auth First)
   → app/(auth)/_layout.tsx
   → app/(auth)/login.tsx
   → app/(auth)/register.tsx
   → app/_layout.tsx (UPDATE with auth logic)
   → app/index.tsx (UPDATE with redirect logic)

6. Screens (Main App)
   → app/(tabs)/_layout.tsx
   → app/(tabs)/index.tsx (Conversations List)
   → app/(tabs)/new-chat.tsx
   → app/chat/[id].tsx (Chat Screen)
```

---

## Detailed File Specifications

### Configuration Files

#### `firebase.config.ts`
**Purpose:** Initialize Firebase SDK with React Native persistence  
**Dependencies:** `.env`, `@react-native-async-storage/async-storage`  
**Exports:** `auth`, `db` (Firestore instance)

**⚠️ IMPORTANT:** Must be TypeScript (.ts) for proper typing. React Native persistence requires special import handling.

```typescript
import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import getReactNativePersistence dynamically to avoid TS issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth');

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence for React Native
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // If auth already initialized, get existing instance
  auth = getAuth(app);
}

// Initialize Firestore with cache settings for React Native
let db: Firestore;
try {
  db = initializeFirestore(app, {
    cacheSizeBytes: 40 * 1024 * 1024, // 40MB cache (recommended for mobile)
  });
} catch (error) {
  // If firestore already initialized, get existing instance
  db = getFirestore(app);
}

export { auth, db };
```

**Why this setup:**
- `initializeAuth` with `getReactNativePersistence(AsyncStorage)` enables session persistence across app restarts
- `initializeFirestore` with cache settings enables offline functionality
- Try/catch handles hot reload re-initialization errors
- `require()` for `getReactNativePersistence` avoids TypeScript module resolution issues

---

#### `.env`
**Purpose:** Store Firebase credentials (gitignored)  
**Template:**

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

### Utility Files

#### `utils/constants.ts`
**Purpose:** App-wide constants  
**Exports:** Message status, limits, timeouts

```typescript
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
  QUEUED: 'queued',
} as const;

export const MESSAGE_LIMIT = 100;
export const TYPING_DEBOUNCE_MS = 500;
export const MESSAGE_TIMEOUT_MS = 10000;

export const CONVERSATION_TYPE = {
  DIRECT: 'direct',
  GROUP: 'group',
} as const;
```

---

#### `utils/validators.ts`
**Purpose:** Input validation helpers  
**Exports:** `validateEmail()`, `validatePassword()`, `validateDisplayName()`

```typescript
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateDisplayName = (name: string): boolean => {
  return name.trim().length > 0;
};
```

---

#### `utils/timeFormat.ts`
**Purpose:** Timestamp formatting  
**Exports:** `formatTimestamp()`, `formatLastSeen()`, `formatMessageTime()`

```typescript
export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export const formatMessageTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatLastSeen = (date: Date): string => {
  // Similar to formatTimestamp but with "Last seen" prefix
  return `Last seen ${formatTimestamp(date)}`;
};
```

---

### Services Layer

#### `services/authService.ts`
**Purpose:** Authentication logic  
**Dependencies:** `firebase.config.js`, `store/authStore.ts`  
**Exports:** `registerUser()`, `loginUser()`, `logoutUser()`, `createUserProfile()`

```typescript
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.config';

export const registerUser = async (email: string, password: string, displayName: string) => {
  // 1. Create Firebase Auth account
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  // 2. Create Firestore user profile
  await createUserProfile(uid, email, displayName);

  return { uid, email, displayName };
};

export const createUserProfile = async (uid: string, email: string, displayName: string) => {
  await setDoc(doc(db, 'users', uid), {
    email: email.toLowerCase(),
    displayName,
    isOnline: true,
    lastSeenAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  // Fetch user profile
  const userDoc = await getDoc(doc(db, 'users', uid));
  return { uid, ...userDoc.data() };
};

export const logoutUser = async () => {
  await signOut(auth);
};
```

---

#### `services/firestoreService.ts`
**Purpose:** Firestore queries and mutations  
**Dependencies:** `firebase.config.js`  
**Exports:** `findUserByEmail()`, `createOrOpenConversation()`, `createGroupConversation()`, `sendMessage()`

```typescript
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '../firebase.config';

export const findUserByEmail = async (email: string) => {
  const q = query(
    collection(db, 'users'),
    where('email', '==', email.toLowerCase().trim()),
    limit(1)
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  const userDoc = snapshot.docs[0];
  return { uid: userDoc.id, ...userDoc.data() };
};

export const createOrOpenConversation = async (otherUser: any, currentUser: any) => {
  // Use sorted UIDs for consistent conversation ID
  const conversationId = [currentUser.uid, otherUser.uid].sort().join('_');
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationDoc = await getDoc(conversationRef);

  if (!conversationDoc.exists()) {
    await setDoc(conversationRef, {
      type: 'direct',
      participants: [currentUser.uid, otherUser.uid],
      participantDetails: {
        [currentUser.uid]: { displayName: currentUser.displayName, email: currentUser.email },
        [otherUser.uid]: { displayName: otherUser.displayName, email: otherUser.email },
      },
      createdAt: serverTimestamp(),
      lastMessageAt: null,
      lastMessage: null,
      lastRead: {},
    });
  }

  return conversationId;
};

export const createGroupConversation = async (participants: any[], currentUser: any) => {
  const participantIds = [currentUser.uid, ...participants.map(p => p.uid)];
  const participantDetails: any = {
    [currentUser.uid]: { displayName: currentUser.displayName, email: currentUser.email },
  };

  participants.forEach(p => {
    participantDetails[p.uid] = { displayName: p.displayName, email: p.email };
  });

  const conversationRef = await addDoc(collection(db, 'conversations'), {
    type: 'group',
    name: `Group with ${participantIds.length} members`,
    participants: participantIds,
    participantDetails,
    creatorId: currentUser.uid,
    createdAt: serverTimestamp(),
    lastMessageAt: null,
    lastMessage: null,
    lastRead: {},
  });

  return conversationRef.id;
};

export const sendMessage = async (
  conversationId: string,
  text: string,
  senderId: string,
  senderName: string,
  participants: string[]
) => {
  const messageRef = await addDoc(
    collection(db, 'conversations', conversationId, 'messages'),
    {
      text,
      senderId,
      senderName,
      participants,
      createdAt: serverTimestamp(),
    }
  );

  // Update conversation's lastMessage
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: text.substring(0, 100),
    lastMessageAt: serverTimestamp(),
  });

  return messageRef.id;
};
```

---

#### `services/notificationService.ts`
**Purpose:** Local notification handling  
**Dependencies:** `expo-notifications`  
**Exports:** `requestPermissions()`, `scheduleNotification()`, `setupListener()`

```typescript
import * as Notifications from 'expo-notifications';

export const requestPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleNotification = async (
  title: string,
  body: string,
  data: any = {}
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data,
    },
    trigger: { seconds: 1 },
  });
};

export const setupListener = (onNotificationPress: (conversationId: string) => void) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const { conversationId } = response.notification.request.content.data;
    if (conversationId) {
      onNotificationPress(conversationId);
    }
  });
  
  return subscription;
};
```

---

#### `services/presenceService.ts`
**Purpose:** User online/offline tracking  
**Dependencies:** `firebase.config.js`  
**Exports:** `setUserOnline()`, `setUserOffline()`, `listenToUserStatus()`

```typescript
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.config';

export const setUserOnline = async (uid: string) => {
  await updateDoc(doc(db, 'users', uid), {
    isOnline: true,
    lastSeenAt: serverTimestamp(),
  });
};

export const setUserOffline = async (uid: string) => {
  await updateDoc(doc(db, 'users', uid), {
    isOnline: false,
    lastSeenAt: serverTimestamp(),
  });
};

export const listenToUserStatus = (uid: string, callback: (status: any) => void) => {
  return onSnapshot(doc(db, 'users', uid), (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback(docSnapshot.data());
    }
  });
};
```

---

### State Management

#### `store/authStore.ts`
**Purpose:** Global auth state  
**Dependencies:** `zustand`, `@react-native-async-storage/async-storage`  
**State:** `user`, `loading`  
**Actions:** `setUser()`, `logout()`, `restoreSession()`

```typescript
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  user: any | null;
  loading: boolean;
  setUser: (user: any) => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: async (user) => {
    set({ user, loading: false });
    await AsyncStorage.setItem('user', JSON.stringify(user));
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
    } catch (error) {
      console.error('Restore session error:', error);
      set({ loading: false });
    }
  },
}));
```

---

#### `store/chatStore.ts`
**Purpose:** Global chat state  
**Dependencies:** `zustand`  
**State:** `conversations`, `onlineStatuses`  
**Actions:** `setConversations()`, `addConversation()`, `updateOnlineStatus()`

```typescript
import { create } from 'zustand';

interface ChatState {
  conversations: any[];
  onlineStatuses: Record<string, any>;
  setConversations: (conversations: any[]) => void;
  addConversation: (conversation: any) => void;
  updateOnlineStatus: (uid: string, status: any) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  onlineStatuses: {},

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateOnlineStatus: (uid, status) =>
    set((state) => ({
      onlineStatuses: {
        ...state.onlineStatuses,
        [uid]: status,
      },
    })),
}));
```

---

### UI Components

#### `components/MessageBubble.tsx`
**Purpose:** Individual message display  
**Props:** `message`, `isOwnMessage`, `showSenderName` (for groups)  
**Variants:** Sent (right, blue) vs Received (left, gray)

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { formatMessageTime } from '../utils/timeFormat';

interface MessageBubbleProps {
  message: {
    text: string;
    createdAt: any;
    senderName: string;
    status?: string;
  };
  isOwnMessage: boolean;
  showSenderName?: boolean;
}

export default function MessageBubble({ message, isOwnMessage, showSenderName }: MessageBubbleProps) {
  return (
    <View style={[styles.container, isOwnMessage ? styles.sent : styles.received]}>
      {showSenderName && !isOwnMessage && (
        <Text style={styles.senderName}>{message.senderName}</Text>
      )}
      <View style={[styles.bubble, isOwnMessage ? styles.sentBubble : styles.receivedBubble]}>
        <Text style={styles.text}>{message.text}</Text>
        <Text style={styles.time}>
          {message.createdAt ? formatMessageTime(message.createdAt.toDate()) : ''}
        </Text>
      </View>
      {isOwnMessage && message.status && (
        <Text style={styles.status}>{message.status}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ... styles
});
```

---

#### `components/MessageList.tsx`
**Purpose:** FlatList of messages  
**Props:** `messages`, `currentUserId`, `conversationType`  
**Features:** Inverted list, auto-scroll, optimized rendering

```typescript
import { FlatList, View, StyleSheet } from 'react-native';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: any[];
  currentUserId: string;
  conversationType: 'direct' | 'group';
}

export default function MessageList({ messages, currentUserId, conversationType }: MessageListProps) {
  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MessageBubble
          message={item}
          isOwnMessage={item.senderId === currentUserId}
          showSenderName={conversationType === 'group'}
        />
      )}
      inverted={false}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
```

---

#### `components/MessageInput.tsx`
**Purpose:** Text input + send button  
**Props:** `onSend`, `onTyping`  
**Features:** Auto-grow, disabled when empty

```typescript
import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
}

export default function MessageInput({ onSend, onTyping }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleChange = (value: string) => {
    setText(value);
    onTyping();
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={handleChange}
        placeholder="Type a message..."
        multiline
      />
      <TouchableOpacity
        style={[styles.sendButton, !text.trim() && styles.disabled]}
        onPress={handleSend}
        disabled={!text.trim()}
      >
        <Ionicons name="send" size={24} color={text.trim() ? '#007AFF' : '#999'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... styles
});
```

---

#### `components/ConversationItem.tsx`
**Purpose:** Single conversation in list  
**Props:** `conversation`, `onPress`  
**Display:** Name, last message, timestamp, online status

```typescript
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { formatTimestamp } from '../utils/timeFormat';
import UserStatusBadge from './UserStatusBadge';

interface ConversationItemProps {
  conversation: any;
  currentUserId: string;
  onPress: () => void;
}

export default function ConversationItem({ conversation, currentUserId, onPress }: ConversationItemProps) {
  const getConversationName = () => {
    if (conversation.type === 'group') {
      return conversation.name;
    }
    // For direct, get other user's name
    const otherUserId = conversation.participants.find((id: string) => id !== currentUserId);
    return conversation.participantDetails[otherUserId]?.displayName || 'Unknown';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{getConversationName()}</Text>
          {conversation.lastMessageAt && (
            <Text style={styles.time}>
              {formatTimestamp(conversation.lastMessageAt.toDate())}
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

const styles = StyleSheet.create({
  // ... styles
});
```

---

#### `components/TypingIndicator.tsx`
**Purpose:** Show "User is typing..."  
**Props:** `typingUsers`

```typescript
import { View, Text, StyleSheet } from 'react-native';

interface TypingIndicatorProps {
  typingUsers: any[];
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const message = typingUsers.length === 1
    ? `${typingUsers[0].displayName} is typing...`
    : `${typingUsers.length} people are typing...`;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: '#f0f0f0',
  },
  text: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
```

---

#### `components/UserStatusBadge.tsx`
**Purpose:** Online/offline indicator  
**Props:** `isOnline`, `lastSeenAt`

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { formatLastSeen } from '../utils/timeFormat';

interface UserStatusBadgeProps {
  isOnline: boolean;
  lastSeenAt?: any;
}

export default function UserStatusBadge({ isOnline, lastSeenAt }: UserStatusBadgeProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, isOnline ? styles.online : styles.offline]} />
      <Text style={styles.text}>
        {isOnline ? 'Online' : lastSeenAt ? formatLastSeen(lastSeenAt.toDate()) : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#999',
  },
  text: {
    fontSize: 12,
    color: '#666',
  },
});
```

---

#### `components/OfflineBanner.tsx`
**Purpose:** Show when device is offline  
**Props:** None (uses NetInfo)

```typescript
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        You're offline. Messages will send when reconnected.
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
    color: 'white',
    fontSize: 12,
  },
});
```

---

### Screens

#### `app/_layout.tsx` (ROOT LAYOUT - UPDATE)
**Purpose:** Root navigation, auth check, presence tracking, notification setup  
**Features:** Restore session, presence listener, notification handler

```typescript
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/authStore';
import { setUserOnline, setUserOffline } from '../services/presenceService';
import { requestPermissions, setupListener } from '../services/notificationService';

export default function RootLayout() {
  const { user, loading, restoreSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Setup presence tracking
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

  useEffect(() => {
    // Setup notifications
    requestPermissions();

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    const listener = setupListener((conversationId) => {
      router.push(`/chat/${conversationId}`);
    });

    return () => listener.remove();
  }, []);

  if (loading) {
    return null; // Or loading screen
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
    </Stack>
  );
}
```

---

#### `app/index.tsx` (LANDING - UPDATE)
**Purpose:** Redirect based on auth state

```typescript
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading]);

  return null;
}
```

---

#### `app/(auth)/_layout.tsx` (ADD)
**Purpose:** Auth screens layout

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
    </Stack>
  );
}
```

---

#### `app/(auth)/login.tsx` (ADD)
**Purpose:** Login screen  
**Features:** Email + password form, navigation to register, error handling

```typescript
import { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { loginUser } from '../../services/authService';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const user = await loginUser(email, password);
      setUser(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={loading ? 'Loading...' : 'Login'} onPress={handleLogin} disabled={loading} />
      <Button title="Don't have an account? Register" onPress={() => router.push('/(auth)/register')} />
    </View>
  );
}

const styles = StyleSheet.create({
  // ... styles
});
```

---

#### `app/(auth)/register.tsx` (ADD)
**Purpose:** Registration screen  
**Features:** Email + password + display name form, validation, error handling

```typescript
import { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { registerUser } from '../../services/authService';
import { validateEmail, validatePassword, validateDisplayName } from '../../utils/validators';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuthStore();
  const router = useRouter();

  const handleRegister = async () => {
    setError('');

    // Validation
    if (!validateEmail(email)) {
      setError('Invalid email format');
      return;
    }
    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!validateDisplayName(displayName)) {
      setError('Display name is required');
      return;
    }

    setLoading(true);

    try {
      const user = await registerUser(email, password, displayName);
      setUser(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={loading ? 'Loading...' : 'Register'} onPress={handleRegister} disabled={loading} />
      <Button title="Already have an account? Login" onPress={() => router.push('/(auth)/login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  // ... styles
});
```

---

#### `app/(tabs)/_layout.tsx` (ADD)
**Purpose:** Tabs navigator for main app

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="new-chat"
        options={{
          title: 'New Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

---

#### `app/(tabs)/index.tsx` (ADD)
**Purpose:** Conversations list screen  
**Features:** Real-time conversation list, navigation to chats, logout button

```typescript
import { useEffect, useState } from 'react';
import { View, FlatList, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { logoutUser } from '../../services/authService';
import ConversationItem from '../../components/ConversationItem';

export default function ConversationsList() {
  const { user, logout } = useAuthStore();
  const { conversations, setConversations } = useChatStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setConversations(convos);
    });

    return unsubscribe;
  }, [user]);

  const handleLogout = async () => {
    await logoutUser();
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <Button title="Logout" onPress={handleLogout} />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            currentUserId={user.uid}
            onPress={() => router.push(`/chat/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

---

#### `app/(tabs)/new-chat.tsx` (ADD)
**Purpose:** New chat creation screen  
**Features:** Email lookup, group chat creation, validation

```typescript
import { useState } from 'react';
import { View, TextInput, Button, Text, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { findUserByEmail, createOrOpenConversation, createGroupConversation } from '../../services/firestoreService';
import { validateEmail } from '../../utils/validators';

export default function NewChat() {
  const [email, setEmail] = useState('');
  const [validUsers, setValidUsers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isGroupMode, setIsGroupMode] = useState(false);

  const { user } = useAuthStore();
  const router = useRouter();

  const handleAddUser = async () => {
    setError('');

    if (!validateEmail(email)) {
      setError('Invalid email format');
      return;
    }

    try {
      const foundUser = await findUserByEmail(email);
      if (!foundUser) {
        setError('No user found with that email');
        return;
      }

      if (foundUser.uid === user.uid) {
        setError("You can't add yourself");
        return;
      }

      if (validUsers.find(u => u.uid === foundUser.uid)) {
        setError('User already added');
        return;
      }

      setValidUsers([...validUsers, foundUser]);
      setEmail('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateDirectChat = async () => {
    if (validUsers.length === 0) {
      setError('Please add at least one user');
      return;
    }

    try {
      const conversationId = await createOrOpenConversation(validUsers[0], user);
      router.push(`/chat/${conversationId}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateGroupChat = async () => {
    if (validUsers.length < 2) {
      setError('Need at least 2 users for a group chat');
      return;
    }

    try {
      const conversationId = await createGroupConversation(validUsers, user);
      router.push(`/chat/${conversationId}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        title={isGroupMode ? 'Switch to Direct Chat' : 'Switch to Group Chat'}
        onPress={() => setIsGroupMode(!isGroupMode)}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Enter email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <Button title={isGroupMode ? 'Add User' : 'Find User'} onPress={handleAddUser} />
      
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {validUsers.length > 0 && (
        <FlatList
          data={validUsers}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <View style={styles.userItem}>
              <Text>{item.displayName} ({item.email})</Text>
            </View>
          )}
        />
      )}

      {validUsers.length > 0 && (
        <Button
          title={isGroupMode ? 'Create Group' : 'Create Chat'}
          onPress={isGroupMode ? handleCreateGroupChat : handleCreateDirectChat}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ... styles
});
```

---

#### `app/chat/[id].tsx` (ADD)
**Purpose:** Chat screen  
**Features:** Real-time messages, send, typing indicators, read receipts, online status

```typescript
import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  updateDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { useAuthStore } from '../../store/authStore';
import { sendMessage } from '../../services/firestoreService';
import MessageList from '../../components/MessageList';
import MessageInput from '../../components/MessageInput';
import TypingIndicator from '../../components/TypingIndicator';
import OfflineBanner from '../../components/OfflineBanner';

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams();
  const { user } = useAuthStore();

  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);

  const typingTimeoutRef = useRef<any>(null);

  // Listen to conversation
  useEffect(() => {
    if (!conversationId || typeof conversationId !== 'string') return;

    const unsubscribe = onSnapshot(doc(db, 'conversations', conversationId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setConversation({ id: docSnapshot.id, ...docSnapshot.data() });
      }
    });

    return unsubscribe;
  }, [conversationId]);

  // Listen to messages
  useEffect(() => {
    if (!conversationId || typeof conversationId !== 'string') return;

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      // Mark as read
      if (msgs.length > 0) {
        const lastMessage = msgs[msgs.length - 1];
        if (lastMessage.senderId !== user.uid) {
          updateDoc(doc(db, 'conversations', conversationId), {
            [`lastRead.${user.uid}`]: lastMessage.id,
          });
        }
      }
    });

    return unsubscribe;
  }, [conversationId, user]);

  // Listen to typing users
  useEffect(() => {
    if (!conversationId || typeof conversationId !== 'string') return;

    const unsubscribe = onSnapshot(
      collection(db, 'conversations', conversationId, 'typingUsers'),
      (snapshot) => {
        const typing = snapshot.docs
          .map(doc => doc.data())
          .filter(u => u.uid !== user.uid);
        setTypingUsers(typing);
      }
    );

    return unsubscribe;
  }, [conversationId, user]);

  const handleSend = async (text: string) => {
    if (!conversation || typeof conversationId !== 'string') return;

    // Clear typing indicator
    await deleteDoc(doc(db, 'conversations', conversationId, 'typingUsers', user.uid));
    clearTimeout(typingTimeoutRef.current);

    // Send message
    await sendMessage(
      conversationId,
      text,
      user.uid,
      user.displayName,
      conversation.participants
    );
  };

  const handleTyping = async () => {
    if (typeof conversationId !== 'string') return;

    // Set typing indicator
    if (!typingTimeoutRef.current) {
      await setDoc(doc(db, 'conversations', conversationId, 'typingUsers', user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        at: serverTimestamp(),
      });
    }

    // Clear previous timeout
    clearTimeout(typingTimeoutRef.current);

    // Auto-clear after 500ms
    typingTimeoutRef.current = setTimeout(async () => {
      await deleteDoc(doc(db, 'conversations', conversationId, 'typingUsers', user.uid));
      typingTimeoutRef.current = null;
    }, 500);
  };

  if (!conversation) return null;

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <MessageList
        messages={messages}
        currentUserId={user.uid}
        conversationType={conversation.type}
      />
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput onSend={handleSend} onTyping={handleTyping} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

---

## Testing Checklist by File

### After Each File is Created:
- [ ] No TypeScript errors
- [ ] Imports resolve correctly
- [ ] Component renders without crashes
- [ ] Basic functionality works

### Integration Testing:
- [ ] Auth flow works end-to-end
- [ ] Conversations list updates in real-time
- [ ] Messages send and receive
- [ ] Typing indicators appear
- [ ] Offline detection works

---

**Use this guide as reference when implementing each file. Start from configuration and work your way up to screens.**

