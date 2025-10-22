# Phase 5: Real-Time Features - Testing Checklist

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Testing Status:** ⏳ Pending

---

## 🎯 Testing Overview

This document provides a concise checklist for testing Phase 5's three real-time features:
1. **Typing Indicators** - Show "User is typing..." when someone types
2. **Online/Offline Status** - Display green dot and last seen timestamps
3. **Read Receipts** - Show ✓ (sent) and ✓✓ (read) for messages

---

## ⚙️ Prerequisites

- [ ] Firestore Security Rules updated in Firebase Console
- [ ] Two test devices/simulators available
- [ ] Two test accounts created and logged in
- [ ] Both devices have network connectivity

---

## 1️⃣ Typing Indicators

### Direct Chat
- [ ] Open same direct chat on Device A and Device B
- [ ] Type on Device A → "User A is typing..." appears on Device B
- [ ] Stop typing on Device A → Indicator disappears after 500ms on Device B
- [ ] Send message on Device A → Indicator disappears immediately on Device B
- [ ] Type simultaneously on both devices → Both users see typing indicator

### Group Chat
- [ ] Open same group chat on Device A, B, and C
- [ ] Type on Device A → "User A is typing..." appears on B and C
- [ ] Type on Device B → "User B is typing..." appears on A and C
- [ ] Type on both A and B → "2 people are typing..." appears on C
- [ ] Stop typing → Indicator clears after 500ms

### Edge Cases
- [ ] Leave chat while typing → Indicator clears on other devices
- [ ] Background app while typing → Indicator clears after 500ms
- [ ] Network disconnects while typing → Indicator eventually clears

---

## 2️⃣ Online/Offline Status

### Basic Presence
- [ ] User A logs in → Green dot appears for User A on Device B's conversation list
- [ ] User A logs out → Green dot disappears, "Last seen" timestamp appears
- [ ] User A backgrounds app → Status changes to offline after ~5s
- [ ] User A foregrounds app → Status changes to online immediately

### Chat Screen Display
- [ ] Open direct chat with User A on Device B
- [ ] User A is online → Green dot in header, "Online" text shown
- [ ] User A goes offline → Green dot disappears, "Last seen X minutes ago" shown
- [ ] Timestamp updates → "Last seen" refreshes properly (1m, 5m, 1h, etc.)

### Multi-Device
- [ ] User A logs in on Device A → Shows online on all other devices
- [ ] User A logs in on Device C also → Stays online (doesn't flicker)
- [ ] User A logs out of Device A → Still online if Device C is active
- [ ] User A logs out of both → Shows offline everywhere

---

## 3️⃣ Read Receipts

### Direct Chat
- [ ] User A sends message → Single checkmark ✓ appears on Device A
- [ ] User B opens chat → Message marked as read
- [ ] Double checkmark ✓✓ appears on Device A immediately
- [ ] Send multiple messages → All show ✓✓ after User B opens chat

### Group Chat (3+ participants)
- [ ] User A sends message → Single checkmark ✓ appears
- [ ] User B opens chat → Message still shows ✓ (not all read)
- [ ] User C opens chat → Double checkmark ✓✓ appears (all participants read)
- [ ] New participant joins group → Send new message, verify checkmark logic

### Edge Cases
- [ ] Send message while offline → Shows ⏳ or 📤 (queued)
- [ ] Message fails to send → Shows ❌ (failed)
- [ ] Open chat while offline → Read receipt updates when back online
- [ ] Mark as read while sender is offline → Updates when sender comes online

---

## 4️⃣ Performance & Debouncing

### Typing Debounce
- [ ] Type rapidly → Firestore writes limited to 1 per 500ms
- [ ] Check Firestore console → `typingUsers` subcollection updates efficiently
- [ ] Stop typing → Document clears after 500ms inactivity

### Listener Cleanup
- [ ] Open chat → Subscribe to listeners
- [ ] Navigate away → Listeners unsubscribe (check console logs)
- [ ] Open/close chat 10x → No memory leaks, listeners clean up properly

---

## 5️⃣ Cross-Feature Integration

### Scenario: Full Conversation Flow
1. [ ] User A opens chat (shows online)
2. [ ] User A starts typing (typing indicator appears on B)
3. [ ] User A sends message (typing clears, message shows ✓)
4. [ ] User B opens chat (User B shows online, message shows ✓✓)
5. [ ] User B starts typing (typing indicator on A)
6. [ ] User B sends reply (typing clears, message shows ✓)
7. [ ] User A sees reply immediately (message shows ✓✓, User B online)

---

## 6️⃣ Offline Banner Integration

- [ ] Disconnect network on Device A → "You're offline" banner appears
- [ ] Typing while offline → No Firestore writes, no errors in console
- [ ] Send message while offline → Message queued (📤) locally
- [ ] Reconnect network → Queued messages send, ✓✓ updates, typing works

---

## 🐛 Known Issues & Workarounds

| Issue | Severity | Workaround |
|-------|----------|------------|
| Typing indicator flickers on slow networks | Low | Expected behavior due to debounce |
| Last seen shows "0 minutes ago" briefly | Low | Firestore `serverTimestamp()` delay |
| Read receipts delayed ~1s in groups | Low | Firestore propagation time |

---

## 📊 Success Criteria

- ✅ **Typing indicators** work in direct and group chats
- ✅ **Online status** updates within 5 seconds of app state changes
- ✅ **Read receipts** show correct status (✓ vs ✓✓) based on participant reads
- ✅ **No console errors** during normal usage
- ✅ **No memory leaks** from listeners
- ✅ **Offline mode** gracefully degrades features

---

## 📝 Testing Notes

_Use this section to document any issues, observations, or edge cases discovered during testing._

---

## ✅ Sign-Off

- [ ] Typing indicators tested and working
- [ ] Online/offline status tested and working
- [ ] Read receipts tested and working
- [ ] Performance acceptable (no lag or jank)
- [ ] Offline behavior graceful
- [ ] Ready for production

**Tested By:** _____________  
**Date:** _____________  
**Issues Found:** _____________

