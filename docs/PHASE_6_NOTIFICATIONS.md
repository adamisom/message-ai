# Phase 6: Local Notifications

**Estimated Time:** 1-2 hours  
**Goal:** Display notifications for incoming messages when app is in foreground or background, with tap-to-open functionality

**Prerequisites:** Phase 0, 1, 2, 3, 4, and 5 must be complete (all messaging and real-time features working)

---

## Objectives

By the end of Phase 6, you will have:

- ✅ Notification permissions requested on app launch
- ✅ Local notifications displayed for new messages
- ✅ Notifications show sender name and message preview
- ✅ Tapping notification navigates to correct conversation
- ✅ Notifications work when app is in foreground or background
- ✅ No notifications for messages you send

**Note:** This phase implements **local notifications** only (works in Expo Go). Background push notifications require a development build and Firebase Cloud Messaging (Post-MVP).

---

## Architecture Overview

### Notification Flow

```
New message arrives from another user
    ↓
Message listener in ChatScreen detects
    ↓
Check: Is message from me? → YES: Skip notification
                           → NO: Continue
    ↓
Schedule local notification with:
- Title: Sender name
- Body: Message text
- Data: conversationId
    ↓
Notification appears (banner/sound)
    ↓
User taps notification
    ↓
App navigates to /chat/[conversationId]
```

### Expo Notifications API

**Reference:** mvp-prd-plus.md Section 3.7

Expo provides `expo-notifications` package (already included in Expo SDK 54):
- `requestPermissionsAsync()` - Get user permission
- `setNotificationHandler()` - Configure foreground behavior
- `scheduleNotificationAsync()` - Show notification
- `addNotificationResponseReceivedListener()` - Handle taps

---

## Before Starting Phase 6

Verify Phase 5 is complete and working:

### Required from Phase 5

- [ ] Typing indicators work
- [ ] Online/offline status displays
- [ ] Read receipts show ✓ and ✓✓
- [ ] All real-time features functional
- [ ] No TypeScript errors
- [ ] No linter errors

### Verify expo-notifications is Available

`expo-notifications` is included in Expo SDK 54, but let's verify:

```bash
npm list expo-notifications
```

**Expected:** Should show `expo-notifications@0.xx.x`

**If missing (unlikely):**
```bash
npx expo install expo-notifications
```

---

## Task 6.1: Create Notification Service

### Purpose

Centralize notification logic in a reusable service.

### Step 1: Create Notification Service File

```bash
touch services/notificationService.ts
```

**Implementation:**

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Request notification permissions from the user
 * @returns Promise<boolean> - true if permissions granted
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Only ask if permissions have not been determined
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // For Android, set notification channel (required for Android 8.0+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Schedule a local notification
 * @param title - Notification title (sender name)
 * @param body - Notification body (message text)
 * @param conversationId - ID of the conversation (for navigation)
 */
export const scheduleMessageNotification = async (
  title: string,
  body: string,
  conversationId: string
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: body.length > 100 ? body.substring(0, 100) + '...' : body,
        sound: 'default',
        data: { conversationId },
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

/**
 * Configure how notifications behave when app is in foreground
 */
export const configureNotificationHandler = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,  // Show banner
      shouldPlaySound: true,  // Play sound
      shouldSetBadge: true,   // Update badge count (iOS)
    }),
  });
};
```

**Key Features:**
- Checks existing permissions before requesting
- Creates Android notification channel (required for Android 8+)
- Truncates long messages to 100 characters
- Handles errors gracefully
- Configures foreground notification behavior

**✅ Checkpoint:** Service file compiles with no errors

---

## Task 6.2: Setup Notifications in Root Layout

### Purpose

Initialize notifications when app starts and handle notification taps.

### Step 1: Add Notification Initialization

**File:** `app/_layout.tsx`

**Add imports at the top:**

```typescript
import * as Notifications from 'expo-notifications';
import { 
  requestNotificationPermissions, 
  configureNotificationHandler 
} from '../services/notificationService';
```

**Add notification setup in root component:**

```typescript
// Inside your root layout component, add this useEffect
useEffect(() => {
  // Configure notification behavior
  configureNotificationHandler();

  // Request permissions on mount
  const setupNotifications = async () => {
    const granted = await requestNotificationPermissions();
    if (granted) {
      console.log('✅ Notification permissions granted');
    } else {
      console.log('❌ Notification permissions denied');
    }
  };

  setupNotifications();
}, []);
```

**✅ Checkpoint:** App requests notification permissions on launch

---

### Step 2: Add Notification Tap Handler

**File:** `app/_layout.tsx` (same file, add another useEffect)

**Add navigation handler for notification taps:**

```typescript
import { useRouter } from 'expo-router';

// Inside your root layout component
const router = useRouter();

// Add this useEffect to handle notification taps
useEffect(() => {
  // Listen for notification taps
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const conversationId = response.notification.request.content.data.conversationId;
    
    if (conversationId && typeof conversationId === 'string') {
      console.log('📱 Notification tapped, navigating to:', conversationId);
      
      // Navigate to the conversation
      router.push(`/chat/${conversationId}`);
    }
  });

  // Cleanup
  return () => {
    subscription.remove();
  };
}, [router]);
```

**Why separate useEffect?**
- Notification setup runs once
- Tap listener needs router dependency
- Cleaner separation of concerns

**✅ Checkpoint:** Tapping notification navigates to chat

---

## Task 6.3: Trigger Notifications on New Messages

### Purpose

Show notifications when messages from other users arrive.

### Step 1: Add Notification Trigger to Chat Screen

**File:** `app/chat/[id].tsx`

**Add import at the top:**

```typescript
import { scheduleMessageNotification } from '../../services/notificationService';
import { AppState } from 'react-native';
```

**Track app state to determine when to show notifications:**

```typescript
// Add state to track if app is in foreground
const [isAppForeground, setIsAppForeground] = useState(true);

// Track app state
useEffect(() => {
  const subscription = AppState.addEventListener('change', nextAppState => {
    setIsAppForeground(nextAppState === 'active');
  });

  return () => {
    subscription.remove();
  };
}, []);
```

**Modify the messages listener to trigger notifications:**

```typescript
// Update your existing messages listener (from Phase 3)
useEffect(() => {
  if (!conversationId || typeof conversationId !== 'string') return;

  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(MESSAGE_LIMIT)
  );

  // Track previous message count to detect new messages
  let previousMessageCount = 0;

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[];

    // Check if there's a new message from another user
    if (msgs.length > previousMessageCount && previousMessageCount > 0) {
      const latestMessage = msgs[msgs.length - 1];
      
      // Only notify if:
      // 1. Message is not from me
      // 2. App is not in this conversation (user is viewing it)
      if (latestMessage.senderId !== user.uid && !isAppForeground) {
        scheduleMessageNotification(
          latestMessage.senderName || 'New Message',
          latestMessage.text,
          conversationId
        );
      }
    }

    previousMessageCount = msgs.length;
    setMessages(msgs);
    setLoading(false);
  }, (error) => {
    console.error('Messages listener error:', error);
    if (error.message.includes('index')) {
      console.error('⚠️ Firestore index required. Check the error above for a link to create it.');
    }
    setLoading(false);
  });

  return unsubscribe;
}, [conversationId, user.uid, isAppForeground]);
```

**Alternative Approach: Only notify when app is in background:**

If you want notifications ONLY when user is not actively in the chat:

```typescript
// Simpler version: only notify if app is in background
if (latestMessage.senderId !== user.uid && !isAppForeground) {
  scheduleMessageNotification(
    latestMessage.senderName || 'New Message',
    latestMessage.text,
    conversationId
  );
}
```

**✅ Checkpoint:** New messages trigger notifications

---

## Testing Phase 6

### Test 6.1: Permission Request

**Steps:**
1. Fresh install or clear app data
2. Launch app

**Expected:**
- ✅ Notification permission dialog appears
- ✅ Can grant or deny permission
- ✅ Permission state saved (doesn't ask again)

---

### Test 6.2: Notification Appears (Foreground)

**Setup:** 2 devices

1. **Device 1:** User A opens chat with User B
2. **Device 2:** User B sends "Test notification"
3. **Device 1:** Put app in background (home button)
4. **Wait 1-2 seconds**

**Expected:**
- ✅ Notification appears on Device 1
- ✅ Shows "User B" as title
- ✅ Shows "Test notification" as body
- ✅ Notification sound plays

---

### Test 6.3: Notification Tap Navigation

1. **Receive notification** (from Test 6.2)
2. **Tap the notification**

**Expected:**
- ✅ App opens (if closed)
- ✅ Navigates to chat with User B
- ✅ Can see the message that triggered notification

---

### Test 6.4: No Notification for Own Messages

1. **User A:** Send a message
2. **Check:** User A's device

**Expected:**
- ✅ NO notification appears
- ✅ Only other users get notified

---

### Test 6.5: Group Chat Notifications

**Setup:** Group with 3 users

1. **User B:** Send message in group
2. **User A and C:** Check devices

**Expected:**
- ✅ Both User A and C receive notification
- ✅ Shows "User B" as sender name
- ✅ Tapping navigates to group chat

---

### Test 6.6: Multiple Notifications

1. **User B:** Send 3 messages rapidly
2. **User A:** Check notifications

**Expected:**
- ✅ 3 separate notifications appear
- ✅ Each shows correct message
- ✅ Can tap any to open chat

---

### Test 6.7: Long Message Truncation

1. **User B:** Send 200-character message
2. **User A:** Check notification

**Expected:**
- ✅ Notification shows first 100 characters + "..."
- ✅ Full message visible in chat

---

## Common Issues & Solutions

### Issue: No notification permission dialog

**Cause:** Permissions already denied or granted in previous session

**Solution:**
1. Uninstall app completely
2. Reinstall
3. Permission dialog should appear

**For testing:**
- iOS: Settings → MessageAI → Notifications → Reset
- Android: Settings → Apps → MessageAI → Permissions → Notifications

---

### Issue: Notifications don't appear

**Cause:** Multiple possibilities

**Debug:**
1. Check permission status:
```typescript
const { status } = await Notifications.getPermissionsAsync();
console.log('Notification permission:', status);
```

2. Check if notification was scheduled:
```typescript
await scheduleMessageNotification(/*...*/);
console.log('✅ Notification scheduled');
```

3. Check device notification settings (system-level)

---

### Issue: Notification appears but no sound

**Cause:** Device in silent mode or notification channel misconfigured

**Solution (Android):**
```typescript
// Ensure channel has sound
await Notifications.setNotificationChannelAsync('default', {
  name: 'Default',
  importance: Notifications.AndroidImportance.HIGH,  // HIGH enables sound
  sound: 'default',
  vibrationPattern: [0, 250, 250, 250],
});
```

**Solution (iOS):**
- Check device ringer switch (physical switch on side)
- Check Do Not Disturb mode

---

### Issue: Tap doesn't navigate correctly

**Cause:** conversationId not passed in data or router not accessible

**Debug:**
```typescript
const subscription = Notifications.addNotificationResponseReceivedListener(response => {
  console.log('Notification data:', response.notification.request.content.data);
  const conversationId = response.notification.request.content.data.conversationId;
  console.log('ConversationId:', conversationId);
  
  if (conversationId) {
    router.push(`/chat/${conversationId}`);
  }
});
```

**Verify:**
- `conversationId` is a string
- Router is available in root layout
- Navigation path matches your route structure

---

### Issue: Too many notifications

**Cause:** Notification triggered on every message update, not just new messages

**Solution:**
Use the `previousMessageCount` logic shown in Step 1 of Task 6.3 to only trigger on new messages.

---

### Issue: Notification shows when actively chatting

**Cause:** App state tracking not working

**Solution:**
```typescript
// Only notify if app is in background
if (latestMessage.senderId !== user.uid && !isAppForeground) {
  // Schedule notification
}
```

**Better approach:** Only notify if user is NOT in the specific chat:
```typescript
if (latestMessage.senderId !== user.uid && AppState.currentState !== 'active') {
  // Schedule notification
}
```

---

## Potential Roadblocks & Questions

### 🟢 Resolved: Background vs Foreground Notifications

**Question:** Should notifications show when user is actively in the app?

**Answer:** ✅ Show only when app is in background or user is in a different chat

**Implementation:** Use AppState to track foreground status

---

### 🟡 Unresolved: Badge Count

**Issue:** iOS badge count doesn't update automatically

**Impact:** Badge shows but doesn't clear when messages are read

**Mitigation:** Acceptable for MVP (local notifications only)

**Recommendation:** Implement badge management in Phase 7 or post-MVP

**Status:** ⚠️ Known limitation

---

### 🟡 Unresolved: Notification Grouping

**Issue:** Multiple messages from same user create multiple notifications

**Impact:** Notification tray can get cluttered

**Mitigation:** Acceptable for MVP

**Recommendation:** Implement notification grouping post-MVP (requires native code)

**Status:** ⚠️ Known limitation

---

### 🟢 Resolved: Works in Expo Go?

**Question:** Do local notifications work in Expo Go?

**Answer:** ✅ Yes, local notifications work perfectly in Expo Go

**Details:** Background push notifications require development build (Post-MVP)

---

### 🔴 Critical Limitation: True Background Notifications

**Issue:** Local notifications only work when app is in recent apps (not fully closed)

**Impact:** If user force-quits the app, no notifications appear

**Mitigation:** Document this limitation for MVP

**Recommendation:** Implement Firebase Cloud Messaging (FCM) post-MVP for true background notifications

**Status:** ⚠️ MVP limitation - acceptable for testing/demo

---

## Verification Checklist

Before proceeding to Phase 7, verify ALL of these:

### Code Complete

- [ ] `services/notificationService.ts` created
- [ ] `requestNotificationPermissions()` function implemented
- [ ] `scheduleMessageNotification()` function implemented
- [ ] `configureNotificationHandler()` function implemented
- [ ] Root layout updated with notification setup
- [ ] Root layout updated with tap handler
- [ ] Chat screen updated with notification trigger
- [ ] AppState tracking added
- [ ] No TypeScript errors
- [ ] No linter errors

### Functionality Tests

- [ ] Permission dialog appears on first launch
- [ ] Can grant/deny permissions
- [ ] Notifications appear for messages from others
- [ ] Notifications show correct sender name
- [ ] Notifications show message preview
- [ ] Long messages are truncated (100 chars)
- [ ] Tapping notification opens correct chat
- [ ] No notifications for own messages
- [ ] Group chat notifications work
- [ ] Multiple notifications can stack
- [ ] Notification sound plays (if device not muted)

### Platform-Specific

- [ ] iOS: Notifications work
- [ ] iOS: Sound works (ringer on)
- [ ] iOS: Badge count updates (optional)
- [ ] Android: Notifications work
- [ ] Android: Notification channel created
- [ ] Android: Sound/vibration works

### Edge Cases

- [ ] Works when app is in background
- [ ] Works when app is minimized (recent apps)
- [ ] Doesn't show when actively in chat
- [ ] Handles rapid messages (multiple notifications)
- [ ] Handles app restart after notification tap

---

## Summary

**Phase 6 Complete When:**

- ✅ Notifications appear for new messages
- ✅ Notifications show sender and preview
- ✅ Tapping navigates to correct chat
- ✅ Own messages don't trigger notifications
- ✅ Works in both direct and group chats
- ✅ Permissions handled gracefully

**Time Investment:** 1-2 hours  
**Output:** Basic local notification system for MVP

**Next:** Phase 7 - Testing & Polish (Edge cases, bug fixes, UX improvements)

---

## Before Phase 7

### Commit Your Work

```bash
git add .
git commit -m "feat: complete Phase 6 - local notifications for incoming messages"
```

### Update Progress

Check off Phase 6 in `docs/PROGRESS_TRACKER.md`

### Prepare for Phase 7

Phase 7 will focus on:
- Comprehensive testing of all features
- Bug fixes and edge cases
- UX polish and loading states
- Error handling improvements
- Final pre-deployment preparations

**Estimated time:** 3-5 hours

---

**Ready to proceed? Ensure ALL verification checklist items are complete before moving to Phase 7.**

