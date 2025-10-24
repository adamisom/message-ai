# MessageAI

Real-time messaging app built with React Native (Expo) and Firebase.

## Features

- User authentication (email/password)
- One-on-one and group messaging
- Real-time message delivery
- Typing indicators
- Online/offline status
- Read receipts
- Local notifications
- Offline support

## Tech Stack

**Frontend:** React Native (Expo SDK 54), Expo Router  
**Backend:** Firebase (Auth + Firestore)  
**State:** Zustand + AsyncStorage  
**Testing:** Jest (105 tests)

## Quick Start

> **New to this stack?** See [`/docs/DEVELOPER_SETUP.md`](/docs/DEVELOPER_SETUP.md) for comprehensive setup guide including emulator configuration and troubleshooting.

### 1. Set Node Version

This project requires **Node 20**. If you have `nvm` installed:

```bash
nvm use
# If Node 20 isn't installed: nvm install 20
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase

Create `.env` in project root with your Firebase credentials:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

See `/docs/PHASE_0_SETUP.md` for detailed Firebase setup.

### 4. Deploy Firestore Rules

Copy rules from `/firestore.rules` to Firebase Console → Firestore → Rules → Publish

**MVP Note:** Currently using test mode rules (any authenticated user can read/write). See `/docs/POST_MVP.md` for restoring proper permissions.

### 5. Run the App

```bash
npx expo start --tunnel
```

**Testing:** See `/docs/MULTI_DEVICE_TESTING.md` for multi-device testing setup.

## Development

```bash
npm run validate  # Run lint, type-check, and all tests
npm test          # Run tests only
npm run lint      # ESLint check
npm run type-check # TypeScript check
```

## Project Structure

```
app/          # Expo Router screens (file-based routing)
components/   # Reusable UI components
services/     # Firebase services (auth, firestore, notifications, presence)
store/        # Zustand stores (auth, chat)
utils/        # Helpers and constants
docs/         # Documentation and phase guides
```

## Documentation

- **New Developer Setup:** [`/docs/DEVELOPER_SETUP.md`](/docs/DEVELOPER_SETUP.md)
- **Architecture:** `/docs/architecture.md`
- **Manual Testing:** `/docs/MULTI_DEVICE_TESTING.md`
- **Phase Guides:** `/docs/PHASE_0_*.md` through `/docs/PHASE_7_*.md`
- **Post-MVP Work:** `/docs/POST_MVP.md`

## Known Limitations (MVP)

- Local notifications only (background notifications require FCM)
- No message editing/deletion
- No media uploads (text-only)
- Last 100 messages per conversation
- Test mode Firestore rules

See `/docs/POST_MVP.md` for full list and roadmap.

## License

MIT
