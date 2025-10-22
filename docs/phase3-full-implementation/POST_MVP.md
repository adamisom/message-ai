# Post-MVP Tasks

Tasks to complete after MVP launch/demo.

---

## Security & Infrastructure

- [ ] **Restore proper Firestore rules**
  - Current: Test mode (any authenticated user can read/write everything)
  - Target: Participant-only access (see `/firestore.rules` for proper rules)
  - Issue to debug: Rules validation passes but client-side permission errors
  - May need to check conversation creation logic or auth token state

---

## Known Limitations to Address

- [ ] **Background notifications** - Currently local only, implement FCM
- [ ] **Message editing/deletion** - Not implemented in MVP
- [ ] **Media uploads** - Text-only in MVP, add images/files
- [ ] **Infinite scroll** - Currently loads last 100 messages only
- [ ] **Badge count management** - iOS badge doesn't clear automatically
- [ ] **Notification grouping** - Multiple messages create separate notifications

---

## Performance & UX

- [ ] Remove debug console.logs (keep emoji-prefixed logs for now)
- [ ] Add message retry logic for failed sends
- [ ] Implement connection recovery for long disconnects
- [ ] Add data sync verification after offline periods

---

## Nice-to-Have Features

- [ ] Username system (currently email-based discovery)
- [ ] Read receipts detail ("Read by Alice, Bob")
- [ ] Message reactions (emoji)
- [ ] Voice messages
- [ ] End-to-end encryption

---

## Deployment Preparation

- [ ] Add bundle identifier back to `app.json`:
  - iOS: `bundleIdentifier: "com.messageai.app"`
  - Android: `package: "com.messageai.app"`
- [ ] Create development build with `eas build`
- [ ] Configure FCM for push notifications
- [ ] Deploy proper Firestore rules
- [ ] Set up production Firebase project (separate from dev)

---

**Priority order:** Security → Performance → Features → Deployment

