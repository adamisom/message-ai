# Phase 6: Notifications - Quick Smoke Test

**Time Required:** 5-10 minutes  
**Setup:** 2 devices (emulator + physical device, or 2 emulators)

---

## Prerequisites

✅ Phase 6 code committed  
✅ Dev server running: `npx expo start`  
✅ 2 test users already registered (e.g., test1@example.com, test2@example.com)

---

## Test 1: Permission Request (1 min)

**Goal:** Verify notification permissions are requested on app launch

### Steps:
1. **Fresh install** or clear app data
2. Launch app on Device 1
3. Watch for notification permission dialog

### Expected Results:
- ✅ Permission dialog appears after login
- ✅ Can tap "Allow"
- ✅ Console shows: `✅ Notification permissions granted`

### If It Fails:
- Check `app/_layout.tsx` has notification setup
- Verify `expo-notifications` is installed
- Try uninstalling and reinstalling the app

---

## Test 2: Notification Appears (Background) (2 min)

**Goal:** Verify notifications appear when app is in background

### Steps:
1. **Device 1 (test1@example.com):** Open conversation with test2
2. **Device 1:** Press home button (put app in background)
3. **Device 2 (test2@example.com):** Send message: "Test notification"
4. **Device 1:** Wait 1-2 seconds

### Expected Results:
- ✅ Notification appears on Device 1 lock screen/notification tray
- ✅ Shows "test2 display name" as title
- ✅ Shows "Test notification" as body
- ✅ Notification sound plays (if device not muted)
- ✅ Console shows: `🔔 [ChatScreen] Triggering notification for new message from...`

### If It Fails:
- Check Device 1 console for `isAppForeground: false`
- Verify notification permissions are granted
- Check system notification settings (not in Do Not Disturb)
- Try sending another message

---

## Test 3: Notification Tap Navigation (1 min)

**Goal:** Verify tapping notification opens the correct conversation

### Steps:
1. **Device 1:** Notification from Test 2 still visible
2. **Device 1:** Tap the notification

### Expected Results:
- ✅ App opens/comes to foreground
- ✅ Navigates directly to conversation with test2
- ✅ Can see the message "Test notification"
- ✅ Console shows: `📱 Notification tapped, navigating to: [conversationId]`

### If It Fails:
- Check `app/_layout.tsx` has notification tap listener
- Verify `conversationId` is passed in notification data
- Check router navigation is working

---

## Test 4: No Notification for Own Messages (1 min)

**Goal:** Verify sender doesn't get notified of their own messages

### Steps:
1. **Device 1:** Open conversation with test2
2. **Device 1:** Put app in background
3. **Device 1:** Bring app back to foreground
4. **Device 1:** Send message: "Own message test"

### Expected Results:
- ✅ NO notification appears on Device 1
- ✅ Device 2 receives notification (if in background)
- ✅ Console does NOT show: `🔔 Triggering notification...` for own message

### If It Fails:
- Check notification logic: `latestMessage.senderId !== user.uid`
- Verify user.uid is correctly set

---

## Test 5: No Notification When App is Foreground (1 min)

**Goal:** Verify notifications don't appear when actively using the app

### Steps:
1. **Device 1:** Open conversation with test2 (keep it in foreground)
2. **Device 2:** Send message: "Foreground test"
3. **Device 1:** Watch screen (don't put in background)

### Expected Results:
- ✅ NO notification appears on Device 1
- ✅ Message appears in chat in real-time (< 1 second)
- ✅ Console shows: `isAppForeground: true`
- ✅ Console does NOT show: `🔔 Triggering notification...`

### If It Fails:
- Check AppState listener in chat screen
- Verify `isAppForeground` state is updating correctly
- Check notification condition: `!isAppForeground`

---

## Test 6: Group Chat Notifications (2 min)

**Goal:** Verify notifications work in group chats

### Steps:
1. **Device 1 (test1):** Create group with test2 and test3
2. **Device 1:** Put app in background
3. **Device 2 (test2):** Send message in group: "Group notification test"

### Expected Results:
- ✅ Device 1 receives notification
- ✅ Shows "test2 display name" as sender
- ✅ Shows message text
- ✅ Tapping notification opens group chat

### If It Fails:
- Verify group chat is set up correctly
- Check that conversation listener is active
- Ensure notification logic doesn't distinguish between direct/group

---

## Test 7: Long Message Truncation (1 min)

**Goal:** Verify long messages are truncated in notifications

### Steps:
1. **Device 1:** Put app in background
2. **Device 2:** Send very long message (200+ characters):
   ```
   This is a very long message that should be truncated in the notification preview. It contains more than 100 characters so we can verify that the notification service properly truncates it and adds an ellipsis at the end to indicate there is more text.
   ```

### Expected Results:
- ✅ Notification appears on Device 1
- ✅ Message text is truncated to 100 characters
- ✅ Shows "..." at the end
- ✅ Full message visible when opening chat

### If It Fails:
- Check `scheduleMessageNotification()` truncation logic
- Verify: `body.length > 100 ? body.substring(0, 100) + '...' : body`

---

## Quick Verification Checklist

After running all tests:

- [ ] ✅ Permission request works
- [ ] ✅ Notifications appear in background
- [ ] ✅ Tapping notification navigates correctly
- [ ] ✅ No notification for own messages
- [ ] ✅ No notification when app is foreground
- [ ] ✅ Group chat notifications work
- [ ] ✅ Long messages truncated

---

## Known Limitations (Expected Behavior)

These are NOT bugs - they are documented MVP limitations:

1. **No notifications when app is force-quit**
   - Local notifications only work when app is in recent apps
   - This is expected for Expo Go + local notifications
   - Fix: Implement FCM (Post-MVP)

2. **Badge count doesn't clear automatically**
   - iOS badge increments but doesn't decrement when reading messages
   - This is acceptable for MVP
   - Fix: Implement badge management (Phase 7 or Post-MVP)

3. **Notifications can stack up**
   - Multiple messages create multiple notifications
   - No grouping (e.g., "3 new messages from Alice")
   - This is acceptable for MVP
   - Fix: Implement notification grouping (requires native code, Post-MVP)

---

## Console Logs to Watch For

### ✅ Good Signs:
```
✅ Notification permissions granted
📱 [ChatScreen] App state changed: background isForeground: false
🔔 [ChatScreen] Triggering notification for new message from test2
📱 Notification tapped, navigating to: conv_abc123
```

### ⚠️ Warning Signs:
```
❌ Notification permissions denied
⚠️ [notificationService] Could not set user online
Error scheduling notification: [some error]
```

---

## If Notifications Don't Work At All

### Checklist:
1. **Permissions denied?**
   - Uninstall app completely
   - Reinstall and allow permissions

2. **Android-specific:**
   - Check notification channel created
   - Check system notification settings for the app
   - Verify Android 8.0+ compatibility

3. **iOS-specific:**
   - Check device ringer switch (physical switch on side)
   - Check Do Not Disturb mode
   - Verify notifications enabled in iOS Settings → Expo Go

4. **Code issues:**
   - Run `npm run validate` (should pass)
   - Check console for errors
   - Verify all listeners have cleanup functions

---

## Success Criteria

**Phase 6 is working correctly if:**

✅ All 7 tests pass  
✅ Notifications appear reliably in background  
✅ Navigation from notification works  
✅ No false positives (own messages, foreground)  
✅ Console logs show expected behavior  

**If all tests pass, Phase 6 is complete and ready for Phase 7!** 🎉

---

## Next Steps After Testing

1. ✅ All smoke tests pass → Ready for Phase 7
2. ❌ Some tests fail → Debug specific issues (see troubleshooting above)
3. 📝 Note any bugs/issues for Phase 7 testing phase

**DO NOT** update `PROGRESS_TRACKER.md` yet - wait for full Phase 7 comprehensive testing.

