# Developer Setup Guide

Complete setup guide for running MessageAI locally with Expo Go, emulators, and multi-device testing.

---

## Prerequisites

**Required:**

- **Node.js** v18+ ([download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Expo Go app** on your phone ([iOS](https://apps.apple.com/us/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

**Optional (for emulator testing):**

- **Android Studio** ([download](https://developer.android.com/studio)) - includes Android SDK and emulator
- **Xcode** (macOS only, from Mac App Store) - includes iOS Simulator

---

## Project Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd message-ai
npm install
```

### 2. Firebase Configuration

**Create Firebase project:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create project → Enable Authentication (Email/Password) → Enable Firestore (test mode)
3. Project Settings → Copy config values

**Create `.env` in project root:**

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Deploy Firestore Rules:**

1. Copy contents of `/firestore.rules`
2. Firebase Console → Firestore → Rules → Paste → Publish

> **Note:** Current rules are test mode (any authenticated user can read/write). See `/docs/POST_MVP.md` for proper rules.

### 3. Verify Setup

```bash
npm run validate  # Should pass all 105 tests ✅
```

---

## Running the App

### Basic Usage

```bash
npx expo start
```

**Connect devices:**

- **Physical phone:** Scan QR code with Expo Go
- **iOS Simulator:** Press `i` in terminal
- **Android Emulator:** Press `a` in terminal (must be running first, see below)

### Multi-Device Testing (Different Networks)

```bash
npx expo start --tunnel
```

Uses ngrok to create public URL - works across any network.

---

## Emulator Setup

### Android Emulator

**1. Install Android Studio** → Tools → Device Manager → Create Device → Select phone → Finish

**2. Start emulator:**

```bash
# List available devices
~/Library/Android/sdk/emulator/emulator -list-avds

# Start device (replace with your AVD name)
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_36.1 &
```

Or start from Android Studio GUI: Tools → Device Manager → ▶️

**3. Connect to Expo:**

```bash
npx expo start
# Press 'a'
```

**Troubleshooting:**

```bash
# Check device connection
~/Library/Android/sdk/platform-tools/adb devices

# Restart adb
~/Library/Android/sdk/platform-tools/adb kill-server
~/Library/Android/sdk/platform-tools/adb start-server
```

### iOS Simulator (macOS only)

**1. Install Xcode** → Preferences → Components → Download simulator

**2. Run:**

```bash
npx expo start
# Press 'i'
```

Simulator launches automatically.

---

## Multi-Device Testing

**Setup for testing real-time features (messaging, typing, notifications):**

1. **Start tunnel mode:**

   ```bash
   npx expo start --tunnel --clear
   ```

2. **Connect devices:**
   - **iPhone:** Scan QR code → Opens in Expo Go
   - **Android Emulator:**
     - Start emulator manually (see above)
     - Open Expo Go → "Enter URL manually" → Paste `exp://...` URL from terminal

3. **Register test users:**
   - Device 1: `alice@test.com` / `password123` / "Alice"
   - Device 2: `bob@test.com` / `password123` / "Bob"

4. **Test:** Create chat, send messages, check typing indicators and notifications.

See `/docs/MULTI_DEVICE_TESTING.md` for detailed testing checklist.

---

## Development Commands

```bash
npx expo start              # Start dev server
npx expo start --tunnel     # Tunnel mode (multi-device)
npx expo start --clear      # Clear cache

npm test                    # Run tests
npm test -- --watch         # Watch mode
npm run lint                # Lint code
npm run type-check          # Type check
npm run validate            # All checks (lint + type + test)
```

---

## Troubleshooting

### "No development build..." error

**Cause:** `app.json` forcing development build.  
**Fix:** Already configured for Expo Go. Try `npx expo start --clear`

### Firestore permission errors

1. Firebase Console → Firestore → Rules → Verify published
2. Wait 5-10 seconds after publishing
3. Restart app

### Emulator won't connect

**Android:**

```bash
pkill -9 emulator  # Kill
~/Library/Android/sdk/emulator/emulator -avd <name> &  # Restart
~/Library/Android/sdk/platform-tools/adb devices  # Check connection
```

**iOS:**

```bash
xcrun simctl erase all  # Reset simulator
```

### Metro bundler issues

```bash
lsof -ti:8081,8083 | xargs kill -9  # Kill servers
pkill -f "expo start"               # Kill Expo
npx expo start --clear              # Restart clean
```

### Notifications not working

1. **Permissions:** iOS Settings → Expo Go → Notifications → Allow
2. **Do Not Disturb:** Disable on iOS
3. **Expected behavior:** Notifications only show when chat is NOT open
4. **Check logs:** Terminal should show `✅ Notification permissions granted`

---

## Project Structure

```
message-ai/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (auth)/            # Login, register
│   ├── (tabs)/            # Conversations list
│   └── chat/[id].tsx      # Individual chat
├── components/            # Reusable UI
├── services/              # Firebase services (auth, firestore, notifications, presence)
├── store/                 # Zustand state (auth, chat)
├── utils/                 # Helpers and constants
├── docs/                  # Documentation
├── .env                   # Firebase config (create this)
└── firestore.rules        # Firestore security rules
```

---

## Tech Stack

- **Frontend:** React Native 0.81, Expo SDK 54, Expo Router
- **Backend:** Firebase (Auth + Firestore)
- **State:** Zustand + AsyncStorage
- **Testing:** Jest (105 tests)

---

## Next Steps

1. **Architecture:** `/docs/architecture.md`
2. **PRD:** `/docs/mvp-prd-plus.md`
3. **Phase Guides:** `/docs/PHASE_*.md`
4. **Testing:** `/docs/MULTI_DEVICE_TESTING.md`

---

**Questions?** Check `/docs/` or open a GitHub issue.
