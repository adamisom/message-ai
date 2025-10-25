# Firestore Debug Logs - Quick Reference

## Overview

The `extractActionItems` Cloud Function now writes comprehensive debug logs to Firestore before and after attempting to parse Claude's response. This bypasses unreliable console logging.

---

## Debug Log Structure

Each log in the `debug_logs` collection contains:

```javascript
{
  timestamp: ServerTimestamp,
  conversationId: string,
  userId: string,
  feature: "extractActionItems",
  
  // Success logs (before parsing)
  rawResponseFull: string,           // Complete Claude response
  rawResponseLength: number,
  rawResponsePreview: string,        // First 1000 chars
  rawResponseEnd: string,            // Last 500 chars
  firstCharsAsCodes: number[],       // Character codes (first 300 chars)
  
  // Error logs (if parsing failed)
  status: "PARSING_ERROR",
  errorMessage: string,
  errorStack: string,
}
```

---

## How to Use

### 1. Trigger the Function

In the app:
1. Open any test conversation (e.g., Project Team: `2bzM8nrwNSkarXpUdGtY`)
2. Tap ✨ sparkles icon → **Action Items**
3. Wait for response (success or error)

### 2. View Debug Logs

```bash
# View last 5 logs (default)
node scripts/viewDebugLogs.js

# View last 10 logs
node scripts/viewDebugLogs.js 10

# View just 1 log (most recent)
node scripts/viewDebugLogs.js 1
```

**Output includes:**
- Timestamp, user ID, conversation ID
- Full raw response from Claude
- Character codes (to detect hidden characters)
- Error details (if parsing failed)
- Warnings for non-printable characters

### 3. Analyze the Response

Look for:

**Hidden Characters:**
- Check character codes array for codes < 32 (except 9, 10, 13)
- Common culprits: Zero-width spaces (8203), BOM markers (65279)

**JSON Structure:**
- Verify response contains valid JSON wrapped in markdown
- Check if braces/brackets are properly matched
- Look for trailing characters after JSON

**Encoding Issues:**
- Check for unexpected Unicode characters
- Verify newlines are consistent (\n vs \r\n)

### 4. Clear Logs (Optional)

```bash
# Delete all debug logs
node scripts/clearDebugLogs.js
```

Run this periodically to avoid cluttering Firestore.

---

## What to Look For

### Common Issues

1. **Hidden Characters:**
   - Zero-width spaces in JSON keys
   - Byte order marks (BOM)
   - Non-breaking spaces

2. **Markdown Formatting:**
   - Extra backticks after JSON
   - Nested code blocks
   - Mixed markdown languages (```json vs ```javascript)

3. **Claude's Response Format:**
   - Text explanation before JSON
   - Text explanation after JSON
   - Markdown formatting inside JSON strings

4. **Encoding:**
   - UTF-8 vs UTF-16 issues
   - Emoji or special characters breaking parsing

---

## Example Workflow

```bash
# 1. Test in app (trigger Action Items)
# App shows error or success

# 2. View the debug log
node scripts/viewDebugLogs.js 1

# 3. Copy the rawResponseFull to a text editor
# Look for issues manually

# 4. If needed, test parsing locally
node
> const response = `... paste response here ...`
> JSON.parse(response)
# See exact error

# 5. Implement fix based on findings
# Update extraction logic in conversationHelpers.ts

# 6. Deploy and test again
firebase deploy --only functions:extractActionItems
```

---

## Alternative: View in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/project/message-ai-2a7cf/firestore)
2. Navigate to **Firestore Database**
3. Open collection: `debug_logs`
4. Click on the most recent document
5. View `rawResponseFull` field

**Tip:** Firebase Console truncates long strings. Use the script for full output.

---

## Next Steps After Analysis

Based on what you find in the debug logs, implement one of these fixes:

### Fix 1: Instruct Claude to Return Pure JSON
Update the prompt in `actionItems.ts` to request no markdown:

```typescript
const prompt = `...
CRITICAL: Return ONLY a JSON array with no markdown formatting, no code blocks, no backticks.
Start your response with [ and end with ].
`;
```

### Fix 2: Regex-Based Extraction
Replace brace-finding with regex to handle markdown:

```typescript
const match = rawResponse.match(/```(?:json|javascript|typescript)?\s*\n?([\s\S]*?)\n?```/);
if (match && match[1]) {
  json = match[1].trim();
}
```

### Fix 3: Character Sanitization
Strip hidden characters before parsing:

```typescript
json = json.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width chars
json = json.replace(/\uFEFF/g, ''); // Remove BOM
```

### Fix 4: Multiple Fallback Strategies
Implement the full fallback chain from the bug document.

---

## Cleanup

Once bug is fixed and verified:

1. Remove debug logging code from `actionItems.ts` (lines 114-128, 146-156)
2. Remove hidden char detection from `conversationHelpers.ts` (lines 57-70)
3. Keep the scripts for future debugging
4. Clear all debug logs: `node scripts/clearDebugLogs.js`

---

**Good luck debugging!** 🐛🔍

