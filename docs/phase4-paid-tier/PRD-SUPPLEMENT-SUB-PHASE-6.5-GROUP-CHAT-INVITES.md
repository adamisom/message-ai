# Sub-Phase 6.5: Group Chat Member Management & Invitations

**Status:** ✅ Complete  
**Priority:** High (Blocker for Sub-Phase 8 Spam Prevention)  
**Duration:** 3 days (Phases A-C)  
**Dependencies:** Sub-Phases 1-6 Complete

---

## Implementation Summary

**Phase A (Instant Add):** ✅ Implemented & Committed  
**Phase B (Invitation System):** ✅ Implemented & Committed  
**Phase C (DM Spam Reporting):** ✅ Implemented & Committed

### Key Implementation Details

**Dual Ban Logic:**
- **24-hour temporary ban:** Triggered by 2 spam reports within any 24-hour window
- **Indefinite ban:** Triggered by 5 total spam reports within any 30-day window
- Both bans prevent workspace creation, group chat creation, and sending direct messages
- Temporary ban ends 24 hours after the second strike timestamp
- Indefinite ban persists until old strikes decay (30-day rolling window)
- If both conditions are met, user receives both ban types with appropriate notifications

**Spam Report Abuse:**
- No spam report abuse prevention implemented (per user decision)
- Users can report spam freely without throttling or validation

**Spam Appeal:**
- No appeal mechanism implemented (per user decision)

**User Blocking:**
- `blockedUsers` array added to user documents
- Blocked users cannot send direct messages to the blocker
- Blocking does NOT affect group chats or workspaces
- No unblocking functionality (permanent)
- Implemented via client-side check + Firestore security rules (no Cloud Function trigger needed)

**Conversation Hiding:**
- `hiddenConversations` array added to user documents
- Conversations are hidden from the list when marked as spam
- Applies to direct messages, group chats, and workspaces

**Test Script:**
- Built as part of Sub-Phase 6.5 for testing spam strike logic (dual ban validation)

---

## Overview

This sub-phase adds member management to group chats and implements an invitation system similar to workspace invitations. It consists of three sequential phases:

**Phase A:** Add member functionality (instant add by email)  
**Phase B:** Convert to invitation system (accept/decline flow)  
**Phase C:** Direct message spam reporting

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Phase A: Instant Add Members](#phase-a-instant-add-members)
3. [Phase B: Invitation System](#phase-b-invitation-system)
4. [Phase C: Direct Message Spam Reporting](#phase-c-direct-message-spam-reporting)
5. [Testing Strategy](#testing-strategy)
6. [Implementation Checklist](#implementation-checklist)

---

## Current State Analysis

### What Works Today

✅ Group chat creation (creator adds initial members)  
✅ Workspace group chats (admins can add any workspace member)  
✅ Direct messages (anyone can start with anyone, no invite needed)  
✅ Workspace invitation system (accept/decline/spam reporting)  
✅ Spam strike tracking with 1-month decay  
✅ Ban enforcement for 5+ strikes

### What's Missing

❌ Adding members to existing group chats (non-workspace)  
❌ Invitation system for group chat adds (outside workspaces)  
❌ Spam reporting for direct messages  
❌ Unified spam threshold (currently only workspace invitations tracked)

### Key Constraint

**Workspace group chats:** Any member can add other workspace members directly (NO invitation needed)  
**Non-workspace group chats:** Need invitation system (this sub-phase)

---

## Phase A: Instant Add Members

**Goal:** Allow group chat members to add others by email (instant add, no invitation)  
**Duration:** 1 day  
**Manual Testing:** Required before commit

### A.1 UI Changes

#### Group Chat Member List Screen

**Current State:**
```
┌─────────────────────────────────────┐
│  Members (5)                        │
│                                     │
│  👤 Alice Johnson (You)             │
│  👤 Bob Smith                       │
│  👤 Charlie Davis                   │
│  👤 Diana Prince                    │
│  👤 Eve Martinez                    │
│                                     │
│  [Leave Group]                      │
└─────────────────────────────────────┘
```

**New State:**
```
┌─────────────────────────────────────┐
│  Members (5)                        │
│                                     │
│  👤 Alice Johnson (You)             │
│  👤 Bob Smith                       │
│  👤 Charlie Davis                   │
│  👤 Diana Prince                    │
│  👤 Eve Martinez                    │
│                                     │
│  [+ Add Member]                     │ ← NEW
│  [Leave Group]                      │
└─────────────────────────────────────┘
```

#### Add Member Modal

```
┌─────────────────────────────────────┐
│  Add Member                      [X]│
│                                     │
│  Enter email address:               │
│  [____________________________]     │
│                                     │
│  (Later: phone number option)       │
│                                     │
│  [Cancel]  [Add]                    │
└─────────────────────────────────────┘
```

**Validation:**
- Email format validation
- Check if user exists in system
- Check if already in group chat
- Check 25-member limit
- Check if current user has permission (any member can add)

### A.2 Client-Side Implementation

**File:** `app/(tabs)/chat/[id]/members.tsx` (or new file if doesn't exist)

**Key Functions:**

```typescript
// Add member button handler
const handleAddMember = () => {
  setShowAddMemberModal(true);
};

// Add member form submission
const handleAddMemberSubmit = async (email: string) => {
  try {
    // Validate email format
    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    // Call Cloud Function
    const result = await addMemberToGroupChat({
      conversationId: conversation.id,
      memberEmail: email.toLowerCase().trim()
    });
    
    // Success feedback
    Alert.alert('Success', `${result.displayName} added to group`);
    setShowAddMemberModal(false);
  } catch (error) {
    Alert.alert('Error', errorTranslator(error));
  }
};
```

**Validation Rules:**
- Must be authenticated
- Must be member of the conversation
- Email must exist in system
- User not already in conversation
- Conversation must be group type (not direct)
- Conversation must not be workspace chat (workspace chats use different flow)
- Must not exceed 25 member limit

### A.3 Cloud Function: `addMemberToGroupChat`

**File:** `functions/src/groupChats/addMemberToGroupChat.ts`

```typescript
export const addMemberToGroupChat = functions.https.onCall(
  async (data: { conversationId: string; memberEmail: string }, context) => {
    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { conversationId, memberEmail } = data;
    const addedByUid = context.auth.uid;

    // 2. Get conversation
    const conversationRef = db.collection('conversations').doc(conversationId);
    const conversationSnap = await conversationRef.get();
    
    if (!conversationSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Conversation not found');
    }

    const conversation = conversationSnap.data()!;

    // 3. Validate conversation type
    if (conversation.type !== 'group') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Can only add members to group chats'
      );
    }

    // 4. Check if workspace chat (use different flow)
    if (conversation.workspaceId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Use workspace member management for workspace chats'
      );
    }

    // 5. Verify caller is member
    if (!conversation.participants.includes(addedByUid)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You must be a member to add others'
      );
    }

    // 6. Find user by email
    const userSnapshot = await db
      .collection('users')
      .where('email', '==', memberEmail.toLowerCase())
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'No user found with that email address'
      );
    }

    const newMemberDoc = userSnapshot.docs[0];
    const newMemberUid = newMemberDoc.id;
    const newMemberData = newMemberDoc.data();

    // 7. Check if already member
    if (conversation.participants.includes(newMemberUid)) {
      throw new functions.https.HttpsError(
        'already-exists',
        `${newMemberData.displayName} is already in this group`
      );
    }

    // 8. Check 25-member limit
    if (conversation.participants.length >= 25) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Group chat limit: 25 members max. For enterprise teams, inquire at https://x.com/adam__isom'
      );
    }

    // 9. Add member to conversation
    await conversationRef.update({
      participants: admin.firestore.FieldValue.arrayUnion(newMemberUid),
      [`participantDetails.${newMemberUid}`]: {
        displayName: newMemberData.displayName,
        email: newMemberData.email
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 10. Send system message
    await db.collection(`conversations/${conversationId}/messages`).add({
      text: `${newMemberData.displayName} was added to the group`,
      senderId: 'system',
      senderName: 'System',
      participants: [...conversation.participants, newMemberUid],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isSystemMessage: true
    });

    // 11. Send notification to new member
    // TODO: Push notification implementation

    return {
      success: true,
      displayName: newMemberData.displayName,
      uid: newMemberUid
    };
  }
);
```

### A.4 Security Rules Update

**File:** `firestore.rules`

No changes needed - existing rules allow conversation participants to update the conversation.

### A.5 Testing Checklist (Phase A)

**Manual Testing Required Before Commit:**

- [ ] Add member by email (valid user)
- [ ] Try to add non-existent email (should fail)
- [ ] Try to add member already in group (should fail)
- [ ] Try to add 26th member (should fail with enterprise message)
- [ ] Try to add member as non-member (should fail)
- [ ] Verify new member sees conversation in their list
- [ ] Verify new member can send/receive messages
- [ ] Verify system message appears for all members
- [ ] Verify participantDetails updated correctly
- [ ] Try to add member to direct chat (should fail)
- [ ] Try to add member to workspace chat (should fail, use workspace flow)

---

## Phase B: Invitation System

**Goal:** Convert instant add to invitation flow (accept/decline/spam)  
**Duration:** 2 days  
**Manual Testing:** Required before commit

### B.1 Data Model

#### New Collection: `/group_chat_invitations/{invitationId}`

```typescript
{
  conversationId: string,           // Group chat ID
  conversationName: string,         // Group chat name
  invitedByUid: string,             // Who sent the invite
  invitedByDisplayName: string,
  invitedUserUid: string,           // Who is being invited
  invitedUserEmail: string,
  status: 'pending' | 'accepted' | 'declined' | 'spam',
  sentAt: Timestamp,
  respondedAt?: Timestamp
}
```

**Indexes Required:**

```json
{
  "collectionGroup": "group_chat_invitations",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "invitedUserUid", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "sentAt", "order": "DESCENDING" }
  ]
}
```

### B.2 Modified Add Member Flow

**Step 1:** User clicks "Add Member" → enters email → clicks "Add"

**Step 2:** Cloud Function creates invitation (does NOT add to conversation yet)

**Step 3:** Invited user receives:
- Push notification: "Alice invited you to 'Weekend Plans' group chat"
- In-app notification badge (same as workspace invitations)

**Step 4:** Invited user opens invitations screen, sees:
```
┌─────────────────────────────────────┐
│  Group Chat Invitations             │
│                                     │
│  💬 Weekend Plans                   │
│  Invited by: Alice Johnson          │
│  "Join us for planning!"            │
│  5 members                          │
│                                     │
│  [Accept]  [Decline]  [Report Spam] │
└─────────────────────────────────────┘
```

**Step 5:** User responds:
- **Accept:** Added to group, invitation deleted
- **Decline:** Invitation deleted, no further action
- **Report Spam:** Inviter gets +1 spam strike, invitation deleted

### B.3 Cloud Functions

#### `inviteToGroupChat` (replaces `addMemberToGroupChat`)

Similar to Phase A function, but:
- Creates invitation document instead of adding directly
- Sends notification to invitee
- Returns invitation ID

#### `acceptGroupChatInvitation`

```typescript
export const acceptGroupChatInvitation = functions.https.onCall(
  async (data: { invitationId: string }, context) => {
    // 1. Auth check
    // 2. Get invitation
    // 3. Verify status is 'pending'
    // 4. Verify invitedUserUid matches caller
    // 5. Get conversation
    // 6. Check 25-member limit (could have changed since invite sent)
    // 7. Add user to conversation.participants
    // 8. Update participantDetails
    // 9. Send system message
    // 10. Update invitation status to 'accepted'
    // 11. Return success
  }
);
```

#### `declineGroupChatInvitation`

```typescript
export const declineGroupChatInvitation = functions.https.onCall(
  async (data: { invitationId: string }, context) => {
    // 1. Auth check
    // 2. Get invitation
    // 3. Verify invitedUserUid matches caller
    // 4. Update invitation status to 'declined'
    // 5. Return success
  }
);
```

#### `reportGroupChatInvitationSpam`

```typescript
export const reportGroupChatInvitationSpam = functions.https.onCall(
  async (data: { invitationId: string }, context) => {
    // 1. Auth check
    // 2. Get invitation
    // 3. Verify invitedUserUid matches caller
    // 4. Get inviter's user document
    // 5. Check for existing strike from this reporter (prevent duplicates)
    // 6. Add to spamReportsReceived array
    // 7. Calculate active strikes (filter by 1-month decay)
    // 8. Update spamStrikes count
    // 9. If strikes >= 5: set spamBanned = true
    // 10. Update invitation status to 'spam'
    // 11. Send notification to inviter (if now at 3, 4, or 5 strikes)
    // 12. Return new strike count
  }
);
```

### B.4 UI Updates

#### Invitations Screen (Shared with Workspace Invitations)

**File:** `app/workspace/invitations.tsx` → Rename to `app/(tabs)/invitations.tsx`

**Combine workspace and group chat invitations:**

```typescript
// Query both collections
const workspaceInvitations = await getWorkspaceInvitations(currentUser.uid);
const groupChatInvitations = await getGroupChatInvitations(currentUser.uid);

// Combine and sort by sentAt
const allInvitations = [
  ...workspaceInvitations.map(inv => ({ ...inv, type: 'workspace' })),
  ...groupChatInvitations.map(inv => ({ ...inv, type: 'groupChat' }))
].sort((a, b) => b.sentAt.toMillis() - a.sentAt.toMillis());
```

**Display:**
```
┌─────────────────────────────────────┐
│  Invitations (2)                    │
│                                     │
│  👥 Marketing Team (Workspace)      │
│  Invited by: Alice Johnson          │
│  [Accept]  [Decline]  [Report Spam] │
│                                     │
│  ────────────────────────────────── │
│                                     │
│  💬 Weekend Plans (Group Chat)      │
│  Invited by: Bob Smith              │
│  [Accept]  [Decline]  [Report Spam] │
└─────────────────────────────────────┘
```

#### Badge Count Update

**Location:** Profile button (top-right)

**Logic:**
```typescript
const totalInvitations = workspaceInvitations.length + groupChatInvitations.length;
// Display as badge on profile button (same as current workspace implementation)
```

### B.5 Security Rules

**File:** `firestore.rules`

```javascript
// Group chat invitations
match /group_chat_invitations/{invitationId} {
  allow read: if isAuthenticated() && 
                 (isUser(resource.data.invitedUserUid) || 
                  isUser(resource.data.invitedByUid));
  allow create: if isAuthenticated();
  allow update: if isUser(resource.data.invitedUserUid); // Accept/decline/spam
  allow delete: if isUser(resource.data.invitedUserUid) || 
                   isUser(resource.data.invitedByUid);
}
```

### B.6 Testing Checklist (Phase B)

**Manual Testing Required Before Commit:**

- [ ] Send group chat invitation by email
- [ ] Invitee receives notification
- [ ] Invitee sees invitation in invitations screen
- [ ] Accept invitation → added to group
- [ ] Decline invitation → not added, invitation deleted
- [ ] Report spam → inviter gets +1 strike
- [ ] Report spam 5 times → inviter banned from creating groups
- [ ] Banned user tries to invite to group → blocked
- [ ] Try to accept invitation after group reaches 25 members → graceful error
- [ ] Verify badge count shows workspace + group chat invitations
- [ ] Verify spam strikes decay after 1 month
- [ ] Verify spam reporting prevents duplicate strikes from same user

---

## Phase C: Direct Message Spam Reporting

**Goal:** Add spam reporting for direct messages (5 reports/month threshold)  
**Duration:** 1 day  
**Manual Testing:** Required before commit

### C.1 Rationale

**Why Direct Message Spam Reporting:**
- Users can start direct messages with anyone (no invitation needed)
- Some users may abuse this to send unsolicited messages
- Spam reporting provides recourse for recipients

**Key Difference from Invitations:**
- No invitation stage (messages sent immediately)
- Reporting happens AFTER receiving unwanted messages
- Same threshold: 5 total strikes (across all spam types)

**Ban Duration:**
- **24 hours** (not permanent)
- Automatic un-ban when strikes decay below 5
- User can use the app normally after 24 hours

### C.2 UI Changes

#### Message Context Menu

**Long-press on message bubble in direct chat:**

```
┌─────────────────────────────────────┐
│  [Copy Text]                        │
│  [Reply]                            │
│  [Report Spam] ← NEW (direct only)  │
└─────────────────────────────────────┘
```

**Confirmation Dialog:**
```
┌─────────────────────────────────────┐
│  Report Spam?                       │
│                                     │
│  This will report all messages from │
│  [User Name] as spam and block      │
│  future messages.                   │
│                                     │
│  [Cancel]  [Report]                 │
└─────────────────────────────────────┘
```

**After Reporting:**
- User blocked from sending you direct messages
- Spam strike added to their account
- Conversation hidden from your list (soft delete)

### C.3 Data Model Changes

#### Extended Spam Tracking

**File:** `/users/{uid}`

```typescript
{
  // Existing spam fields...
  spamStrikes: number,
  spamBanned: boolean,
  spamReportsReceived: Array<{
    reportedBy: string,
    reason: 'workspace' | 'groupChat' | 'directMessage', // ← Add 'directMessage'
    timestamp: Timestamp,
    workspaceId?: string,
    conversationId?: string
  }>,
  
  // NEW: Track direct message reports per month
  directMessageSpamReports: {
    [month: string]: number  // e.g., "2025-10": 3
  }
}
```

**Why Separate Tracking:**
- Direct message spam has different threshold (5/month)
- Workspace/group chat invitations use cumulative strikes (5 total, 1-month decay)
- Need to differentiate between spam types

### C.4 Cloud Function: `reportDirectMessageSpam`

```typescript
export const reportDirectMessageSpam = functions.https.onCall(
  async (data: { conversationId: string, reportedUserUid: string }, context) => {
    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const reporterUid = context.auth.uid;
    const { conversationId, reportedUserUid } = data;

    // 2. Verify conversation is direct message
    const conversationRef = db.collection('conversations').doc(conversationId);
    const conversationSnap = await conversationRef.get();
    
    if (!conversationSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Conversation not found');
    }

    const conversation = conversationSnap.data()!;

    if (conversation.type !== 'direct') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Can only report spam in direct messages'
      );
    }

    // 3. Verify both users are participants
    if (!conversation.participants.includes(reporterUid) ||
        !conversation.participants.includes(reportedUserUid)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Both users must be participants'
      );
    }

    // 4. Get current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 5. Get reported user's document
    const reportedUserRef = db.collection('users').doc(reportedUserUid);
    const reportedUserSnap = await reportedUserRef.get();
    
    if (!reportedUserSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Reported user not found');
    }

    const reportedUserData = reportedUserSnap.data()!;

    // 6. Check for duplicate report (same reporter, same user, this month)
    const existingReports = reportedUserData.spamReportsReceived || [];
    const duplicateReport = existingReports.find(
      (report: any) =>
        report.reportedBy === reporterUid &&
        report.reason === 'directMessage' &&
        report.conversationId === conversationId
    );

    if (duplicateReport) {
      throw new functions.https.HttpsError(
        'already-exists',
        'You have already reported this user'
      );
    }

    // 7. Add to spamReportsReceived array
    const newReport = {
      reportedBy: reporterUid,
      reason: 'directMessage',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      conversationId
    };

    await reportedUserRef.update({
      spamReportsReceived: admin.firestore.FieldValue.arrayUnion(newReport)
    });

    // 8. Update direct message spam count for current month
    const directMessageSpamReports = reportedUserData.directMessageSpamReports || {};
    const currentMonthCount = (directMessageSpamReports[currentMonth] || 0) + 1;

    await reportedUserRef.update({
      [`directMessageSpamReports.${currentMonth}`]: currentMonthCount
    });

    // 9. Check if threshold exceeded (5 reports this month)
    if (currentMonthCount >= 5) {
      // Set spam banned (blocks workspace/group creation)
      await reportedUserRef.update({
        spamBanned: true
      });

      // Send notification to reported user
      // TODO: Push notification implementation
    }

    // 10. Calculate total active strikes (all types, 1-month decay)
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const activeStrikes = existingReports.filter(
      (report: any) => report.timestamp && report.timestamp.toMillis() > oneMonthAgo
    ).length + 1; // +1 for this new report

    await reportedUserRef.update({
      spamStrikes: activeStrikes
    });

    // 11. Block reported user from sending messages to reporter
    // Add to reporter's blocked users list
    const reporterRef = db.collection('users').doc(reporterUid);
    await reporterRef.update({
      blockedUsers: admin.firestore.FieldValue.arrayUnion(reportedUserUid)
    });

    return {
      success: true,
      newMonthlyCount: currentMonthCount,
      totalActiveStrikes: activeStrikes,
      banned: currentMonthCount >= 5
    };
  }
);
```

### C.5 Block User Implementation

**New Field:** `blockedUsers: string[]` in `/users/{uid}`

**Security Rules Update:**

```javascript
// Messages: cannot send to users who blocked you
match /conversations/{conversationId}/messages/{messageId} {
  allow create: if request.auth != null && 
                   request.auth.uid in request.resource.data.participants &&
                   !isBlockedByAnyParticipant(request.resource.data.participants, request.auth.uid);
}

function isBlockedByAnyParticipant(participants, senderId) {
  // Check if any participant has blocked the sender
  // This requires a get() per participant - costly but necessary for security
  // Alternative: implement in Cloud Function trigger
}
```

**Better Approach:** Use Cloud Function trigger to prevent blocked users from sending messages.

### C.6 Testing Checklist (Phase C)

**Manual Testing Required Before Commit:**

- [ ] Long-press message in direct chat → see "Report Spam" option
- [ ] Report spam → confirmation dialog appears
- [ ] Confirm report → spam strike added
- [ ] Report same user 5 times in one month → user banned
- [ ] Banned user tries to create workspace → blocked
- [ ] Reported user blocked from sending you messages
- [ ] Conversation hidden from your list after reporting
- [ ] Verify spam reports tracked per month (not cumulative)
- [ ] Verify monthly count resets on new month
- [ ] Verify cannot report same user multiple times
- [ ] Verify "Report Spam" only shows in direct chats (not group)

---

## Testing Strategy

### Unit Tests

**File:** `functions/src/__tests__/groupChatInvitations.test.ts`

Test cases:
- Invite user by email (success)
- Invite non-existent user (fail)
- Invite user already in group (fail)
- Invite when at 25-member limit (fail)
- Accept invitation (success)
- Decline invitation (success)
- Report spam on invitation (strike incremented)
- Report spam 5 times (user banned)
- Spam strike decay after 1 month
- Direct message spam reporting (5/month threshold)

### Integration Tests

**Manual Testing Script:**

```bash
# Phase A: Instant Add
node scripts/testGroupChatAdd.js adam1@test.com bob1@test.com chatId123

# Phase B: Invitations
node scripts/testGroupChatInvite.js adam1@test.com bob1@test.com chatId456

# Phase C: Direct Message Spam
node scripts/testDirectMessageSpam.js adam1@test.com spammer@test.com
```

### Manual Testing Guide

**Phase A (before commit):**
1. Create group chat with Adam1, Bob1
2. Adam1 adds Charlie1 by email → verify instant add
3. Verify all members see system message
4. Try to add 26th member → verify error
5. Try to add existing member → verify error

**Phase B (before commit):**
1. Adam1 invites Bob1 to group → verify invitation created
2. Bob1 sees invitation in invitations screen
3. Bob1 accepts → verify added to group
4. Adam1 invites Charlie1 → Charlie1 declines → verify not added
5. Adam1 invites 5 users → all report spam → verify Adam1 banned

**Phase C (before commit):**
1. Spammer sends direct message to Adam1
2. Adam1 long-presses message → reports spam
3. Verify spammer's strike count incremented
4. Repeat 5 times → verify spammer banned
5. Verify spammer blocked from messaging Adam1

---

## Implementation Checklist

### Phase A: Instant Add Members (1 day)

- [ ] **UI Changes**
  - [ ] Add "Add Member" button to group chat member list
  - [ ] Create "Add Member" modal with email input
  - [ ] Add validation for email format
  - [ ] Add loading states and error handling

- [ ] **Cloud Function**
  - [ ] Create `addMemberToGroupChat` function
  - [ ] Implement all validation checks
  - [ ] Add member to conversation.participants
  - [ ] Update participantDetails
  - [ ] Send system message
  - [ ] Handle errors gracefully

- [ ] **Testing**
  - [ ] Manual testing checklist (Phase A)
  - [ ] Verify all edge cases

- [ ] **Commit Phase A** (after manual testing passes)

---

### Phase B: Invitation System (2 days)

- [ ] **Data Model**
  - [ ] Create `/group_chat_invitations` collection schema
  - [ ] Add Firestore indexes
  - [ ] Update TypeScript types

- [ ] **Cloud Functions**
  - [ ] Create `inviteToGroupChat` function
  - [ ] Create `acceptGroupChatInvitation` function
  - [ ] Create `declineGroupChatInvitation` function
  - [ ] Create `reportGroupChatInvitationSpam` function
  - [ ] Reuse spam strike logic from workspace invitations

- [ ] **UI Changes**
  - [ ] Rename invitations screen to support both types
  - [ ] Combine workspace + group chat invitations in one view
  - [ ] Update badge count to include both types
  - [ ] Add Accept/Decline/Report Spam buttons for group invitations
  - [ ] Add confirmation dialogs

- [ ] **Security Rules**
  - [ ] Add rules for `/group_chat_invitations` collection

- [ ] **Testing**
  - [ ] Manual testing checklist (Phase B)
  - [ ] Verify spam reporting works
  - [ ] Verify spam strikes tracked correctly
  - [ ] Verify ban enforcement

- [ ] **Commit Phase B** (after manual testing passes)

---

### Phase C: Direct Message Spam Reporting (1 day)

- [ ] **Data Model**
  - [ ] Add `directMessageSpamReports` field to user documents
  - [ ] Add `blockedUsers` field to user documents
  - [ ] Update spam report tracking to include 'directMessage' reason

- [ ] **Cloud Function**
  - [ ] Create `reportDirectMessageSpam` function
  - [ ] Implement 5/month threshold
  - [ ] Implement user blocking
  - [ ] Handle duplicate reports

- [ ] **UI Changes**
  - [ ] Add "Report Spam" to message context menu (direct chats only)
  - [ ] Add confirmation dialog
  - [ ] Hide conversation after reporting
  - [ ] Show feedback message

- [ ] **Security Rules**
  - [ ] Block users from messaging users who blocked them

- [ ] **Testing**
  - [ ] Manual testing checklist (Phase C)
  - [ ] Verify monthly threshold
  - [ ] Verify blocking works

- [ ] **Commit Phase C** (after manual testing passes)

---

## Success Criteria

### Phase A Complete When:
✅ Any group member can add others by email  
✅ New members instantly added to conversation  
✅ 25-member limit enforced  
✅ System message sent on add  
✅ All manual tests pass

### Phase B Complete When:
✅ Group chat adds require invitation acceptance  
✅ Invitations appear in unified invitations screen  
✅ Accept/decline/spam reporting works  
✅ Spam strikes tracked and enforced  
✅ Banned users blocked from inviting  
✅ All manual tests pass

### Phase C Complete When:
✅ Direct message spam reporting available  
✅ 5 reports/month threshold enforced  
✅ Reported users blocked from messaging reporter  
✅ Spam strikes contribute to overall ban status  
✅ All manual tests pass

---

## Notes

### Spam Strike Logic (Unified)

**All spam types contribute to spam strikes:**
- Workspace invitation spam: +1 strike (30-day decay)
- Group chat invitation spam: +1 strike (30-day decay)
- Direct message spam: +1 strike (30-day decay)

**Dual Ban System:**

1. **24-hour Temporary Ban:**
   - Triggered by: 2+ strikes within any 24-hour window
   - Bans user from: Sending direct messages, creating group chats, creating workspaces
   - Duration: 24 hours from the timestamp of the second strike
   - Notification: "You've been temporarily banned for 24 hours due to spam reports"

2. **Indefinite Ban:**
   - Triggered by: 5+ total strikes within any 30-day rolling window
   - Bans user from: Creating workspaces, creating group chats, sending direct messages
   - Duration: Until enough strikes decay that total drops below 5
   - Notification: "You've been banned indefinitely due to repeated spam reports"

**Both bans can be active simultaneously:**
- If a user gets 5 strikes total AND has 2 strikes in 24h, both bans apply
- Notifications differentiate between the two ban types
- Temporary ban ends after 24h, but indefinite ban may still be active

**No spam report abuse prevention:**
- Per user decision, no throttling or validation on spam reports
- Users can report as many times as they want

### Future Enhancements

**Phase D (Future):**
- Phone number support for invitations
- Invitation expiry (7 days)
- Invitation message customization
- Bulk invitations
- Invitation link sharing

### Dependencies

**Blocked by:** None (Sub-Phases 1-6 complete)  
**Blocks:** Sub-Phase 8 (Spam Prevention extensions)

---

**END OF SUB-PHASE 6.5 PLAN**

