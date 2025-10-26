# MessageAI

**Intelligent team messaging with AI-powered features**

A production-ready React Native messaging app with real-time communication and 6 AI-powered features for productivity. Built with Expo, Firebase, and Claude AI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tests](https://img.shields.io/badge/tests-265%20passing-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey.svg)

---

## ✨ Key Features

### 🔥 Core Messaging
- **Real-time messaging** with instant delivery
- **Direct & group chats** with participant management
- **Read receipts** with detailed read status in group chats
- **Typing indicators** with presence tracking
- **Online/offline status** for all participants
- **Local notifications** with conversation deep links
- **Offline support** with message retry/delete

### 🤖 AI-Powered Productivity (6 Features)

1. **📝 Thread Summarization**
   - Generate AI summaries of long conversations
   - Configurable message count (10, 25, 50, 100)
   - Extracts key points and main topics

2. **🔍 Semantic Search**
   - Search by meaning, not just keywords
   - Powered by embeddings (OpenAI + Pinecone)
   - Fast vector similarity search

3. **✅ Action Items Extraction**
   - Auto-detects tasks from conversations
   - Assigns to participants
   - Tracks completion status
   - Priority levels (high/medium/low)

4. **🎯 Priority Detection**
   - Automatically flags urgent messages
   - Visual badges for high-priority items
   - Background processing pipeline

5. **📊 Decision Tracking**
   - Captures key decisions from discussions
   - Confidence scoring for decisions
   - Searchable decision history

6. **📅 Smart Meeting Scheduler**
   - Analyzes scheduling discussions
   - Suggests 3 optimal meeting times
   - Provides reasoning for each suggestion
   - Copy-to-clipboard for quick sharing

### 🛡️ Production-Ready Error Handling
- **3-tier error boundaries** (app, screen, feature)
- **User-friendly error messages** (technical → plain language)
- **Message retry/delete** for failed sends
- **AsyncStorage persistence** (last 100 errors, last 50 failed messages)
- **Developer logging** with context and stack traces

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Screens (Expo Router)                                 │ │
│  │  - Auth (login, register)                              │ │
│  │  - Conversations List                                  │ │
│  │  - Chat Screen (messages + AI features)               │ │
│  │  - New Chat (direct + group)                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Components                                            │ │
│  │  - MessageList, MessageBubble, MessageInput           │ │
│  │  - AI Modals (Summary, Search, Actions, etc.)        │ │
│  │  - Error Boundaries & Fallbacks                       │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Services                                              │ │
│  │  - authService, firestoreService                      │ │
│  │  - aiService (Cloud Functions wrapper)                │ │
│  │  - presenceService, notificationService               │ │
│  │  - errorLogger, failedMessagesService                 │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  State (Zustand + AsyncStorage)                       │ │
│  │  - authStore, chatStore                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Backend                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Firebase Authentication                               │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Cloud Firestore                                       │ │
│  │  - /users, /conversations, /messages                  │ │
│  │  - /typingUsers, /ai_summaries, /ai_action_items     │ │
│  │  - Real-time listeners, participant-based security    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Cloud Functions (Node.js + TypeScript)               │ │
│  │  - AI features (summarize, search, actions, etc.)     │ │
│  │  - Rate limiting, caching, embeddings pipeline        │ │
│  │  - Security validation                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  External AI Services                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Anthropic       │  │  OpenAI          │                │
│  │  Claude 3.5      │  │  text-embedding  │                │
│  │  (Sonnet)        │  │  -3-small        │                │
│  │  - Summarization │  │  - Embeddings    │                │
│  │  - Extraction    │  │                  │                │
│  │  - Analysis      │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐                                       │
│  │  Pinecone        │                                       │
│  │  Vector DB       │                                       │
│  │  - Semantic      │                                       │
│  │    search        │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

**See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed documentation.**

---

## 🚀 Tech Stack

### Frontend
- **React Native** 0.81 with Expo SDK 54
- **Expo Router** (file-based navigation)
- **TypeScript** for type safety
- **Zustand** for state management
- **AsyncStorage** for persistence

### Backend
- **Firebase Authentication** (email/password)
- **Cloud Firestore** (NoSQL database)
- **Cloud Functions** (Node.js 20 + TypeScript)
- **Firebase Admin SDK** for server-side operations

### AI Services
- **Anthropic Claude 3.5 Sonnet** (summarization, extraction, analysis)
- **OpenAI text-embedding-3-small** (semantic embeddings)
- **Pinecone** (vector database for semantic search)

### Testing & Quality
- **Jest** (265 tests: 212 backend + 53 frontend)
- **ESLint** with TypeScript rules
- **TypeScript** strict mode
- **Firebase Emulator** for integration tests

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 20+ (use `nvm use` to auto-select)
- Expo CLI
- Firebase CLI (`npm install -g firebase-tools`)
- iOS Simulator (Mac) or Android Emulator

### 1. Clone & Install

```bash
git clone <repository-url>
cd message-ai
npm install
```

### 2. Configure Environment Variables

Create `.env` in project root:

```env
# Firebase Config (from Firebase Console)
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI Services (Optional - only needed for AI features)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=messageai-embeddings
```

**See [PHASE_0_SETUP.md](docs/mvp/PHASE_0_SETUP.md) for detailed Firebase setup guide.**

### 3. Deploy Backend

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions (for AI features)
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 4. Run the App

```bash
npx expo start
```

Then press:
- `i` for iOS Simulator
- `a` for Android Emulator
- Scan QR code for physical device

---

## 🧪 Testing

### Run All Tests

```bash
npm run validate  # Lint + type-check + all tests
```

### Unit Tests (Frontend + Backend)

```bash
npm test          # Run all unit tests (265 tests)
cd functions && npm test  # Backend only (212 tests)
```

### Integration Tests (Firebase Emulator)

```bash
# Terminal 1: Start emulator
firebase emulators:start

# Terminal 2: Run tests
npm run test:integration
```

**What's Tested:**
- Rate limiting (per-user, per-conversation, global)
- Caching (age-based, message-count invalidation)
- Security (participant validation, access control)
- Error handling (translation, logging, retry/delete)
- Message array operations (pagination, deduplication)

### Performance Testing

```bash
# Create 1500-message test conversation
node scripts/createPerformanceTestData.js

# Test burst performance (10 messages in 2 seconds)
node scripts/testMessageBurst.js perf_test_1500

# Cleanup test data
node scripts/cleanupPerformanceTestData.js
```

**See [PERFORMANCE_TEST_RESULTS.md](docs/phase3-full-implementation/PERFORMANCE_TEST_RESULTS.md) for benchmarks.**

---

## 📚 AI Features Documentation

### 1. Thread Summarization

**Purpose:** Generate concise summaries of long conversations.

**How to Use:**
1. Open any conversation
2. Tap the ✨ AI menu button
3. Select "Summarize Thread"
4. Choose message count (10/25/50/100)
5. View summary with key points

**Implementation:**
- Cloud Function: `functions/src/ai/threadSummary.ts`
- Client: `components/SummaryModal.tsx`
- Caching: 1 hour (invalidates on new messages)

---

### 2. Semantic Search

**Purpose:** Search by meaning, not just keywords.

**How to Use:**
1. Open any conversation
2. Tap the 🔍 search icon
3. Enter natural language query
4. View semantically relevant results

**Example Queries:**
- "When is the deadline?" → Finds deadline mentions
- "Who's working on the API?" → Finds API discussions
- "Budget approval status" → Finds budget-related messages

**Implementation:**
- Embeddings: OpenAI `text-embedding-3-small`
- Vector DB: Pinecone (1536 dimensions)
- Background pipeline: Auto-embeds new messages
- Cloud Function: `functions/src/ai/semanticSearch.ts`

---

### 3. Action Items Extraction

**Purpose:** Automatically detect and track tasks from conversations.

**How to Use:**
1. Open any conversation
2. Tap ✨ AI menu → "Extract Action Items"
3. View detected tasks with:
   - Task description
   - Assigned person
   - Priority (high/medium/low)
   - Due date (if mentioned)
   - Completion status

**Features:**
- Auto-assignment based on mentions
- Priority detection (urgent keywords)
- Toggle completion status
- Persistent in Firestore

**Implementation:**
- Cloud Function: `functions/src/ai/actionItems.ts`
- Caching: 15 minutes
- Client: `components/ActionItemsModal.tsx`

---

### 4. Priority Detection

**Purpose:** Auto-flag urgent messages for quick triage.

**How to Use:**
- Happens automatically in background
- High-priority messages show 🔴 badge
- Detects: "urgent", "asap", "critical", deadlines

**Implementation:**
- Background pipeline: Batch analysis every 15 minutes
- Quick heuristic + Claude analysis
- Firestore: `messages/{id}.priority` field
- Visual: Priority badges in message bubbles

---

### 5. Decision Tracking

**Purpose:** Capture and track key decisions from discussions.

**How to Use:**
1. Open any conversation
2. Tap ✨ AI menu → "Track Decisions"
3. View captured decisions with:
   - Decision statement
   - Confidence level
   - Context/reasoning
   - Timestamp

**Implementation:**
- Cloud Function: `functions/src/ai/decisionTracking.ts`
- Caching: 1 hour
- Client: `components/DecisionsModal.tsx`

---

### 6. Smart Meeting Scheduler

**Purpose:** Analyze scheduling discussions and suggest meeting times.

**How to Use:**
1. Have a conversation about scheduling
2. Tap ✨ AI menu → "Suggest Meeting Times"
3. View 3 suggested times with reasoning
4. Tap "Copy All" to paste into calendar app

**Features:**
- Analyzes last 50 messages
- Considers mentioned availability
- Provides confidence scores
- Accounts for constraints

**Implementation:**
- Cloud Function: `functions/src/ai/proactiveMeeting.ts`
- Uses Claude Tool Use API
- Client: `components/MeetingSchedulerModal.tsx`

---

## 🛠️ Development

### Project Structure

```
message-ai/
├── app/                      # Expo Router screens
│   ├── (auth)/              # Login, register
│   ├── (tabs)/              # Conversations list, new chat
│   ├── chat/[id].tsx        # Main chat screen
│   └── _layout.tsx          # Root layout (error boundary)
├── components/               # UI components
│   ├── MessageList.tsx      # Inverted FlatList for messages
│   ├── MessageBubble.tsx    # Individual message UI
│   ├── AI modals/           # 6 AI feature modals
│   ├── ErrorBoundary.tsx    # Error handling
│   └── ErrorFallback.tsx    # Error UI components
├── services/                 # Business logic
│   ├── aiService.ts         # Cloud Functions wrapper
│   ├── authService.ts       # Firebase Auth
│   ├── firestoreService.ts  # Firestore operations
│   ├── errorLogger.ts       # AsyncStorage error logging
│   └── failedMessagesService.ts  # Message retry
├── store/                    # Zustand state
│   ├── authStore.ts         # User session
│   └── chatStore.ts         # Conversations list
├── utils/                    # Helpers
│   ├── errorTranslator.ts   # User-friendly errors
│   ├── timeFormat.ts        # Smart date formatting
│   └── constants.ts         # App constants
├── functions/                # Cloud Functions
│   └── src/
│       ├── ai/              # 6 AI feature functions
│       ├── embeddings/      # Background pipeline
│       └── index.ts         # Function exports
└── docs/                     # Documentation
    ├── ARCHITECTURE.md      # Detailed architecture
    ├── phase2-ai-spike/     # AI implementation docs
    └── phase3-full-implementation/  # Final sprint docs
```

### Code Quality

```bash
npm run lint          # ESLint
npm run type-check    # TypeScript
npm run validate      # All checks + tests
```

### Git Workflow

- Commit messages follow conventional commits
- All features tested before commit
- Validation passes before push
- No force pushes to main

---

## 📊 Performance

### Benchmarks (1500-message conversation)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Message delivery | <200ms | ~150ms | ✅ |
| Scroll performance | 60 FPS | Smooth | ✅ |
| Initial render | <500ms | ~300ms | ✅ |
| Burst handling (10msg/2s) | No jank | Smooth | ✅ |

### Optimizations
- **Inverted FlatList** for natural chat scrolling
- **Pagination** (100 messages initially, load more on scroll)
- **Deduplication** for real-time + paginated data
- **Efficient array operations** (sub-millisecond prepend/append)

**See [PERFORMANCE_TEST_RESULTS.md](docs/phase3-full-implementation/PERFORMANCE_TEST_RESULTS.md) for details.**

---

## 🐛 Troubleshooting

### Common Issues

**"Firebase config missing"**
- Ensure `.env` file exists in project root
- Variables must start with `EXPO_PUBLIC_`
- Restart dev server after adding `.env`

**"Cloud Functions not working"**
- Deploy functions: `cd functions && firebase deploy --only functions`
- Check API keys in Firebase Console → Functions → Configuration
- View logs: `firebase functions:log`

**"Tests failing"**
- Clear cache: `npm test -- --clearCache`
- For integration tests: Ensure emulator is running
- Check Node version: `node -v` (should be 20+)

**See [DEVELOPER_SETUP.md](docs/mvp/DEVELOPER_SETUP.md) for comprehensive troubleshooting.**

---

## 📖 Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design, data flow, security
- **[Phase 2 AI Spike](docs/phase2-ai-spike/README.md)** - AI implementation details
- **[Phase 3 Full Implementation](docs/phase3-full-implementation/REFINED-PRD-OCT26.md)** - Final sprint PRD
- **[Testing Guide](docs/phase2-ai-spike/INTEGRATION_TESTS.md)** - Integration test documentation
- **[Performance Results](docs/phase3-full-implementation/PERFORMANCE_TEST_RESULTS.md)** - Benchmark data

---

## 🚧 Known Limitations (MVP)

- **Local notifications only** (FCM not configured)
- **No message editing/deletion** (intentional for MVP)
- **No media uploads** (text-only for now)
- **No voice/video calls**
- **English only** (no i18n)

**See [POST_MVP.md](docs/mvp/POST_MVP.md) for roadmap.**

---

## 🤝 Contributing

This is an MVP project. For production use, consider:
- Implementing FCM for background notifications
- Adding message editing/deletion
- Media upload support (images, files)
- End-to-end encryption
- Internationalization (i18n)
- Analytics and monitoring

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with:
- [Expo](https://expo.dev/) - React Native framework
- [Firebase](https://firebase.google.com/) - Backend infrastructure
- [Anthropic Claude](https://anthropic.com/) - AI summarization and analysis
- [OpenAI](https://openai.com/) - Embeddings for semantic search
- [Pinecone](https://pinecone.io/) - Vector database

---

**Made with ❤️ for the Gauntlet.ai Founder Fellowship**
