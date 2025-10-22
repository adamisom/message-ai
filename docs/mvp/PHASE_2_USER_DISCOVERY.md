# Phase 2: User Discovery & Conversation Creation

**Time:** 2-3 hours | **Goal:** Email-based user discovery, conversation creation (direct/group), real-time conversations list

**Prerequisites:** Phase 0 & 1 complete (Firebase + auth working), 2+ test users registered

---

## Objectives

- ✅ Firestore service (user lookup, conversation creation)
- ✅ Chat store (conversations state)
- ✅ Tab navigation (Chats + New Chat)
- ✅ Email-based user discovery (direct & group)
- ✅ Real-time conversations list
- ✅ Navigation to chats

**Reference:** mvp-prd-plus.md Section 3.2 for complete requirements

---

## Files to Create

```
services/firestoreService.ts    # User lookup, conversation CRUD
store/chatStore.ts              # Global conversations state
app/(tabs)/_layout.tsx          # Tab navigator
app/(tabs)/index.tsx            # Conversations list
app/(tabs)/new-chat.tsx         # New chat screen
components/ConversationItem.tsx # List item component
```

---

## Task 2.1: Firestore Service

**Create file:**
```bash
touch services/firestoreService.ts
```

**Implementation:**
```typescript
import { 
  collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, updateDoc,
  serverTimestamp, limit
} from 'firebase/firestore';
import { db } from '../firebase.config';

interface User {
  uid: string;
  email: string;
  displayName: string;
  isOnline?: boolean;
  lastSeenAt?: any;
}

interface ParticipantDetail {
  displayName: string;
  email: string;
}

// Find user by email (normalized)
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const normalizedEmail = email.toLowerCase().trim();
  const q = query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  const userDoc = snapshot.docs[0];
  return { uid: userDoc.id, ...userDoc.data() } as User;
};

// Create or open 1-on-1 conversation (sorted UIDs for consistency)
export const createOrOpenConversation = async (
  otherUser: User, 
  currentUser: User
): Promise<string> => {
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

// Create group conversation (2+ other participants)
export const createGroupConversation = async (
  participants: User[], 
  currentUser: User
): Promise<string> => {
  if (participants.length < 2) {
    throw new Error('Group chat requires at least 2 other participants');
  }

  const participantIds = [currentUser.uid, ...participants.map(p => p.uid)];
  const participantDetails: Record<string, ParticipantDetail> = {
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

// Send message (for Phase 3, included for completeness)
export const sendMessage = async (
  conversationId: string,
  text: string,
  senderId: string,
  senderName: string,
  participants: string[]
): Promise<string> => {
  const messageRef = await addDoc(
    collection(db, 'conversations', conversationId, 'messages'),
    {
      text,
      senderId,
      senderName,
      participants, // Denormalized for security rules
      createdAt: serverTimestamp(),
    }
  );

  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: text.substring(0, 100),
    lastMessageAt: serverTimestamp(),
  });

  return messageRef.id;
};
```

**Key points:**
- Sorted UIDs ensure same ID regardless of who initiates
- serverTimestamp() is CRITICAL (never use client Date())
- Type-safe interfaces (no `any`)

✅ **Checkpoint:** Compiles with no errors

---

## Task 2.2: Chat Store

**Create file:**
```bash
touch store/chatStore.ts
```

**Implementation:**
```typescript
import { create } from 'zustand';

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  participantDetails: Record<string, { displayName: string; email: string }>;
  lastMessageAt: any;
  lastMessage: string | null;
  lastRead?: Record<string, string>;
  createdAt: any;
}

interface ChatState {
  conversations: Conversation[];
  onlineStatuses: Record<string, { isOnline: boolean; lastSeenAt: any }>;
  
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateOnlineStatus: (uid: string, status: any) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  onlineStatuses: {},

  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) => set((state) => ({
    conversations: [conversation, ...state.conversations],
  })),
  updateOnlineStatus: (uid, status) => set((state) => ({
    onlineStatuses: { ...state.onlineStatuses, [uid]: status },
  })),
}));
```

✅ **Checkpoint:** Store compiles and can be imported

---

## Task 2.3: Tab Navigation

**Create tabs:**
```bash
mkdir -p app/\(tabs\)
touch app/\(tabs\)/_layout.tsx
```

**Implementation (`app/(tabs)/_layout.tsx`):**
```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true, tabBarActiveTintColor: '#007AFF' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="new-chat"
        options={{
          title: 'New Chat',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**⚠️ Update `app/_layout.tsx` (ADD ONLY ONE LINE):**
```typescript
// Keep all existing Phase 1 code (presence, notifications, session)
// ADD this line to your Stack:
<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
```

✅ **Checkpoint:** Two tabs appear at bottom

---

## Task 2.4: Conversation Item Component

**Create file:**
```bash
touch components/ConversationItem.tsx
```

**Implementation:**
```typescript
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { formatConversationTime } from '../utils/timeFormat';

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  participantDetails: Record<string, { displayName: string; email: string }>;
  lastMessageAt: any;
  lastMessage: string | null;
}

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: () => void;
}

export default function ConversationItem({ conversation, currentUserId, onPress }: ConversationItemProps) {
  const getConversationName = (): string => {
    if (conversation.type === 'group') {
      return conversation.name || 'Unnamed Group';
    }
    const otherUserId = conversation.participants.find((id: string) => id !== currentUserId);
    if (!otherUserId) return 'Unknown';
    const otherUser = conversation.participantDetails[otherUserId];
    return otherUser?.displayName || 'Unknown User';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{getConversationName()}</Text>
          {conversation.lastMessageAt && (
            <Text style={styles.time}>{formatConversationTime(conversation.lastMessageAt.toDate())}</Text>
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
  container: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  content: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '600', color: '#000', flex: 1, marginRight: 8 },
  time: { fontSize: 12, color: '#666' },
  lastMessage: { fontSize: 14, color: '#666' },
});
```

✅ **Checkpoint:** Component renders without errors

---

## Task 2.5: Conversations List Screen

**Create file:**
```bash
touch app/\(tabs\)/index.tsx
```

**Implementation:**
```typescript
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { useAuthStore } from '../../store/authStore';
import ConversationItem from '../../components/ConversationItem';

export default function ConversationsList() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Manual sort: new conversations (null lastMessageAt) to top
      const sorted = convos.sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0;
        if (!a.lastMessageAt) return -1; // a to top
        if (!b.lastMessageAt) return 1;  // b to top
        return b.lastMessageAt.toMillis() - a.lastMessageAt.toMillis();
      });
      
      setConversations(sorted);
      setLoading(false);
    }, (error) => {
      console.error('Conversations listener error:', error);
      if (error.message.includes('index')) {
        console.error('⚠️ FIRESTORE INDEX REQUIRED. Click the link in the error above to create it.');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  if (loading) {
    return <View style={styles.centered}><Text>Loading conversations...</Text></View>;
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No conversations yet</Text>
        <Text style={styles.emptySubtext}>Tap "New Chat" to start messaging</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            currentUserId={user!.uid}
            onPress={() => router.push(`/chat/${item.id}`)}
          />
        )}
      />
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999' },
  logoutButton: { position: 'absolute', top: 10, right: 16, padding: 8 },
  logoutText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
});
```

**⚠️ CRITICAL:** Firestore query will fail without a composite index. When you first run this:
1. Console will show error with a clickable link
2. Click link → Firebase creates index automatically
3. Wait 1-2 minutes for index to build
4. Reload app

✅ **Checkpoint:** Conversations list displays (empty state if no conversations)

---

## Task 2.6: New Chat Screen

**Create file:**
```bash
touch app/\(tabs\)/new-chat.tsx
```

**Implementation:**
```typescript
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { findUserByEmail, createOrOpenConversation, createGroupConversation } from '../../services/firestoreService';

interface ValidUser {
  uid: string;
  email: string;
  displayName: string;
}

export default function NewChat() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validUsers, setValidUsers] = useState<ValidUser[]>([]);

  const handleModeToggle = () => {
    if (validUsers.length > 0) {
      Alert.alert(
        'Clear Users?',
        'Switching modes will clear your current list of users. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear', style: 'destructive', onPress: () => { setValidUsers([]); setMode(mode === 'direct' ? 'group' : 'direct'); } }
        ]
      );
    } else {
      setMode(mode === 'direct' ? 'group' : 'direct');
    }
  };

  const handleFindOrAddUser = async () => {
    if (!email.trim() || !user) return;
    
    setLoading(true);
    setError('');

    try {
      const foundUser = await findUserByEmail(email.trim());
      
      if (!foundUser) {
        setError(`No user found with email: ${email.trim()}`);
        setLoading(false);
        return;
      }

      if (foundUser.uid === user.uid) {
        setError('You cannot add yourself');
        setLoading(false);
        return;
      }

      if (mode === 'direct') {
        // Direct chat - create immediately
        const conversationId = await createOrOpenConversation(foundUser, user);
        router.push(`/chat/${conversationId}`);
      } else {
        // Group chat - add to list
        if (validUsers.find(u => u.uid === foundUser.uid)) {
          setError('User already added');
          setLoading(false);
          return;
        }
        setValidUsers([...validUsers, foundUser]);
        setEmail('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to find user');
    }
    
    setLoading(false);
  };

  const handleCreateGroup = async () => {
    if (!user || validUsers.length < 2) {
      Alert.alert('Error', 'Group chat requires at least 2 other participants');
      return;
    }

    setLoading(true);
    try {
      const conversationId = await createGroupConversation(validUsers, user);
      router.push(`/chat/${conversationId}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create group');
    }
    setLoading(false);
  };

  const removeUser = (uid: string) => {
    setValidUsers(validUsers.filter(u => u.uid !== uid));
  };

  return (
    <View style={styles.container}>
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'direct' && styles.modeButtonActive]}
          onPress={handleModeToggle}
        >
          <Text style={[styles.modeText, mode === 'direct' && styles.modeTextActive]}>Direct Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'group' && styles.modeButtonActive]}
          onPress={handleModeToggle}
        >
          <Text style={[styles.modeText, mode === 'group' && styles.modeTextActive]}>Group Chat</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleFindOrAddUser}
          disabled={loading || !email.trim()}
        >
          <Text style={styles.buttonText}>{mode === 'direct' ? 'Find User' : 'Add User'}</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {mode === 'group' && validUsers.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Valid Users ({validUsers.length})</Text>
          <FlatList
            data={validUsers}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <View style={styles.userItem}>
                <View style={styles.userInfo}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.userName}>{item.displayName}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <TouchableOpacity onPress={() => removeUser(item.uid)}>
                  <Ionicons name="close-circle" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            )}
          />
          <TouchableOpacity
            style={[styles.createButton, validUsers.length < 2 && styles.buttonDisabled]}
            onPress={handleCreateGroup}
            disabled={validUsers.length < 2}
          >
            <Text style={styles.createButtonText}>
              Create Group ({validUsers.length + 1} members)
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  modeToggle: { flexDirection: 'row', marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#007AFF' },
  modeButton: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  modeButtonActive: { backgroundColor: '#007AFF' },
  modeText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  modeTextActive: { color: '#fff' },
  inputContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14 },
  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, justifyContent: 'center', minWidth: 100 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  error: { color: '#f44336', fontSize: 14, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginVertical: 8 },
  userItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 8 },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  userName: { fontSize: 14, fontWeight: '600', color: '#000' },
  userEmail: { fontSize: 12, color: '#666' },
  createButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, marginTop: 16 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
```

✅ **Checkpoint:** Can find users, create direct/group chats, navigate to chat screen

---

## Task 2.7: Temporary Chat Screen Placeholder

**Create file:**
```bash
mkdir -p app/chat
touch app/chat/\[id\].tsx
```

**⚠️ Update `app/_layout.tsx` (ADD ONLY ONE LINE):**
```typescript
// Add this line to your Stack (below the (tabs) line):
<Stack.Screen name="chat/[id]" options={{ title: 'Chat', headerShown: true, headerBackTitle: 'Back' }} />
```

**Temporary implementation:**
```typescript
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Chat Screen (Phase 3)</Text>
      <Text style={styles.id}>Conversation ID: {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  id: { fontSize: 14, color: '#666' },
});
```

✅ **Checkpoint:** Tapping conversation navigates to placeholder screen

---

## Testing Phase 2

### Test 2.1: User Discovery (Direct)
1. Register 2 users (if not done already)
2. User A: Tap "New Chat" → Enter User B's email → Tap "Find User"
3. Expected: Navigates to chat screen with User B

### Test 2.2: User Discovery (Invalid Email)
1. User A: Enter `fake@example.com` → Tap "Find User"
2. Expected: Shows "No user found with email: fake@example.com"

### Test 2.3: Group Creation
1. User A: Toggle to "Group Chat" → Add User B → Add User C
2. Expected: Shows "Valid Users (2)", "Create Group (3 members)" enabled
3. Tap "Create Group"
4. Expected: Navigates to group chat screen

### Test 2.4: Conversations List
1. User A: Create conversation with User B
2. User A: Go to "Chats" tab
3. Expected: Shows User B's conversation
4. User B: Send a message (Phase 3)
5. Expected: User A's list updates in real-time

### Test 2.5: Persistence
1. User A: Create conversation → Force quit app → Reopen
2. Expected: Conversation still appears in list

---

## Common Issues

### "Index required" error
**Solution:** Click link in console error → Firebase creates index → Wait 1-2 minutes

### Conversations list empty
**Check:** Run test code from Task 2.1 to verify findUserByEmail works

### Can't navigate to chat
**Check:** Verify `<Stack.Screen name="chat/[id]" />` added to root layout

### Mode toggle clears without warning
**Fixed:** Confirmation dialog added (as per your feedback)

---

## Verification Checklist

- [ ] firestoreService.ts compiles, no TypeScript errors
- [ ] chatStore.ts compiles and exports useChatStore
- [ ] Tabs appear at bottom (Chats + New Chat)
- [ ] Can find user by valid email
- [ ] Error shows for invalid email
- [ ] Can create direct chat → navigates to placeholder screen
- [ ] Can add 2+ users to group → "Create Group" button enabled
- [ ] Can create group → navigates to placeholder screen
- [ ] Conversations list displays in real-time
- [ ] Tapping conversation navigates to chat screen
- [ ] Logout button works

---

## Before Phase 3

1. Remove any test code from app/index.tsx
2. Verify at least 2 conversations created
3. Commit Phase 2 work:
```bash
git add .
git commit -m "feat: complete Phase 2 - user discovery and conversation creation"
```

**Time:** 2-3 hours | **Next:** Phase 3 (Core Messaging)
