# MessageAI - Phase 4: Workspaces & Paid Tier - Task List

**Status:** Planning  
**Target:** Post-Phase 3 (BONUS WORK)  
**Est. Duration:** 3-4 weeks  
**Last Updated:** October 25, 2025

> ⚠️ **IMPORTANT:** This phase will ONLY be implemented AFTER Phase 3 is complete and polished (including brain lift and demo video).

---

## Overview

This task list breaks down the implementation of Workspaces, Paid Tier, and Admin features into actionable tasks with time estimates and acceptance criteria.

**Key Features:**
- Two-tier subscription model ($3/month Pro, +$0.50/user Workspace)
- Workspace creation and management
- Admin-only features (assign action items, edit/save AI content)
- AI feature gating (Pro users everywhere, free users only in workspaces)
- Spam prevention system
- "My Tasks" aggregation view
- 500 user MVP limit

---

## Table of Contents

1. [Phase 1: Foundation](#phase-1-foundation)
2. [Phase 2: AI Feature Gating](#phase-2-ai-feature-gating)
3. [Phase 3: Workspace Chat Organization](#phase-3-workspace-chat-organization)
4. [Phase 4: Admin Features - Assignment](#phase-4-admin-features---assignment)
5. [Phase 5: Admin Features - Edit & Save](#phase-5-admin-features---edit--save)
6. [Phase 6: My Tasks View](#phase-6-my-tasks-view)
7. [Phase 7: Spam Prevention](#phase-7-spam-prevention)
8. [Phase 8: Billing Logic](#phase-8-billing-logic)
9. [Phase 9: Polish & Testing](#phase-9-polish--testing)

---

## Phase 1: Foundation

**Goal:** Set up data model, authentication, basic workspace CRUD  
**Duration:** 3-4 days

### Task 1.1: Update Firestore Schema
**Est:** 2 hours

- [ ] Add new collections to Firestore:
  - `/workspaces/{workspaceId}`
  - `/workspace_invitations/{invitationId}`
- [ ] Extend `/users/{uid}` with new fields:
  - `isPaidUser: boolean`
  - `subscriptionTier: 'free' | 'pro'`
  - `workspacesOwned: string[]` (max 5)
  - `workspacesMemberOf: string[]`
  - `spamStrikes: number`
  - `spamBanned: boolean`
- [ ] Extend `/conversations/{id}` with:
  - `workspaceId?: string`
  - `workspaceName?: string`

**Acceptance Criteria:**
- Collections created in Firestore Console
- New fields appear in user documents
- Schema documented in PRD

---

### Task 1.2: Update Security Rules
**Est:** 3 hours

- [ ] Add workspace read/write rules:
  - Only admin can update workspace
  - Members can read workspace data
- [ ] Add workspace invitation rules:
  - Inviter can create invitation
  - Invitee can read/update their invitation
- [ ] Update conversation rules:
  - Check workspace membership for workspace chats
- [ ] Update AI feature rules:
  - Verify `isPaidUser` OR workspace membership

**Acceptance Criteria:**
- Security rules prevent unauthorized access
- Free users can access AI in workspace chats
- Pro users can access AI everywhere
- Non-members cannot see workspace data

**Files:**
- `firestore.rules`

---

### Task 1.3: Create Workspace TypeScript Types
**Est:** 1 hour

- [ ] Create `types/workspace.ts`:
  - `Workspace` interface
  - `WorkspaceInvitation` interface
  - `WorkspaceMember` interface
- [ ] Update `types/user.ts`:
  - Add paid tier fields
  - Add spam prevention fields
- [ ] Update `types/conversation.ts`:
  - Add `workspaceId` and `workspaceName`

**Acceptance Criteria:**
- Types compile without errors
- Types match Firestore schema

**Files:**
- `types/workspace.ts` (new)
- `types/user.ts`
- `types/conversation.ts`

---

### Task 1.4: Create Workspace Service
**Est:** 4 hours

- [ ] Create `services/workspaceService.ts`:
  - `createWorkspace(name: string, maxUsers: number)`
  - `getWorkspace(workspaceId: string)`
  - `getUserWorkspaces(userId: string)`
  - `updateWorkspace(workspaceId: string, updates)`
  - `deleteWorkspace(workspaceId: string)`
  - `inviteMember(workspaceId: string, email: string)`
  - `removeMember(workspaceId: string, memberId: string)`
  - `leaveWorkspace(workspaceId: string)`

**Acceptance Criteria:**
- All CRUD operations work
- Real-time listeners for workspace updates
- Error handling for all edge cases

**Files:**
- `services/workspaceService.ts` (new)

---

### Task 1.5: Create Workspace Store (Zustand)
**Est:** 2 hours

- [ ] Create `store/workspaceStore.ts`:
  - `workspaces: Workspace[]`
  - `currentWorkspace: Workspace | null`
  - `loadWorkspaces()`
  - `setCurrentWorkspace(workspaceId)`
  - `addWorkspace(workspace)`
  - `removeWorkspace(workspaceId)`

**Acceptance Criteria:**
- Store syncs with Firestore
- Components can access workspace state
- Store handles loading/error states

**Files:**
- `store/workspaceStore.ts` (new)

---

### Task 1.6: Create Workspace Cloud Functions
**Est:** 4 hours

- [ ] Create `functions/src/workspaces/createWorkspace.ts`
  - Validate Pro user
  - Check 5 workspace limit
  - Validate unique workspace name (per user)
  - Create workspace document
- [ ] Create `functions/src/workspaces/deleteWorkspace.ts`
  - Verify admin ownership
  - Delete all workspace conversations
  - Notify all members (push + in-app)
  - Decrement admin's workspace count
- [ ] Create `functions/src/workspaces/inviteMember.ts`
  - Validate workspace exists and user is admin
  - Check 25 member limit
  - Check if user already invited/member
  - Create invitation document
  - Send push + in-app notification
- [ ] Create `functions/src/workspaces/acceptInvitation.ts`
  - Add user to workspace members
  - Add workspace to user's `workspacesMemberOf`
  - Delete invitation
  - Grant access to all workspace group chats

**Acceptance Criteria:**
- Functions validate permissions
- Functions handle all edge cases
- Notifications sent correctly
- Tests pass

**Files:**
- `functions/src/workspaces/` (new directory)

---

### Task 1.7: 500 User MVP Limit on Signup
**Est:** 1 hour

- [ ] Update signup flow (auth service or Cloud Function):
  - Query total user count before creating account
  - If `>= 500`, block signup with error: "Sorry: in MVP mode, max users reached. Please check back later."
  - Existing 4 test users count toward limit

**Acceptance Criteria:**
- 501st user cannot sign up
- Error message displayed to user
- Existing users unaffected

**Files:**
- `services/authService.ts` OR `functions/src/auth/onUserCreate.ts`

---

## Phase 2: AI Feature Gating

**Goal:** Implement paid tier checks for AI features  
**Duration:** 2-3 days

### Task 2.1: Update AI Cloud Functions - Feature Gating
**Est:** 3 hours

- [ ] Update all AI Cloud Functions to check access:
  - `functions/src/ai/summarize.ts`
  - `functions/src/ai/actionItems.ts`
  - `functions/src/ai/semanticSearch.ts`
  - `functions/src/ai/decisions.ts`
  - `functions/src/ai/meetingScheduler.ts`
- [ ] Add validation logic:
  ```typescript
  // Pro users: access everywhere
  if (user.isPaidUser) return true;
  
  // Free users: only in workspace chats
  if (conversation.workspaceId && isWorkspaceMember) return true;
  
  // Else: reject
  throw new functions.https.HttpsError('permission-denied', 'Upgrade to Pro or join workspace');
  ```

**Acceptance Criteria:**
- All AI functions validate access
- Free users blocked in personal chats
- Free users allowed in workspace chats
- Pro users allowed everywhere
- Tests pass

**Files:**
- `functions/src/ai/*.ts` (all AI functions)

---

### Task 2.2: Client-Side Feature Gating Helper
**Est:** 1 hour

- [ ] Create `utils/featureGating.ts`:
  - `canAccessAIFeatures(user: User, conversation: Conversation): boolean`
  - `canCreateWorkspace(user: User): boolean`
  - `canAssignActionItems(user: User, conversation: Conversation): boolean`
  - `canEditAIContent(user: User, conversation: Conversation): boolean`

**Acceptance Criteria:**
- Functions return correct boolean values
- Used throughout app for permission checks

**Files:**
- `utils/featureGating.ts` (new)

---

### Task 2.3: Upgrade to Pro Flow
**Est:** 2 hours

- [ ] Create `components/UpgradeModal.tsx`:
  - Show benefits of Pro tier
  - "Upgrade to Pro - $3/month" button
  - "Note: After the MVP period, real payment will be required"
- [ ] Implement instant upgrade:
  - Update Firestore: `isPaidUser: true`, `subscriptionTier: 'pro'`
  - Show success message: "✅ Upgrade successful! AI features unlocked."
  - Refresh user state in `authStore`
- [ ] Add upgrade button in:
  - AI feature paywall (when free user taps sparkle menu in personal chat)
  - Workspace creation button (when free user tries to create workspace)

**Acceptance Criteria:**
- Modal shows correct content
- Upgrade happens instantly (no payment)
- Success message displayed
- User can immediately access Pro features

**Files:**
- `components/UpgradeModal.tsx` (new)
- `services/userService.ts` (add `upgradeToProMVP()`)

---

### Task 2.4: Sparkle Menu Paywall Integration
**Est:** 2 hours

- [ ] Update `components/AIFeaturesMenu.tsx`:
  - Check `canAccessAIFeatures()` before showing menu
  - If free user in personal chat → show `UpgradeModal`
  - Keep sparkle (✨) visible for free users (sales funnel)
- [ ] Update all AI feature entry points:
  - Smart Search
  - Thread Summary
  - Action Items
  - Decision Tracking
  - Meeting Scheduler

**Acceptance Criteria:**
- Free users see upgrade modal in personal chats
- Free users can use AI in workspace chats
- Pro users never see paywall
- Sparkle menu always visible

**Files:**
- `components/AIFeaturesMenu.tsx`
- All AI feature screens

---

## Phase 3: Workspace Chat Organization

**Goal:** Implement workspace mode toggle, chat filtering  
**Duration:** 3-4 days

### Task 3.1: Workspace Mode Toggle
**Est:** 3 hours

- [ ] Add workspace mode to navigation:
  - Toggle button: "Personal" / "Workspaces"
  - Shows current mode in header
- [ ] Update `store/appStore.ts`:
  - `currentMode: 'personal' | 'workspace'`
  - `setMode(mode: 'personal' | 'workspace')`
- [ ] Show workspace selector when in workspace mode:
  - List all user's workspaces
  - Select workspace → filter chats
  - "Add Workspace" button (grayed out for free users)

**Acceptance Criteria:**
- Toggle switches between personal/workspace modes
- Workspace selector shows user's workspaces
- Free users see grayed "Add Workspace" button
- Pro users can create workspaces

**Files:**
- `app/(tabs)/index.tsx` (conversations list)
- `components/WorkspaceToggle.tsx` (new)
- `components/WorkspaceSelector.tsx` (new)
- `store/appStore.ts`

---

### Task 3.2: Filter Conversations by Workspace
**Est:** 2 hours

- [ ] Update conversation list query:
  - If `currentMode === 'personal'`: show conversations where `workspaceId == null`
  - If `currentMode === 'workspace'`: show conversations where `workspaceId == currentWorkspaceId`
- [ ] Update conversation service:
  - `getPersonalConversations(userId: string)`
  - `getWorkspaceConversations(workspaceId: string)`

**Acceptance Criteria:**
- Personal mode shows only non-workspace chats
- Workspace mode shows only workspace chats
- Switching workspaces updates chat list
- Empty states handled gracefully

**Files:**
- `services/conversationService.ts`
- `app/(tabs)/index.tsx`

---

### Task 3.3: Create Workspace Screen
**Est:** 4 hours

- [ ] Create `app/workspace/create.tsx`:
  - Workspace name input (validate uniqueness per user)
  - Max users selector (2-25)
  - Calculate monthly cost: `$3 Pro + ($0.50 × maxUsers)`
  - Show pro-rated cost for current month
  - "Create Workspace" button
- [ ] Add validation:
  - Check user is Pro
  - Check workspace limit (5 max)
  - Check name uniqueness
  - Show error if validation fails

**Acceptance Criteria:**
- Pro users can create workspaces
- Free users see upgrade prompt
- Workspace name must be unique (per user)
- Max users selector works (2-25)
- Cost calculation correct

**Files:**
- `app/workspace/create.tsx` (new)

---

### Task 3.4: Workspace Settings Screen
**Est:** 3 hours

- [ ] Create `app/workspace/[id]/settings.tsx`:
  - Workspace name (read-only)
  - Member list with role badges (Admin, Member)
  - "Invite Member" button (admin only)
  - "Remove Member" button next to each member (admin only)
  - "Leave Workspace" button (members only)
  - "Delete Workspace" button (admin only, red)
- [ ] Implement member management:
  - Invite → call `inviteMember()` Cloud Function
  - Remove → call `removeMember()` with confirmation
  - Leave → call `leaveWorkspace()` with confirmation
  - Delete → call `deleteWorkspace()` with double confirmation

**Acceptance Criteria:**
- Only admin sees admin actions
- Members can leave workspace
- Confirmations prevent accidental actions
- Notifications sent on actions

**Files:**
- `app/workspace/[id]/settings.tsx` (new)

---

### Task 3.5: Workspace Invitation Notifications
**Est:** 3 hours

- [ ] Create workspace notifications screen:
  - Show pending invitations
  - Accept/Decline/Report Spam buttons
- [ ] Add notification badge to "Workspaces" tab:
  - Count of unread workspace notifications
- [ ] Implement push notifications:
  - Send when invited to workspace
  - Send when removed from workspace
  - Send when workspace deleted
- [ ] Auto-delete notifications:
  - After user reads them (views notifications screen)
  - After 24 hours

**Acceptance Criteria:**
- Push notifications received for invites
- In-app badge shows count
- Accept/decline works correctly
- Spam reporting increments strikes

**Files:**
- `app/workspace/invitations.tsx` (new)
- `services/notificationService.ts`
- `functions/src/notifications/sendWorkspaceNotification.ts` (new)

---

### Task 3.6: Create Group Chat in Workspace
**Est:** 2 hours

- [ ] Update create group chat flow:
  - If in workspace mode → set `workspaceId` on conversation
  - Auto-add all workspace members to group chat
  - Enforce 25 member limit
- [ ] Show enterprise link when limit reached:
  - Modal: "Limit reached: 25 members max. For enterprise teams, [inquire here](https://x.com/adam__isom)"
  - Link opens Twitter in browser

**Acceptance Criteria:**
- Group chats created in workspace have `workspaceId`
- All workspace members added automatically
- 25 member limit enforced
- Enterprise link works

**Files:**
- `app/chat/new-group.tsx`
- `services/conversationService.ts`

---

## Phase 4: Admin Features - Assignment

**Goal:** Enable action item assignment for admins  
**Duration:** 2-3 days

### Task 4.1: Update Action Items Cloud Function
**Est:** 2 hours

- [ ] Update `functions/src/ai/actionItems.ts`:
  - Add `assignActionItem(itemId, assigneeUid)` callable function
  - Validate caller is workspace admin
  - Validate assignee is workspace member
  - Update Firestore: set `assigneeUid`, `assigneeDisplayName`
  - Send notification to assignee

**Acceptance Criteria:**
- Only admins can assign action items
- Assignment persists in Firestore
- Assignee notified
- Tests pass

**Files:**
- `functions/src/ai/actionItems.ts`

---

### Task 4.2: Update Action Items Modal UI
**Est:** 3 hours

- [ ] Update `components/ActionItemsModal.tsx`:
  - Show "Assign" button for unassigned items (admin only)
  - Show assignee name for assigned items
  - Tapping "Assign" → member picker modal
  - Member picker shows only workspace members
  - Confirm assignment → call `assignActionItem()`
- [ ] Add visual indicators:
  - "Assigned to you" badge for current user's items
  - Assignee avatar next to item

**Acceptance Criteria:**
- Admin sees "Assign" button
- Non-admin sees read-only items
- Member picker shows correct members
- Assignment works and syncs

**Files:**
- `components/ActionItemsModal.tsx`

---

### Task 4.3: Action Item Assignment in Non-Workspace Chats
**Est:** 1 hour

- [ ] Ensure action items in non-workspace chats:
  - No "Assign" button (workspace-exclusive feature)
  - Show as read-only for all users (Pro or free)
  - AI can still detect assignees, but manual assignment disabled

**Acceptance Criteria:**
- Non-workspace chats have read-only action items
- No assignment UI shown

**Files:**
- `components/ActionItemsModal.tsx`

---

## Phase 5: Admin Features - Edit & Save

**Goal:** Enable editing AI content for admins  
**Duration:** 3-4 days

### Task 5.1: Create Edit Modal Components
**Est:** 4 hours

- [ ] Create `components/EditSummaryModal.tsx`:
  - Editable text field with current summary
  - "Save" and "Cancel" buttons
  - Saved by: `{adminName}` at bottom (after save)
- [ ] Create `components/EditDecisionModal.tsx`:
  - Editable fields for decision text
  - "Save" and "Cancel" buttons
- [ ] Create `components/EditActionItemsModal.tsx`:
  - Editable list of action items
  - Add/remove items
  - "Save" and "Cancel" buttons

**Acceptance Criteria:**
- Modals show current AI-generated content
- Editing works smoothly
- Save/cancel works correctly

**Files:**
- `components/EditSummaryModal.tsx` (new)
- `components/EditDecisionModal.tsx` (new)
- `components/EditActionItemsModal.tsx` (new)

---

### Task 5.2: Update AI Feature Screens - Edit & Save Buttons
**Est:** 3 hours

- [ ] Update `components/ThreadSummaryModal.tsx`:
  - Add "Edit & Save" button (admin only, workspace chats only)
  - After save: show "✏️ Edited" badge
  - Show "Re-edit" button for saved content (admin only)
- [ ] Update `components/DecisionTrackingModal.tsx`:
  - Same edit/save flow as summary
- [ ] Update `components/ActionItemsModal.tsx`:
  - Same edit/save flow as summary

**Acceptance Criteria:**
- Admin sees "Edit & Save" button in workspace chats
- Non-admins don't see button
- Edited content shows badge
- Re-editing works

**Files:**
- `components/ThreadSummaryModal.tsx`
- `components/DecisionTrackingModal.tsx`
- `components/ActionItemsModal.tsx`

---

### Task 5.3: Cloud Functions - Save Edited Content
**Est:** 3 hours

- [ ] Create `functions/src/ai/saveEditedSummary.ts`:
  - Validate caller is workspace admin
  - Update Firestore with edited content
  - Set `editedByAdmin: true`, `savedByAdmin: uid`, `savedAt: timestamp`
  - Replace AI-generated version (no history)
- [ ] Create `functions/src/ai/saveEditedDecision.ts`:
  - Same logic as summary
- [ ] Create `functions/src/ai/saveEditedActionItems.ts`:
  - Same logic as summary

**Acceptance Criteria:**
- Functions validate admin permission
- Edited content saves correctly
- Original AI version replaced (not preserved)
- All members see edited version
- Tests pass

**Files:**
- `functions/src/ai/saveEditedSummary.ts` (new)
- `functions/src/ai/saveEditedDecision.ts` (new)
- `functions/src/ai/saveEditedActionItems.ts` (new)

---

## Phase 6: My Tasks View

**Goal:** Implement "My Tasks" aggregation view  
**Duration:** 2 days

### Task 6.1: My Tasks Screen - Workspace Mode
**Est:** 3 hours

- [ ] Create `app/workspace/[id]/my-tasks.tsx`:
  - Query all action items assigned to current user in current workspace
  - Query: `conversations/{id}/ai_action_items where assigneeUid == currentUser && workspaceId == currentWorkspaceId`
  - Show list with:
    - Task description
    - Source conversation name
    - Assigned date
    - Completion status (future enhancement)
- [ ] Add "My Tasks" button to workspace navigation:
  - Small icon button in workspace header
  - Shows badge with task count

**Acceptance Criteria:**
- Tasks load correctly from Firestore
- Tapping task opens conversation
- Only shows tasks in current workspace
- Pro users only (AI feature)

**Files:**
- `app/workspace/[id]/my-tasks.tsx` (new)
- Navigation component

---

### Task 6.2: My Tasks Screen - Personal Mode
**Est:** 2 hours

- [ ] Create `app/my-tasks.tsx`:
  - Query all action items assigned to current user in NON-workspace chats
  - Query: `conversations/{id}/ai_action_items where assigneeUid == currentUser && workspaceId == null`
  - Same UI as workspace My Tasks
- [ ] Add "My Tasks" button to main navigation:
  - In personal chat mode only

**Acceptance Criteria:**
- Tasks load from non-workspace chats
- Only shows personal tasks (no workspace tasks)
- Pro users only

**Files:**
- `app/my-tasks.tsx` (new)

---

### Task 6.3: My Tasks - Real-Time Updates
**Est:** 1 hour

- [ ] Add Firestore listeners for task updates:
  - When new task assigned → update My Tasks list
  - When task reassigned → update list
  - When task completed (future) → update list

**Acceptance Criteria:**
- My Tasks updates in real-time
- No manual refresh needed

**Files:**
- `app/workspace/[id]/my-tasks.tsx`
- `app/my-tasks.tsx`

---

## Phase 7: Spam Prevention

**Goal:** Implement strike system  
**Duration:** 2 days

### Task 7.1: Spam Reporting - Invitation Flow
**Est:** 2 hours

- [ ] Update workspace invitation notification:
  - Add "Report Spam" button
  - Confirmation dialog: "Report this invitation as spam?"
  - Call `reportSpam()` Cloud Function
- [ ] Update group chat invitation notification:
  - Same "Report Spam" button

**Acceptance Criteria:**
- Report Spam button visible on invitations
- Cannot report after accepting invitation
- Confirmation prevents accidental reports

**Files:**
- `app/workspace/invitations.tsx`
- Group chat invitation components

---

### Task 7.2: Cloud Function - Report Spam
**Est:** 3 hours

- [ ] Create `functions/src/spam/reportSpam.ts`:
  - Validate invitation exists
  - Increment inviter's `spamStrikes`
  - If `spamStrikes >= 5`:
    - Set `spamBanned: true`
    - Send notification to inviter
  - Decline invitation automatically
  - Log spam report in `spamReportsReceived` array

**Acceptance Criteria:**
- Spam strikes increment correctly
- 5 strikes → banned
- Banned users notified
- Tests pass

**Files:**
- `functions/src/spam/reportSpam.ts` (new)

---

### Task 7.3: Enforce Spam Ban
**Est:** 2 hours

- [ ] Update workspace creation:
  - Check `spamBanned` before allowing creation
  - If banned → error: "Account restricted from creating workspaces due to spam reports"
- [ ] Update group chat creation:
  - Check `spamBanned` before allowing creation
  - If banned → same error message
- [ ] Allow direct chats:
  - Banned users can still create direct chats

**Acceptance Criteria:**
- Banned users cannot create workspaces
- Banned users cannot create group chats
- Banned users can create direct chats
- Error message shown

**Files:**
- `services/workspaceService.ts`
- `services/conversationService.ts`

---

## Phase 8: Billing Logic

**Goal:** Implement max user tracking, billing calculations  
**Duration:** 2-3 days

### Task 8.1: Track Max Users Per Month
**Est:** 2 hours

- [ ] Update `workspaces` collection:
  - Add `maxUsersThisMonth: number` (admin's chosen capacity)
  - Add `billingCycle: { month: number, year: number }`
- [ ] Update workspace creation:
  - Admin selects max users (2-25)
  - Store in `maxUsersThisMonth`
  - Calculate pro-rated charge for current month
- [ ] Update member invitation:
  - Check if adding member would exceed `maxUsersThisMonth`
  - If yes → show "Upgrade workspace capacity" prompt

**Acceptance Criteria:**
- Max users tracked per workspace
- Pro-rated billing calculated correctly
- Cannot add members beyond capacity

**Files:**
- `services/workspaceService.ts`
- `functions/src/workspaces/createWorkspace.ts`

---

### Task 8.2: Workspace Capacity Expansion
**Est:** 3 hours

- [ ] Create expansion flow:
  - Admin tries to add member beyond capacity
  - Modal: "Current capacity: 10 members. Upgrade to 15 members? Cost: $X.XX pro-rated for this month"
  - "Upgrade Now" button
  - Calculate pro-rated charge: `(newCapacity - oldCapacity) * $0.50 * (days_remaining / days_in_month)`
- [ ] For MVP: instant upgrade (no real payment)
  - Update `maxUsersThisMonth`
  - Show success message
- [ ] For future: integrate with Stripe
  - Charge pro-rated amount
  - Then update capacity

**Acceptance Criteria:**
- Admin can expand capacity mid-month
- Pro-rated charge calculated correctly
- MVP: instant upgrade works
- New members can be added after expansion

**Files:**
- `components/ExpandWorkspaceModal.tsx` (new)
- `functions/src/workspaces/expandCapacity.ts` (new)

---

### Task 8.3: Monthly Billing Reset
**Est:** 2 hours

- [ ] Create Cloud Function - scheduled for 1st of month:
  - For each workspace: reset `billingCycle`
  - Track `maxUsersThisMonth` for next billing cycle
  - For future: charge via Stripe based on `maxUsersThisMonth`
- [ ] Calculate charges:
  - Pro subscription: $3/month (per user)
  - Workspace: `maxUsersThisMonth * $0.50` (per workspace)

**Acceptance Criteria:**
- Function runs on 1st of month
- Billing cycle resets
- MVP: no actual charges
- Future: Stripe integration ready

**Files:**
- `functions/src/billing/monthlyBilling.ts` (new)

---

### Task 8.4: Payment Lapse - Read-Only State
**Est:** 3 hours

- [ ] Simulate payment lapse (MVP only):
  - Add `paymentStatus: 'active' | 'lapsed'` to workspace
  - Add admin toggle in settings to simulate lapse (MVP only)
- [ ] Implement read-only state:
  - If `paymentStatus === 'lapsed'`:
    - Members can view messages
    - Cannot send messages
    - Cannot use AI features (even Pro users)
    - Show banner: "Workspace suspended due to payment issue"
- [ ] Schedule deletion after 30 days:
  - Add `paymentLapsedAt: Timestamp`
  - Cloud Function checks daily
  - If > 30 days → delete workspace

**Acceptance Criteria:**
- Lapsed workspaces become read-only
- Messages cannot be sent
- AI features disabled
- Deletion happens after 30 days
- Notifications sent on Day 0, 7, 14, 29

**Files:**
- `services/workspaceService.ts`
- `functions/src/billing/checkLapsedWorkspaces.ts` (new)
- Message input components

---

## Phase 9: Polish & Testing

**Goal:** UI polish, edge cases, E2E testing  
**Duration:** 3-4 days

### Task 9.1: UI Polish
**Est:** 4 hours

- [ ] Add loading states:
  - Workspace creation
  - Member invitation
  - Action item assignment
  - Edit & save operations
- [ ] Add animations:
  - Modal entrances/exits
  - Toast notifications
  - List item updates
- [ ] Add empty states:
  - No workspaces yet
  - No invitations
  - No tasks
- [ ] Add error states:
  - Failed to load workspace
  - Failed to invite member
  - Network errors

**Acceptance Criteria:**
- All user actions have loading feedback
- Animations smooth and professional
- Empty states helpful and informative
- Errors handled gracefully

**Files:**
- All components

---

### Task 9.2: Edge Case Handling
**Est:** 3 hours

- [ ] Handle edge cases:
  - Workspace deleted while viewing
  - Member removed while chatting
  - Invitation expired
  - Network disconnect during critical operation
  - Simultaneous edits by multiple admins
  - User reaches 5 workspace limit
  - User tries to create 6th workspace
  - Workspace name conflict
  - 500 user limit reached during signup

**Acceptance Criteria:**
- All edge cases handled without crashes
- User receives helpful error messages
- State recovers gracefully

**Files:**
- All services and components

---

### Task 9.3: End-to-End Testing
**Est:** 6 hours

- [ ] Test happy paths:
  - Create workspace → invite member → accept → chat
  - Assign action item → view in My Tasks
  - Edit summary → save → view edited version
  - Upgrade to Pro → access AI features
- [ ] Test error paths:
  - Free user tries to create workspace
  - Non-admin tries to assign action item
  - User tries to create 6th workspace
  - Add 26th member to workspace
  - Report spam → reach 5 strikes
- [ ] Test performance:
  - Large workspace (25 members)
  - Many action items (50+)
  - Rapid mode switching
  - Multiple workspaces (5)

**Acceptance Criteria:**
- All user flows work end-to-end
- No crashes or errors
- Performance acceptable
- Tests documented

**Files:**
- Test scripts (manual or automated)

---

### Task 9.4: Documentation
**Est:** 2 hours

- [ ] Update memory.md with Phase 4 notes
- [ ] Document workspace architecture
- [ ] Document billing logic
- [ ] Create troubleshooting guide
- [ ] Update README with Phase 4 features

**Acceptance Criteria:**
- Documentation complete and accurate
- Other developers can understand system
- Common issues documented

**Files:**
- `docs/memory.md`
- `docs/phase4-paid-tier/ARCHITECTURE.md` (new)
- `README.md`

---

### Task 9.5: Validation Before Commit
**Est:** 1 hour

- [ ] Run `npm run validate:all`:
  - Lint all files
  - Type-check all files
  - Run all tests (frontend + backend)
  - Fix any errors
- [ ] Manual testing:
  - Test on iOS simulator
  - Test on Android emulator (if available)
  - Test offline behavior
  - Test real-time sync

**Acceptance Criteria:**
- Zero lint errors
- Zero type errors
- All tests pass
- Manual testing successful

---

## Summary

### Total Time Estimate: 3-4 Weeks

**By Phase:**
- Phase 1: Foundation - 3-4 days
- Phase 2: AI Feature Gating - 2-3 days
- Phase 3: Workspace Chat Organization - 3-4 days
- Phase 4: Admin Features - Assignment - 2-3 days
- Phase 5: Admin Features - Edit & Save - 3-4 days
- Phase 6: My Tasks View - 2 days
- Phase 7: Spam Prevention - 2 days
- Phase 8: Billing Logic - 2-3 days
- Phase 9: Polish & Testing - 3-4 days

**Key Milestones:**
- [ ] Week 1 Complete: Foundation + AI Gating
- [ ] Week 2 Complete: Workspace Organization + Admin Assignment
- [ ] Week 3 Complete: Edit/Save + My Tasks + Spam Prevention
- [ ] Week 4 Complete: Billing + Polish + Testing

**Success Criteria:**
- All 9 phases completed
- Zero critical bugs
- All tests passing
- Documentation complete
- Ready for beta testing

---

## Notes

- This is BONUS work after Phase 3 completion
- MVP implementation (no real payments)
- 500 user limit for beta
- Stripe integration prepared for future
- Focus on core features, skip nice-to-haves
- Test thoroughly before user release

---

## Appendix A: User Profile Sub-Phases

### Sub-Phase 4.1: Profile Button Component

**Goal:** Create reusable profile button component and integrate into navigation

**Tasks:**
1. Create `components/ProfileButton.tsx`
   - Accept `currentRoute` prop to determine selected state
   - Implement initials extraction logic (see code below)
   - Add tap handler to navigate to profile
   - Style normal and selected states
2. Update `app/(tabs)/_layout.tsx`
   - Import `ProfileButton`
   - Add `headerRight` option to all tab screens
   - Pass current route to button for selected state
3. Test button appearance and navigation

**Initials Extraction Logic:**

```typescript
function getInitials(displayName: string): string {
  if (!displayName) return '?';
  
  const words = displayName.trim().split(' ');
  
  if (words.length > 1) {
    // Multiple words: take first letter of first two words
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    // Single word: take first letter only
    return words[0][0].toUpperCase();
  }
}

// Examples:
// "Adam Isom" → "AI"
// "John" → "J"
// "Bob Smith Jr" → "BS"
```

**Acceptance Criteria:**
- ✅ Button appears on all tab screens (Chats, New Chat, Workspaces, Profile)
- ✅ Shows correct initials for all users
- ✅ Selected state visible on profile screen
- ✅ Tapping button navigates to profile
- ✅ Button position consistent across all screens

**Estimated Time:** 1-2 hours

---

### Sub-Phase 4.2: Profile Screen Structure

**Goal:** Create profile screen with header, avatar, and user info

**Tasks:**
1. Create `app/(tabs)/profile.tsx`
   - Set `href: null` in tab config (hidden from tab bar)
   - Implement scroll view with proper layout
2. Add profile header section
   - Large circular avatar with initials (80x80px)
   - Display name (20px bold)
   - Email (14px gray)
3. Add status badge component
   - Badge with icon and text
   - Conditional rendering (Pro/Trial/Free)
   - Status detail text (trial countdown or expiry date)
4. Test layout and scrolling

**Acceptance Criteria:**
- ✅ Profile screen accessible via button
- ✅ Screen hidden from tab bar
- ✅ Avatar displays correct initials
- ✅ Display name and email shown correctly
- ✅ Status badge shows correct type and styling
- ✅ Status detail shows countdown/expiry as appropriate
- ✅ Layout responsive and scrollable

**Estimated Time:** 2-3 hours

---

### Sub-Phase 4.3: Feature List & Action Buttons

**Goal:** Display Pro features and contextual action buttons

**Tasks:**
1. Extract feature list component (or create shared constant)
   - Import from `UpgradeToProModal` or create shared file
   - Ensure identical content (AI + Workspace features)
2. Implement "Your Pro Features" section
   - Section header
   - AI Features subheader and list
   - Workspace Features subheader and list
   - Pricing note
3. Add action buttons based on user status (see status logic below)
   - Implement `getUserStatus` logic
   - Render "Start Free Trial" button (if eligible)
   - Render "Upgrade to Pro" button (if free/trial expired)
   - Render "Manage Subscription" button (if Pro)
4. Connect buttons to existing modals/actions
   - "Start Trial" → `UpgradeToProModal` with trial button
   - "Upgrade to Pro" → `UpgradeToProModal`
   - "Manage Subscription" → Navigate to subscription screen
5. Test button visibility and actions

**Status Display Logic:**

```typescript
// Determine status badge and action buttons
function getUserStatus(user: User): {
  badge: string;
  badgeColor: string;
  detail: string | null;
  actions: Action[];
} {
  const now = Date.now();
  
  // Pro User
  if (user.isPaidUser) {
    const expiryDate = formatDate(user.subscriptionEndsAt);
    return {
      badge: "💎 Pro User",
      badgeColor: "#007AFF", // Blue
      detail: `Expires: ${expiryDate}`,
      actions: [
        { label: "Manage Subscription", type: "primary", route: "/subscription" }
      ]
    };
  }
  
  // Trial User (active trial)
  if (user.trialEndsAt && now < user.trialEndsAt.toMillis()) {
    const daysRemaining = Math.ceil(
      (user.trialEndsAt.toMillis() - now) / (1000 * 60 * 60 * 24)
    );
    return {
      badge: "🎉 Trial User",
      badgeColor: "#FFD700", // Gold
      detail: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`,
      actions: [] // No buttons during active trial
    };
  }
  
  // Free User (trial expired or never had trial)
  const actions: Action[] = [];
  
  // Show "Start Free Trial" if eligible (never used trial)
  if (!user.trialUsed) {
    actions.push({
      label: "Start 5-Day Free Trial",
      type: "outlined",
      action: "startTrial"
    });
  }
  
  // Always show "Upgrade to Pro" for free users (after trial expires)
  actions.push({
    label: "Upgrade to Pro",
    type: "primary",
    action: "upgrade"
  });
  
  return {
    badge: "🔓 Free User",
    badgeColor: "#8E8E93", // Gray
    detail: null,
    actions
  };
}
```

**Acceptance Criteria:**
- ✅ Feature list displays completely and correctly
- ✅ Feature list matches upgrade modal exactly
- ✅ Correct buttons show for each user type
- ✅ Free users (no trial) see trial + upgrade buttons
- ✅ Free users (in trial) see no buttons
- ✅ Free users (trial expired) see upgrade button only
- ✅ Pro users see manage subscription button
- ✅ Buttons navigate/open correct modals

**Estimated Time:** 2-3 hours

---

### Sub-Phase 4.4: Subscription Management Screen (Placeholder)

**Goal:** Create placeholder subscription management screen for future

**Tasks:**
1. Create `app/subscription.tsx`
   - Modal presentation style
   - Header with back button
2. Add subscription details section
   - Plan name (Pro)
   - Price ($3/month)
   - Next billing date
3. Add placeholder buttons
   - "Change Payment Method" (disabled, gray)
   - "Cancel Subscription" (disabled, gray)
   - "Coming soon" text under each
4. Add navigation from profile screen
5. Test modal presentation and back navigation

**Acceptance Criteria:**
- ✅ Screen accessible from "Manage Subscription" button
- ✅ Modal presentation works correctly
- ✅ Subscription details display for Pro users
- ✅ Buttons are disabled with "Coming soon" note
- ✅ Back button returns to profile
- ✅ Clear indication this is placeholder

**Estimated Time:** 1-2 hours

---

**Total Estimated Time:** 6-10 hours

**Implementation Order:** 4.1 → 4.2 → 4.3 → 4.4 (sequential, each builds on previous)

**Dependencies:**
- Sub-Phase 4.2 requires 4.1 (button to navigate to profile)
- Sub-Phase 4.3 requires 4.2 (screen structure to add features to)
- Sub-Phase 4.4 requires 4.3 (button to navigate to subscription)

