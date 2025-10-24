# Sub-Phase 1 Frontend Testing Guide

**Purpose:** Comprehensive manual testing checklist for all AI features in the mobile app.

**Prerequisites:**
- ✅ Backend deployed: `firebase deploy --only functions,firestore:indexes,firestore:rules`
- ✅ Test data populated: `node scripts/populateTestData.js`
- ✅ App running: `npx expo start`
- ✅ Logged in as one of your test users

---

## Quick Start

1. Open the app on your device/simulator
2. Navigate to any conversation
3. Tap the **✨ sparkles icon** in the header (top right)
4. You should see the AI Features menu with 4-5 options

---

## 🎨 Part 1: Visual UI Tests (No API Calls)

### 1.1 AI Features Menu

**Location:** Chat screen → Tap ✨ sparkles icon

- [ ] **Menu appears** as bottom sheet with fade overlay
- [ ] **4 features visible** in direct chats: Search, Summary, Action Items (no Decisions)
- [ ] **5 features visible** in group chats: Search, Summary, Action Items, Decisions
- [ ] **Icons display** correctly (🔍 📝 ✓ 💡)
- [ ] **Descriptions** are readable below each title
- [ ] **Cancel button** at bottom
- [ ] **Tap outside** dismisses menu
- [ ] **Cancel button** dismisses menu

### 1.2 Search Modal - Empty State

**Location:** AI Features Menu → Search Messages

- [ ] **Modal opens** full-screen with "Search Messages" title
- [ ] **Close button** (✕) in top right
- [ ] **Search input** visible with placeholder "Search for messages..."
- [ ] **Search button** (🔍) on the right
- [ ] **Empty state** shows magnifying glass icon and instructions
- [ ] **Empty state text** says "Search for messages in this conversation"
- [ ] **Subtext** says "Try searching for keywords, topics, or names"

### 1.3 Summary Modal - Empty State

**Location:** AI Features Menu → Summarize Thread

- [ ] **Modal opens** full-screen with "Thread Summary" title
- [ ] **Message count selector** visible (25, 50, 100)
- [ ] **Default selection** is 50 (blue background)
- [ ] **Tap 25** changes selection (blue background moves)
- [ ] **Tap 100** changes selection
- [ ] **Empty state** shows 📝 icon and "Get an AI-powered summary" text

### 1.4 Action Items Modal - Empty State

**Location:** AI Features Menu → Action Items

- [ ] **Modal opens** full-screen with "Action Items" title
- [ ] **Empty state** during first load (if no cached data)

### 1.5 Decisions Modal - Empty State

**Location:** AI Features Menu → Decisions (group chats only)

- [ ] **Menu item hidden** in direct chats
- [ ] **Menu item visible** in group chats
- [ ] **Modal opens** with "Decisions" title
- [ ] **Empty state** during first load (if no cached data)

### 1.6 Priority Badges on Messages

**Location:** Any chat screen with messages

- [ ] **Scroll through messages** and look for priority badges
- [ ] **High priority** shows 🔴 red dot next to message
- [ ] **Medium priority** shows 🟡 yellow dot next to message
- [ ] **Low priority** shows no badge (expected)
- [ ] **Badges appear** for both sent and received messages
- [ ] **Badges align** properly with message text

---

## 🚀 Part 2: Functional Tests (API Calls)

### 2.1 Semantic Search

**Setup:** Use conversation with test data (should have 20+ messages)

**Test 1: Basic Search**
- [ ] Open Search Modal
- [ ] Type: `"urgent"`
- [ ] Tap Search (or press Enter)
- [ ] **Loading state** appears ("Searching...")
- [ ] **Results appear** within 3 seconds
- [ ] **Each result shows**: Sender name, date, message preview, source indicator
- [ ] **Match percentage** shows (e.g., "85% match") for vector results
- [ ] **Tap a result** dismisses modal and logs message ID (check console)

**Test 2: No Results**
- [ ] Search for: `"xyzabc123notfound"`
- [ ] **Error message** appears: "No messages found"
- [ ] **No crash** or blank screen

**Test 3: Empty Query**
- [ ] Clear search input
- [ ] Tap Search
- [ ] **Error message** appears: "Please enter a search query"

**Test 4: Recent Messages (Local Search)**
- [ ] Send a new message with unique word (e.g., "elephantTest123")
- [ ] Immediately search for that word
- [ ] **Result appears** with "📍 Recent" indicator (vector not ready yet)

### 2.2 Thread Summarization

**Setup:** Use conversation with 50+ messages

**Test 1: Default Summary (50 messages)**
- [ ] Open Summary Modal
- [ ] **Loading state** appears ("Analyzing 50 messages...")
- [ ] **Loading subtext** says "This may take a few seconds"
- [ ] **Summary appears** within 10 seconds
- [ ] **Summary text** is 2-4 sentences long
- [ ] **Key Points** section visible
- [ ] **3-10 bullet points** listed
- [ ] **Footer** shows "Summary generated from 50 messages"

**Test 2: Change Message Count**
- [ ] Close and reopen Summary Modal
- [ ] Select **25 messages**
- [ ] **New loading state** appears
- [ ] **New summary** appears (likely different from 50-message summary)
- [ ] **Footer** updates to "Summary generated from 25 messages"

**Test 3: Large Summary (100 messages)**
- [ ] Select **100 messages**
- [ ] **Loading takes longer** (5-10 seconds)
- [ ] **Summary appears** successfully
- [ ] **Scroll content** if needed (should be scrollable)

**Test 4: Caching**
- [ ] Close Summary Modal
- [ ] Reopen immediately
- [ ] **Summary appears instantly** (from cache, no loading)
- [ ] **Same content** as before

**Test 5: Error Handling**
- [ ] (If possible) Turn off internet
- [ ] Open Summary Modal
- [ ] **Error message** appears
- [ ] **Retry button** visible
- [ ] (Turn internet back on)
- [ ] **Tap Retry**
- [ ] **Summary loads** successfully

### 2.3 Action Items Extraction

**Setup:** Use conversation with action items (e.g., "Team Project Planning")

**Test 1: Initial Load**
- [ ] Open Action Items Modal
- [ ] **Loading state** appears ("Scanning for action items...")
- [ ] **Items appear** within 8 seconds
- [ ] **Each item shows**: Text, priority badge (🔴🟡🟢), checkbox

**Test 2: Item Display**
- [ ] **Checkboxes** are empty circles (unchecked)
- [ ] **Priority colors** match: High=red, Medium=yellow/orange, Low=green
- [ ] **Assignee** shows if present (👤 Name)
- [ ] **Due date** shows if present (📅 Date)
- [ ] **Priority badge** shows at bottom (e.g., "HIGH PRIORITY")

**Test 3: Toggle Completion**
- [ ] **Tap checkbox** on a pending item
- [ ] **Checkbox fills** with checkmark instantly (optimistic update)
- [ ] **Text** gets strike-through
- [ ] **Color changes** to gray
- [ ] Close and reopen modal
- [ ] **Status persists** (still completed)

**Test 4: Uncomplete Item**
- [ ] **Tap checkbox** on completed item
- [ ] **Checkbox empties**
- [ ] **Strike-through removed**
- [ ] **Color returns** to normal

**Test 5: Empty State**
- [ ] Use a conversation with no action items (e.g., "Casual Weekend Chat")
- [ ] Open Action Items Modal
- [ ] **Empty state** appears: ✓ icon, "No action items found"
- [ ] **Subtext** explains no tasks detected

**Test 6: Caching**
- [ ] Close and reopen Action Items Modal
- [ ] **Items appear instantly** (cached)

### 2.4 Decision Tracking (Group Chats Only)

**Setup:** Use a group conversation with decisions (e.g., "Startup Strategy Group")

**Test 1: Initial Load**
- [ ] Open Decisions Modal
- [ ] **Loading state** appears ("Analyzing decisions...")
- [ ] **Decisions appear** within 10 seconds
- [ ] **Timeline UI** visible (dots and lines)

**Test 2: Decision Display**
- [ ] **Each decision shows**: Date, decision text, context, confidence, participant count
- [ ] **Timeline dots** are blue
- [ ] **Timeline lines** connect decisions vertically
- [ ] **Confidence badge** shows percentage (e.g., "85% confidence")
- [ ] **Confidence color** matches level: 90%+=green, 80-89%=light green, <80%=yellow/orange
- [ ] **Participant count** shows (e.g., "3 participants")

**Test 3: Scrolling**
- [ ] **Scroll up/down** through decisions
- [ ] **Timeline remains connected** during scroll
- [ ] **Content readable** throughout

**Test 4: Empty State**
- [ ] Use a conversation with no clear decisions
- [ ] Open Decisions Modal
- [ ] **Empty state** appears: 💡 icon, "No decisions found"
- [ ] **Subtext** explains no decisions detected

**Test 5: Direct Chat Behavior**
- [ ] Switch to a direct (1:1) conversation
- [ ] Open AI Features Menu
- [ ] **Decisions option hidden** (should only show 4 features)

---

## 🐛 Part 3: Error & Edge Case Tests

### 3.1 Timeouts

**Test:** Open Summary Modal, then immediately turn off internet for 10+ seconds

- [ ] **Timeout error** appears after configured timeout
- [ ] **Error message** is user-friendly (not technical)
- [ ] **Retry button** appears
- [ ] Turn internet back on, tap Retry
- [ ] **Feature works** normally

### 3.2 Rate Limiting

**Test:** Make 50+ AI calls in under an hour (mix of features)

- [ ] **After 50 calls**, error appears: rate limit exceeded
- [ ] **Error message** explains limit
- [ ] **Retry doesn't work** until hour passes

### 3.3 Modal Stacking

**Test 1: Smooth Transitions**
- [ ] Open AI Features Menu
- [ ] Tap Search
- [ ] **Menu closes**, Search opens (no overlap)
- [ ] Close Search
- [ ] **Back to chat** (no leftover modals)

**Test 2: Rapid Opening/Closing**
- [ ] Open AI Features Menu
- [ ] Immediately tap Cancel
- [ ] Open again
- [ ] Tap a feature
- [ ] **No crashes** or UI glitches

### 3.4 Long Messages

**Test:** Search for a result with very long message (200+ characters)

- [ ] **Result displays** correctly
- [ ] **Text truncates** with "..." (numberOfLines={2})
- [ ] **No layout overflow** or broken UI

### 3.5 No Test Data

**Test:** Use a brand new conversation with 0-5 messages

- [ ] Open Summary Modal
- [ ] **Error or empty result** (not enough messages)
- [ ] Open Action Items Modal
- [ ] **Empty state** (no action items)
- [ ] Open Decisions Modal
- [ ] **Empty state** (no decisions)

---

## 📊 Part 4: Performance Tests

### 4.1 Response Times

**Measure with stopwatch/timer:**

- [ ] **Search:** < 3 seconds from tap to results
- [ ] **Summary:** < 10 seconds from open to display
- [ ] **Action Items:** < 8 seconds from open to display
- [ ] **Decisions:** < 10 seconds from open to display
- [ ] **Action item toggle:** < 500ms (feels instant)

### 4.2 App Responsiveness

**During AI calls:**

- [ ] **Chat screen still works** (can scroll, type, send messages)
- [ ] **Navigation works** (can go back, switch chats)
- [ ] **No freezing** or UI hangs
- [ ] **Loading indicators** show progress

### 4.3 Memory Usage

**After 10+ AI feature uses:**

- [ ] **App doesn't crash** from memory issues
- [ ] **Modals still open/close** smoothly
- [ ] **No lag** in chat screen

---

## ✅ Part 5: Priority Badge Tests

### 5.1 Real-Time Priority Detection

**Test 1: Send High-Priority Message**
- [ ] Type urgent message: "URGENT: Server is down! Need help immediately!"
- [ ] Send message
- [ ] **Within 1 second**, 🔴 badge appears (heuristic)
- [ ] **After ~10 minutes**, badge may change if AI refines it

**Test 2: Send Normal Message**
- [ ] Type: "Hey, how's it going?"
- [ ] Send message
- [ ] **No badge** appears (low priority, expected)

**Test 3: Receive Priority Message**
- [ ] Have another test user send urgent message
- [ ] **Badge appears** on received message
- [ ] **Badge position** aligns correctly

### 5.2 Badge Persistence

**Test:** Close and reopen app

- [ ] **Priority badges** still visible on old messages
- [ ] **No duplicate badges**
- [ ] **Correct priority** maintained

---

## 🎯 Part 6: Integration Tests

### 6.1 Multi-Feature Workflow

**Scenario:** Use all features in one session

1. [ ] Open chat
2. [ ] Tap ✨ sparkles
3. [ ] Open Search, find a message, close
4. [ ] Open Summary, read it, close
5. [ ] Open Action Items, check one off, close
6. [ ] Open Decisions (if group), read them, close
7. [ ] **No crashes** or stuck states

### 6.2 Cross-Conversation Consistency

**Test:** Use features in multiple conversations

1. [ ] Open conversation A
2. [ ] Generate summary
3. [ ] Switch to conversation B
4. [ ] Generate summary
5. [ ] **Both summaries** are independent
6. [ ] **No data bleeding** between conversations

### 6.3 Simultaneous Users

**Test:** Two users in same conversation

1. [ ] User A extracts action items
2. [ ] User A checks off item #1
3. [ ] User B opens action items
4. [ ] **User B sees** item #1 as completed
5. [ ] User B checks off item #2
6. [ ] User A reopens action items
7. [ ] **User A sees** item #2 as completed

---

## 📝 Part 7: Checklist Summary

After completing all tests above, verify:

- [ ] **All modals open/close** smoothly
- [ ] **All empty states** display correctly
- [ ] **All loading states** appear
- [ ] **All error states** handled gracefully
- [ ] **Search works** for both recent and old messages
- [ ] **Summary works** for all message counts (25/50/100)
- [ ] **Action items** can be checked on/off
- [ ] **Decisions** show in group chats only
- [ ] **Priority badges** appear on high/medium messages
- [ ] **Caching works** (instant reopen)
- [ ] **Timeouts work** (no infinite loading)
- [ ] **Performance acceptable** (< 10 seconds per feature)
- [ ] **No crashes** during entire test session
- [ ] **No memory leaks** or app slowdowns

---

## 🐞 Bug Reporting Template

If you find issues, report with this format:

```
**Feature:** [Search/Summary/Action Items/Decisions/Priority Badges]
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Screenshots:** [If applicable]
**Device:** [iOS/Android, version]
**Conversation:** [Which test conversation]
```

---

## ✅ Testing Complete!

Once all tests pass, Sub-Phase 1 is ready to merge. 🎉

**Next:** Update `SUB-PHASE_1_IMPLEMENTATION_SUMMARY.md` with test results and proceed to Sub-Phase 2.

