# Multi-Device Testing Guide

Quick reference for testing MessageAI with multiple devices.

---

## Quick Start

**1. Start Android Emulator:**

```bash
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_36.1 &
```

Wait 1-2 minutes for boot.

**2. Start Expo (Tunnel Mode):**

```bash
npx expo start --tunnel --clear
```

**3. Connect Devices:**

- **iPhone:** Scan QR code in Expo Go
- **Android:** Open Expo Go → Enter URL manually → Paste `exp://...` URL from terminal

---

## Multi-User Testing

**Register two users:**

- iPhone: `alice@test.com` / `password123` / "Alice"
- Android: `bob@test.com` / `password123` / "Bob"

**Test checklist:**

- [ ] Alice creates chat with Bob → Messages appear in < 1 second
- [ ] Bob starts typing → Alice sees "Bob is typing..." (stays 2 seconds)
- [ ] Alice backgrounds app → Bob sends message → Alice gets notification
- [ ] Alice taps notification → Opens to conversation
- [ ] Bob backgrounds app → Status shows "Last seen just now"

---

## Commands Reference

```bash
# Start emulator
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_36.1 &

# List available emulators
~/Library/Android/sdk/emulator/emulator -list-avds

# Kill dev servers
lsof -ti:8081,8083 | xargs kill -9

# Kill emulator
pkill -9 emulator

# Check connected devices
~/Library/Android/sdk/platform-tools/adb devices
```

---

## Troubleshooting

**Emulator won't start:**

```bash
pkill -9 emulator
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_36.1 &
```

**Connection issues:**

- Restart with `npx expo start --tunnel --clear`
- Reopen Expo Go app

**Firestore permission errors:**

- Firebase Console → Firestore → Rules → Publish
- Wait 10 seconds, then retry

---

**For detailed tests:** See `/docs/PHASE_6_SMOKE_TEST.md` and `/docs/PHASE_7_TESTING_POLISH.md`
