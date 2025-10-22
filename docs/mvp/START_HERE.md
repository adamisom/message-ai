# MessageAI MVP - START HERE 🚀

**Welcome! This guide will get you from zero to a working messaging app MVP as fast as possible.**

---

## 📚 Documentation Overview

Your project now has comprehensive documentation:

### 1. **mvp-prd-plus.md** (Original PRD)
- Complete product requirements
- Technical specifications
- Firestore schema
- Implementation patterns
- **USE FOR:** Understanding requirements and technical details

### 2. **TASK_LIST.md** (This is your roadmap)
- Comprehensive task breakdown by phase
- Granular subtasks with file mappings
- Testable milestones
- Priority matrix
- **USE FOR:** Step-by-step implementation guide

### 3. **FILE_STRUCTURE_GUIDE.md** (Implementation reference)
- Complete file structure
- Code examples for every file
- File dependencies
- Implementation order
- **USE FOR:** Copy-paste code patterns and understanding file relationships

### 4. **QUICK_REFERENCE.md** (Keep this open while coding)
- Critical rules
- Common patterns
- Firestore queries
- Troubleshooting
- **USE FOR:** Quick lookups during development

### 5. **PROGRESS_TRACKER.md** (Track your work)
- Checkbox lists for all tasks
- Testing checklists
- Time tracking
- Notes section
- **USE FOR:** Tracking progress and ensuring nothing is missed

### 6. **START_HERE.md** (You are here)
- Quick start guide
- Next steps
- Document navigation

---

## 🎯 Your Mission

Build a production-quality messaging app MVP in 24 hours with these core features:
- ✅ Authentication (register/login)
- ✅ User discovery by email
- ✅ One-on-one messaging
- ✅ Group messaging
- ✅ Real-time sync
- ✅ Offline support
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Online/offline status
- ✅ Notifications

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Review the Plan
```bash
# Open these files in your editor:
1. docs/TASK_LIST.md         # Your roadmap
2. docs/QUICK_REFERENCE.md   # Keep this open
3. docs/PROGRESS_TRACKER.md  # Check off as you go
```

### Step 2: Verify Environment
```bash
# Check Node.js version (need 20.19.4+)
node --version

# Check Expo CLI
expo --version

# If not installed:
npm install -g expo@latest
```

### Step 3: Install Dependencies
```bash
# From project root
npm install

# Install additional packages
npm install firebase zustand @react-native-async-storage/async-storage
npm install react-native-paper
npx expo install @react-native-community/netinfo
npx expo install expo-notifications
```

### Step 4: Set Up Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project
3. Enable Email/Password authentication
4. Create Firestore database (test mode)
5. Copy credentials
6. Create `.env` file in project root:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Step 5: Start Development
```bash
# Start Expo development server
npx expo start

# In another terminal, open Android emulator
npx expo start --android

# Or iOS simulator (macOS only)
npx expo start --ios
```

---

## 📋 Implementation Workflow

### Phase-by-Phase Approach

```
┌─────────────────────────────────────────────────┐
│  Phase 0: Setup (2h)                            │
│  ✓ Firebase config                              │
│  ✓ Dependencies                                 │
│  ✓ File structure                               │
└─────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────┐
│  Phase 1: Authentication (2.5h)                 │
│  ✓ Register/Login screens                       │
│  ✓ Session persistence                          │
│  ✓ Auth guard                                   │
└─────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────┐
│  Phase 2: User Discovery (2.5h)                 │
│  ✓ Email lookup                                 │
│  ✓ Conversation creation                        │
│  ✓ Conversations list                           │
└─────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────┐
│  Phase 3: Core Messaging (4h)                   │
│  ✓ Chat screen                                  │
│  ✓ Send/receive messages                        │
│  ✓ Optimistic updates                           │
│  ✓ Offline support                              │
└─────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────┐
│  Phase 4: Groups (1.5h)                         │
│  ✓ Group chat support                           │
│  ✓ Sender names                                 │
└─────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────┐
│  Phase 5: Real-time Features (3h)               │
│  ✓ Typing indicators                            │
│  ✓ Online/offline status                        │
│  ✓ Read receipts                                │
└─────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────┐
│  Phase 6: Notifications (1.5h)                  │
│  ✓ Local notifications                          │
│  ✓ Navigation on tap                            │
└─────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────┐
│  Phase 7: Testing & Polish (5h)                 │
│  ✓ End-to-end testing                           │
│  ✓ Bug fixes                                    │
│  ✓ Documentation                                │
└─────────────────────────────────────────────────┘
```

### For Each Phase:
1. **Open TASK_LIST.md** → Find your phase
2. **Open FILE_STRUCTURE_GUIDE.md** → See code examples
3. **Open QUICK_REFERENCE.md** → Reference patterns
4. **Implement** → Follow subtasks in order
5. **Test** → Use phase completion checklist
6. **Check off** → Mark complete in PROGRESS_TRACKER.md
7. **Move to next phase**

---

## 🎓 Learning Path

### Never Built a Messaging App Before?
**Follow this learning sequence:**

1. **Read:** mvp-prd-plus.md Sections 1-3 (scope, tech stack, features)
2. **Understand:** Firestore schema (Section 3 of PRD)
3. **Learn:** Key architectural decisions (Section 2 of PRD)
4. **Study:** FILE_STRUCTURE_GUIDE.md code examples
5. **Start:** TASK_LIST.md Phase 0

### Experienced with React Native?
**Fast track:**

1. **Skim:** mvp-prd-plus.md for requirements
2. **Copy:** Firestore schema from QUICK_REFERENCE.md
3. **Start:** TASK_LIST.md Phase 0
4. **Reference:** FILE_STRUCTURE_GUIDE.md as needed

---

## 🔥 Critical Rules (Memorize These)

### 1. **Always Use Server Timestamps**
```typescript
// ✅ CORRECT
createdAt: serverTimestamp()

// ❌ WRONG - Will break message ordering
createdAt: new Date()
```

### 2. **Always Clean Up Firestore Listeners**
```typescript
// ✅ CORRECT
useEffect(() => {
  const unsubscribe = onSnapshot(/*...*/);
  return () => unsubscribe(); // CRITICAL!
}, []);

// ❌ WRONG - Memory leaks and crashes
useEffect(() => {
  onSnapshot(/*...*/);
  // Missing cleanup!
}, []);
```

### 3. **Never Upgrade Dependencies**
- Expo SDK 54 (PINNED)
- React 19.1.0 (PINNED)
- React Native 0.81 (PINNED)

---

## 🧪 Testing Strategy

### After Each Phase:
```bash
# 1. Check for errors
npm run lint

# 2. Run the app
npx expo start --clear

# 3. Test on emulator
# - Android: Press 'a'
# - iOS: Press 'i' (macOS only)

# 4. Verify phase completion checklist
# Open PROGRESS_TRACKER.md and check off items
```

### Critical Tests:
- **Phase 1:** Register → Login → Restart app → Still logged in
- **Phase 2:** Find user → Create chat → Chat appears in list
- **Phase 3:** Send message → Appears instantly → Persists after restart
- **Phase 4:** Create group → Send message → All receive
- **Phase 5:** Type → Indicator shows → Go offline → Status updates
- **Phase 6:** Receive message → Notification appears → Tap → Opens chat

---

## 🐛 Common Issues & Solutions

### "Firebase initialization failed"
- Check `.env` file exists and has correct values
- Ensure `.env` keys start with `EXPO_PUBLIC_`
- Restart Expo server: `npx expo start --clear`

### "Can't find module"
- Run `npm install` again
- Clear cache: `npx expo start --clear`
- Delete `node_modules`, run `npm install`

### "Emulator won't launch"
- Check Android Studio is installed
- Verify ANDROID_HOME is set
- Allocate more RAM to emulator

### "Messages not in order"
- Verify using `serverTimestamp()`, not `new Date()`
- Check `orderBy('createdAt', 'asc')` in query

### "App crashes on navigation"
- Check all Firestore listeners have cleanup
- Look for missing `return () => unsubscribe()`

### More solutions: QUICK_REFERENCE.md → "Common Issues & Solutions"

---

## 📊 Progress Tracking

### Daily Standup (Do This Every 2-3 Hours):
1. **What did I complete?** → Check PROGRESS_TRACKER.md
2. **What am I working on?** → Current phase in TASK_LIST.md
3. **Any blockers?** → Document in PROGRESS_TRACKER.md notes
4. **On schedule?** → Compare with 24-hour timeline

### Milestone Markers:
- [ ] Hour 2: Phase 0 complete (Firebase working)
- [ ] Hour 4.5: Phase 1 complete (Auth working)
- [ ] Hour 7: Phase 2 complete (Can create chats)
- [ ] Hour 11: Phase 3 complete (Messaging works)
- [ ] Hour 12.5: Phase 4 complete (Groups work)
- [ ] Hour 15.5: Phase 5 complete (Real-time features)
- [ ] Hour 17: Phase 6 complete (Notifications)
- [ ] Hour 22: Phase 7 complete (All tested)
- [ ] Hour 24: DONE! 🎉

---

## 🎯 Success Criteria

### Your MVP is complete when:
- ✅ Users can register and login
- ✅ Users can find each other by email
- ✅ Users can send/receive messages in real-time
- ✅ Messages persist across sessions
- ✅ Groups work with 3+ users
- ✅ Typing indicators show
- ✅ Online/offline status displays
- ✅ Read receipts work
- ✅ Offline messages queue and sync
- ✅ Notifications appear
- ✅ No crashes or memory leaks
- ✅ Works on Android emulator
- ✅ Works on iOS simulator (if macOS)

---

## 🚀 Ready to Start?

### Your Action Plan:

**Right Now (Next 5 minutes):**
1. [ ] Bookmark QUICK_REFERENCE.md in your browser
2. [ ] Open TASK_LIST.md in your editor
3. [ ] Open PROGRESS_TRACKER.md in another tab
4. [ ] Create Firebase project
5. [ ] Run `npm install`

**Next (Phase 0 - 2 hours):**
1. [ ] Complete Firebase setup
2. [ ] Install all dependencies
3. [ ] Create `.env` file
4. [ ] Create file structure
5. [ ] Test: `npx expo start` works

**Then:**
- Follow TASK_LIST.md phase by phase
- Check off items in PROGRESS_TRACKER.md
- Reference FILE_STRUCTURE_GUIDE.md for code
- Use QUICK_REFERENCE.md for patterns
- Test thoroughly after each phase

---

## 💡 Pro Tips

### Speed Optimization:
1. **Copy-paste from FILE_STRUCTURE_GUIDE.md** - Don't type everything from scratch
2. **Test frequently** - Catch issues early
3. **Skip nice-to-haves** - Focus on must-haves first (see TASK_LIST.md priority matrix)
4. **Use hot reload** - Save time on rebuilds
5. **Keep QUICK_REFERENCE.md open** - Avoid searching for patterns

### Quality Assurance:
1. **Always clean up listeners** - Prevents 90% of crashes
2. **Always use server timestamps** - Prevents ordering issues
3. **Test offline mode** - Use airplane mode
4. **Test with 2-3 users** - Open multiple emulators/devices
5. **Restart app frequently** - Verify persistence

### Time Management:
1. **Don't over-engineer** - Simple solutions work
2. **Don't perfect styling** - Functional > beautiful for MVP
3. **Don't add features** - Stick to TASK_LIST.md
4. **Do test each phase** - Saves debugging time later
5. **Do take breaks** - Stay sharp

---

## 📞 Need Help?

### Resources:
- **Expo Docs:** https://docs.expo.dev/
- **Firebase Docs:** https://firebase.google.com/docs
- **React Native Docs:** https://reactnative.dev/

### Debugging Checklist:
1. Check console for errors
2. Verify `.env` file
3. Check Firebase Console (Authentication, Firestore)
4. Clear cache: `npx expo start --clear`
5. Check QUICK_REFERENCE.md "Common Issues"
6. Review FILE_STRUCTURE_GUIDE.md for that file

---

## 🎉 You've Got This!

**Remember:**
- Speed is critical, but working features matter more
- Test after each phase
- Don't skip cleanup functions
- Use server timestamps
- Follow the task list
- Reference the guides

**Now go build something amazing! Start with Phase 0 in TASK_LIST.md** 🚀

---

**Next Step:** Open `docs/TASK_LIST.md` and begin Phase 0!

