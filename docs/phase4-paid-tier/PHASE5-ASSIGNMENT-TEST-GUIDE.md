# Phase 4 - Sub-Phase 5: Admin Action Item Assignment - Manual Test Guide

**Created:** October 26, 2025  
**Status:** Ready for Testing  
**Deployment:** `assignActionItem` Cloud Function deployed successfully

---

## Overview

This feature allows **workspace admins only** to manually assign action items to workspace members. The "Assign" button appears in the Action Items modal for unassigned items in workspace chats.

---

## Prerequisites

Before testing, ensure you have:

1. ✅ **A workspace created** (from Sub-Phase 3)
2. ✅ **At least 2 members in the workspace** (admin + 1 member)
3. ✅ **A workspace chat with messages** that generate action items
4. ✅ **Dev server running** (`npx expo start`)
5. ✅ **Cloud Function deployed** (`assignActionItem` - deployed Oct 26)

---

## Test Scenarios

### ✅ Test 1: Admin Can See "Assign" Button

**Setup:**
- Log in as the **workspace admin**
- Open a **workspace chat** (not a personal chat)
- Send messages that trigger AI action items (e.g., "I need to finish the report by Friday")
- Open the AI Features menu (sparkle icon)
- Select "Action Items"

**Expected Result:**
- Each **unassigned** action item should show an **"➕ Assign"** button
- Already assigned items show **"👤 [Member Name]"** instead

**What Could Go Wrong:**
- ❌ No assign button appears → Check that you're the admin of the workspace
- ❌ Error opening modal → Check console logs for permission issues

---

### ✅ Test 2: Assign Action Item to Member

**Setup:**
- Continue from Test 1
- Click **"➕ Assign"** on an action item

**Expected Result:**
1. A **member picker modal** appears showing all workspace members
2. Member list shows **"👤 [Display Name]"** for each member
3. Picker has a **"Cancel"** button at the bottom

**Actions:**
- Click on a member's name to assign the item

**Expected Result:**
- Modal closes immediately
- Action item updates to show **"👤 [Assigned Member Name]"**
- No "Scanning for action items..." message (optimistic update)

**What Could Go Wrong:**
- ❌ Assignment fails with error → Check Firestore console and Cloud Function logs
- ❌ Modal doesn't close → Check browser console for errors

---

### ✅ Test 3: Assignment Persists Across Sessions

**Setup:**
- After assigning an item in Test 2
- Close the Action Items modal
- **Close the app completely** (not just background)
- Reopen the app and navigate back to the same chat
- Open Action Items modal again

**Expected Result:**
- The assigned action item still shows **"👤 [Assigned Member Name]"**
- Assignment persisted in Firestore

---

### ✅ Test 4: Non-Admin Cannot Assign

**Setup:**
- Log out
- Log in as a **regular member** (not admin) of the workspace
- Open the same workspace chat
- Open Action Items modal

**Expected Result:**
- Action items are visible
- **NO "➕ Assign" button** appears (not an admin)
- Already assigned items still show **"👤 [Member Name]"**

**What Could Go Wrong:**
- ❌ Assign button appears for non-admin → Bug in `isWorkspaceAdmin` check

---

### ✅ Test 5: Assignment Only Works in Workspace Chats

**Setup:**
- Log in as admin
- Open a **personal (non-workspace) chat**
- Send messages that generate action items
- Open Action Items modal

**Expected Result:**
- Action items are visible
- **NO "➕ Assign" button** appears (not a workspace chat)

---

### ✅ Test 6: Cloud Function Authorization

**Setup:**
- Open browser console/dev tools
- Manually call the Cloud Function with invalid permissions (optional - for curious devs)

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

**Expected Result:**
- Error: "Only workspace admins can assign action items"

---

## Quick Smoke Test (2 minutes)

If you just want to verify it works:

1. **As admin:** Open workspace chat → Action Items → Click "➕ Assign" → Pick a member
2. **Verify:** Item shows member name immediately
3. **As member:** Open same chat → Action Items → No assign button visible
4. ✅ **Done!**

---

## Troubleshooting

### Issue: "Assign" button doesn't appear for admin

**Possible causes:**
1. Not actually the admin of this workspace
2. This isn't a workspace chat
3. Item is already assigned
4. `isWorkspaceAdmin` function failing

**Debug steps:**
- Check browser console for errors
- Verify `conversation.workspaceId` exists
- Check Firestore: `workspaces/{workspaceId}` → `adminUid` matches your `uid`

---

### Issue: Assignment fails with error

**Possible causes:**
1. Network error
2. Cloud Function not deployed
3. Firestore permissions issue
4. Assignee not a workspace member

**Debug steps:**
- Check browser console for error message
- Check Firebase Console → Functions → Logs
- Verify assignee is in `workspace.members` array

---

### Issue: Assignment doesn't persist

**Possible causes:**
1. Cache not being updated correctly
2. Firestore write failed silently

**Debug steps:**
- Check Firestore Console: `conversations/{id}/ai_cache/action_items`
- Look for `assigneeUid`, `assigneeDisplayName`, `assignedAt`, `assignedBy` fields
- Check Cloud Function logs for errors

---

## Files Modified

**Client-side:**
- `components/ActionItemsModal.tsx` - Added admin checks and assign button
- `utils/workspacePermissions.ts` - New helper for admin checks
- `services/aiService.ts` - Updated to call Cloud Function

**Backend:**
- `functions/src/ai/assignActionItem.ts` - New Cloud Function
- `functions/src/index.ts` - Export new function

---

## Next Steps After Testing

Once manual testing is complete:

1. ✅ Verify all 6 test scenarios pass
2. 🔄 Move to **Phase 6: "My Tasks" View** (aggregated task list)
3. 🔄 Then **Phase 7: Edit & Save AI Content** (admin-only feature)

---

## Notes

- No unit tests for this function (simple CRUD logic, better tested manually/integration)
- Assignment creates optimistic UI update for better UX
- Cache invalidation ensures fresh data on next modal open
- Cloud Function validates admin status server-side (client checks are just UX)

