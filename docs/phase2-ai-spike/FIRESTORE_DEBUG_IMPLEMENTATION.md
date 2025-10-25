# Firestore Debugging Implementation Summary

**Date:** October 25, 2025  
**Time:** ~15 minutes  
**Status:** ✅ Complete and deployed

---

## What Was Implemented

### 1. Debug Logging in Cloud Function

**File:** `functions/src/ai/actionItems.ts`

**Before parsing (lines 114-128):**
- Writes complete raw response to Firestore
- Captures character codes for first 300 chars (to detect hidden characters)
- Includes metadata: conversationId, userId, feature name
- Logs debug document ID to console

**After parsing fails (lines 146-156):**
- Writes error details to Firestore
- Captures error message and stack trace
- Status marked as "PARSING_ERROR"

### 2. Hidden Character Detection

**File:** `functions/src/utils/conversationHelpers.ts`

**In extraction function (lines 57-70):**
- Scans first 500 chars of extracted JSON
- Detects non-printable characters (code < 32, except tab/newline/carriage return)
- Logs warning if hidden characters found
- Logs confirmation if no hidden characters detected

### 3. Helper Scripts

**`scripts/viewDebugLogs.js`** (117 lines):
- Fetches recent debug logs from Firestore
- Displays formatted output with:
  - Timestamp, user, conversation details
  - Full raw response
  - Character codes array
  - Error details (if applicable)
  - Warning if non-printable characters detected
- Usage: `node scripts/viewDebugLogs.js [limit]`

**`scripts/clearDebugLogs.js`** (43 lines):
- Deletes all documents in `debug_logs` collection
- Batch delete operation (handles 500 at a time)
- Usage: `node scripts/clearDebugLogs.js`

### 4. Documentation

**`docs/phase2-ai-spike/DEBUG_LOGS_GUIDE.md`:**
- Complete usage guide for debugging workflow
- Examples of what to look for
- Alternative fix strategies based on findings
- Cleanup instructions

**Updated `docs/phase2-ai-spike/ACTION_ITEMS_JSON_PARSING_BUG.md`:**
- Added "Latest Update" section
- Documented changes made
- Listed next steps

---

## Deployment

```bash
# 1. Deleted old function to force fresh deployment
firebase functions:delete extractActionItems --force
# ✅ Success

# 2. Deployed new function with debug logging
firebase deploy --only functions:extractActionItems
# ✅ Success - Node.js 20 (1st Gen) function created
```

---

## Testing Workflow

### Step 1: Trigger the Function
1. Open MessageAI app
2. Navigate to a test conversation
3. Tap ✨ sparkles → **Action Items**
4. Wait for response (success or error)

### Step 2: View Debug Logs
```bash
node scripts/viewDebugLogs.js
```

### Step 3: Analyze Output
- Check character codes for hidden characters
- Verify JSON structure in raw response
- Look for markdown formatting issues
- Identify encoding problems

### Step 4: Implement Fix
Based on findings, choose one of:
1. Instruct Claude to return pure JSON (no markdown)
2. Use regex-based extraction for markdown
3. Sanitize hidden characters before parsing
4. Implement multiple fallback strategies

### Step 5: Cleanup
After bug is fixed:
1. Remove debug logging code
2. Clear debug logs from Firestore
3. Update bug documentation

---

## Files Changed

### Modified
- `functions/src/ai/actionItems.ts` (added debug logging)
- `functions/src/utils/conversationHelpers.ts` (added hidden char detection, fixed linter warning)
- `docs/phase2-ai-spike/ACTION_ITEMS_JSON_PARSING_BUG.md` (updated status)

### Created
- `scripts/viewDebugLogs.js` (new)
- `scripts/clearDebugLogs.js` (new)
- `docs/phase2-ai-spike/DEBUG_LOGS_GUIDE.md` (new)

---

## Key Benefits

1. **Reliable Data Capture:** Firestore writes are guaranteed, unlike console logs
2. **Complete Information:** Full raw response + character codes + error details
3. **Easy Analysis:** Formatted script output makes debugging straightforward
4. **Reusable:** Can use same approach for other AI functions if needed
5. **No User Impact:** Debug logs don't affect app functionality

---

## Next Steps

**Immediate:**
1. Test Action Items extraction in app
2. Run `node scripts/viewDebugLogs.js`
3. Analyze the raw response
4. Identify root cause

**After Analysis:**
1. Implement appropriate fix (see alternatives in bug doc)
2. Test fix
3. Remove debug logging code
4. Clear debug logs
5. Update documentation with solution

---

## Notes

- Debug logs collection: `debug_logs`
- No Firestore rules needed (Cloud Functions have admin access)
- Scripts require `serviceAccountKey.json` in functions directory
- Logs accumulate over time - remember to clear periodically

---

**Status:** Ready for testing! 🚀

The debugging infrastructure is in place. Trigger the function and view the logs to identify the root cause.

