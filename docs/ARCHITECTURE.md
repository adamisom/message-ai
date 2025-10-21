# MessageAI - Architecture Overview

**Version:** 1.0 (MVP)  
**Last Updated:** October 2025

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT NATIVE CLIENT                       │
│                    (Expo Managed + Expo Go)                  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                     UI Layer                            │ │
│  │  • Screens (Expo Router file-based routing)            │ │
│  │  • Components (React Native + React Native Paper)      │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  State Management                       │ │
│  │  • Zustand (global: auth, conversations)               │ │
│  │  • Component State (local: messages, UI)               │ │
│  │  • AsyncStorage (persistence)                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Services Layer                        │ │
│  │  • authService.ts (authentication logic)               │ │
│  │  • firestoreService.ts (data queries)                  │ │
│  │  • notificationService.ts (local notifications)        │ │
│  │  • presenceService.ts (online/offline tracking)        │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                Firebase Web SDK                         │ │
│  │  • Firebase Auth API                                    │ │
│  │  • Firestore SDK (with offline persistence)            │ │
│  │  • Real-time listeners (onSnapshot)                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTPS/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE BACKEND                          │
│                    (Google Cloud Platform)                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Firebase Authentication                    │ │
│  │  • Email/Password provider                             │ │
│  │  • User session management                             │ │
│  │  • Token generation/validation                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            Cloud Firestore (NoSQL Database)            │ │
│  │  • Real-time sync engine                               │ │
│  │  • Offline persistence cache                           │ │
│  │  • Security rules engine                               │ │
│  │                                                         │ │
│  │  Collections:                                          │ │
│  │    /users/{uid}                                        │ │
│  │    /conversations/{convId}                             │ │
│  │    /conversations/{convId}/messages/{msgId}            │ │
│  │    /conversations/{convId}/typingUsers/{userId}        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend (React Native)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Expo SDK** | 54.0.0 | Development platform, managed workflow |
| **React** | 19.1.0 | UI framework |
| **React Native** | 0.81 | Mobile app framework |
| **Expo Router** | 6.0.13 | File-based navigation (Next.js-style) |
| **Expo Go** | Latest | Development/testing app (no native build needed) |
| **TypeScript** | 5.9.2 | Type safety |

### State & Storage

| Technology | Purpose |
|------------|---------|
| **Zustand** | Lightweight global state (auth, conversations) |
| **AsyncStorage** | Local persistent storage (session, settings) |
| **Component State** | Screen-specific state (messages, forms, UI) |

### UI & Utilities

| Technology | Purpose |
|------------|---------|
| **React Native Paper** | Pre-built Material Design components |
| **Expo Vector Icons** | 3,000+ icons (Ionicons, Material, etc.) |
| **NetInfo** | Network status detection (online/offline) |
| **Expo Notifications** | Local notifications (foreground) |

### Backend (Firebase)

| Service | Purpose |
|---------|---------|
| **Firebase Authentication** | Email/password authentication |
| **Cloud Firestore** | Real-time NoSQL database |
| **Firebase Web SDK** | Client library (v10+) |
| **Firestore Offline Persistence** | Local cache for offline support |

---

## Project File Structure

```
message-ai/
│
├── app/                                    # Expo Router screens
│   ├── _layout.tsx                        # Root: auth guard, presence, notifications
│   ├── index.tsx                          # Landing: redirect based on auth
│   │
│   ├── (auth)/                            # Auth screens (grouped)
│   │   ├── _layout.tsx                    # Auth stack layout
│   │   ├── login.tsx                      # Login screen
│   │   └── register.tsx                   # Register screen
│   │
│   ├── (tabs)/                            # Main app (tab navigation)
│   │   ├── _layout.tsx                    # Tabs layout
│   │   ├── index.tsx                      # Conversations list screen
│   │   └── new-chat.tsx                   # New chat creation screen
│   │
│   └── chat/
│       └── [id].tsx                       # Dynamic chat screen (1-on-1 & groups)
│
├── components/                            # Reusable UI components
│   ├── MessageBubble.tsx                  # Single message display
│   ├── MessageList.tsx                    # FlatList of messages
│   ├── MessageInput.tsx                   # Text input + send button
│   ├── ConversationItem.tsx               # Conversation list item
│   ├── TypingIndicator.tsx                # "User is typing..."
│   ├── UserStatusBadge.tsx                # Online/offline indicator
│   └── OfflineBanner.tsx                  # Network offline warning
│
├── store/                                 # Zustand state stores
│   ├── authStore.ts                       # Global: user, loading, session
│   └── chatStore.ts                       # Global: conversations, online statuses
│
├── services/                              # Business logic & Firebase interactions
│   ├── authService.ts                     # Register, login, logout, profiles
│   ├── firestoreService.ts                # Queries, mutations, message sending
│   ├── notificationService.ts             # Local notification triggers
│   └── presenceService.ts                 # Online/offline tracking
│
├── utils/                                 # Helper functions & constants
│   ├── constants.ts                       # App-wide constants (limits, timeouts)
│   ├── validators.ts                      # Input validation (email, password)
│   └── timeFormat.ts                      # Timestamp formatting utilities
│
├── firebase.config.js                     # Firebase initialization + offline persistence
├── .env                                   # Firebase credentials (gitignored)
├── app.json                               # Expo configuration
└── package.json                           # Dependencies
```

---

## Data Architecture

### Firestore Schema

#### `/users/{uid}`
```typescript
{
  email: string,                  // Lowercase, used for discovery
  displayName: string,            // User-chosen nickname
  isOnline: boolean,              // Real-time presence
  lastSeenAt: Timestamp,          // Server timestamp
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `/conversations/{conversationId}`
```typescript
{
  type: "direct" | "group",       // Conversation type
  name?: string,                  // Group name (optional for direct)
  participants: [uid1, uid2, ...], // Array of user IDs
  participantDetails: {           // Denormalized user info
    uid1: { displayName, email },
    uid2: { displayName, email }
  },
  lastMessageAt: Timestamp,       // For sorting conversations
  lastMessage: string,            // Preview text (max 100 chars)
  lastRead: {                     // Last-read tracking per user
    uid1: messageId,
    uid2: messageId
  },
  createdAt: Timestamp,
  creatorId?: string              // Group creator (for groups only)
}
```

#### `/conversations/{conversationId}/messages/{messageId}`
```typescript
{
  text: string,                   // Message content
  senderId: string,               // User ID of sender
  senderName: string,             // Denormalized for performance
  participants: [uid1, uid2, ...], // Denormalized for security rules
  createdAt: Timestamp            // Server timestamp (CRITICAL)
}
```

#### `/conversations/{conversationId}/typingUsers/{userId}`
```typescript
{
  uid: string,                    // User ID
  displayName: string,            // User's display name
  at: Timestamp                   // When they started typing
}
```

### Data Flow Patterns

#### 1. Message Sending (Optimistic Update)
```
User types message
    ↓
1. Add temp message to local state (status: "sending")
    ↓
2. Write to Firestore with serverTimestamp()
    ↓
3. Firestore real-time listener receives new message
    ↓
4. Remove temp message, display real message
    ↓
5. Update conversation.lastMessage & lastMessageAt
```

#### 2. Real-Time Sync (Firestore Listeners)
```
Component mounts
    ↓
1. Set up onSnapshot() listener
    ↓
2. Firestore pushes updates via WebSocket
    ↓
3. Update local state
    ↓
4. React re-renders UI
    ↓
Component unmounts → unsubscribe() (CRITICAL)
```

#### 3. Offline Behavior
```
Network disconnects
    ↓
1. NetInfo detects offline state
    ↓
2. Show offline banner
    ↓
3. Messages marked as "queued"
    ↓
4. Firestore caches writes locally
    ↓
Network reconnects
    ↓
5. Firestore auto-syncs queued writes
    ↓
6. Hide offline banner
    ↓
7. Messages show "sent" status
```

---

## Key Architectural Decisions

### 1. Hybrid State Management

**Decision:** Zustand for global, Component State for local

**Why:**
- Better performance (fewer re-renders)
- Cleaner separation of concerns
- Component state auto-cleans on unmount

**Implementation:**
- **Zustand:** Auth state, conversations list, online statuses
- **Component State:** Messages, form inputs, UI states, typing indicators

### 2. Last-Read Tracking (Not Per-Message Read Receipts)

**Decision:** Store `lastReadMessageId` per user per conversation

**Why:**
- Single Firestore write per conversation (vs N writes for N messages)
- Simpler queries
- Sufficient for MVP

**Trade-off:** Can't show "Alice read message #5 but not #6" granularity (acceptable)

### 3. Denormalized Participants in Messages

**Decision:** Each message includes `participants: [uid1, uid2, ...]`

**Why:**
- Firestore security rules can check permissions without extra `get()` calls
- Faster permission checks
- Lower cost

**Trade-off:** ~100 bytes per message (minimal overhead)

### 4. Server Timestamps (CRITICAL)

**Decision:** ALWAYS use `serverTimestamp()`, NEVER client `new Date()`

**Why:**
- Client clocks are unreliable (timezones, user changes)
- Message ordering breaks with client timestamps
- Firestore guarantees consistent server time

**Implementation:**
```typescript
// ✅ CORRECT
createdAt: serverTimestamp()

// ❌ WRONG - Will break message ordering
createdAt: new Date()
```

### 5. Typing Indicator Debounce (500ms)

**Decision:** Update typing status max once per 500ms

**Why:**
- Balance between responsiveness and Firestore write costs
- Clear after 500ms inactivity or on send

### 6. Message Timeout Detection (10 seconds)

**Decision:** Mark message as "failed" if not sent within 10 seconds

**Why:**
- Distinguish "queued" (offline) vs "failed" (error/timeout)
- Better user feedback than indefinite "sending"

---

## Client-Server Interactions

### Authentication Flow

```
User registers/logs in
    ↓
1. Client: Firebase Auth createUser/signIn (HTTPS)
    ↓
2. Server: Validates credentials
    ↓
3. Server: Returns auth token + user ID
    ↓
4. Client: Creates/fetches Firestore user doc
    ↓
5. Client: Stores in Zustand + AsyncStorage
    ↓
6. Client: Sets user online (isOnline: true)
```

### Message Sending Flow

```
User sends message
    ↓
1. Client: Optimistic update (add to UI immediately)
    ↓
2. Client: Firestore addDoc() to messages subcollection (HTTPS → WebSocket)
    ↓
3. Server: Firestore receives write request
    ↓
4. Server: Applies security rules check
    ↓
5. Server: Writes to database with serverTimestamp()
    ↓
6. Server: Broadcasts change to all listeners (WebSocket)
    ↓
7. Client (all participants): onSnapshot() callback fires
    ↓
8. Client: Update UI with real message, remove temp
```

### Real-Time Listening (Firestore onSnapshot)

```
Screen mounts
    ↓
1. Client: Set up onSnapshot() listener (WebSocket)
    ↓
2. Server: Initial data sent (all existing docs)
    ↓
3. Client: Render initial state
    ↓
[Loop while mounted]
    ↓
4. Server: Doc added/modified/deleted
    ↓
5. Server: Push update via WebSocket
    ↓
6. Client: onSnapshot() callback with docChanges()
    ↓
7. Client: Update state, trigger re-render
    ↓
[On unmount]
    ↓
8. Client: unsubscribe() - close WebSocket
```

### Presence Tracking

```
App state changes (active ↔ background)
    ↓
1. Client: AppState listener detects change
    ↓
2. Client: Update Firestore user doc
    - Active: { isOnline: true, lastSeenAt: serverTimestamp() }
    - Background: { isOnline: false, lastSeenAt: serverTimestamp() }
    ↓
3. Server: Firestore updates user doc
    ↓
4. Server: Broadcast to listeners
    ↓
5. Other clients: onSnapshot() on user doc receives update
    ↓
6. Other clients: Update UI (online indicator changes)
```

---

## Network Architecture

### Connection Types

| Service | Protocol | Purpose |
|---------|----------|---------|
| Firebase Auth | HTTPS | Token generation, validation |
| Firestore Writes | HTTPS → WebSocket | Initial write, then real-time updates |
| Firestore Reads (one-time) | HTTPS | Single query (getDocs, getDoc) |
| Firestore Reads (real-time) | WebSocket | onSnapshot() listeners |
| Offline Persistence | Local IndexedDB | Cache for offline operation |

### Offline Architecture

```
[Online Mode]
Client ←WebSocket→ Firestore
   ↓
Client writes → Firestore → Broadcast to listeners

[Going Offline]
Client detects disconnect (NetInfo)
   ↓
Firestore SDK buffers writes in IndexedDB cache
   ↓
UI shows "queued" status

[Coming Online]
Client reconnects
   ↓
Firestore SDK auto-flushes buffered writes
   ↓
Real-time listeners receive updates
   ↓
UI updates to "sent" status
```

---

## Security Architecture

### Authentication

- **Method:** Email/password (Firebase Auth)
- **Session:** Firebase auth token (auto-refreshed)
- **Persistence:** AsyncStorage stores user object locally
- **Logout:** Clear Firestore, AsyncStorage, Zustand

### Authorization (Firestore Security Rules)

**MVP Rules (Test Mode - INSECURE):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Production Rules (Phase 7):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read all, only update their own
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    
    // Conversations: participants only
    match /conversations/{conversationId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      allow update: if request.auth.uid in resource.data.participants;
    }
    
    // Messages: check denormalized participants array
    match /conversations/{conversationId}/messages/{messageId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null && 
                      request.auth.uid in request.resource.data.participants;
    }
    
    // Typing: only your own
    match /conversations/{conversationId}/typingUsers/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### Data Validation

**Client-side:**
- Email format validation
- Password length (6+ chars)
- Display name required
- Message text non-empty

**Server-side (Firestore Rules):**
- Authentication required
- Participant membership checked
- User can only write as themselves

---

## Performance Optimizations

### 1. Message Pagination
- Load last 100 messages per conversation (not all)
- Uses Firestore `limit(100)` query
- Infinite scroll pagination: Phase 2

### 2. Typing Indicator Debounce
- Max 1 update per 500ms (not per keystroke)
- Reduces Firestore writes by ~90%

### 3. Denormalized Data
- `senderName` copied into message (avoid user lookup)
- `participants` array in messages (faster security checks)
- `participantDetails` in conversations (avoid multiple user queries)

### 4. Component State for Messages
- Messages stored in component state (not Zustand)
- Automatic cleanup on unmount
- Fewer re-renders in other components

### 5. Firestore Offline Persistence
- IndexedDB cache on client
- Works offline automatically
- Reduces server reads by ~70%

---

## Development Workflow

### Local Development

```bash
# Start Expo dev server
npx expo start

# Start with tunnel (for physical devices)
npx expo start --tunnel

# Android emulator
npx expo start --android

# iOS simulator (macOS)
npx expo start --ios

# Clear cache
npx expo start --clear
```

### Testing
- **Emulator:** Android Studio AVD / iOS Simulator
- **Physical Device:** Expo Go app (scan QR code)
- **Network Testing:** NetInfo + airplane mode
- **Multi-user Testing:** Multiple emulators/devices

### Deployment
- **MVP:** Expo Go only (no build needed)
- **Production (Phase 2):** EAS Build for standalone apps

---

## Limitations & Constraints

### MVP Limitations

| Feature | MVP Status | Phase 2 |
|---------|-----------|---------|
| Background push notifications | ❌ Local only | ✅ FCM + EAS Build |
| Infinite scroll (old messages) | ❌ Last 100 only | ✅ Pagination |
| Message editing/deletion | ❌ Not supported | ✅ Planned |
| Media uploads (images, files) | ❌ Not supported | ✅ Planned |
| End-to-end encryption | ❌ Not supported | ✅ Planned |
| Username system | ❌ Email only | ✅ Planned |

### Technical Constraints

- **Expo Go:** No custom native modules
- **Firestore:** 1MB max doc size (messages are small, not an issue)
- **Firestore:** 500 writes/sec/doc (typing indicators could hit this)
- **AsyncStorage:** 6MB limit on Android (sufficient for session data)

---

## Monitoring & Debugging

### Tools

| Tool | Purpose |
|------|---------|
| Expo DevTools | Hot reload, logs, performance |
| Firebase Console | Database browser, auth users, rules playground |
| React DevTools | Component hierarchy, props, state |
| Chrome DevTools | Network tab, console logs |
| Reactotron (optional) | Redux-like state inspection for Zustand |

### Logging Strategy

```typescript
// Development
console.log('User logged in:', user.uid);

// Production (Phase 2)
// Use Firebase Analytics or Sentry
```

---

## Scaling Considerations (Post-MVP)

### Performance
- **If conversations > 1000:** Implement pagination
- **If messages > 1000/conversation:** Implement infinite scroll
- **If typing indicators > 50 writes/sec:** Increase debounce

### Cost Optimization
- **Firestore reads:** Aggressive caching, longer TTL
- **Firestore writes:** Batch operations, reduce typing indicator frequency
- **Storage:** Add Firestore quota alerts

### Reliability
- **Add retry logic** for failed messages
- **Add connection recovery** for long disconnects
- **Add data sync verification** after offline periods

---

## Summary

**Architecture Type:** Client-Server with Real-Time Sync

**Key Technologies:**
- **Frontend:** React Native + Expo
- **Backend:** Firebase (Authentication + Firestore)
- **State:** Hybrid (Zustand + Component State)
- **Routing:** Expo Router (file-based)

**Core Patterns:**
- Real-time listeners with cleanup
- Optimistic UI updates
- Server timestamps for consistency
- Denormalized data for performance
- Offline-first with local cache

**Critical Rules:**
1. Always use `serverTimestamp()`
2. Always unsubscribe from listeners
3. Never upgrade pinned dependencies
4. Test offline behavior thoroughly

---

**For detailed implementation, see:**
- `PHASE_0_SETUP.md` through `PHASE_7` (when created)
- `FILE_STRUCTURE_GUIDE.md` for code examples
- `QUICK_REFERENCE.md` for patterns
- `mvp-prd-plus.md` for full requirements

