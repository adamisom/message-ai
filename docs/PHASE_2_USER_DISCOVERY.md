# Phase 2: User Discovery & Conversation Creation

**Estimated Time:** 2-3 hours  
**Goal:** Users can find other users by email, create one-on-one and group conversations, and view a list of their conversations

**Prerequisites:** Phase 0 and Phase 1 must be complete (Firebase configured, authentication working)

---

## Objectives

By the end of Phase 2, you will have:

- ✅ Firestore service for user queries and conversation creation
- ✅ Chat store for managing conversations state
- ✅ Tab navigation structure (Chats + New Chat)
- ✅ New chat screen with email lookup
- ✅ Group chat creation with multi-user validation
- ✅ Real-time conversations list
- ✅ Navigation to individual chats

---

## Architecture Overview

### Data Flow

```
User enters email → findUserByEmail() → Firestore query
    ↓
User found → createOrOpenConversation() / createGroupConversation()
    ↓
Conversation created in Firestore
    ↓
Real-time listener in conversations list picks it up
    ↓
User can tap to navigate to chat screen
```

### Files You'll Create

```
services/
  └── firestoreService.ts         # User lookup, conversation creation

store/
  └── chatStore.ts                # Global conversations state

app/(tabs)/
  ├── _layout.tsx                 # Tab navigator
  ├── index.tsx                   # Conversations list
  └── new-chat.tsx                # New chat creation

components/
  └── ConversationItem.tsx        # Individual conversation in list
```

### Firestore Collections Used

Refer to **mvp-prd-plus.md Section 3** for complete schema details.

```
/users/{uid}                      # Query for email lookup
/conversations/{conversationId}   # Create/read conversations
```

---

## Before Starting Phase 2

Verify Phase 1 is complete and working:

### Required from Phase 1

- [ ] Authentication works (can register new users)
- [ ] Authentication works (can login with existing users)
- [ ] Users are created in Firestore with `displayName`, `email`, `uid`
- [ ] `authStore` is working (manages user state)
- [ ] Can logout successfully
- [ ] Root layout (`app/_layout.tsx`) has presence tracking, notification setup, and session restoration
- [ ] At least **2 user accounts registered** for testing user discovery

### Verify in Firebase Console

1. Go to Firebase Console → Authentication
2. Check that you have 2+ users listed
3. Note their email addresses (you'll need these for testing)

If any items are incomplete, finish Phase 1 first.

---

## Task 2.1: Create Firestore Service

### Purpose

Centralize all Firestore queries and mutations for reusability and consistency.

### Step 1: Create the File

```bash
touch services/firestoreService.ts
```

### Step 2: Implement Core Functions

**Reference:** See FILE_STRUCTURE_GUIDE.md lines 262-373 for complete implementation

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

// Type definitions
interface User {
  uid: string;
  email: string;
  displayName: string;
  isOnline?: boolean;
  lastSeenAt?: any;
  createdAt?: any;
}

interface ParticipantDetail {
  displayName: string;
  email: string;
}

/**
 * Find a user by their email address
 * Used for user discovery in new chat creation
 * @param email - Email to search for (will be normalized)
 * @returns User object or null if not found
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  const q = query(
    collection(db, 'users'),
    where('email', '==', normalizedEmail),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const userDoc = snapshot.docs[0];
  return { 
    uid: userDoc.id, 
    ...userDoc.data() 
  } as User;
};

/**
 * Create or open a one-on-one conversation
 * Uses sorted UIDs as conversation ID for consistency
 * @param otherUser - The other user's data
 * @param currentUser - Current user's data
 * @returns conversationId
 */
export const createOrOpenConversation = async (
  otherUser: User, 
  currentUser: User
): Promise<string> => {
  // Sort UIDs to ensure consistent conversation ID
  const conversationId = [currentUser.uid, otherUser.uid].sort().join('_');
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationDoc = await getDoc(conversationRef);

  if (!conversationDoc.exists()) {
    // Create new conversation
    await setDoc(conversationRef, {
      type: 'direct',
      participants: [currentUser.uid, otherUser.uid],
      participantDetails: {
        [currentUser.uid]: { 
          displayName: currentUser.displayName, 
          email: currentUser.email 
        },
        [otherUser.uid]: { 
          displayName: otherUser.displayName, 
          email: otherUser.email 
        },
      },
      createdAt: serverTimestamp(),
      lastMessageAt: null,
      lastMessage: null,
      lastRead: {},
    });
  }

  return conversationId;
};

/**
 * Create a group conversation
 * @param participants - Array of user objects (excluding current user)
 * @param currentUser - Current user's data
 * @returns conversationId
 */
export const createGroupConversation = async (
  participants: User[], 
  currentUser: User
): Promise<string> => {
  if (participants.length < 2) {
    throw new Error('Group chat requires at least 2 other participants');
  }

  const participantIds = [currentUser.uid, ...participants.map(p => p.uid)];
  const participantDetails: Record<string, ParticipantDetail> = {
    [currentUser.uid]: { 
      displayName: currentUser.displayName, 
      email: currentUser.email 
    },
  };

  participants.forEach(p => {
    participantDetails[p.uid] = { 
      displayName: p.displayName, 
      email: p.email 
    };
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

/**
 * Send a message in a conversation
 * NOTE: This will be used in Phase 3, but including here for completeness
 * @param conversationId - ID of the conversation
 * @param text - Message text
 * @param senderId - UID of sender
 * @param senderName - Display name of sender
 * @param participants - Array of participant UIDs (denormalized)
 * @returns messageId
 */
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

  // Update conversation's lastMessage
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: text.substring(0, 100),
    lastMessageAt: serverTimestamp(),
  });

  return messageRef.id;
};
```

### Key Implementation Details

**Type Safety:**
- Proper TypeScript interfaces defined for `User` and `ParticipantDetail`
- No `any` types - all functions have explicit return types
- This prevents runtime errors and provides better IDE autocomplete

**Why sorted UIDs for direct conversations?**
- Ensures same conversation ID regardless of who initiates
- Example: User A → User B and User B → User A both get ID "userA_userB"

**Why denormalized participant details?**
- Avoids extra Firestore reads when displaying conversation names
- See mvp-prd-plus.md Section 2 "Decision 3" for rationale

**Why serverTimestamp()?**
- CRITICAL: Always use server timestamps (see QUICK_REFERENCE.md lines 9-16)
- Client clocks are unreliable

### Step 3: Test the Service

Add a temporary test to verify the service works:

```typescript
// Add to app/index.tsx temporarily (remove after testing)
import { useEffect } from 'react';
import { findUserByEmail } from '../services/firestoreService';

// Inside your component
useEffect(() => {
  const testFirestoreService = async () => {
    try {
      // Replace with an actual registered user's email
      const user = await findUserByEmail('test@example.com');
      console.log('✅ findUserByEmail test:', user);
      
      if (user) {
        console.log('Found:', user.displayName, user.email);
      } else {
        console.log('User not found (expected if email doesn\'t exist)');
      }
    } catch (error) {
      console.error('❌ findUserByEmail test failed:', error);
    }
  };
  
  testFirestoreService();
}, []);
```

**Expected results:**
- If user exists: Logs user object with `uid`, `displayName`, `email`
- If user doesn't exist: Logs `null`
- No errors should occur

**After testing:** Remove this test code from `app/index.tsx`

**✅ Checkpoint:** Service compiles with no TypeScript errors, test returns expected results

---

## Task 2.2: Create Chat Store

### Purpose

Manage global state for conversations list and online statuses.

### Step 1: Create the File

```bash
touch store/chatStore.ts
```

### Step 2: Implement the Store

**Reference:** See FILE_STRUCTURE_GUIDE.md lines 506-542

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

### Why This Structure?

- **Typed interfaces:** Full TypeScript support
- **Conversations array:** Sorted by `lastMessageAt` (will be set up in UI)
- **Online statuses:** For showing indicators in conversation list (Phase 5)
- **Simple actions:** No complex logic, just state updates

**✅ Checkpoint:** Store compiles with no errors, can import in other files

---

## Task 2.3: Create Tab Navigation

### Purpose

Set up the main app navigation with "Chats" and "New Chat" tabs.

### Step 1: Create Tabs Directory and Layout

```bash
# Create the tabs directory
mkdir -p app/\(tabs\)

# Create the layout file
touch app/\(tabs\)/_layout.tsx
```

**Note:** The `\(` escapes are for the bash command. The actual directory is `(tabs)`.

### Step 2: Implement Tabs

**Reference:** See FILE_STRUCTURE_GUIDE.md lines 1162-1191

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
      }}
    >
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

### Step 3: Update Root Layout

⚠️ **IMPORTANT:** Your `app/_layout.tsx` from Phase 1 contains presence tracking, notification setup, and session restoration. **DO NOT replace it entirely**. Only add the new Stack.Screen for tabs.

Open `app/_layout.tsx` and add the `(tabs)` route to the existing Stack:

```typescript
// app/_layout.tsx - ADD ONLY THE NEW STACK.SCREEN LINE
// Keep all existing Phase 1 code (presence, notifications, session restoration)

return (
  <Stack>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> {/* ADD THIS LINE */}
    {/* Chat screen will be added in Phase 3 */}
  </Stack>
);
```

**Full context:** Your root layout should still have all the Phase 1 features:
- `useEffect` for session restoration
- `useEffect` for presence tracking
- `useEffect` for notification setup
- The Stack component with all routes

**✅ Checkpoint:** Tabs appear at the bottom with two tabs

---

## Task 2.4: Create Conversation Item Component

### Purpose

Reusable component for displaying each conversation in the list.

### Step 1: Create the Component

```bash
touch components/ConversationItem.tsx
```

### Step 2: Implement the Component

**Reference:** See FILE_STRUCTURE_GUIDE.md lines 693-741

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

export default function ConversationItem({ 
  conversation, 
  currentUserId, 
  onPress 
}: ConversationItemProps) {
  const getConversationName = (): string => {
    if (conversation.type === 'group') {
      return conversation.name || 'Unnamed Group';
    }
    
    // For direct chat, get other user's name
    const otherUserId = conversation.participants.find(
      (id: string) => id !== currentUserId
    );
    
    if (!otherUserId) return 'Unknown';
    
    const otherUser = conversation.participantDetails[otherUserId];
    return otherUser?.displayName || 'Unknown User';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {getConversationName()}
          </Text>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
});
```

**✅ Checkpoint:** Component renders without errors (test in conversations list)

---

## Task 2.5: Create Conversations List Screen

### Purpose

Main screen showing all user's conversations with real-time updates.

### Step 1: Create the Screen

Create the conversations list screen:

```bash
touch app/\(tabs\)/index.tsx
```

### Step 2: Implement the Screen

**Reference:** See FILE_STRUCTURE_GUIDE.md lines 1198-1264

⚠️ **FIRESTORE INDEX REQUIRED**

The query below uses `array-contains` + `orderBy` which requires a composite index. On first run, you'll get:

```
Error: The query requires an index
```

**Solution:**
1. The error message will include a link to auto-create the index
2. Click the link (opens Firebase Console)
3. Click "Create Index"
4. Wait 1-2 minutes for index to build
5. Reload your app

**OR create manually:**
- Firebase Console → Firestore → Indexes → Create Index
- Collection: `conversations`
- Fields: `participants` (Array-contains) + `lastMessageAt` (Descending)

```typescript
import { useEffect } from 'react';
import { View, FlatList, Button, StyleSheet, Text } from 'react-native';
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

  // Real-time listener for conversations
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
      
      // Sort: new conversations (null lastMessageAt) appear at top
      const sorted = convos.sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0;
        if (!a.lastMessageAt) return -1; // a goes first
        if (!b.lastMessageAt) return 1;  // b goes first
        // Both have timestamps, Firestore already sorted desc
        return 0;
      });
      
      setConversations(sorted);
    });

    // CRITICAL: Always unsubscribe on unmount
    return unsubscribe;
  }, [user]);

  const handleLogout = async () => {
    await logoutUser();
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button title="Logout" onPress={handleLogout} />
      </View>
      
      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            Tap "New Chat" to start a conversation
          </Text>
        </View>
      ) : (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
```

### Key Implementation Details

**Real-time listener:**
- `onSnapshot()` keeps the list updated automatically
- New conversations appear instantly
- MUST unsubscribe in cleanup (memory leak prevention)

**orderBy('lastMessageAt', 'desc') + manual sort:**
- Most recent conversations first
- New conversations (null lastMessageAt) are manually sorted to top
- This ensures newly created chats appear immediately at the top of the list

**array-contains query:**
- Efficient way to find conversations where user is a participant
- See QUICK_REFERENCE.md lines 120-128 for query pattern

**✅ Checkpoint:** Conversations list shows (empty state for now), logout works

---

## Task 2.6: Create New Chat Screen

### Purpose

Screen for creating both one-on-one and group conversations with email-based user discovery.

### Step 1: Create the Screen

```bash
touch app/\(tabs\)/new-chat.tsx
```

### Step 2: Implement the Screen

**Reference:** See FILE_STRUCTURE_GUIDE.md lines 1271-1393

```typescript
import { useState } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  Text, 
  FlatList, 
  StyleSheet,
  TouchableOpacity,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { 
  findUserByEmail, 
  createOrOpenConversation, 
  createGroupConversation 
} from '../../services/firestoreService';
import { validateEmail } from '../../utils/validators';

interface User {
  uid: string;
  email: string;
  displayName: string;
}

export default function NewChat() {
  const [email, setEmail] = useState('');
  const [validUsers, setValidUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);

  const { user } = useAuthStore();
  const router = useRouter();

  const handleAddUser = async () => {
    setError('');
    setLoading(true);

    try {
      // Validate email format
      if (!validateEmail(email)) {
        setError('Invalid email format');
        return;
      }

      // Find user in Firestore
      const foundUser = await findUserByEmail(email);
      
      if (!foundUser) {
        setError('No user found with that email');
        return;
      }

      // Check if it's the current user
      if (foundUser.uid === user.uid) {
        setError("You can't add yourself");
        return;
      }

      // Check if already added
      if (validUsers.find(u => u.uid === foundUser.uid)) {
        setError('User already added');
        return;
      }

      // Add to list
      setValidUsers([...validUsers, foundUser]);
      setEmail('');
      
    } catch (err: any) {
      setError(err.message || 'Failed to find user');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = (uid: string) => {
    setValidUsers(validUsers.filter(u => u.uid !== uid));
  };

  const handleCreateDirectChat = async () => {
    if (validUsers.length === 0) {
      setError('Please add at least one user');
      return;
    }

    setLoading(true);
    try {
      const conversationId = await createOrOpenConversation(
        validUsers[0], 
        user
      );
      router.push(`/chat/${conversationId}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroupChat = async () => {
    if (validUsers.length < 2) {
      setError('Need at least 2 users for a group chat');
      return;
    }

    setLoading(true);
    try {
      const conversationId = await createGroupConversation(validUsers, user);
      router.push(`/chat/${conversationId}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleModeToggle = () => {
    // If users have been added, confirm before switching
    if (validUsers.length > 0) {
      Alert.alert(
        'Switch Chat Mode?',
        'Switching modes will clear your selected users. Continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Switch',
            onPress: () => {
              setIsGroupMode(!isGroupMode);
              setValidUsers([]);
              setError('');
            },
            style: 'destructive'
          }
        ]
      );
    } else {
      setIsGroupMode(!isGroupMode);
      setError('');
    }
  };

  return (
    <View style={styles.container}>
      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <Button
          title={isGroupMode ? 'Switch to Direct Chat' : 'Switch to Group Chat'}
          onPress={handleModeToggle}
        />
      </View>

      {/* Email input */}
      <View style={styles.inputSection}>
        <TextInput
          style={styles.input}
          placeholder="Enter email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />
        <Button
          title={isGroupMode ? 'Add User' : 'Find User'}
          onPress={handleAddUser}
          disabled={loading || !email.trim()}
        />
      </View>

      {/* Error message */}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      {/* List of added users */}
      {validUsers.length > 0 && (
        <View style={styles.usersList}>
          <Text style={styles.usersListTitle}>
            {isGroupMode ? 'Group Members:' : 'Selected User:'}
          </Text>
          <FlatList
            data={validUsers}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <View style={styles.userItem}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.displayName}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveUser(item.uid)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {/* Create button */}
      {validUsers.length > 0 && (
        <View style={styles.createButtonSection}>
          <Button
            title={
              loading
                ? 'Creating...'
                : isGroupMode
                ? `Create Group (${validUsers.length + 1} members)`
                : 'Create Chat'
            }
            onPress={isGroupMode ? handleCreateGroupChat : handleCreateDirectChat}
            disabled={loading}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  modeToggle: {
    marginBottom: 16,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  error: {
    color: 'red',
    fontSize: 14,
    marginBottom: 8,
  },
  usersList: {
    flex: 1,
    marginTop: 16,
  },
  usersListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff3b30',
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  createButtonSection: {
    marginTop: 16,
    paddingBottom: 16,
  },
});
```

### UI Flow Details

**Direct Chat Mode:**
1. User enters email
2. Taps "Find User"
3. If found → User appears in list
4. User taps "Create Chat"
5. Navigates to chat screen

**Group Chat Mode:**
1. User enters email
2. Taps "Add User"
3. User added to list
4. Repeat steps 1-3 for more users
5. Once 2+ users added, tap "Create Group"
6. Navigates to chat screen

**Mode Switching:**
- If no users added: Switches immediately
- If users added: Shows confirmation dialog to prevent accidental data loss
- Dialog options: "Cancel" or "Switch" (destructive style)

### Key Implementation Details

**Email validation first:**
- Check format before querying Firestore
- Saves unnecessary reads

**Duplicate prevention:**
- Check if user already in list
- Check if user is self

**Error handling:**
- User-friendly error messages
- Clear errors when switching modes

**Confirmation dialog:**
- Prevents accidental loss of selected users
- Uses native Alert with destructive action styling
- Better UX than silent clearing

**Group vs Direct:**
- Same component, different logic based on `isGroupMode`
- Validates minimum 2 users for groups

**✅ Checkpoint:** Can add users, create conversations, navigate to chat

---

## Testing Phase 2

### Test 2.1: User Discovery (Direct Chat)

**Steps:**
1. Go to "New Chat" tab
2. Enter a valid email of an existing user
3. Tap "Find User"

**Expected:**
- ✅ User appears in list with display name and email
- ✅ "Create Chat" button appears

**Then:**
4. Tap "Create Chat"

**Expected:**
- ✅ Navigates to chat screen (will be blank for now - Phase 3)
- ✅ Conversation appears in "Chats" tab

---

### Test 2.2: User Not Found

**Steps:**
1. Enter an email that doesn't exist
2. Tap "Find User"

**Expected:**
- ✅ Error message: "No user found with that email"
- ✅ User can try again with different email

---

### Test 2.3: Invalid Email

**Steps:**
1. Enter "notanemail"
2. Tap "Find User"

**Expected:**
- ✅ Error message: "Invalid email format"

---

### Test 2.4: Group Chat Creation

**Steps:**
1. Tap "Switch to Group Chat"
2. Add 2+ valid users (repeat email entry)
3. Tap "Create Group"

**Expected:**
- ✅ Group conversation created
- ✅ Appears in conversations list
- ✅ Shows "Group with 3 members" (or actual count)

---

### Test 2.5: Group Chat Validation

**Steps:**
1. In group mode, add only 1 user
2. Tap "Create Group"

**Expected:**
- ✅ Error message: "Need at least 2 users for a group chat"

---

### Test 2.6: Real-Time Conversation List

**Steps:**
1. Open app on two devices/emulators
2. Login as User A on device 1
3. Login as User B on device 2
4. User A creates conversation with User B

**Expected:**
- ✅ Conversation appears on User A's list immediately
- ✅ Conversation appears on User B's list within 1-2 seconds
- ✅ Both show correct conversation name

---

### Test 2.7: Duplicate Conversation

**Steps:**
1. Create conversation with User X
2. Go back to conversations list
3. Try to create conversation with User X again

**Expected:**
- ✅ Opens existing conversation (same ID)
- ✅ No duplicate conversation created

---

### Test 2.8: Self-Add Prevention

**Steps:**
1. Enter your own email
2. Tap "Add User"

**Expected:**
- ✅ Error: "You can't add yourself"

---

## Common Issues & Solutions

### Issue: "No user found" but user exists

**Cause:** Email case sensitivity or whitespace

**Solution:**
- `findUserByEmail()` already normalizes (lowercase + trim)
- Check Firebase Console → Firestore → users collection
- Verify email is exactly as stored

---

### Issue: Conversation not appearing in list

**Cause:** Firestore listener not set up or query failing

**Debug:**
```typescript
// In ConversationsList, add console logs
onSnapshot(q, (snapshot) => {
  console.log('Conversations count:', snapshot.docs.length);
  snapshot.docs.forEach(doc => {
    console.log('Conv:', doc.id, doc.data());
  });
  // ... rest of code
});
```

**Check:**
- User is authenticated
- User UID is in conversation's `participants` array
- Firestore rules allow read access

---

### Issue: Can't navigate to chat screen

**Symptom:** Error "No route named 'chat/[id]'"

**Cause:** Chat screen not created yet (that's Phase 3)

**Solution:**
- Expected behavior for now
- Chat screen will be created in Phase 3
- For testing, add temporary placeholder:

```bash
mkdir -p app/chat
touch app/chat/\[id\].tsx
```

```typescript
// app/chat/[id].tsx - TEMPORARY PLACEHOLDER
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Chat Screen (Phase 3)</Text>
      <Text>Conversation ID: {id}</Text>
    </View>
  );
}
```

**Then update `app/_layout.tsx`** to add this route:

```typescript
// In your Stack component, add:
<Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
```

🚨 **CRITICAL:** Remove this temporary file before starting Phase 3!  
It will conflict with the real chat screen implementation.  
Set a reminder to delete `app/chat/[id].tsx` after Phase 2 testing is complete.

---

### Issue: Conversations list orderBy error

**Symptom:** "The query requires an index"

**Cause:** Firestore needs a composite index for array-contains + orderBy

**Solution:**
Firebase Console will show a link to create the index automatically:
1. Click the link in error message
2. Wait 1-2 minutes for index to build
3. Retry

Or manually:
- Firebase Console → Firestore → Indexes → Create Index
- Collection: `conversations`
- Fields: `participants` (Array) + `lastMessageAt` (Descending)

---

## Potential Roadblocks & Questions

### 🟡 Unresolved Question: Conversation Naming

**Issue:** Default group names are generic ("Group with 3 members")

**Options:**
1. Keep generic (MVP approach)
2. Auto-generate from first 2 members ("Alice, Bob, and 1 other")
3. Prompt user for group name on creation

**Recommendation:** Keep generic for MVP. Add custom naming in Phase 2 post-MVP.

**Status:** ⚠️ Decision needed if this becomes a UX issue during testing

---

### 🟡 Potential Issue: Large Conversations List

**Issue:** No pagination - loads all conversations

**Impact:** Could be slow if user has 100+ conversations

**Mitigation for MVP:**
- Firestore `orderBy + limit(50)` would help
- But: loses older conversations from view

**Recommendation:** 
- Keep current implementation (load all) for MVP
- Monitor performance during testing
- Add pagination in Phase 2 if needed

**Status:** ⚠️ Monitor during multi-user testing

---

### 🟢 Resolved: Conversation ID Format

**Question:** How to ensure consistent conversation IDs for direct chats?

**Answer:** ✅ Sort UIDs alphabetically (`[uid1, uid2].sort().join('_')`)

**Verified:** This approach is used in `createOrOpenConversation()`

---

### 🟢 Resolved: When to navigate to chat?

**Question:** Navigate immediately or after conversation document created?

**Answer:** ✅ Navigate after creation (await completes)

**Benefit:** Ensures conversation exists before chat screen tries to load it

---

### 🟡 Edge Case: User deleted between find and create

**Scenario:**
1. User A finds User B
2. User B deletes their account
3. User A tries to create conversation

**Current behavior:** Would fail silently or create conversation with missing user

**Mitigation:** Low priority for MVP (rare edge case)

**Recommendation:** Add validation in Phase 7 (testing & polish)

**Status:** ⚠️ Known limitation, acceptable for MVP

---

### 🟢 Resolved: Email case sensitivity

**Question:** What if user enters "User@Example.COM"?

**Answer:** ✅ Normalized in `findUserByEmail()` with `.toLowerCase().trim()`

**Verified:** Implementation handles this correctly

---

## Verification Checklist

Before proceeding to Phase 3, verify ALL of these:

### Code Complete

- [ ] `services/firestoreService.ts` created with all functions
- [ ] `store/chatStore.ts` created and working
- [ ] `app/(tabs)/_layout.tsx` created with tab navigation
- [ ] `app/(tabs)/index.tsx` (conversations list) created
- [ ] `app/(tabs)/new-chat.tsx` created
- [ ] `components/ConversationItem.tsx` created
- [ ] No TypeScript errors
- [ ] No linter errors

### Functionality Tests

- [ ] Can find user by valid email
- [ ] Error shown for invalid email
- [ ] Error shown for non-existent email
- [ ] Can create one-on-one conversation
- [ ] Can create group conversation (2+ users)
- [ ] Error shown if trying to create group with <2 users
- [ ] Conversations appear in list in real-time
- [ ] Can navigate to chat screen (even if it's a placeholder)
- [ ] Logout button works
- [ ] Tab navigation works

### Data Verification

- [ ] Check Firebase Console → Firestore
- [ ] Conversations collection exists
- [ ] Conversation documents have correct structure
- [ ] `participantDetails` is properly populated
- [ ] `participants` array is correct
- [ ] Direct chat IDs are consistent (sorted UIDs)

### Performance

- [ ] Conversations list loads quickly (< 2 seconds)
- [ ] No memory leaks (listeners have cleanup)
- [ ] App doesn't freeze during user search
- [ ] Real-time updates work (test with 2 devices)

---

## Summary

**Phase 2 Complete When:**

- ✅ User discovery by email works
- ✅ One-on-one conversations can be created
- ✅ Group conversations can be created
- ✅ Conversations list shows all user's chats
- ✅ Real-time updates work
- ✅ Navigation structure is in place

**Time Investment:** 2-3 hours  
**Output:** Complete user discovery and conversation management system

**Next:** Phase 3 - Core Messaging (send/receive messages, optimistic updates, real-time sync)

---

## Before Phase 3

### Commit Your Work

```bash
git add .
git commit -m "feat: complete Phase 2 - user discovery and conversation creation"
```

### Update Progress

Check off Phase 2 in `docs/PROGRESS_TRACKER.md`

### Prepare for Phase 3

Phase 3 will implement:
- Chat screen with message list
- Message sending with optimistic updates
- Real-time message listening
- Offline support
- Message components (MessageBubble, MessageList, MessageInput)

**Estimated time:** 3-4 hours

---

**Ready to proceed? Ensure ALL verification checklist items are complete before moving to Phase 3.**

