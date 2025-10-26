# Phase 4 Implementation Review & Test Plan

**Created:** October 26, 2025  
**Purpose:** Identify implementation risks, ambiguities, and critical tests before starting Phase 4

---

## Executive Summary

After thorough review of the Workspaces & Paid Tier PRD, I've identified **12 critical areas requiring attention** before implementation, organized by severity:

### 🔴 Critical Issues (Must Address Before Starting)

1. Workspace storage location inconsistency
2. Trial implementation across Cloud Functions
3. Billing cycle edge cases

### 🟡 Medium Issues (Address Early in Implementation)

4. Workspace direct chat access rules
5. Action item visibility for free users
6. Strike decay implementation complexity
7. Dummy payment service design

### 🟢 Low Issues (Document & Monitor)

8. Performance at scale (50 members, 5 workspaces)
9. Concurrent edit conflicts
10. Rate limiting for workspace operations

---

## Part 1: Critical Issues & Recommendations

### 🔴 Issue #1: Workspace Storage Location Inconsistency

**Problem:**

- PRD Section 3.3 (line 316) states: "Workspaces stored as subcollection under users: `/users/{uid}/workspaces/{workspaceId}`"
- PRD Section 7.1 (line 637) defines: `/workspaces/{workspaceId}` as a top-level collection
- These are contradictory approaches

**Impact:** HIGH - Affects all workspace queries, security rules, and data access patterns

**Recommendation:**
Use **top-level `/workspaces/{workspaceId}` collection** because:

- Easier to query all workspaces a user is member of (not just owner)
- Simpler security rules (one rule instead of per-user subcollection)
- Better for analytics (count total workspaces across all users)
- User document tracks owned workspace IDs anyway (`workspacesOwned` array)

**Action:** Update line 316 in PRD to remove subcollection reference

---

### 🔴 Issue #2: Trial Expiration Checks in Cloud Functions

**Problem:**
All AI Cloud Functions must check trial status, but the PRD doesn't specify implementation details. This adds complexity to every function.

**Current Client-Side Check (line 379-396):**

```typescript
function canAccessAIFeatures(user: User, conversation: Conversation): boolean {
  if (user.isPaidUser) return true;
  if (user.trialEndsAt && Date.now() < user.trialEndsAt.toMillis()) return true;
  if (conversation.workspaceId) return isUserInWorkspace(user.uid, conversation.workspaceId);
  return false;
}
```

**Missing:** Server-side implementation in all 5+ AI Cloud Functions

**Recommendation:**
Create a reusable validation helper:

```typescript
// functions/src/utils/featureGating.ts
export async function validateAIAccess(
  context: CallableContext,
  conversationId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (!context.auth) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  const user = await getUserDoc(context.auth.uid);
  const conversation = await getConversationDoc(conversationId);

  // Check 1: Pro user
  if (user.isPaidUser) {
    return { allowed: true };
  }

  // Check 2: Active trial (5 days)
  if (user.trialEndsAt && Date.now() < user.trialEndsAt.toMillis()) {
    return { allowed: true };
  }

  // Check 3: Free user in workspace chat
  if (conversation.workspaceId) {
    const workspace = await getWorkspaceDoc(conversation.workspaceId);
    if (workspace.members.includes(context.auth.uid)) {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: 'permission-denied' };
}
```

**Action:** Add this helper to Task 2.1 in task list

---

### 🔴 Issue #3: Billing Cycle Edge Cases

**Problem:**
What happens if a user:

1. Creates workspace on Jan 31st (month with 31 days)
2. Next billing cycle is Feb 1st (28 days)
3. Pro-rated calculation assumes 30 days?

**Example:**

- User creates 10-seat workspace on Jan 31st at 11:59 PM
- Billing cycle starts Feb 1st (next day)
- Did they pay for Jan 31st? ($5 × 1/31 days = $0.16?)
- Or does billing start Feb 1st?

**Recommendation:**
**Pro-rated billing starts the day AFTER creation:**

- Create workspace Jan 31st → First charge on Feb 1st (full month)
- Create workspace Jan 15th → Pro-rated charge for Jan 15-31, then full month Feb 1st

**Simplified Formula:**

```typescript
function calculateProRatedCharge(
  seatsAdded: number,
  pricePerSeat: number,
  createdAt: Timestamp
): number {
  const created = createdAt.toDate();
  const firstOfNextMonth = new Date(created.getFullYear(), created.getMonth() + 1, 1);
  
  // If created on 1st of month, no pro-rated charge (wait for next cycle)
  if (created.getDate() === 1) {
    return 0;
  }
  
  const daysRemainingInMonth = Math.ceil(
    (firstOfNextMonth.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysInMonth = new Date(created.getFullYear(), created.getMonth() + 1, 0).getDate();
  
  return seatsAdded * pricePerSeat * (daysRemainingInMonth / daysInMonth);
}
```

**Action:** Add billing calculation tests to Phase 8

---

## Part 2: Medium Priority Issues

### 🟡 Issue #4: Workspace Direct Chat Access After Member Removal

**Scenario:**

1. Alice and Bob are in "Marketing Team" workspace
2. Alice starts direct chat with Bob (workspace-scoped)
3. Admin removes Alice from workspace
4. Can Alice still see/access this direct chat in her conversation list?

**Current PRD (line 318-323):**
> Direct chats tied to workspace (deleted when workspace deleted). Member immediately loses access to ALL workspace direct chats when removed.

**Ambiguity:**

- Does "loses access" mean the chat disappears from their conversation list?
- Or does it remain visible but read-only?
- What if they navigate to the chat via deep link?

**Recommendation:**
**Hard delete approach:**

- On member removal, remove `conversationId` from their `conversations` array (client-side cleanup)
- Security rules prevent read/write access (already specified)
- Chat remains in Firestore for other participants
- UI shows "You no longer have access to this chat" if accessed via cached link

**Test Case:**

1. Create workspace
2. Alice + Bob have direct chat
3. Remove Alice
4. Verify Alice cannot see chat in conversation list
5. Verify Alice cannot access via deep link
6. Verify Bob can still access chat

---

### 🟡 Issue #5: Action Item Visibility for Free Users in Workspaces

**Scenario:**
Free user in workspace opens Action Items modal. According to PRD:

- Free users CAN use AI features in workspace chats (line 404)
- Free users CANNOT assign action items (admin-only feature, line 92)

**Ambiguity:**
When free user opens Action Items modal in workspace chat:

- Do they see the "Assign" button (grayed out with "Upgrade to Pro" tooltip)?
- Or is the button completely hidden?
- Can they see WHO is assigned to each item?

**Recommendation:**
**Show read-only view with clear indicators:**

```
Action Items Modal (Free User in Workspace):
┌────────────────────────────────────────┐
│ Action Items                        [X]│
│                                        │
│ ☑ Review budget                  HIGH │
│   Status: Pending                      │
│   👤 Alice                             │
│   ⚠️ Only admins can assign items      │ ← Info text
│                                        │
│ [Close]                                │
└────────────────────────────────────────┘
```

No "Assign" button shown to non-admins (keeps UI clean).

**Action:** Document in Task 4.2

---

### 🟡 Issue #6: Strike Decay Implementation - Race Conditions

**Problem:**
Spam strikes are cleaned "during spam report submission" and "when user tries to invite someone" (line 531-533). This could cause race conditions:

**Scenario:**

1. User has 4 active strikes
2. Strike #1 is 31 days old (expired)
3. User receives 5th spam report
4. **Sequence matters:**
   - Clean first → 3 active strikes → Add new strike → 4 total (NOT banned)
   - Add first → 5 active strikes → Banned → Clean → Still banned (wrong state)

**Recommendation:**
**Always clean before checking ban status:**

```typescript
async function processSpamReport(reportedUserId: string, reportDetails: object) {
  const userRef = db.doc(`users/${reportedUserId}`);
  
  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const user = userDoc.data();
    
    // Step 1: Filter out expired strikes (older than 30 days)
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const activeReports = user.spamReportsReceived.filter(
      r => r.timestamp.toMillis() > oneMonthAgo
    );
    
    // Step 2: Add new report
    activeReports.push({
      ...reportDetails,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Step 3: Update strike count and ban status
    const activeStrikeCount = activeReports.length;
    const isBanned = activeStrikeCount >= 5;
    
    // Step 4: Write to Firestore
    transaction.update(userRef, {
      spamReportsReceived: activeReports, // Cleaned array
      spamStrikes: activeStrikeCount,
      spamBanned: isBanned
    });
    
    // Step 5: Send notifications if banned or warned
    if (isBanned && !user.spamBanned) {
      await sendBanNotification(reportedUserId);
    } else if (activeStrikeCount === 3 || activeStrikeCount === 4) {
      await sendWarningNotification(reportedUserId, activeStrikeCount);
    }
  });
}
```

**Action:** Add to Task 7.2 implementation notes

---

### 🟡 Issue #7: Dummy Payment Service Design for MVP

**Problem:**
PRD mentions dummy payment service (line 218) but doesn't specify implementation. Need to simulate:

- Pro upgrade ($3/month)
- Workspace creation charges (capacity-based)
- Workspace expansion charges (pro-rated)
- Payment failures (to test read-only state)

**Recommendation:**
Create comprehensive dummy service:

```typescript
// services/dummyPaymentService.ts
export type PaymentResult = {
  success: boolean;
  transactionId?: string;
  error?: string;
};

export class DummyPaymentService {
  // Toggle in Settings screen for testing
  private static SIMULATE_FAILURES = false;
  
  static async chargeProSubscription(userId: string): Promise<PaymentResult> {
    console.log(`[MVP] Dummy charge: Pro subscription $3/month for user ${userId}`);
    
    if (this.SIMULATE_FAILURES && Math.random() < 0.2) {
      return { success: false, error: 'Card declined' };
    }
    
    return {
      success: true,
      transactionId: `txn_pro_${Date.now()}`
    };
  }
  
  static async chargeWorkspaceCreation(
    userId: string,
    seats: number,
    proRatedAmount: number
  ): Promise<PaymentResult> {
    console.log(`[MVP] Dummy charge: Workspace ${seats} seats, $${proRatedAmount.toFixed(2)} pro-rated`);
    
    if (this.SIMULATE_FAILURES && Math.random() < 0.2) {
      return { success: false, error: 'Insufficient funds' };
    }
    
    return {
      success: true,
      transactionId: `txn_ws_create_${Date.now()}`
    };
  }
  
  static async chargeWorkspaceExpansion(
    workspaceId: string,
    additionalSeats: number,
    proRatedAmount: number
  ): Promise<PaymentResult> {
    console.log(`[MVP] Dummy charge: Expand workspace +${additionalSeats} seats, $${proRatedAmount.toFixed(2)}`);
    
    if (this.SIMULATE_FAILURES && Math.random() < 0.2) {
      return { success: false, error: 'Payment method expired' };
    }
    
    return {
      success: true,
      transactionId: `txn_ws_expand_${Date.now()}`
    };
  }
  
  static async chargeMonthlyBilling(
    workspaceId: string,
    seats: number,
    amount: number
  ): Promise<PaymentResult> {
    console.log(`[MVP] Dummy charge: Monthly billing for workspace ${workspaceId}, $${amount.toFixed(2)}`);
    
    if (this.SIMULATE_FAILURES && Math.random() < 0.3) {
      return { success: false, error: 'Billing failed' };
    }
    
    return {
      success: true,
      transactionId: `txn_monthly_${Date.now()}`
    };
  }
  
  static enableFailureSimulation(enabled: boolean) {
    this.SIMULATE_FAILURES = enabled;
  }
}
```

**Settings Screen Addition:**

```
Developer Settings (MVP Only)
├── [Toggle] Simulate Payment Failures
└── [Button] Test Workspace Read-Only State
```

**Action:** Add to Phase 8, Task 8.4

---

## Part 3: Testing Strategy by Phase

### Phase 1: Foundation - Critical Tests

**Unit Tests (High Value):**

1. **Workspace Name Uniqueness Check**

   ```typescript
   describe('createWorkspace', () => {
     it('should reject duplicate workspace names for same user', async () => {
       await createWorkspace(user1, 'Marketing Team', 10);
       await expect(
         createWorkspace(user1, 'Marketing Team', 10)
       ).rejects.toThrow('Choose unique name');
     });
     
     it('should allow duplicate workspace names across different users', async () => {
       await createWorkspace(user1, 'Marketing Team', 10);
       await expect(
         createWorkspace(user2, 'Marketing Team', 10)
       ).resolves.toBeDefined();
     });
   });
   ```

2. **5 Workspace Limit Enforcement**

   ```typescript
   it('should prevent creating 6th workspace', async () => {
     for (let i = 0; i < 5; i++) {
       await createWorkspace(user1, `Workspace ${i}`, 10);
     }
     await expect(
       createWorkspace(user1, 'Workspace 6', 10)
     ).rejects.toThrow('Workspace limit reached');
   });
   ```

3. **500 User Signup Limit**

   ```typescript
   it('should block signup when 500 users exist', async () => {
     // Seed 500 users
     await expect(
       registerUser('user501@test.com', 'password')
     ).rejects.toThrow('max users reached');
   });
   ```

4. **Trial Initialization on Signup**

   ```typescript
   it('should initialize 5-day trial on signup', async () => {
     const user = await registerUser('new@test.com', 'pass');
     expect(user.trialStartedAt).toBeDefined();
     expect(user.trialEndsAt).toBeDefined();
     
     const trialDuration = user.trialEndsAt.toMillis() - user.trialStartedAt.toMillis();
     const fiveDays = 5 * 24 * 60 * 60 * 1000;
     expect(trialDuration).toBeCloseTo(fiveDays, -5); // Within 100k ms
   });
   ```

**Manual Tests (Quick Checks):**

- ✅ Create workspace with name "Test 1"
- ✅ Try to create another workspace with same name → Error shown
- ✅ Create 5 workspaces → 6th creation blocked
- ✅ Sign up new user → Trial timer shows 5 days

---

### Phase 2: AI Feature Gating - Critical Tests

**Unit Tests (High Value):**

1. **Trial Expiration Logic**

   ```typescript
   describe('canAccessAIFeatures', () => {
     it('should allow AI access during active trial', () => {
       const user = {
         isPaidUser: false,
         trialEndsAt: Timestamp.fromMillis(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days left
       };
       expect(canAccessAIFeatures(user, personalChat)).toBe(true);
     });
     
     it('should block AI access after trial expires', () => {
       const user = {
         isPaidUser: false,
         trialEndsAt: Timestamp.fromMillis(Date.now() - 1000) // Expired 1 second ago
       };
       expect(canAccessAIFeatures(user, personalChat)).toBe(false);
     });
     
     it('should allow AI in workspace chats after trial expires', () => {
       const user = {
         isPaidUser: false,
         trialEndsAt: Timestamp.fromMillis(Date.now() - 1000)
       };
       const workspaceChat = { workspaceId: 'ws123' };
       // Assume user is member of ws123
       expect(canAccessAIFeatures(user, workspaceChat)).toBe(true);
     });
   });
   ```

2. **Cloud Function Validation**

   ```typescript
   it('should reject AI request from expired trial user in personal chat', async () => {
     const expiredUser = { trialEndsAt: pastDate, isPaidUser: false };
     await expect(
       generateSummary({ conversationId: 'personal-chat' }, { auth: expiredUser })
     ).rejects.toThrow('permission-denied');
   });
   ```

**Manual Tests (Quick Checks):**

- ✅ New user: Open personal chat → AI works
- ✅ Manually set `trialEndsAt` to past date in Firestore
- ✅ Refresh app → AI blocked in personal chats
- ✅ Join workspace → AI works in workspace chats
- ✅ Upgrade to Pro → AI works everywhere

---

### Phase 3: Workspace Chat Organization - Critical Tests

**Unit Tests (High Value):**

1. **Conversation Filtering**

   ```typescript
   it('should filter conversations by workspace', async () => {
     const personalChats = await getPersonalConversations(user1.uid);
     expect(personalChats.every(c => !c.workspaceId)).toBe(true);
     
     const workspaceChats = await getWorkspaceConversations('ws123');
     expect(workspaceChats.every(c => c.workspaceId === 'ws123')).toBe(true);
   });
   ```

2. **25 Member Limit**

   ```typescript
   it('should prevent adding 26th member to workspace', async () => {
     const workspace = await createWorkspace(admin, 'Test', 25);
     for (let i = 0; i < 24; i++) {
       await addMemberToWorkspace(workspace.id, `user${i}`);
     }
     await expect(
       addMemberToWorkspace(workspace.id, 'user25')
     ).rejects.toThrow('Limit reached');
   });
   ```

**Manual Tests (Quick Checks):**

- ✅ Toggle between Personal / Workspace modes
- ✅ Create workspace → Chats filtered correctly
- ✅ Try to add 26th member → Error modal with enterprise link
- ✅ Click enterprise link → Opens Twitter

---

### Phase 4: Admin Assignment - Critical Tests

**Unit Tests (High Value):**

1. **Admin-Only Assignment**

   ```typescript
   it('should allow admin to assign action items', async () => {
     const actionItem = await extractActionItems(workspaceChat);
     await expect(
       assignActionItem(actionItem.id, memberUid, { auth: { uid: adminUid } })
     ).resolves.toBeDefined();
   });
   
   it('should reject assignment from non-admin', async () => {
     await expect(
       assignActionItem(itemId, memberUid, { auth: { uid: regularMemberUid } })
     ).rejects.toThrow('permission-denied');
   });
   ```

**Manual Tests (Quick Checks):**

- ✅ Admin opens Action Items → "Assign" button visible
- ✅ Member opens Action Items → No "Assign" button
- ✅ Admin assigns item → Member receives notification
- ✅ Check My Tasks view → Assigned item appears

---

### Phase 5: Edit & Save - Critical Tests

**Unit Tests (High Value):**

1. **Save Replaces Original**

   ```typescript
   it('should replace AI-generated summary with edited version', async () => {
     const original = await generateSummary(chatId);
     expect(original.summary).toBe('AI generated text');
     
     await saveEditedSummary(chatId, 'Edited by admin', adminUid);
     
     const updated = await getSummary(chatId);
     expect(updated.summary).toBe('Edited by admin');
     expect(updated.editedByAdmin).toBe(true);
     expect(updated.originalSummary).toBeUndefined(); // Not preserved
   });
   ```

**Manual Tests (Quick Checks):**

- ✅ Admin edits summary → Saves successfully
- ✅ Refresh → Edited version shown (not original)
- ✅ "✏️ Edited by Admin" badge visible
- ✅ Non-admin opens summary → No edit button

---

### Phase 6: My Tasks - Critical Tests

**Unit Tests (High Value):**

1. **Task Filtering by Workspace**

   ```typescript
   it('should show only workspace tasks in workspace My Tasks', async () => {
     const workspaceTasks = await getMyTasks(userId, 'ws123');
     expect(workspaceTasks.every(t => t.workspaceId === 'ws123')).toBe(true);
   });
   
   it('should show only non-workspace tasks in personal My Tasks', async () => {
     const personalTasks = await getMyTasks(userId, null);
     expect(personalTasks.every(t => !t.workspaceId)).toBe(true);
   });
   ```

**Manual Tests (Quick Checks):**

- ✅ Get assigned task in workspace chat
- ✅ Open "My Tasks" in workspace → Task appears
- ✅ Switch to personal mode → Task NOT shown
- ✅ Get assigned task in personal chat → Appears in personal My Tasks

---

### Phase 7: Spam Prevention - Critical Tests

**Unit Tests (High Value):**

1. **Strike Decay (1 Month)**

   ```typescript
   it('should remove strikes older than 30 days', () => {
     const user = {
       spamReportsReceived: [
         { timestamp: Timestamp.fromMillis(Date.now() - 31 * 24 * 60 * 60 * 1000) }, // 31 days old
         { timestamp: Timestamp.fromMillis(Date.now() - 10 * 24 * 60 * 60 * 1000) }, // 10 days old
         { timestamp: Timestamp.fromMillis(Date.now() - 5 * 24 * 60 * 60 * 1000) }   // 5 days old
       ]
     };
     expect(getActiveStrikes(user)).toBe(2); // Only 2 recent strikes
   });
   ```

2. **Ban After 5 Strikes**

   ```typescript
   it('should ban user after 5 active strikes', async () => {
     for (let i = 0; i < 5; i++) {
       await reportSpam(spammerId, `reporter${i}`);
     }
     const user = await getUser(spammerId);
     expect(user.spamBanned).toBe(true);
     
     await expect(
       createWorkspace(spammerId, 'Test', 10)
     ).rejects.toThrow('restricted');
   });
   ```

**Manual Tests (Quick Checks):**

- ✅ Report spam invitation → Strike incremented
- ✅ Report 3 times → Warning notification shown
- ✅ Report 5 times → Ban notification shown
- ✅ Try to create workspace → Blocked
- ✅ Try to create group chat → Blocked
- ✅ Create direct chat → Works (not blocked)

---

### Phase 8: Billing Logic - Critical Tests

**Unit Tests (High Value):**

1. **Pro-Rated Calculations**

   ```typescript
   describe('calculateProRatedCharge', () => {
     it('should calculate mid-month charge correctly', () => {
       const jan15 = new Date('2025-01-15');
       const charge = calculateProRatedCharge(10, 0.50, Timestamp.fromDate(jan15));
       // 15 days remaining in January (31-day month)
       // 10 seats × $0.50 × (17/31) = $2.74
       expect(charge).toBeCloseTo(2.74, 2);
     });
     
     it('should return 0 for creation on 1st of month', () => {
       const feb1 = new Date('2025-02-01');
       const charge = calculateProRatedCharge(10, 0.50, Timestamp.fromDate(feb1));
       expect(charge).toBe(0); // No pro-rated charge, wait for next cycle
     });
   });
   ```

2. **Workspace Downgrade Validation**

   ```typescript
   it('should require removing members before downgrade', async () => {
     const workspace = await createWorkspace(admin, 'Test', 15);
     // Add 15 members
     for (let i = 0; i < 14; i++) {
       await addMember(workspace.id, `user${i}`);
     }
     
     // Try to downgrade to 10 seats without removing members
     await expect(
       updateWorkspaceCapacity(workspace.id, 10)
     ).rejects.toThrow('Remove 5 members first');
   });
   ```

3. **Dummy Payment Service**

   ```typescript
   it('should simulate payment success', async () => {
     DummyPaymentService.enableFailureSimulation(false);
     const result = await DummyPaymentService.chargeProSubscription('user1');
     expect(result.success).toBe(true);
     expect(result.transactionId).toBeDefined();
   });
   
   it('should simulate payment failure when enabled', async () => {
     DummyPaymentService.enableFailureSimulation(true);
     // May fail randomly (20% chance)
     const results = await Promise.all([
       ...Array(20).fill(0).map(() => DummyPaymentService.chargeProSubscription('user1'))
     ]);
     const failures = results.filter(r => !r.success);
     expect(failures.length).toBeGreaterThan(0); // At least some failures
   });
   ```

**Manual Tests (Quick Checks):**

- ✅ Create workspace mid-month → Check console for pro-rated charge
- ✅ Expand capacity → Verify calculation matches formula
- ✅ Enable "Simulate Failures" toggle → Create workspace → Payment fails
- ✅ Workspace becomes read-only → Banner shown
- ✅ Disable toggle → Retry payment → Workspace active again
- ✅ Try downgrade with too many members → Error message shows how many to remove

---

### Phase 9: Polish & Testing - Critical Tests

**E2E Manual Test Scripts:**

**Script 1: Complete Free User Journey**

```
1. Sign up new user (email: test1@example.com)
2. Verify trial badge: "5 days left"
3. Open personal chat
4. Tap ✨ AI menu → "Summarize Thread"
5. ✅ Should work (trial active)
6. Manually expire trial (Firestore: set trialEndsAt to past)
7. Restart app
8. Tap ✨ AI menu → "Summarize Thread"
9. ✅ Should show "Upgrade to Pro" modal
10. Get invited to workspace
11. Accept invitation
12. Open workspace chat
13. Tap ✨ AI menu → "Summarize Thread"
14. ✅ Should work (workspace access)
```

**Script 2: Admin Workflow**

```
1. Upgrade to Pro
2. Create workspace "Marketing Team" (10 seats)
3. Invite 3 members
4. Members accept
5. Create group chat "Q1 Planning"
6. Send 20 messages (mix of users)
7. Admin: Tap ✨ → "Action Items"
8. ✅ AI extracts items
9. Admin: Assign item to Member A
10. ✅ Member A receives notification
11. Member A: Open "My Tasks"
12. ✅ Assigned item appears
13. Admin: Edit summary, save
14. ✅ All members see "✏️ Edited" badge
```

**Script 3: Spam & Strikes**

```
1. User A invites User B to workspace
2. User B: Report as spam
3. ✅ User A receives notification
4. Repeat 2 more times (different reporters)
5. ✅ User A gets "3 strikes" warning
6. Repeat 2 more times
7. ✅ User A banned (5 strikes)
8. User A: Try to create workspace
9. ✅ Blocked with error message
10. Wait 31 days (simulate by changing timestamps)
11. ✅ Strikes expire, User A unbanned
```

---

## Part 4: Alternative Approaches to Consider

### Alternative #1: Workspace Invitations via Email Links

**Current Approach:**

- In-app invitation flow only
- Invitee must have account to receive invitation
- Push notification + in-app notification

**Alternative:**

- Generate invitation link: `messageai.app/invite/workspace123?token=abc`
- Admin sends link via email/SMS
- Invitee clicks link → Signs up/logs in → Auto-joins workspace
- Works for users who don't have app installed yet

**Pros:**

- Better conversion (users don't need app to see invitation)
- Simpler for admins (just share a link)
- Works across channels (email, Slack, SMS)

**Cons:**

- Security risk (link could be shared publicly)
- Need token expiration logic
- Need to prevent same user from joining twice

**Recommendation:** Keep current approach for MVP, add this in Phase 5 (future)

---

### Alternative #2: Workspace Templates

**Current Approach:**

- Admin creates empty workspace
- Manually creates group chats
- Manually invites members

**Alternative:**

- Pre-configured templates:
  - "Marketing Team" → Auto-creates: #campaigns, #content, #analytics
  - "Engineering Team" → Auto-creates: #standup, #releases, #bugs
  - "Sales Team" → Auto-creates: #leads, #demos, #deals

**Pros:**

- Faster onboarding
- Best practices baked in
- Better UX for new admins

**Cons:**

- Extra complexity
- Templates might not fit all teams
- Need UI for template selection

**Recommendation:** Add to Section 12 "Future Enhancements" in PRD

---

### Alternative #3: Graduated Trial (Instead of Hard Cutoff)

**Current Approach:**

- 5-day trial with full Pro access
- After 5 days: AI completely locked in personal chats

**Alternative:**

- 5-day trial with unlimited AI
- After 5 days: 5 AI requests/day in personal chats (freemium)
- Still unlimited in workspace chats

**Pros:**

- Softer conversion funnel
- Users stay engaged after trial
- Can still showcase AI value

**Cons:**

- More complex rate limiting logic
- Risk: users never upgrade (5/day might be enough)

**Recommendation:** Keep hard cutoff for MVP (simpler), test conversion rates, adjust later

---

## Part 5: Ambiguities Requiring Clarification

### Ambiguity #1: Workspace Creation During Trial

**Question:** Can free users (in trial) create workspaces?

**PRD States:**

- Line 86: "Cannot create workspaces (upgrade prompt shown)"
- Line 98: "Can create workspaces (becomes admin)" ← Pro users only

**During trial:**

- User has "full Pro access" (line 205)
- But technically they are `isPaidUser: false`

**Clarification Needed:**

- **Option A:** Trial = temporary Pro → Can create workspaces during trial
- **Option B:** Trial = AI access only → Cannot create workspaces

**Recommendation:** **Option B** - Keep workspace creation as Pro-only feature. Trial gives AI access only. Reasoning: Workspaces have ongoing costs (storage, members), shouldn't allow in trial.

**Action:** Add to PRD line 79: "❌ Cannot create workspaces during trial (Pro subscription required)"

---

### Ambiguity #2: Workspace Deletion - Immediate or Delayed?

**Question:** When admin clicks "Delete Workspace", does deletion happen immediately or after confirmation period?

**PRD States:**

- Line 270-276: Admin deletes workspace → All chats deleted → Members notified
- No mention of grace period or undo

**Scenarios:**

1. Admin accidentally deletes workspace with 100+ messages
2. Members lose access to important conversations
3. No way to undo

**Recommendation:**
Add **7-day soft delete:**

- Delete → Workspace marked `deleted: true`, `deletionScheduledFor: now + 7 days`
- Workspace becomes read-only for all members
- Banner: "This workspace will be permanently deleted in 7 days. [Undo Delete]"
- After 7 days: Cloud Function deletes workspace permanently
- Admin can cancel deletion anytime

**Alternative:** Keep immediate deletion but add scary confirmation:

```
Delete "Marketing Team"?
⚠️ This will permanently delete:
- 5 group chats (347 messages)
- 8 direct chats (156 messages)
- All action items and AI history

This CANNOT be undone.

[Cancel] [Delete Permanently]
```

**Recommendation:** Use immediate deletion with scary confirmation (simpler for MVP)

---

### Ambiguity #3: Pro-Rated Refunds on Downgrade

**Question:** If admin downgrades workspace capacity mid-month, do they get a refund?

**Example:**

- Admin pays $10/month for 20 seats
- On 15th of month, downgrades to 10 seats
- Do they get $2.50 refund for remaining half month?

**PRD States:**

- Line 158: "Admin wants to downgrade to 8 seats → Must first remove members"
- No mention of refunds

**Recommendation:**
**No refunds on downgrade:**

- Downgrade takes effect NEXT billing cycle (1st of next month)
- Admin pays full amount for current month
- Next month: Charged for new lower capacity
- Simpler implementation (no refund logic)
- Aligns with industry standard (AWS, Stripe, Heroku do this)

**Action:** Add to PRD Section 2.2: "Downgrades take effect next billing cycle. No pro-rated refunds."

---

## Part 6: Performance Considerations

### Concern #1: Firestore Queries with 50 Members

**Scenario:**

- Workspace with 50 members (requires enterprise plan)
- Each member has 10 conversations
- Query: Get all conversations for workspace

**Potential Issue:**

- 500 documents to query
- Firestore `in` clause limited to 10 values
- Need batched queries

**Recommendation:**
Add pagination early:

```typescript
async function getWorkspaceConversations(
  workspaceId: string,
  limit: number = 20,
  startAfter?: DocumentSnapshot
) {
  let query = db.collection('conversations')
    .where('workspaceId', '==', workspaceId)
    .orderBy('lastMessageAt', 'desc')
    .limit(limit);
  
  if (startAfter) {
    query = query.startAfter(startAfter);
  }
  
  return await query.get();
}
```

**Action:** Already planned for Phase 3, just ensure it's tested

---

### Concern #2: Spam Strike Check on Every Invite

**Scenario:**

- Admin invites 20 people to workspace
- Each invitation checks spam strikes
- 20 Firestore reads

**Optimization:**
Cache user document during invitation batch:

```typescript
async function inviteMultipleMembers(workspaceId: string, emails: string[]) {
  const adminUid = getAdminUid();
  const adminDoc = await db.doc(`users/${adminUid}`).get();
  const activeStrikes = getActiveStrikes(adminDoc.data());
  
  if (activeStrikes >= 5) {
    throw new Error('Account restricted');
  }
  
  // Now send all invitations (strike check done once)
  const batch = db.batch();
  emails.forEach(email => {
    batch.create(db.collection('workspace_invitations').doc(), {
      workspaceId,
      invitedUserEmail: email,
      // ...
    });
  });
  await batch.commit();
}
```

---

## Part 7: Summary & Next Steps

### ✅ Ready to Proceed After Addressing

1. **Fix workspace storage location inconsistency** (PRD line 316)
2. **Add `validateAIAccess()` helper** to Task 2.1
3. **Clarify billing cycle edge cases** with code example in Task 8.1
4. **Document action item visibility** for free users in Task 4.2
5. **Add strike decay transaction logic** to Task 7.2
6. **Create dummy payment service** in Task 8.4
7. **Clarify trial workspace creation** rule (add to PRD)
8. **Document downgrade = next cycle** (add to PRD Section 2.2)

### 📋 Testing Approach

- **Unit tests:** After each phase implementation (before check-in)
- **Manual tests:** Quick smoke tests after each phase
- **E2E tests:** Phase 9 only (comprehensive scripts)
- **Test files:** Co-locate with implementation (e.g., `workspaceService.test.ts`)

### 🎯 Estimated Test Coverage

- **Phase 1-2:** ~15 unit tests
- **Phase 3-5:** ~20 unit tests
- **Phase 6-7:** ~10 unit tests
- **Phase 8:** ~12 unit tests (billing logic heavy)
- **Phase 9:** 3 E2E manual scripts
- **Total:** ~57 unit tests + 3 E2E scripts

### 🚀 Ready to Start?

Once the 8 clarifications above are addressed (either by updating PRD or confirming decisions), we're ready to:

1. Check out new branch `PaidTier`
2. Begin Phase 1 implementation
3. Check in after each phase with test results

---

**END OF IMPLEMENTATION REVIEW**
