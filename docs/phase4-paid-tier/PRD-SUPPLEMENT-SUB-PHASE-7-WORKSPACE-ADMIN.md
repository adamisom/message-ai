# Sub-Phase 7: Workspace Admin Features - PRD Supplement

**Date:** October 26, 2025  
**Status:** Planning / Pre-Implementation  
**Parent Document:** [WORKSPACES-PAID-TIER-PRD.md](./WORKSPACES-PAID-TIER-PRD.md)

---

## Overview

This document provides detailed requirements, UX flows, schema changes, and implementation guidance for **Sub-Phase 7: Workspace Admin Features**. This sub-phase adds three major capabilities exclusively for workspace admins:

1. **Edit & Save AI-Generated Content** - Customize AI summaries, decisions, and action items
2. **Manual Urgency Markers** - Override AI priority detection for up to 5 messages
3. **Pinned Messages** - Pin up to 5 important messages per group chat
4. **Capacity Expansion Flow** - Add workspace members beyond initial capacity with pro-rated billing

---

## 1. Edit & Save AI-Generated Content

### 1.1 Scope & Permissions

**Who Can Edit:**
- **Pro users** in their personal chats (direct or group)
- **Workspace admins** in workspace chats

**What Can Be Edited:**
- Thread summaries
- Decision records
- Action items lists

**Where Edit Buttons Appear:**
- Personal chats: Pro users only
- Workspace chats: Admins only (even if other members are Pro users)

---

### 1.2 UX Flow: Editing AI Content

#### Initial State (No Saved Version)

1. Admin opens AI feature modal (e.g., "Thread Summary")
2. AI generates content (from cache or fresh API call)
3. Content displays with **"Edit & Save"** button at bottom (admin only)
4. Admin clicks "Edit & Save"
5. Edit modal opens with pre-filled content
6. Admin makes changes
7. Admin clicks "Save" → Content saved to Firestore
8. Modal closes, returns to summary view showing saved version
9. Badge appears: "✏️ Edited by [Admin Name]"

#### Subsequent State (Saved Version Exists)

1. Admin opens AI feature modal
2. **Saved version loads immediately** (no AI call)
3. Content displays with:
   - Badge: "✏️ Edited by [Admin Name] on [Date]"
   - Button: **"Re-edit"** (opens edit modal again)
   - Button: **"Get Fresh AI Analysis"** (generates new AI version)
4. If admin clicks "Get Fresh AI Analysis":
   - Loading indicator shows
   - Fresh AI content replaces view (temporarily)
   - Saved version still exists in Firestore
   - New button appears: **"View Your Saved Version"**
   - Admin can toggle between fresh AI and saved version
   - Admin can click "Replace Saved with This" to overwrite saved version with fresh AI

#### Edit Modal UI

```
┌─────────────────────────────────────┐
│  ← Edit Summary              [Save] │
├─────────────────────────────────────┤
│                                     │
│  [Editable Text Area]               │
│  (Pre-filled with current content)  │
│                                     │
│  Key Points:                        │
│  • [Editable bullet 1]              │
│  • [Editable bullet 2]              │
│  • [Editable bullet 3]              │
│    [+ Add Point]                    │
│                                     │
│                                     │
│  [Cancel]              [Save]       │
└─────────────────────────────────────┘
```

---

### 1.3 Data Storage

#### Firestore Schema Changes

**`/conversations/{conversationId}/ai_summaries/{summaryId}`**
```typescript
{
  // Original AI fields
  summary: string,
  keyPoints: string[],
  messageCount: number,
  generatedAt: Timestamp,
  generatedBy: string,
  model: string,
  
  // NEW: Saved version fields
  editedByAdmin?: boolean,        // Flag: admin saved custom version
  savedByAdmin?: string,          // Admin UID who saved
  savedAt?: Timestamp,            // When saved
  
  // NEW: Keep original AI for reference
  originalAiVersion?: {
    summary: string,
    keyPoints: string[],
    generatedAt: Timestamp
  }
}
```

**Same schema applies to:**
- `/conversations/{conversationId}/ai_decisions/{decisionId}`
- `/conversations/{conversationId}/ai_action_items/{itemId}`

---

### 1.4 Client-Side Logic

**`SummaryModal.tsx` Updates:**

```typescript
// Check if saved version exists
const hasSavedVersion = summary?.editedByAdmin === true;

// State management
const [viewMode, setViewMode] = useState<'saved' | 'fresh'>('saved');
const [freshAiContent, setFreshAiContent] = useState(null);

// On modal open
useEffect(() => {
  if (hasSavedVersion) {
    // Show saved version, don't call AI
    setViewMode('saved');
  } else {
    // No saved version, fetch AI normally
    fetchAiSummary();
  }
}, [visible]);

// "Get Fresh AI Analysis" button handler
const handleGetFreshAI = async () => {
  setLoading(true);
  const freshContent = await generateSummary(conversationId, messageCount);
  setFreshAiContent(freshContent);
  setViewMode('fresh');
  setLoading(false);
};

// "View Your Saved Version" button handler
const handleViewSaved = () => {
  setViewMode('saved');
};
```

---

### 1.5 Cloud Functions

**New Function: `saveEditedSummary`**

```typescript
// functions/src/ai/saveEditedSummary.ts
export const saveEditedSummary = functions.https.onCall(async (data, context) => {
  // 1. Auth check
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  
  // 2. Validate admin permission (workspace chats only)
  const conversationRef = db.doc(`conversations/${data.conversationId}`);
  const conversation = await conversationRef.get();
  
  if (conversation.data()?.isWorkspaceChat) {
    const isAdmin = await checkIsWorkspaceAdmin(
      context.auth.uid, 
      conversation.data()?.workspaceId
    );
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can edit');
    }
  } else {
    // Personal chat: check if Pro user
    const user = await db.doc(`users/${context.auth.uid}`).get();
    if (!user.data()?.isPaidUser) {
      throw new functions.https.HttpsError('permission-denied', 'Pro required');
    }
  }
  
  // 3. Get existing summary to preserve original AI version
  const summaryRef = db.doc(
    `conversations/${data.conversationId}/ai_cache/summary_latest`
  );
  const existingSummary = await summaryRef.get();
  
  // 4. Save edited version
  await summaryRef.update({
    summary: data.editedSummary,
    keyPoints: data.editedKeyPoints,
    editedByAdmin: true,
    savedByAdmin: context.auth.uid,
    savedAt: admin.firestore.FieldValue.serverTimestamp(),
    
    // Preserve original AI version if this is first edit
    originalAiVersion: existingSummary.data()?.originalAiVersion || {
      summary: existingSummary.data()?.summary,
      keyPoints: existingSummary.data()?.keyPoints,
      generatedAt: existingSummary.data()?.generatedAt
    }
  });
  
  return { success: true };
});
```

**Similar functions needed:**
- `saveEditedDecision`
- `saveEditedActionItems`

---

## 2. Manual Urgency Markers

### 2.1 Overview

Workspace admins can manually mark up to **5 messages as urgent** per conversation. Admin-marked urgency takes precedence over AI-detected priority.

### 2.2 Permissions

- **Workspace admins only** (not Pro users in personal chats)
- **Workspace chats only**
- Limit: 5 urgent messages per conversation
- Admin can disable automatic AI urgency detection workspace-wide

---

### 2.3 UX Flow: Marking Message Urgent

#### Step 1: Tap Message

1. Admin taps a message in chat
2. Toolbar appears above keyboard with icons:
   - 🔴 "Mark Urgent"
   - 📌 "Pin Message" (if < 5 pinned already)
   - 💬 "Reply"
   - 🗑️ "Delete" (if admin's own message)

#### Step 2: Mark Urgent

3. Admin taps "Mark Urgent" 🔴
4. **If < 5 urgent messages:**
   - Message immediately shows red urgent badge
   - Confirmation toast: "Marked as urgent"
5. **If already 5 urgent messages:**
   - Modal opens showing current 5 urgent messages
   - Title: "Urgent Message Limit (5/5)"
   - List shows:
     - Message preview (first 50 chars)
     - Timestamp
     - Checkbox to un-mark
   - Bottom: "Un-mark a message to add another"
   - Admin un-checks one → "Mark Urgent" button becomes active
   - Click "Mark Urgent" → Replaces old with new

#### Step 3: Un-marking

1. Admin taps an urgent message
2. Toolbar shows "Remove Urgent" 🔴 (filled)
3. Admin taps → Badge removed immediately

---

### 2.4 Interaction with AI Priority Detection

**Priority Resolution Logic:**

```typescript
function getMessagePriority(message: Message): 'high' | 'medium' | 'low' {
  // 1. Admin manual mark takes absolute precedence
  if (message.manuallyMarkedUrgent === true) {
    return 'high';
  }
  
  // 2. Check if workspace has auto-urgency disabled
  if (workspaceSettings?.autoUrgencyEnabled === false) {
    return 'medium'; // Default, no AI
  }
  
  // 3. Use AI-detected priority
  return message.priority || 'medium';
}
```

**AI Batch Analysis Behavior:**

```typescript
// In batchAnalyzePriority Cloud Function
for (const messageDoc of needsAnalysis.docs) {
  const message = messageDoc.data();
  
  // Skip AI analysis if admin manually marked
  if (message.manuallyMarkedUrgent === true) {
    await messageDoc.ref.update({
      priorityNeedsAnalysis: false,
      priorityAnalyzedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    continue; // Don't overwrite admin's decision
  }
  
  // Otherwise, run AI analysis normally
  const aiPriority = await analyzeMessagePriorityWithAI(message.text);
  await messageDoc.ref.update({
    priority: aiPriority,
    priorityNeedsAnalysis: false,
    priorityAnalyzedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
```

---

### 2.5 Disable Auto-Urgency Setting

**Location:** Workspace Settings (`/workspace/[id]/settings.tsx`)

**UI:**

```
┌─────────────────────────────────────┐
│  Workspace Settings                 │
├─────────────────────────────────────┤
│                                     │
│  Urgency Detection                  │
│  ┌─────────────────────────────┐   │
│  │ [✓] Automatic AI urgency    │   │
│  │     detection enabled        │   │
│  │                              │   │
│  │  When disabled, only admin-  │   │
│  │  marked urgent messages will │   │
│  │  show urgency badges.        │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Firestore Update:**
```typescript
await updateDoc(doc(db, 'workspaces', workspaceId), {
  autoUrgencyEnabled: false
});
```

---

### 2.6 Data Storage

**`/conversations/{conversationId}/messages/{messageId}`**
```typescript
{
  // ... existing fields ...
  
  // NEW: Manual urgency fields
  manuallyMarkedUrgent?: boolean,     // Admin override
  markedUrgentBy?: string,            // Admin UID
  markedUrgentAt?: Timestamp,
  
  // Existing AI fields (still used when not manually marked)
  priority?: 'high' | 'medium' | 'low',
  priorityQuick?: 'high' | 'low' | 'unknown',
  priorityAnalyzedAt?: Timestamp
}
```

**`/workspaces/{workspaceId}`**
```typescript
{
  // ... existing fields ...
  
  // NEW: Feature flag
  autoUrgencyEnabled: boolean,  // Default: true
}
```

---

### 2.7 Cloud Function: Mark Message Urgent

**New Function: `markMessageUrgent`**

```typescript
export const markMessageUrgent = functions.https.onCall(async (data, context) => {
  // 1. Auth check
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  
  // 2. Get conversation and validate workspace admin
  const messageRef = db.doc(`conversations/${data.conversationId}/messages/${data.messageId}`);
  const conversationRef = db.doc(`conversations/${data.conversationId}`);
  const conversation = await conversationRef.get();
  
  if (!conversation.data()?.isWorkspaceChat) {
    throw new functions.https.HttpsError('invalid-argument', 'Only workspace chats support urgency markers');
  }
  
  const isAdmin = await checkIsWorkspaceAdmin(context.auth.uid, conversation.data()?.workspaceId);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can mark messages urgent');
  }
  
  // 3. Check limit (5 urgent messages per conversation)
  const urgentMessages = await db
    .collection(`conversations/${data.conversationId}/messages`)
    .where('manuallyMarkedUrgent', '==', true)
    .get();
  
  if (urgentMessages.size >= 5) {
    throw new functions.https.HttpsError('resource-exhausted', 'Maximum 5 urgent messages per conversation');
  }
  
  // 4. Mark message urgent
  await messageRef.update({
    manuallyMarkedUrgent: true,
    markedUrgentBy: context.auth.uid,
    markedUrgentAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return { success: true, urgentCount: urgentMessages.size + 1 };
});
```

---

## 3. Pinned Messages

### 3.1 Overview

Workspace admins can pin up to **5 messages per group chat** for easy reference. Pinned messages are accessible via a pin icon button at the top-left of the chat screen.

### 3.2 Permissions

- **Workspace admins only**
- **Workspace group chats only** (not direct messages)
- Limit: 5 pinned messages per conversation
- All workspace members can **view** pinned messages
- Only admin can **pin/un-pin**

---

### 3.3 UX Flow: Pinning Messages

#### Step 1: Pin Message

1. Admin taps a message in chat
2. Toolbar appears with "📌 Pin Message" option
3. **If < 5 pinned messages:**
   - Message is pinned immediately
   - Pin icon appears on message bubble
   - Confirmation toast: "Message pinned"
4. **If already 5 pinned messages:**
   - Modal opens: "Pin Limit Reached (5/5)"
   - Shows list of current 5 pinned messages:
     - Message preview (first 50 chars)
     - Who pinned it + when
     - "Replace with This" button
   - Admin selects one to replace
   - Confirmation: "Replace pinned message?"
   - Old pin removed, new pin added

#### Step 2: View Pinned Messages

1. User taps **📌 Pin icon** (top-left of chat screen, next to conversation name)
2. Modal opens showing all pinned messages:

```
┌─────────────────────────────────────┐
│  📌 Pinned Messages            [×]  │
├─────────────────────────────────────┤
│                                     │
│  Message 1 (Pinned by Alice)        │
│  ┌─────────────────────────────┐   │
│  │ "Let's target Q1 launch..."  │   │
│  │                              │   │
│  │ Oct 20, 2:30 PM              │   │
│  └─────────────────────────────┘   │
│  [Jump to Message]  [Un-pin]        │
│                                     │
│  Message 2 (Pinned by Alice)        │
│  ┌─────────────────────────────┐   │
│  │ "Budget approved: $50k"      │   │
│  │                              │   │
│  │ Oct 18, 10:15 AM             │   │
│  └─────────────────────────────┘   │
│  [Jump to Message]  [Un-pin]        │
│                                     │
│  ... (up to 5 total)                │
│                                     │
└─────────────────────────────────────┘
```

3. User clicks "Jump to Message" → Modal closes, chat scrolls to that message (highlighted briefly)
4. Admin can click "Un-pin" → Confirmation → Pin removed

---

### 3.4 Pin Icon Visibility

**Top-left of chat screen:**

```
┌─────────────────────────────────────┐
│  📌 ← Marketing Team        [AI] 👤 │  ← Pin icon only shows if pins exist
├─────────────────────────────────────┤
│                                     │
│  [Chat messages...]                 │
```

- **If 0 pins:** Icon hidden
- **If 1-5 pins:** Icon shows with count badge: 📌 `3`
- **If admin:** Tapping shows pinned messages with "Un-pin" buttons
- **If member:** Tapping shows pinned messages (read-only, no "Un-pin" buttons)

---

### 3.5 Data Storage

**`/conversations/{conversationId}`**
```typescript
{
  // ... existing fields ...
  
  // NEW: Pinned messages array
  pinnedMessages?: [              // Max 5
    {
      messageId: string,          // Reference to message doc
      pinnedBy: string,           // Admin UID
      pinnedAt: Timestamp,
      order: number               // 0-4, for display sequence
    }
  ]
}
```

**Note:** Message content is NOT duplicated. The `pinnedMessages` array just stores references. When displaying pinned messages, fetch the actual message documents.

---

### 3.6 Cloud Functions

**New Function: `pinMessage`**

```typescript
export const pinMessage = functions.https.onCall(async (data, context) => {
  // 1. Auth & admin check
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  
  const conversationRef = db.doc(`conversations/${data.conversationId}`);
  const conversation = await conversationRef.get();
  
  if (!conversation.data()?.isWorkspaceChat) {
    throw new functions.https.HttpsError('invalid-argument', 'Only workspace chats support pinning');
  }
  
  const isAdmin = await checkIsWorkspaceAdmin(context.auth.uid, conversation.data()?.workspaceId);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can pin messages');
  }
  
  // 2. Check limit
  const pinnedMessages = conversation.data()?.pinnedMessages || [];
  if (pinnedMessages.length >= 5 && !data.replaceMessageId) {
    throw new functions.https.HttpsError('resource-exhausted', 'Maximum 5 pinned messages');
  }
  
  // 3. Pin message (or replace)
  let updatedPins = [...pinnedMessages];
  
  if (data.replaceMessageId) {
    // Replace existing pin
    updatedPins = updatedPins.filter(p => p.messageId !== data.replaceMessageId);
  }
  
  updatedPins.push({
    messageId: data.messageId,
    pinnedBy: context.auth.uid,
    pinnedAt: admin.firestore.FieldValue.serverTimestamp(),
    order: updatedPins.length
  });
  
  await conversationRef.update({ pinnedMessages: updatedPins });
  
  return { success: true, pinnedCount: updatedPins.length };
});
```

**New Function: `unpinMessage`**

```typescript
export const unpinMessage = functions.https.onCall(async (data, context) => {
  // 1. Auth & admin check (same as pinMessage)
  // ... validation code ...
  
  // 2. Remove pin
  const conversation = await conversationRef.get();
  const pinnedMessages = conversation.data()?.pinnedMessages || [];
  
  const updatedPins = pinnedMessages
    .filter(p => p.messageId !== data.messageId)
    .map((p, index) => ({ ...p, order: index })); // Re-index
  
  await conversationRef.update({ pinnedMessages: updatedPins });
  
  return { success: true, pinnedCount: updatedPins.length };
});
```

---

## 4. Capacity Expansion Flow

### 4.1 Overview

Workspace admins can expand their workspace capacity mid-month by paying a pro-rated amount. If payment fails, workspaces become read-only until payment is resolved.

### 4.2 Trigger: Adding Member Beyond Capacity

**Scenario:**
- Workspace has `maxUsersThisMonth: 10`
- Currently 10 members
- Admin tries to invite 11th member

**Flow:**

1. Admin navigates to "Invite Member" screen
2. Enters email, clicks "Send Invitation"
3. **Capacity check fails** (10/10 members)
4. Modal appears: "Workspace Capacity Full"

---

### 4.3 Expansion Modal UI

```
┌─────────────────────────────────────┐
│  Workspace Capacity Full            │
├─────────────────────────────────────┤
│                                     │
│  Your workspace currently has:      │
│                                     │
│  • 10 members (capacity: 10)        │
│  • Adding this member requires      │
│    expanding to 11 seats            │
│                                     │
│  ───────────────────────────────    │
│                                     │
│  Expansion Charge:                  │
│                                     │
│  • Base cost: $0.50/member/month    │
│  • Pro-rated for remaining days:    │
│    $0.50 × 1 member × 15/30 days    │
│  • Total: $0.25                     │
│                                     │
│  Next month (Nov 1): $5.50/month    │
│  (11 members × $0.50)               │
│                                     │
│                                     │
│  [Cancel]        [Expand & Pay]     │
│                                     │
└─────────────────────────────────────┘
```

---

### 4.4 Payment Flow

#### Success Path

1. Admin clicks "Expand & Pay"
2. Loading indicator: "Processing payment..."
3. Cloud Function `expandWorkspaceCapacity`:
   - Calculate pro-rated charge
   - Process payment (Stripe in production, mock in MVP mode)
   - Update `maxUsersThisMonth` in workspace doc
   - Log billing event
   - Send invitation to new member
4. Success confirmation: "Workspace expanded! Invitation sent."
5. Return to members screen

#### Failure Path

1. Payment fails (insufficient funds, card declined, etc.)
2. Error modal:
   - "Payment Failed"
   - "Unable to process payment. Please update your payment method."
   - Button: "Update Payment Method"
3. Workspace does NOT expand
4. **Workspace becomes read-only** until payment resolved:
   - Members can read messages
   - Members cannot send messages
   - Banner appears: "⚠️ Payment issue - Workspace is read-only. Contact admin."
   - Admin sees different banner: "⚠️ Payment failed. [Update Payment] to restore access."

---

### 4.5 Read-Only State

**Triggers:**
- Payment failure during capacity expansion
- Monthly billing failure (normal billing cycle)
- Grace period expired (30 days)

**Workspace Behavior:**
- All conversations in workspace are read-only
- Message input disabled
- Banner shows: "Workspace is read-only due to billing issue"
- Admin can still access workspace settings to update payment

**Enforcement:**
- Client-side: Check `workspace.isActive` flag before allowing message send
- Server-side: Cloud Function `sendMessage` checks workspace status

---

### 4.6 Data Storage

**`/workspaces/{workspaceId}`**
```typescript
{
  // ... existing fields ...
  maxUsersThisMonth: number,           // Admin's current capacity
  billingCycleStart: Timestamp,        // Usually 1st of month
  currentMonthCharge: number,          // Current bill amount
  isActive: boolean,                   // False if payment failed
  
  // NEW: Capacity change tracking
  pendingCapacityChange?: {            // For downgrades only
    newMaxUsers: number,
    requestedAt: Timestamp,
    effectiveDate: Timestamp           // 1st of next month
  }
}
```

**`/workspaces/{workspaceId}/billingEvents/{eventId}` (NEW)**
```typescript
{
  type: 'expansion' | 'downgrade_requested' | 'downgrade_applied' | 'payment_failed' | 'payment_recovered',
  timestamp: Timestamp,
  triggeredBy: string,                 // Admin UID
  
  details: {
    oldCapacity?: number,
    newCapacity?: number,
    proratedCharge?: number,
    daysRemaining?: number,
    paymentIntentId?: string,          // Stripe reference (production)
    errorMessage?: string              // If payment failed
  }
}
```

---

### 4.7 Cloud Function: Expand Workspace Capacity

**New Function: `expandWorkspaceCapacity`**

```typescript
export const expandWorkspaceCapacity = functions.https.onCall(async (data, context) => {
  // 1. Auth & admin check
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  
  const workspaceRef = db.doc(`workspaces/${data.workspaceId}`);
  const workspace = await workspaceRef.get();
  
  if (workspace.data()?.adminUid !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Only workspace admin can expand capacity');
  }
  
  // 2. Calculate pro-rated charge
  const currentCapacity = workspace.data()?.maxUsersThisMonth || 0;
  const newCapacity = data.newMaxUsers;
  const additionalSeats = newCapacity - currentCapacity;
  
  if (additionalSeats <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'New capacity must be greater than current');
  }
  
  const billingCycleStart = workspace.data()?.billingCycleStart?.toDate();
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - today.getDate() + 1;
  const proratedCharge = (additionalSeats * 0.5) * (daysRemaining / daysInMonth);
  
  // 3. Process payment (MVP mode: auto-succeed)
  let paymentSuccess = true;
  let paymentIntentId = `mock_${Date.now()}`;
  
  // TODO: In production, replace with real Stripe call
  // const paymentIntent = await stripe.paymentIntents.create({ ... });
  // paymentSuccess = paymentIntent.status === 'succeeded';
  
  if (!paymentSuccess) {
    // Payment failed - mark workspace as inactive
    await workspaceRef.update({
      isActive: false,
      lastPaymentFailure: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Log billing event
    await db.collection(`workspaces/${data.workspaceId}/billingEvents`).add({
      type: 'payment_failed',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      triggeredBy: context.auth.uid,
      details: {
        oldCapacity: currentCapacity,
        newCapacity: newCapacity,
        proratedCharge,
        errorMessage: 'Payment declined'
      }
    });
    
    throw new functions.https.HttpsError('aborted', 'Payment failed');
  }
  
  // 4. Payment succeeded - update capacity
  await workspaceRef.update({
    maxUsersThisMonth: newCapacity,
    currentMonthCharge: workspace.data()?.currentMonthCharge + proratedCharge,
    isActive: true
  });
  
  // 5. Log billing event
  await db.collection(`workspaces/${data.workspaceId}/billingEvents`).add({
    type: 'expansion',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    triggeredBy: context.auth.uid,
    details: {
      oldCapacity: currentCapacity,
      newCapacity: newCapacity,
      proratedCharge,
      daysRemaining,
      paymentIntentId
    }
  });
  
  return {
    success: true,
    newCapacity,
    chargeAmount: proratedCharge
  };
});
```

---

### 4.8 Downgrade Flow (Future - Sub-Phase 12)

**Note:** Downgrades are NOT part of Sub-Phase 7, but schema supports them for future implementation.

**Key Points:**
- Downgrade requests stored in `pendingCapacityChange`
- Take effect on 1st of next month (no pro-rated refunds)
- Must verify `members.length <= newMaxUsers` before approving
- Admin notified if downgrade blocked due to member count

---

## 5. Schema Summary

### 5.1 New Collections

**`/workspaces/{workspaceId}/billingEvents/{eventId}`**
```typescript
{
  type: 'expansion' | 'downgrade_requested' | 'downgrade_applied' | 'payment_failed' | 'payment_recovered',
  timestamp: Timestamp,
  triggeredBy: string,
  details: {
    oldCapacity?: number,
    newCapacity?: number,
    proratedCharge?: number,
    daysRemaining?: number,
    paymentIntentId?: string,
    errorMessage?: string
  }
}
```

---

### 5.2 Modified Collections

**`/workspaces/{workspaceId}`**
```typescript
{
  // ... existing fields ...
  autoUrgencyEnabled: boolean,         // NEW: Default true
  pendingCapacityChange?: {            // NEW: For downgrades
    newMaxUsers: number,
    requestedAt: Timestamp,
    effectiveDate: Timestamp
  }
}
```

**`/conversations/{conversationId}`**
```typescript
{
  // ... existing fields ...
  pinnedMessages?: [                   // NEW: Max 5
    {
      messageId: string,
      pinnedBy: string,
      pinnedAt: Timestamp,
      order: number
    }
  ]
}
```

**`/conversations/{conversationId}/messages/{messageId}`**
```typescript
{
  // ... existing fields ...
  manuallyMarkedUrgent?: boolean,      // NEW
  markedUrgentBy?: string,             // NEW
  markedUrgentAt?: Timestamp           // NEW
}
```

**`/conversations/{conversationId}/ai_summaries/{summaryId}`**
(and similar for `ai_decisions`, `ai_action_items`)
```typescript
{
  // ... existing fields ...
  editedByAdmin?: boolean,             // NEW
  savedByAdmin?: string,               // NEW
  savedAt?: Timestamp,                 // NEW
  originalAiVersion?: {                // NEW
    summary: string,
    keyPoints: string[],
    generatedAt: Timestamp
  }
}
```

---

## 6. Security Rules Updates

### 6.1 Billing Events Collection

```javascript
// Allow admins to read their workspace billing events
match /workspaces/{workspaceId}/billingEvents/{eventId} {
  allow read: if get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.adminUid == request.auth.uid;
  allow write: if false; // Only Cloud Functions can write
}
```

---

## 7. UI Components to Create/Modify

### 7.1 New Components

1. **`EditSummaryModal.tsx`** - Editable text area for summaries
2. **`EditDecisionModal.tsx`** - Editable decision records
3. **`EditActionItemsModal.tsx`** - Editable action items list
4. **`PinnedMessagesModal.tsx`** - Display pinned messages with jump/un-pin actions
5. **`UrgentMessagesModal.tsx`** - Show 5/5 urgent messages when limit reached
6. **`CapacityExpansionModal.tsx`** - Pro-rated billing calculation and payment flow
7. **`MessageToolbar.tsx`** - Pop-up toolbar on message tap (Mark Urgent, Pin, Reply, etc.)

---

### 7.2 Modified Components

1. **`SummaryModal.tsx`**
   - Add "Edit & Save" button (admin/Pro only)
   - Add "Get Fresh AI Analysis" button (when saved version exists)
   - Add "View Your Saved Version" toggle
   - Show "✏️ Edited by [Name]" badge

2. **`DecisionsModal.tsx`**
   - Same edit/save flow as SummaryModal

3. **`ActionItemsModal.tsx`**
   - Same edit/save flow as SummaryModal

4. **`MessageBubble.tsx`**
   - Add tap handler to show MessageToolbar
   - Display pin icon if message is pinned
   - Display urgent badge (admin-marked takes precedence over AI)

5. **`ChatScreen.tsx` (`app/chat/[id].tsx`)**
   - Add pin icon button (top-left, next to conversation name)
   - Add read-only banner if workspace inactive
   - Disable message input if workspace read-only

6. **`WorkspaceSettingsScreen.tsx`**
   - Add "Automatic AI urgency detection" toggle
   - Add "View Billing Events" button (admin only)

7. **`InviteMemberScreen.tsx`**
   - Check capacity before sending invitation
   - Trigger CapacityExpansionModal if at limit

---

## 8. Testing Scenarios

### 8.1 Edit & Save AI Content

- [ ] **Test 1:** Pro user edits summary in personal chat
- [ ] **Test 2:** Workspace admin edits summary in workspace chat
- [ ] **Test 3:** Non-admin Pro member cannot edit in workspace chat (button hidden)
- [ ] **Test 4:** Free user cannot edit in personal chat (button hidden)
- [ ] **Test 5:** Saved version persists across app restarts
- [ ] **Test 6:** "Get Fresh AI Analysis" generates new content without deleting saved version
- [ ] **Test 7:** Toggle between saved and fresh AI versions
- [ ] **Test 8:** Re-edit saved version (updates `savedAt` timestamp)
- [ ] **Test 9:** Edit action items and verify assignment data preserved
- [ ] **Test 10:** Edit decisions and verify all fields editable

---

### 8.2 Manual Urgency Markers

- [ ] **Test 11:** Admin marks message urgent (badge appears)
- [ ] **Test 12:** Admin un-marks urgent message (badge disappears)
- [ ] **Test 13:** Admin marks 5 messages urgent, tries 6th (limit modal appears)
- [ ] **Test 14:** Admin replaces urgent message from limit modal
- [ ] **Test 15:** AI batch analysis skips admin-marked messages
- [ ] **Test 16:** Admin disables auto-urgency → AI badges stop appearing (admin can still mark manually)
- [ ] **Test 17:** Non-admin member cannot mark urgent (toolbar hidden)
- [ ] **Test 18:** Manual urgency not available in personal chats

---

### 8.3 Pinned Messages

- [ ] **Test 19:** Admin pins message (pin icon appears on message)
- [ ] **Test 20:** All members can view pinned messages modal
- [ ] **Test 21:** Admin un-pins message (pin removed)
- [ ] **Test 22:** Admin pins 5 messages, tries 6th (replacement modal appears)
- [ ] **Test 23:** "Jump to Message" scrolls to pinned message in chat
- [ ] **Test 24:** Pin icon in chat header shows count badge (e.g., 📌 `3`)
- [ ] **Test 25:** Non-admin member cannot un-pin (button hidden)
- [ ] **Test 26:** Pinned messages persist across app restarts

---

### 8.4 Capacity Expansion

- [ ] **Test 27:** Admin at capacity (10/10) tries to invite 11th member → expansion modal appears
- [ ] **Test 28:** Pro-rated charge calculates correctly (mid-month)
- [ ] **Test 29:** Admin pays and capacity expands immediately
- [ ] **Test 30:** Payment fails → workspace becomes read-only
- [ ] **Test 31:** Read-only banner appears for all members
- [ ] **Test 32:** Members cannot send messages in read-only workspace
- [ ] **Test 33:** Admin updates payment → workspace reactivates
- [ ] **Test 34:** Billing event logged for successful expansion
- [ ] **Test 35:** Billing event logged for payment failure
- [ ] **Test 36:** Verify next month's charge includes new capacity

---

## 9. Implementation Order

**Recommended sequence:**

1. **Week 1: Edit & Save AI Content**
   - Schema updates for saved versions
   - Cloud Functions (saveEditedSummary, saveEditedDecision, saveEditedActionItems)
   - Edit modals (EditSummaryModal, EditDecisionModal, EditActionItemsModal)
   - Update existing AI modals with edit buttons and toggle logic
   - Testing (Tests 1-10)

2. **Week 2: Manual Urgency Markers**
   - Schema updates for manual urgency fields
   - Workspace settings toggle for auto-urgency
   - MessageToolbar component
   - Cloud Function (markMessageUrgent, unmarkMessageUrgent)
   - Update batchAnalyzePriority to skip admin-marked messages
   - Testing (Tests 11-18)

3. **Week 2-3: Pinned Messages**
   - Schema updates for pinnedMessages array
   - PinnedMessagesModal component
   - Cloud Functions (pinMessage, unpinMessage)
   - Update chat header with pin icon button
   - Testing (Tests 19-26)

4. **Week 3: Capacity Expansion**
   - Schema updates for billingEvents collection
   - CapacityExpansionModal component
   - Cloud Function (expandWorkspaceCapacity)
   - Read-only workspace enforcement (client + server)
   - Billing event logging
   - Testing (Tests 27-36)

---

## 10. Future Enhancements (Out of Scope)

- **Message reordering for pins** (currently fixed order by pin time)
- **Bulk urgency operations** (mark multiple messages urgent at once)
- **Urgency expiration** (auto-remove urgency after X days)
- **Pin categories** (e.g., "Important Links", "Action Items", "Decisions")
- **Capacity downgrade flow** (deferred to Sub-Phase 12: Billing & Admin)
- **Real Stripe integration** (deferred to Sub-Phase 12: Billing & Admin)

---

## 11. Open Questions / Decisions Needed

✅ All questions resolved as of October 26, 2025.

---

**End of PRD Supplement**

