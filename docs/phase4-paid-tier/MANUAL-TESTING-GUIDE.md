# Phase 4: Manual Testing Guide
**Workspaces & Paid Tier - Testing (Sub-)Phases 1-3**

Test Duration: ~15 minutes (or 2-3 min for quick smoke test)  
Last Updated: October 26, 2025

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
- **adam1-gmail** (adam.r.isom@gmail.com) - Pro subscriber
- **adam2-gmailAlt** (adam.r.isom+alt@gmail.com) - Pro subscriber
- **adam3-Hey** (adamisom@hey.com) - Trial user (5 days remaining)
- **adam4** (adamisom+test@hey.com) - Trial user (5 days remaining)

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

- [ ] All 14 manual tests passing
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

