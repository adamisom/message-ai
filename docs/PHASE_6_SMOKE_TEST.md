# Phase 6: Notifications - Quick Smoke Test

**Time Required:** 5-10 minutes  
**Setup:** 2 devices/emulators with registered users (test1@example.com, test2@example.com)

---

## Prerequisites

✅ Phase 6 committed  
✅ Dev server running: `npx expo start`  
✅ 2 test users registered  

---

## Quick Test Checklist

### Test 1: Permission Request (1 min)
1. Fresh install or clear app data
2. Launch app → Login
3. ✅ Permission dialog appears, tap "Allow"
4. ✅ Console: `✅ Notification permissions granted`

### Test 2: Notification in Background (2 min)
1. **Device 1:** Open chat with test2 → Press home button
2. **Device 2:** Send "Test notification"
3. ✅ Notification appears with sender name + message text
4. ✅ Sound plays (if not muted)
5. ✅ Console: `🔔 [ChatScreen] Triggering notification for new message from...`

### Test 3: Tap Navigation (1 min)
1. **Device 1:** Tap the notification
2. ✅ App opens to correct conversation
3. ✅ Console: `📱 Notification tapped, navigating to: [conversationId]`

### Test 4: No Notification for Own Messages (1 min)
1. **Device 1:** Put app in background → Bring to foreground
2. **Device 1:** Send "Own message test"
3. ✅ NO notification on Device 1
4. ✅ Device 2 receives notification (if backgrounded)

### Test 5: No Notification When Foreground (1 min)
1. **Device 1:** Keep chat open in foreground
2. **Device 2:** Send "Foreground test"
3. ✅ NO notification on Device 1
4. ✅ Message appears in chat in real-time
5. ✅ Console: `isAppForeground: true`

### Test 6: Group Chat (2 min)
1. **Device 1:** Create group with test2 and test3 → Put in background
2. **Device 2:** Send "Group notification test"
3. ✅ Device 1 receives notification with sender name
4. ✅ Tapping opens group chat

### Test 7: Long Message Truncation (1 min)
1. **Device 1:** Put in background
2. **Device 2:** Send 200+ character message
3. ✅ Notification truncated to 100 chars with "..."
4. ✅ Full message visible when opening chat

---

## Success Criteria

**Phase 6 is working if:**

- [ ] ✅ Permission request works
- [ ] ✅ Notifications appear in background
- [ ] ✅ Tapping navigates correctly
- [ ] ✅ No notification for own messages
- [ ] ✅ No notification when foreground
- [ ] ✅ Group chats work
- [ ] ✅ Long messages truncated

---

## Troubleshooting

### Notifications Don't Appear

**Permissions:**
- Uninstall app completely and reinstall
- Check system notification settings

**Android:**
- Verify notification channel created in console
- Check app notification settings (not disabled)

**iOS:**
- Check ringer switch (physical switch on side)
- Disable Do Not Disturb mode
- Settings → Expo Go → Notifications (enabled)

**Code:**
- Run `npm run validate` (should pass)
- Check console for `isAppForeground: false` when backgrounded
- Verify AppState listener is working

### Tap Navigation Fails

- Check `conversationId` in notification data (console logs)
- Verify router is accessible in `app/_layout.tsx`
- Restart dev server

### Console Errors

Run validation: `npm run validate`  
All tests should pass (lint, type-check, 74 tests)

---

## Known MVP Limitations

These are **expected behavior**, not bugs:

1. **No notifications when app is force-quit** - Local notifications only work in recent apps (Post-MVP: FCM)
2. **Badge count doesn't clear** - iOS badge management (Phase 7 or Post-MVP)
3. **Multiple notifications stack** - No grouping (Post-MVP: requires native code)

---

## Key Console Logs

✅ **Good:**
```
✅ Notification permissions granted
📱 [ChatScreen] App state changed: background isForeground: false
🔔 [ChatScreen] Triggering notification for new message from test2
📱 Notification tapped, navigating to: conv_abc123
```

⚠️ **Issues:**
```
❌ Notification permissions denied
Error scheduling notification: [error]
```

---

**If all tests pass → Phase 6 complete, ready for Phase 7!** 🎉
