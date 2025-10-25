# AI Feature Refactoring: Tool Use Implementation

**Date:** October 25, 2025  
**Status:** ✅ COMPLETED  
**Goal:** Refactor all AI features to use Anthropic's Tool Use API instead of text-based prompting with manual JSON parsing

> **Implementation completed on October 25, 2025.** All four Claude-based AI features (summarization, action items, decisions, priority detection) now use the Tool Use API for structured outputs. Manual JSON parsing and Zod validation removed. See commits on `ai-spike` branch for details.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Why Refactor?](#why-refactor)
3. [Anthropic Tool Use Overview](#anthropic-tool-use-overview)
4. [Features to Refactor](#features-to-refactor)
5. [Implementation Plan](#implementation-plan)
6. [File Changes](#file-changes)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Plan](#rollback-plan)
9. [Open Questions](#open-questions)

---

## Executive Summary

### Current Approach (Problems)

- ❌ Claude returns JSON wrapped in markdown code blocks (` ```json ... ``` `)
- ❌ Complex, fragile parsing logic required
- ❌ No schema validation on server side
- ❌ Error-prone: "Unexpected non-whitespace character after JSON" errors
- ❌ Reinventing the wheel instead of using API features

### Proposed Approach (Solutions)

- ✅ Use Anthropic's **Tool Use** feature (like OpenAI's function calling)
- ✅ Server-side schema validation by Anthropic
- ✅ No markdown wrapping - clean structured responses
- ✅ Already-parsed JSON objects (no `JSON.parse()` needed)
- ✅ Industry standard, battle-tested approach

### Impact

- **Features affected:** 4 out of 5 AI features (Action Items, Decisions, Summarization, Priority Detection Batch)
- **No impact:** Semantic Search (uses OpenAI only)
- **Lines of code removed:** ~200 lines of parsing logic
- **Lines of code added:** ~250 lines of tool definitions
- **Net benefit:** More robust, maintainable, and scalable

---

## Why Refactor?

### Current Issues

**1. JSON Parsing Bugs**

```
Error: Unexpected non-whitespace character after JSON at position 177
```

- Root cause: Claude returns ` ```json\n[...]\n``` ` with trailing characters
- Hours spent debugging extraction logic
- Fragile solution that might break with different responses

**2. No Schema Validation**

- Claude can return invalid JSON that passes parsing but fails downstream
- Example: Missing required fields, wrong types, invalid enum values
- We only discover issues after parsing succeeds

**3. Not Using API's Intended Features**

- Anthropic provides Tool Use specifically for structured outputs
- We're working against the API instead of with it

**4. Comparison with OpenAI**

- OpenAI has `response_format: { type: "json_object" }`
- OpenAI enforces JSON, no markdown wrapping
- We're at a disadvantage using Claude the wrong way

### Benefits of Tool Use

**1. Server-Side Validation**

```typescript
// Anthropic validates this schema BEFORE returning
input_schema: {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] }
        },
        required: ["text", "priority"]
      }
    }
  }
}
```

**2. Already-Parsed Responses**

```typescript
// Before (current):
const rawResponse = await callClaude(prompt);
const parsed = extractJsonFromAIResponse(rawResponse); // Complex parsing
const items = parsed; // Finally have our data

// After (with Tool Use):
const response = await callClaude(prompt, tools);
const toolUse = response.content.find(block => block.type === 'tool_use');
const items = toolUse.input.items; // Already parsed!
```

**3. Better Prompts**

- Anthropic automatically constructs system prompts for tools
- We provide tool descriptions, Anthropic handles the rest
- More consistent responses

---

## Anthropic Tool Use Overview

### How It Works

1. **Define Tools** - Specify what structured data you want back
2. **Send Request** - Include tools in API call
3. **Claude Chooses Tool** - Optionally force specific tool usage
4. **Receive Structured Response** - Already-parsed JSON

### Tool Definition Structure

```typescript
interface Tool {
  name: string;              // Unique identifier (regex: ^[a-zA-Z0-9_-]{1,64}$)
  description: string;       // What the tool does, when to use it
  input_schema: {            // JSON Schema for validation
    type: "object";
    properties: { ... };
    required: string[];
  };
}
```

### Example: Action Items Tool

```typescript
const extractActionItemsTool = {
  name: "extract_action_items",
  description: "Extract action items (tasks, commitments, todos) from a conversation. An action item is a specific task mentioned by participants that needs to be completed.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        description: "List of action items found in the conversation",
        items: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Description of the action item"
            },
            assigneeIdentifier: {
              type: "string",
              nullable: true,
              description: "Display name or email of person assigned (null if not specified)"
            },
            dueDate: {
              type: "string",
              nullable: true,
              description: "ISO 8601 timestamp if deadline mentioned, null otherwise"
            },
            priority: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Priority level: high=urgent/near deadline, medium=standard task, low=optional/suggestion"
            },
            sourceMessageId: {
              type: "string",
              description: "ID of the message where this action item was mentioned"
            }
          },
          required: ["text", "priority", "sourceMessageId"]
        }
      }
    },
    required: ["items"]
  }
};
```

### Making API Calls

```typescript
const response = await anthropicClient.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  tools: [extractActionItemsTool],
  tool_choice: {
    type: "tool",
    name: "extract_action_items"
  },
  messages: [{
    role: 'user',
    content: prompt
  }]
});

// Extract tool response
const toolUse = response.content.find(block => block.type === 'tool_use');
if (!toolUse) {
  throw new Error('Claude did not use the tool');
}

// Already parsed - no JSON.parse() needed!
const actionItems = toolUse.input.items;
```

### System Prompts (Optional)

We CAN provide a system prompt to give Claude general context:

```typescript
const response = await anthropicClient.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  system: "You are analyzing a team conversation. Be thorough in identifying all action items mentioned.",
  tools: [extractActionItemsTool],
  tool_choice: { type: "tool", name: "extract_action_items" },
  messages: [{ role: 'user', content: prompt }]
});
```

**Note:** System prompts are optional. Anthropic automatically creates an internal system prompt that describes the tools and their usage. Our system prompt would supplement, not replace, that.

---

## Features to Refactor

### ✅ 1. Action Items Extraction

**Current:** Text prompt → parse JSON from markdown  
**New:** Tool Use with `extract_action_items` tool

**Complexity:** Medium  
**Benefit:** High (currently has parsing bug)

---

### ✅ 2. Decision Tracking

**Current:** Text prompt → parse JSON from markdown  
**New:** Tool Use with `track_decisions` tool

**Complexity:** Medium  
**Benefit:** High (likely has same parsing issues)

---

### ✅ 3. Thread Summarization

**Current:** Text prompt → parse JSON from markdown  
**New:** Tool Use with `generate_summary` tool

**Complexity:** Low (simpler schema)  
**Benefit:** Medium (fewer fields, less prone to errors but still worth it)

---

### ✅ 4. Priority Detection (Batch Analysis)

**Current:** Heuristic (real-time) → Text prompt → parse JSON (batch)  
**New:** Heuristic (real-time) → Tool Use with `analyze_message_priority` tool (batch)

**Complexity:** Low (simple schema: just priority + reason)  
**Benefit:** Medium (completes the hybrid approach, ensures consistency)

**Note:** The real-time heuristic check (quick priority) doesn't change - only the batch AI analysis uses Claude and needs refactoring.

---

### ⚠️ 5. Semantic Search (No Change)

**Current:** OpenAI embeddings + Pinecone  
**Note:** Doesn't use Claude at all

---

## Implementation Plan

### Phase 1: Update Utility Functions (1-2 hours)

#### 1.1 Refactor `anthropic.ts`

**Current:**

```typescript
export async function callClaude(
  prompt: string,
  maxTokens: number = 1500
): Promise<string>
```

**New:**

```typescript
// Keep old function for backward compatibility during migration
export async function callClaudeText(
  prompt: string,
  maxTokens: number = 1500
): Promise<string> {
  // ... existing implementation
}

// New function for tool use
export async function callClaudeWithTool<T>(
  prompt: string,
  tool: Tool,
  options?: {
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<T> {
  const client = getAnthropicClient();
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: options?.maxTokens || 2000,
    system: options?.systemPrompt,
    tools: [tool],
    tool_choice: {
      type: "tool",
      name: tool.name
    },
    messages: [{
      role: 'user',
      content: prompt
    }]
  });
  
  // Extract tool use response
  const toolUse = response.content.find(
    block => block.type === 'tool_use' && block.name === tool.name
  );
  
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error(`Claude did not use the ${tool.name} tool`);
  }
  
  // Return already-parsed input (no JSON.parse needed!)
  return toolUse.input as T;
}
```

**File:** `functions/src/utils/anthropic.ts`  
**Changes:** Add new function, keep old one for migration

---

#### 1.2 Create Tool Definitions File

**New file:** `functions/src/utils/aiTools.ts`

**Purpose:** Centralize all tool definitions

**Content:**

```typescript
import { Tool } from '@anthropic-ai/sdk/resources/messages';

/**
 * Tool for extracting action items from conversations
 */
export const extractActionItemsTool: Tool = {
  name: "extract_action_items",
  description: `Extract action items (tasks, commitments, todos) from a conversation.
  
An action item is a specific task that:
- Was explicitly mentioned by a participant
- Needs to be completed or addressed
- Has a clear action (e.g., "review", "send", "update", "discuss")

Look for phrases like:
- "I will...", "Can you...", "Please...", "Should..."
- Assignments: "John should review", "Alice will send"
- Commitments: "Let's discuss tomorrow", "I'll check with the team"

Do NOT include:
- General statements or opinions
- Questions without clear action
- Already completed tasks`,
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        description: "List of action items found in the conversation",
        items: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Clear description of the action item (what needs to be done)"
            },
            assigneeIdentifier: {
              type: "string",
              nullable: true,
              description: "Display name or email of person assigned to this task. Use null if no specific person mentioned."
            },
            dueDate: {
              type: "string",
              nullable: true,
              description: "ISO 8601 timestamp if a deadline is mentioned (e.g., 'by Friday', 'tomorrow', 'end of day'). Use null if no deadline mentioned."
            },
            priority: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Priority level based on language and urgency: high=uses urgent language (ASAP, urgent, immediately) or has near deadline; medium=standard tasks with timeframes; low=optional suggestions or vague future tasks"
            },
            sourceMessageId: {
              type: "string",
              description: "ID of the message where this action item was mentioned"
            }
          },
          required: ["text", "priority", "sourceMessageId"]
        }
      }
    },
    required: ["items"]
  }
};

/**
 * Tool for generating conversation summaries
 */
export const generateSummaryTool: Tool = {
  name: "generate_summary",
  description: `Generate a concise summary of a conversation with key discussion points.
  
The summary should:
- Be 2-4 sentences capturing the main topics discussed
- Highlight any decisions made or conclusions reached
- Note important participants and their contributions
- Be written in third person, professional tone

Key points should:
- Be specific, actionable bullet points
- Cover different topics discussed (not just repeating the summary)
- Include any decisions, action items decided, or important details
- Be 3-10 points total`,
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "2-4 sentence summary of the conversation"
      },
      keyPoints: {
        type: "array",
        description: "3-10 key discussion points from the conversation",
        items: {
          type: "string",
          description: "A specific, clear point about what was discussed"
        },
        minItems: 3,
        maxItems: 10
      }
    },
    required: ["summary", "keyPoints"]
  }
};

/**
 * Tool for tracking decisions in group conversations
 */
export const trackDecisionsTool: Tool = {
  name: "track_decisions",
  description: `Identify and track decisions made in a group conversation.
  
A decision is:
- A clear choice or conclusion reached by the group
- Has agreement from multiple participants (not just one person's opinion)
- Is actionable or impacts future behavior
- Uses decisive language: "we'll go with", "decided to", "agreed on"

Examples of decisions:
- "We'll go with option A for the Q4 budget"
- "Let's postpone the launch until December"
- "Agreed: John will lead the project"

NOT decisions:
- Single person's opinion: "I think we should..."
- Questions: "Should we consider option B?"
- Tentative: "Maybe we could...", "Let's think about..."

Only return decisions you are confident about (>70% confidence).`,
  input_schema: {
    type: "object",
    properties: {
      decisions: {
        type: "array",
        description: "List of decisions made in the conversation",
        items: {
          type: "object",
          properties: {
            decision: {
              type: "string",
              description: "Clear statement of what was decided"
            },
            context: {
              type: "string",
              description: "1-2 sentence context: what led to this decision, why it matters"
            },
            participantIds: {
              type: "array",
              description: "User IDs of participants who agreed or contributed to this decision",
              items: {
                type: "string"
              }
            },
            sourceMessageIds: {
              type: "array",
              description: "IDs of messages where this decision was discussed",
              items: {
                type: "string"
              }
            },
            confidence: {
              type: "number",
              description: "Confidence score 0-1 that this is actually a decision (only return if > 0.7)",
              minimum: 0.7,
              maximum: 1.0
            }
          },
          required: ["decision", "context", "participantIds", "sourceMessageIds", "confidence"]
        }
      }
    },
    required: ["decisions"]
  }
};

/**
 * Tool for analyzing message priority
 */
export const analyzeMessagePriorityTool: Tool = {
  name: "analyze_message_priority",
  description: `Analyze a message and determine its priority level.
  
Priority should reflect urgency and importance:
- HIGH: Urgent matters requiring immediate attention
  * Time-sensitive requests ("need ASAP", "urgent")
  * Emergencies or critical issues
  * Requests with near deadlines
  * All-caps messages indicating urgency
  
- MEDIUM: Important but not immediately urgent
  * Questions needing response
  * Scheduled items without near deadlines
  * Standard work requests
  * Discussion topics
  
- LOW: Casual conversation, non-urgent
  * Greetings, acknowledgments ("thanks", "ok", "lol")
  * Social messages, chitchat
  * Messages with only emojis
  * Non-actionable comments

Consider the language, tone, and content to determine priority.`,
  input_schema: {
    type: "object",
    properties: {
      priority: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Priority level of the message"
      },
      reason: {
        type: "string",
        description: "Brief explanation (1 sentence) why this priority was assigned"
      }
    },
    required: ["priority", "reason"]
  }
};
```

**File:** `functions/src/utils/aiTools.ts` (NEW)  
**Exports:** `extractActionItemsTool`, `generateSummaryTool`, `trackDecisionsTool`, `analyzeMessagePriorityTool`

---

### Phase 2: Refactor Action Items (2-3 hours)

#### 2.1 Update `actionItems.ts`

**Changes:**

1. Import new tool and function from utils
2. Replace `callClaude()` + parsing logic with `callClaudeWithTool()`
3. Remove `extractJsonFromAIResponse()` call
4. Remove all parsing error handling (no longer needed)
5. Keep existing logic: rate limiting, caching, assignee resolution, Firestore writes

**Before (current):**

```typescript
// Line ~110
const rawResponse = await callClaude(prompt, 2000);

// Line ~114-128: Debug logging
const debugLogRef = db.collection('debug_logs').doc();
await debugLogRef.set({ ... });

// Line ~133
actionItemsArray = extractJsonFromAIResponse<any[]>(rawResponse);

// Line ~140-162: Error handling
} catch (error) {
  console.error('❌ Failed to parse...');
  await db.collection('debug_logs').add({ ... });
  throw new functions.https.HttpsError(...);
}
```

**After (refactored):**

```typescript
import { callClaudeWithTool } from '../utils/anthropic';
import { extractActionItemsTool } from '../utils/aiTools';

// Line ~110
const actionItemsResult = await callClaudeWithTool<{items: any[]}>(
  prompt,
  extractActionItemsTool,
  { maxTokens: 2000 }
);

// No parsing needed - already have structured data!
const actionItemsArray = actionItemsResult.items;

// Remove all debug logging and error handling for parsing
// Tool Use handles validation on server side
```

**File:** `functions/src/ai/actionItems.ts`  
**Lines removed:** ~50 (debug logging, parsing, error handling)  
**Lines added:** ~5 (new imports, one function call)

---

#### 2.2 Remove Unused Helper

**File:** `functions/src/utils/conversationHelpers.ts`

**Remove:**

- `extractJsonFromAIResponse()` function (lines 35-75)
- Can keep it temporarily for Decisions refactor, then remove

---

### Phase 3: Refactor Decisions (1-2 hours)

#### 3.1 Update `decisions.ts`

**Similar changes to Action Items:**

**File:** `functions/src/ai/decisions.ts`

**Before:**

```typescript
const rawResponse = await callClaude(prompt, 1500);
const decisionsArray = extractJsonFromAIResponse<any[]>(rawResponse);
```

**After:**

```typescript
import { callClaudeWithTool } from '../utils/anthropic';
import { trackDecisionsTool } from '../utils/aiTools';

const decisionsResult = await callClaudeWithTool<{decisions: any[]}>(
  prompt,
  trackDecisionsTool,
  { maxTokens: 1500 }
);

const decisionsArray = decisionsResult.decisions;
```

---

### Phase 4: Refactor Summarization (1 hour)

#### 4.1 Update `summarization.ts`

**File:** `functions/src/ai/summarization.ts`

**Before:**

```typescript
const rawResponse = await callClaude(prompt, 1500);

// Parse response (expecting JSON with summary and keyPoints)
const summaryData = extractJsonFromAIResponse<any>(rawResponse);

return {
  summary: summaryData.summary,
  keyPoints: summaryData.keyPoints,
  messageCount: data.messageCount,
  generatedAt: now,
};
```

**After:**

```typescript
import { callClaudeWithTool } from '../utils/anthropic';
import { generateSummaryTool } from '../utils/aiTools';

const summaryData = await callClaudeWithTool<{summary: string; keyPoints: string[]}>(
  prompt,
  generateSummaryTool,
  { maxTokens: 1500 }
);

return {
  summary: summaryData.summary,
  keyPoints: summaryData.keyPoints,
  messageCount: data.messageCount,
  generatedAt: now,
};
```

---

### Phase 4.5: Refactor Priority Detection Batch (30 minutes)

#### 4.5.1 Update `priority.ts`

**File:** `functions/src/ai/priority.ts`

**Function:** `analyzeMessagePriorityWithAI` (called by `batchAnalyzePriority`)

**Before:**

```typescript
async function analyzeMessagePriorityWithAI(text: string): Promise<string> {
  const prompt = `
Analyze this message and determine its priority level.

Message: "${text}"

Respond with JSON:
{ "priority": "high" | "medium" | "low", "reason": "brief explanation" }
...`;
  
  const rawResponse = await callClaude(prompt, 150);
  const result = parseAIResponse(rawResponse, PrioritySchema);
  return result.priority;
}
```

**After:**

```typescript
import { callClaudeWithTool } from '../utils/anthropic';
import { analyzeMessagePriorityTool } from '../utils/aiTools';

async function analyzeMessagePriorityWithAI(text: string): Promise<string> {
  const prompt = `Analyze this message and determine its priority level.

Message: "${text}"`;
  
  const result = await callClaudeWithTool<{priority: string; reason: string}>(
    prompt,
    analyzeMessagePriorityTool,
    { maxTokens: 150 }
  );
  
  // Optional: Log the reason for debugging
  console.log(`Priority: ${result.priority}, Reason: ${result.reason}`);
  
  return result.priority;
}
```

**Note:** The `quickPriorityCheckTrigger` function (heuristic-based) does NOT change - it doesn't use Claude. Only the batch AI analysis function needs refactoring.

---

### Phase 5: Cleanup (30 minutes)

#### 5.1 Remove Debug Code

**Files to clean:**

- `functions/src/ai/actionItems.ts` - Remove Firestore debug logging (lines 114-128, 146-156)
- `functions/src/utils/conversationHelpers.ts` - Remove `extractJsonFromAIResponse()` function
- `scripts/viewDebugLogs.js` - Can keep for future debugging but no longer needed for this bug
- `scripts/clearDebugLogs.js` - Can keep

---

#### 5.2 Update Documentation

**Files to update:**

- `docs/phase2-ai-spike/ACTION_ITEMS_JSON_PARSING_BUG.md` - Add resolution section
- `docs/phase2-ai-spike/SUB-PHASE_1_IMPLEMENTATION_SUMMARY.md` - Note refactoring
- `README.md` - Update if it mentions implementation details

---

### Phase 6: Update Unit Tests (2-3 hours)

#### 6.1 Update Test Files

**Files:**

- `functions/src/__tests__/actionItems.test.ts`
- `functions/src/__tests__/decisions.test.ts`
- `functions/src/__tests__/summarization.test.ts`
- `functions/src/__tests__/priority.test.ts` (or `priorityHeuristics.test.ts`)

**Changes needed:**

- Update mocks to return tool use responses instead of text
- Test tool schema validation
- Remove parsing error test cases (no longer applicable)
- For priority: Only update the AI analysis tests, keep heuristic tests unchanged

**Example update:**

**Before:**

```typescript
// Mock callClaude to return JSON string
jest.mock('../utils/anthropic', () => ({
  callClaude: jest.fn().mockResolvedValue(JSON.stringify({
    items: [{ text: "Test item", priority: "high", sourceMessageId: "msg1" }]
  }))
}));
```

**After:**

```typescript
// Mock callClaudeWithTool to return structured object
jest.mock('../utils/anthropic', () => ({
  callClaudeWithTool: jest.fn().mockResolvedValue({
    items: [{ text: "Test item", priority: "high", sourceMessageId: "msg1" }]
  })
}));
```

---

## File Changes

### Files to Create

| File | Purpose | Lines |
|------|---------|-------|
| `functions/src/utils/aiTools.ts` | Tool definitions for Claude | ~250 |

### Files to Modify

| File | Changes | Lines Changed |
|------|---------|---------------|
| `functions/src/utils/anthropic.ts` | Add `callClaudeWithTool()` function | +40 |
| `functions/src/ai/actionItems.ts` | Remove parsing, use Tool Use | -50, +5 |
| `functions/src/ai/decisions.ts` | Remove parsing, use Tool Use | -30, +5 |
| `functions/src/ai/summarization.ts` | Remove parsing, use Tool Use | -20, +5 |
| `functions/src/ai/priority.ts` | Update `analyzeMessagePriorityWithAI()` to use Tool Use | -15, +10 |
| `functions/src/utils/conversationHelpers.ts` | Remove `extractJsonFromAIResponse()` | -45 |
| `functions/src/__tests__/actionItems.test.ts` | Update mocks for Tool Use | ~20 |
| `functions/src/__tests__/decisions.test.ts` | Update mocks for Tool Use | ~15 |
| `functions/src/__tests__/summarization.test.ts` | Update mocks for Tool Use | ~15 |
| `functions/src/__tests__/priority.test.ts` | Update AI analysis mocks (keep heuristic tests) | ~10 |
| `docs/phase2-ai-spike/ACTION_ITEMS_JSON_PARSING_BUG.md` | Document resolution | +30 |

### Files to Keep (Optional Cleanup)

| File | Status | Note |
|------|--------|------|
| `scripts/viewDebugLogs.js` | Keep | Useful for future debugging |
| `scripts/clearDebugLogs.js` | Keep | Useful utility |
| Firestore `debug_logs` collection | Clear | Run `node scripts/clearDebugLogs.js` |

---

## Testing Strategy

### Unit Tests

1. **Test tool definitions** - Ensure schemas are valid JSON Schema
2. **Test mock responses** - Verify structured responses match expected types
3. **Test error handling** - What happens if Claude doesn't use tool?

### Integration Tests

1. **Test with emulator** - Deploy to Firebase emulator, call functions
2. **Test with real conversations** - Use existing test data
3. **Compare outputs** - Old approach vs new approach (should be similar)

### Manual Testing

1. **Action Items extraction** - Test on Operations Team conversation
2. **Summarization** - Test on Project Team conversation
3. **Decisions** - Test on group conversations
4. **Edge cases** - Empty conversations, conversations with no action items/decisions

### Regression Testing

1. **Verify existing features work** - Semantic Search, Priority Detection
2. **Verify caching still works** - Second call should use cache
3. **Verify rate limiting works** - Hit 50/hour limit
4. **Verify security** - Cannot access other users' conversations

---

## Rollback Plan

### If Refactoring Fails

**Step 1: Revert Code Changes**

```bash
git checkout -- functions/src/ai/actionItems.ts
git checkout -- functions/src/ai/decisions.ts
git checkout -- functions/src/ai/summarization.ts
git checkout -- functions/src/utils/anthropic.ts
```

**Step 2: Redeploy Old Functions**

```bash
firebase deploy --only functions:extractActionItems,functions:trackDecisions,functions:generateSummary
```

**Step 3: Test Old Functions**

- Verify action items extraction works
- Verify summarization works
- Verify decisions work

### Safety Measures

1. **Work on branch** - Create `feature/tool-use-refactor` branch
2. **Deploy incrementally** - Deploy one function at a time
3. **Keep old functions** - Don't delete old code immediately
4. **Monitor logs** - Watch Firebase logs for errors

---

## Open Questions

### Question 1: System Prompts

**Q:** Should we add custom system prompts to give Claude more context?

**Options:**

- A) No system prompt - let Anthropic's auto-generated prompt handle it
- B) Minimal system prompt: "You are analyzing a team conversation"
- C) Detailed system prompt with examples and edge cases

**My recommendation:** Start with option A (no custom system prompt). Anthropic automatically creates a comprehensive system prompt based on tool definitions. Add custom system prompt only if we see quality issues.

---

### Question 2: Multiple Tools vs Single Tool per Function

**Q:** Should we allow Claude to choose between multiple tools, or force a specific tool per function?

**Current plan:** Force specific tool using `tool_choice: { type: "tool", name: "..." }`

**Reasoning:**

- Each Cloud Function has a specific purpose (extract action items, generate summary, etc.)
- No ambiguity - we know exactly what we want back
- Simpler to test and debug

**Alternative:** Allow Claude to choose between tools (e.g., "extract_action_items" vs "no_action_items_found")

**Trade-offs:**

- More flexible but more complex
- Need to handle multiple possible responses
- Adds complexity without clear benefit

**My recommendation:** Stick with forced tool choice for now. Can revisit if needed.

---

### Question 3: Validation After Tool Use

**Q:** Should we still validate the structured response after Claude returns it?

**Options:**

- A) Trust Anthropic's schema validation completely
- B) Add lightweight TypeScript type checking
- C) Add full Zod validation like we do now

**My recommendation:** Option B. Anthropic validates the JSON schema, but we should do TypeScript type checking to ensure our code is type-safe. Remove the complex Zod parsing (since Anthropic already validated the structure).

Example:

```typescript
const result = await callClaudeWithTool<{items: ActionItem[}>(...);

// TypeScript ensures result.items is an array
// But we might still check:
if (!Array.isArray(result.items)) {
  throw new Error('Unexpected response structure');
}
```

---

### Question 4: Prompt Adjustments

**Q:** Should we adjust the prompts now that we're using Tool Use?

**Current prompts:**

- Include JSON format examples
- Specify "Return JSON array: [...]"
- Include formatting instructions

**With Tool Use:**

- Schema is defined in tool
- Anthropic knows what structure to return
- Prompts can focus on WHAT to extract, not HOW to format

**My recommendation:** Simplify prompts significantly:

**Before:**

```
Extract action items from this conversation.

Return JSON array:
[
  {
    "text": "Description of the action item",
    "assigneeIdentifier": "Display name OR email if specified",
    ...
  }
]

Assignment rules:
- Use display name if mentioned...
```

**After:**

```
Extract action items from this conversation.

Assignment rules:
- Use display name if mentioned unambiguously
- Use email if explicitly mentioned
- Leave null if assignee is unclear

Priority rules:
- High: urgent language or near deadline
- Medium: standard tasks with timeframes
- Low: suggestions or optional items
```

The tool description and schema handle the structure. The prompt focuses on business logic.

---

### Question 5: Migration Strategy

**Q:** Should we refactor all three features at once, or one at a time?

**Options:**

- A) All at once - one PR, one deployment
- B) One at a time - separate PRs for Action Items, Decisions, Summarization
- C) Action Items + Decisions together (both have parsing bug), then Summarization

**My recommendation:** Option C

- Action Items and Decisions likely have the same parsing issues
- Fixing both together provides more confidence
- Summarization is lower risk (simpler schema), can do separately
- Reduces risk of breaking everything at once

---

### Question 6: Error Handling

**Q:** What errors can Tool Use throw that we need to handle?

**Possible errors:**

1. Claude doesn't use the tool (rare with forced tool choice)
2. Claude returns invalid data (caught by Anthropic's validation)
3. API timeout
4. Rate limiting

**My recommendation:** Keep existing error handling for timeouts and rate limiting. Add specific handling for "tool not used" error:

```typescript
try {
  const result = await callClaudeWithTool(...);
} catch (error) {
  if (error.message.includes('did not use the tool')) {
    // Claude refused to use the tool - very rare
    throw new functions.https.HttpsError(
      'internal',
      'AI could not process this request. Please try again.'
    );
  }
  // Handle other errors (timeout, rate limit, etc.)
  throw error;
}
```

---

## Timeline

### Estimated Time: 9-13 hours total

**Phase 1:** Update Utility Functions (1-2 hours)

- Create `aiTools.ts` with all 4 tool definitions
- Add `callClaudeWithTool()` to `anthropic.ts`

**Phase 2:** Refactor Action Items (2-3 hours)

- Update `actionItems.ts`
- Test manually
- Deploy and verify

**Phase 3:** Refactor Decisions (1-2 hours)

- Update `decisions.ts`
- Test manually
- Deploy and verify

**Phase 4:** Refactor Summarization (1 hour)

- Update `summarization.ts`
- Test manually
- Deploy and verify

**Phase 4.5:** Refactor Priority Detection Batch (30 minutes)

- Update `priority.ts` (only the AI analysis function)
- Test manually
- Deploy and verify

**Phase 5:** Cleanup (30 minutes)

- Remove debug code
- Remove unused helper functions
- Update documentation

**Phase 6:** Update Unit Tests (2-3 hours)

- Update test mocks
- Update test cases
- Run full test suite

**Buffer:** 1-2 hours for unexpected issues

---

## Success Criteria

### Technical

- ✅ All 4 Claude-based features (Action Items, Decisions, Summarization, Priority Batch) use Tool Use
- ✅ No JSON parsing errors
- ✅ All unit tests pass
- ✅ Integration tests pass
- ✅ Manual testing successful

### Quality

- ✅ Output quality same or better than before
- ✅ Response times similar (within 20%)
- ✅ No regressions in other features

### Code Quality

- ✅ Reduced complexity (less parsing code)
- ✅ Better type safety
- ✅ Easier to maintain
- ✅ Clear, documented code

---

## Next Steps

1. **Review this plan** - Get feedback on approach and open questions
2. **Answer open questions** - Make decisions on system prompts, validation, migration strategy
3. **Create feature branch** - `feature/tool-use-refactor`
4. **Implement Phase 1** - Tool definitions and utility function
5. **Test Phase 1** - Verify tool definitions are valid
6. **Implement Phase 2** - Refactor Action Items
7. **Test Phase 2** - Manual testing of Action Items
8. **Continue with remaining phases**
9. **Deploy to production**
10. **Monitor for issues**

---

## References

- [Anthropic Tool Use Documentation](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use)
- [Anthropic SDK TypeScript](https://github.com/anthropics/anthropic-sdk-typescript)
- [JSON Schema Specification](https://json-schema.org/)
- Original implementation: `docs/phase2-ai-spike/SUB-PHASE_1_FEATURES.md`
- Bug report: `docs/phase2-ai-spike/ACTION_ITEMS_JSON_PARSING_BUG.md`

---

**Document Status:** Ready for review  
**Next Action:** Discuss open questions and get approval to proceed
