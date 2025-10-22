# Phase 6: Local Notifications

**Time:** 1-2 hours | **Goal:** Display notifications for incoming messages with tap-to-open

**Prerequisites:** Phase 0-5 complete (all messaging + real-time features working)

---

## Objectives

- ✅ Notification permissions requested on launch
- ✅ Local notifications for new messages
- ✅ Sender name + message preview
- ✅ Tap notification → navigate to conversation
- ✅ Foreground + background support
- ✅ No notifications for self-sent messages

**Note:** Local notifications only (works in Expo Go). Background push requires FCM (Post-MVP).

**Reference:** mvp-prd-plus.md Section 3.7

---

## Notification Flow

```
New message from other user
    ↓
ChatScreen listener detects new message
    ↓
Check: Is from me? → YES: Skip
                  → NO: Continue
    ↓
Check: Is app in foreground viewing THIS chat? → YES: Skip
                                                → NO: Show notification
    ↓
scheduleMessageNotification(sender, text, conversationId)
    ↓
Notification appears (banner/sound)
    ↓
User taps notification → Navigate to /chat/{conversationId}
```

---

## Before Starting

- [ ] Phase 5 complete (typing, presence, read receipts work)
- [ ] `expo-notifications` available: `npm list expo-notifications`
- [ ] If missing: `npx expo install expo-notifications`

---

## Task 6.1: Notification Service

**Create:** `touch services/notificationService.ts`

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Android: Create notification channel (required Android 8+)
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

// Schedule local notification
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

// Configure foreground behavior
export const configureNotificationHandler = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};
```

✅ **Checkpoint:** Service compiles with no errors

---

## Task 6.2: Setup in Root Layout

**⚠️ IMPORTANT:** Your `app/_layout.tsx` already has Phase 5 presence tracking. **ADD these new useEffects alongside existing code**, don't replace.

### Step 1: Configure Notifications

**Add to `app/_layout.tsx`:**

```typescript
import * as Notifications from 'expo-notifications';
import { requestNotificationPermissions, configureNotificationHandler } from '../services/notificationService';

// ADD this useEffect (keep all existing Phase 5 code)
useEffect(() => {
  configureNotificationHandler();

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

### Step 2: Handle Notification Taps

**Add to `app/_layout.tsx` (separate useEffect):**

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// ADD this useEffect for tap handling
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const conversationId = response.notification.request.content.data.conversationId;
    
    if (conversationId && typeof conversationId === 'string') {
      console.log('📱 Notification tapped, navigating to:', conversationId);
      router.push(`/chat/${conversationId}`);
    }
  });

  return () => {
    subscription.remove();
  };
}, [router]);
```

✅ **Checkpoint:** Permissions requested on launch, tap navigation works

---

## Task 6.3: Trigger Notifications in ChatScreen

**⚠️ CRITICAL:** This must be **merged** with Phase 5's existing messages listener, not added separately.

**Update `app/chat/[id].tsx`:**

### Step 1: Add Imports

```typescript
import { scheduleMessageNotification } from '../../services/notificationService';
import { AppState } from 'react-native';
```

### Step 2: Track App State

```typescript
// Add state
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

### Step 3: Update Messages Listener (MERGE with Phase 5)

**⚠️ This replaces your ENTIRE messages listener from Phase 5.** It includes:
- Phase 3: Message listening
- Phase 5: Mark-as-read logic
- Phase 6: Notification triggering

```typescript
useEffect(() => {
  if (!conversationId || typeof conversationId !== 'string') return;

  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(MESSAGE_LIMIT)
  );

  let previousMessageCount = 0; // Phase 6: Track count to detect new messages

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];

    // Phase 6: Check for new messages to trigger notifications
    if (msgs.length > previousMessageCount && previousMessageCount > 0) {
      const latestMessage = msgs[msgs.length - 1];
      
      // Only notify if:
      // 1. Message is not from me
      // 2. App is not in foreground (user is not actively viewing app)
      if (latestMessage.senderId !== user?.uid && !isAppForeground) {
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

    // Phase 5: Mark as read logic (from previous phase)
    if (msgs.length > 0 && conversation && user) {
      const lastMessage = msgs[msgs.length - 1];
      if (lastMessage.senderId !== user.uid && lastMessage.id !== lastMarkedReadRef.current) {
        lastMarkedReadRef.current = lastMessage.id;
        updateDoc(doc(db, 'conversations', conversationId), {
          [`lastRead.${user.uid}`]: lastMessage.id,
        }).catch(err => console.error('Error marking as read:', err));
      }
    }
  }, (error) => {
    console.error('Messages listener error:', error);
    if (error.message.includes('index')) {
      console.error('⚠️ Firestore index required. Check the error above for a link to create it.');
    }
    setLoading(false);
  });

  return unsubscribe;
}, [conversationId, user, isAppForeground, conversation]); // Added isAppForeground dependency
```

**Key Points:**
- `previousMessageCount` tracks message count to detect NEW messages
- Only triggers when count increases (not on initial load)
- Checks `!isAppForeground` to suppress when user is actively viewing app
- Merged with Phase 5's mark-as-read logic

✅ **Checkpoint:** Notifications appear for new messages

---

## Testing Phase 6

### Test 6.1: Permission Request
1. Fresh install or clear app data
2. Launch app
3. Expected: Permission dialog appears

### Test 6.2: Notification Appears
**Setup:** 2 devices/emulators

1. User A: Put app in background (home button)
2. User B: Send "Test notification"
3. User A: Check device
4. Expected:
   - ✅ Notification appears
   - ✅ Shows "User B" as title
   - ✅ Shows "Test notification" as body
   - ✅ Sound plays (if not muted)

### Test 6.3: Notification Tap
1. User A: Tap notification
2. Expected:
   - ✅ App opens
   - ✅ Navigates to chat with User B
   - ✅ Shows the message

### Test 6.4: No Self-Notification
1. User A: Send message
2. Expected: ✅ NO notification on User A's device

### Test 6.5: Group Notifications
**Setup:** 3-user group

1. User B: Send message
2. User A & C: Check devices
3. Expected: ✅ Both receive notification

### Test 6.6: Long Message Truncation
1. User B: Send 200-character message
2. User A: Check notification
3. Expected: ✅ Shows first 100 chars + "..."

---

## Common Issues

### No permission dialog
- **Cause:** Already granted/denied
- **Fix:** Uninstall app → Reinstall

### Notifications don't appear
- **Check:** Permission status: `Notifications.getPermissionsAsync()`
- **Check:** Device notification settings (system-level)
- **Check:** Console for errors

### No sound
- **Android:** Verify channel importance = HIGH
- **iOS:** Check ringer switch, Do Not Disturb

### Tap doesn't navigate
- **Check:** `conversationId` passed in `data`
- **Check:** Router available in root layout
- **Debug:** Add `console.log` in tap listener

### Too many notifications
- **Cause:** Triggers on every snapshot update
- **Fix:** Use `previousMessageCount` logic (already in code above)

### Notification shows while chatting
- **Cause:** App state tracking not working
- **Fix:** Use `!isAppForeground` check (already in code above)

---

## Known Limitations (MVP)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Local notifications only | Only works when app in recent apps (not force-quit) | Document for MVP, add FCM post-MVP |
| No notification grouping | Multiple messages = multiple notifications | Accept for MVP, add post-MVP |
| Basic badge management | Badge count doesn't clear automatically | Accept for MVP |
| No background push | Requires development build + FCM | Post-MVP feature |

**For MVP:** These limitations are acceptable. Local notifications work in Expo Go for testing/demo.

---

## Verification Checklist

- [ ] Notification permissions requested on launch
- [ ] Permissions state saved (doesn't ask again)
- [ ] Notifications appear for messages from others
- [ ] Notifications show correct sender name
- [ ] Notifications show message preview
- [ ] Long messages truncated (100 chars)
- [ ] Tapping notification opens correct chat
- [ ] No notifications for own messages
- [ ] Group chat notifications work
- [ ] Sound plays (if device not muted)
- [ ] Works when app in background
- [ ] Android notification channel created

---

## Before Phase 7

1. Test notifications on both Android and iOS (if available)
2. Verify tap navigation works
3. Test with multiple simultaneous messages
4. Commit Phase 6 work:
```bash
git add .
git commit -m "feat: complete Phase 6 - local notifications for incoming messages"
```

**Time:** 1-2 hours | **Next:** Phase 7 (Testing & Polish)

---

## Post-MVP: Background Push Notifications

For production, implement FCM:
1. Create development build: `eas build --profile development`
2. Configure Firebase credentials: `eas credentials`
3. Add Firebase server key
4. Test background notifications

See mvp-prd-plus.md Appendix D for complete FCM setup.
