# Phase 4: Manual Testing Guide

**Workspaces & Paid Tier - All Sub-Phases**

Test Duration: ~30 minutes full suite (or 5 min for quick smoke test)  
Last Updated: October 26, 2025

**Test Coverage:**

- ✅ Sub-Phases 1-2: Workspaces, Trial, Billing Foundation (Tests 1-14)
- ✅ Sub-Phase 3: Admin Action Item Assignment (Tests 23-28)
- ✅ Sub-Phase 4: Invitation Notifications (Tests 15-22)
- ✅ Sub-Phase 5: Workspace Chats (Tests 29-36)
- ✅ Sub-Phase 6: AI Feature Gating (Tests 37-42)

---

## 🔥 Quick Smoke Test (2-3 minutes)

**For rapid verification that core features work. Run this first!**

### Prerequisites

```bash
npx expo start
# Login as adam1-gmail (Pro user)
```

### Essential Tests

**1. Workspaces Tab Loads (15 sec)**

- Tap "Workspaces" tab → Should see workspace list or empty state ✓

**2. Create Workspace (45 sec)**

- Tap "Create Workspace"
- Enter name: "Smoke Test"
- Select 5 users
- Tap Create
- **PASS IF:** Success alert + workspace appears in list ✓

**3. Trial User AI Access (45 sec)**

- Logout → Login as adam3-Hey (trial user)
- Open any chat
- Tap Sparkle (✨)
- Tap "Summarize Thread"
- **PASS IF:** No paywall + AI summary works ✓

**4. Upgrade Flow (45 sec)**

- Manually expire adam3's trial in Firestore (set trialEndsAt to yesterday)
- Tap Sparkle → Any AI feature
- Tap "Upgrade Now" → Confirm
- **PASS IF:** Success alert + user upgraded ✓

**🎯 If all 4 pass: Core functionality working! Continue with full test suite below.**  
**❌ If any fail: Stop and debug before full testing.**

---

## Prerequisites

### 1. Start Development Server

```bash
cd /Users/adamisom/Desktop/message-ai
npx expo start
```

### 2. Test Users Available

- **adam1-gmail** (<adam.r.isom@gmail.com>) - Pro subscriber
- **adam2-gmailAlt** (<adam.r.isom+alt@gmail.com>) - Pro subscriber
- **adam3-Hey** (<adamisom@hey.com>) - Trial user (5 days remaining)
- **adam4** (<adamisom+test@hey.com>) - Trial user (5 days remaining)

### 3. Verify Backend Status

```bash
# Confirm all Cloud Functions deployed
firebase functions:list

# Verify trial fields
node scripts/testTrialAndUpgrade.js
```

---

## Test Suite

### ✅ Test 1: View Workspaces Tab (30 seconds)

**Steps:**

1. Open app
2. Tap "Workspaces" tab (business icon in tab bar)

**Expected Results:**

- ✓ Workspaces screen loads
- ✓ Tab bar shows 3 tabs: Chats | Workspaces | New Chat
- ✓ Shows "No Workspaces Yet" (if none exist) or workspace list
- ✓ Shows "Create Workspace" button

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 2: Create Workspace (2 min)

**Prerequisites:** Logged in as Pro user (adam1-gmail or adam2-gmailAlt)

**Steps:**

1. In Workspaces tab, tap "Create Workspace" button or + icon
2. Enter workspace name: "Test Team"
3. Select capacity: 5 users (should show $2.50/month)
4. Review billing summary
5. Tap "Create Workspace"

**Expected Results:**

- ✓ Create form displays correctly
- ✓ Capacity options show pricing ($0.50/user)
- ✓ Billing summary calculates: 5 × $0.50 = $2.50/month
- ✓ Success alert appears
- ✓ Workspace appears in list with "Admin" badge
- ✓ Shows correct member count (1 of 5)
- ✓ Shows monthly charge ($2.50)

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 3: View Workspace Settings (1 min)

**Steps:**

1. From workspace list, tap settings icon (gear) on workspace card
2. Review all displayed information

**Expected Results:**

- ✓ Workspace name displayed prominently
- ✓ "You're the Admin" badge visible
- ✓ Stats dashboard shows:
  - 1 member
  - 0 group chats
  - 0 messages
- ✓ Billing section shows:
  - Capacity: 5 users
  - Price per user: $0.50/month
  - Monthly charge: $2.50/month
- ✓ "Manage Members" button visible
- ✓ "Invite Member" button visible
- ✓ "Delete Workspace" button visible (Danger Zone)

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 4: View Members Screen (1 min)

**Steps:**

1. In workspace settings, tap "Manage Members"
2. Review member list

**Expected Results:**

- ✓ Shows "1 of 5 capacity used" at top
- ✓ Member card displays:
  - Avatar with first letter
  - Display name
  - Email address
  - "Admin" badge
- ✓ "Invite Member" button at bottom
- ✓ No remove button for admin (self)

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 5: Delete Workspace (1 min)

**Steps:**

1. Navigate back to workspace settings
2. Scroll to "Danger Zone"
3. Tap "Delete Workspace"
4. Read confirmation modal text
5. Tap "Delete Forever"

**Expected Results:**

- ✓ Scary confirmation modal appears with:
  - Warning emoji (⚠️)
  - Workspace name mentioned
  - "PERMANENTLY delete" warning
  - "ALL workspace chats" warning
  - "CANNOT be undone" warning
  - Member count mentioned
- ✓ After confirmation:
  - Success alert appears
  - Redirected to workspaces list
  - Workspace no longer in list
  - Empty state shown (if no other workspaces)

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 6: Workspace Limit (5 workspace max) (2 min)

**Prerequisites:** Pro user with 0 workspaces

**Steps:**

1. Create 5 workspaces in succession:
   - "Team 1" - 2 users
   - "Team 2" - 2 users
   - "Team 3" - 2 users
   - "Team 4" - 2 users
   - "Team 5" - 2 users
2. Attempt to create 6th workspace

**Expected Results:**

- ✓ All 5 workspaces create successfully
- ✓ All 5 appear in workspace list
- ✓ Attempt #6 shows error alert:
  - "Workspace limit reached (5 max)"
- ✓ User prevented from creating more

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 7: Trial User Blocked from Workspace Creation (2 min)

**Prerequisites:** Logout, login as trial user (adam3-Hey or adam4)

**Steps:**

1. Navigate to Workspaces tab
2. Tap "Create Workspace" button
3. Observe result

**Expected Results:**

- ✓ Error alert appears:
  - "Pro subscription required to create workspaces"
- ✓ Workspace creation form does NOT open
- ✓ User remains on workspaces list

**Alternative (if upgrade modal integrated):**

- ✓ Upgrade modal appears instead
- ✓ Shows pricing and features
- ✓ Can dismiss modal

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 8: Workspace Switcher (1 min)

**Prerequisites:** Pro user with 2+ workspaces

**Steps:**

1. View workspaces list with multiple workspaces
2. Tap on first workspace card (NOT settings icon)
3. Observe current workspace indicator
4. Tap on different workspace card

**Expected Results:**

- ✓ Tapped workspace shows:
  - Green checkmark indicator
  - "Current: [Workspace Name]" banner at top
  - Different border/background color
- ✓ Switching between workspaces updates indicator
- ✓ Only one workspace marked as current at a time

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 9: Trial User AI Access (CRITICAL) (2 min)

**Prerequisites:** Login as trial user (adam3 or adam4)

**Steps:**

1. Open any existing chat
2. Tap Sparkle (✨) menu
3. Observe menu contents
4. Tap "Summarize Thread"
5. Wait for AI response

**Expected Results:**

- ✓ Sparkle menu opens without errors
- ✓ Shows trial info banner: "✨ X days left in trial"
- ✓ NO paywall/upgrade prompt appears
- ✓ AI summary feature executes
- ✓ Summary generates successfully
- ✓ No "Upgrade to Pro" blocking

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 10: Expired Trial Blocks AI Access (2 min)

**Prerequisites:**

1. Manually expire a trial user's trial in Firestore
2. Set `trialEndsAt` to yesterday's date

**Steps:**

1. Login as expired trial user
2. Open any chat
3. Tap Sparkle (✨) menu
4. Tap any AI feature

**Expected Results:**

- ✓ Sparkle menu shows locked banner:
  - "🔒 Upgrade to Pro to unlock AI features"
- ✓ Tapping AI feature shows upgrade modal
- ✓ Cloud Function rejects request with:
  - "Upgrade to Pro" message

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 11: Upgrade to Pro Flow (2 min)

**Prerequisites:** Free user (expired trial, no workspace)

**Steps:**

1. Open Sparkle menu → Tap any AI feature
2. Upgrade modal appears
3. Review modal contents
4. Tap "Upgrade Now"
5. Confirm in alert
6. Wait for success message

**Expected Results:**

- ✓ Upgrade modal displays:
  - ⭐ Star icon
  - "Upgrade to Pro" title
  - Features list (AI, workspaces, etc.)
  - Pricing: $9.99/month
  - "Upgrade Now" button
  - "MVP Mode: Instant upgrade" note
- ✓ After confirmation:
  - Success alert: "You've been upgraded to Pro!"
  - User document updated in Firestore
  - isPaidUser = true
  - subscriptionTier = 'pro'
- ✓ After refresh:
  - Can access AI features
  - Can create workspaces

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 12: Duplicate Workspace Name (Case-Insensitive) (1 min)

**Steps:**

1. Create workspace: "Marketing Team"
2. Attempt to create: "marketing team" (different case)

**Expected Results:**

- ✓ Second attempt shows error:
  - "You already have a workspace with that name"
- ✓ Case-insensitive comparison working
- ✓ First workspace unaffected

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 13: Pull to Refresh Workspaces (30 seconds)

**Steps:**

1. On workspaces list screen
2. Pull down to refresh

**Expected Results:**

- ✓ Loading spinner appears
- ✓ Workspace list reloads
- ✓ No errors occur

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 14: Navigation Flow (1 min)

**Steps:**

1. Start at Chats tab
2. Tap Workspaces tab
3. Create or open workspace
4. Navigate to settings
5. Navigate to members
6. Use back buttons to return

**Expected Results:**

- ✓ All navigation transitions smooth
- ✓ Back buttons work correctly
- ✓ No navigation stack errors
- ✓ Tab bar remains visible/hidden appropriately

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

## Sub-Phase 3: Admin Action Item Assignment Tests

### ✅ Test 23: Admin Can See "Assign" Button (2 min)

**Prerequisites:**

- Workspace created with at least 2 members (admin + 1 member)
- Workspace chat with messages that generate action items

**Steps:**

1. Log in as the **workspace admin**
2. Open a **workspace chat** (not a personal chat)
3. Send messages that trigger AI action items (e.g., "I need to finish the report by Friday")
4. Open the AI Features menu (sparkle icon)
5. Select "Action Items"

**Expected Results:**

- ✓ Each **unassigned** action item shows **"➕ Assign"** button
- ✓ Already assigned items show **"👤 [Member Name]"** instead
- ✓ Modal displays correctly with admin controls

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 24: Assign Action Item to Member (2 min)

**Prerequisites:** Workspace admin in workspace chat with action items (from Test 23)

**Steps:**

1. Click **"➕ Assign"** on an action item
2. Review member picker modal
3. Click on a member's name to assign

**Expected Results:**

- ✓ Member picker modal appears showing all workspace members
- ✓ Member list shows **"👤 [Display Name]"** for each member
- ✓ Picker has **"Cancel"** button at bottom
- ✓ After selecting member:
  - Modal closes immediately
  - Action item updates to show **"👤 [Assigned Member Name]"**
  - No "Scanning for action items..." message (optimistic update)

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 25: Assignment Persists Across Sessions (2 min)

**Steps:**

1. After assigning an item in Test 24
2. Close the Action Items modal
3. **Close the app completely** (not just background)
4. Reopen the app and navigate back to same chat
5. Open Action Items modal again

**Expected Results:**

- ✓ Assigned action item still shows **"👤 [Assigned Member Name]"**
- ✓ Assignment persisted in Firestore

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 26: Non-Admin Cannot Assign (1 min)

**Steps:**

1. Log out
2. Log in as a **regular member** (not admin) of the workspace
3. Open the same workspace chat
4. Open Action Items modal

**Expected Results:**

- ✓ Action items are visible
- ✓ **NO "➕ Assign" button** appears (not an admin)
- ✓ Already assigned items still show **"👤 [Member Name]"**

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 27: Assignment Only Works in Workspace Chats (1 min)

**Steps:**

1. Log in as admin
2. Open a **personal (non-workspace) chat**
3. Send messages that generate action items
4. Open Action Items modal

**Expected Results:**

- ✓ Action items are visible
- ✓ **NO "➕ Assign" button** appears (not a workspace chat)

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 28: Cloud Function Authorization (1 min)

**Steps:**

1. As non-admin member, attempt to call Cloud Function directly (via console)

```javascript
// This should fail with "permission-denied"
const functions = getFunctions();
const assignFn = httpsCallable(functions, 'assignActionItem');
await assignFn({
  conversationId: 'someConvId',
  itemId: 'someItemId',
  assigneeUid: 'someUserId',
  assigneeDisplayName: 'Test User'
});
```

**Expected Results:**

- ✓ Error: "Only workspace admins can assign action items"
- ✓ Server-side validation prevents unauthorized assignments

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

## Sub-Phase 4: Invitation Notifications Tests

### ✅ Test 15: Profile Button Badge (2 min)

**Prerequisites:** 2 test accounts (User A = invitee, User B = admin)

**Steps:**

1. Login as User A (will be invitee)
2. Check profile button in top-right corner (no invitations yet)
3. Keep User A logged in, open second device/emulator
4. Login as User B (admin) on second device
5. User B: Navigate to Workspaces tab → Create workspace
   - Name: "Test Workspace"
   - Capacity: 5 users
   - Invite User A by email during creation
6. User A: Wait 30 seconds (auto-refresh) OR switch screens
7. User B: Send 2 more workspace invitations to User A
8. User A: Wait/refresh
9. Test badge cap: Create 10+ invitations

**Expected Results:**

- ✓ Badge appears ONLY when invitations exist
- ✓ Shows count of pending invitations
- ✓ Upper-left position, red background, white text
- ✓ Count updates automatically (30s) or on screen change
- ✓ Shows "9+" when count exceeds 9

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 16: Profile Screen Notifications Section (2 min)

**Prerequisites:** User A has pending invitations (from Test 15)

**Steps:**

1. User A: Tap the profile button (with badge)
2. Check notifications section (should appear at top, after logout button)
3. Tap on a notification card
4. Go back to profile, tap "View All Invitations" button

**Expected Results:**

- ✓ Section titled "Notifications" appears
- ✓ Each invitation shows:
  - Workspace icon (blue circle)
  - "Workspace Invitation" title
  - Text: "[Inviter Name] invited you to join [Workspace Name]"
  - Right chevron
- ✓ "View All Invitations (#)" button at bottom
- ✓ Section only appears when invitations exist
- ✓ Clean, prominent blue styling
- ✓ All tap targets navigate to /workspace/invitations

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 17: Invitations Screen Integration (3 min)

**Steps:**

1. User A: From profile, tap "View All Invitations"
2. Review invitations screen layout
3. Accept one invitation
4. Go back to profile screen
5. Decline another invitation
6. Accept the last invitation

**Expected Results:**

- ✓ Invitations screen shows all pending invitations
- ✓ Each with Accept/Decline/Report Spam buttons
- ✓ Accept: Success alert → count decreases
- ✓ Decline: Confirmation → count decreases
- ✓ Counts sync across profile button, profile screen, invitations screen
- ✓ When all accepted/declined:
  - Notifications section disappears from profile
  - Profile badge disappears
  - Invitations screen shows empty state

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 18: Real-Time Invitation Updates (2 min)

**Prerequisites:** User A has 0 invitations, User B is logged in

**Steps:**

1. User A: On profile screen with 0 invitations
2. User B: Send new workspace invitation to User A
3. User A: Wait 30 seconds OR switch tabs and return to profile

**Expected Results:**

- ✓ Notifications section appears automatically
- ✓ Profile badge appears automatically
- ✓ Updates within 30 seconds (auto-refresh)
- ✓ Updates immediately on screen focus

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 19: Decline Invitation Cloud Function (1 min)

**Steps:**

1. User A: Go to invitations screen
2. Tap "Decline" on an invitation
3. Confirm in alert dialog
4. Check Firestore Console

**Expected Results:**

- ✓ Invitation disappears from list
- ✓ Count decreases
- ✓ Firestore: Invitation status = "declined"
- ✓ Firestore: respondedAt timestamp set

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 20: Spam Reporting (2 min)

**Steps:**

1. User A: Go to invitations screen
2. Tap "Report as Spam" on an invitation
3. Confirm in alert
4. Check Firestore as User B (inviter)

**Expected Results:**

- ✓ Success alert: "Thank you for helping keep MessageAI safe."
- ✓ Invitation removed from list
- ✓ Firestore (User B): spamStrikes increments
- ✓ Firestore (User B): spamReportsReceived array has new entry

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 21: Edge Cases - Multiple Rapid Invitations (1 min)

**Steps:**

1. User B: Send 5 invitations to User A quickly (within seconds)
2. User A: Refresh profile

**Expected Results:**

- ✓ All 5 appear in notifications section
- ✓ Badge shows "5"
- ✓ All invitations functional (can accept/decline)

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 22: Navigation Flow (1 min)

**Steps:**

1. From Chats tab → Tap profile button → Tap notification → Invitations screen
2. Use back button to return through screens

**Expected Results:**

- ✓ All navigation works smoothly
- ✓ Back button returns correctly to previous screens
- ✓ No navigation stack errors

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

## Sub-Phase 5: Workspace Chats Tests

### ✅ Test 29: View Workspace Chat List When Workspace Selected (2 min)

**Prerequisites:** User is a member of a workspace with at least one workspace chat

**Steps:**
1. From Workspaces tab, tap on a workspace card (not settings icon)
2. Navigate to Chats tab
3. Observe the chat list

**Expected Results:**
- ✓ Workspace banner appears at top showing workspace name
- ✓ Banner shows "View All" button
- ✓ Only workspace chats displayed (filtered by workspaceId)
- ✓ Each workspace chat shows workspace badge (building icon)
- ✓ Non-workspace chats are hidden

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 30: Clear Workspace Filter (1 min)

**Steps:**
1. With workspace selected (from Test 29)
2. Tap "View All" button in workspace banner
3. Observe chat list

**Expected Results:**
- ✓ Workspace banner disappears
- ✓ All non-workspace chats appear
- ✓ Workspace chats are hidden (filtered out)
- ✓ Chat list returns to normal state

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 31: Create Direct Chat in Workspace (2 min)

**Prerequisites:** Workspace selected, at least one other workspace member

**Steps:**
1. Select a workspace from Workspaces tab
2. Navigate to New Chat tab
3. Observe workspace banner
4. Enter email of workspace member
5. Tap "Find User"
6. Tap "Create Chat"
7. Navigate back to Chats tab

**Expected Results:**
- ✓ Workspace banner shows: "Creating chat in: [Workspace Name]"
- ✓ Chat created successfully
- ✓ New chat appears in workspace chat list (when workspace selected)
- ✓ Chat has workspace badge (building icon)
- ✓ Chat has workspaceId and workspaceName fields in Firestore

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 32: Create Group Chat in Workspace (3 min)

**Prerequisites:** Workspace selected, at least 2 other workspace members

**Steps:**
1. Select a workspace from Workspaces tab
2. Navigate to New Chat tab
3. Tap "Switch to Group Chat"
4. Add 2+ workspace members by email
5. Tap "Create Group"
6. Navigate back to Chats tab

**Expected Results:**
- ✓ Workspace banner visible during creation
- ✓ Group chat created successfully
- ✓ Group shows in workspace chat list
- ✓ Group has both group icon (people) and workspace badge (building)
- ✓ Group has workspaceId, workspaceName, and isWorkspaceChat=true in Firestore

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 33: Non-Workspace Chat Creation (1 min)

**Steps:**
1. Clear any selected workspace (tap "View All" if workspace selected)
2. Navigate to New Chat tab
3. Observe - no workspace banner
4. Create a direct or group chat
5. Check chat list

**Expected Results:**
- ✓ No workspace banner in New Chat screen
- ✓ Chat created successfully
- ✓ Chat appears in "View All" mode (no workspace filter)
- ✓ Chat has NO workspace badge
- ✓ Chat has workspaceId=undefined in Firestore

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 34: Workspace Badge Visual Indicator (1 min)

**Steps:**
1. Create both workspace and non-workspace chats
2. Toggle between "View All" and workspace-filtered views
3. Observe conversation items

**Expected Results:**
- ✓ Workspace chats show building icon badge next to name
- ✓ Badge is light blue background with primary blue icon
- ✓ Non-workspace chats have NO badge
- ✓ Badge positioned correctly (after name, before status)

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 35: Workspace Context Persistence (2 min)

**Steps:**
1. Select a workspace
2. Navigate to different tabs (Chats, New Chat, Workspaces)
3. Return to Chats tab

**Expected Results:**
- ✓ Workspace selection persists across tab navigation
- ✓ Workspace banner remains visible in Chats tab
- ✓ New Chat screen continues showing workspace banner
- ✓ Filter remains active until explicitly cleared

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 36: Empty States (1 min)

**Steps:**
1. Select a workspace with no chats yet
2. Observe Chats tab empty state
3. Clear workspace filter
4. Observe "View All" empty state (if no non-workspace chats)

**Expected Results:**
- ✓ Workspace empty state: "No chats in [Workspace Name] yet"
- ✓ Subtext: "Start a conversation with workspace members"
- ✓ General empty state: "No conversations yet"
- ✓ General subtext: "Tap 'New Chat' to start a conversation"

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

## Sub-Phase 6: AI Feature Gating Tests

### ✅ Test 37: Free User AI Access in Workspace Chat (3 min)

**Prerequisites:** 
- Free user (expired trial, not Pro)
- Member of an active workspace
- Workspace chat with messages

**Steps:**
1. Login as free user (e.g., expire adam3's trial: set `trialEndsAt` to yesterday in Firestore)
2. Verify user is NOT Pro: Check Firestore `isPaidUser: false`
3. Select workspace from Workspaces tab
4. Open workspace chat
5. Tap Sparkle (✨) menu
6. Tap "Summarize Thread"

**Expected Results:**
- ✓ Sparkle menu opens without errors
- ✓ NO upgrade prompt shown
- ✓ AI summary generates successfully
- ✓ Free user can access AI features in workspace chats

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 38: Free User Blocked in Non-Workspace Chat (2 min)

**Prerequisites:** Same free user from Test 37

**Steps:**
1. Clear workspace filter (tap "View All")
2. Open a non-workspace personal chat
3. Tap Sparkle (✨) menu
4. Tap any AI feature

**Expected Results:**
- ✓ Upgrade modal appears
- ✓ Message: "Upgrade to Pro or join a workspace to access AI features"
- ✓ AI feature does NOT execute
- ✓ Free user blocked from AI in non-workspace chats

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 39: Pro User AI Access Everywhere (2 min)

**Prerequisites:** Pro user (adam1-gmail)

**Steps:**
1. Login as Pro user
2. Test AI in non-workspace chat
3. Test AI in workspace chat

**Expected Results:**
- ✓ AI works in non-workspace chats (no upgrade prompt)
- ✓ AI works in workspace chats
- ✓ Pro users have unrestricted AI access

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 40: Workspace Payment Lapsed (2 min)

**Prerequisites:** 
- Workspace with payment lapsed (set `isActive: false` in Firestore)
- Free member of that workspace

**Steps:**
1. Login as free user
2. Open workspace chat
3. Attempt to use AI feature

**Expected Results:**
- ✓ Error: "Workspace payment lapsed - read-only mode"
- ✓ AI feature blocked even for workspace members
- ✓ Clear error message about payment status

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 41: Trial User AI Access (1 min)

**Prerequisites:** Active trial user (adam3 or adam4 with trial active)

**Steps:**
1. Login as trial user
2. Test AI in non-workspace chat
3. Test AI in workspace chat

**Expected Results:**
- ✓ Trial banner shows: "✨ X days left in trial"
- ✓ AI works in non-workspace chats
- ✓ AI works in workspace chats
- ✓ No upgrade prompts during active trial

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

### ✅ Test 42: Cloud Function Authorization (2 min)

**Prerequisites:** Free user (expired trial), workspace chat

**Steps:**
1. Login as free user
2. Open workspace chat in Firestore Console
3. Note the `conversationId` and `workspaceId`
4. Verify user is in workspace members array
5. Call AI feature via Sparkle menu

**Expected Results:**
- ✓ Cloud Function checks:
  - User exists ✓
  - User not Pro → checks workspace
  - Conversation has workspaceId → loads workspace
  - User in workspace.members → grants access ✓
- ✓ AI feature executes successfully
- ✓ Server-side validation working correctly

**Status:** ⬜ Pass | ⬜ Fail

**Notes:**
_________________________________

---

## 🐛 Common Issues & Troubleshooting

### Issue: Workspaces tab not showing

**Fix:**

```bash
# Restart dev server
Ctrl+C
npx expo start
```

### Issue: "Pro subscription required" for test user

**Fix:**

```bash
# Manually upgrade user
node scripts/upgradeAdam1ToPro.js
```

### Issue: Trial not working / missing trial fields

**Fix:**

```bash
# Verify and migrate users
node scripts/testTrialAndUpgrade.js
node scripts/migrateExistingUsersToTrial.js
```

### Issue: Cloud Functions not responding

**Fix:**

```bash
# Verify deployment
firebase functions:list

# Check function logs
firebase functions:log

# Re-deploy if needed
firebase deploy --only functions
```

### Issue: Workspace doesn't appear after creation

**Fix:**

1. Pull to refresh on workspaces list
2. Check Firestore console for workspace document
3. Verify workspaceStore is loading correctly

---

## 📊 Test Results Summary

**Date:** _________________  
**Tester:** _________________  
**App Version:** Phase 4 (PaidTier branch)

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | View Workspaces Tab | ⬜ | |
| 2 | Create Workspace | ⬜ | |
| 3 | View Settings | ⬜ | |
| 4 | View Members | ⬜ | |
| 5 | Delete Workspace | ⬜ | |
| 6 | Workspace Limit | ⬜ | |
| 7 | Trial User Blocked | ⬜ | |
| 8 | Workspace Switcher | ⬜ | |
| 9 | Trial AI Access | ⬜ | |
| 10 | Expired Trial Blocks | ⬜ | |
| 11 | Upgrade Flow | ⬜ | |
| 12 | Duplicate Names | ⬜ | |
| 13 | Pull to Refresh | ⬜ | |
| 14 | Navigation | ⬜ | |
| **Sub-Phase 3** | | | |
| 23 | Admin Assign Button | ⬜ | |
| 24 | Assign to Member | ⬜ | |
| 25 | Assignment Persists | ⬜ | |
| 26 | Non-Admin Cannot Assign | ⬜ | |
| 27 | Workspace Chats Only | ⬜ | |
| 28 | Cloud Function Auth | ⬜ | |
| **Sub-Phase 4** | | | |
| 15 | Profile Badge | ⬜ | |
| 16 | Notifications Section | ⬜ | |
| 17 | Invitations Screen | ⬜ | |
| 18 | Real-Time Updates | ⬜ | |
| 19 | Decline Function | ⬜ | |
| 20 | Spam Reporting | ⬜ | |
| 21 | Edge Cases | ⬜ | |
| 22 | Navigation Flow | ⬜ | |
| **Sub-Phase 5** | | | |
| 29 | Workspace Chat List | ⬜ | |
| 30 | Clear Workspace Filter | ⬜ | |
| 31 | Direct Chat in Workspace | ⬜ | |
| 32 | Group Chat in Workspace | ⬜ | |
| 33 | Non-Workspace Chat | ⬜ | |
| 34 | Workspace Badge | ⬜ | |
| 35 | Context Persistence | ⬜ | |
| 36 | Empty States | ⬜ | |
| **Sub-Phase 6** | | | |
| 37 | Free User Workspace AI | ⬜ | |
| 38 | Free User Blocked Non-WS | ⬜ | |
| 39 | Pro User AI Everywhere | ⬜ | |
| 40 | Workspace Payment Lapsed | ⬜ | |
| 41 | Trial User AI Access | ⬜ | |
| 42 | Cloud Function Auth | ⬜ | |

**Overall Status:** ⬜ Pass | ⬜ Fail | ⬜ Partial

**Critical Issues Found:**
_________________________________
_________________________________
_________________________________

**Non-Critical Issues:**
_________________________________
_________________________________
_________________________________

---

## ⚡ Quick Command Reference

```bash
# Start app
npx expo start

# Run automated tests
node scripts/testTrialAndUpgrade.js
node scripts/testCloudFunctions.js

# Upgrade user to Pro
node scripts/upgradeAdam1ToPro.js

# Migrate users to trial
node scripts/migrateExistingUsersToTrial.js

# Deploy Cloud Functions
firebase deploy --only functions

# Check Cloud Function logs
firebase functions:log --limit 50

# View Firestore data
open https://console.firebase.google.com/project/message-ai-2a7cf/firestore
```

---

## 📝 Post-Testing Actions

After completing manual tests:

1. ✅ Document all issues found
2. ✅ Create GitHub issues for bugs (if using)
3. ✅ Update test results table
4. ✅ Notify team of test completion
5. ✅ Decide on merge to main branch

---

## 🚀 Ready for Production Checklist

Before merging `PaidTier` branch to `main`:

- [ ] All Sub-Phase 1-2 tests passing (Tests 1-14)
- [ ] All Sub-Phase 3 tests passing (Tests 23-28)
- [ ] All Sub-Phase 4 tests passing (Tests 15-22)
- [ ] All Sub-Phase 5 tests passing (Tests 29-36)
- [ ] All Sub-Phase 6 tests passing (Tests 37-42)
- [ ] No critical bugs found
- [ ] Automated tests passing (25/25 unit, 8/8 manual)
- [ ] Cloud Functions deployed and tested
- [ ] Trial system working correctly
- [ ] Upgrade flow functional
- [ ] Workspace CRUD operations working
- [ ] Navigation integrated properly
- [ ] UI/UX polished
- [ ] Error handling verified
- [ ] Code reviewed
- [ ] Documentation updated

---

**For questions or issues, refer to:**

- `/docs/phase4-paid-tier/WORKSPACES-PAID-TIER-PRD.md`
- `/docs/phase4-paid-tier/IMPLEMENTATION-REVIEW-AND-TEST-PLAN.md`
- `/docs/ARCHITECTURE.md`
