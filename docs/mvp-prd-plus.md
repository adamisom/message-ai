# MessageAI MVP - Product Requirements Document
**Project:** MessageAI (Gauntlet AI Challenge)  
**Scope:** MVP Phase (24-hour deadline)  
**Tech Stack:** React Native (Expo Managed) + Firebase  
**Target Deployment:** Android/iOS Emulator (local testing)  
**Document Version:** 2.0

---

## Executive Summary

This PRD defines the MVP scope for MessageAI: a production-quality messaging app clone focused on core messaging infrastructure (one-on-one and group chat, real-time delivery, offline support, and message persistence). The MVP is designed for rapid development using React Native + Expo + Firebase to meet the 24-hour hard gate deadline. **No AI features or media handling beyond basic images are included in MVP scope.**

**Key Decision:** Using **Expo Managed Workflow** (not bare React Native) to maximize development speed. This requires no native code compilation, supports hot reload, and deploys via Expo Go for testing on emulators.

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
- ✅ Message timestamps
- ✅ Message read receipts
- ✅ Typing indicators
- ✅ Push notifications setup (foreground + local notifications)
- ✅ User profiles (display name, avatar URL)
- ✅ Deployment on local emulator

### What IS NOT in MVP (Out of Scope)
- ❌ Media uploads (file handling adds 3-4 hours of complexity)
- ❌ Real image storage (use placeholder avatars/Gravatar instead)
- ❌ Message search
- ❌ Message editing/deletion
- ❌ Voice/video calls
- ❌ End-to-end encryption
- ❌ User presence animations or complex animations
- ❌ Dark mode
- ❌ Multi-language support
- ❌ All AI features (Phase 2)

### What to Minimize/Simplify
- **Authentication:** Email + password only (no Google Sign-In, Apple ID, phone auth)
- **UI/UX:** Functional, not beautiful. Copy WhatsApp's layout but skip polish.
- **Database schema:** Keep it simple—avoid premature optimization
- **Push notifications:** Foreground notification + local notifications (background is Phase 2)

---

## 2. Technical Stack & Architecture

### Frontend (React Native + Expo)
```
├── Expo SDK 54.0.0 (latest managed workflow)
├── React 19.1.0
├── React Native 0.81 (compatible with Expo SDK 54)
├── Expo Router (file-based routing - optional but recommended)
├── React Navigation (Stack + Tab navigator)
├── @react-native-firebase/* (Firebase SDK for RN)
├── AsyncStorage (local state persistence)
├── Zustand (lightweight state management)
├── React Native Paper (pre-built UI components)
├── expo-notifications (push/local notifications)
└── expo-vector-icons (3,000+ icons pre-included)
```

### Backend (Firebase)
```
├── Firestore (real-time database)
│   ├── Users collection
│   ├── Conversations collection
│   ├── Messages collection
│   └── ReadReceipts collection
├── Firebase Auth (email/password)
├── Firebase Cloud Messaging (FCM) - for production push
├── Firebase Cloud Functions (optional for complex logic)
└── Firebase Realtime Database (alternative if needed)
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

### JavaScript Engine
- **Hermes** (default in React Native 0.82+): Faster startup, smaller bundle size, optimized for mobile
- **JavaScriptCore**: Alternative; older but stable

### Why This Stack?
| Component | Why | Risk Mitigation |
|-----------|-----|-----------------|
| React Native + Expo | Fast iteration, hot reload, no native code needed | Avoid ejecting; use managed workflow only |
| Expo SDK 54 | Latest stable with React 19 support | Compatible with React Native 0.81; check version lock |
| Firestore | Real-time sync built-in, no custom WebSocket logic | Learn Firestore rules early; test offline behavior |
| AsyncStorage | Offline message queuing, simple key-value store | Keep payloads small; clear old data periodically |
| Zustand | Minimal boilerplate vs Redux | Don't over-engineer state; keep it flat |
| Expo Router | File-based routing (Next.js-inspired) | Simplifies navigation stack management; optional but recommended for cleanest code |

### Recommended Expo Modules (Pre-installed with SDK 54)
- **expo-notifications**: Local & push notifications (built-in)
- **expo-vector-icons**: 3,000+ icons (Ionicons, MaterialCommunityIcons, etc.)
- **expo-image-picker**: Image selection (Phase 2 if needed)
- **expo-status-bar**: Control device status bar
- **expo-linking**: Deep linking/URL handling

All of these are installed via `npx expo install <module>` or pre-bundled in SDK 54.

---

## 3. Core Features - Implementation Guide

### 3.1 User Authentication
**Requirements:**
- Email/password registration and login
- Persistent session (auto-login on app restart)
- User profiles: `{ uid, email, displayName, avatarUrl }`

**Implementation Approach:**
```javascript
// Minimal setup
1. Firebase Auth + persist session with AsyncStorage
2. Create /screens/Auth stack (Login, Register screens)
3. Use Firebase's `onAuthStateChanged()` to restore session
4. Store user profile in Firestore under /users/{uid}

// Keep it simple:
- No complex validation (just email regex + min password length)
- No email verification flow
- Use serverTimestamp() for createdAt/updatedAt
```

**Firestore Schema:**
```
/users/{uid}
├── email: string
├── displayName: string
├── avatarUrl: string (use Gravatar: `https://gravatar.com/avatar/{md5(email)}`)
├── isOnline: boolean
├── lastSeenAt: timestamp (server time)
├── createdAt: timestamp
└── updatedAt: timestamp
```

**Time to Implement:** 1-2 hours

---

### 3.2 One-on-One Chat
**Requirements:**
- Send/receive text messages between two users
- Messages appear instantly (optimistic update)
- Conversation history persists
- Timestamps on each message

**Implementation Approach:**
```javascript
// Firestore structure for conversations
/conversations/{conversationId}
├── participants: [uid1, uid2]
├── lastMessageAt: timestamp
├── lastMessage: string (for preview)
└── createdAt: timestamp

/conversations/{conversationId}/messages/{messageId}
├── senderId: string
├── text: string
├── createdAt: timestamp (server time!)
├── status: "sending" | "sent" | "delivered" | "read"
└── readBy: { uid1: timestamp, uid2: timestamp } (optional field)
```

**Key Implementation Details:**

1. **Conversation Creation:**
   - When User A sends first message to User B, create conversation doc if it doesn't exist
   - Use deterministic ID: `conversationId = sorted([uid_a, uid_b]).join("_")`
   - This prevents duplicate conversations

2. **Real-Time Message Listening:**
   ```javascript
   // Listen to messages collection for this conversation
   const unsubscribe = db.collection('conversations').doc(conversationId)
     .collection('messages')
     .orderBy('createdAt', 'asc')
     .onSnapshot((snapshot) => {
       // Update state with real-time messages
     });
   
   // CRITICAL: Unsubscribe in cleanup to prevent memory leaks
   return () => unsubscribe();
   ```

3. **Optimistic Updates (Critical for UX):**
   ```javascript
   // Step 1: Add message to local state immediately
   const tempMessage = {
     id: uuid(),
     text: messageText,
     senderId: currentUser.uid,
     status: "sending",
     createdAt: new Date()
   };
   setMessages([...messages, tempMessage]);
   
   // Step 2: Send to Firestore (background)
   db.collection('conversations').doc(conversationId)
     .collection('messages')
     .add({ 
       text: messageText, 
       senderId: currentUser.uid,
       createdAt: firebase.firestore.FieldValue.serverTimestamp(),
       status: "sent"
     })
     .then((docRef) => {
       // Update temp message status to "sent"
       updateMessageStatus(tempMessage.id, "sent");
     })
     .catch((error) => {
       // Mark as failed, allow retry
       updateMessageStatus(tempMessage.id, "failed");
     });
   ```

4. **Offline Queue:**
   - Firestore's built-in offline support handles this automatically
   - When offline: writes to local cache
   - When online: automatic sync to server
   - No custom AsyncStorage queue needed (Firestore handles it)

5. **Message Status Tracking:**
   - `sending` → message created locally
   - `sent` → received by Firestore
   - `delivered` → recipient's app received it
   - `read` → recipient read it (see Read Receipts section)

**Time to Implement:** 2-3 hours

---

### 3.3 Group Chat
**Requirements:**
- Support 3+ users in one conversation
- Show sender name/avatar for each message
- Track which users are in the group
- Message attribution (know who sent each message)

**Implementation Approach:**
```javascript
// Same /conversations collection but with multiple participants
/conversations/{groupConversationId}
├── type: "group" | "direct"
├── name: string (group name)
├── participants: [uid1, uid2, uid3, ...]
├── creatorId: uid
├── createdAt: timestamp
└── lastMessageAt: timestamp

// Messages include sender info
/conversations/{groupConversationId}/messages/{messageId}
├── senderId: string
├── senderName: string (denormalized for speed)
├── senderAvatarUrl: string (denormalized)
├── text: string
├── createdAt: timestamp (server time)
└── status: string
```

**Key Implementation Details:**

1. **Group Creation:**
   - Create conversation with `type: "group"`
   - Generate conversationId (use UUID, not deterministic)
   - Store group name
   - Initialize participants array

2. **Rendering Messages:**
   - Show sender's name/avatar above each message (different from previous sender)
   - Group consecutive messages from same sender visually

3. **Simplification:**
   - No group admin roles (keep it simple)
   - No ability to add/remove users after creation
   - No group image/icon

**Time to Implement:** 1-2 hours (builds on one-on-one chat)

---

### 3.4 Message Persistence & Offline Support
**Requirements:**
- Chat history survives app restart
- Messages queue when offline, send on reconnect
- User can read old messages while offline

**Implementation Approach:**

1. **Local Storage Strategy:**
   - Firestore's built-in offline persistence is enabled by default
   - Firestore automatically caches data and retries writes
   - Use AsyncStorage only for auth tokens and UI state (not messages)
   - On app start, just re-query conversations—Firestore restores from cache

2. **Offline Message Queue (Automatic):**
   ```javascript
   // Firestore handles this automatically!
   // When offline: writes to local cache
   // When online: syncs to server automatically
   
   // Enable offline persistence (usually default):
   // In firebase.js or main App.js:
   // firebase.firestore().enablePersistence();
   ```

3. **Restart Persistence:**
   ```javascript
   // On app launch:
   useEffect(() => {
     // Firestore automatically restores from cache
     // Just re-query conversations and messages
     const unsubscribe = db.collection('conversations')
       .where('participants', 'array-contains', currentUser.uid)
       .orderBy('lastMessageAt', 'desc')
       .onSnapshot((snapshot) => {
         setConversations(snapshot.docs.map(doc => doc.data()));
       });
     
     return unsubscribe;
   }, [currentUser]);
   ```

**Time to Implement:** 0.5-1 hour (mostly Firestore config)

---

### 3.5 Online/Offline Status & Typing Indicators
**Requirements:**
- Show "Online" / "Offline" next to user names
- Show "User is typing..." indicator
- Update status in real-time

**Implementation Approach:**

1. **Presence Status:**
   ```javascript
   // Track presence in Firestore
   /users/{uid}
   ├── isOnline: boolean
   ├── lastSeenAt: timestamp
   └── currentConversation: string | null

   // Update on app lifecycle
   import { AppState } from 'react-native';
   
   useEffect(() => {
     const unsubscribe = AppState.addEventListener('change', handleAppStateChange);
     
     const handleAppStateChange = async (state) => {
       if (state === 'active') {
         await db.collection('users').doc(currentUser.uid).update({ 
           isOnline: true,
           lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
         });
       } else if (state === 'background') {
         await db.collection('users').doc(currentUser.uid).update({ 
           isOnline: false,
           lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
         });
       }
     };
     
     return unsubscribe;
   }, []);
   ```

2. **Typing Indicator:**
   ```javascript
   // Create temporary docs in /conversations/{id}/typingUsers
   // When user starts typing, create doc with their uid
   // When they stop (after 2 seconds no input), delete it
   
   const handleTextChange = (text) => {
     setText(text);
     
     // Debounce typing indicator (max 1 write per 2 seconds)
     if (!isTyping) {
       db.collection('conversations').doc(conversationId)
         .collection('typingUsers')
         .doc(currentUser.uid)
         .set({ uid: currentUser.uid, at: firebase.firestore.FieldValue.serverTimestamp() });
       setIsTyping(true);
     }
     
     clearTimeout(typingTimeout);
     typingTimeout = setTimeout(() => {
       db.collection('conversations').doc(conversationId)
         .collection('typingUsers')
         .doc(currentUser.uid)
         .delete();
       setIsTyping(false);
     }, 2000);
   };
   ```

3. **Listen for Typing:**
   ```javascript
   useEffect(() => {
     const unsubscribe = db.collection('conversations').doc(conversationId)
       .collection('typingUsers')
       .onSnapshot((snapshot) => {
         const typingUids = snapshot.docs.map(doc => doc.data().uid);
         setTypingUsers(typingUids);
       });
     
     return unsubscribe;
   }, [conversationId]);
   ```

**Simplifications:**
- Show "User is typing" as simple text (no animation bubbles)
- Debounce to avoid excessive Firestore writes (cost concern)

**Time to Implement:** 1-1.5 hours

---

### 3.6 Message Read Receipts
**Requirements:**
- Show when message is "read" by recipient
- Update UI with read status indicator (e.g., single/double checkmark)

**Implementation Approach:**

1. **Track Reads (Denormalized in Message):**
   ```javascript
   // Store in message doc itself (simpler than subcollection):
   /conversations/{conversationId}/messages/{messageId}
   ├── readBy: { uid1: timestamp, uid2: timestamp }
   ```

2. **Mark as Read:**
   ```javascript
   // When user opens/scrolls to a message, mark visible ones as read
   useEffect(() => {
     if (visibleMessages.length > 0) {
       // Get the last visible message
       const lastVisibleMessage = visibleMessages[visibleMessages.length - 1];
       
       // Mark all visible messages as read (from other senders)
       visibleMessages.forEach((message) => {
         if (message.senderId !== currentUser.uid && !message.readBy?.[currentUser.uid]) {
           db.collection('conversations').doc(conversationId)
             .collection('messages').doc(message.id)
             .update({
               [`readBy.${currentUser.uid}`]: firebase.firestore.FieldValue.serverTimestamp()
             });
         }
       });
     }
   }, [visibleMessages]);
   ```

3. **Display Read Status:**
   ```javascript
   const getReadStatus = (message) => {
     if (message.senderId !== currentUser.uid) return null; // Only for sent messages
     
     const readBy = message.readBy || {};
     const recipientCount = conversation.participants.length - 1;
     const readCount = Object.keys(readBy).length;
     
     if (readCount === 0) return "✓"; // sent
     if (readCount === recipientCount) return "✓✓"; // read by all
     return "✓"; // delivered to some
   };
   ```

**Simplifications:**
- Use simple checkmark icons
- Don't track "delivered" separately (just sent/read)

**Time to Implement:** 1-1.5 hours

---

### 3.7 Optimistic UI Updates
**Requirements:**
- Messages appear instantly when sent (before server confirmation)
- Status updates as delivery progresses
- Failed messages can be retried

**Implementation Approach:**
See detailed example in Section 3.2. Key points:
- Add to local state immediately
- Show "sending" status
- Update to "sent" when Firestore confirms
- Handle failures gracefully (show "Failed - Retry?" button)
- Use UUID for temp messages to track them as they sync

**Time to Implement:** Included in messaging sections above

---

### 3.8 Push Notifications (Foreground + Local Notifications)
**Requirements:**
- Receive notifications when app is open (foreground)
- Show local notifications for incoming messages
- Set up infrastructure for production push (background notifications)

**Implementation Approach (MVP):**

1. **Local Notifications (No Server Needed - MVP Friendly):**
   ```javascript
   import * as Notifications from 'expo-notifications';
   
   // Request permissions
   useEffect(() => {
     Notifications.requestPermissionsAsync();
   }, []);
   
   // Handle incoming message - send local notification
   const handleIncomingMessage = async (message) => {
     await Notifications.scheduleNotificationAsync({
       content: {
         title: `${message.senderName}`,
         body: message.text,
         sound: 'default',
         data: { conversationId: message.conversationId }
       },
       trigger: { seconds: 0 } // Immediate
     });
   };
   
   // Listen for notification responses
   useEffect(() => {
     const subscription = Notifications.addNotificationResponseReceivedListener(response => {
       const conversationId = response.notification.request.content.data.conversationId;
       // Navigate to conversation
     });
     
     return () => subscription.remove();
   }, []);
   ```

2. **Foreground Notifications (if Firebase FCM is set up):**
   ```javascript
   import { getMessaging, onMessage } from 'firebase/messaging';
   
   const messaging = getMessaging();
   
   onMessage(messaging, (payload) => {
     // Handle foreground message - convert to local notification
     Notifications.scheduleNotificationAsync({
       content: {
         title: payload.notification?.title,
         body: payload.notification?.body,
         data: payload.data
       },
       trigger: { seconds: 0 }
     });
   });
   ```

3. **Production Setup (Phase 2 - High-Level):**
   - Use EAS credentials to configure APNs (iOS) and FCM (Android)
   - Build with `eas build --profile development` (requires development build, not Expo Go)
   - See Appendix D for full production setup details

**Important Limitation:**
- **Expo Go cannot run push notifications** (requires custom development build or full production build)
- For MVP: use local notifications (works in Expo Go)
- For production: use development build or full build with EAS

**Time to Implement:** 1-2 hours for local notifications

---

### 3.9 User Profiles
**Requirements:**
- Display name
- Avatar/profile picture
- Basic profile viewing

**Implementation Approach:**
```javascript
// Firestore schema
/users/{uid}
├── email: string
├── displayName: string
├── avatarUrl: string (use Gravatar - no file upload!)
├── isOnline: boolean
├── lastSeenAt: timestamp
├── createdAt: timestamp
└── updatedAt: timestamp

// Use Gravatar for avatars - no backend storage needed
import md5 from 'js-md5';
const avatarUrl = `https://www.gravatar.com/avatar/${md5(email.toLowerCase())}?s=200`;
```

**Simplifications:**
- No custom profile pictures (use Gravatar)
- No profile editing in MVP
- No profile view screen (show in messages only)

**Time to Implement:** 0.5-1 hour

---

## 4. Development Strategy & Milestone Plan

### Recommended Build Order (Fastest Path)
```
Day 1 (24 hours):

Hour 0-2:   Environment setup (Expo project, Firebase config, dependencies)
Hour 2-4:   Authentication (Login/Register screens)
Hour 4-6:   One-on-one chat infrastructure (Firestore schema, message sending)
Hour 6-8:   Real-time message listening + optimistic updates
Hour 8-10:  Group chat support
Hour 10-12: Online/offline status + typing indicators
Hour 12-14: Message read receipts
Hour 14-16: Local notifications + Firebase setup prep
Hour 16-18: User profiles + Gravatar integration
Hour 18-20: Testing on emulator (both Android & iOS)
Hour 20-24: Bug fixes, polish, final verification
```

### Absolute Minimum to Pass MVP (12 hours)
If you get behind:
1. Authentication ✓
2. One-on-one chat ✓
3. Real-time sync ✓
4. Optimistic updates ✓
5. Group chat ✓
6. Message persistence ✓

Then add features incrementally.

---

## 5. Firebase Configuration

### Firestore Security Rules (MVP - Permissive)
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
      allow read, write: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
    }
    
    // Messages within conversations
    match /conversations/{conversationId}/messages/{messageId} {
      allow read, write: if request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
    }
    
    // Typing users
    match /conversations/{conversationId}/typingUsers/{userId} {
      allow read: if request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
      allow write: if request.auth.uid == userId;
    }
    
    // Read receipts (stored in message doc)
    match /conversations/{conversationId}/messages/{messageId} {
      allow read, write: if request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
    }
  }
}
```

**Note:** These rules are permissive for fast MVP development. Tighten them before production.

---

## 6. State Management Architecture

### Recommended: Zustand (Minimal Boilerplate)
```javascript
// store/auth.ts
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null }),
}));

// store/chat.ts
export const useChatStore = create((set) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  typingUsers: [],
  onlineStatuses: {}, // uid -> isOnline
  
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  setTypingUsers: (users) => set({ typingUsers: users }),
  setOnlineStatuses: (statuses) => set({ onlineStatuses: statuses }),
}));
```

**Why Zustand?** 
- No boilerplate vs Redux
- Easy to integrate with React hooks
- Much faster to setup than Context API
- Minimal bundle size impact

---

## 7. Critical Implementation Notes

### Firestore Write Costs
- **Real concern:** Firestore charges per write operation ($0.06 per 100K writes)
- **For MVP:** Typing indicators create many writes (1 per 2 seconds per user)
- **Solution:** Debounce typing updates (max 1 write per 2 seconds per user, as coded above)
- **Alternative:** Disable typing indicators if cost is concern (not required for MVP)

### Always Use Server Timestamps
- **Critical:** Use `firebase.firestore.FieldValue.serverTimestamp()` for all timestamps
- **Why:** Client clocks are unreliable (different timezones, user device clocks)
- **Impact:** Message ordering will break if you use client-side time
- **Bad:** `createdAt: new Date()`
- **Good:** `createdAt: firebase.firestore.FieldValue.serverTimestamp()`

### Offline-First Approach
- Firestore handles offline sync automatically
- No need to build custom queue unless you want to
- Test this thoroughly: send messages offline, go online, verify delivery

### Network Testing
- Use Android Studio/Xcode throttling to simulate poor network
- Test airplane mode scenarios
- Verify messages queue and send on reconnect

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
- Always use `orderBy('createdAt', 'asc')` consistently
- Use server timestamps only
- Test with multiple devices sending rapidly (race conditions)

---

## 8. Emulator Setup & Testing

### Android Emulator (Recommended for Speed)
See **Appendix B: Expo Go & Emulator Testing** for detailed setup.

Quick start:
```bash
# Android Platform 35, API 34+, at least 4GB RAM
emulator -avd Pixel_5_API_34 -netdelay none -netspeed full

# Start Expo
npx expo start --android
```

**Why Android first?**
- Faster emulation than iOS (no need for virtualization on Mac)
- Easier to test on any machine
- Gets you 90% of the way there

### iOS Simulator (if on Mac)
```bash
# Ensure Xcode is installed (from App Store or developer.apple.com)
open -a Simulator

# Start Expo
npx expo start --ios
```

### Real Device Testing (Highly Recommended)
```bash
# Install Expo Go app on physical device (from App Store / Google Play)
npx expo start
# Scan QR code with device camera
# App opens in Expo Go

# Benefits:
# - Real performance metrics
# - Real network conditions (not emulator simulation)
# - Real notification behavior
```

---

## 9. Key Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Firestore data structure mistakes** | 🔴 Critical | Design schema on paper first; test queries before building UI |
| **Real-time listener memory leaks** | 🔴 Critical | Always unsubscribe in `useEffect` cleanup; test rapid navigation |
| **Optimistic updates not syncing** | 🔴 Critical | Test offline + online transition thoroughly; use UUIDs for temp messages |
| **Message ordering issues** | 🔴 Critical | Use `serverTimestamp()` always; never client time for sorting |
| **Authentication state loss** | 🟠 High | Persist auth token in AsyncStorage; restore on app launch |
| **Emulator crashes with hot reload** | 🟠 High | Full restart every 2 hours; use `npx expo start --tunnel` if issues persist |
| **Notification token expiration** | 🟡 Medium | Refresh FCM token periodically; handle token updates |
| **Group chat message duplication** | 🟡 Medium | Use Firestore doc IDs consistently; test race conditions |
| **UI lag with large message lists** | 🟡 Medium | Implement message pagination (load last 50, then paginate) |
| **AsyncStorage not persisting** | 🟡 Medium | Use `expo-secure-store` for sensitive data; test on real device |

### Biggest Pitfall: Firestore Structure
The most common failure: **Wrong Firestore structure leads to complex queries and poor performance.**

**Get it right:**
```
✅ GOOD:
/conversations/{id}/messages/{msgId}
→ Query: get all messages for a conversation (fast, indexed)

❌ BAD:
/messages/{msgId} with conversationId field
→ Query: get all messages where conversationId == x (slow, requires composite index)
```

---

## 10. Testing Checklist

Use this before submitting MVP:

### Authentication
- [ ] Register new user
- [ ] Login with existing user
- [ ] Logout
- [ ] App persists login on restart
- [ ] Can't access chat without auth

### One-on-One Chat
- [ ] Send message from User A
- [ ] Message appears on User B in real-time (< 1 second)
- [ ] Message persists after app restart
- [ ] Old messages load when opening chat
- [ ] Message appears instantly on sender (optimistic update)
- [ ] Failed messages show "Failed - Retry?" button

### Group Chat
- [ ] Create group with 3+ users
- [ ] Send message in group
- [ ] All users receive message in real-time
- [ ] Sender name/avatar shown correctly
- [ ] Messages persist after restart
- [ ] Can switch between multiple group chats smoothly

### Offline Behavior
- [ ] Send message while app is offline (airplane mode)
- [ ] Turn offline mode off
- [ ] Message appears in conversation ✓
- [ ] Receive messages while offline
- [ ] Messages appear when coming back online
- [ ] App doesn't crash during transition

### Status Indicators
- [ ] Online/offline status shown for each user
- [ ] Status updates when going offline
- [ ] Typing indicator appears when other user types
- [ ] Typing indicator disappears after 2 seconds
- [ ] Message read receipts show ✓ vs ✓✓
- [ ] Last seen time updates correctly

### Notifications
- [ ] Foreground notification appears when message received
- [ ] Local notification shows correct message preview
- [ ] Tapping notification navigates to correct conversation
- [ ] No duplicates (local + FCM)

### Emulator Testing
- [ ] Test on Android emulator
- [ ] Test on iOS simulator (if time)
- [ ] Force quit and reopen app
- [ ] Verify messages persist
- [ ] Test with poor network (DevTools throttling)
- [ ] Test rapid message sending (20+ messages)
- [ ] Test rapid user switching

---

## 11. Deployment Checklist (Emulator Ready)

- [ ] GitHub repository created with clean history
- [ ] `README.md` with setup instructions (see Appendix A)
- [ ] `.env` file with Firebase config (or `firebase.js` template)
- [ ] Clean up console logs and debug statements
- [ ] Remove test/dummy data
- [ ] Verify Firestore rules are in place
- [ ] Test full flow end-to-end on emulator
- [ ] Test on both Android and iOS emulator (if time)
- [ ] Verify app doesn't crash on force quit
- [ ] Test with 2-3 simultaneous users
- [ ] Verify hot reload works properly

---

## 12. Questions to Clarify Before Starting

1. **Will you use Firebase Emulator Suite locally, or real Firebase project?**
   - Real Firebase is faster for MVP (no extra setup)
   - Emulator adds 30 min setup but useful for offline testing

2. **How many concurrent test users will you need?**
   - For MVP grading: likely 2-3 users max
   - Just use test accounts (test1@gmail.com, test2@gmail.com, etc.)

3. **Do you want notifications to work in production, or just MVP setup?**
   - MVP: local notifications (works in Expo Go)
   - Production: requires EAS build setup (Phase 2)

4. **Should message history be unlimited or paginated?**
   - Unlimited for MVP (load all messages at once)
   - Pagination can be Phase 2 if performance issues arise

---

## 13. Recommended File Structure

```
messageai/
├── app.json                          # Expo config
├── package.json
├── .env                              # Firebase config (gitignored)
├── .gitignore
├── README.md
├── src/
│   ├── config/
│   │   └── firebase.js               # Firebase initialization
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.jsx
│   │   │   └── RegisterScreen.jsx
│   │   ├── Chat/
│   │   │   ├── ConversationsListScreen.jsx
│   │   │   ├── ChatScreen.jsx
│   │   │   └── NewConversationScreen.jsx
│   │   └── Profile/
│   │       └── ProfileScreen.jsx
│   ├── components/
│   │   ├── MessageBubble.jsx
│   │   ├── MessageList.jsx
│   │   ├── MessageInput.jsx
│   │   └── ConversationItem.jsx
│   ├── store/
│   │   ├── auth.js                   # Zustand auth store
│   │   └── chat.js                   # Zustand chat store
│   ├── utils/
│   │   ├── helpers.js
│   │   ├── gravatar.js
│   │   └── timeFormat.js
│   ├── navigation/
│   │   └── Navigation.jsx            # React Navigation setup
│   └── App.jsx                       # Main app component
└── assets/
    └── (images, fonts, etc.)
```

---

## Summary

**Goal:** Build a WhatsApp MVP clone in 24 hours using React Native (Expo Managed) + Firebase, deployable on Android/iOS emulators.

**Key Success Factors:**
1. Get Firestore schema right before coding
2. Use real-time listeners correctly (with cleanup)
3. Always use server timestamps (not client time)
4. Test offline/online transitions thoroughly
5. Use optimistic updates for great UX
6. Test on emulator early and often

**Time Budget:**
- Setup: 2 hours
- Core features: 18 hours
- Testing/polish: 4 hours

**You can do this. Focus on shipping messaging that works reliably over feature richness.**

---

# APPENDICES

---

# Appendix A: Environment Setup & Version Requirements

## Recommended Versions (October 2025)

| Component | Version | Notes |
|-----------|---------|-------|
| **Node.js** | 20.19.4+ (LTS 22.20.0 recommended) | Expo SDK 54 requires 20.19.x minimum |
| **npm or Yarn** | Latest | Yarn 1.x recommended for RN |
| **Expo CLI** | Latest (global install) | `npm install -g expo@latest` |
| **React Native** | 0.81 (via Expo SDK 54) | Hermes JS engine (default) |
| **React** | 19.1.0 | Included with Expo SDK 54 |
| **Android SDK** | Platform 35 (API 34+) | Install via Android Studio SDK Manager |
| **Android Build-Tools** | 35.0.0+ | Install via Android Studio |
| **JDK** | 17 (OpenJDK recommended) | Required for Android builds |
| **Xcode** | Latest (macOS only) | For iOS simulator; Command Line Tools required |
| **Watchman** | Latest | Recommended for hot reload performance |

## Installation Steps

### 1. Node.js & npm
```bash
# macOS (via Homebrew)
brew install node@20

# Or use nvm (recommended for version management)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20.19.4
nvm use 20.19.4

# Verify installation
node --version  # v20.19.4+
npm --version   # 10.x+
```

### 2. Expo CLI (Global)
```bash
npm install -g expo@latest
expo --version
```

### 3. Watchman (Recommended for File Watching)
```bash
# macOS
brew install watchman

# Linux (compile from source)
git clone https://github.com/facebook/watchman.git
cd watchman
./build/fbcode_builder/getdeps.py build

# Windows: Not typically needed; skip if not on macOS/Linux
```

### 4. Android Setup (For Emulator)

**Option A: Android Studio (Recommended)**
```bash
# 1. Download Android Studio from developer.android.com
# 2. Install and launch
# 3. Go to SDK Manager (⚙️ icon in bottom right)
#    - Install Platform 35 (Android 15)
#    - Install Build-Tools 35.0.0
#    - Install System Image (Pixel 5 API 34 or API 35)
# 4. Create Virtual Device (AVD)
#    - Device: Pixel 5 or Pixel 6 (good performance balance)
#    - API Level: 34 or 35
#    - RAM: 4GB minimum

# 5. Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export ANDROID_HOME=$HOME/Android/Sdk          # Linux
# Add to ~/.bash_profile or ~/.zshrc for persistence
```

### 5. iOS Setup (macOS Only)

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Or install Xcode from App Store (full IDE)

# Verify installation
xcrun --version
```

### 6. Set Environment Variables

Add to `~/.bash_profile`, `~/.zshrc`, or `~/.env`:

```bash
# Android
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$ANDROID_HOME/emulator:$PATH
export PATH=$ANDROID_HOME/platform-tools:$PATH
export PATH=$ANDROID_HOME/tools:$PATH

# Java (if needed)
export JAVA_HOME=$(/usr/libexec/java_home)  # macOS
```

Then reload:
```bash
source ~/.zshrc  # or ~/.bash_profile
```

### 7. Verify Setup

```bash
# Check all tools
node --version          # v20.19.4+
npm --version           # 10.x+
expo --version          # latest
watchman --version      # latest
adb version             # Android Debug Bridge
xcode-select -p         # /Applications/Xcode.app/Contents/Developer (macOS)

# Try creating a test Expo project
npx create-expo-app TestApp
cd TestApp
npx expo start --android
```

---

# Appendix B: Expo Go & Emulator Testing

## What is Expo Go?

**Expo Go** is a free mobile app (iOS/Android) that runs your React Native Expo project without needing to build a native binary. It's the fastest way to develop and test.

### Download Expo Go
- **iOS:** [App Store](https://apps.apple.com/us/app/expo-go/id982107779)
- **Android:** [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Using Expo Go

```bash
# Start Expo development server
npx expo start

# Output will show:
# ✅ Expo server running
# 📱 Scan this QR code with your phone:
# [QR CODE]

# Option 1: Scan QR code on physical device
# - Open Expo Go app
# - Tap "Scan QR Code"
# - App will load in Expo Go

# Option 2: Press 'a' for Android emulator
# Option 3: Press 'i' for iOS simulator (macOS only)
```

### Expo Go Limitations
- ✅ Works for most apps (99% of use cases)
- ❌ **Does NOT support:**
  - Push notifications (background)
  - Custom native modules
  - Custom C++ code
  - Some advanced native features

**For MessageAI MVP:** Expo Go is perfect. We'll use local notifications instead of FCM (works in Expo Go).

---

## Expo Orbit (Desktop Development Tool)

**Expo Orbit** is a desktop app that streamlines simulator/emulator management from a menu bar. Optional but useful if managing multiple devices.

### Download Orbit
- Download from [GitHub Releases](https://github.com/expo/orbit/releases)
- Supports macOS, Windows, Linux

### Benefits
- One-click launch of iOS simulators / Android emulators
- Drag-and-drop APK/IPA installation
- Quick switcher for multiple devices
- EAS Build integration (download past builds)

### For MVP: Optional
- Not required, but nice to have
- Standard Android Studio / Xcode emulator launch works fine

---

## Android Emulator Setup (Detailed)

### Step 1: Create Virtual Device (AVD)

```bash
# Option A: Via Android Studio GUI
# 1. Open Android Studio
# 2. Click "Virtual Device Manager" (phone icon)
# 3. Click "Create device"
# 4. Choose "Pixel 5" (good balance of speed/realism)
# 5. Select API Level 34 or 35
# 6. Configure:
#    - Name: Pixel_5_API_34
#    - RAM: 4GB (minimum 2GB)
#    - Internal Storage: 2GB
#    - SD Card: 512MB
# 7. Click "Create"

# Option B: Via Command Line
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "system-images;android-34;default;x86_64"

avdmanager create avd \
  -n Pixel_5_API_34 \
  -k "system-images;android-34;default;x86_64" \
  -d "Pixel 5"
```

### Step 2: Launch Android Emulator

```bash
# Using full path
$ANDROID_HOME/emulator/emulator -avd Pixel_5_API_34 -netdelay none -netspeed full

# Or add to PATH and use:
emulator -avd Pixel_5_API_34 -netdelay none -netspeed full

# Options explained:
# -netdelay none  → No simulated network latency
# -netspeed full  → Simulated full network speed (not throttled)

# To list available AVDs:
emulator -list-avds
```

### Step 3: Connect Expo

```bash
# Once emulator is running, in another terminal:
npx expo start --android

# Expo will detect the running emulator and install the app
```

### Android Emulator Performance Tips
- **Use x86_64 or arm64-v8a** system image (faster than armeabi-v7a)
- **Allocate 4GB+ RAM** to the emulator in AVD settings
- **Use SSD** for better performance (not HDD)
- **Close other apps** while emulator runs
- **Enable GPU acceleration** (AVD settings → Graphics: "Automatic" or "Hardware")
- **Restart every 2-3 hours** if sluggish (memory leak in emulator)

### Troubleshooting Android Emulator

| Issue | Solution |
|-------|----------|
| Emulator won't launch | Check ANDROID_HOME is set; reinstall Android SDK via Android Studio |
| App crashes on hot reload | Full restart: kill emulator, relaunch |
| Slow performance | Allocate more RAM; use x86_64 image; enable GPU |
| Can't connect to localhost Firebase | Use `10.0.2.2` instead of `localhost` in Firebase config (emulator can't access host directly) |

---

## iOS Simulator Setup (macOS Only)

### Step 1: Ensure Xcode is Installed

```bash
# Check if Xcode is installed
xcode-select -p
# Output: /Applications/Xcode.app/Contents/Developer

# If not, install Command Line Tools
xcode-select --install

# Or full Xcode from App Store (larger download)
```

### Step 2: Launch iOS Simulator

```bash
# Open simulator
open -a Simulator

# Or use xcrun to launch specific device
xcrun simctl list devices
xcrun simctl boot "iPhone 15"  # Device name

# View available simulators
xcrun simctl list devices
```

### Step 3: Connect Expo

```bash
npx expo start --ios

# Or press 'i' after running 'npx expo start'
```

### iOS Simulator Notes
- **Much slower** than Android emulator (uses macOS virtualization)
- Use **iPhone 14/15** simulator (newer = faster)
- Avoid older iPhone models (they're slower)
- **First launch takes time** (first build is slow; subsequent reloads are fast)

---

## Running on Physical Devices

### Best Option for Accurate Testing

```bash
# 1. Install Expo Go on physical device (App Store / Google Play)

# 2. Ensure device and dev machine are on same WiFi network

# 3. Start Expo dev server
npx expo start

# 4. On physical device:
#    - Open Expo Go app
#    - Tap "Scan QR Code"
#    - Point camera at terminal QR code
#    - App will load on device

# Benefits:
# - Real performance (no emulator overhead)
# - Real network conditions
# - Real notifications (local notifications work)
# - Real app lifecycle (background, foreground)
```

### Tunnel Mode (If Local Network Not Available)

```bash
# Use Expo's tunnel mode (internet-based, slower)
npx expo start --tunnel

# Useful for:
# - Testing from remote locations
# - Unreliable WiFi networks
# - Shared testing with teammates
```

---

# Appendix C: Recommended Expo Modules for MessageAI

All of these are pre-installed with Expo SDK 54 or can be installed via:
```bash
npx expo install <module-name>
```

## Core Modules Used in MessageAI

| Module | Purpose | Already Included? | Quick Setup |
|--------|---------|-------------------|------------|
| **expo-notifications** | Local & push notifications | ✅ Yes | `import * as Notifications from 'expo-notifications'` |
| **expo-vector-icons** | 3,000+ icons (Ionicons, MaterialCommunityIcons) | ✅ Yes | `import { Ionicons } from '@expo/vector-icons'` |
| **expo-status-bar** | Control device status bar (time, battery, etc.) | ✅ Yes | `import { StatusBar } from 'expo-status-bar'` |
| **expo-linking** | Deep linking & URL handling | ✅ Yes | `import * as Linking from 'expo-linking'` |
| **expo-auth-session** | OAuth authentication (Phase 2) | ✅ Yes | `import * as AuthSession from 'expo-auth-session'` |

## Useful for Later Phases

| Module | Purpose | Use Case | Install |
|--------|---------|----------|---------|
| **expo-image-picker** | Pick images from gallery/camera | Media sharing (Phase 2) | `npx expo install expo-image-picker` |
| **expo-camera** | Camera access for photos/QR codes | Video calls or QR scanning (Phase 2) | `npx expo install expo-camera` |
| **expo-location** | GPS/geolocation | Location-based messaging (Phase 2) | `npx expo install expo-location` |
| **expo-av** | Audio/video playback | Voice messages (Phase 2) | `npx expo install expo-av` |
| **expo-contacts** | Access device contacts | Contact sync (Phase 2) | `npx expo install expo-contacts` |

## UI Component Libraries

| Library | Purpose | Install | Why |
|---------|---------|---------|-----|
| **React Native Paper** | Material Design UI components | `npm install react-native-paper` | Pre-made buttons, inputs, dialogs; looks professional |
| **@react-navigation/native** | Navigation framework | `npx expo install @react-navigation/native` | Standard RN routing; required for multi-screen app |
| **react-native-screens** | Performance optimization for navigation | `npx expo install react-native-screens` | Improves navigation performance |

## State Management

| Library | Purpose | Install | Why |
|---------|---------|---------|-----|
| **zustand** | Lightweight state management | `npm install zustand` | Minimal boilerplate; great for simple apps |
| **async-storage** | Key-value persistent storage | `npm install @react-native-async-storage/async-storage` | Store auth tokens, UI state |

---

# Appendix D: Push Notifications Deep Dive

## MVP Approach: Local Notifications (Expo Go Compatible)

Local notifications work in Expo Go without any backend setup. Perfect for MVP.

```javascript
// app.json
{
  "expo": {
    "name": "MessageAI",
    "slug": "messageai",
    "plugins": ["expo-notifications"]  // Important!
  }
}
```

```javascript
// src/services/notificationService.js
import * as Notifications from 'expo-notifications';

// Request notification permissions
export const requestNotificationPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// Schedule local notification
export const scheduleNotification = async (title, body, data = {}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data
    },
    trigger: { seconds: 0 } // Immediate
  });
};

// Listen for user interaction with notification
export const setupNotificationListener = (onNotificationPress) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const { conversationId } = response.notification.request.content.data;
    onNotificationPress(conversationId);
  });
  return subscription;
};
```

Usage in ChatScreen:
```javascript
import { scheduleNotification, setupNotificationListener } from '../services/notificationService';

useEffect(() => {
  // Listen for incoming messages
  const unsubscribe = db.collection('conversations')
    .doc(conversationId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && change.doc.data().senderId !== currentUser.uid) {
          // New message from someone else - notify!
          scheduleNotification(
            change.doc.data().senderName,
            change.doc.data().text,
            { conversationId }
          );
        }
      });
    });
  
  return unsubscribe;
}, [conversationId]);
```

---

## Production Approach: Firebase Cloud Messaging (FCM) + EAS Build

For background notifications (Phase 2), you'll need:

### Step 1: Create Development Build (Not Expo Go)

```bash
# Requires EAS account (free tier available)
npm install -g eas-cli
eas login

# Create development build
eas build --profile development --platform android

# Or for iOS (macOS only)
eas build --profile development --platform ios
```

### Step 2: Configure Firebase Credentials

```bash
# Install expo-notifications if not already
npx expo install expo-notifications

# Configure Firebase credentials
eas credentials
# Follow prompts to:
# - Select Android platform
# - Choose "Firebase Cloud Messaging" (FCM)
# - Paste your Firebase server key from Firebase Console
```

### Step 3: Get Firebase Server Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Settings ⚙️ → Project Settings
4. Cloud Messaging tab
5. Copy "Server API Key"
6. Paste into `eas credentials` prompt

### Step 4: Send Notifications from Backend

**Node.js Example:**

```javascript
// server.js (Cloud Function or Node.js backend)
const admin = require('firebase-admin');

admin.initializeApp();

// Listen for new messages
exports.notifyNewMessage = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { conversationId } = context.params;
    
    // Get recipient's FCM token
    const recipients = message.recipientIds || [];
    
    for (const recipientId of recipients) {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(recipientId)
        .get();
      
      const fcmToken = userDoc.data()?.fcmToken;
      if (!fcmToken) continue;
      
      // Send notification
      await admin.messaging().send({
        notification: {
          title: message.senderName,
          body: message.text
        },
        data: {
          conversationId,
          messageId: snap.id
        },
        token: fcmToken
      });
    }
  });
```

### Step 5: Store FCM Tokens in Firestore

```javascript
// In app.js or auth screen after login
import { getMessaging, getToken } from 'firebase/messaging';

const setupFCMToken = async (userId) => {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging);
    
    // Store token in Firestore
    await db.collection('users').doc(userId).update({
      fcmToken: token
    });
  } catch (error) {
    console.error('FCM setup error:', error);
  }
};

// Call after successful login
setupFCMToken(currentUser.uid);
```

### Important Limitations for MVP

| Feature | Expo Go | Development Build | Full Build |
|---------|---------|------------------|-----------|
| Local notifications | ✅ Works | ✅ Works | ✅ Works |
| Foreground FCM | ❌ No | ✅ Works | ✅ Works |
| Background notifications | ❌ No | ✅ Works | ✅ Works |
| Production ready | ❌ No | ❌ Development only | ✅ Yes |

**For MVP:** Use local notifications only (works in Expo Go, no backend needed).

---

# Appendix E: React vs React Native Quick Reference

## Core Differences

### Components

```jsx
// React (Web)
<div>Hello</div>                    // DOM element
<button onClick={...}>Click</button>

// React Native (Mobile)
<View>Hello</View>                  // Native UIView / ViewGroup
<Pressable onPress={...}>Click</Pressable>
```

### Styling

```jsx
// React (Web)
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    color: 'blue',
    backgroundColor: '#fff',
    marginTop: '10px'     // Can use units like px, %, em
  }
};

// React Native (Mobile)
const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',  // Same!
    color: 'blue',         // Most CSS properties work
    backgroundColor: '#fff',
    marginTop: 10          // Numbers only! No units. Defaults to DPs (density-independent pixels)
  }
});

// Apply: <View style={styles.container} />
```

### Navigation

```jsx
// React (Web) - Browser history
import { BrowserRouter, Routes, Route } from 'react-router-dom';
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/chat/:id" element={<Chat />} />
</Routes>

// React Native (Mobile) - Stack/Tab navigation
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
<Stack.Navigator>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Chat" component={ChatScreen} />
</Stack.Navigator>
```

### API Calls

```jsx
// React (Web)
const response = await fetch('/api/messages');
const data = await response.json();

// React Native (Mobile) - Same!
const response = await fetch('https://myapi.com/messages');
const data = await response.json();
```

### Local Storage

```jsx
// React (Web)
localStorage.setItem('token', 'abc123');
const token = localStorage.getItem('token');

// React Native (Mobile)
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('token', 'abc123');
const token = await AsyncStorage.getItem('token');
```

### Permissions

```jsx
// React (Web)
// Integrated into browser API
const location = await navigator.geolocation.getCurrentPosition(...);

// React Native (Mobile)
import { Location } from 'expo-location';
const { status } = await Location.requestForegroundPermissionsAsync();
const location = await Location.getCurrentPositionAsync({});
```

### Touch Events

```jsx
// React (Web)
<div onClick={() => alert('clicked')} />

// React Native (Mobile)
<Pressable onPress={() => alert('pressed')}>
  <Text>Press me</Text>
</Pressable>
```

## Key Concepts That Translate Directly

| Concept | React (Web) | React Native (Mobile) | Status |
|---------|-------------|----------------------|--------|
| **Components** | `function Component() {}` | `function Component() {}` | ✅ Same |
| **Hooks** | `useState`, `useEffect`, etc. | `useState`, `useEffect`, etc. | ✅ Same |
| **JSX** | `<div>Hello</div>` | `<Text>Hello</Text>` | ✅ Same syntax |
| **Props** | `<Component prop="value" />` | `<Component prop="value" />` | ✅ Same |
| **State Management** | Redux, Zustand, Context API | Redux, Zustand, Context API | ✅ Same libraries |
| **Async/Await** | `await fetch()` | `await fetch()` | ✅ Same |
| **Array Methods** | `.map()`, `.filter()`, etc. | `.map()`, `.filter()`, etc. | ✅ Same |

## Key Differences to Remember

| Feature | React (Web) | React Native (Mobile) |
|---------|-------------|----------------------|
| **DOM** | Virtual DOM → Real DOM | Virtual DOM → Native Views |
| **Styling** | CSS with units (px, %, em) | StyleSheet with numbers only |
| **Navigation** | Browser history (URL-based) | Stack/Tab navigation (imperative) |
| **Storage** | localStorage (synchronous) | AsyncStorage (asynchronous) |
| **Permissions** | Built into browser | Must request explicitly |
| **Network** | CORS concerns | No CORS (native layer) |
| **Scrolling** | CSS overflow | `<ScrollView>` or `<FlatList>` component |
| **Threading** | Single-threaded (main thread) | Single-threaded (JavaScript thread) but can offload to native |

## Common Pitfalls for Web Developers

❌ **Don't do this:**
```jsx
<div style={{ width: '100px' }}>Wrong!</div>  // Units not allowed
<span>Not on mobile</span>                     // `span` doesn't exist in RN
onClick={() => {}}                            // Use onPress instead
localStorage.getItem('key')                   // Use AsyncStorage (async!)
```

✅ **Do this instead:**
```jsx
<View style={{ width: 100 }}>Correct!</View>  // Numbers only
<Text>On mobile</Text>                        // Use Text component
onPress={() => {}}                            // RN touch event
await AsyncStorage.getItem('key')             // Asynchronous
```

---

**End of Document**

This PRD is comprehensive and ready for development. Good luck with MessageAI MVP! 🚀
