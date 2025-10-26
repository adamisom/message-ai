# MessageAI - Workspaces & Paid Tier PRD

**Status:** Planning Phase  
**Target:** Post-MVP Enhancement (Phase 4 - BONUS WORK)  
**Est. Implementation:** 3-4 weeks

> ⚠️ **IMPORTANT:** This phase will ONLY be implemented AFTER the currently-planned "final" phase (Phase 3) is complete and polished, including the brain lift and demo video. This is bonus work to be done after Phase 3.

---

## Executive Summary

This PRD introduces a **two-tier paid subscription model** and **Workspaces** - a premium feature enabling team organization, enhanced admin controls, and collaborative AI-powered features. This transforms MessageAI from a personal messaging app into a team collaboration platform.

### Product Vision

**For remote teams** who need structured collaboration with AI assistance, **MessageAI Workspaces** provides organized team spaces with admin controls, enhanced AI features, and spam protection - **unlike** basic messaging apps that lack team structure or AI capabilities.

### Revenue Model

- **Free Tier:** Basic messaging (direct + group chats) only; AI features only work in workspace chats
  - **NEW: 5-Day Free Trial** - All new users get full Pro access for 5 days (all AI features everywhere)
  - After trial: AI locked to workspace chats only (until they upgrade to Pro)
- **Pro Tier ($3/month):** Unlock all AI features everywhere (personal + workspace chats)
- **Workspace Tier ($0.50/user/month):** Create workspaces with admin controls and collaborative tools
  - Admin pre-selects max users (2-25) and pays for all seats
  - Example: Workspace with 10 members (admin's choice) → Admin pays $5/month
  - Billed monthly on 1st of month; pro-rated for signup/expansions
  - **Requires Pro subscription** ($3/month base fee required)

### Key Value Propositions

**For Individual Users ($3/month Pro):**

- AI-powered summaries, action items, semantic search
- Priority detection, decision tracking, meeting scheduling
- Unlimited AI usage everywhere

**For Team Admins ($3 base + $0.50/user Workspace):**

- Everything in Pro tier
- Create up to 5 workspaces (25 members each)
- Admin-controlled action item assignment
- Edit & save AI-generated content (summaries, decisions, action items)
- Structured team communication

**For Free Users:**

- Basic messaging everywhere
- **5-day free trial** with full Pro access (AI features everywhere)
- After trial: AI features work ONLY in workspace chats (if invited)
- Sparkle Menu (✨) shows upgrade prompt in non-workspace chats

---

## Table of Contents

1. [User Types & Roles](#user-types--roles)
2. [Pricing & Billing](#pricing--billing)
3. [Workspaces](#workspaces)
4. [AI Feature Access Control](#ai-feature-access-control)
5. [Admin-Only Features](#admin-only-features)
6. [Spam Prevention](#spam-prevention)
7. [User Profile & Status](#user-profile--status)
8. [Data Model](#data-model)
9. [User Flows](#user-flows)
10. [UI/UX Specifications](#uiux-specifications)
11. [Security & Permissions](#security--permissions)
12. [Implementation Phases](#implementation-phases)
13. [Future Enhancements](#future-enhancements)

---

## 1. User Types & Roles

### 1.1 Free User (Default)

**Capabilities:**

- ✅ **5-day free trial** upon signup - full Pro access (all AI features everywhere)
- ✅ Create unlimited direct chats
- ✅ Create unlimited group chats (max 25 members each)
- ✅ Join workspaces as member (if invited)
- ✅ Send/receive messages normally
- ✅ **After trial: AI features work in workspace chats** (if invited by admin)
- ❌ After trial: AI features disabled in personal/non-workspace chats
- ❌ **Cannot create workspaces** (during OR after trial - Pro subscription required)

**Limitations (After 5-Day Trial):**

- AI features only accessible in workspace chats (critical sales funnel)
- Sparkle menu (✨) visible everywhere but shows "Upgrade to Pro" in non-workspace chats
- Cannot assign action items (workspace admin-only feature)
- Cannot edit/save AI content (workspace admin-only feature)
- Workspace mode toggle visible but "Add Workspace" button grayed out
- Subject to spam strike system (strikes decay after 1 month)

### 1.2 Pro User ($3/month)

**Everything in Free +:**

- ✅ Access to **all AI features everywhere** (personal chats, workspace chats)
- ✅ Can create workspaces (becomes admin)
- ✅ Up to 5 workspaces simultaneously
- ✅ Full AI feature suite in all contexts

**Limitations:**

- Cannot edit/save AI content in non-workspace chats (admin-only feature for workspaces)
- Cannot assign action items in non-workspace chats (admin-only for workspaces)
- Still subject to spam strike system

### 1.3 Workspace Admin (Pro User + Workspace Creator)

**Everything in Pro +:**

- ✅ Full control over workspace(s) they created
- ✅ Add/remove members (up to 50 per workspace)
- ✅ Assign action items to workspace members
- ✅ Edit & save AI-generated summaries, decisions, action items
- ✅ Create group chats within workspace
- ✅ Delete workspace (deletes all chats)

**Key Constraints:**

- One admin per workspace (no transfer of ownership)
- Admin pre-selects capacity (2-25 members), pays $0.50/user/month for all seats
- If subscription lapses: workspace becomes read-only → deleted after 30 days
- **Hard limit: 25 members per workspace** (enterprise tier for larger teams)

---

## 2. Pricing & Billing

### 2.1 Tier Breakdown

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Basic messaging, AI in workspaces only |
| **Pro** | $3/month | All AI features everywhere |
| **Workspace** | +$0.50/user/month | Admin controls, team collaboration (per workspace) |

### 2.2 Billing Rules

**Base Pro Subscription ($3/month):**

- Required to create workspaces
- Enables all AI features in personal chats
- Billed monthly on 1st of month
- Pro-rated at signup (see examples below)

**Workspace Charges ($0.50/user/month per workspace):**

- **Pre-selected capacity model:** Admin chooses max users (2-25) upfront and pays for all seats
- **Example Scenarios:**
  - Admin creates workspace with 10-seat capacity → Pays $5/month (even if only 5 members join)
  - Admin wants to expand to 15 seats mid-month → Prompted to upgrade, pays pro-rated amount
  - Billing: $5 (original) + ($2.50 × days_remaining / days_in_month)
  - Admin wants to downgrade to 8 seats → Must first remove members to fit new capacity
  
**UI Guidance:**

- During workspace creation: "You're selecting capacity for [10] members. You'll pay for all seats even if not filled. You can expand later if needed."
- Expansion prompt: "Expand workspace from 10 to 15 members? Additional charge: $X.XX (pro-rated for this month)"
- Downgrade flow: "You have 10 members but want 8 seats. Remove 2 members first, then downgrade capacity."
  
**Pro-Rated Billing Examples:**

**Scenario 1: New Pro signup mid-month**

- User signs up June 15th (halfway through month)
- June charge: $3 × 0.5 = **$1.50**
- July 1st charge: **$3** (full month)

**Scenario 2: New workspace creation mid-month**

- Pro user creates workspace June 15th with 10 members
- June charge: $5 × 0.5 = **$2.50**
- July 1st charge: **$5** (full month for 10 members)

**Scenario 3: Workspace expansion mid-month**

- June 1st: Workspace with 10 members → Pays $5
- June 15th: Admin wants to add 5 more (total 15)
- Immediate charge: 5 members × $0.50 × 0.5 month = **$1.25**
- July 1st charge: **$7.50** (full month for 15 members)

**Tracking Requirements:**

- Track `maxUsersThisMonth` per workspace (admin's chosen capacity)
- Reset on 1st of month
- When admin expands: calculate pro-rated charge, process payment, then increment limit
- When admin downgrades: verify actual members <= new capacity, downgrade takes effect NEXT billing cycle (no pro-rated refunds)

**Billing Start Timing:**

- Workspace created on 1st of month → No pro-rated charge, first bill on 1st of next month
- Workspace created mid-month (e.g., Jan 15th) → Pro-rated charge for remainder of January (Jan 15-31), then full month bill on Feb 1st
- Formula: `seatsAdded × $0.50 × (daysRemaining / daysInMonth)`

### 2.3 Payment Enforcement

**MVP Upgrade Flow (No Real Payment):**

- User clicks "Upgrade to Pro" → Instant upgrade (no payment required in MVP)
- Firestore: Set `isPaidUser: true`, `trialEndsAt: null` (no longer in trial)
- Success message: "✅ Upgrade successful! AI features unlocked. Note: After the MVP period, real payment will be required."
- No payment capture, instant access

**5-Day Free Trial Flow:**

- New user signs up → Firestore: `trialStartedAt: serverTimestamp()`, `trialEndsAt: now + 5 days`
- During trial: User has full Pro access (all AI features everywhere)
- Trial expiring: Notification on Day 3, Day 4, Day 5 morning
- Trial expired: AI features locked to workspace chats only, upgrade prompt shown
- Check: `now > trialEndsAt && !isPaidUser` → Show trial expired UI

**500 User MVP Limit:**

- Registration flow checks total users in Firestore
- If `users.length >= 500` → Block signup
- Error message: "Sorry: in MVP mode, max users reached. Please check back later."
- Check happens before account creation
- Existing 4 test users count toward limit

**Future: Real Payment Flow (Post-MVP):**

- Integrate Stripe (see Section 12)
- Capture payment before upgrade
- Monthly recurring billing

**Subscription Lapse:**

- **Payment fails:** Workspace becomes **read-only immediately**
  - Members can view messages
  - Cannot send messages or create chats
  - AI features disabled (even for Pro members in that workspace)
- **No deletion:** Workspace remains read-only indefinitely (no 30-day deletion)
- **Notification:** Push + in-app notification when payment fails
- **Restoration:** Once payment succeeds, workspace becomes active again

**Workspace Limit Enforcement:**

- Max 5 active workspaces per user
- Deleting workspace decrements count (can create new one)
- Creating 6th workspace → "Workspace limit reached (5 max)" error

---

## 3. Workspaces

### 3.1 Core Concept

A **Workspace** is an isolated team environment with:

- Single admin (creator, must be Pro user)
- Admin pre-selects max users (2-25) and pays $0.50/seat/month
- Up to 25 members (free or paid users - admin pays for all)
- Group chats (workspace-specific)
- Direct chats (workspace-specific, accessible only while in workspace)
- Admin controls for collaboration
- **Key benefit for free users:** AI features work in workspace chats!

### 3.2 Workspace Lifecycle

**Creation:**

1. Pro user clicks "Create Workspace"
2. Enter workspace name
3. Optionally add members immediately
4. Workspace created, user becomes admin
5. Billing starts: $1 × initial member count (next month)

**Invitation:**

1. Admin adds members by email/username
2. Member receives:
   - Push notification
   - In-app notification in "Workspaces" section
3. Member can: **Accept**, **Decline**, or **Report as Spam**
4. If accepted: Member added to workspace, gains access to all group chats
5. If declined: Invitation deleted, no further action
6. If spam: Admin's global spam counter incremented

**Member Management:**

1. **Admin removes member:**
   - Member loses access to all workspace chats (group + direct)
   - Member removed from workspace member list
   - Direct chats with that member persist for admin/other members only
   - **Notification:** Member receives push + in-app notification: "You were removed from [Workspace Name]"
2. **Member leaves voluntarily:**
   - Same as admin removal (access loss)
   - Member can rejoin if re-invited
   - No notification needed (user-initiated action)

**Deletion:**

1. **Admin deletes workspace (immediate, no grace period):**
   - Confirmation modal shows: "⚠️ This will permanently delete: X group chats (Y messages), Z direct chats (N messages), all action items and AI history. This CANNOT be undone."
   - User confirms → Immediate deletion
   - All group chats deleted
   - All direct chats deleted
   - All members lose access
   - Workspace count decrements (admin can create another)
   - **Notification:** All members receive push + in-app notification: "[Workspace Name] was deleted by admin"
2. **Admin account deleted:**
   - Same as workspace deletion
   - All workspaces owned by admin deleted
   - **Notification:** All members receive: "[Workspace Name] was deleted (admin account removed)"

**Notification Management:**

- Workspace notifications stored in `/users/{uid}/notifications` with `type: 'workspace'`
- Notifications include: `workspaceId`, `action` (added/removed/deleted), `timestamp`
- Once user views notification → marked as read, deleted after 24 hours
- Badge count on "Workspaces" tab reflects unread workspace notifications

### 3.3 Workspace Constraints

- **Max 25 members** per workspace (at any given time, no historical tracking)
- **Max 5 workspaces** per user (admin)
- **One admin per workspace** (no co-admins, no ownership transfer)
- **Workspace names** must be unique per user for better UX (prevents confusion in dropdowns)
- **Validation:** If user tries to create workspace with existing name → Error: "Choose unique name (You already have a workspace with that name)"
- Workspaces stored in top-level collection: `/workspaces/{workspaceId}` (user document tracks owned workspace IDs via `workspacesOwned` array)

**Enterprise Inquiry:**

- When attempting to add 26th member to workspace or group chat:
  - Pop-up modal: "Limit reached. Teams larger than 25 members require our Enterprise plan. [Contact Sales]"
  - Error: "Limit reached: 25 members max. For enterprise teams, [inquire here](https://x.com/adam__isom)"
  - "Inquire here" is a clickable link to: `https://x.com/adam__isom`

### 3.4 Chat Organization in Workspaces

**Group Chats:**

- Created by admin within workspace
- All workspace members auto-added
- Max 25 members (same as workspace limit)
- Deleted when workspace deleted
- Cannot be moved to another workspace

**Direct Chats:**

- Any workspace member can start with another workspace member
- Only visible to the two participants
- Tied to workspace (deleted when workspace deleted)
- **Access rules when member leaves/removed/workspace deleted:**
  - Member immediately loses access to ALL workspace direct chats (hard delete from their conversation list)
  - Cannot view or send messages (security rules prevent access)
  - Chat remains in Firestore for other participant (if still in workspace)
  - If accessed via cached deep link → "You no longer have access to this chat"

**Non-Workspace Chats:**

- Regular direct chats and group chats (outside workspaces)
- Available to all users (free + paid)
- No admin controls
- No AI features for free users (upgrade prompt shown)
- AI features work for paid users

---

## 4. AI Feature Access Control

### 4.1 Feature Availability Matrix

| Feature | Free User (Personal) | Free User (Workspace) | Pro User | Admin (Workspace) |
|---------|---------------------|----------------------|----------|-------------------|
| **Thread Summary** | ❌ Upgrade prompt | ✅ | ✅ | ✅ + Edit/Save |
| **Action Items** | ❌ Upgrade prompt | ✅ (view only) | ✅ (view only) | ✅ + Assign + Edit/Save |
| **Smart Search** | ❌ Upgrade prompt | ✅ | ✅ | ✅ |
| **Priority Detection** | ❌ Upgrade prompt | ✅ | ✅ | ✅ |
| **Decision Tracking** | ❌ Upgrade prompt | ✅ | ✅ | ✅ + Edit/Save |
| **Meeting Scheduler** | ❌ Upgrade prompt | ✅ | ✅ | ✅ |
| **My Tasks** | ❌ | ✅ | ✅ | ✅ |

**Access Rule:**

- AI features work for Pro users everywhere
- AI features work for free users ONLY in workspace chats
- Action assignment, editing, saving = Admin-only in workspaces

### 4.2 Feature Gating Implementation

**Client-Side Check (React Native):**

```typescript
function canAccessAIFeatures(user: User, conversation: Conversation): boolean {
  // Pro users can access AI everywhere
  if (user.isPaidUser) return true;
  
  // Users in 5-day trial get full Pro access
  if (user.trialEndsAt && Date.now() < user.trialEndsAt.toMillis()) {
    return true; // Trial active
  }
  
  // Free users (after trial) can only access AI in workspace chats
  if (conversation.workspaceId) {
    return isUserInWorkspace(user.uid, conversation.workspaceId);
  }
  
  // Free users outside workspaces: no AI (show upgrade prompt)
  return false;
}
```

**UI Behavior:**

- **Users in 5-day trial:** All AI features work everywhere (like Pro users)
- **Trial expiring:** Banner shown on Day 3-5: "Your trial ends in X days. Upgrade to keep AI in personal chats."
- **Free users (post-trial) in personal chats:** Sparkle menu (✨) visible but tapping features shows "Upgrade to Pro" modal
- **Free users (post-trial) in workspace chats:** All AI features work normally (view-only, no admin features)
- **Pro users:** All AI features work everywhere

**Cloud Function Validation:**

- All AI Cloud Functions must check `isPaidUser` OR workspace membership
- Reject with `permission-denied` if not authorized

---

## 5. Admin-Only Features

### 5.1 Action Item Assignment

**Current Behavior:**

- AI extracts action items with optional assignee detection
- Items displayed in read-only modal

**New Behavior (Workspace Admins Only):**

- Admin can manually assign unassigned items to workspace members
- Admin can reassign items to different members
- Members see "Assigned to you" indicator
- Assignments persist across devices

**Implementation:**

- Add "Assign" button for admin users only
- Picker shows workspace members
- Update Firestore: `assigneeUid`, `assigneeDisplayName`
- Real-time sync via Firestore listeners

### 5.2 My Tasks View

**Feature Overview:**

- Aggregated view of all action items assigned to the current user
- Separate views for workspace vs. non-workspace tasks
- Available to Pro users only (AI feature)

**Implementation:**

**In Workspace Mode:**

- Small "My Tasks" button visible (e.g., in workspace navigation)
- Shows all action items assigned to user in CURRENT workspace only
- Query: `conversations/{id}/ai_action_items where assigneeUid == currentUser && conversationWorkspaceId == currentWorkspaceId`

**In Regular Chat Mode (Non-Workspace):**

- "My Tasks" button in main navigation
- Shows all action items assigned to user in NON-workspace chats only
- Query: `conversations/{id}/ai_action_items where assigneeUid == currentUser && conversationWorkspaceId == null`

**Task List UI:**

```
┌───────────────────────────────────┐
│  My Tasks (Project Team)          │
│                                   │
│  ✓ Review Q4 budget               │
│    From: Budget Planning          │
│    Assigned: Oct 25               │
│                                   │
│  ○ Schedule team meeting          │
│    From: Operations Team          │
│    Assigned: Oct 24               │
│                                   │
│  [No tasks yet]                   │
└───────────────────────────────────┘
```

**Interaction:**

- Tapping task → Opens conversation where it was assigned
- Long press → Mark as complete (future enhancement)

### 5.3 Edit & Save AI Content

**Applies To:**

- Thread summaries
- Decision records
- Action items list

**Workflow:**

1. Admin opens AI feature (e.g., "Thread Summary")
2. AI generates content (cached)
3. Admin sees "Edit & Save" button (admin only)
4. Clicks button → Modal opens with editable fields
5. Admin edits content
6. Clicks "Save" → Replaces AI-generated version
7. New version stored as "saved" (flagged `editedByAdmin: true`)
8. All members see edited version going forward

**Storage:**

- **Single saved version** per feature per workspace-group-chat
- Overwrites previous saved version (no history)
- Original AI-generated version NOT preserved (replaced entirely)
- Saved version marked `savedByAdmin: uid`, `savedAt: timestamp`, `editedByAdmin: true`

**UI States:**

- **No saved version:** Display AI-generated content with "Edit & Save" button (admin only)
- **Saved version exists:** Display saved content with "✏️ Edited" badge + "Re-edit" button (admin only)
- **Admin view:** "Edit" button to modify saved version

---

## 6. Spam Prevention

### 6.1 Strike System

**Goal:** Prevent spam invitations to workspaces and group chats.

**Mechanics:**

- Global counter: `spamStrikes` (stored in `/users/{uid}`)
- Max strikes: **5**
- Strike triggers:
  1. User invited to workspace → marks as spam
  2. User added to group chat → marks as spam
- **Decay system:** Strikes older than 1 month are automatically removed
  - Tracked with timestamps in `spamReportsReceived` array
  - Checked/cleaned during:
    - Spam report submission
    - User attempts to invite someone to workspace/group chat
- No appeals process

**Penalties:**

- **5 strikes reached:**
  - ❌ Cannot create workspaces
  - ❌ Cannot create group chats
  - ✅ Can still create direct chats
  - ✅ Can still be invited to workspaces/group chats
  - 🔔 User notified via push notification + email

**Report Flow:**

1. User receives workspace/group chat invitation
2. In-app notification shows:
   - "Alice invited you to 'Marketing Team' workspace"
   - Buttons: **Accept** | **Decline** | **Report Spam**
3. User clicks "Report Spam"
4. Confirmation: "Report this invitation as spam?"
5. Confirmed → Inviter's `spamStrikes` incremented
6. Invitation declined automatically

**Important:** Users can ONLY report spam at the invitation stage (before accepting). Once they join a workspace or group chat, the "Report Spam" option is no longer available. They can leave at any time, but leaving does not count as spam reporting.

**Tracking:**

```typescript
// Firestore: /users/{uid}
{
  spamStrikes: 3, // Computed field (count of non-expired strikes)
  spamReportsReceived: [
    { reportedBy: 'user123', reason: 'workspace', timestamp, workspaceId },
    { reportedBy: 'user456', reason: 'groupChat', timestamp, conversationId },
    { reportedBy: 'user789', reason: 'workspace', timestamp, workspaceId }
  ],
  spamBanned: false // Set to true when active strikes >= 5
}
```

**Decay Logic:**

```typescript
// When checking strikes, filter out strikes older than 1 month
function getActiveStrikes(user: User): number {
  const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const activeReports = user.spamReportsReceived.filter(
    report => report.timestamp.toMillis() > oneMonthAgo
  );
  return activeReports.length;
}

// Update spamStrikes and spamBanned based on active count
// Clean old reports from array periodically
```

### 6.2 Prevention Measures

- **Rate limiting:** Max 20 invitations per day per user
- **Verification:** Email verification required to create workspaces
- **Warning system:**
  - Notification at 3 active strikes: "⚠️ You have 3 spam reports. Be careful - 5 strikes will restrict workspace/group creation."
  - Notification at 4 active strikes: "⚠️ You have 4 spam reports. One more will restrict your account."
  - Notification at 5 strikes: "🚫 Your account is restricted from creating workspaces and group chats due to spam reports."
- **Decay notification:** When a strike expires: "✅ A spam strike from 30+ days ago has been removed. You now have X active strikes."

---

## 7. User Profile & Status

### 7.1 Overview

The User Profile screen provides users with a central location to:

- View their account status (Free, Trial, or Pro)
- See what Pro features they have access to
- Manage their subscription
- Access account actions (upgrade, start trial)

The profile is accessible from **all tab screens** via a circular button in the top-right corner displaying the user's initials.

### 7.2 Profile Button

**Location:** Top-right corner of all tab screens (Chats, New Chat, Workspaces, Profile)

**Appearance:**

- Circular button (36x36px)
- Displays user initials (1-2 characters)
- Background color: `#007AFF` (primary blue)
- Text color: white
- Border: 2px white border for contrast

**States:**

- **Normal:** Blue background, white text, tap to navigate to profile
- **Selected:** When on profile screen, show visual indicator (e.g., `#005BBF` darker blue or border highlight)

**Initials Logic:** See [TASK-LIST-PHASE4.md, lines 1085-1106](./TASK-LIST-PHASE4.md#L1085-L1106)

### 7.3 Profile Screen UI

**Navigation:** Tab screen (hidden from tab bar), accessible only via profile button

**UI Schematic:**

```
┌─────────────────────────────┐
│  ← Profile            [AI]  │ (Header with back button, profile button selected)
├─────────────────────────────┤
│                             │
│    [AI]  (large circle)     │ (Initials - 80x80px, clickable in future for profile pic)
│                             │
│    Adam Isom                │ (Display Name - 20px, bold)
│    adam@hey.com             │ (Email - 14px, gray)
│                             │
│    🎉 Trial User            │ (Status badge - 16px, yellow bg)
│    4 days remaining         │ (Status detail - 14px, gray)
│                             │
│    OR                       │
│                             │
│    💎 Pro User              │ (Status badge - 16px, blue bg)
│    Expires: Oct 26, 2026    │ (Subscription expiry - 14px, gray)
│                             │
│    OR                       │
│                             │
│    🔓 Free User             │ (Status badge - 16px, gray bg)
│                             │
├─────────────────────────────┤
│  Your Pro Features          │ (Section header - 18px, bold)
│                             │
│  AI Features:               │ (Subheader - 16px, bold)
│  ✓ Track Action Items &     │
│    Decisions                │ (14px, 8px spacing)
│  ✓ AI Summaries & Semantic  │
│    Search                   │
│  ✓ Meeting Scheduler &      │
│    Auto-Detection of        │
│    Urgent Messages          │
│                             │
│  Workspace Features:        │ (Subheader - 16px, bold)
│  ✓ Create up to 5 private   │
│    workspaces               │ (14px, 8px spacing)
│  ✓ Invite up to 25 members  │
│    per workspace            │
│  ✓ Assign action items to   │
│    your team within chats   │
│  ✓ Edit and save AI-        │
│    generated text & high-   │
│    priority markers on      │
│    messages                 │
│                             │
│  50¢ per member per         │
│  workspace                  │ (12px, italic, gray)
│                             │
│  [Upgrade to Pro]           │ (Free users after trial - blue button)
│  [Start 5-Day Free Trial]   │ (Free users, trial eligible - blue outlined)
│  [Manage Subscription]      │ (Pro users - blue button)
│                             │
└─────────────────────────────┘
```

### 7.4 Status Display Logic

**Status Badge & Action Buttons:** See [TASK-LIST-PHASE4.md, lines 1174-1238](./TASK-LIST-PHASE4.md#L1174-L1238) for complete implementation logic.

### 7.5 Feature List Display

**Content:** Copy exact feature list from `UpgradeToProModal.tsx` (AI Features + Workspace Features). Display for all user types to remind Pro users of features and motivate free users.

### 7.6 Subscription Management Screen (Future)

**Route:** `/subscription` (modal presentation)

**UI:**

```
┌─────────────────────────────┐
│  ← Manage Subscription  [X] │
├─────────────────────────────┤
│                             │
│  Subscription Details       │
│                             │
│  Plan: Pro                  │
│  Price: $3/month            │
│  Next billing: Oct 26, 2025 │
│                             │
│  [Change Payment Method]    │ (Disabled, gray)
│  (Coming soon)              │
│                             │
│  [Cancel Subscription]      │ (Disabled, gray)
│  (Coming soon)              │
│                             │
└─────────────────────────────┘
```

**Implementation:** Placeholder only - buttons disabled with "Coming soon" note

**Future Implementation:**

- Integrate with Stripe billing portal
- Handle cancellation flow (immediate or end of period)
- Update payment method
- View billing history

### 7.7 Implementation Sub-Phases

The User Profile feature is broken down into **4 logical sub-phases** for sequential implementation:

**See [TASK-LIST-PHASE4.md, Appendix A (lines 1067-1293)](./TASK-LIST-PHASE4.md#L1067-L1293) for:**

- Sub-Phase 4.1: Profile Button Component (1-2 hours)
- Sub-Phase 4.2: Profile Screen Structure (2-3 hours)
- Sub-Phase 4.3: Feature List & Action Buttons (2-3 hours)
- Sub-Phase 4.4: Subscription Management Screen (1-2 hours)

**Total:** 6-10 hours | **Order:** Sequential (4.1 → 4.2 → 4.3 → 4.4)

---

## 8. Data Model

### 8.1 New Firestore Collections

#### `/users/{uid}` (Extended)

```typescript
{
  // Existing fields...
  email: string,
  displayName: string,
  isOnline: boolean,
  lastSeenAt: Timestamp,
  
  // NEW: Paid tier fields
  isPaidUser: boolean,                    // $3/month Pro subscription
  subscriptionTier: 'free' | 'pro',       // Current tier
  subscriptionStartedAt?: Timestamp,
  subscriptionEndsAt?: Timestamp,
  stripeCustomerId?: string,              // Future payment integration
  
  // NEW: Free trial fields
  trialStartedAt?: Timestamp,             // When 5-day trial began
  trialEndsAt?: Timestamp,                // When trial expires
  trialUsed: boolean,                     // True if user already used their trial
  
  // NEW: Workspace fields
  workspacesOwned: string[],              // Array of workspace IDs (max 5)
  workspacesMemberOf: string[],           // Workspaces user is member of
  
  // NEW: Spam prevention
  spamStrikes: number,                    // Active strike count (auto-computed)
  spamBanned: boolean,                    // True if active strikes >= 5
  spamReportsReceived: Array<{
    reportedBy: string,
    reason: 'workspace' | 'groupChat',
    timestamp: Timestamp,                 // Used for 6-month decay
    workspaceId?: string,
    conversationId?: string
  }>
}
```

#### `/workspaces/{workspaceId}` (NEW)

```typescript
{
  name: string,                           // "Marketing Team"
  adminUid: string,                       // Creator/owner UID
  adminDisplayName: string,
  members: string[],                      // Array of member UIDs (max 25)
  memberDetails: {
    [uid: string]: {
      displayName: string,
      email: string,
      joinedAt: Timestamp,
      role: 'admin' | 'member'
    }
  },
  createdAt: Timestamp,
  
  // Billing
  maxUsersThisMonth: number,              // Admin's chosen capacity (pays for all seats)
  billingCycleStart: Timestamp,
  currentMonthCharge: number,             // $0.50 × maxUsersThisMonth
  isActive: boolean,                      // False if payment lapsed
  readOnlySince?: Timestamp,              // Set when payment fails (no deletion)
  
  // Statistics
  groupChatCount: number,
  directChatCount: number,
  totalMessages: number
}
```

#### `/workspace_invitations/{invitationId}` (NEW)

```typescript
{
  workspaceId: string,
  workspaceName: string,
  invitedByUid: string,
  invitedByDisplayName: string,
  invitedUserUid: string,
  invitedUserEmail: string,
  status: 'pending' | 'accepted' | 'declined' | 'spam',
  sentAt: Timestamp,
  respondedAt?: Timestamp
}
```

#### `/conversations/{conversationId}` (Extended)

```typescript
{
  // Existing fields...
  type: 'direct' | 'group',
  participants: string[],
  participantDetails: {...},
  lastMessageAt: Timestamp,
  
  // NEW: Workspace fields
  workspaceId?: string,                   // Null for non-workspace chats
  workspaceName?: string,
  isWorkspaceChat: boolean,               // Quick filter flag
  
  // NEW: Member limit
  maxMembers: 25                          // Hard limit
}
```

#### `/conversations/{conversationId}/ai_summaries/{summaryId}` (Extended)

```typescript
{
  // Existing fields...
  summary: string,
  keyPoints: string[],
  messageCount: number,
  generatedAt: Timestamp,
  
  // NEW: Admin edit fields
  editedByAdmin: boolean,
  editedByAdminUid?: string,
  editedByAdminName?: string,
  editedAt?: Timestamp,
  originalSummary?: string,               // Preserve AI version
  originalKeyPoints?: string[]
}
```

#### `/conversations/{conversationId}/ai_action_items/{itemId}` (Extended)

```typescript
{
  // Existing fields...
  text: string,
  priority: 'high' | 'medium' | 'low',
  status: 'pending' | 'completed',
  assigneeUid?: string,
  assigneeDisplayName?: string,
  
  // NEW: Admin assignment tracking
  assignedByAdminUid?: string,
  assignedByAdminName?: string,
  assignedAt?: Timestamp,
  
  // NEW: Admin edit fields
  editedByAdmin: boolean,
  editedByAdminUid?: string,
  editedAt?: Timestamp,
  originalText?: string
}
```

#### `/conversations/{conversationId}/ai_decisions/{decisionId}` (Extended)

```typescript
{
  // Existing fields...
  decision: string,
  context: string,
  participants: string[],
  decidedAt: Timestamp,
  
  // NEW: Admin edit fields
  editedByAdmin: boolean,
  editedByAdminUid?: string,
  editedAt?: Timestamp,
  originalDecision?: string,
  originalContext?: string
}
```

### 8.2 Indexes Required

```javascript
// firestore.indexes.json
[
  {
    "collectionGroup": "workspaces",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "adminUid", "order": "ASCENDING" },
      { "fieldPath": "isActive", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "conversations",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "workspaceId", "order": "ASCENDING" },
      { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "workspace_invitations",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "invitedUserUid", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "sentAt", "order": "DESCENDING" }
    ]
  }
]
```

---

## 9. User Flows

### 9.1 Create Workspace (Admin)

```
[Pro User - Main Screen]
    ↓
[Taps "Workspace Mode" toggle at top]
    ↓
[Workspace List Screen]
"You have 0 workspaces"
[+ Create Workspace] button
    ↓
[Taps Create Workspace]
    ↓
[Modal: Create Workspace]
- Name: [____________]
- Add Members (optional):
  [Search users by email/name]
  [Selected: Alice, Bob, Charlie (3)]
- Max 25 members
[Cancel] [Create ($3/month)]
    ↓
[Workspace Created]
- Firestore: /workspaces/{id} created
- Admin: workspacesOwned array updated
- Members: Invitations sent
- Billing: maxUsersThisMonth = 3
    ↓
[Workspace Chat List]
"Marketing Team (3 members)"
- 0 group chats
- 0 direct chats
[+ New Group Chat] [+ New Direct Chat]
```

### 8.2 Accept Workspace Invitation (Member)

```
[Free User - Main Screen]
New notification badge on "Workspaces" section
    ↓
[Taps Workspaces]
    ↓
[Workspace Invitations Tab]
"Alice invited you to 'Marketing Team'"
[Accept] [Decline] [Report Spam]
    ↓
[Taps Accept]
    ↓
[Confirmation]
"Join Marketing Team?"
"You'll get access to all group chats and AI features."
[Cancel] [Join]
    ↓
[Taps Join]
    ↓
[Added to Workspace]
- Firestore: User added to workspace.members
- User: workspacesMemberOf array updated
- Billing: maxUsersThisMonth updated (if increased)
- Access granted to all workspace group chats
    ↓
[Workspace Chat List]
"Marketing Team (4 members)"
- Q1 Planning (group)
- Budget Discussion (group)
[AI features now unlocked ✨]
```

### 8.3 Assign Action Item (Admin)

```
[Admin - Workspace Chat "Q1 Planning"]
    ↓
[Taps AI menu (✨)]
    ↓
[Taps "Action Items"]
    ↓
[Loading... "Scanning for action items..."]
    ↓
[Action Items Modal]
- "Prepare Q1 budget report" (HIGH)
  Status: Pending
  Assignee: Unassigned
  [➕ Assign] ← Admin only
- "Schedule team offsite" (MEDIUM)
  Assigned to: Bob
    ↓
[Admin taps "➕ Assign"]
    ↓
[Picker Modal: Select Assignee]
- 👤 Alice
- 👤 Bob
- 👤 Charlie
- 👤 David
[Cancel]
    ↓
[Admin taps "Alice"]
    ↓
[Optimistic Update]
Modal closes, item now shows:
- "Prepare Q1 budget report" (HIGH)
  Status: Pending
  Assignee: 👤 Alice
    ↓
[Firestore Update]
- assigneeUid: alice123
- assigneeDisplayName: Alice
- assignedByAdminUid: admin456
- assignedAt: now
    ↓
[Alice's Device - Notification]
"You were assigned a task in Q1 Planning"
[Alice can now see in "My Tasks" view]
```

### 8.4 Edit & Save AI Summary (Admin)

```
[Admin - Workspace Chat]
    ↓
[Taps AI menu → "Summarize Thread"]
    ↓
[AI generates summary]
Summary: "Team discussed Q1 budget..."
Key Points:
- Budget increased 15%
- Hiring freeze until Q2
[Edit & Save] ← Admin only
    ↓
[Admin taps "Edit & Save"]
    ↓
[Edit Modal]
Summary: [editable textarea with AI content]
Key Points:
1. [Budget increased 15%]
2. [Hiring freeze until Q2]
[Add Key Point]
[Cancel] [Save]
    ↓
[Admin edits and taps Save]
    ↓
[Firestore Update]
- summary: updated text
- keyPoints: updated array
- editedByAdmin: true
- editedByAdminUid: admin456
- editedAt: now
- originalSummary: preserved
    ↓
[All members see updated version]
"✏️ Edited by Admin" badge
```

### 8.5 Report Spam

```
[Free User - Receives Invitation]
Push notification: "Alice invited you to 'Marketing Team'"
    ↓
[Opens app → Workspace Invitations]
"Alice invited you to 'Marketing Team'"
[Accept] [Decline] [Report Spam]
    ↓
[Taps "Report Spam"]
    ↓
[Confirmation Dialog]
"Report this invitation as spam?"
"This will help us prevent unwanted invitations."
[Cancel] [Report]
    ↓
[Taps Report]
    ↓
[Firestore Updates]
- Alice's spamStrikes: 2 → 3
- Invitation status: 'spam'
- User not added to workspace
    ↓
[If Alice hits 5 strikes]
- spamBanned: true
- Push notification: "Account restricted"
- Cannot create workspaces or group chats
```

---

## 10. UI/UX Specifications

### 10.1 Navigation Structure

```
Main Screen (Tabs)
├── Chats (existing)
│   ├── Direct Chats
│   └── Group Chats
│
├── ⭐ Workspaces (NEW)
│   ├── [Toggle: Personal ↔ Workspace Mode]
│   │
│   ├── Personal Mode (default)
│   │   └── Regular chats (current UI)
│   │
│   └── Workspace Mode
│       ├── Workspace List (if multiple)
│       │   ├── Marketing Team (4 members)
│       │   ├── Engineering (12 members)
│       │   └── [+ Create Workspace]
│       │
│       └── Workspace Chat List (selected workspace)
│           ├── Group Chats (5)
│           ├── Direct Chats (3)
│           └── [+ New Chat]
│
└── Settings
    ├── Account
    ├── ⭐ Subscription (NEW)
    │   ├── Current Plan: Free/Pro
    │   ├── [Upgrade to Pro]
    │   └── Workspace Billing
    └── Privacy
```

### 9.2 Workspace Mode Toggle

**Location:** Top of screen (below status bar)

**Free Users:**

```
┌─────────────────────────────────────┐
│ [Personal] 🔒 Workspaces            │ ← Toggle (Workspaces disabled)
│  Upgrade to Pro to create workspaces│
└─────────────────────────────────────┘
```

**Pro Users:**

```
┌─────────────────────────────────────┐
│ [Personal] [Workspaces]             │ ← Toggle (both active)
└─────────────────────────────────────┘
```

**Tapping disabled Workspaces:**

- Show upgrade modal
- "Upgrade to Pro ($3/month) to unlock Workspaces"

### 9.3 AI Feature Paywalls

**Free User taps AI feature (any chat):**

```
┌─────────────────────────────────────┐
│  ✨ Upgrade to Pro                  │
│                                     │
│  AI features require a Pro          │
│  subscription.                      │
│                                     │
│  Get unlimited access to:           │
│  • Thread Summaries                 │
│  • Action Items                     │
│  • Smart Search                     │
│  • Priority Detection               │
│  • Decision Tracking                │
│  • Meeting Scheduler                │
│                                     │
│  [Upgrade to Pro - $3/month]        │
│  [Maybe Later]                      │
└─────────────────────────────────────┘
```

**Pro User:**

- AI features work normally everywhere
- No paywall

### 9.4 Admin UI Badges

**Action Items Modal (Admin View):**

```
┌─────────────────────────────────────┐
│  Action Items                    [X]│
│                                     │
│  ☑ Prepare budget report      HIGH │
│    Status: Pending                  │
│    👤 Unassigned  [➕ Assign] ← NEW │
│                                     │
│  ☑ Schedule offsite         MEDIUM │
│    Status: Pending                  │
│    👤 Bob (assigned by you)         │
│                                     │
│  [Edit & Save All] ← Admin only     │
└─────────────────────────────────────┘
```

**Summary Modal (Admin View):**

```
┌─────────────────────────────────────┐
│  Thread Summary                  [X]│
│                                     │
│  Summary:                           │
│  Team discussed Q1 budget           │
│  allocation...                      │
│                                     │
│  Key Points:                        │
│  • Budget increased 15%             │
│  • Hiring freeze until Q2           │
│                                     │
│  ✏️ Last edited by Admin (You)      │ ← Badge if edited
│  2 hours ago                        │
│                                     │
│  [Edit] ← Admin only                │
└─────────────────────────────────────┘
```

### 9.5 Workspace Invitation Notification

**Push Notification:**

```
🔔 MessageAI
Alice invited you to "Marketing Team" workspace
Tap to respond
```

**In-App (Workspace Invitations screen):**

```
┌─────────────────────────────────────┐
│  Workspace Invitations              │
│                                     │
│  👥 Marketing Team                  │
│  Invited by: Alice Johnson          │
│  "Join our marketing team for Q1"   │
│  4 members • 3 group chats          │
│                                     │
│  [Accept]  [Decline]  [Report Spam] │
│                                     │
│  ────────────────────────────────── │
│                                     │
│  👥 Engineering Team                │
│  Invited by: Bob Smith              │
│  ...                                │
└─────────────────────────────────────┘
```

---

## 11. Security & Permissions

### 11.1 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isUser(uid) {
      return isAuthenticated() && request.auth.uid == uid;
    }
    
    function isPaidUser() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isPaidUser == true;
    }
    
    function isWorkspaceAdmin(workspaceId) {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.adminUid == request.auth.uid;
    }
    
    function isWorkspaceMember(workspaceId) {
      return isAuthenticated() &&
             request.auth.uid in get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.members;
    }
    
    function canAccessAIFeatures(conversationId) {
      // Simple check: user must be paid
      return isPaidUser();
    }
    
    // Users collection
    match /users/{uid} {
      allow read: if isAuthenticated();
      allow write: if isUser(uid);
    }
    
    // Workspaces collection
    match /workspaces/{workspaceId} {
      allow read: if isWorkspaceMember(workspaceId);
      allow create: if isPaidUser() && isUser(request.resource.data.adminUid);
      allow update: if isWorkspaceAdmin(workspaceId);
      allow delete: if isWorkspaceAdmin(workspaceId);
    }
    
    // Workspace invitations
    match /workspace_invitations/{invitationId} {
      allow read: if isAuthenticated() && 
                     (isUser(resource.data.invitedUserUid) || 
                      isUser(resource.data.invitedByUid));
      allow create: if isPaidUser();
      allow update: if isUser(resource.data.invitedUserUid); // Accept/decline/spam
      allow delete: if isUser(resource.data.invitedUserUid) || 
                       isUser(resource.data.invitedByUid);
    }
    
    // Conversations
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() && 
                     request.auth.uid in resource.data.participants;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
                       request.auth.uid in resource.data.participants;
                       
      // AI Summaries (extended rules)
      match /ai_summaries/{summaryId} {
        allow read: if isAuthenticated() && 
                       request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        
        // Only Cloud Functions can create AI summaries
        allow create: if false;
        
        // Only workspace admins can edit
        allow update: if isWorkspaceAdmin(
          get(/databases/$(database)/documents/conversations/$(conversationId)).data.workspaceId
        );
      }
      
      // AI Action Items (extended rules)
      match /ai_action_items/{itemId} {
        allow read: if isAuthenticated() && 
                       request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        
        // Only Cloud Functions can create
        allow create: if false;
        
        // Workspace admins can assign/edit
        allow update: if isWorkspaceAdmin(
          get(/databases/$(database)/documents/conversations/$(conversationId)).data.workspaceId
        );
      }
      
      // AI Decisions (extended rules)
      match /ai_decisions/{decisionId} {
        allow read: if isAuthenticated() && 
                       request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        
        // Only Cloud Functions can create
        allow create: if false;
        
        // Workspace admins can edit
        allow update: if isWorkspaceAdmin(
          get(/databases/$(database)/documents/conversations/$(conversationId)).data.workspaceId
        );
      }
    }
  }
}
```

### 10.2 Cloud Function Authorization

All AI Cloud Functions must validate:

```typescript
// Example: extractActionItems function
export const extractActionItems = functions.https.onCall(async (data, context) => {
  // 1. Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  // 2. Get conversation
  const conversation = await getConversation(data.conversationId);
  
  // 3. Verify user is participant
  if (!conversation.participants.includes(context.auth.uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant');
  }
  
  // 4. Check AI feature access
  const user = await getUser(context.auth.uid);
  
  // Pro users can access AI everywhere
  if (user.isPaidUser) {
    // Proceed with AI extraction...
    return;
  }
  
  // Free users can only access AI in workspace chats
  if (conversation.workspaceId) {
    const workspace = await getWorkspace(conversation.workspaceId);
    if (workspace.members.includes(context.auth.uid)) {
      // Free user in workspace chat: allowed
      // Proceed with AI extraction...
      return;
    }
  }
  
  // Free user in personal chat: denied
  throw new functions.https.HttpsError(
    'permission-denied',
    'AI features require Pro subscription ($3/month) or workspace membership'
  );
});
```

---

## 12. Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** Set up data model, authentication, basic workspace CRUD

**Tasks:**

1. Update Firestore schema
   - Add new collections: `workspaces`, `workspace_invitations`
   - Extend `users` with paid/workspace fields
   - Extend `conversations` with workspace fields
2. Update security rules
3. Create Cloud Functions for workspace management:
   - `createWorkspace`
   - `inviteToWorkspace`
   - `acceptInvitation`
   - `removeFromWorkspace`
4. Add `isPaidUser` flag to test users
5. Basic workspace UI (list, create modal)

**Testing:**

- Create workspace
- Invite members
- Accept/decline invitations

### Phase 2: AI Feature Gating (Week 1-2)

**Goal:** Implement paid tier checks for AI features

**Tasks:**

1. Add feature flag checks to all AI Cloud Functions
2. Add client-side feature gating
3. Create upgrade/paywall modals
4. Update AI service wrapper functions
5. Test AI access for free/paid/workspace users

**Testing:**

- Verify free users can't access AI (anywhere)
- Verify free users see upgrade modal when tapping sparkle menu
- Verify Pro users can access AI everywhere
- Verify workspace membership doesn't grant AI access to free users

### Phase 3: Workspace Chat Organization (Week 2)

**Goal:** Implement workspace mode toggle, chat filtering

**Tasks:**

1. Add workspace mode toggle to navigation
2. Filter conversations by workspace
3. Add workspace context to chat screens
4. Implement workspace member limit (50)
5. Add workspace deletion flow

**Testing:**

- Toggle between personal/workspace modes
- Create chats in workspace
- Verify member limits
- Delete workspace (verify cascading delete)

### Phase 4: User Profile & Status (Week 2)

**Goal:** Create user profile screen with status display and feature overview

**UI Schematic:**

```
┌─────────────────────────────┐
│  ← Profile            [AI]  │ (Header with back button, profile button selected)
├─────────────────────────────┤
│                             │
│    [AI]  (large circle)     │ (Initials - clickable in future for profile pic)
│                             │
│    Adam Isom                │ (Display Name)
│    adam@hey.com             │ (Email)
│                             │
│    🎉 Trial User            │ (Status badge)
│    4 days remaining         │ (Trial countdown)
│                             │
│    OR                       │
│                             │
│    💎 Pro User              │ (Status badge)
│    Expires: Oct 26, 2026    │ (Subscription expiry)
│                             │
│    OR                       │
│                             │
│    🔓 Free User             │ (Status badge)
│                             │
├─────────────────────────────┤
│  Your Pro Features          │ (Section header)
│                             │
│  AI Features:               │
│  ✓ Track Action Items &     │
│    Decisions                │
│  ✓ AI Summaries & Semantic  │
│    Search                   │
│  ✓ Meeting Scheduler &      │
│    Auto-Detection of        │
│    Urgent Messages          │
│                             │
│  Workspace Features:        │
│  ✓ Create up to 5 private   │
│    workspaces               │
│  ✓ Invite up to 25 members  │
│    per workspace            │
│  ✓ Assign action items to   │
│    your team within chats   │
│  ✓ Edit and save AI-        │
│    generated text & high-   │
│    priority markers on      │
│    messages                 │
│                             │
│  50¢ per member per         │
│  workspace                  │
│                             │
│  [Upgrade to Pro]           │ (Free users after trial)
│  [Start 5-Day Free Trial]   │ (Free users, trial eligible)
│  [Manage Subscription]      │ (Pro users)
│                             │
└─────────────────────────────┘
```

**Tasks:**

1. **Profile Button Component**
   - Create `components/ProfileButton.tsx`
   - Circular button with user initials (max 2 chars, or 1 if no space in name)
   - Position in top-right of tab screens via header config
   - Selected state styling when on profile screen (highlighted/different color)
   - Navigate to `/profile` on tap

2. **Profile Screen**
   - Create `app/(tabs)/profile.tsx`
   - Hidden from tab bar (`href: null`)
   - Accessible only via profile button

3. **Profile Header Config**
   - Update `app/(tabs)/_layout.tsx`
   - Add `headerRight` option for all tabs (Chats, New Chat, Workspaces, Profile)
   - Render `<ProfileButton />` with current route context

4. **Profile Content**
   - Large circle with initials at top (future: clickable for profile pic upload)
   - Display name and email
   - Status badge with appropriate icon:
     - 💎 Pro User (blue badge) + expiry date
     - 🎉 Trial User (yellow badge) + days remaining
     - 🔓 Free User (gray badge)
   - "Your Pro Features" section (copy from UpgradeToProModal)
   - Action buttons based on status:
     - **Free (no trial):** "Start 5-Day Free Trial" (if eligible) + "Upgrade to Pro"
     - **Free (in trial):** No buttons (trial active)
     - **Free (trial expired):** "Upgrade to Pro"
     - **Pro:** "Manage Subscription"

5. **Subscription Management Screen (Future)**
   - Create `app/subscription.tsx` (modal presentation)
   - Navigate from "Manage Subscription" button
   - Show two placeholder buttons:
     - "Change Payment Method" (disabled, coming soon)
     - "Cancel Subscription" (disabled, coming soon)
   - Note in UI: "Feature coming soon"

**Status Display Logic:**

```typescript
// Pro User
if (user.isPaidUser) {
  badge = "💎 Pro User"
  detail = `Expires: ${formatDate(user.subscriptionEndsAt)}`
  action = "Manage Subscription"
}

// Trial User
else if (user.trialEndsAt && now < user.trialEndsAt) {
  badge = "🎉 Trial User"
  detail = `${daysRemaining} days remaining`
  action = null // No button during trial
}

// Free User (trial expired or never had trial)
else {
  badge = "🔓 Free User"
  detail = null
  action = user.trialUsed ? "Upgrade to Pro" : "Start 5-Day Free Trial"
}
```

**Initials Logic:**

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

**Feature List Display:**

- Show complete list from `UpgradeToProModal` (AI Features + Workspace Features)
- Display identically for all user types (no graying out for free users)
- Purpose: Remind Pro users of their features, motivate free users to upgrade

**Testing:**

- Profile button appears on all tab screens
- Profile button shows correct initials
- Profile button has selected state on profile screen
- Clicking profile button navigates to profile
- Status badge shows correctly for Pro/Trial/Free
- Trial countdown accurate
- Pro expiry date displays correctly
- Action buttons appear based on user status
- "Manage Subscription" opens subscription modal
- Feature list displays correctly
- Subscription modal shows placeholder buttons

**Future Enhancements:**

- Profile picture upload (tap large circle to change)
- Cancel subscription implementation
- Change payment method implementation
- Subscription history
- Usage statistics (AI requests, workspace activity)
- In-app notifications bell (replace or complement profile button)

### Phase 5: Admin Features - Assignment (Week 2-3)

**Goal:** Enable action item assignment for admins

**Tasks:**

1. Update `assignActionItem` Cloud Function
2. Add admin check before allowing assignment
3. Update ActionItemsModal with assignment UI
4. Add participant picker
5. Implement optimistic updates
6. Add "My Tasks" aggregation view (optional)

**Testing:**

- Admin assigns action items
- Non-admin sees read-only items
- Assignment persists across devices

### Phase 6: Admin Features - Edit & Save (Week 3)

**Goal:** Enable editing AI content for admins

**Tasks:**

1. Create edit modals for summaries, decisions, action items
2. Add "Edit & Save" buttons (admin only)
3. Implement save logic (replace AI version)
4. Update Firestore with edit tracking
5. Display "edited by admin" badges
6. Preserve original AI versions

**Testing:**

- Admin edits summaries
- Admin edits decisions
- Admin edits action items
- Members see edited versions

### Phase 7: Spam Prevention (Week 3)

**Goal:** Implement strike system

**Tasks:**

1. Add spam reporting to invitation flow
2. Create Cloud Function to increment strikes
3. Add strike limit enforcement (5 strikes)
4. Add notification on ban
5. Block workspace/group chat creation for banned users

**Testing:**

- Report spam invitations
- Verify strike counter increments
- Test 5-strike ban
- Verify banned user can't create workspaces/groups

### Phase 8: Billing Logic (Week 4)

**Goal:** Implement max user tracking, billing calculations

**Tasks:**

1. Track `maxUsersThisMonth` per workspace
2. Create Cloud Function for monthly billing
3. Implement workspace read-only state (payment lapsed)
4. Implement 30-day deletion countdown
5. Add billing UI in settings
6. Create admin dashboard for billing

**Testing:**

- Add/remove members (verify max tracking)
- Simulate payment lapse (read-only state)
- Verify 30-day deletion
- Manual billing calculation test

### Phase 9: Polish & Testing (Week 4)

**Goal:** UI polish, edge cases, E2E testing

**Tasks:**

1. Add loading states, animations
2. Handle edge cases (workspace deletion mid-chat, etc.)
3. Add analytics tracking
4. Performance testing (50 members, multiple workspaces)
5. E2E test suite
6. Documentation updates

**Testing:**

- Full user journey tests
- Performance benchmarks
- Security audit

---

## 13. Future Enhancements

> **Note:** This section documents features that are out of scope for the initial Phase 4 implementation but may be valuable in future iterations.

### 13.1 Deferred Features from Phase 4

**Direct Chat Export on Workspace Deletion:**

- Currently: Workspace direct chats are deleted when workspace is deleted
- Future: Allow members to request email export of their direct chat history before deletion
- Implementation: Admin triggers deletion → System emails each member a PDF/JSON export of their direct chats → Wait 7 days → Delete workspace

**AI Content Edit History:**

- Currently: Admins can edit/save AI content, but only latest version is preserved (no history)
- Future: Keep version history for transparency and undo capability
- Implementation: Store edit history array with timestamps, editor UIDs, and previous versions
- UI: "View History" button shows changelog, "Revert to Version X" option

**Enhanced Enterprise Sales Funnel:**

- Currently: 25-member limit shows link to Twitter DM
- Future: Dedicated enterprise inquiry form with:
  - Team size input
  - Use case description
  - Contact information
  - Custom pricing calculator
  - Auto-email to sales team
  - CRM integration (HubSpot, Salesforce)

**Trial Extensions:**

- Currently: Hard 5-day trial, then AI locks to workspace chats only
- Future: Allow one 3-day extension if user is "close to converting" (e.g., used AI 10+ times)
- Future: Referral bonuses (invite 3 friends, get 1 month free Pro)

**Workspace Capacity Recommendations:**

- Currently: Basic UI guidance during workspace creation
- Future: Smart capacity recommendations based on:
  - User's email domain (fetch company size from Clearbit/LinkedIn)
  - Average group chat size
  - "Most teams your size choose 10-15 members"

**Spam Strike Appeals:**

- Currently: No appeals process, 1-month decay only
- Future: "Request Review" button for users who feel unfairly flagged
- Manual review by support team
- Evidence submission (screenshots, context)

### 12.1 Payment Integration (Stripe)

**Setup:**

1. Install Stripe SDK: `npm install stripe @stripe/stripe-react-native`
2. Create Stripe account, get API keys
3. Set up products:
   - Pro Plan: $3/month recurring
   - Workspace Add-On: $0.50/user/month metered billing

**Implementation:**

```typescript
// Cloud Function: createCheckoutSession
export const createCheckoutSession = functions.https.onCall(async (data, context) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  const session = await stripe.checkout.sessions.create({
    customer: context.auth.uid,
    payment_method_types: ['card'],
    line_items: [{
      price: 'price_pro_monthly', // $3/month
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: 'messageai://payment/success',
    cancel_url: 'messageai://payment/cancel',
  });
  
  return { sessionId: session.id };
});

// Cloud Function: handleWorkspaceBilling (runs monthly)
export const handleWorkspaceBilling = functions.pubsub
  .schedule('0 0 1 * *') // First day of month
  .onRun(async () => {
    const workspaces = await db.collection('workspaces').get();
    
    for (const workspace of workspaces.docs) {
      const data = workspace.data();
      const charge = data.maxUsersThisMonth * 0.50; // $0.50 per user
      
      await stripe.invoiceItems.create({
        customer: data.adminStripeId,
        amount: charge * 100, // Cents
        currency: 'usd',
        description: `Workspace: ${data.name} (${data.maxUsersThisMonth} users)`
      });
      
      // Reset counter for new month
      await workspace.ref.update({ maxUsersThisMonth: data.members.length });
    }
  });
```

**Webhooks:**

- `payment_intent.succeeded` → Set `isPaidUser: true`
- `payment_intent.failed` → Set workspace read-only
- `customer.subscription.deleted` → Cancel subscription, schedule deletion

### 12.2 Workspace Templates

**Concept:** Pre-configured workspaces for common use cases

**Templates:**

- Marketing Team (channels: Campaigns, Content, Analytics)
- Engineering Team (channels: Standup, Code Reviews, Releases)
- Sales Team (channels: Leads, Demos, Deals)

**Implementation:**

- Template selector during workspace creation
- Auto-create group chats based on template
- Add suggested automations (e.g., daily standup reminders)

### 12.3 Workspace Analytics

**Admin Dashboard:**

- Most active members
- Message volume over time
- AI feature usage
- Response time metrics
- Sentiment analysis

### 12.4 Advanced Admin Controls

- **Roles:** Add moderator role (between member and admin)
- **Permissions:** Granular controls (who can create chats, use AI, etc.)
- **Workspace settings:** Custom notification preferences, chat retention policies
- **Audit logs:** Track all admin actions

### 12.5 Mobile App Store Subscriptions

**iOS/Android In-App Purchases:**

- Use platform-native subscription flows
- Apple App Store: 30% cut (consider pricing)
- Google Play Store: 15-30% cut
- Handle subscription management via platforms

### 12.6 Enterprise Tier

**Features:**

- Unlimited workspaces
- SSO (Single Sign-On)
- Custom domain email invitations
- Priority support
- Advanced security (data retention, exports)
- Dedicated account manager

**Pricing:** $15/user/month (annual contract)

---

## 13. Success Metrics

### 13.1 Adoption Metrics

- **Free → Pro conversion rate:** Target 10% in first 3 months
- **Pro → Workspace creation rate:** Target 50% in first month
- **Workspace invitation acceptance rate:** Target 70%
- **Spam report rate:** < 5% of invitations

### 13.2 Engagement Metrics

- **AI feature usage:** 5+ uses per paid user per week
- **Workspace member activity:** 80% active weekly
- **Admin actions (assign/edit):** 3+ per week per admin

### 13.3 Revenue Metrics

- **MRR (Monthly Recurring Revenue):** Track Pro + Workspace subscriptions
- **ARPU (Average Revenue Per User):** Target $8/month (mix of Pro + Workspace)
- **Churn rate:** < 10% monthly

### 13.4 Quality Metrics

- **Workspace deletion rate:** < 5% within first month
- **Spam ban rate:** < 1% of all users
- **Payment failure rate:** < 5%

---

## 14. Open Questions & Decisions

### Decisions Made

✅ **Pricing:** $3/month Pro + $0.50/user/month Workspace  
✅ **AI Access:** Pro users everywhere, free users ONLY in workspace chats (sales funnel)  
✅ **Admin pre-selects workspace capacity** (2-25 members, pays for all seats)  
✅ **Pro-rated billing** for mid-month signups and expansions  
✅ **MVP:** Instant free upgrades (no real payment), 500 user limit on signup  
✅ **One admin per workspace** (no transfer, no co-admins)  
✅ **5 workspace limit per user** (decrements on deletion)  
✅ **25 member limit** per workspace/group (enterprise link: <https://x.com/adam__isom>)  
✅ **Spam strikes: 5** (permanent, global, disables workspace/group creation)  
✅ **Spam reports:** Only at invitation stage (not after joining)  
✅ **Payment lapse:** Read-only → 30-day deletion  
✅ **Direct chat access:** Lost when member leaves/removed/workspace deleted  
✅ **Edit AI content:** No original preservation (single saved version only)  
✅ **My Tasks:** Per-workspace + non-workspace views (Pro users only)  
✅ **Workspace names:** Must be unique per user  
✅ **Workspace notifications:** Push + in-app, deleted after 24h when read  
✅ **Billing cycle:** 1st of month for everyone
✅ **Billing start timing:** Pro-rated from creation date (unless created on 1st)  
✅ **Downgrades:** Take effect next billing cycle (no pro-rated refunds)  
✅ **Direct chat removal:** Hard delete from conversation list (security rules prevent access)  
✅ **Trial limitations:** Cannot create workspaces during trial (Pro subscription required)

### Open Questions

- [ ] Should we offer annual plans (discount)?
- [ ] Should workspace admins see member activity stats?
- [ ] Should we allow workspace name changes?
- [ ] Should we add workspace icons/branding?
- [ ] Should workspace direct chats have separate notification settings?

---

## 15. Risks & Mitigation

### Risk 1: Low Conversion to Paid Tier

**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**

- Offer 14-day free trial
- In-app demos of AI features
- Freemium model shows value before payment
- Referral program (invite 3 friends, get 1 month free)

### Risk 2: Workspace Abuse (Spam)

**Likelihood:** Medium  
**Impact:** Medium  
**Mitigation:**

- 5-strike system (already implemented)
- Rate limiting on invitations (20/day)
- Email verification required
- Manual review for flagged accounts

### Risk 3: Billing Complexity

**Likelihood:** High  
**Impact:** High  
**Mitigation:**

- Metered billing via Stripe
- Clear documentation of billing calculation
- Monthly invoice breakdowns
- Test with pilot users before launch

### Risk 4: Admin Burnout (Managing 25 members)

**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:**

- 25-member limit is manageable
- Add moderator role (future)
- Automation tools (bulk actions)
- Member activity dashboard
- Onboarding guide for admins
- Offer enterprise tier for larger teams

### Risk 5: Feature Complexity Overwhelms Users

**Likelihood:** Medium  
**Impact:** Medium  
**Mitigation:**

- Progressive disclosure (hide advanced features initially)
- Onboarding flow with tooltips
- Help center with videos
- In-app coach marks

---

## 16. Launch Checklist

### Pre-Launch

- [ ] All Phase 1-8 tasks completed
- [ ] Security rules deployed and tested
- [ ] Test users (3 paid, 1 free) configured
- [ ] Billing calculation logic validated
- [ ] E2E tests passing (100% critical paths)
- [ ] Performance benchmarks met (< 2s load time)
- [ ] Analytics tracking verified
- [ ] Error logging configured (Sentry)
- [ ] Documentation updated (README, PRD, architecture)

### Launch Day

- [ ] Feature flag enabled for all users
- [ ] Monitoring dashboard active
- [ ] Support email ready
- [ ] Announcement email/push notification sent
- [ ] Social media posts scheduled
- [ ] Backup plan ready (rollback procedure)

### Post-Launch (Week 1)

- [ ] Monitor error rates
- [ ] Track conversion metrics
- [ ] Collect user feedback
- [ ] Fix critical bugs (P0)
- [ ] Iterate on UX pain points

---

## Appendix A: API Endpoints

### Cloud Functions (New)

```typescript
// Workspace Management
createWorkspace(name: string, memberEmails: string[])
  → { workspaceId, workspace }

deleteWorkspace(workspaceId: string)
  → { success: boolean }

inviteToWorkspace(workspaceId: string, userEmail: string)
  → { invitationId }

respondToInvitation(invitationId: string, response: 'accept' | 'decline' | 'spam')
  → { success: boolean }

removeFromWorkspace(workspaceId: string, userUid: string)
  → { success: boolean }

// Admin Features
assignActionItem(conversationId: string, itemId: string, assigneeUid: string)
  → { success: boolean }

saveEditedSummary(conversationId: string, summary: string, keyPoints: string[])
  → { success: boolean }

saveEditedDecision(conversationId: string, decisionId: string, decision: string, context: string)
  → { success: boolean }

saveEditedActionItems(conversationId: string, items: ActionItem[])
  → { success: boolean }

// Billing
calculateMonthlyBill(workspaceId: string)
  → { charge: number, maxUsers: number, billingPeriod: string }

// Spam Management
incrementSpamStrikes(userUid: string, reason: 'workspace' | 'groupChat')
  → { newStrikeCount: number, banned: boolean }
```

---

## Appendix B: Test Scenarios

### Scenario 1: Happy Path - Create Workspace

1. User upgrades to Pro ($3/month)
2. Creates workspace "Marketing Team"
3. Invites 3 members via email
4. Members receive notifications
5. Members accept invitations
6. Workspace shows 4 members
7. Admin creates group chat "Q1 Planning"
8. All members auto-added to chat
9. Admin uses AI features
10. Members use AI features (free users)

**Expected Result:** ✅ All users can access AI in workspace

### Scenario 2: Admin Assigns Action Item

1. Admin opens "Q1 Planning" chat
2. Taps AI menu → Action Items
3. AI extracts 3 action items
4. Admin taps "Assign" on first item
5. Selects "Alice" from picker
6. Item shows "Assigned to: Alice"
7. Alice receives notification
8. Alice opens app, sees task in "My Tasks"

**Expected Result:** ✅ Assignment persists, syncs across devices

### Scenario 3: Free User Paywall

1. Free user opens personal direct chat
2. Taps AI menu → "Thread Summary"
3. Sees "Upgrade to Pro" modal
4. Cannot access feature

**Expected Result:** ✅ Paywall prevents access

### Scenario 4: Spam Reporting

1. User A invites User B to workspace
2. User B receives invitation
3. User B taps "Report Spam"
4. Confirms report
5. User A's spam strikes: 1
6. User A invites 4 more users (all report spam)
7. User A's spam strikes: 5
8. User A tries to create new workspace → Error
9. User A tries to create group chat → Error

**Expected Result:** ✅ User A banned from workspace/group creation

### Scenario 5: Payment Lapse

1. Admin's payment fails (simulated in MVP with dummy payment service)
2. Workspace becomes read-only immediately
3. Members can view messages
4. Members cannot send messages
5. AI features disabled
6. Admin receives notification
7. Admin updates payment method
8. Payment succeeds
9. Workspace becomes active again
10. Full functionality restored

**Expected Result:** ✅ Workspace read-only when payment fails, restored when payment succeeds (no deletion)

### Scenario 6: Workspace Member Limit

1. Admin creates workspace
2. Adds 24 members (total: 25 with admin)
3. Tries to add 26th member
4. Pop-up appears: "Limit reached. Teams larger than 25 members require our Enterprise plan. [Contact Sales]"
5. Admin clicks [Contact Sales]
6. Opens email client with pre-filled enterprise inquiry

**Expected Result:** ✅ Hard limit enforced, enterprise inquiry initiated

---

**END OF PRD**

---

## Next Steps

1. **Review & Approve:** Developer reviews this PRD, asks clarifying questions
2. **Create Task List:** Break down implementation into detailed tasks
3. **Set Timeline:** Assign estimates, determine sprint cadence
4. **Begin Phase 1:** Start with data model and basic workspace CRUD
5. **Iterate:** Weekly check-ins to adjust based on learnings

**Estimated Total Implementation:** 3-4 weeks (full-time development)
