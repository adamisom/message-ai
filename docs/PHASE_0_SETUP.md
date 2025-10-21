# Phase 0: Setup & Configuration

**Estimated Time:** 1.5-2 hours  
**Goal:** Complete environment setup with Firebase configured and project structure ready for development

**⚠️ Important:** Before starting, review `PHASE_0_ROADBLOCKS.md` for known issues and solutions.

---

## Objectives

By the end of Phase 0, you will have:

- ✅ All dependencies installed
- ✅ Firebase project configured and connected
- ✅ Project folder structure created
- ✅ Utility files implemented
- ✅ App successfully running on emulator
- ✅ Firebase read/write verified

---

## Prerequisites

### Required Software Versions

Check you have these installed:

```bash
# Node.js (minimum 20.19.4, LTS 22.20.0 recommended)
node --version

# npm (should come with Node)
npm --version

# Expo CLI (global)
expo --version
```

**If missing, install:**

```bash
# Node.js - Use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20.19.4
nvm use 20.19.4

# Expo CLI
npm install -g expo@latest

# Watchman (macOS only, optional but recommended)
brew install watchman
```

### Android Emulator Setup

**Required for testing:**

- Android Studio installed
- At least one AVD (Android Virtual Device) created
- ANDROID_HOME environment variable set

**Quick test:**

```bash
# Check if Android SDK is accessible
adb version

# List available emulators
emulator -list-avds
```

**If not set up:** See Section "Android Emulator Setup" in `docs/mvp-prd-plus.md` Appendix B (lines 1500-1575)

---

## Task 0.1: Install Project Dependencies

### Step 1: Install Base Dependencies

```bash
# From project root
cd /Users/adamisom/Desktop/message-ai

# Install existing dependencies
npm install
```

### Step 2: Install Firebase

```bash
# Firebase Web SDK (we'll use this instead of native for speed)
npm install firebase
```

**Why Firebase Web SDK?**

- Faster setup (no native compilation)
- Works perfectly in Expo Go
- Sufficient for MVP requirements

### Step 3: Install State Management & Storage

```bash
# Zustand (lightweight state management)
npm install zustand

# AsyncStorage (persistent storage)
npx expo install @react-native-async-storage/async-storage
```

### Step 4: Install UI & Utility Libraries

```bash
# React Native Paper (pre-built UI components)
npm install react-native-paper

# NetInfo (network status detection)
npx expo install @react-native-community/netinfo

# Notifications (already in Expo SDK, but ensure it's linked)
npx expo install expo-notifications
```

### Step 5: Verify Installation

```bash
# Should complete without errors
npm list firebase zustand @react-native-async-storage/async-storage react-native-paper @react-native-community/netinfo expo-notifications
```

**Expected versions:**

- firebase: ^10.0.0 or later
- zustand: ^5.0.0 or later
- @react-native-async-storage/async-storage: ~2.1.0
- @react-native-community/netinfo: ~12.0.0
- expo-notifications: ~0.30.0
- react-native-paper: ^5.12.0

### Troubleshooting Dependencies

**Issue: "Cannot find module"**

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue: "Peer dependency warnings"**

- Safe to ignore for MVP (our versions are pinned and tested)

**Issue: "Expo version mismatch"**

```bash
# Ensure Expo SDK 54
npx expo install --fix
```

**✅ Checkpoint:** `npm install` completes successfully, no red errors in terminal

---

## Task 0.2: Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Project name: `messageai-mvp` (or your choice)
4. Disable Google Analytics (not needed for MVP)
5. Click "Create project"
6. Wait for provisioning (~30 seconds)

### Step 2: Enable Email/Password Authentication

1. In Firebase Console, click "Authentication" in left sidebar
2. Click "Get started"
3. Click "Sign-in method" tab
4. Click "Email/Password"
5. Toggle "Enable" → ON
6. Click "Save"

**✅ Checkpoint:** Email/Password shows as "Enabled" in Sign-in providers

### Step 3: Create Firestore Database

1. Click "Firestore Database" in left sidebar
2. Click "Create database"
3. **Select "Start in test mode"** (we'll add security rules later)
4. Choose a location (closest to you: `us-central`, `europe-west`, etc.)
5. Click "Enable"
6. Wait for database creation (~1 minute)

**✅ Checkpoint:** Firestore Database shows "Cloud Firestore" with empty collections

### Step 4: Get Firebase Credentials

1. Click ⚙️ (gear icon) → "Project settings"
2. Scroll down to "Your apps"
3. Click "Web" icon (</>) to add web app
4. App nickname: `messageai-web`
5. Do NOT check "Firebase Hosting"
6. Click "Register app"
7. **Copy the firebaseConfig object** (you'll need these values)

Example of what you'll see:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "messageai-mvp.firebaseapp.com",
  projectId: "messageai-mvp",
  storageBucket: "messageai-mvp.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### Step 5: Create `.env` File

**CRITICAL: This file stores sensitive credentials**

```bash
# From project root
touch .env
```

Edit `.env` and add (replace with YOUR values from Firebase):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=messageai-mvp.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=messageai-mvp
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=messageai-mvp.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

**Important Notes:**

- All keys MUST start with `EXPO_PUBLIC_` (Expo requirement)
- No quotes around values
- No spaces around `=`
- Replace ALL placeholder values with your actual Firebase config

### Step 6: Update `.gitignore`

**CRITICAL: Prevent committing secrets to git**

```bash
# Open .gitignore
code .gitignore
```

Add this line if not already present:

```
.env
```

Verify:

```bash
# Should show .env
cat .gitignore | grep .env
```

### Step 7: Create Firebase Config File

Create `firebase.config.js` in project root:

```bash
touch firebase.config.js
```

Add this exact content:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

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

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence (critical for MVP offline support)
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });
}
```

**Why this structure?**

- Reads from `.env` automatically
- Enables offline persistence (required for MVP)
- Exports `auth` and `db` for use throughout app

### Step 8: Test Firebase Connection

**Important:** We'll test Firebase directly in the Expo app (not with Node.js script).

Edit `app/index.tsx` temporarily:

```typescript
// app/index.tsx - TEMPORARY TEST CODE (will be replaced in Phase 1)
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../firebase.config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Index() {
  const [status, setStatus] = useState('Testing Firebase...');
  const [error, setError] = useState('');

  useEffect(() => {
    testFirebase();
  }, []);

  const testFirebase = async () => {
    try {
      const docRef = await addDoc(collection(db, 'test'), {
        message: 'Hello from MessageAI',
        timestamp: serverTimestamp(),
      });
      
      setStatus(`✅ SUCCESS! Firebase is working.\nDoc ID: ${docRef.id}`);
      console.log('✅ Firebase test passed');
    } catch (err: any) {
      setError(`❌ ERROR: ${err.message}`);
      console.error('Firebase test failed:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phase 0 Setup Test</Text>
      <Text style={styles.status}>{status}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && status.includes('Testing') && <ActivityIndicator size="large" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
});
```

**Test it:**

1. Save the file
2. Run `npx expo start --android` (if not already running)
3. Wait for app to reload on emulator
4. **Expected:** See "✅ SUCCESS! Firebase is working" message on screen

**Verify in Firebase Console:**

1. Go to Firebase Console → Firestore Database
2. You should see a "test" collection with 1 document
3. Click the document to view it
4. **Delete the test collection** (won't need it anymore)

**If you see errors on screen:**

- Check `.env` values match Firebase Console exactly
- Ensure all keys start with `EXPO_PUBLIC_`
- Verify Firestore is in "test mode"
- Check internet connection
- Restart Expo: `npx expo start --clear`

**After success:**

- Leave this code in `app/index.tsx` for now
- It will be replaced in Phase 1 with the landing/redirect screen

**✅ Checkpoint:** Firebase test shows success on emulator screen, test document appears in Firebase Console

---

## Task 0.3: Create Project Folder Structure

### Step 1: (Optional) Clean Up Example Folder

Your project has an `app-example/` folder with sample code. This is NOT needed for the MVP.

**Recommendation:** Remove it to avoid confusion:

```bash
rm -rf app-example/
```

**Or keep it as reference (just don't import from it):**

```bash
# Do nothing - just be aware it exists
```

### Step 2: Create Project Directories

```bash
# From project root
mkdir -p components
mkdir -p store
mkdir -p services
mkdir -p utils

# Verify structure
ls -la
```

**Expected output should include:**

```
drwxr-xr-x  components/
drwxr-xr-x  store/
drwxr-xr-x  services/
drwxr-xr-x  utils/
```

**✅ Checkpoint:** All four folders exist

---

## Task 0.4: Create Utility Files

### File 1: `utils/constants.ts`

Create file:

```bash
touch utils/constants.ts
```

Add content:

```typescript
/**
 * App-wide constants
 * Keep all magic numbers and strings here for easy modification
 */

// Message status constants
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
  QUEUED: 'queued',
} as const;

// Conversation type constants
export const CONVERSATION_TYPE = {
  DIRECT: 'direct',
  GROUP: 'group',
} as const;

// Limits and timeouts
export const MESSAGE_LIMIT = 100; // Load last 100 messages per conversation
export const TYPING_DEBOUNCE_MS = 500; // Debounce typing indicator updates
export const MESSAGE_TIMEOUT_MS = 10000; // 10 seconds before marking message as failed
export const TYPING_CLEAR_DELAY_MS = 500; // Clear typing indicator after 500ms inactivity

// UI Constants
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_MESSAGE_PREVIEW_LENGTH = 100;

// Type exports for TypeScript
export type MessageStatus = typeof MESSAGE_STATUS[keyof typeof MESSAGE_STATUS];
export type ConversationType = typeof CONVERSATION_TYPE[keyof typeof CONVERSATION_TYPE];
```

**Why these values?**

- `MESSAGE_LIMIT = 100`: PRD Section 3.3, optimized for performance
- `TYPING_DEBOUNCE_MS = 500`: PRD Section 3.5 (Decision 5)
- `MESSAGE_TIMEOUT_MS = 10000`: PRD Section 3.3 (Decision 4)

### File 2: `utils/validators.ts`

Create file:

```bash
touch utils/validators.ts
```

Add content:

```typescript
/**
 * Input validation functions
 * Used across registration, login, and user discovery screens
 */

import { MIN_PASSWORD_LENGTH } from './constants';

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns true if valid email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate password strength
 * MVP requirement: minimum 6 characters (Firebase Auth minimum)
 * @param password - Password string to validate
 * @returns true if valid password
 */
export const validatePassword = (password: string): boolean => {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  return password.length >= MIN_PASSWORD_LENGTH;
};

/**
 * Validate display name
 * @param name - Display name to validate
 * @returns true if valid display name
 */
export const validateDisplayName = (name: string): boolean => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 50;
};

/**
 * Get validation error message for email
 * @param email - Email to validate
 * @returns Error message or null if valid
 */
export const getEmailError = (email: string): string | null => {
  if (!email) {
    return 'Email is required';
  }
  if (!validateEmail(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

/**
 * Get validation error message for password
 * @param password - Password to validate
 * @returns Error message or null if valid
 */
export const getPasswordError = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }
  if (!validatePassword(password)) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
};

/**
 * Get validation error message for display name
 * @param name - Display name to validate
 * @returns Error message or null if valid
 */
export const getDisplayNameError = (name: string): string | null => {
  if (!name || !name.trim()) {
    return 'Display name is required';
  }
  if (name.trim().length > 50) {
    return 'Display name must be 50 characters or less';
  }
  return null;
};
```

### File 3: `utils/timeFormat.ts`

Create file:

```bash
touch utils/timeFormat.ts
```

Add content:

```typescript
/**
 * Time formatting utilities
 * Used for message timestamps, last seen, conversation list
 */

/**
 * Format a timestamp relative to now (e.g., "2m ago", "3h ago")
 * @param date - Date object to format
 * @returns Formatted string
 */
export const formatTimestamp = (date: Date): string => {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return 'Just now';
  }
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  
  // For older messages, show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Format time for message bubble (e.g., "2:30 PM")
 * @param date - Date object to format
 * @returns Formatted time string
 */
export const formatMessageTime = (date: Date): string => {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format last seen time with "Last seen" prefix
 * @param date - Date object to format
 * @returns Formatted string with "Last seen" prefix
 */
export const formatLastSeen = (date: Date): string => {
  if (!date || !(date instanceof Date)) {
    return 'Last seen recently';
  }

  const timestamp = formatTimestamp(date);
  
  if (timestamp === 'Just now') {
    return 'Last seen just now';
  }
  
  return `Last seen ${timestamp}`;
};

/**
 * Format conversation list timestamp (today shows time, older shows date)
 * @param date - Date object to format
 * @returns Formatted string
 */
export const formatConversationTime = (date: Date): string => {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  const now = new Date();
  const isToday = 
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return formatMessageTime(date);
  }

  const isYesterday = 
    date.getDate() === now.getDate() - 1 &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  // Within this week, show day name
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // Older, show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};
```

**✅ Checkpoint:** All three utility files created with no TypeScript errors

Test utilities:

```bash
# TypeScript should validate with no errors
npx tsc --noEmit utils/constants.ts utils/validators.ts utils/timeFormat.ts
```

---

## Task 0.5: Update `app.json`

### Current State

Your `app.json` exists but needs notification plugin.

### Required Changes

Open `app.json` and find the `"plugins"` array. Update it to include:

```json
{
  "expo": {
    "name": "MessageAI",
    "slug": "message-ai",
    "version": "1.0.0",
    "plugins": [
      "expo-notifications"
    ],
    // ... rest of config
  }
}
```

**If `plugins` array doesn't exist, add it:**

```json
{
  "expo": {
    "name": "MessageAI",
    "slug": "message-ai",
    "version": "1.0.0",
    // Add this:
    "plugins": [
      "expo-notifications"
    ],
    "orientation": "portrait",
    // ... rest
  }
}
```

**Full recommended `app.json` for MVP:**

```json
{
  "expo": {
    "name": "MessageAI",
    "slug": "message-ai",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "messageai",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.messageai"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourname.messageai"
    },
    "plugins": [
      "expo-notifications"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

**Important:** Change `com.yourname.messageai` to your actual identifier.

**✅ Checkpoint:** `app.json` has `expo-notifications` in plugins array

---

## Task 0.6: Verify Everything Works

### Step 1: Start Expo Development Server

```bash
# Clear any caches first
npx expo start --clear
```

**Expected output:**

```
Starting Metro Bundler
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
```

**If errors:**

- "Cannot find module 'firebase'": Run `npm install firebase`
- "Port 8081 already in use": Kill process on that port or use `npx expo start --port 8082`
- ".env not found": Ensure `.env` is in project root

### Step 2: Launch Android Emulator

In a NEW terminal (keep Expo running):

```bash
# List available emulators
emulator -list-avds

# Start an emulator (replace with your AVD name)
emulator -avd Pixel_5_API_34 &

# Wait for emulator to boot (~30 seconds)
```

**Alternative:** Use Android Studio GUI to launch emulator

### Step 3: Install App on Emulator

Back in the Expo terminal, press **`a`** for Android.

**Expected:**

- Expo Go app installs on emulator
- Your MessageAI app loads in Expo Go
- You see the current `app/index.tsx` screen

**If errors:**

- "No devices found": Ensure emulator is fully booted, run `adb devices`
- "Could not connect": Restart Expo server with `npx expo start --clear`

### Step 4: Test Hot Reload

Edit `app/index.tsx`:

```typescript
// Change the text to something obvious
<Text>Phase 0 Setup Complete! 🚀</Text>
```

Save the file.

**Expected:** App updates automatically on emulator within 1-2 seconds.

**✅ Checkpoint:** App runs on emulator, hot reload works

---

## Verification Checklist

Before proceeding to Phase 1, verify ALL of these:

### Dependencies

- [ ] `npm install` completed successfully
- [ ] Firebase SDK installed (`npm list firebase`)
- [ ] Zustand installed (`npm list zustand`)
- [ ] AsyncStorage installed
- [ ] React Native Paper installed
- [ ] NetInfo installed
- [ ] Expo Notifications available

### Firebase

- [ ] Firebase project created
- [ ] Email/password authentication enabled
- [ ] Firestore database created (test mode)
- [ ] `.env` file created with correct credentials
- [ ] `.env` added to `.gitignore`
- [ ] `firebase.config.js` created
- [ ] Firebase connection test passed (created test document)

### File Structure

- [ ] `components/` folder exists
- [ ] `store/` folder exists
- [ ] `services/` folder exists
- [ ] `utils/` folder exists
- [ ] `utils/constants.ts` created and valid
- [ ] `utils/validators.ts` created and valid
- [ ] `utils/timeFormat.ts` created and valid

### Configuration

- [ ] `app.json` includes `expo-notifications` plugin
- [ ] Bundle identifier set in `app.json`

### Runtime

- [ ] `npx expo start` runs without errors
- [ ] Android emulator launches successfully
- [ ] App installs and runs on emulator
- [ ] Hot reload works (tested with a change)
- [ ] No TypeScript errors in terminal
- [ ] No red error screens in app

---

## Common Issues & Solutions

### Issue: "Cannot resolve module 'firebase'"

**Solution:**

```bash
npm install firebase
npx expo start --clear
```

### Issue: ".env variables not loading"

**Symptoms:** Firebase initialization fails, undefined errors

**Solutions:**

1. Verify all keys start with `EXPO_PUBLIC_`
2. Restart Expo server: `npx expo start --clear`
3. Check for typos in `.env` (no spaces, no quotes)
4. Ensure `.env` is in project root, not in subdirectory

### Issue: "Firestore: PERMISSION_DENIED"

**Solution:**

1. Go to Firebase Console → Firestore Database → Rules
2. Verify rules are in "test mode":

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // TEST MODE
    }
  }
}
```

3. Click "Publish"

### Issue: Android emulator won't connect

**Solutions:**

```bash
# Check emulator is running
adb devices

# Should show:
# emulator-5554   device

# If offline or not listed:
adb kill-server
adb start-server

# Restart Expo
npx expo start --clear
```

### Issue: "Metro bundler crashed"

**Solution:**

```bash
# Clear all caches
rm -rf node_modules/.cache
npx expo start --clear

# If still failing, reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

### Issue: TypeScript errors in utility files

**Common:** "Cannot find module" or "type errors"

**Solution:**

1. Verify file extensions are `.ts` not `.js`
2. Check `tsconfig.json` includes `"utils/**/*"`
3. Run type check: `npx tsc --noEmit`

---

## Next Steps

### Before Phase 1

1. **Commit your work:**

```bash
git add .
git commit -m "feat: complete Phase 0 setup - Firebase configured, dependencies installed, utilities created"
```

2. **Double-check verification checklist above** - ALL items must be checked

3. **Take a screenshot/note of:**
   - Firebase Console showing Authentication enabled
   - Firebase Console showing Firestore created
   - Emulator running your app successfully

4. **Update progress:** Check off Phase 0 in `docs/PROGRESS_TRACKER.md`

### When ready for Phase 1

Phase 1 will implement:

- Authentication service (`services/authService.ts`)
- Auth store (`store/authStore.ts`)
- Login screen
- Register screen
- Session persistence

**Estimated time for Phase 1:** 2-3 hours

---

## Potential Roadblocks & Questions

### Resolved Questions

**Q: Which Firebase SDK to use - Native or Web?**  
A: ✅ **Web SDK** - Faster setup, works in Expo Go, sufficient for MVP

**Q: How to handle environment variables in Expo?**  
A: ✅ Use `EXPO_PUBLIC_` prefix, access via `process.env.EXPO_PUBLIC_*`

**Q: Should we enable offline persistence now?**  
A: ✅ Yes - Enabled in `firebase.config.js` with `enableIndexedDbPersistence()`

**Q: What about Firebase security rules?**  
A: ✅ Use test mode for now, proper rules will be added in Phase 7

### Outstanding Questions (to be resolved in later phases)

**Q: How will we handle notification permissions?**  
A: Will be addressed in Phase 6 with `expo-notifications`

**Q: How will session restoration work?**  
A: Will be implemented in Phase 1 with AsyncStorage + authStore

**Q: What about TypeScript strict mode?**  
A: Current `tsconfig.json` settings are sufficient for MVP

---

## Summary

**Phase 0 Complete When:**

- ✅ All dependencies installed
- ✅ Firebase configured and tested
- ✅ Project structure created
- ✅ Utility files implemented
- ✅ App running on emulator
- ✅ Hot reload working
- ✅ No errors in console

**Time Investment:** 1.5-2 hours  
**Output:** Solid foundation ready for authentication implementation

**Next:** Phase 1 - Authentication & User Management

---

**Ready to proceed? Ensure ALL verification checklist items are complete before moving to Phase 1.**
